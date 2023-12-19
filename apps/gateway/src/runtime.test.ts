import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";

import { getClient, ChatMessageInfo, ChatClient } from "@local/client";
import { loadAgent } from "./loadAgent";

config({ path: resolve(__dirname, "../../../.env") });

import { getTesterCall } from "./eval/getTesterCall";

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
