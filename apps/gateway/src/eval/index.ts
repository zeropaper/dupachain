import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { EvalMessage, runPersona } from "./runPersona";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";
import { prepareTools } from "./prepareTools";
import { loadEvalFile, defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { LogItems, ChainRunner, ToolsMap } from "./types";
import { createEvalCallbacks } from "./createEvalCallbacks";

config({ path: resolve(__dirname, "../../../../.env") });

async function main() {
  const serviceClient = await import("../createServiceClient").then(
    ({ createServiceClient }) => createServiceClient(),
  );
  const setup = await loadEvalFile();
  const evalId = Date.now().toString();
  const output: Record<
    string,
    Record<
      string,
      {
        messages: EvalMessage[];
        log: LogItems;
      }
    >
  > = {};

  // TODO: create a supabase cache
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("../config");

  for (const runnerOrPath of setup.runners) {
    const runnerPath =
      typeof runnerOrPath === "string" ? runnerOrPath : runnerOrPath.path;
    const runnerScript = await import(resolve(defaultRoot, runnerPath));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runnerPath}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    for (const promptPath of setup.prompts) {
      const systemPrompt = await readFile(
        resolve(defaultRoot, promptPath),
        "utf-8",
      );
      output[promptPath] = {};
      for (const personaOrPath of setup.personas) {
        const personaPath =
          typeof personaOrPath === "string"
            ? personaOrPath
            : personaOrPath.name;
        try {
          const evalCallbacks = await createEvalCallbacks();
          const agentCallbackHandler = new CallbackHandler({
            publicKey: LANGFUSE_PUBLIC_KEY,
            secretKey: LANGFUSE_SECRET_KEY,
            baseUrl: LANGFUSE_BASE_URL,
          });
          const callbacks: Callbacks = [evalCallbacks.handlers];

          let allTools: ToolsMap = isRunnerWithToolsInfo(runnerOrPath)
            ? await prepareTools({
                runner: runnerOrPath,
                callbacks,
                serviceClient,
              })
            : {};

          output[promptPath][personaPath] = {
            messages: await runPersona({
              personaOrPath,
              runChain,
              allTools,
              systemPrompt,
              callbacks,
              cache,
            }),
            log: await evalCallbacks.teardown(),
          };
          await agentCallbackHandler.shutdownAsync().catch((err) => {
            console.warn(err);
          });
        } catch (error) {
          console.error(error);
          output[promptPath][personaPath] = {
            messages: [],
            log: [[Date.now(), "error", error]],
          };
        }
      }
    }
  }
  await writeFile(
    resolve(defaultRoot, `evals-output/${evalId}.json`),
    JSON.stringify(output),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
