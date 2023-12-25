import { readFile } from "fs/promises";
import { basename, resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";

import { runPersona } from "./runPersona";
import { prepareTools } from "./prepareTools";
import { defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { ChainRunner, ToolsMap, EvalOutput } from "./types";
import { createEvalCallbacks } from "./createEvalCallbacks";
import { EvalFileSchema, PersonaFileSchema, RunnerSchema } from "./schemas";

export async function runPromptSetup({
  evalId,
  runChain,
  runner,
  promptPath,
  persona,
  serviceClient,
  output,
}: {
  evalId: string;
  runChain: ChainRunner;
  runner: RunnerSchema;
  promptPath: EvalFileSchema["prompts"][number];
  persona: PersonaFileSchema;
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
  const personaPath = persona.name;
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

    let toolsMap: ToolsMap = isRunnerWithToolsInfo(runner)
      ? await prepareTools({
          runner: runner,
          callbacks,
          serviceClient,
        })
      : {};

    output[promptPath][personaPath] = {
      messages: await runPersona({
        runId,
        persona: persona,
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
