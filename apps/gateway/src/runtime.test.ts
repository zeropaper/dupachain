import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

import { getClient, ChatMessageInfo } from "@local/client";
import { TESTER_PROMPT_PREFIX } from "./chains/chatWithTester";
import OpenAI from "openai";
config({ path: resolve(__dirname, "../../../.env") });
const openai = new OpenAI();

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
  const json = JSON.parse(result.choices[0].message.content || "null");
  return json;
}

describe("chat over socket", () => {
  let client: ReturnType<typeof getClient>;
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

  it.each([
    [
      "Greg",
      "You are Greg, a snowboarder who is looking for a new snowboard. You weight about 80kg and are 1.8m tall. You are experienced and do mostly park riding. You have big feet and need a wide board. You only give the information one by one when they are specifically asked. You make short sentences",
      8,
    ],
    [
      "Jenny",
      "You are Jenny, a beginner snowboarder who is looking for a new snowboard. You weight about 60kg and are 1.6m tall. You are a beginner and do mostly piste riding. You have small feet and need a narrow board. You are very chatty but don't know much about snowboards and answer as if you were under the influence.",
      20,
    ],
  ])(
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
        console.info("tester\n\t%s", messages.at(-1)!.content);
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
        await expect(waitMessagesUpdate(500)).resolves.toHaveLength(
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
});
