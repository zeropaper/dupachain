import { describe, it, expect, beforeAll } from "vitest";
import { dirname, resolve } from "path";
import { loadEvalFile } from "./loadEvalFile";

describe.each([
  [
    resolve(__dirname, "../../gateway/default.evalsconfig.yml"),
    resolve(__dirname, "../../gateway"),
  ],
  [
    resolve(__dirname, "test-eval-files/relative-paths.evalsconfig.yml"),
    resolve(__dirname, "test-eval-files"),
  ],
  [
    resolve(__dirname, "test-eval-files/rootdir-paths.evalsconfig.yml"),
    resolve(__dirname, "../../gateway"),
  ],
])("loadEvalFile %s", (filepath, rootDir) => {
  let loaded: any;

  beforeAll(async () => {
    loaded = await loadEvalFile(filepath);
  });

  it("has rootDir", async () => {
    expect(loaded).toHaveProperty("rootDir", rootDir);
  });

  it("has prompts", async () => {
    expect(loaded).toMatchObject(
      expect.objectContaining({
        prompts: expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(String),
            prompt: expect.any(String),
          }),
        ]),
      }),
    );
  });

  it("has runners", async () => {
    expect(loaded.runners).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          path: expect.any(String),
          modelName: expect.any(String),
          tools: expect.objectContaining({
            loaders: expect.arrayContaining([expect.any(String)]),
            enabled: expect.arrayContaining([expect.any(String)]),
          }),
        }),
      ]),
    );
  });

  it("has personas", async () => {
    expect(loaded).toMatchObject(
      expect.objectContaining({
        personas: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            profile: expect.any(String),
            firstMessage: expect.any(String),
            goal: expect.any(String),
            maxCalls: expect.any(Number),
          }),
        ]),
      }),
    );
  });
});
