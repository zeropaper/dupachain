import { resolve } from "path";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { defaultRoot } from "./loadEvalFile";
import { ToolsMap, ToolLoader } from "./types";
import { RunnerSchema, ToolsSchema } from "./schemas";

export async function prepareTools({
  runner,
  callbacks,
  serviceClient,
}: {
  runner: RunnerSchema & { tools: ToolsSchema };
  callbacks: Callbacks;
  serviceClient: SupabaseClient<Database>;
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
      client: serviceClient,
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