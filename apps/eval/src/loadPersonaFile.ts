import YAML from "yaml";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { EvalFileSchema, personaFileSchema } from "./schemas";
import { defaultRoot } from "./loadEvalFile";

/**
 * Loads a persona file and returns the parsed data.
 * If the `info` parameter is already an object, it is returned as is.
 * If the `info` parameter is a string, it is treated as a file path and the file is read and parsed.
 * @param info - The path to the persona file or the persona object itself.
 * @param root - The root directory to resolve the file path from. Defaults to `defaultRoot`.
 * @returns The parsed persona data.
 */
export async function loadPersona(
  info: EvalFileSchema["personas"][number],
  root = defaultRoot,
) {
  if (typeof info !== "string") {
    return info;
  }
  const file = await readFile(resolve(root, info), "utf-8");
  const data = YAML.parse(file);
  return personaFileSchema.parse(data);
}
