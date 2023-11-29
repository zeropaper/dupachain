import "dotenv/config";

import { z } from "zod";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import express from "express";
import { createAnonClient } from "./supabase-client";
import { getVectorStore } from "./vector-store";
import { answerUser } from "./answerUser";

const app = express();
const server = createServer(app);
const io = new Server(server);

const supabase = createAnonClient();

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

// serve the index page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// for vector store ingestion
const postDocumentBodySchema = z.object({
  reference: z.string(),
  content: z.string(),
  metadata: jsonSchema,
  format: z.enum(["html", "markdown"]),
});
app.post("/documents", express.json(), async (req, res, next) => {
  try {
    // use a try-catch because not only dealing with supbabase errors
    const document = postDocumentBodySchema.parse(req.body);
    console.log("document", document);

    const { format, content, metadata, reference } = document;

    const splitter = RecursiveCharacterTextSplitter.fromLanguage(format, {
      chunkSize: 256,
      chunkOverlap: 20,
    });

    const splitDocuments = await splitter.createDocuments(
      [content],
      [
        {
          ...(metadata as Record<string, any>),
          format,
          reference,
        },
      ],
    );

    const store = getVectorStore();
    await store.addDocuments(splitDocuments);

    res.status(204).end();
  } catch (err) {
    console.error("error", err);
    next(new Error("Ingestion error"));
  }
});

// for starting a chat
app.post("/chats", express.json(), async (req, res, next) => {
  const insertChat = await supabase.from("chats").insert({}).select().single();
  console.info("insertChat", insertChat);
  if (insertChat.error) {
    console.error("insertChat error", insertChat.error);
    return next(new Error("insertChat error"));
  }

  res.status(insertChat.status).send(JSON.stringify(insertChat.data));
});

// for posting messages
const postMessageBodySchema = z.object({
  chat_id: z.string(),
  content: z.string(),
});
async function addUserMessage(message: z.infer<typeof postMessageBodySchema>) {
  const insertUserMessage = await supabase.from("chat_messages").insert({
    ...postMessageBodySchema.parse(message),
    role: "user",
    finished: true,
  });
  if (insertUserMessage.error) {
    console.error("insertUserMessage error", insertUserMessage.error);
    return { error: insertUserMessage.error };
  }
  const insertAssistantMessage = await supabase
    .from("chat_messages")
    .insert({
      chat_id: message.chat_id,
      content: "...",
      role: "assistant",
      finished: false,
    })
    .select()
    .single();
  if (insertAssistantMessage.error) {
    console.error("insertAssistantMessage error", insertAssistantMessage.error);
    return { error: insertAssistantMessage.error };
  }
  answerUser(supabase, message.chat_id);
  return insertAssistantMessage;
}
app.post("/messages", express.json(), async (req, res, next) => {
  const { chat_id, content } = postMessageBodySchema.parse(req.body);
  const insertMessage = await addUserMessage({ chat_id, content });

  if (insertMessage.error) {
    console.error("insertMessage error", insertMessage.error);
    return next(new Error("insertMessage error"));
  }

  res.status(insertMessage.status).send(JSON.stringify(insertMessage.data));
});

// for getting updates
const subscribers = new Map<string, Set<Socket>>();
const subscribeToChat = async (chatId: string, socket: Socket) => {
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
};

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
    await addUserMessage(data);
  });
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(3000, () => {
  console.log("listening on port 3000");
});
