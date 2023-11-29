import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};

export function createAnonClient() {
  if (typeof moduleScope.client !== "undefined") {
    return moduleScope.client;
  }
  if (!process.env.SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL");
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_ANON_KEY");
  }
  const client = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
  );
  moduleScope.client = client;
  return client;
}
