import { config } from "dotenv";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { resolve } from "node:path";

import { determineUserIntent } from "./determineUserIntent";
import { ChatMessagesRow } from "./types";

config({ path: resolve(__dirname, "../../../.env") });

type Run = [string, string[], ChatMessagesRow[]];

const runs: Run[] = [
  [
    "statement",
    ["greet", "goodbye", "question", "statement"],
    [
      {
        role: "assistant",
        content: "Hello",
      },
      {
        role: "user",
        content: "Hi",
      },
      {
        role: "assistant",
        content: "How are you?",
      },
      {
        role: "user",
        content: "I am fine, thanks",
      },
    ] as ChatMessagesRow[],
  ],
  [
    "question",
    ["greet", "goodbye", "question", "statement"],
    [
      {
        role: "assistant",
        content: "Hello",
      },
      {
        role: "user",
        content: "Hi",
      },
      {
        role: "assistant",
        content: "How are you?",
      },
      {
        role: "user",
        content: "Fine, how about are you?",
      },
    ] as ChatMessagesRow[],
  ],
];

describe("determineUserIntent", () => {
  it("determines the intent of the user", async () => {
    let matches = 0;
    for (const [expected, choices, chatMessages] of runs) {
      const result = await determineUserIntent({
        chatMessages,
        possibleIntents: choices,
      });
      // expect(result).toHaveProperty('intent', expected);
      console.log("expected: %s, result", expected, result.intent);
      if (result.intent === expected) {
        matches += 1;
      }
    }
    expect(matches).toBeGreaterThan(runs.length * 0.75);
  });
});
