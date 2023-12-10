import { z } from "zod";
import { answerUser } from "./answerUser";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { postMessageBodySchema } from "./schemas";

export async function addUserMessage(
  supabase: SupabaseClient<Database>,
  message: z.infer<typeof postMessageBodySchema>,
) {
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

  // not awaiting this because we don't want to block the response
  answerUser(supabase, message.chat_id);

  return insertAssistantMessage;
}
