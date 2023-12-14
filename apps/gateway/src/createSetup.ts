import { createServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import express from "express";
import helmet from "helmet";
import { type Logger } from "pino";
import pino from "pino";
import pinoHttp from "pino-http";

import { createAnonClient } from "./createAnonClient";
import { addUserMessage } from "./chats/addUserMessage";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createAPIRouter as createAPIRouter } from "./createAPIRouter";

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

  const router = createAPIRouter(logger);

  app.use("/api", router);

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
    socket.on("start", async (cb) => {
      logger.info("start");
      const { data, error } = await supabase
        .from("chats")
        .insert({})
        .select("id")
        .single();
      if (error) {
        logger.error(error);
        cb({ status: "error", error: error.message });
        return;
      }
      if (!data) {
        logger.error("no data");
        cb({ status: "error", error: "no data" });
        return;
      }
      subscribeToChat({ chatId: data.id, socket, logger })
        .then(() => {
          cb({ status: "ok", result: { chat_id: data.id } });
        })
        .catch((error) => {
          cb({ status: "error", error: error.message });
        });
    });
    socket.on("chat message", async (data, cb) => {
      logger.info(data);
      addUserMessage(supabase, data)
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
      logger.info("user disconnected");
    });
  });

  return { app, server };
}
