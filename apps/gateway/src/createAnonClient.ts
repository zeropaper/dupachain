import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};

export function createAnonClient() {
  if (moduleScope.client) {
    return moduleScope.client;
  }
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
  });
  moduleScope.client = client;
  return client;
}
