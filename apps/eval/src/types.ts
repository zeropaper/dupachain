import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { DatabaseTable } from "@local/supabase-types";
import { BaseCache } from "langchain/schema";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

export type ChainRunner = (options: {
  chatMessages: DatabaseTable<"chat_messages", "Row">[];
  systemPrompt: string;
  callbacks?: Callbacks;
  cache?: BaseCache;
  tools: AgentExecutor["tools"];
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

export type ToolLoader = (options: { callbacks?: any }) => Promise<ToolsMap>;

export type LogItems = [
  number, // timestamp
  string, // scope
  string, // event
  Record<string, any>,
][];

export type EvalPersonaResult = {
  messages: EvalMessage[];
  log: LogItems;
};

export type EvalPersonaMap = Record<
  string, // persona hash
  EvalPersonaResult
>;

export type EvalPromptMap = Record<
  string, // prompt hash
  EvalPersonaMap
>;

export type EvalRunnerMap = Record<
  string, // runner body hash
  EvalPromptMap
>;

export type EvalOutput = EvalRunnerMap;
