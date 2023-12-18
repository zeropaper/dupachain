import { z } from "zod";
import { answerUser } from "./answerUser";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { postMessageBodySchema } from "../schemas";
import { Logger } from "pino";

export async function addUserMessage(
  anonClient: SupabaseClient<Database>,
  message: z.infer<typeof postMessageBodySchema>,
  logger: Logger,
) {
  const insertUserMessage = await anonClient.from("chat_messages").insert({
    ...postMessageBodySchema.parse(message),
    role: "user",
    finished: true,
  });
  if (insertUserMessage.error) {
    return {
      error: new Error(
        `Could not insert user message: ${insertUserMessage.error}`,
      ),
      data: null,
    };
  }
  const insertAssistantMessage = await anonClient
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
    return {
      error: new Error(
        `Could not insert assistant message: ${insertAssistantMessage.error}`,
      ),
      data: null,
    };
  }

  // not awaiting this because we don't want to block the response
  answerUser(message.chat_id, logger).catch((error) => {
    logger.error({
      op: "addUserMessage answerUser",
      error: error instanceof Error ? error.message : error,
      message,
    });
  });

  return insertAssistantMessage;
}
