import { SupabaseClient } from "@supabase/supabase-js";
import {
  BaseMemory,
  InputValues,
  MemoryVariables,
  OutputValues,
} from "langchain/memory";

export interface SupabaseMemoryOptions {
  supabase: SupabaseClient;
  id: string;
  table?: string;
}

export class SupabaseMemory extends BaseMemory {
  constructor(fields: SupabaseMemoryOptions) {
    super();
    this.supabase = fields.supabase;
    this.id = fields.id;
    this.table = fields.table ?? this.table;
  }

  protected table: string = "lc_memory";

  protected id: string;

  protected supabase: SupabaseClient;

  get memoryKeys(): string[] {
    return ["supabase", "memory"];
  }

  async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select("memory")
      .eq("id", this.id)
      .single();
    if (error) {
      throw new Error(
        `SupabaseMemory loadMemoryVariables error: ${error.message}`,
      );
    }
    return data?.memory ?? {};
  }

  async saveContext(
    inputValues: InputValues,
    outputValues: OutputValues,
  ): Promise<void> {
    await this.supabase
      .from(this.table)
      .upsert({
        id: this.id,
        memory: outputValues,
      })
      .then(({ error }) => {
        if (error) {
          throw new Error(`SupabaseMemory saveContext error: ${error.message}`);
        }
      });
  }
}
