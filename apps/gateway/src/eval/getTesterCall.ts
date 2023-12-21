import { ChatMessageInfo } from "@local/client";
import { Callbacks } from "langchain/callbacks";
import { LLMChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
} from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";
import { AIMessage, BaseCache, HumanMessage } from "langchain/schema";

const TESTER_PROMPT_PREFIX = `You are a QA assistant very skilled at impersonating fictional people and use all your skills test a chatbot based on a scenario.

Your messages are only a valid JSON object having the following properties:
- message: the message you send to the chatbot
- reasoning: your reasoning for sending this message

Here is the scenario you have to follow:`;

export async function getTesterCall({
  profile,
  messages,
  callbacks,
  cache,
}: {
  profile: string;
  messages: Pick<ChatMessageInfo, "content" | "role">[];
  callbacks?: Callbacks;
  cache?: BaseCache;
}): Promise<{
  message: string;
  reasoning: string;
}> {
  const systemPrompt = `${TESTER_PROMPT_PREFIX}\n${profile}\n`;
  const memory = new ConversationSummaryBufferMemory({
    memoryKey: "chat_history",
    llm: new OpenAI({
      modelName: "gpt-3.5-turbo-instruct",
      temperature: 0,
      callbacks,
      cache,
    }),
    chatHistory: new ChatMessageHistory(
      messages.map(({ content, role }) =>
        role === "user" ? new HumanMessage(content) : new AIMessage(content),
      ),
    ),
  });

  const model = new OpenAI({
    modelName: "gpt-3.5-turbo-1106",
    // const model = new ChatOpenAI({
    //   modelName: "gpt-4-1106-preview",
    modelKwargs: {
      response_format: { type: "json_object" },
    },
    temperature: 0,
    callbacks,
    cache,
  });
  const prompt = PromptTemplate.fromTemplate(`${systemPrompt}

  Current conversation:
  {chat_history}
  Agent to test: {input}
  You:`);
  const chain = new LLMChain({
    llm: model,
    prompt,
    memory,
    callbacks,
  });

  const result = await chain.call(
    {
      input: messages.at(-1)?.content || "Hi!",
    },
    {
      callbacks,
    },
  );

  return JSON.parse(result.text);
}