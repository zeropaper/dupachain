import { basename, resolve } from "path";
import { LocalFileCache } from "langchain/cache/file_system";

import { runPersona } from "./runPersona";
import { prepareTools } from "./prepareTools";
import { defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { ChainRunner, ToolsMap, EvalOutput } from "./types";
import { prepareCallbacks } from "./createEvalCallbacks";
import { PersonaSchema, RunnerSchema } from "./schemas";

/**
 * Runs the prompt setup for evaluation.
 *
 * @param evalId - The evaluation ID.
 * @param runner - The runner schema.
 * @param prompt - Content of a prompt file.
 * @param persona - The persona file schema<.
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
  const personaPath = persona.name;
  const runId = [
    evalId,
    basename(prompt).split(".")[0],
    basename(personaPath).split(".")[0],
  ]
    .join("_")
    .replaceAll(/[^a-z0-9_]+/gi, "_");
  try {
    const runnerScript = await import(resolve(defaultRoot, runner.path));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runner.path}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    // TODO: not really happy with having this here and others in runPersona...
    // should runPersona take care of the tools?
    // should the callbacks be passed to runPersona?
    const { callbacks, teardown } = await prepareCallbacks(`${runId} tools`);

    let toolsMap: ToolsMap = isRunnerWithToolsInfo(runner)
      ? await prepareTools({
          runner,
          callbacks,
        })
      : {};

    const { messages, log } = await runPersona({
      runId,
      persona,
      runChain,
      toolsMap,
      systemPrompt: prompt,
      cache,
    });
    output[prompt][personaPath] = {
      messages,
      log: log.concat(await teardown()).sort(([a], [b]) => a - b),
    };
  } catch (error) {
    console.error(error);
    output[prompt][personaPath] = {
      messages: [],
      log: [[Date.now(), runId, "error", error]],
    };
  }
}
