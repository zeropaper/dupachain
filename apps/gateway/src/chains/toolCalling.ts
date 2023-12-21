import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { formatToOpenAITool } from "langchain/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { AgentExecutor } from "langchain/agents";
import {
  OpenAIToolsAgentOutputParser,
  type ToolsAgentStep,
} from "langchain/agents/openai/output_parser";

import {
  AIMessage,
  AgentStep,
  BaseCache,
  BaseMessage,
  ToolMessage,
  HumanMessage,
} from "langchain/schema";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
} from "langchain/memory";
import { Callbacks } from "langchain/callbacks";

import { ChatMessagesRow } from "../types";

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
  cache,
}: {
  chatMessages: ChatMessagesRow[];
  systemPrompt: string;
  callbacks?: Callbacks;
  cache?: BaseCache;
  tools: AgentExecutor["tools"];
}) {
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
    // https://platform.openai.com/docs/models/gpt-3-5
    modelName: "gpt-3.5-turbo-1106",
    temperature: 0.9,
    callbacks,
    cache,
  });

  // Convert to OpenAI tool format
  const modelWithTools = model.bind({
    tools: tools.map(formatToOpenAITool),
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `${systemPrompt}. You don't go off topic. Before recommending something you always search for it and give back the reference.`,
    ],
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
      if ("messageLog" in action && action.messageLog !== undefined) {
        const log = action.messageLog as BaseMessage[];
        return log.concat(new ToolMessage(observation, action.tool));
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
    new OpenAIToolsAgentOutputParser(),
  ]).withConfig({
    runName: "OpenAIToolsAgent",
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
