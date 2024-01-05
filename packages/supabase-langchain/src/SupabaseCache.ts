import { BaseCache, Generation } from "langchain/schema";
import {
  getCacheKey,
  serializeGeneration,
  deserializeStoredGeneration,
} from "langchain/dist/cache/base";
import { SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseCacheOptions {
  cacheId: string;
  supabase: SupabaseClient;
}

/**
 * A cache that uses the supabase private.lc_cache table as the backing store.
 * This is useful for local development and testing. But it is not recommended for production use.
 */
export class SupabaseCache implements BaseCache {
  constructor({ cacheId, supabase }: SupabaseCacheOptions) {
    this.cacheId = cacheId;
    this.supabase = supabase;
  }

  protected supabase: SupabaseClient;

  protected cacheId: string;

  /**
   * Create a new cache backed by the supabase private.lc_cache table.
   * It ensures that the cache row exists before returning.
   * @param cacheId
   */
  static async create({ supabase }: Omit<SupabaseCacheOptions, "cacheId">) {
    const { data, error } = await supabase
      .from("private.lc_cache")
      .insert({ value: [] })
      .select("id")
      .single();
    if (error) {
      throw new Error(`SupabaseCache create error: ${error.message}`);
    }
    if (!data) {
      throw new Error(`SupabaseCache create error: no data returned`);
    }
    return new SupabaseCache({ cacheId: data.id, supabase });
  }
  /**
   * Retrieves data from the cache. It constructs a cache key from the given
   * `prompt` and `llmKey`, and retrieves the corresponding value from the
   * cache row.
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @returns An array of Generations if found, null otherwise.
   */
  async lookup(prompt: string, llmKey: string) {
    const key = `${getCacheKey(prompt, llmKey)}.json`;
    const { data, error } = await this.supabase
      .from("private.lc_cache")
      .select("value")
      .eq("id", this.cacheId)
      .single();
    if (error || !data) {
      return null;
    }
    return data.value.map(deserializeStoredGeneration);
  }
  /**
   * Updates the cache with new data. It constructs a cache key from the
   * given `prompt` and `llmKey`, and stores the `value` in a specific
   * row in the cache table.
   * @param prompt The prompt used to construct the cache key.
   * @param llmKey The LLM key used to construct the cache key.
   * @param generations The value to be stored in the cache.
   */
  async update(prompt: string, llmKey: string, generations: Generation[]) {
    const key = `${getCacheKey(prompt, llmKey)}.json`;
    const { error } = await this.supabase
      .from("private.lc_cache")
      .update({ value: generations.map(serializeGeneration) })
      .eq("id", this.cacheId)
      .single();
    if (error) {
      throw new Error(`SupabaseCache update error: ${error.message}`);
    }
  }
}
