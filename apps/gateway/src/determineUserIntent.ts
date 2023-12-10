import { OpenAI } from "langchain/llms/openai";
import { ChatMessagesRow } from "./types";

export async function determineUserIntent({
  chatMessages,
}: {
  chatMessages: ChatMessagesRow[];
}) {
  const [lastUserMessage, lastAssistantMessage] = chatMessages.slice(-2);

  const model = new OpenAI({
    // https://platform.openai.com/docs/models/gpt-3-5
    // Similar capabilities as text-davinci-003 but compatible with legacy Completions endpoint and not Chat Completions.
    modelName: "gpt-3.5-turbo-instruct",
  });
}
