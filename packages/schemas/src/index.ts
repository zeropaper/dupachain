import { z } from "zod";

const toolsSchema = z.object({
  loaders: z.array(z.string()).describe("File paths to tool loaders"),
  enabled: z.array(z.string()).describe("Names of tools to enable"),
});

export type ToolsSchema = z.infer<typeof toolsSchema>;

const partialRunnerSchema = z.object({
  path: z.string().describe("Path to runner file"),
  tools: toolsSchema
    .default({
      loaders: [],
      enabled: [],
    })
    .optional(),
  modelName: z
    .enum(["gpt-3.5-turbo-1106", "gpt-4-1106-preview", "gpt-4-0314"])
    .default("gpt-3.5-turbo-1106")
    .optional()
    .describe("Model name to use"),
  runnerOptions: z.any().optional(),
});

const runnerSchema = z.object({
  path: z.string().describe("Path to runner file"),
  tools: toolsSchema.default({
    loaders: [],
    enabled: [],
  }),
  modelName: z
    .enum(["gpt-3.5-turbo-1106", "gpt-4-1106-preview", "gpt-4-0314"])
    .default("gpt-3.5-turbo-1106")
    .describe("Model name to use"),
  runnerOptions: z.any(),
});

export type RunnerSchema = z.infer<typeof runnerSchema>;

const runnersSchema = z.array(
  z.string().describe("Path to runner file").or(runnerSchema),
);

export type RunnersSchema = z.infer<typeof runnersSchema>;

const yesNoInstructionSchema = z
  .string()
  .describe(
    "An instruction prompt to use for yes/no question, the context will be the last AI message",
  );

export const goalTestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("includes").describe("Text includes goal"),
    includes: z.string().describe("Text to find"),
    exact: z
      .boolean()
      .default(false)
      .optional()
      .describe("Whether to match exactly"),
  }),
  z.object({
    type: z.literal("equals").describe("Text equals goal"),
    equals: z.string().describe("Text to be equal to"),
    exact: z
      .boolean()
      .default(false)
      .optional()
      .describe("Whether to match exactly"),
  }),
  z.object({
    type: z.literal("matches").describe("Regex goal"),
    matches: z.string().describe("Regex to match"),
    flags: z.string().default("").optional().describe("Regex flags"),
  }),
]);

export type GoalTestSchema = z.infer<typeof goalTestSchema>;

export const goalSchema = yesNoInstructionSchema.or(z.array(goalTestSchema));

export type GoalSchema = z.infer<typeof goalSchema>;

export const personaSchema = z.object({
  name: z.string().describe("Name of the persona"),
  profile: z
    .string()
    .describe("Some instructions on how the tester should behave"),
  firstMessage: z.string().default("Hi!").describe("First message to send"),
  goal: goalSchema.optional(),
  maxCalls: z.number().int().positive().default(10),
});

export type PersonaSchema = z.infer<typeof personaSchema>;

export const evalFileSchema = z.object({
  name: z.string().describe("Name of the evaluation"),
  rootDir: z.string().optional().describe("Root directory of the eval"),
  prompts: z.array(z.string()).describe("Paths to prompt files"),
  runners: z.array(partialRunnerSchema),
  personas: z
    .array(
      z
        .string()
        .describe("Path to persona file")
        .or(personaSchema.describe("Persona object")),
    )
    .describe("An array of either file paths to YAML files or persona objects"),
});

export type EvalFileSchema = z.infer<typeof evalFileSchema>;

export const configSchema = z.object({
  rootDir: z.string(),
  filename: z.string(),
  prompts: z.array(
    z.object({
      path: z.string().describe("Path to prompt file"),
      prompt: z.string().describe("Prompt to use"),
    }),
  ),
  runners: z.array(runnerSchema),
  personas: z.array(personaSchema),
});

export type ConfigSchema = z.infer<typeof configSchema>;
