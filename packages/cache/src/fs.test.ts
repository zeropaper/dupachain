import { mkdir } from "fs/promises";
import FileSystemCache from "./fs";
import { rimraf } from "rimraf";

beforeAll(async () => {
  await rimraf("./test-files").catch((e) => {});
  await mkdir("./test-files");
});

let cache: FileSystemCache<{
  test: string;
}>;
const cached = { test: "test" };

describe("FileSystemCache", () => {
  it("creates a cache directory", () => {
    expect(() => {
      cache = new FileSystemCache({
        path: "./test-files/whtvr",
      });
    }).not.toThrow();
    expect(cache).toBeInstanceOf(FileSystemCache);
  });

  it("sets a value", async () => {
    await expect(cache.set("test", cached)).resolves.toBe(cached);
  });

  it("gets a value", async () => {
    await expect(cache.get("test")).resolves.toEqual(cached);
  });

  // it('clears the cache', async () => {
  //   await expect(cache.clear()).resolves.toBeUndefined();
  //   await expect(cache.get('test')).resolves.toBeNull();
  // });
});
