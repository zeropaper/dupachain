import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};
export async function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClient must NOT be called in the browser");
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await import("./config");
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
