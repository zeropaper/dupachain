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
