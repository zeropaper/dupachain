import YAML from "yaml";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { EvalFileSchema, personaFileSchema } from "./schemas";
import { defaultRoot } from "./loadEvalFile";

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
