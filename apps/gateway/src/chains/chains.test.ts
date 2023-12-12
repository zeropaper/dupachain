import { config } from "dotenv";
import { vi, describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { FileSystemCache } from "@local/cache";
import {
  Details,
  TESTER_PROMPT_PREFIX,
  chatWithTester,
} from "./chatWithTester";

config({ path: resolve(__dirname, "../../../../.env") });

vi.mock("../tools/stores/sb-hft");

interface Setup {
  systemPrompt: string;
  testerDescriptions: string[];
  maxCalls?: number;
}

type ChainName = "runnableSequence";

const runs: [ChainName, [string, Setup][]][] = [
  [
    "runnableSequence",
    [
      [
        "basic",
        {
          systemPrompt:
            "You are Reto, a snowboard company reprisentative. You are talking to a customer who wants to buy a snowboard. You are trying to find out what kind of snowboard they want.",
          testerDescriptions: [
            [
              TESTER_PROMPT_PREFIX,
              "You are Greg, a snowboard enthusiast. You are looking for the best snowboard for you. You weight 150 pounds and are 5 feet tall. You want to do tricks and go fast. You do not give all information at once.",
            ].join("\n"),
            [
              TESTER_PROMPT_PREFIX,
              "You are Jenny, a snowboard beginner, you are looking for the best snowboard, boots and bindings for you. You weight 65kg for 175cm. You do not give all information at once.",
            ].join("\n"),
            [
              TESTER_PROMPT_PREFIX,
              "You are Vincent, a french dude who needs new bindings. You are a professional snowboarder. You only speak french and make use a fool language. You are under the influence (but it's second hand smoke) and therefore vague and evasive.",
            ].join("\n"),
          ],
          maxCalls: 2,
        },
      ],
    ],
  ],
];

const cache = new FileSystemCache<Details>({
  path: resolve(__dirname, "../../../../.cache"),
});

function objectMd5(input: any): string {
  const json = JSON.stringify(input);
  return createHash("md5").update(json).digest("hex");
}

describe.each(runs)("%s chain", (chainName, setups) => {
  describe.each(setups)(
    "with %s setup",
    (_, { systemPrompt, testerDescriptions, maxCalls }) => {
      it("runs the chain", async () => {
        const runChain = await import(`../chains/${chainName}`).then(
          (m) => m.runChain,
        );
        expect(runChain).toBeInstanceOf(Function);

        const results: {
          finished: boolean;
          output: any;
        }[] = [];
        for (const testerDescription of testerDescriptions) {
          try {
            const setup = {
              systemPrompt,
              testerDescription,
              maxCalls,
            };
            const cacheKey = objectMd5({ chainName, ...setup });
            const cached = await cache.get(cacheKey);
            if (cached) {
              results.push({
                finished: true,
                output: cached,
              });
              continue;
            }
            const result = await chatWithTester({
              runChain,
              ...setup,
            });
            await cache.set(cacheKey, result.details);
            results.push({
              finished: true,
              output: result.details,
            });
          } catch (e: unknown) {
            results.push({
              finished: false,
              output: e instanceof Error ? e.message : String(e),
            });
          }
        }

        const percentage =
          results.filter((r) => r.finished).length / results.length;
        console.log("results", results);
        expect(percentage).toBeGreaterThan(0.5);
      }, 300000);
    },
  );
});
