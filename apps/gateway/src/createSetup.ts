import { createServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import express from "express";
import helmet from "helmet";
import { type Logger } from "pino";
import pino from "pino";
import pinoHttp from "pino-http";

import { createAnonClient } from "./createAnonClient";
import { addUserMessage } from "./chats/addUserMessage";
import {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { createAPIRouter as createAPIRouter } from "./createAPIRouter";
import { Database } from "@local/supabase-types";

// for getting updates
const subscribers = new Map<string, Set<Socket>>();
async function subscribeToChat({
  chatId,
  socket,
  logger,
  client: anonClient,
}: {
  chatId: string;
  socket: Socket;
  logger: Logger;
  client: SupabaseClient<Database>;
}): Promise<void> {
  if (!subscribers.has(chatId)) {
    subscribers.set(chatId, new Set());
  }

  const chatSubscribers = subscribers.get(chatId)!;
  chatSubscribers.add(socket);

  logger.info({
    op: "chat connect",
    socket: socket.id,
    subscribersCount: chatSubscribers.size,
  });

  socket.on("user message", async (data, cb = () => {}) => {
    logger.info({ op: "user message", socket: socket.id, data });
    addUserMessage(anonClient, data, logger)
      .then(({ data, error }) => {
        cb(
          error
            ? { status: "error", error: error.message }
            : { status: "ok", result: data },
        );
      })
      .catch((error) => {
        cb({ status: "error", error: error.message });
      });
  });

  socket.on("disconnect", () => {
    chatSubscribers.delete(socket);
    logger.info({
      op: "chat diconnect",
      socket: socket.id,
      subscribersCount: chatSubscribers.size,
    });
  });
}

function makeSupabaseEventHandler() {
  return function handleSupabaseEvent(
    payload: RealtimePostgresChangesPayload<{
      [key: string]: any;
    }>,
  ) {
    switch (payload.eventType) {
      case "INSERT":
      case "UPDATE":
        const chatId = payload.new.chat_id;
        const chatSubscribers = subscribers.get(chatId);
        if (!chatSubscribers) {
          return;
        }
        chatSubscribers.forEach((socket) => {
          socket.emit("chat message", payload.new);
        });
        break;
      default:
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
  const { PUBLIC_DIR, CORS_ORIGINS } = await import("./config");
  const anonClient = await createAnonClient();

  const allowedOrigins = CORS_ORIGINS ? CORS_ORIGINS.split(",") : [];
  const io = new SocketIOServer(
    server,
    CORS_ORIGINS
      ? {
          cors: {
            origin: "*",
          },
          allowRequest: (req, cb) => {
            const origin = req.headers.origin;
            if (!origin) {
              logger.info({
                op: "socket.io allowRequest",
                origin: "no origin",
              });
              cb(null, false);
              return;
            }
            const allowed = allowedOrigins.includes(origin);
            logger.info({ op: "socket.io allowRequest", origin, allowed });
            cb(null, allowed);
          },
        }
      : {},
  );

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

  const router = createAPIRouter(logger);

  app.use("/api", router);

  anonClient
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
      },
      makeSupabaseEventHandler(),
    )
    .subscribe();

  io.on("connection", (socket) => {
    logger.info({ op: "socket connection", socket: socket.id });

    socket.on("start", async (cb = () => {}) => {
      const { data, error } = await anonClient
        .from("chats")
        .insert({})
        .select("id")
        .single();
      if (error) {
        logger.error({
          op: "socket start",
          socket: socket.id,
          error,
        });
        cb({ status: "error", error: error.message });
        return;
      }
      if (!data) {
        logger.error({
          op: "socket start",
          socket: socket.id,
          error: "no data",
        });
        cb({ status: "error", error: "no data" });
        return;
      }
      subscribeToChat({ chatId: data.id, socket, logger, client: anonClient })
        .then(() => {
          logger.info({
            op: "socket subscribe",
            socket: socket.id,
            chatId: data.id,
          });
          cb({ status: "ok", result: { chat_id: data.id } });
        })
        .catch((error) => {
          logger.error({
            op: "socket subscribe",
            socket: socket.id,
            error,
          });
          cb({ status: "error", error: error.message });
        });
    });
  });

  return { app, server };
}
