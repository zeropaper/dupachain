import { Database } from "@local/supabase-types";
import { Literal } from "./schemas";

export type ChatMessagesRow =
  Database["public"]["Tables"]["chat_messages"]["Row"];
export type Json = Literal | { [key: string]: Json } | Json[];

export interface RunChain {
  (options: {
    chatMessages: ChatMessagesRow[];
    systemPrompt: string;
  }): Promise<string>;
}
