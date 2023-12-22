import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";
import { basename, resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";
import { EvalMessage, runPersona } from "./runPersona";
import { prepareTools } from "./prepareTools";
import { loadEvalFile, defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { LogItems, ChainRunner, ToolsMap } from "./types";
import { createEvalCallbacks } from "./createEvalCallbacks";
import { EvalFileSchema } from "./schemas";

config({ path: resolve(__dirname, "../../../../.env") });

type EvalOutput = Record<
  string,
  Record<
    string,
    {
      messages: EvalMessage[];
      log: LogItems;
    }
  >
>;

async function runPromptSetup({
  evalId,
  runChain,
  runnerOrPath,
  promptPath,
  personaOrPath,
  serviceClient,
  output,
}: {
  evalId: string;
  runChain: ChainRunner;
  runnerOrPath: EvalFileSchema["runners"][number];
  promptPath: EvalFileSchema["prompts"][number];
  personaOrPath: EvalFileSchema["personas"][number];
  serviceClient: SupabaseClient<Database>;
  output: EvalOutput;
}) {
  const systemPrompt = await readFile(
    resolve(defaultRoot, promptPath),
    "utf-8",
  );
  // TODO: create a supabase cache
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("../config");
  const personaPath =
    typeof personaOrPath === "string" ? personaOrPath : personaOrPath.name;
  try {
    const runId = [
      evalId,
      basename(promptPath).split(".")[0],
      basename(personaPath).split(".")[0],
    ]
      .join("_")
      .replaceAll(/[^a-z0-9_]+/gi, "_");
    const evalCallbacks = await createEvalCallbacks();
    const agentCallbackHandler = new CallbackHandler({
      publicKey: LANGFUSE_PUBLIC_KEY,
      secretKey: LANGFUSE_SECRET_KEY,
      baseUrl: LANGFUSE_BASE_URL,
      sessionId: `${runId} agent`,
    });

    const callbacks: Callbacks = [evalCallbacks.handlers];

    let toolsMap: ToolsMap = isRunnerWithToolsInfo(runnerOrPath)
      ? await prepareTools({
          runner: runnerOrPath,
          callbacks,
          serviceClient,
        })
      : {};

    output[promptPath][personaPath] = {
      messages: await runPersona({
        runId,
        personaOrPath,
        runChain,
        toolsMap,
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

async function main() {
  const serviceClient = await import("../createServiceClient").then(
    ({ createServiceClient }) => createServiceClient(),
  );
  const setup = await loadEvalFile();
  const evalId = Date.now().toString();
  const output: EvalOutput = {};

  const promises: Promise<void>[] = [];
  for (const runnerOrPath of setup.runners) {
    const runnerPath =
      typeof runnerOrPath === "string" ? runnerOrPath : runnerOrPath.path;
    const runnerScript = await import(resolve(defaultRoot, runnerPath));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runnerPath}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    for (const promptPath of setup.prompts) {
      output[promptPath] = {};
      for (const personaOrPath of setup.personas) {
        promises.push(
          runPromptSetup({
            evalId,
            runChain,
            runnerOrPath,
            promptPath,
            personaOrPath,
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
