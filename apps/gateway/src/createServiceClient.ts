import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClient must NOT be called in the browser");
  }
  if (moduleScope.client) {
    return moduleScope.client;
  }
  const serviceClient = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    },
  );
  moduleScope.client = serviceClient;
  return serviceClient;
}
