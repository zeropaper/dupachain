import { config } from "dotenv";
import { resolve } from "node:path";
import { vi, describe, it, expect } from "vitest";

import { RunChain } from "../types";
import { TESTER_PROMPT_PREFIX, chatWithTester } from "./chatWithTester";

config({ path: resolve(__dirname, "../../../../.env") });

vi.mock("../tools/stores/sb-hft");

const runChain = vi.fn<Parameters<RunChain>>(async ({}) => {
  return "mock";
});

describe("chatWithTester", () => {
  it("runs the chain", async () => {
    const result = await chatWithTester({
      runChain,
      systemPrompt:
        "You are Reto, a snowboard company reprisentative. You are talking to a customer who wants to buy a snowboard. You are trying to find out what kind of snowboard they want.",
      testerDescription: `${TESTER_PROMPT_PREFIX}
You are Greg, a snowboard enthusiast. You are looking for the best snowboard for you. You weight 150 pounds and are 5 feet tall. You want to do tricks and go fast. You do not give all information at once.`,
      maxCalls: 1,
    });
    expect(result.details.length).toBe(2);
    expect(result.details.at(-1)?.at(3)).toBe("mock");
  }, 100000);
});
