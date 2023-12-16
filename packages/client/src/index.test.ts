import { describe, it, expect, beforeAll, beforeEach } from "vitest";

import { getClient } from "./index";

describe.skip("chat over socket", () => {
  let client: ReturnType<typeof getClient>;
  let chatId: string;
  beforeAll(async () => {
    client = getClient("http://localhost:3030");
  });

  beforeEach(async () => {
    const { chat_id } = await client.start();
    if (chatId && chatId === chat_id) {
      throw new Error("chat id should be different");
    }
    chatId = chat_id;
  });

  async function waitMessagesUpdate(ms: number = 10000) {
    let settled = false;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error("timeout for messages update"));
        uns();
      }, ms);
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
    });
  }

  it("can be used to chat", async () => {
    const messages = ["Hello", "yes"];
    for (let i = 0; i < messages.length; i++) {
      const startCount = i * 2;
      expect(client.getMessages()).toHaveLength(startCount);
      let messagesUpdatePromise = waitMessagesUpdate();
      const sendPromise = client.send(messages.at(i)!);
      // the first update will be the user message
      await expect(messagesUpdatePromise).resolves.toHaveLength(1 + startCount);
      // the second update will be the assistant placeholder
      await expect(waitMessagesUpdate()).resolves.toHaveLength(2 + startCount);
      // the third update will be the assistant answer
      await expect(waitMessagesUpdate()).resolves.toHaveLength(2 + startCount);

      const result = await sendPromise;
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
  }, 60000);
});
