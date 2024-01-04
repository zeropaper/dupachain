import { z } from "zod";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { DynamicStructuredTool } from "langchain/tools";
import { config } from "dotenv";
import { resolve } from "node:path";
import { BaseCache } from "langchain/schema";
import { LocalFileCache } from "langchain/cache/file_system";

import { ChainRunner } from "../schemas";

const testToolFunc = vi.fn(async (input, runManager) => {
  return `T1 ${input.size}${input.wide ? " wide" : ""}`;
});

type SnowboardSizeRange = {
  min: number;
  max: number;
};

function getSnowboardSize(
  height: number,
  weight: number,
  wide: boolean,
): SnowboardSizeRange {
  const baseSize = height * 0.88;
  let sizeAdjustment = 0;

  // Adjust based on weight
  if (weight < 50) {
    sizeAdjustment = -3;
  } else if (weight >= 50 && weight <= 70) {
    sizeAdjustment = 0;
  } else if (weight > 70 && weight <= 90) {
    sizeAdjustment = 3;
  } else if (weight > 90) {
    sizeAdjustment = 5;
  }

  // Adjust for wide boards: reduce the size
  if (wide) {
    sizeAdjustment -= 2;
  }

  return {
    min: Math.round(baseSize + sizeAdjustment - 2),
    max: Math.round(baseSize + sizeAdjustment + 2),
  };
}

const testGetSnowboardSize = vi.fn(
  async (
    { size, weight, wide }: { size: number; weight: number; wide?: boolean },
    runManager,
  ) => {
    return (getSnowboardSize(size, weight, !!wide).max - 2).toFixed();
  },
);

const searchTool = new DynamicStructuredTool({
  description: "Retrieves snowboards based on riding style and size.",
  name: "snowboard_search",
  schema: z.object({
    ridingStyle: z.enum(["park", "all-mountain", "freeride"]),
    size: z
      .number()
      .positive()
      .describe("size of the snowboard (not the rider!) in cm"),
    wide: z
      .boolean()
      .optional()
      .default(false)
      .describe("if the snowboard should be wide"),
  }),
  func: testToolFunc,
});

const snowboardSizeCalculatorTool = new DynamicStructuredTool({
  description:
    "Calculates the size of the snowboard based on height and weight.",
  name: "snowboard_size_calculator",
  schema: z.object({
    size: z.number().positive().describe("size of the rider in cm"),
    weight: z.number().positive().describe("weight of the rider in kg"),
    wide: z.boolean().optional().describe("if the snowboard should be wide"),
  }),
  func: testGetSnowboardSize,
});

beforeAll(async () => {
  config({ path: resolve(__dirname, "../../../../.env") });
});
const systemPrompt = "Your are helping users to find the right snowboard.";
describe.each([
  ["../../examples/nitro/chains/nitroMemoryWithFunctions"],
  ["./entityMemoryWithFunctions"],
  ["./summaryBufferMemoryWithFunctions"],
])("%s runChain", (filepath) => {
  let runChain: ChainRunner;
  let cache: BaseCache;
  let chatId: string;

  beforeAll(async () => {
    chatId = new Date().toISOString();
    cache = await LocalFileCache.create(
      resolve(__dirname, `../../../../.cache`),
    );
    runChain = await import(filepath).then((m) => m.runChain);
    testToolFunc.mockClear();
    testGetSnowboardSize.mockClear();
  });

  it("throws an error if no last user message found", async () => {
    await expect(
      runChain({
        chatMessages: [],
        systemPrompt: "test",
        tools: [searchTool, snowboardSizeCalculatorTool],
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

  it("can directly answer when all necessary information is given", async () => {
    let promise = runChain({
      chatMessages: [
        {
          chat_id: chatId + "_debug",
          role: "user",
          content:
            "Hi there, I'm looking for a snowboard, I'm 75kg, 180cm and prefer park riding and wider boards.",
        },
      ] as any,
      systemPrompt,
      tools: [searchTool, snowboardSizeCalculatorTool],
      runnerOptions: {},
      // cache,
    });
    await expect(promise).resolves.toBeDefined();
    let result = await promise;
    expect(result).toEqual(expect.any(String));
    expect(testToolFunc).toHaveBeenCalled();
    expect(result).toContain("T1");
    // expect(result).toContain("159");
  }, 7500);

  it("collects information from chat messages", async () => {
    testToolFunc.mockClear();
    testGetSnowboardSize.mockClear();
    const chatMessages = [
      {
        chat_id: chatId,
        role: "user",
        content: "Hi there",
      },
      {
        chat_id: chatId,
        role: "assistant",
        content: "Hi how can I help you?",
      },
      {
        chat_id: chatId,
        role: "user",
        content: "I'm looking for a snowboard.",
      },
      {
        chat_id: chatId,
        role: "assistant",
        content: "Do you have a prefered riding style?",
      },
      {
        chat_id: chatId,
        role: "user",
        content: "I do mostly park.",
      },
      {
        role: "assistant",
        content: "What is your height and weight?",
      },
      {
        chat_id: chatId,
        role: "user",
        content: "I'm 180cm, 85kg",
      },
    ] as any;

    let promise = runChain({
      chatMessages: chatMessages.slice(0, 1),
      systemPrompt,
      tools: [searchTool, snowboardSizeCalculatorTool],
      runnerOptions: {},
      // cache,
    });
    await expect(promise).resolves.toBeDefined();
    let result = await promise;
    expect(result).toEqual(expect.any(String));
    expect(testToolFunc).not.toHaveBeenCalled();
    expect(result).not.toContain("T1");

    promise = runChain({
      chatMessages: chatMessages.slice(0, 3),
      systemPrompt,
      tools: [searchTool],
      runnerOptions: {},
      // cache,
    });
    await expect(promise).resolves.toBeDefined();
    result = await promise;
    expect(result).toEqual(expect.any(String));
    expect(testToolFunc).not.toHaveBeenCalled();
    expect(result).not.toContain("T1");

    promise = runChain({
      chatMessages: chatMessages.slice(0, 5),
      systemPrompt,
      tools: [searchTool, snowboardSizeCalculatorTool],
      runnerOptions: {},
      // cache,
    });
    await expect(promise).resolves.toBeDefined();
    result = await promise;
    expect(result).toEqual(expect.any(String));
    expect(testToolFunc).not.toHaveBeenCalled();
    expect(result).not.toContain("T1");

    promise = runChain({
      chatMessages,
      systemPrompt,
      tools: [searchTool, snowboardSizeCalculatorTool],
      runnerOptions: {},
      // cache,
    });
    await expect(promise).resolves.toBeDefined();
    result = await promise;
    expect(result).toEqual(expect.any(String));
    expect(testToolFunc).toHaveBeenCalled();
    expect(result).toContain("T1");
    expect(result).toContain("161");
  }, 15000);
});
