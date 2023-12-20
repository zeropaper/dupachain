import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, DatabaseTable } from "@local/supabase-types";

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file
// TODO: make loading relative to the config file

export type ChainRunner = (options: {
  chatMessages: DatabaseTable<"chat_messages", "Row">[];
  systemPrompt: string;
  callbacks?: Callbacks;
  tools: AgentExecutor["tools"];
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

export type ToolLoader = (options: {
  callbacks?: any;
  client: SupabaseClient<Database>;
}) => Promise<ToolsMap>;
export type LogItems = [number, string, ...any[]][];
