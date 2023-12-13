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
import { Callbacks } from "langchain/callbacks";

export async function runChain({
  chatMessages,
  callbacks,
}: {
  chatMessages: ChatMessagesRow[];
  systemPrompt: string;
  callbacks?: Callbacks;
}) {
  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }

  const model = new ChatOpenAI({
    // https://platform.openai.com/docs/models/gpt-3-5
    modelName: "gpt-3.5-turbo-1106",
    callbacks,
  });

  const store = await getOpenAIStore();

  const retriever = store.asRetriever({
    callbacks,
  });

  const prompt =
    PromptTemplate.fromTemplate(`You're an AI assistant who answers questions about documents.

You're a chat bot, so keep your replies succinct.

You're only allowed to use the documents below to answer the question.

If the question isn't related to these documents, say:
"Sorry, I couldn't find any information on that."

If the information isn't available in the below documents, say:
"Sorry, I couldn't find any information on that."

Do not go off topic.

Documents:
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

  const answer = await chain.invoke(lastUserMessage.content, { callbacks });
  return answer;
}
