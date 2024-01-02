import { z } from "zod";
import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { formatToOpenAIFunction } from "langchain/tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "langchain/prompts";
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
import { findLast } from "../findLast";

const summaryPromptTemplate = `Progressively summarize the lines of conversation provided, adding onto the previous summary returning a new summary.

EXAMPLE
Current summary:
The human asks for guidance to find the right snowboard.

New lines of conversation:
AI: In order to find the right size for your snowboard, I need to know your height and weight.
Human: I'm 1.8m tall for about 80kg.

New summary:
The human, who's 1.8m tall for 80kg, asks for guidance to find the right snowboard.
END OF EXAMPLE

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

const summaryBufferMemoryWithToolsOptionsSchema = z.object({
  memory: z
    .object({
      messagesCount: z.number().default(5),
      maxTokenLimit: z.number().default(20),
      llm: z
        .object({
          modelName: instructModelNameSchema,
          temperature: z.number().positive().max(1).default(0),
        })
        .optional(),
      summaryPrompt: z
        .string()
        .includes("{summary}")
        .includes("{new_lines}")
        .default(summaryPromptTemplate)
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
  return summaryBufferMemoryWithToolsOptionsSchema.parse(obj);
}

type SummaryBufferMemoryWithToolsOptions = z.infer<
  typeof summaryBufferMemoryWithToolsOptionsSchema
>;

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
  cache,
  runnerOptions,
}: Parameters<ChainRunner<SummaryBufferMemoryWithToolsOptions>>[0]) {
  const lastUserMessage = findLast(chatMessages, ({ role }) => role === "user");
  if (!lastUserMessage) {
    throw new Error("No last user message found");
  }

  if (!tools.length) {
    throw new Error("No tools passed to chain runner");
  }
  const {
    memory: memoryOptions = {
      messagesCount: 5,
      maxTokenLimit: 20,
      llm: {
        modelName: "gpt-3.5-turbo-instruct",
        temperature: 0,
      },
      summaryPrompt: summaryPromptTemplate,
    },
    model: modelOptions = {
      modelName: "gpt-3.5-turbo-0613",
      temperature: 0.9,
    },
  } = validateConfig(runnerOptions || {});

  const chatHistory = new ChatMessageHistory(
    chatMessages
      .slice(memoryOptions.messagesCount * -1)
      .map(({ content, role }) =>
        role === "user" ? new HumanMessage(content) : new AIMessage(content),
      ),
  );

  // Initialize the memory with a specific model and token limit
  const memory = new ConversationSummaryBufferMemory({
    ...memoryOptions,
    llm: new OpenAI({
      modelName: "gpt-3.5-turbo-instruct",
      temperature: 0,
      ...memoryOptions.llm,
      callbacks,
      cache,
    }),
    prompt: memoryOptions.summaryPrompt
      ? PromptTemplate.fromTemplate(memoryOptions.summaryPrompt)
      : undefined,
    chatHistory,
  });

  const model = new ChatOpenAI({
    ...modelOptions,
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
