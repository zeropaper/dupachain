import { z } from "zod";
import { Database, DatabaseTable, Json } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";
import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { BaseCache } from "langchain/schema";

export const literalSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type Literal = z.infer<typeof literalSchema>;
export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]),
);

export const postDocumentBodySchema = z.object({
  reference: z.string(),
  content: z.string(),
  metadata: jsonSchema,
  format: z.enum(["html", "markdown", "json"]),
});

export const postMessageBodySchema = z.object({
  chat_id: z.string(),
  content: z.string(),
});

export const agentSchema = z.object({
  systemPrompt: z.string(),
  tools: z
    .object({
      loaders: z.array(z.string()),
      allowedTools: z.array(z.string()),
    })
    .optional(),
  testing: z
    .object({
      personas: z.array(
        z.object({
          name: z.string(),
          profile: z.string(),
          maxCalls: z.number().default(10),
        }),
      ),
    })
    .optional(),
});

export const chatsRowMetadataSchema = z.object({
  systemPrompt: z.string(),
  tools: z.object({
    loaders: z.array(z.string()),
    allowedTools: z.array(z.string()),
  }),
});

export type ChainRunner = (options: {
  chatMessages: DatabaseTable<"chat_messages", "Row">[];
  systemPrompt: string;
  callbacks?: Callbacks;
  tools: AgentExecutor["tools"];
  cache?: BaseCache;
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

export type ToolLoader = (options: {
  callbacks?: any;
  client: SupabaseClient<Database>;
}) => Promise<ToolsMap>;

export type LogItems = [number, string, ...any[]][];

export const chatModelNameSchema = z
  .enum(["gpt-3.5-turbo-1106", "gpt-4-1106-preview", "gpt-4-0314"])
  .default("gpt-3.5-turbo-1106")
  .describe("Chat model name to use");

export const instructModelNameSchema = z
  .enum(["gpt-3.5-turbo-instruct"])
  .default("gpt-3.5-turbo-instruct")
  .describe("Instruct model name to use");
