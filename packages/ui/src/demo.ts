import { getClient } from "@local/client";

let chatId: string | undefined = window.location.hash.slice(1);
export async function init() {
  console.log("init", chatId);
  const chatEl = document.querySelector("dc-chat")!;

  // look at the window url hash for a chat id
  const hash = window.location.hash;
  if (hash) {
    chatId = hash.slice(1);
  }

  chatEl.addEventListener("open", async (): Promise<void> => {
    const client = getClient("http://localhost:3030");

    console.info("element", chatEl);

    client.subscribe((messages) => {
      chatEl.setMessages(messages);
    });

    chatEl.addEventListener("sendfeedback", async (e) => {
      console.info("sendfeedback", e.detail.feedback);
    });

    chatEl.addEventListener("send", async (e) => {
      chatEl.loading = true;
      if (!chatId) {
        chatId = await client.start().then(({ chat_id }) => chat_id);
        // update the hash of the window url
        window.location.hash = chatId!;
      }
      await client.send(e.detail.content);
      chatEl.loading = false;
      chatEl.clearInput();
    });

    if (chatId) {
      chatEl.loading = true;
      await client.join(chatId).catch((error) => console.error(error));
      chatEl.loading = false;
      window.location.hash = chatId;
    }
  });

  chatEl.openChat();
}

window.addEventListener("DOMContentLoaded", init);

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      newModule.init();
    }
  });
}
