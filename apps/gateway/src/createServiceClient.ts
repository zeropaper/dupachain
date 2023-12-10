import type { Database, SupabaseClient } from "@local/supabase-types";
import { createClient } from "@supabase/supabase-js";

const moduleScope: {
  client?: SupabaseClient<Database>;
} = {};
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClient must NOT be called in the browser");
  }
  if (!process.env.SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  if (moduleScope.client) {
    return moduleScope.client;
  }
  const serviceClient = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    },
  );
  moduleScope.client = serviceClient;
  return serviceClient;
}
