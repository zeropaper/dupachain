import { AgentExecutor } from "langchain/agents";
import { Callbacks } from "langchain/callbacks";
import { ChatMessageInfo } from "@local/client";
import { getTesterCall } from "./getTesterCall";
import { loadPersonaFile } from ".";
import { ChainRunner, ToolsMap } from "../schemas";
import { BaseCache } from "langchain/schema";

export interface EvalMessage {
  content: string;
  role: "user" | "assistant";
  metadata?: any;
}

export async function runPersona({
  personaPath,
  runChain,
  allTools,
  systemPrompt,
  callbacks,
  cache,
}: {
  personaPath: string;
  runChain: ChainRunner;
  allTools: ToolsMap;
  systemPrompt: string;
  callbacks: Callbacks;
  cache?: BaseCache;
}): Promise<EvalMessage[]> {
  const persona = await loadPersonaFile(personaPath);
  const { profile, maxCalls } = persona;

  const messages: EvalMessage[] = [];
  for (let i = 0; i < maxCalls; i++) {
    const input = await getTesterCall({
      profile,
      messages,
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
  return messages;
}
