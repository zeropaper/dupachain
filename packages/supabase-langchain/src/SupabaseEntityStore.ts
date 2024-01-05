import type { BaseEntityStore } from "langchain/schema";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  Serialized,
  SerializedNotImplemented,
} from "langchain/dist/load/serializable";
// import { Database } from "@local/supabase-types";

export interface SupabaseEntityStoreOptions {
  supabase: SupabaseClient;
  id: string;
  table?: string;
}

export interface EntityStoreTableRow {
  id: string;
  key: string;
  value: string;
}

export class SupabaseEntityStore implements BaseEntityStore {
  constructor({ supabase, id, table }: SupabaseEntityStoreOptions) {
    this.supabase = supabase;
    this.id = id;
    this.table = table ?? this.table;
  }

  protected table: string = "private.lc_entity_store";

  protected id: string;

  protected supabase: SupabaseClient;

  get lc_aliases(): { [key: string]: string } | undefined {
    return undefined;
  }

  get lc_attributes() {
    return undefined;
  }

  get lc_id(): string[] {
    return ["supabase", "entity", "store"];
  }

  lc_kwargs = {};

  lc_namespace: string[] = [
    "local",
    "langchain",
    "supabase",
    "entity",
    "store",
  ];

  get lc_secrets(): { [key: string]: string } | undefined {
    return undefined;
  }

  lc_serializable: boolean = false;

  static async create({
    supabase,
    table,
  }: Omit<SupabaseEntityStoreOptions, "id">) {
    const { data, error } = await supabase
      .from(table ?? "private.lc_entity_store")
      .insert({ value: null })
      .select("id")
      .single();
    if (error) {
      throw new Error(`SupabaseEntityStore create error: ${error.message}`);
    }
    if (!data) {
      throw new Error(`SupabaseEntityStore create error: no data returned`);
    }
    return new SupabaseEntityStore({
      id: data.id,
      table,
      supabase,
    });
  }

  async clear(): Promise<void> {
    await this.supabase
      .from(this.table)
      .delete()
      .eq("id", this.id)
      .then(({ error }) => {
        if (error) {
          throw new Error(`SupabaseEntityStore clear error: ${error.message}`);
        }
      });
  }

  async delete(key: string): Promise<void> {
    await this.supabase
      .from(this.table)
      .delete()
      .eq("id", this.id)
      .eq("key", key)
      .single()
      .then(({ error }) => {
        if (error) {
          throw new Error(`SupabaseEntityStore clear error: ${error.message}`);
        }
      });
  }

  async exists(key: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("key")
      .eq("id", this.id)
      .eq("key", key)
      .single();
    if (error) {
      throw new Error(`SupabaseEntityStore exists error: ${error.message}`);
    }
    return data !== null;
  }

  async get(
    key: string,
    defaultValue?: string | undefined,
  ): Promise<string | undefined> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("value")
      .eq("id", this.id)
      .eq("key", key)
      .single();
    if (error) {
      throw new Error(`SupabaseEntityStore get error: ${error.message}`);
    }
    return data?.value ?? defaultValue;
  }

  async set(key: string, value?: string | undefined): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .upsert({
        id: this.id,
        key,
        value,
      })
      .single();
    if (error) {
      throw new Error(`SupabaseEntityStore set error: ${error.message}`);
    }
  }

  toJSON(): Serialized {
    return {
      id: this.lc_id,
      lc: 1,
      type: "not_implemented",
    };
  }

  toJSONNotImplemented(): SerializedNotImplemented {
    return {
      id: this.lc_id,
      lc: 1,
      type: "not_implemented",
    };
  }
}
