import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { loadEvalFile, defaultRoot } from "./loadEvalFile";
import { runPromptSetup } from "./runPromptSetup";
import { ChainRunner, EvalOutput } from "./types";

config({ path: resolve(__dirname, "../../../.env") });

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file

async function main() {
  const { EVALFILE } = await import("./config");
  const filepath = EVALFILE ? resolve(__dirname, "..", EVALFILE) : undefined;
  const setup = await loadEvalFile(filepath);
  const evalId = Date.now().toString();
  const output: EvalOutput = {};

  const promises: Promise<void>[] = [];
  for (const runner of setup.runners) {
    const runnerPath = runner.path;
    for (const { path, prompt } of setup.prompts) {
      output[path] = {};
      for (const persona of setup.personas) {
        promises.push(
          runPromptSetup({
            evalId,
            runner,
            prompt,
            persona,
            output,
          }),
        );
      }
    }
  }

  console.log("Waiting for all prompts to finish...", promises.length);
  const result = await Promise.allSettled(promises);
  console.log("Done!", result);

  await writeFile(
    resolve(setup.rootDir, `evals-output/${evalId}.json`),
    JSON.stringify({ setup, output }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
