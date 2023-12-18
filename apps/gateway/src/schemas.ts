import { z } from "zod";
import { Json } from "./types";

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
});
