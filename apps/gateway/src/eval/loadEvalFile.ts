import YAML from "yaml";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { evalFileSchema } from "./schemas";

export const defaultRoot = resolve(__dirname, "../..");

export async function loadEvalFile(root = defaultRoot) {
  const file = await readFile(resolve(root, "evals.config.yml"), "utf-8");
  const data = YAML.parse(file);
  return evalFileSchema.parse(data);
}
