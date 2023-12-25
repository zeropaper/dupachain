import YAML from "yaml";
import { readFile } from "fs/promises";
import { basename, dirname, resolve } from "path";
import { ConfigSchema, evalFileSchema } from "./schemas";
import { loadPersona } from "./loadPersonaFile";

export const defaultRoot = resolve(__dirname, "../..");

export async function loadEvalFile(
  filepath = resolve(process.cwd(), "default.evalsconfig.yml"),
) {
  const file = await readFile(filepath, "utf-8");
  const data = YAML.parse(file);
  const raw = evalFileSchema.parse(data);
  const rootDir = raw.rootDir
    ? resolve(dirname(filepath), raw.rootDir)
    : dirname(filepath);
  const setup: ConfigSchema = {
    rootDir,
    filename: basename(filepath),
    prompts: raw.prompts.map((prompt) => resolve(rootDir, prompt)),
    runners: [],
    personas: [],
  };

  for (const runnerOrPath of raw.runners) {
    const runnerPath =
      typeof runnerOrPath === "string" ? runnerOrPath : runnerOrPath.path;
    const absRunnerPath = resolve(setup.rootDir, runnerPath);
    const runnerScript = await import(absRunnerPath);
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runnerPath}}`);
    }
    if (typeof runnerOrPath === "string") {
      setup.runners.push({
        path: absRunnerPath,
        tools: {
          loaders: [],
          enabled: [],
        },
        modelName: "gpt-3.5-turbo-1106",
      });
    } else {
      setup.runners.push({
        ...runnerOrPath,
        tools: {
          ...runnerOrPath.tools,
          loaders: runnerOrPath.tools.loaders.map((loader) =>
            resolve(setup.rootDir, loader),
          ),
        },
        path: absRunnerPath,
      });
    }
  }

  for (const personaOrPath of raw.personas) {
    const persona = await loadPersona(personaOrPath, setup.rootDir);
    setup.personas.push(persona);
  }

  return setup;
}
