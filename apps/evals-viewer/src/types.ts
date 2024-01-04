export type Info = {
  setup: ConfigSchema;
  output: EvalOutput;
};

import { ConfigSchema } from "@local/schemas";
import { EvalOutput } from "./types";

export type {
  ConfigSchema,
  GoalSchema,
  GoalTestSchema,
  PersonaSchema,
  RunnerSchema,
  ToolsSchema,
  RunnersSchema,
} from "@local/schemas";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

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
