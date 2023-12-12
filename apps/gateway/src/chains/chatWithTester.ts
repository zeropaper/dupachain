import OpenAI from "openai";
import { ChatMessagesRow } from "../types";
import { RunChain } from "../types";

export type Details = ["tester" | "agent", number, any, any][];

export const TESTER_PROMPT_PREFIX = `You are a QA assistant very skilled at impersonating fictional people and use all your skills test a chatbot based on a scenario.

Your messages are only a valid JSON object having the following properties:
- goalMet: whether the goal of your scenario is met
- message: the message you send to the chatbot
- reasoning: your reasoning for sending this message

Here is the scenario you have to follow:`;

export async function chatWithTester({
  runChain,
  systemPrompt,
  testerDescription,
  maxCalls = 10,
  model = "gpt-3.5-turbo-1106",
}: {
  runChain: RunChain;
  systemPrompt: string;
  testerDescription: string;
  maxCalls?: number;
  model?: "gpt-3.5-turbo-1106" | "gpt-4-1106-preview";
}): Promise<{ details: Details }> {
  const openai = new OpenAI();

  const messages: OpenAI.ChatCompletionCreateParams["messages"] = [
    {
      role: "system",
      content: testerDescription,
    },
  ];
  const details: Details = [];

  while (details.length < maxCalls * 2) {
    const testerSetup: OpenAI.ChatCompletionCreateParams = {
      model,
      messages,
      temperature: 0.9,
      user: "tester",
      response_format: { type: "json_object" },
    };
    const testerMessageResponse =
      await openai.chat.completions.create(testerSetup);
    details.push(["tester", Date.now(), testerSetup, testerMessageResponse]);
    const info = JSON.parse(
      testerMessageResponse.choices[0].message.content || "null",
    );
    messages.push({
      role: "assistant",
      content: info.message,
    });
    console.log("\x1b[33mtester\n%s\x1b[0m", JSON.stringify(info, null, 2));
    if (info.goalMet) {
      break;
    }
    messages.push({
      role: "user",
      content: "...",
    });

    const agentSetup = {
      systemPrompt,
      chatMessages: messages
        .filter(({ role }) => ["assistant", "user"].includes(role))
        .map((msg) => ({
          ...msg,
          role: msg.role === "assistant" ? "user" : "assistant",
        })) as ChatMessagesRow[],
    };
    const chainResult = await runChain(agentSetup);
    details.push(["agent", Date.now(), agentSetup, chainResult]);
    messages.push({
      role: "assistant",
      content: chainResult,
    });
    console.log("\x1b[34magent\n%s\x1b[0m", messages.at(-1)?.content);
  }

  return {
    details,
  };
}
