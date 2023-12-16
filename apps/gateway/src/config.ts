import { parseEnv } from "znv";
import { z } from "zod";
import { resolve } from "path";

export const {
  OPENAI_API_KEY,
  SERPAPI_API_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  HUGGINGFACEHUB_API_KEY,
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
  PORT,
  PUBLIC_DIR,
  CORS_ORIGIN,
} = parseEnv(process.env, {
  OPENAI_API_KEY: z.string(),
  SERPAPI_API_KEY: z.string(),
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  HUGGINGFACEHUB_API_KEY: z.string(),
  LANGFUSE_BASE_URL: z.string(),
  LANGFUSE_PUBLIC_KEY: z.string(),
  LANGFUSE_SECRET_KEY: z.string(),
  PORT: z.string().default("3030"),
  PUBLIC_DIR: z.string().default(resolve(__dirname, "..", "public")),
  CORS_ORIGIN: z.string().optional(),
});
