import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

export * from "@supabase/supabase-js";
export * from "./database.types";

export type _SupabaseClient<T extends keyof Database> = SupabaseClient<
  Database,
  T,
  Database[T]
>;

export type SupabasePublicClient = _SupabaseClient<"public">;

export type DatabaseTables = Database["public"]["Tables"];

export type DatabaseTable<
  N extends keyof DatabaseTables,
  A extends keyof DatabaseTables[N] | void = void,
> = A extends keyof DatabaseTables[N]
  ? DatabaseTables[N][A]
  : DatabaseTables[N];
