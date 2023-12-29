import { describe, it, expect } from "vitest";

import { testGoal } from "./testGoal";
import { GoalTestSchema } from "./schemas";

const runs: Array<[string, Array<[GoalTestSchema[], boolean]>]> = [
  [
    "Max",
    [
      [
        [
          {
            type: "includes",
            includes: "Max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "includes",
            includes: "Max",
            exact: true,
          },
        ],
        true,
      ],
      [
        [
          {
            type: "equals",
            equals: "Max",
            exact: true,
          },
        ],
        true,
      ],
      [
        [
          {
            type: "equals",
            equals: "max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "matches",
            matches: "Max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "matches",
            matches: "max",
            flags: "i",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "matches",
            matches: "max",
          },
        ],
        false,
      ],
    ],
  ],
  [
    "Hello I am Max. What is your name?",
    [
      [
        [
          {
            type: "includes",
            includes: "Max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "includes",
            includes: "Max",
            exact: true,
          },
        ],
        true,
      ],
      [
        [
          {
            type: "equals",
            equals: "Max",
            exact: true,
          },
        ],
        false,
      ],
      [
        [
          {
            type: "equals",
            equals: "max",
          },
        ],
        false,
      ],
      [
        [
          {
            type: "matches",
            matches: "Max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "matches",
            matches: "max",
            flags: "i",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "matches",
            matches: "max",
          },
        ],
        false,
      ],
      [
        [
          {
            type: "includes",
            includes: "Hello",
          },
          {
            type: "includes",
            includes: "Max",
          },
        ],
        true,
      ],
      [
        [
          {
            type: "includes",
            includes: "Hello",
          },
          {
            type: "includes",
            includes: "Greg",
          },
        ],
        false,
      ],
    ],
  ],
];

describe.each(runs)("testGoal %s", (text, textRuns = []) => {
  it.each(textRuns)("with %j returns %s", async (goal, expected) => {
    await expect(
      testGoal({
        messages: [{ content: text, role: "user", metadata: {} }],
        persona: {
          goal,
          firstMessage: "",
          profile: "",
          name: "",
          maxCalls: 1,
        },
      }),
    ).resolves.toBe(expected);
  });
});
