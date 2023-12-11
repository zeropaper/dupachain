import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { getOpenAIStore } from "../tools/stores";
import { ChatMessagesRow } from "../types";

export async function runChain({
  chatMessages,
}: {
  chatMessages: ChatMessagesRow[];
}) {
  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }

  const model = new ChatOpenAI({
    // https://platform.openai.com/docs/models/gpt-3-5
    modelName: "gpt-3.5-turbo-1106",
  });

  const store = await getOpenAIStore();

  const retriever = store.asRetriever();

  const prompt =
    PromptTemplate.fromTemplate(`Answer the question based only on the following context:
{context}

Question: {question}`);

  const chain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  const answer = await chain.invoke(lastUserMessage.content);
  return answer;
}
