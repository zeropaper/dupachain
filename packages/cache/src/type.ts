export default class CacheInterface<T extends {}> {
  async clear() {}
  async set(key: string, value: T): Promise<T> {
    return value;
  }
  async get(key: string): Promise<T | null> {
    return null;
  }
  async destroy() {}
}
