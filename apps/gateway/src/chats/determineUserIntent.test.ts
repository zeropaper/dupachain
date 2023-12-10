import { config } from "dotenv";
import { describe, it, expect } from "vitest";

import { resolve } from "node:path";

import { ChatMessagesRow } from "../types";

config({ path: resolve(__dirname, "../../../../.env") });

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
  // Note: due to the non-deterministic nature of the AI, this test bases its
  // results on a confidence threshold. This means that the test will fail if
  // less than 75% of the runs are successful (see the `matches` variable).
  // Ideally, we would use a corpus of messages, a hash of the function body
  // to enable some sort of caching / memoization
  it("determines the intent of the user", async () => {
    const { default: determineUserIntent } = await import(
      "./determineUserIntent"
    );
    let matches = 0;
    for (const [expected, choices, chatMessages] of runs) {
      const result = await determineUserIntent({
        chatMessages,
        possibleIntents: choices,
      });

      if (result.intent === expected) {
        matches += 1;
      }
    }
    expect(matches).toBeGreaterThan(runs.length * 0.75);
  });
});
