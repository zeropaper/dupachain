import { describe, it, expect } from "vitest";
import { runChain } from "./summaryBufferMemoryWithTools";

describe("runChain", () => {
  it("throws an error if no last user message found", async () => {
    await expect(
      runChain({
        chatMessages: [],
        systemPrompt: "test",
        tools: [],
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
});
