import { ChatOpenAI } from "langchain/chat_models/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { PromptTemplate } from "langchain/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { Database } from "@local/supabase-types";

import determineUserIntent from "./determineUserIntent";
import { handleModeration } from "./handleModeration";
import { getOpenAIStore } from "../tools/stores";

// 1. Determine the context of the user message
// 2. Ensure the message safety
// 3. Determine the intent of the user message
// 4. Determine the chain to use
// 5. Run the chain

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
  if (chatMessages.length < 2) {
    throw new Error("Not enough chat messages");
  }

  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }
  const lastAssistantMessage = chatMessages.at(-1);
  if (!lastAssistantMessage || lastAssistantMessage.role !== "assistant") {
    throw new Error("No last assistant message found");
  }

  function saveAnswer(answer: string) {
    return client
      .from("chat_messages")
      .update({
        content: answer,
        finished: true,
      })
      .eq("id", lastAssistantMessage!.id)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          throw new Error(error.message);
        }
        if (!data) {
          throw new Error("Could not update assistant message");
        }
        return data;
      });
  }

  // TODO: should the moderation and intent determination be done in parallel?
  await handleModeration({
    chatMessages,
  });

  const intent = await determineUserIntent({
    chatMessages,
  });

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

  return saveAnswer(answer);
}
