import { parseEnv } from "znv";
import { z } from "zod";
import { resolve } from "path";

export const {
  OPENAI_API_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
  PORT,
  PUBLIC_DIR,
  CORS_ORIGINS,
  NODE_ENV,
} = parseEnv(process.env, {
  OPENAI_API_KEY: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  LANGFUSE_BASE_URL: z.string(),
  LANGFUSE_PUBLIC_KEY: z.string(),
  LANGFUSE_SECRET_KEY: z.string(),
  PORT: z.string().default("3030"),
  PUBLIC_DIR: z.string().default(resolve(__dirname, "..", "public")),
  CORS_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});
