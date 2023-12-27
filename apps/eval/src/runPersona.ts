import { Callbacks } from "langchain/callbacks";
import { BaseCache } from "langchain/schema";
import CallbackHandler from "langfuse-langchain";
import { log } from "@local/cli";
import { ChainRunner, ToolsMap } from "./types";
import { testGoal } from "./testGoal";
import { PersonaSchema } from "./schemas";
import { getTesterCall } from "./getTesterCall";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

async function prepareCallbacks(
  sessionId: string,
  callbacks?: Callbacks,
): Promise<{ callbacks: Callbacks; teardown: () => Promise<void> }> {
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("./config");
  const callbackHandler = new CallbackHandler({
    publicKey: LANGFUSE_PUBLIC_KEY,
    secretKey: LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_BASE_URL,
    sessionId,
  });
  return {
    callbacks: [
      callbackHandler,
      ...(Array.isArray(callbacks) ? callbacks : []),
    ],
    teardown: () =>
      callbackHandler.shutdownAsync().catch((err) => {
        console.warn("langfuse shutdown error", err);
      }),
  };
}

/**
 * Runs the persona evaluation process.
 *
 * @param runId - The ID of the run.
 * @param persona - The persona file schema.
 * @param runChain - The chain runner.
 * @param toolsMap - The map of tools.
 * @param systemPrompt - The system prompt.
 * @param callbacks - The callbacks.
 * @param cache - The optional cache.
 * @returns A promise that resolves to an array of evaluation messages.
 */
export async function runPersona({
  runId,
  persona,
  runChain,
  toolsMap,
  systemPrompt,
  callbacks,
  cache,
}: {
  runId: string;
  persona: PersonaSchema;
  runChain: ChainRunner;
  toolsMap: ToolsMap;
  systemPrompt: string;
  callbacks: Callbacks;
  cache?: BaseCache;
}): Promise<EvalMessage[]> {
  const { profile, firstMessage, maxCalls } = persona;
  // in order to ease the reading/organization of data in/with langfuse
  // we create 3 different sessions
  const testerCallbacks = await prepareCallbacks(`${runId} tester`, callbacks);
  const goalTesterCallbacks = await prepareCallbacks(
    `${runId} goal tester`,
    callbacks,
  );
  const agentCallbacks = await prepareCallbacks(`${runId} agent`, callbacks);

  const messages: EvalMessage[] = [];

  for (let i = 0; i < maxCalls; i += 1) {
    const input = await getTesterCall({
      profile,
      firstMessage,
      messages,
      callbacks: testerCallbacks.callbacks,
      cache,
    });
    messages.push({
      role: "assistant",
      content: input.message,
    });

    log.blue("test bot (%s / %s):\n\t%s", i, maxCalls, input.message);

    const output = await runChain({
      tools: Object.values(toolsMap),
      systemPrompt,
      chatMessages: [...messages, { role: "assistant", content: "..." }].map(
        ({ role, ...rest }) => ({
          ...rest,
          role: role === "assistant" ? "user" : "assistant",
        }),
      ) as any,
      callbacks: agentCallbacks.callbacks,
    });

    messages.push({
      role: "user",
      content: output!,
    });
    log.cyan("chat bot (%s / %s):\n\t%s", i, maxCalls, output);

    if (persona.goal && messages.length > 1) {
      const goalMet = await testGoal({
        callbacks: goalTesterCallbacks.callbacks,
        cache,
        persona,
        messages,
      });
      log[goalMet ? "green" : "magenta"](
        "goal met? %s\n\t%s",
        goalMet,
        persona.goal,
      );
      if (goalMet) {
        break;
      }
    }
  }
  // teardown the langfuse managers
  await Promise.allSettled([
    testerCallbacks.teardown(),
    goalTesterCallbacks.teardown(),
    agentCallbacks.teardown(),
  ]);
  return messages;
}
