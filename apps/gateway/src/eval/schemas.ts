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

const yesNoPromptSchema = z.string().describe("Prompt to use for yes/no question, the context will be the last AI message");

export const goalTestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text').describe('Text goal'),
    text: z.string().describe('Text to match'),
    exact: z.boolean().default(false).describe('Whether to match exactly'),
  }),
  z.object({
    type: z.literal('regex').describe('Regex goal'),
    regex: z.string().describe('Regex to match'),
  }),
]);

export type GoalTestSchema = z.infer<typeof goalTestSchema>;

export const goalSchema = yesNoPromptSchema.or(z.array(goalTestSchema));

export type GoalSchema = z.infer<typeof goalSchema>;

export const personaFileSchema = z.object({
  name: z.string().describe("Name of the persona"),
  profile: z
    .string()
    .describe("Some instructions on how the tester should behave"),
  goal: goalSchema.optional(),
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
