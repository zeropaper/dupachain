import express from "express";
import { type Logger } from "pino";
import { addUserMessage } from "./chats/addUserMessage";
import { postDocumentBodySchema, postMessageBodySchema } from "./schemas";
import { ingestDocument } from "./documents/ingestDocument";
import { createAnonClient } from "./createAnonClient";
import { ChatsRow } from "./types";

export function createAPIRouter({ logger }: { logger: Logger }) {
  // when mounted on the server, this router will be available at /api
  const router = express.Router();
  router.get("/health", (req, res) => {
    res.status(200).send("ok");
  });

  // for vector store ingestion
  router.post("/documents", express.json(), async (req, res, next) => {
    // use a try-catch because not only dealing with supbabase errors
    try {
      const document = postDocumentBodySchema.parse(req.body);
      await ingestDocument(document);

      res.status(204).end();
    } catch (error) {
      logger.error({
        message: "Document ingestion error",
        error,
      });
      next(new Error("Document ingestion error"));
    }
  });

  // for starting a chat - TODO: consider all chat interactions over sockets
  router.post("/chats", express.json(), async (req, res, next) => {
    const supabase = createAnonClient();
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
  router.post("/messages", express.json(), async (req, res, next) => {
    const supabase = createAnonClient();
    const { chat_id, content } = postMessageBodySchema.parse(req.body);
    const chat = await supabase
      .from("chats")
      .select()
      .eq("id", chat_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          logger.error({
            message: "Chat retrieval error",
            error,
          });
          throw new Error("Chat retrieval error");
        }
        if (!data) {
          logger.error({
            message: "Chat not found",
          });
          throw new Error("Chat not found");
        }
        return data as ChatsRow;
      });
    const insertMessage = await addUserMessage(
      supabase,
      { chat_id, content },
      chat,
      logger,
    );

    if (insertMessage.error) {
      logger.error({
        message: "Message creation error",
        error: insertMessage.error,
      });
      return next(new Error("Message creation error"));
    }

    res.status(insertMessage.status).send(JSON.stringify(insertMessage.data));
  });

  return router;
}
