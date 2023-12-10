import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};

export async function createAnonClient() {
  if (moduleScope.client) {
    return moduleScope.client;
  }
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("./config");
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
  });
  moduleScope.client = client;
  return client;
}
