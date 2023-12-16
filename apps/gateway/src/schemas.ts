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
