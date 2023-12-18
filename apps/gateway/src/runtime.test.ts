import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

import { getClient, ChatMessageInfo, ChatClient } from "@local/client";
import OpenAI from "openai";
import { Agent } from "./types";
import { loadAgent } from "./loadAgent";
config({ path: resolve(__dirname, "../../../.env") });
const openai = new OpenAI();

const TESTER_PROMPT_PREFIX = `You are a QA assistant very skilled at impersonating fictional people and use all your skills test a chatbot based on a scenario.

Your messages are only a valid JSON object having the following properties:
- goalMet: whether the goal of your scenario is met
- message: the message you send to the chatbot
- reasoning: your reasoning for sending this message

Here is the scenario you have to follow:`;

async function getTesterCall(
  persona: string,
  messages: Pick<ChatMessageInfo, "content" | "role">[] = [],
) {
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

const agents = {
  default: loadAgent("default"),
};

describe.each(Object.entries(agents))(
  "chat over socket",
  (name, agentSetup) => {
    let client: ChatClient;
    let chatId: string;
    beforeAll(async () => {
      client = getClient("http://localhost:3030");
    });

    async function waitMessagesUpdate(ms: number = 15000) {
      let settled = false;
      return new Promise((resolve, reject) => {
        const uns = client.subscribe((messages) => {
          if (settled) {
            reject(new Error("already settled"));
            uns();
            return;
          }
          settled = true;
          resolve(messages);
          uns();
        });

        setTimeout(() => {
          if (settled) {
            return;
          }
          settled = true;
          reject(new Error("timeout for messages update"));
          uns();
        }, ms);
      });
    }

    it.each(
      (agentSetup.testing?.personas || []).map(
        ({ name, profile, maxCalls }) => [name, profile, maxCalls],
      ),
    )(
      "can be used to chat with %s",
      async (name, persona, maxCalls) => {
        client.stop(true);
        const { chat_id } = await client.start();
        if (chatId && chatId === chat_id) {
          throw new Error("chat id should be different");
        }
        chatId = chat_id;
        const messages: Pick<ChatMessageInfo, "content" | "role">[] = [];
        for (let i = 0; i < maxCalls; i++) {
          const startCount = i * 2;
          expect(client.getMessages()).toHaveLength(startCount);
          const testerCall = await getTesterCall(persona, messages);
          messages.push({
            role: "assistant",
            content: testerCall.message,
          });
          console.info(
            "tester: %s (%s / %s)\n\t%s",
            name,
            i,
            maxCalls,
            testerCall.message,
            testerCall.goalMet,
          );
          if (testerCall.goalMet) {
            break;
          }
          let messagesUpdatePromise = waitMessagesUpdate(1500);
          const sendPromise = client.send(testerCall.message);
          // the first update will be the user message
          await expect(messagesUpdatePromise).resolves.toHaveLength(
            1 + startCount,
          );
          // the second update will be the assistant placeholder
          await expect(waitMessagesUpdate(1000)).resolves.toHaveLength(
            2 + startCount,
          );
          // the third update will be the assistant answer
          await expect(waitMessagesUpdate()).resolves.toHaveLength(
            2 + startCount,
          );

          const result = await sendPromise;
          messages.push({
            role: "user",
            content: result.content,
          });
          console.info("chat bot\n\t%s", messages.at(-1)!.content);
          expect(result).toHaveProperty("role", "assistant");
          expect(result).toHaveProperty("finished", true);
          expect(result).toHaveProperty("content");

          const lastMessage = client.getMessages().at(-1);
          expect(lastMessage).toHaveProperty("role", "assistant");
          expect(lastMessage).toHaveProperty("finished", true);
          expect(lastMessage).toHaveProperty("content");
          expect(lastMessage).toHaveProperty("content", result.content);
          expect(lastMessage).toHaveProperty("id", result.id);
        }
      },
      60000,
    );
  },
);
