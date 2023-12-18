import { z } from "zod";
import { Json, DatabaseTable, Database } from "@local/supabase-types";
import { Callbacks } from "langchain/dist/callbacks";
import { agentSchema, chatsRowMetadataSchema } from "./schemas";

export { Json, DatabaseTable, Database };

export type ChatMessagesRow = DatabaseTable<"chat_messages", "Row">;

export type ChatsRow = DatabaseTable<"chats", "Row"> & {
  metadata: Json & z.infer<typeof chatsRowMetadataSchema>;
};

export interface RunChain {
  (options: {
    chatMessages: ChatMessagesRow[];
    systemPrompt: string;
    callbacks?: Callbacks;
  }): Promise<string>;
}

export type Agent = z.infer<typeof agentSchema>;
