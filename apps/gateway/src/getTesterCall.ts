import { ChatMessageInfo } from "@local/client";
import OpenAI from "openai";

const TESTER_PROMPT_PREFIX = `You are a QA assistant very skilled at impersonating fictional people and use all your skills test a chatbot based on a scenario.

Your messages are only a valid JSON object having the following properties:
- goalMet: whether the goal of your scenario is met
- message: the message you send to the chatbot
- reasoning: your reasoning for sending this message

Here is the scenario you have to follow:`;
export async function getTesterCall(
  persona: string,
  messages: Pick<ChatMessageInfo, "content" | "role">[] = [],
) {
  const openai = new OpenAI();
  const prompt = `${TESTER_PROMPT_PREFIX}\n${persona}\n`;
  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt },
      ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
    ],
  });
  return JSON.parse(result.choices[0].message.content || "null");
}
