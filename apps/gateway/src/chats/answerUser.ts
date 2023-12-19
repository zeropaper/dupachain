import { handleModeration } from "./handleModeration";
import { runChain } from "../chains/toolCalling";
import { createServiceClient } from "../createServiceClient";
import { CallbackHandler } from "langfuse-langchain";
import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "../config";
import { Logger } from "pino";
import { loadTools } from "../nitro/tools/nitroTools";
import { Callbacks } from "langchain/callbacks";
import { AgentExecutor } from "langchain/agents";
import { ChatsRow, DatabaseTable } from "../types";

export async function answerUser(chat: ChatsRow, logger: Logger) {
  const serviceClient = createServiceClient();
  const { data: chatMessages, error } = await serviceClient
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });
  try {
    if (error) {
      throw new Error(error.message);
    }
    if (!chatMessages) {
      throw new Error("No chat found");
    }
    if (chatMessages.length < 2) {
      throw new Error("Not enough chat messages");
    }
  } catch (error) {
    logger.error({
      op: "answerUser validation",
      error: error instanceof Error ? error.message : error,
    });
    throw error instanceof Error
      ? error
      : new Error("Cannot retrieve messages");
  }

  const lastUserMessage = chatMessages.at(-2);
  const lastAssistantMessage = chatMessages.at(-1);

  try {
    if (!lastUserMessage || lastUserMessage.role !== "user") {
      throw new Error("No last user message found");
    }
    if (!lastAssistantMessage || lastAssistantMessage.role !== "assistant") {
      throw new Error("No last assistant message found");
    }
  } catch (error) {
    logger.error({
      op: "answerUser validation",
      error: error instanceof Error ? error.message : error,
    });
    throw error instanceof Error
      ? error
      : new Error("Cannot retrieve last user message");
  }

  function saveAnswer(answer: string) {
    return serviceClient
      .from("chat_messages")
      .update({
        content: answer,
        finished: true,
      })
      .eq("id", lastAssistantMessage!.id)
      .select()
      .single()
      .then(({ data, error }) => {
        logger.info({ op: "answerUser saveAnswer", data, error });
        if (error) {
          throw new Error(error.message);
        }
        if (!data) {
          throw new Error("Empty data");
        }
        return data as DatabaseTable<"chat_messages", "Row"> & {
          role: "assistant";
          finished: true;
        };
      });
  }

  try {
    // TODO: should the moderation and intent determination be done in parallel?
    await handleModeration({
      chatMessages,
    });

    const agentCallbackHandler = new CallbackHandler({
      publicKey: LANGFUSE_PUBLIC_KEY,
      secretKey: LANGFUSE_SECRET_KEY,
      baseUrl: LANGFUSE_BASE_URL,
      userId: chat.id,
    });
    const callbacks: Callbacks = [
      // @ts-expect-error - langfuse's version of langchain seems outdated
      agentCallbackHandler,
    ];
    const nitroTools = await loadTools({
      client: serviceClient,
      callbacks,
    });
    const tools: AgentExecutor["tools"] = [...Object.values(nitroTools)];
    const assistantAnswer = await runChain({
      chatMessages,
      systemPrompt: chat.metadata!.systemPrompt as string,
      callbacks,
      tools,
    });

    await agentCallbackHandler.shutdownAsync();

    return saveAnswer(assistantAnswer);
  } catch (error) {
    logger.error({
      op: "answerUser processing",
      error: error instanceof Error ? error.message : error,
    });
    return saveAnswer(`Sorry, something went wrong`);
  }
}
