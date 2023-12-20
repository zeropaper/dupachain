import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { CallbackHandlerMethods, Callbacks } from "langchain/callbacks";
import { EvalMessage, runPersona } from "./runPersona";
import { LocalFileCache } from "langchain/cache/file_system";
import CallbackHandler from "langfuse-langchain";
import { prepareTools } from "./prepareTools";
import { loadEvalFile, defaultRoot } from "./loadEvalFile";
import { isRunnerWithToolsInfo } from "./type-guards";
import { LogItems, ChainRunner, ToolsMap } from "./types";

config({ path: resolve(__dirname, "../../../../.env") });

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
  const evalId = Date.now().toString();
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

  // TODO: create a supabase cache
  const cache = await LocalFileCache.create(
    resolve(__dirname, "../../../../.cache/langchain"),
  );
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("../config");

  for (const runnerOrPath of setup.runners) {
    const runnerPath =
      typeof runnerOrPath === "string" ? runnerOrPath : runnerOrPath.path;
    const runnerScript = await import(resolve(defaultRoot, runnerPath));
    if (typeof runnerScript.runChain !== "function") {
      throw new Error(`Invalid runner: ${runnerPath}}`);
    }
    const runChain: ChainRunner = runnerScript.runChain;

    for (const promptPath of setup.prompts) {
      const systemPrompt = await readFile(
        resolve(defaultRoot, promptPath),
        "utf-8",
      );
      output[promptPath] = {};
      for (const personaOrPath of setup.personas) {
        const personaPath =
          typeof personaOrPath === "string"
            ? personaOrPath
            : personaOrPath.name;
        try {
          const evalCallbacks = await createEvalCallbacks();
          const agentCallbackHandler = new CallbackHandler({
            publicKey: LANGFUSE_PUBLIC_KEY,
            secretKey: LANGFUSE_SECRET_KEY,
            baseUrl: LANGFUSE_BASE_URL,
          });
          const callbacks: Callbacks = [evalCallbacks.handlers];

          let allTools: ToolsMap = isRunnerWithToolsInfo(runnerOrPath)
            ? await prepareTools({
                runner: runnerOrPath,
                callbacks,
                serviceClient,
              })
            : {};

          output[promptPath][personaPath] = {
            messages: await runPersona({
              personaOrPath,
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
          console.error(error);
          output[promptPath][personaPath] = {
            messages: [],
            log: [[Date.now(), "error", error]],
          };
        }
      }
    }
  }
  await writeFile(
    resolve(defaultRoot, `evals-output/${evalId}.json`),
    JSON.stringify(output),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
