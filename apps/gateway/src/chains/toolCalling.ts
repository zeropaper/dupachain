import { z } from "zod";
import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { formatToOpenAIFunction } from "langchain/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { AgentExecutor } from "langchain/agents";
import {
  OpenAIFunctionsAgentOutputParser,
  type ToolsAgentStep,
} from "langchain/agents/openai/output_parser";

import {
  AIMessage,
  AgentStep,
  BaseMessage,
  FunctionMessage,
  HumanMessage,
} from "langchain/schema";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
} from "langchain/memory";

import {
  ChainRunner,
  chatModelNameSchema,
  instructModelNameSchema,
} from "../schemas";

const toolCallingConfigSchema = z.object({
  memory: z
    .object({
      maxTokenLimit: z.number().default(20),
      llm: z
        .object({
          modelName: instructModelNameSchema,
          temperature: z.number().positive().max(1).default(0),
        })
        .optional(),
    })
    .optional(),
  model: z
    .object({
      modelName: chatModelNameSchema,
      temperature: z.number().positive().max(1).default(0.9),
    })
    .optional(),
});

export function validateConfig(obj: unknown) {
  return toolCallingConfigSchema.parse(obj);
}

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
  cache,
}: Parameters<ChainRunner>[0]) {
  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }

  // Initialize the memory with a specific model and token limit
  const memory = new ConversationSummaryBufferMemory({
    llm: new OpenAI({
      modelName: "gpt-3.5-turbo-instruct",
      temperature: 0,
      callbacks,
      cache,
    }),
    chatHistory: new ChatMessageHistory(
      chatMessages.map(({ content, role }) =>
        role === "user" ? new HumanMessage(content) : new AIMessage(content),
      ),
    ),
    maxTokenLimit: 20,
  });

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo-0613",
    temperature: 0.9,
    callbacks,
    cache,
  });

  // Convert to OpenAI tool format
  const modelWithTools = model.bind({
    // @ts-expect-error - unclear, probably some type mismatch because it works
    functions: tools.map(formatToOpenAIFunction),
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
      if ("messageLog" in action && action.messageLog !== undefined) {
        const log = action.messageLog as BaseMessage[];
        return log.concat(new FunctionMessage(observation, action.tool));
      } else {
        return [new AIMessage(action.log)];
      }
    });

  const runnableAgent = RunnableSequence.from([
    {
      input: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
      agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) =>
        formatAgentSteps(i.steps),
    },
    prompt,
    modelWithTools,
    new OpenAIFunctionsAgentOutputParser(),
  ]).withConfig({
    runName: "OpenAIFunctionsAgent",
    callbacks,
  });

  const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
    callbacks,
    memory,
    tools,
  });

  const res = await executor.invoke(
    {
      input: lastUserMessage.content,
    },
    { callbacks },
  );
  return (res && res.output) || res;
}
