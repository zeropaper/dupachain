import { config } from "dotenv";
import { writeFile } from "fs/promises";
import { resolve } from "path";
import { loadEvalFile, defaultRoot } from "./loadEvalFile";
import { runPromptSetup } from "./runPromptSetup";
import { ChainRunner, EvalOutput } from "./types";

config({ path: resolve(__dirname, "../../../../.env") });

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file

async function main() {
  const serviceClient = await import("../createServiceClient").then(
    ({ createServiceClient }) => createServiceClient(),
  );
  const setup = await loadEvalFile();
  const evalId = Date.now().toString();
  const output: EvalOutput = {};

  const promises: Promise<void>[] = [];
  for (const runner of setup.runners) {
    const runnerPath = runner.path;
    const runnerScript = await import(resolve(defaultRoot, runnerPath));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runnerPath}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    for (const promptPath of setup.prompts) {
      output[promptPath] = {};
      for (const persona of setup.personas) {
        promises.push(
          runPromptSetup({
            evalId,
            runChain,
            runner: runner,
            promptPath,
            persona,
            serviceClient,
            output,
          }),
        );
      }
    }
  }

  await Promise.allSettled(promises);

  await writeFile(
    resolve(defaultRoot, `evals-output/${evalId}.json`),
    JSON.stringify({ setup, output }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
