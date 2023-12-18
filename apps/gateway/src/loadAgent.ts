import YAML from "yaml";
import { agentSchema } from "./schemas";
import { readFileSync } from "fs";
import { resolve } from "path";

export function loadAgent(name: string) {
  const content = readFileSync(
    resolve(__dirname, `./agents/${name}.yml`),
    "utf8",
  );
  const parsed = YAML.parse(content);
  return agentSchema.parse(parsed);
}
