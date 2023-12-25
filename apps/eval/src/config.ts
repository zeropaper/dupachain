import { resolve } from "path";
import { parseEnv } from "znv";
import { z } from "zod";

export const {
  EVALFILE,
  OPENAI_API_KEY,
  SERPAPI_API_KEY,
  HUGGINGFACEHUB_API_KEY,
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
  NODE_ENV,
} = parseEnv(process.env, {
  EVALFILE: z
    .string()
    .default(resolve(process.cwd(), "default.evalsconfig.yml")),
  OPENAI_API_KEY: z.string(),
  SERPAPI_API_KEY: z.string(),
  HUGGINGFACEHUB_API_KEY: z.string(),
  LANGFUSE_BASE_URL: z.string(),
  LANGFUSE_PUBLIC_KEY: z.string(),
  LANGFUSE_SECRET_KEY: z.string(),
  NODE_ENV: z.string().default("development"),
});
