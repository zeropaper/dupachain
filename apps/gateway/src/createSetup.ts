import { createServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import express from "express";
import helmet from "helmet";
import { type Logger } from "pino";
import pino from "pino";
import pinoHttp from "pino-http";

import { createAnonClient } from "./createAnonClient";
import { addUserMessage } from "./chats/addUserMessage";
import { postDocumentBodySchema, postMessageBodySchema } from "./schemas";
import { ingestDocument } from "./documents/ingestDocument";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// for getting updates
const subscribers = new Map<string, Set<Socket>>();
async function subscribeToChat({
  chatId,
  socket,
  logger,
}: {
  chatId: string;
  socket: Socket;
  logger: Logger;
}): Promise<void> {
  if (!subscribers.has(chatId)) {
    subscribers.set(chatId, new Set());
  }

  const chatSubscribers = subscribers.get(chatId)!;
  chatSubscribers.add(socket);
  logger.info(
    `added subscriber to chat ${chatId}, now has ${chatSubscribers.size} subscribers`,
  );

  socket.on("disconnect", () => {
    chatSubscribers.delete(socket);
    logger.info(
      `removed subscriber from chat ${chatId}, now has ${chatSubscribers.size} subscribers`,
    );
  });
}

function makeSupabaseEventHandler({ logger }: { logger: Logger }) {
  return function handleSupabaseEvent(
    payload: RealtimePostgresChangesPayload<{
      [key: string]: any;
    }>,
  ) {
    logger.info("got chat message update", payload);
    switch (payload.eventType) {
      case "INSERT":
      case "UPDATE":
        const chatId = payload.new.chat_id;
        const chatSubscribers = subscribers.get(chatId);
        if (!chatSubscribers) {
          logger.info(`no subscribers for chat ${chatId}`);
          return;
        }
        chatSubscribers.forEach((socket) => {
          socket.emit("chat message", payload.new);
        });
        break;
      default:
        logger.info(`ignoring event type ${payload.eventType}`);
        return;
    }
  };
}

export default async function createSetup(logger: Logger = pino()): Promise<{
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
      logger.info("document", document);

      await ingestDocument(document);

      res.status(204).end();
    } catch (err) {
      logger.error({
        message: "Document ingestion error",
        error: err,
      });
      next(new Error("Document ingestion error"));
    }
  });

  // for starting a chat - TODO: consider all chat interactions over sockets
  app.post("/chats", express.json(), async (req, res, next) => {
    const insertChat = await supabase
      .from("chats")
      .insert({})
      .select()
      .single();
    if (insertChat.error) {
      logger.error({
        message: "Chat creation error",
        error: insertChat.error,
      });
      return next(new Error("Chat creation error"));
    }

    res.status(insertChat.status).send(JSON.stringify(insertChat.data));
  });

  // for sending a message - TODO: consider all chat interactions over sockets
  app.post("/messages", express.json(), async (req, res, next) => {
    const { chat_id, content } = postMessageBodySchema.parse(req.body);
    const insertMessage = await addUserMessage(supabase, { chat_id, content });

    if (insertMessage.error) {
      logger.error({
        message: "Message creation error",
        error: insertMessage.error,
      });
      return next(new Error("Message creation error"));
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
      makeSupabaseEventHandler({ logger }),
    )
    .subscribe();

  io.on("connection", (socket) => {
    logger.info("a user connected");
    socket.on("subscribe", async (chatId: string) => {
      logger.info("subscribe", chatId);
      await subscribeToChat({ chatId, socket, logger });
    });
    socket.on("chat message", async (data) => {
      logger.info("incoming user message", data);
      await addUserMessage(supabase, data);
    });
    socket.on("disconnect", () => {
      logger.info("user disconnected");
    });
  });

  return { app, server };
}
