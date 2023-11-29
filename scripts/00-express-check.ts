import "dotenv/config";

import { io } from "socket.io-client";
const gatewayURL = "http://localhost:3000";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function createChat(): Promise<string> {
  const createChatResponse = await fetch(`${gatewayURL}/chats`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const createChatJson = (await createChatResponse.json()) as { id: string };
  return createChatJson.id;
}

async function postMessage(chatId: string, content: string): Promise<any> {
  const postMessageResponse = await fetch(`${gatewayURL}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      chat_id: chatId,
      content,
    }),
  });
  const postMessageJson = await postMessageResponse.json();
  console.log("got response for message", postMessageJson);
  return postMessageJson;
}

async function main() {
  const chatId = await createChat();

  const socket = io(gatewayURL);
  socket.on("updates", (...args: any[]) => {
    console.log("got update", ...args);
  });
  socket.emit("subscribe", chatId);

  await postMessage(chatId, "Hello, world!");
}

main();
