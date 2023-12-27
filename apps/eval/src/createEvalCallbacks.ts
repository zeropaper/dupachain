import { CallbackHandlerMethods, Callbacks } from "langchain/callbacks";
import { LogItems } from "./types";
import CallbackHandler from "langfuse-langchain";

/**
 * Creates evaluation callbacks.
 * @returns A promise that resolves to an object containing the teardown function and the handlers.
 */
async function createEvalCallbacks(scope: string): Promise<{
  teardown: () => Promise<LogItems>;
  handlers: CallbackHandlerMethods;
}> {
  const items: LogItems = [];
  function write(eventName: string, ...args: any[]) {
    items.push([Date.now(), scope, eventName, ...args]);
  }
  // this may look convoluted, but having this like that makes it easier
  // to maintain because it can rely on the TS types to make sure
  // that all the events are handled with all the arguments
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

export async function prepareCallbacks(
  sessionId: string,
): Promise<{ callbacks: Callbacks; teardown: () => Promise<LogItems> }> {
  // TODO: make langfuse optional
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("./config");
  const callbackHandler = new CallbackHandler({
    publicKey: LANGFUSE_PUBLIC_KEY,
    secretKey: LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_BASE_URL,
    sessionId,
  });
  const { handlers, teardown } = await createEvalCallbacks(sessionId);
  return {
    callbacks: [callbackHandler, handlers],
    teardown: () => {
      callbackHandler.shutdownAsync().catch((err) => {
        console.warn("langfuse shutdown error", err);
      });
      return teardown();
    },
  };
}
