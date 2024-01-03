import { z } from "zod";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { DynamicStructuredTool } from "langchain/tools";
import { config } from "dotenv";
import { resolve } from "node:path";

import { ChainRunner } from "../schemas";

const testToolFunc = vi.fn(async (input, runManager) => {
  console.info("testToolFunc", input, runManager);
  return "T1";
});

const testTool = new DynamicStructuredTool({
  description: "Retrieves snowboards based on user input.",
  name: "snowboard_search",
  schema: z.object({
    input: z.string(),
  }),
  func: testToolFunc,
});

let runChain: ChainRunner;

beforeAll(async () => {
  config({ path: resolve(__dirname, "../../../../.env") });

  runChain = await import("./summaryBufferMemoryWithFunctions").then(
    (m) => m.runChain,
  );
});

describe("runChain", () => {
  it("throws an error if no last user message found", async () => {
    await expect(
      runChain({
        chatMessages: [],
        systemPrompt: "test",
        tools: [testTool],
        runnerOptions: {},
      }),
    ).rejects.toThrow("No last user message found");
  });

  it("throws an error if no tools passed to chain runner", async () => {
    await expect(
      runChain({
        chatMessages: [{ role: "user", content: "test" } as any],
        systemPrompt: "test",
        tools: [],
        runnerOptions: {},
      }),
    ).rejects.toThrow("No tools passed to chain runner");
  });

  it.skip("can be called", async () => {
    const promise = runChain({
      chatMessages: [
        {
          role: "user",
          content:
            "I'm 180cm, 85kg and I'm looking for a park board with a medium flex.",
        } as any,
      ],
      systemPrompt: "Your are helping users to find the right snowboard.",
      tools: [testTool],
      runnerOptions: {},
    });
    await expect(promise).resolves.toBeDefined();
    const result = await promise;
    expect(testToolFunc).toHaveBeenCalled();
    expect(result).toEqual(expect.any(String));
    expect(result).toContain("T1");
  });
});
