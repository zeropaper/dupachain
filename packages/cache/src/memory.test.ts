import { describe, it, expect } from "vitest";
import MemoryCache from "./memory";

let cache: MemoryCache<{
  test: string;
}>;
const cached = { test: "test" };

describe("MemoryCache", () => {
  it("creates a cache directory", () => {
    expect(() => {
      cache = new MemoryCache();
    }).not.toThrow();
    expect(cache).toBeInstanceOf(MemoryCache);
  });

  it("sets a value", async () => {
    await expect(cache.set("test", cached)).resolves.toBe(cached);
  });

  it("gets a value", async () => {
    await expect(cache.get("test")).resolves.toEqual(cached);
  });

  it("clears the cache", async () => {
    await expect(cache.clear()).resolves.toBeUndefined();
    await expect(cache.get("test")).resolves.toBeNull();
  });
});
