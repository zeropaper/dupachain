import express from "express";
import { type Logger } from "pino";
import { addUserMessage } from "./chats/addUserMessage";
import { postDocumentBodySchema, postMessageBodySchema } from "./schemas";
import { ingestDocument } from "./documents/ingestDocument";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";

export function createAPIRouter(
  logger: Logger,
  supabase: SupabaseClient<Database>,
) {
  const router = express.Router();

  // for vector store ingestion
  router.post("/documents", express.json(), async (req, res, next) => {
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
  router.post("/chats", express.json(), async (req, res, next) => {
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

  return router;
}
