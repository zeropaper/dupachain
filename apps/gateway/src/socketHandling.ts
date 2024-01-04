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
  return async (chatId, cb = noop) => {
    try {
      const { data: chat, error: chatError } = await client
        .from("chats")
        .select()
        .eq("id", chatId)
        .single();

      if (chatError) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: chatError,
        });
        throw new Error(chatError.message);
      }

      if (!chat) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: "no chat",
        });
        throw new Error("no chat");
      }

      if (!isChatsRow(chat)) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: "invalid chat",
        });
        throw new Error("invalid chat");
      }

      const { data: messages, error: messagesError } = await client
        .from("chat_messages")
        .select("content, role, created_at, updated_at, finished, id, chat_id")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: messagesError,
        });
        throw new Error(messagesError.message);
      }

      if (!messages) {
        logger.error({
          op: "join",
          socket: socket.id,
          error: "no data",
        });
        throw new Error("no data");
      }

      logger.info({
        op: "join",
        socket: socket.id,
        chatId,
        messages,
      });

      await subscribeToChat({ chat, socket, logger, client });

      logger.info({
        op: "socket subscribe",
        socket: socket.id,
        chatId,
      });
      // TODO: this may not scale if they are a lot of messages or they are big...
      cb({ status: "ok", result: messages });
    } catch (error) {
      logger.error({
        op: "socket subscribe",
        socket: socket.id,
        error,
      });
      cb({
        status: "error",
        error: error instanceof Error ? error.message : error,
      });
    }
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
  return async ({ agentId = DEFAULT_AGENT_ID } = {}, cb = noop) => {
    try {
      const agentDescription = loadAgent(agentId);
      const { data: chat, error } = await client
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
        throw new Error(error.message);
      }

      if (!chat) {
        logger.error({
          op: "socket start",
          socket: socket.id,
          error: "no data",
        });
        throw new Error(`Missing chat data`);
      }

      if (!isChatsRow(chat)) {
        logger.error({
          op: "socket start",
          socket: socket.id,
          error: "invalid chat",
        });
        throw new Error(`Invalid chat data`);
      }

      await subscribeToChat({ chat, socket, logger, client });

      logger.info({
        op: "socket subscribe",
        socket: socket.id,
        chatId: chat.id,
      });
      cb({ status: "ok", result: { chat_id: chat.id } });
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
