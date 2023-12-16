import { io, Socket } from "socket.io-client";

let socket: Socket;
let chats: Record<string, ChatMessageInfo[]> = {};

export interface ChatMessageInfo {
  role: "assistant" | "user";
  content: string;
  id: string;
  created_at: string;
  updated_at: string;
  finished: boolean;
}

export function getClient(url?: string) {
  type Subscriber = (messages: ChatMessageInfo[]) => void;
  const susbscribers = new Set<Subscriber>();
  function subscribe(fn: Subscriber): () => void {
    susbscribers.add(fn);
    return () => {
      susbscribers.delete(fn);
    };
  }
  function commit() {
    const msgs = getMessages();
    susbscribers.forEach((fn) => fn(msgs));
  }

  function getMessages() {
    return JSON.parse(
      JSON.stringify(chats[chatId!] || []),
    ) as ChatMessageInfo[];
  }

  // TODO: move chatId to the window scope?
  let chatId: string | null = null;
  function start(): Promise<{ chat_id: string }> {
    socket = url ? io(url) : io();
    socket.on("chat message", (info) => {
      const id = info.chat_id;
      chats[id] = chats[id] || ([] as ChatMessageInfo[]);
      const found = chats[id]?.findIndex((m) => m.id === info.id);

      if (found > -1) {
        chats[id][found] = info;
      } else {
        chats[id].push(info);
      }

      commit();
    });
    return new Promise((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(
          "start",
          (
            err: unknown,
            ack:
              | { status: "error"; error: string }
              | { status: "ok"; result: any },
          ) => {
            if (err) {
              reject(err);
              return;
            }
            if (ack.status === "error") {
              reject(new Error(`socket error: ${ack.error}`));
              return;
            }
            chatId = ack.result.chat_id;
            if (!chatId) {
              reject(new Error("no chat id"));
              return;
            }
            chats[chatId!] = [];
            resolve(ack.result);
          },
        );
    });
  }

  function join(newChatId: string) {
    socket = url ? io(url) : io();
    if (chatId && chatId === newChatId) {
      return Promise.resolve();
    }
    if (chatId && chatId !== newChatId) {
      return Promise.reject(new Error("chat already started"));
    }
    return new Promise((resolve, reject) => {
      socket
        .timeout(5000)
        .emit(
          "join",
          newChatId,
          (
            err: unknown,
            ack:
              | { status: "error"; error: string }
              | { status: "ok"; result: ChatMessageInfo[] },
          ) => {
            if (err) {
              reject(err);
              return;
            }
            if (ack.status === "error") {
              reject(new Error(`socket error: ${ack.error}`));
              return;
            }
            chatId = newChatId;
            chats[chatId!] = ack.result;
            resolve(ack.result);
            commit();
          },
        );
    });
  }

  function stop(disconnect: boolean = false) {
    if (socket && disconnect) socket.disconnect();
    chatId = null;
  }

  function send(
    message: string,
    ms = 15000,
  ): Promise<
    ChatMessageInfo & {
      role: "assistant";
    }
  > {
    return new Promise((resolve, reject) => {
      let settled = false;
      const uns = subscribe((messages) => {
        const res = (result: any) => {
          settled = true;
          resolve(result);
          uns();
          clearTimeout(timeout);
        };

        const updated = messages.at(-1);
        if (updated && updated?.finished && updated.role === "assistant") {
          res(updated);
          uns();
        }
      });

      const timeout = setTimeout(() => {
        if (settled) return;
        uns();
        reject(new Error("timeout"));
      }, ms);

      socket.emit("user message", {
        content: message,
        chat_id: chatId,
      });
    });
  }

  return {
    subscribe,
    getMessages,
    start,
    join,
    stop,
    send,
  };
}
