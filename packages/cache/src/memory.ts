import CacheInterface from "./type";

export default class MemoryCache<T extends {}> implements CacheInterface<T> {
  #cache: Record<string, T> = {};
  async clear() {
    await this.destroy();
  }
  async set(key: string, value: T): Promise<T> {
    this.#cache[key] = value;
    return value;
  }
  async get(key: string): Promise<T | null> {
    return this.#cache[key] ?? null;
  }
  async destroy() {
    this.#cache = {} as T;
  }
}
