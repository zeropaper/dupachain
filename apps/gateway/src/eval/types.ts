import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, DatabaseTable } from "@local/supabase-types";
import { EvalMessage } from "./runPersona";

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
export type EvalOutput = Record<
  string,
  Record<
    string,
    {
      messages: EvalMessage[];
      log: LogItems;
    }
  >
>;
