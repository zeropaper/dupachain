import { type Socket } from "socket.io";
import { type Logger } from "pino";
import { addUserMessage } from "./chats/addUserMessage";
import {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { loadAgent } from "./loadAgent";
import { ChatsRow } from "./types";
import { isChatsRow } from "./type-guards";

const DEFAULT_AGENT_ID = "default";
const noop = (...args: any[]): void => {};

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

  socket.on("user message", async (data, cb = noop) => {
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

export function makeSupabaseEventHandler() {
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

type SocketHandlerCallback = (
  info: { status: "error"; error: any } | { status: "ok"; result: any },
) => void;

function makeJoinHandler({
  client,
  logger,
  socket,
}: {
  client: SupabaseClient<any, "public", any>;
  logger: Logger;
  socket: Socket;
}): (chatId: string, cb?: SocketHandlerCallback) => Promise<void> {
  // TODO: that code is really cumbersome and should be refactored
  return async (chatId, cb = noop) => {
    const { data: chat, error } = await client
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
    client
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
        subscribeToChat({ chat, socket, logger, client: client })
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
  };
}

function makeStartHandler({
  client,
  logger,
  socket,
}: {
  client: SupabaseClient<any, "public", any>;
  logger: Logger;
  socket: Socket;
}): (
  {
    agentId,
  }?: {
    agentId?: string | undefined;
  },
  cb?: SocketHandlerCallback,
) => Promise<void> {
  // TODO: that code is really cumbersome and should be refactored
  return async ({ agentId = DEFAULT_AGENT_ID } = {}, cb = noop) => {
    try {
      const agentDescription = loadAgent(agentId);
      const { data, error } = await client
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
      subscribeToChat({ chat: data, socket, logger, client })
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
  };
}

export function handleSocketConnection({
  logger,
  client,
}: {
  logger: Logger;
  client: SupabaseClient;
}): (socket: Socket) => void {
  return (socket) => {
    logger.info({ op: "socket connection", socket: socket.id });

    socket.on("join", makeJoinHandler({ client, logger, socket }));

    socket.on("start", makeStartHandler({ client, logger, socket }));
  };
}
