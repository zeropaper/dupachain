import OGOpenAI from "openai";
import { OPENAI_API_KEY } from "../config";
import { ChatMessagesRow } from "../types";

export async function handleModeration({
  chatMessages,
}: {
  chatMessages: ChatMessagesRow[];
}) {
  const lastUserMessage = chatMessages.at(-2);
  if (!lastUserMessage || lastUserMessage.role !== "user") {
    throw new Error("No last user message found");
  }
  if (lastUserMessage.content.trim().length === 0) {
    // TODO: throw?
    throw new Error("Last user message is empty");
  }

  // parallelize moderation checks
  const responses = await Promise.allSettled([
    // TODO: create more moderation tools, log the moderation results
    async function () {
      const openai = new OGOpenAI({
        apiKey: OPENAI_API_KEY,
      });
      const moderation = await openai.moderations.create({
        input: lastUserMessage.content,
      });
      console.log("moderation", moderation);
      if (moderation.results[0].flagged) {
        throw new Error("Message is flagged");
      }
    },
    // TODO: look at https://js.langchain.com/docs/modules/chains/additional/constitutional_chain
  ]);

  return responses.forEach((response) => {
    if (response.status === "rejected") {
      throw new Error("Moderation rejected");
    }
  });
}
