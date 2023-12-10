import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};

export async function createAnonClient() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./config");
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  moduleScope.client = client;
  return client;
}
