import { resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { defaultRoot } from "./loadEvalFile";
import { ToolsMap, ToolLoader } from "./types";
import { RunnerSchema, ToolsSchema } from "@local/schemas";

/**
 * Prepares the tools by loading them using the provided runner and callbacks.
 *
 * @param {Object} options - The options object.
 * @param {RunnerSchema & { tools: ToolsSchema }} options.runner - The runner object containing the tools schema.
 * @param {Callbacks} options.callbacks - The callbacks object.
 * @returns {ToolsMap} - The map of loaded tools.
 * @throws {Error} - If an invalid loader is encountered.
 */
export async function prepareTools({
  runner,
  callbacks,
}: {
  runner: RunnerSchema & { tools: ToolsSchema };
  callbacks: Callbacks;
}) {
  let allTools: ToolsMap = {};
  for (const loaderPath of runner.tools.loaders) {
    const loader = await import(resolve(defaultRoot, loaderPath));
    if (typeof loader.loadTools !== "function") {
      throw new Error(`Invalid loader: ${loaderPath}`);
    }
    const loadTools: ToolLoader = loader.loadTools;
    const loadedTools = await loadTools({
      callbacks,
    });
    allTools = { ...allTools, ...loadedTools };
  }
  return Object.entries(allTools).reduce((obj, [name, tool]) => {
    if (runner.tools.enabled.includes(name)) {
      obj[name] = tool;
    }
    return obj;
  }, {} as ToolsMap);
}
