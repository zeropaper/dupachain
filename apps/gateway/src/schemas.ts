import { z } from "zod";
import { Database, DatabaseTable, Json } from "./types";
import { SupabaseClient } from "@supabase/supabase-js";
import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";

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

// for vector store ingestion
export const postDocumentBodySchema = z.object({
  reference: z.string(),
  content: z.string(),
  metadata: jsonSchema,
  format: z.enum(["html", "markdown", "json"]),
});
// for posting messages

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
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

export type ToolLoader = (options: {
  callbacks?: any;
  client: SupabaseClient<Database>;
}) => Promise<ToolsMap>;

export type LogItems = [number, string, ...any[]][];
