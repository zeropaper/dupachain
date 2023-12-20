import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { getTesterCall } from "./getTesterCall";
import { loadPersona } from "./loadPersonaFile";
import { ChainRunner, ToolsMap } from "../schemas";
import { BaseCache } from "langchain/schema";
import CallbackHandler from "langfuse-langchain";
import { EvalFileSchema, PersonaFileSchema, RunnerSchema } from "./schemas";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

export async function runPersona({
  personaOrPath,
  runChain,
  allTools,
  systemPrompt,
  callbacks,
  cache,
}: {
  personaOrPath: EvalFileSchema["personas"][number];
  runChain: ChainRunner;
  allTools: ToolsMap;
  systemPrompt: string;
  callbacks: Callbacks;
  cache?: BaseCache;
}): Promise<EvalMessage[]> {
  const persona = await loadPersona(personaOrPath);
  const { profile, maxCalls } = persona;
  const { LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY } =
    await import("../config");
  const agentCallbackHandler = new CallbackHandler({
    publicKey: LANGFUSE_PUBLIC_KEY,
    secretKey: LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_BASE_URL,
    userId: `tester ${persona.name.replaceAll(
      /[^a-z0-9]+/gi,
      "_",
    )} ${Date.now()}`,
  });

  const messages: EvalMessage[] = [];

  for (let i = 0; i < maxCalls; i++) {
    const input = await getTesterCall({
      profile,
      messages,
      callbacks: [
        // @ts-expect-error - langfuse's version of langchain seems outdated
        agentCallbackHandler,
        // ...(Array.isArray(callbacks) ? callbacks : []),
      ],
      cache,
    });
    messages.push({
      role: "assistant",
      content: input.message,
    });
    console.info(
      "tester: (%s / %s)\n\t%s",
      i,
      maxCalls,
      input.message,
      input.goalMet,
    );
    if (input.goalMet) {
      break;
    }
    const output = await runChain({
      tools: Object.entries(allTools).reduce(
        (arr, [name, tool]) => {
          arr.push(tool);
          return arr;
        },
        [] as AgentExecutor["tools"],
      ),
      systemPrompt,
      chatMessages: [...messages, { role: "assistant", content: "..." }].map(
        ({ role, ...rest }) => ({
          ...rest,
          role: role === "assistant" ? "user" : "assistant",
        }),
      ) as any,
      callbacks,
    });

    messages.push({
      role: "user",
      content: output!,
    });
    console.info("chat bot\n\t%s", output);
  }
  await agentCallbackHandler.shutdownAsync().catch((err) => {
    console.warn(err);
  });
  return messages;
}
