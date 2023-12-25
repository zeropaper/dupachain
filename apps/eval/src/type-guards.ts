import { RunnerSchema, ToolsSchema } from "./schemas";

/**
 * Checks if the provided runner object is of type RunnerSchema with tools information.
 *
 * @param runner - The runner object to be checked.
 * @returns A boolean indicating whether the runner object is of type RunnerSchema with tools information.
 */
export function isRunnerWithToolsInfo(
  runner: any,
): runner is RunnerSchema & { tools: ToolsSchema } {
  return (
    typeof runner !== "string" &&
    Array.isArray(runner.tools.enabled) &&
    runner.tools.enabled.length > 0
  );
}
