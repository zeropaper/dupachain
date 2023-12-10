import { z } from "zod";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { ChatMessagesRow } from "../types";
import { Callbacks } from "langchain/dist/callbacks/manager";

const responseSchema = z.object({
  intent: z.string(),
  confidence: z.number().min(0).max(1),
});

export default async function determineUserIntent({
  chatMessages,
  possibleIntents = ["greet", "goodbye", "question", "statement"],
  callbacks,
}: {
  chatMessages: ChatMessagesRow[];
  possibleIntents?: string[];
  callbacks?: Callbacks;
}) {
  const [lastAssistantMessage, lastUserMessage] = chatMessages.slice(-2);

  const model = new OpenAI({
    temperature: 0,
    // https://platform.openai.com/docs/models/gpt-3-5
    // Similar capabilities as text-davinci-003 but compatible with legacy Completions endpoint and not Chat Completions.
    modelName: "gpt-3.5-turbo-instruct",
  });

  const prompt =
    PromptTemplate.fromTemplate(`You are determining the intent of the user using the provided information.
Your answer must be a valid JSON string with the following structure:
- intent: string, one of the available intents below
- confidence: 2 digits number between 0 and 1 indicating your confidence in the intent

The last user message was:
<<< user message starts >>>
{userMessage}
<<< user message ends >>>

<<< context starts >>>
{context}
<<< context ends >>>

Available intents are:
<<< intents starts >>>
{intents}
<<< intents ends >>>

Your answer:`);

  const formatted = await prompt.format({
    assistantMessage: lastAssistantMessage.content,
    userMessage: lastUserMessage.content,
    intents: possibleIntents.map((str) => `"${str}"`).join("\n"),
    context: chatMessages
      .slice(-6, -1)
      .map(
        (message) =>
          `${message.role === "user" ? "human" : "ai"}: ${message.content}`,
      )
      .join("\n\n"),
  });

  return responseSchema.parse(
    JSON.parse(
      await model.invoke(formatted, {
        callbacks,
      }),
    ),
  );
}
