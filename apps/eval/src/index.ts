import { createHash } from "crypto";
import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { loadEvalFile } from "./loadEvalFile";
import { runPromptSetup } from "./runPromptSetup";
import { EvalOutput, EvalPersonaResult } from "./types";
import { FileSystemCache } from "@local/cache/src";
import { RunnerSchema } from "./schemas";

config({ path: resolve(__dirname, "../../../.env") });

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file
// TODO: extend customization to allow passing runner settings

function md5(str: string) {
  return createHash("md5").update(str).digest("hex");
}

function getPromptHash(prompt: string) {
  return md5(prompt);
}

async function getRunnerHash(runner: RunnerSchema) {
  const functionBody = await import(runner.path).then((m) =>
    m.runChain.toString(),
  );
  return md5(JSON.stringify({ ...runner, functionBody }));
}

function getPersonaHash(persona: any) {
  return md5(JSON.stringify(persona));
}

const cache = new FileSystemCache<EvalPersonaResult>({
  path: resolve(__dirname, "../../../.cache"),
});

async function main() {
  const { EVALFILE } = await import("./config");
  const filepath = EVALFILE ? resolve(__dirname, "..", EVALFILE) : undefined;
  const setup = await loadEvalFile(filepath);
  const evalId = new Date().toISOString().slice(0, 19);

  const promises: Promise<void>[] = [];
  const output = {} as EvalOutput;
  for (const runner of setup.runners) {
    for (const { prompt } of setup.prompts) {
      for (const persona of setup.personas) {
        const runnerHash = await getRunnerHash(runner);
        const promptHash = getPromptHash(prompt);
        const personaHash = getPersonaHash(persona);

        const cacheId = md5([runnerHash, promptHash, personaHash].join(""));
        const cached = await cache.get(cacheId);

        const runId = [evalId, cacheId].join("_");

        if (!output[runnerHash]) {
          output[runnerHash] = {};
        }
        if (!output[runnerHash][promptHash]) {
          output[runnerHash][promptHash] = {};
        }
        if (!output[runnerHash][promptHash][personaHash]) {
          output[runnerHash][promptHash][personaHash] = {
            messages: [],
            log: [],
          };
        }

        if (!cached) {
          promises.push(
            runPromptSetup({
              runId,
              runner,
              prompt,
              persona,
            })
              // rather than using the results when all are settled,
              // fill in the output as they resolve
              .then(async (result) => {
                await cache.set(cacheId, result);
                output[runnerHash][promptHash][personaHash] = result;
              }),
          );
        } else {
          output[runnerHash][promptHash][personaHash] = cached;
        }
      }
    }
  }

  await Promise.allSettled(promises);

  await writeFile(
    resolve(setup.rootDir, `evals-output/${evalId}.json`),
    JSON.stringify({ setup, output }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
