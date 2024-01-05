import { resolve } from "path";
import { LocalFileCache } from "langchain/cache/file_system";

import { runPersona } from "./runPersona";
import { prepareTools } from "./prepareTools";
import { defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { ChainRunner, ToolsMap, EvalPersonaResult } from "./types";
import { prepareCallbacks } from "./createEvalCallbacks";
import { PersonaSchema, RunnerSchema } from "@local/schemas";

/**
 * Runs the prompt setup for a given run.
 *
 * @param runId - The ID of the run.
 * @param runner - The runner schema.
 * @param prompt - The prompt string.
 * @param persona - The persona schema.
 * @returns A promise that resolves to an Output object containing the messages and log.
 */
export async function runPromptSetup({
  runId,
  runner,
  prompt,
  persona,
}: {
  runId: string;
  runner: RunnerSchema;
  prompt: string;
  persona: PersonaSchema;
}): Promise<EvalPersonaResult> {
  try {
    // TODO: use supabase cache?
    const cache = await LocalFileCache.create(
      resolve(__dirname, "../../../.cache/langchain"),
    );
    const runnerScript = await import(resolve(defaultRoot, runner.path));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runner.path}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    // TODO: not really happy with having this here and others in runPersona...
    // should runPersona take care of the tools?
    // should the callbacks be passed to runPersona?
    // are these even needed?They don't seem to show up in langfuse...
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

    return {
      messages,
      log: log
        .concat(await teardown())
        // TODO: remove duplicates, good idea? done right?
        // .reduce(
        //   (acc, val) => {
        //     if (
        //       acc.find(
        //         ([timestamp, id]) => val[0] === timestamp && val[1] === id,
        //       )
        //     ) {
        //       return acc;
        //     }
        //     acc.push(val);
        //     return acc;
        //   },
        //   [] as EvalPersonaResult["log"],
        // )
        .sort(([a], [b]) => a - b),
    };
  } catch (error) {
    console.error(error);
    return {
      messages: [],
      log: [[Date.now(), runId, "error", error as any]],
    };
  }
}
