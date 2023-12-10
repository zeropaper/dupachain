import { createServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import express from "express";
import helmet from "helmet";
import { type Logger } from "pino";
import pinoHttp from "pino-http";

import { createAnonClient } from "./createAnonClient";
import { addUserMessage } from "./addUserMessage";
import { postDocumentBodySchema, postMessageBodySchema } from "./schemas";
import { ingestDocument } from "./ingestDocument";

// for getting updates
const subscribers = new Map<string, Set<Socket>>();
async function subscribeToChat(chatId: string, socket: Socket): Promise<void> {
  if (!subscribers.has(chatId)) {
    subscribers.set(chatId, new Set());
  }

  const chatSubscribers = subscribers.get(chatId)!;
  chatSubscribers.add(socket);
  console.log(
    `added subscriber to chat ${chatId}, now has ${chatSubscribers.size} subscribers`,
  );

  socket.on("disconnect", () => {
    chatSubscribers.delete(socket);
    console.log(
      `removed subscriber from chat ${chatId}, now has ${chatSubscribers.size} subscribers`,
    );
  });
}

export default async function createSetup(logger?: Logger): Promise<{
  server: ReturnType<typeof createServer>;
  app: ReturnType<typeof express>;
}> {
  const app = express();
  const server = createServer(app);
  const io = new SocketIOServer(server);
  const { PUBLIC_DIR } = await import("./config");
  const supabase = await createAnonClient();

  // logging - https://www.npmjs.com/package/pino-http#example
  app.use(pinoHttp({ logger }));

  // security - https://helmetjs.github.io/
  app.use(helmet());

  // serve the public directory
  app.get("/", express.static(PUBLIC_DIR));

  // serve the index page, can be overridden by the public directory
  app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
  });

  // for vector store ingestion
  app.post("/documents", express.json(), async (req, res, next) => {
    try {
      // use a try-catch because not only dealing with supbabase errors
      const document = postDocumentBodySchema.parse(req.body);
      console.log("document", document);

      await ingestDocument(document);

      res.status(204).end();
    } catch (err) {
      console.error("error", err);
      next(new Error("Ingestion error"));
    }
  });

  // for starting a chat
  app.post("/chats", express.json(), async (req, res, next) => {
    const insertChat = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();
    console.info("insertChat", insertChat);
    if (insertChat.error) {
      console.error("insertChat error", insertChat.error);
      return next(new Error("insertChat error"));
    }

    res.status(insertChat.status).send(JSON.stringify(insertChat.data));
  });

  app.post("/messages", express.json(), async (req, res, next) => {
    const { chat_id, content } = postMessageBodySchema.parse(req.body);
    const insertMessage = await addUserMessage(supabase, { chat_id, content });

    if (insertMessage.error) {
      console.error("insertMessage error", insertMessage.error);
      return next(new Error("insertMessage error"));
    }

    res.status(insertMessage.status).send(JSON.stringify(insertMessage.data));
  });

  supabase
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
      },
      (payload) => {
        console.log("got chat message update", payload);
        switch (payload.eventType) {
          case "INSERT":
          case "UPDATE":
            const chatId = payload.new.chat_id;
            const chatSubscribers = subscribers.get(chatId);
            if (!chatSubscribers) {
              console.log(`no subscribers for chat ${chatId}`);
              return;
            }
            chatSubscribers.forEach((socket) => {
              socket.emit("chat message", payload.new);
            });
            break;
          default:
            console.log(`ignoring event type ${payload.eventType}`);
            return;
        }
      },
    )
    .subscribe();

  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("subscribe", async (chatId: string) => {
      console.log("subscribe", chatId);
      await subscribeToChat(chatId, socket);
    });
    socket.on("chat message", async (data) => {
      console.log("incoming user message", data);
      await addUserMessage(supabase, data);
    });
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  return { app, server };
}
