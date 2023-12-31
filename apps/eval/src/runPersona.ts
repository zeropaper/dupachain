import { BaseCache } from "langchain/schema";
import { log } from "@local/cli";
import { ChainRunner, LogItems, ToolsMap } from "./types";
import { testGoal } from "./testGoal";
import { PersonaSchema } from "@local/schemas";
import { getTesterCall } from "./getTesterCall";
import { prepareCallbacks } from "./createEvalCallbacks";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

/**
 * Runs the persona evaluation process.
 *
 * @param runId - The ID of the run.
 * @param persona - The persona file schema.
 * @param runChain - The chain runner.
 * @param toolsMap - The map of tools.
 * @param systemPrompt - The system prompt.
 * @param cache - The optional cache.
 * @returns A promise that resolves to an array of evaluation messages.
 */
export async function runPersona({
  runId,
  persona,
  runChain,
  toolsMap,
  systemPrompt,
  cache,
}: {
  runId: string;
  persona: PersonaSchema;
  runChain: ChainRunner;
  toolsMap: ToolsMap;
  systemPrompt: string;
  cache?: BaseCache;
}): Promise<{ messages: EvalMessage[]; log: LogItems }> {
  const messages: EvalMessage[] = [];

  try {
    const { profile, firstMessage, maxCalls } = persona;
    // in order to ease the reading/organization of data in/with langfuse
    // we create 3 different sessions
    const testerCallbacks = await prepareCallbacks(`${runId} tester`);
    const goalTesterCallbacks = await prepareCallbacks(`${runId} goal tester`);
    const agentCallbacks = await prepareCallbacks(`${runId} agent`);

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
        chatMessages: messages.map(({ role, ...rest }) => ({
          ...rest,
          role: role === "assistant" ? "user" : "assistant",
        })) as any,
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
        log[goalMet ? "green" : "magenta"]("goal met? %s", goalMet);
        if (goalMet) {
          break;
        }
      }
    }
    // teardown the langfuse managers and get the results
    const logResults = await Promise.allSettled([
      testerCallbacks.teardown(),
      goalTesterCallbacks.teardown(),
      agentCallbacks.teardown(),
    ]);
    return {
      messages,
      log: logResults
        .map((r) =>
          r.status === "fulfilled"
            ? r.value
            : ([[Date.now(), runId, "error", r.reason]] satisfies LogItems),
        )
        .reduce((acc, val) => acc.concat(val), []),
    };
  } catch (error) {
    return {
      messages,
      log: [[Date.now(), runId, "error", error]],
    };
  }
}
