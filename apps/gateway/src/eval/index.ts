import { config } from "dotenv";
import { z } from "zod";
import YAML from "yaml";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { AgentExecutor } from "langchain/agents";
import { CallbackHandlerMethods, Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database, DatabaseTable } from "@local/supabase-types";
import { EvalMessage, runPersona } from "./runPersona";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";

config({ path: resolve(__dirname, "../../../../.env") });

// TODO: make this a "bin" script (that you can invoke with `npx aival`)
// TODO: allow passing in a custom config file
// TODO: make loading relative to the config file

const defaultRoot = resolve(__dirname, "../..");

const evalFileSchema = z.object({
  prompts: z.array(z.string()).describe("File paths to prompts"),
  runner: z.string(),
  tools: z.object({
    loaders: z.array(z.string()).describe("File paths to tool loaders"),
  }),
  personas: z.array(z.string()).describe("File paths to personas"),
});

const personaFileSchema = z.object({
  profile: z
    .string()
    .describe("Some instructions on how the tester should behave"),
  maxCalls: z.number().int().positive().default(10),
});

async function loadEvalFile(root = defaultRoot) {
  const file = await readFile(resolve(root, "evals.config.yml"), "utf-8");
  const data = YAML.parse(file);
  return evalFileSchema.parse(data);
}

export async function loadPersonaFile(path: string, root = defaultRoot) {
  const file = await readFile(resolve(root, path), "utf-8");
  const data = YAML.parse(file);
  return personaFileSchema.parse(data);
}

export type ChainRunner = (options: {
  chatMessages: DatabaseTable<"chat_messages", "Row">[];
  systemPrompt: string;
  callbacks?: Callbacks;
  tools: AgentExecutor["tools"];
}) => Promise<string>;

export type ToolsMap = Record<string, AgentExecutor["tools"][number]>;

type ToolLoader = (options: {
  callbacks?: any;
  client: SupabaseClient<Database>;
}) => Promise<ToolsMap>;

type LogItems = [number, string, ...any[]][];
async function createEvalCallbacks(): Promise<{
  teardown: () => Promise<LogItems>;
  handlers: CallbackHandlerMethods;
}> {
  const items: LogItems = [];
  function write(eventName: string, ...args: any[]) {
    items.push([Date.now(), eventName, ...args]);
  }
  return {
    async teardown() {
      return items;
    },
    handlers: {
      handleAgentAction(action, runId, parentRunId, tags) {
        write("handleAgentAction", action, runId, parentRunId, tags);
      },
      handleAgentEnd(action, runId, parentRunId, tags) {
        write("handleAgentEnd", action, runId, parentRunId, tags);
      },
      handleChainEnd(outputs, runId, parentRunId, tags, kwargs) {
        write("handleChainEnd", outputs, runId, parentRunId, tags, kwargs);
      },
      handleChainError(err, runId, parentRunId, tags, kwargs) {
        write("handleChainError", err, runId, parentRunId, tags, kwargs);
      },
      handleChainStart(
        chain,
        inputs,
        runId,
        parentRunId,
        tags,
        metadata,
        runType,
        name,
      ) {
        write(
          "handleChainStart",
          chain,
          inputs,
          runId,
          parentRunId,
          tags,
          metadata,
          runType,
          name,
        );
      },
      handleChatModelStart(
        llm,
        messages,
        runId,
        parentRunId,
        extraParams,
        tags,
        metadata,
        name,
      ) {
        write(
          "handleChatModelStart",
          llm,
          messages,
          runId,
          parentRunId,
          extraParams,
          tags,
          metadata,
          name,
        );
      },
      handleLLMEnd(output, runId, parentRunId, tags) {
        write("handleLLMEnd", output, runId, parentRunId, tags);
      },
      handleLLMError(err, runId, parentRunId, tags) {
        write("handleLLMError", err, runId, parentRunId, tags);
      },
      handleLLMNewToken(token, idx, runId, parentRunId, tags, fields) {
        write(
          "handleLLMNewToken",
          token,
          idx,
          runId,
          parentRunId,
          tags,
          fields,
        );
      },
      handleLLMStart(
        llm,
        prompts,
        runId,
        parentRunId,
        extraParams,
        tags,
        metadata,
        name,
      ) {
        write(
          "handleLLMStart",
          llm,
          prompts,
          runId,
          parentRunId,
          extraParams,
          tags,
        );
      },
      handleRetrieverEnd(documents, runId, parentRunId, tags) {
        write("handleRetrieverEnd", documents, runId, parentRunId, tags);
      },
      handleRetrieverError(err, runId, parentRunId, tags) {
        write("handleRetrieverError", err, runId, parentRunId, tags);
      },
      handleRetrieverStart(
        retriever,
        query,
        runId,
        parentRunId,
        tags,
        metadata,
        name,
      ) {
        write(
          "handleRetrieverStart",
          retriever,
          query,
          runId,
          parentRunId,
          tags,
          metadata,
          name,
        );
      },
      handleText(text, runId, parentRunId, tags) {
        write("handleText", text, runId, parentRunId, tags);
      },
      handleToolEnd(output, runId, parentRunId, tags) {
        write("handleToolEnd", output, runId, parentRunId, tags);
      },
      handleToolError(err, runId, parentRunId, tags) {
        write("handleToolError", err, runId, parentRunId, tags);
      },
      handleToolStart(tool, input, runId, parentRunId, tags, metadata, name) {
        write(
          "handleToolStart",
          tool,
          input,
          runId,
          parentRunId,
          tags,
          metadata,
          name,
        );
      },
    },
  };
}

async function main() {
  const serviceClient = await import("../createServiceClient").then(
    ({ createServiceClient }) => createServiceClient(),
  );
  const setup = await loadEvalFile();
  const runner = await import(resolve(defaultRoot, setup.runner));
  if (typeof runner.runChain !== "function") {
    throw new Error(`Invalid runner: ${setup.runner}}`);
  }
  const runChain: ChainRunner = runner.runChain;
  const evalId = Date.now().toString();
  // TODO: create a supabase cache
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("../config");
  const output: Record<
    string,
    Record<
      string,
      {
        messages: EvalMessage[];
        log: LogItems;
      }
    >
  > = {};
  for (const promptPath of setup.prompts) {
    const systemPrompt = await readFile(
      resolve(defaultRoot, promptPath),
      "utf-8",
    );
    output[promptPath] = {};
    for (const personaPath of setup.personas) {
      try {
        const evalCallbacks = await createEvalCallbacks();
        const agentCallbackHandler = new CallbackHandler({
          publicKey: LANGFUSE_PUBLIC_KEY,
          secretKey: LANGFUSE_SECRET_KEY,
          baseUrl: LANGFUSE_BASE_URL,
        });
        const callbacks: Callbacks = [evalCallbacks.handlers];
        let allTools: ToolsMap = {};
        for (const loaderPath of setup.tools.loaders) {
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
        output[promptPath][personaPath] = {
          messages: await runPersona({
            personaPath,
            runChain,
            allTools,
            systemPrompt,
            callbacks,
            cache,
          }),
          log: await evalCallbacks.teardown(),
        };
        await agentCallbackHandler.shutdownAsync().catch((err) => {
          console.warn(err);
        });
      } catch (error) {
        output[promptPath][personaPath] = {
          messages: [],
          log: [[Date.now(), "error", error]],
        };
      }
    }
  }
  await writeFile(
    resolve(defaultRoot, `evals.${evalId}.output.json`),
    JSON.stringify(output),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
