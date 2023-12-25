import { RunnerSchema, ToolsSchema } from "./schemas";

export function isRunnerWithToolsInfo(
  runner: any,
): runner is RunnerSchema & { tools: ToolsSchema } {
  return (
    typeof runner !== "string" &&
    // TODO: Keep that? Add default tools?
    // Array.isArray(runner.tools.loaders) &&
    Array.isArray(runner.tools.enabled) &&
    runner.tools.enabled.length > 0
  );
}
