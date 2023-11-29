import { ChatOpenAI } from "langchain/chat_models/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { PromptTemplate } from "langchain/prompts";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { Database } from "@local/supabase-types";

export async function answerUser(
  client: SupabaseClient<Database>,
  chatId: string,
) {
  const { data: chatMessages, error } = await client
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  if (!chatMessages) {
    throw new Error("No chat found");
  }

  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }
  const lastAssistantMessage = chatMessages.at(-1);
  if (!lastAssistantMessage || lastAssistantMessage.role !== "assistant") {
    throw new Error("No last assistant message found");
  }

  const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
  });

  const store = new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client,
    tableName: "openai_embeddings",
    queryName: "match_openai_embeddings",
  });

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
  console.log("answer", answer);

  await client
    .from("chat_messages")
    .update({
      content: answer,
      finished: true,
    })
    .eq("id", lastAssistantMessage.id);
}
