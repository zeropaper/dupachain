import { getClient } from "@local/client";

let chatId: string | null = null;
async function init() {
  const chatEl = document.querySelector("dc-chat")!;

  // look at the window url hash for a chat id
  const hash = window.location.hash;
  if (hash) {
    chatId = hash.slice(1);
  }

  chatEl.addEventListener("open", async (): Promise<void> => {
    const client = getClient("http://localhost:3030");

    console.info("element", chatEl);

    if (chatId) {
      client.join(chatId).catch((error) => console.error(error));
    }

    client.subscribe((messages) => {
      chatEl.setMessages(messages);
    });

    chatEl.addEventListener("send", async (e) => {
      if (!chatId) {
        chatId = await client.start().then(({ chat_id }) => chat_id);
        // update the hash of the window url
        window.location.hash = chatId!;
      }
      client.send(e.detail.content);
    });
  });

  chatEl.openChat();
}

window.addEventListener("DOMContentLoaded", init);
