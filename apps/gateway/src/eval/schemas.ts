import { z } from "zod";

const toolsSchema = z.object({
  loaders: z.array(z.string()).describe("File paths to tool loaders"),
  enabled: z.array(z.string()).describe("Names of tools to enable"),
});

export type ToolsSchema = z.infer<typeof toolsSchema>;

const runnerSchema = z.object({
  path: z.string().describe("Path to runner file"),
  tools: toolsSchema.optional(),
});

export type RunnerSchema = z.infer<typeof runnerSchema>;

const runnersSchema = z.array(
  z.string().describe("Path to runner file").or(runnerSchema),
);

export type RunnersSchema = z.infer<typeof runnersSchema>;

export const personaFileSchema = z.object({
  name: z.string().describe("Name of the persona"),
  profile: z
    .string()
    .describe("Some instructions on how the tester should behave"),
  goal: z.string().describe("Goal of the persona").optional(),
  maxCalls: z.number().int().positive().default(10),
});

export type PersonaFileSchema = z.infer<typeof personaFileSchema>;

export const evalFileSchema = z.object({
  prompts: z.array(z.string()).describe("File paths to prompts"),
  runners: runnersSchema,
  personas: z.array(
    z.string().describe("File paths to personas").or(personaFileSchema),
  ),
});

export type EvalFileSchema = z.infer<typeof evalFileSchema>;
