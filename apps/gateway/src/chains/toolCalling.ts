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
import { LocalFileCache } from "langchain/cache/file_system";

import {
  AIMessage,
  AgentStep,
  BaseMessage,
  FunctionMessage,
  HumanMessage,
} from "langchain/schema";
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { Callbacks } from "langchain/callbacks";
import { resolve } from "path";

import { ChatMessagesRow } from "../types";

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
}: {
  chatMessages: ChatMessagesRow[];
  systemPrompt: string;
  callbacks?: Callbacks;
  tools: AgentExecutor["tools"];
}) {
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );

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
    maxTokenLimit: 20,
  });

  const model = new ChatOpenAI({
    // https://platform.openai.com/docs/models/gpt-3-5
    modelName: "gpt-3.5-turbo-0613",
    temperature: 0.9,
    callbacks,
    cache,
  });

  // Convert to OpenAI tool format
  const modelWithTools = model.bind({
    functions: tools.map(formatToOpenAIFunction),
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `${systemPrompt}. You don't go off topic. Before recommending something you always search for it and give back the reference.`,
    ],
    // ...(chatMessages.slice(-8, -2) || []).map((message) =>
    //   message.role === "user"
    //     ? new HumanMessage(message.content)
    //     : new AIMessage(message.content),
    // ),
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
  });

  const executor = AgentExecutor.fromAgentAndTools({
    agent: runnableAgent,
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
