import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { DatabaseTable } from "@local/supabase-types";
import { EvalMessage } from "./runPersona";

export type ChainRunner = (options: {
  chatMessages: DatabaseTable<"chat_messages", "Row">[];
  systemPrompt: string;
  callbacks?: Callbacks;
  tools: AgentExecutor["tools"];
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

export type ToolLoader = (options: { callbacks?: any }) => Promise<ToolsMap>;

// TODO: is it really smart to use an array here?
export type LogItems = [
  number, // timestamp
  string, // scope
  string, // event
  ...any[],
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
