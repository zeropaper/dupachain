import { Database, DatabaseTable } from "@local/supabase-types";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  AIMessage,
  BaseChatMessageHistory,
  BaseMessage,
  HumanMessage,
} from "langchain/schema";

export class SupabaseChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "supabase"];
  constructor(
    private readonly supabaseClient: SupabaseClient<Database>,
    private readonly chatId: string,
  ) {
    super();
  }

  async getMessages() {
    const { data, error } = await this.supabaseClient
      .from("chat_messages")
      .select()
      .eq("chat_id", this.chatId);
    if (error) {
      throw new Error(`getMessages: ${error.message}`);
    }
    if (!data) {
      throw new Error("getMessages: No chat messages found");
    }
    return data.map((message) =>
      message.role === "user"
        ? new HumanMessage(message.content)
        : new AIMessage(message.content),
    );
  }

  async addMessage(message: BaseMessage) {
    const insertions: DatabaseTable<"chat_messages", "Insert">[] = [];
    if (typeof message.content === "string") {
      insertions.push({
        chat_id: this.chatId,
        content: message.content,
        role: message instanceof HumanMessage ? "user" : "assistant",
        name: message.name,
        finished: true,
      });
    } else {
      throw new Error("Unsupported message type");
    }
    const { error } = await this.supabaseClient
      .from("chat_messages")
      .insert(insertions);
    if (error) {
      throw new Error(`addMessage: ${error.message}`);
    }
  }

  async addUserMessage(message: string) {
    const { error } = await this.supabaseClient.from("chat_messages").insert({
      chat_id: this.chatId,
      content: message,
      role: "user",
      finished: true,
    });
    if (error) {
      throw new Error(`addUserMessage: ${error.message}`);
    }
  }

  async addAIChatMessage(message: string) {
    const { error } = await this.supabaseClient.from("chat_messages").insert({
      chat_id: this.chatId,
      content: message,
      role: "assistant",
      finished: true,
    });
    if (error) {
      throw new Error(`addAIChatMessage: ${error.message}`);
    }
  }

  async clear() {
    // Implement the method logic here
  }
}
