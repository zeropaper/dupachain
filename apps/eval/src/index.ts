import { createHash } from "crypto";
import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { loadEvalFile } from "./loadEvalFile";
import { runPromptSetup } from "./runPromptSetup";
import { EvalOutput } from "./types";

config({ path: resolve(__dirname, "../../../.env") });

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file
// TODO: extend customization to allow passing runner settings
// TODO: check caching opportunities

function md5(str: string) {
  return createHash("md5").update(str).digest("hex");
}

function getPromptHash(prompt: string) {
  return md5(prompt);
}

function getRunnerHash(runner: any) {
  // TODO: elaborate.. maybe ready the runner function body and hash that?
  return md5(JSON.stringify(runner));
}

function getPersonaHash(persona: any) {
  return md5(JSON.stringify(persona));
}

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
        const runnerHash = getRunnerHash(runner);
        const promptHash = getPromptHash(prompt);
        const personaHash = getPersonaHash(persona);

        const runId = [
          evalId,
          md5([runnerHash, promptHash, personaHash].join("")),
        ].join("_");

        const promise = runPromptSetup({
          runId,
          runner,
          prompt,
          persona,
        })
          // rather than using the results when all are settled,
          // fill in the output as they resolve
          .then((result) => {
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
            output[runnerHash][promptHash][personaHash] = result;
          });
        promises.push(promise);
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
