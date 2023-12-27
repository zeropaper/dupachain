import { readFile } from "fs/promises";
import { basename, resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";

import { runPersona } from "./runPersona";
import { prepareTools } from "./prepareTools";
import { defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { ChainRunner, ToolsMap, EvalOutput } from "./types";
import { createEvalCallbacks } from "./createEvalCallbacks";
import { EvalFileSchema, PersonaSchema, RunnerSchema } from "./schemas";

/**
 * Runs the prompt setup for evaluation.
 *
 * @param evalId - The evaluation ID.
 * @param runner - The runner schema.
 * @param prompt - Content of a prompt file.
 * @param persona - The persona file schema.
 * @param output - The evaluation output.
 */
export async function runPromptSetup({
  evalId,
  runner,
  prompt,
  persona,
  output,
}: {
  evalId: string;
  runner: RunnerSchema;
  prompt: string;
  persona: PersonaSchema;
  output: EvalOutput;
}) {
  // TODO: create a supabase cache
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("./config");
  const personaPath = persona.name;
  try {
    const runnerScript = await import(resolve(defaultRoot, runner.path));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runner.path}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;
    const runId = [
      evalId,
      basename(prompt).split(".")[0],
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
          runner,
          callbacks,
        })
      : {};

    output[prompt][personaPath] = {
      messages: await runPersona({
        runId,
        persona,
        runChain,
        toolsMap,
        systemPrompt: prompt,
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
    output[prompt][personaPath] = {
      messages: [],
      log: [[Date.now(), "error", error]],
    };
  }
}
