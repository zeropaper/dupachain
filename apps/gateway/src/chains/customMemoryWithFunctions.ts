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
import { ChatMessageHistory } from "langchain/memory";

import {
  ChainRunner,
  chatModelNameSchema,
  instructModelNameSchema,
} from "../schemas";
import { findLast } from "../findLast";
import { CustomChatMemory } from "../memory/CustomMemory";
import { FileSystemCache } from "@local/cache";
import { resolve } from "path";

const customMemoryWithToolsOptionsSchema = z.object({
  memory: z
    .object({
      messagesCount: z.number().default(2),
      llm: z
        .object({
          modelName: instructModelNameSchema,
          temperature: z.number().positive().max(1).default(0),
        })
        .optional(),
      entityExtractionTemplate: z.string().optional(),
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
  return customMemoryWithToolsOptionsSchema.parse(obj);
}

type CustomMemoryWithToolsOptions = z.infer<
  typeof customMemoryWithToolsOptionsSchema
>;

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
  cache,
  runnerOptions,
}: Parameters<ChainRunner<CustomMemoryWithToolsOptions>>[0]) {
  const lastUserMessage = findLast(chatMessages, ({ role }) => role === "user");
  if (!lastUserMessage) {
    throw new Error("No last user message found");
  }

  if (!tools.length) {
    throw new Error("No tools passed to chain runner");
  }

  const chatId = lastUserMessage.chat_id;
  const replaceMeCache = new FileSystemCache({
    path: resolve(__dirname, `../../../../.cache/memory/${chatId}`),
  });

  const {
    memory: memoryOptions = {
      messagesCount: 1,
      llm: {
        modelName: "gpt-3.5-turbo-instruct",
        temperature: 0,
      },
    },
    model: modelOptions = {
      modelName: "gpt-3.5-turbo-0613",
      temperature: 0.9,
    },
  } = validateConfig(runnerOptions || {});

  const chatHistory = new ChatMessageHistory(
    chatMessages.map(({ content, role }) =>
      role === "user" ? new HumanMessage(content) : new AIMessage(content),
    ),
  );

  const memory = new CustomChatMemory({
    llm: new OpenAI({
      ...memoryOptions.llm,
      callbacks,
      cache,
    }),
    entityStore: replaceMeCache as any,
    chatHistory,
    entityExtractionTemplate: memoryOptions.entityExtractionTemplate,
  });

  const vars = await memory.loadMemoryVariables({
    input: lastUserMessage.content,
  });
  const summary = JSON.parse(vars.summary || "{}");
  const chatHistoryRecap = vars.chat_history || "";

  const fakeMesssages = Object.entries(
    summary as Record<string, string>,
  ).reduce(
    (msgs, [key, val]) => {
      if (!val) return msgs;
      switch (key) {
        case "ridingStyle":
          msgs.push(["assistant", "Do you have a prefered riding style?"]);
          msgs.push(["user", val]);
          break;
        case "height":
          msgs.push(["assistant", "What is your height?"]);
          msgs.push(["user", val]);
          break;
        case "weight":
          msgs.push(["assistant", "What is your weight?"]);
          msgs.push(["user", val]);
          break;
        default:
      }
      return msgs;
    },
    [] as Array<["user" | "assistant", string]>,
  );

  const model = new ChatOpenAI({
    ...modelOptions,
    callbacks,
    cache,
  });

  // Convert to OpenAI tool format
  const modelWithTools = model.bind({
    callbacks,
    // @ts-expect-error - unclear, probably some type mismatch because it works
    functions: tools.map(formatToOpenAIFunction),
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ...fakeMesssages,
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
      // console.log("formatAgentSteps", steps, action, observation);
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
    {
      callbacks,
    },
  );
  return (res && res.output) || res;
}
