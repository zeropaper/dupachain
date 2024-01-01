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
import { Database, DatabaseTable } from "@local/supabase-types";
import { loadAgent } from "./loadAgent";
import { ChatsRow } from "./types";
import { isChatsRow } from "./type-guards";

const DEFAULT_AGENT_ID = "default";

// for getting updates
const subscribers = new Map<string, Set<Socket>>();
async function subscribeToChat({
  chat,
  socket,
  logger,
  client: anonClient,
}: {
  chat: ChatsRow;
  socket: Socket;
  logger: Logger;
  client: SupabaseClient<Database>;
}): Promise<void> {
  if (!subscribers.has(chat.id)) {
    subscribers.set(chat.id, new Set());
  }

  const chatSubscribers = subscribers.get(chat.id)!;
  chatSubscribers.add(socket);

  logger.info({
    op: "chat connect",
    socket: socket.id,
    subscribersCount: chatSubscribers.size,
  });

  socket.on("user message", async (data, cb = () => {}) => {
    logger.info({ op: "user message", socket: socket.id, data });
    addUserMessage(anonClient, data, chat, logger)
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
  const { PUBLIC_DIR, CORS_ORIGINS, NODE_ENV } = await import("./config");
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
              // in production, we don't want to allow requests without an origin until we implement some other sort of authentication (headers)
              cb(null, NODE_ENV !== "production");
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

  const router = createAPIRouter({ logger });

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

    // TODO: refactor that
    socket.on("join", async (chatId, cb = () => {}) => {
      const { data: chat, error } = await anonClient
        .from("chats")
        .select()
        .eq("id", chatId)
        .single();
      if (error) {
        logger.error({
          op: "join",
          socket: socket.id,
          error,
        });
        cb({ status: "error", error: error.message });
        return;
      }
      if (!chat) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: "no chat",
        });
        cb({ status: "error", error: "no chat" });
        return;
      }
      if (!isChatsRow(chat)) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: "invalid chat",
        });
        cb({ status: "error", error: "invalid chat" });
        return;
      }
      anonClient
        .from("chat_messages")
        .select("content, role, created_at, updated_at, finished, id, chat_id")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            logger.error({
              op: "join",
              socket: socket.id,
              error,
            });
            cb({ status: "error", error: error.message });
            return;
          }
          if (!data) {
            logger.error({
              op: "join",
              socket: socket.id,
              error: "no data",
            });
            cb({ status: "error", error: "no data" });
            return;
          }
          logger.info({
            op: "join",
            socket: socket.id,
            chatId,
            messages: data,
          });
          subscribeToChat({ chat, socket, logger, client: anonClient })
            .then(() => {
              logger.info({
                op: "socket subscribe",
                socket: socket.id,
                chatId,
              });
              cb({ status: "ok", result: data });
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

    // TODO: refactor that
    socket.on(
      "start",
      async (
        { agentId = DEFAULT_AGENT_ID }: { agentId?: string } = {},
        cb = () => {},
      ) => {
        try {
          const agentDescription = loadAgent(agentId);
          const { data, error } = await anonClient
            .from("chats")
            .insert({
              metadata: {
                systemPrompt: agentDescription.systemPrompt,
              },
            })
            .select()
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
          if (!isChatsRow(data)) {
            logger.error({
              op: "socket start",
              socket: socket.id,
              error: "invalid chat",
            });
            cb({ status: "error", error: "invalid chat" });
            return;
          }
          subscribeToChat({ chat: data, socket, logger, client: anonClient })
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
        } catch (error) {
          logger.error({
            op: "socket start",
            socket: socket.id,
            error,
          });
          cb({
            status: "error",
            error: error instanceof Error ? error.message : error,
          });
          return;
        }
      },
    );
  });

  return { app, server };
}
