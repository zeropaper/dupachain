import determineUserIntent from "./determineUserIntent";
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
import { createSnowboardSearchTool } from "../tools/nitroTools";
import { Callbacks } from "langchain/callbacks";
import { AgentExecutor } from "langchain/agents";

export async function answerUser(chatId: string, logger: Logger) {
  const serviceClient = createServiceClient();
  const { data: chatMessages, error } = await serviceClient
    .from("chat_messages")
    .select("*")
    .eq("chat_id", chatId)
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
    logger.error({ error });
    return;
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
    logger.error({ error });
    return;
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
        return data;
      });
  }

  try {
    // TODO: should the moderation and intent determination be done in parallel?
    await handleModeration({
      chatMessages,
    });

    // const intent = await determineUserIntent({
    //   chatMessages,
    // });

    const agentCallbackHandler = new CallbackHandler({
      publicKey: LANGFUSE_PUBLIC_KEY,
      secretKey: LANGFUSE_SECRET_KEY,
      baseUrl: LANGFUSE_BASE_URL,
      userId: chatId,
    });
    const callbacks: Callbacks = [
      // @ts-expect-error - langfuse's version of langchain seems outdated
      agentCallbackHandler,
    ];
    const tools: AgentExecutor["tools"] = [
      createSnowboardSearchTool(callbacks),
    ];
    const assistantAnswer = await runChain({
      chatMessages,
      systemPrompt: `You are Reto, a Nitro snowboards specialist. You are talking to a customer who wants to buy a snowboard. You are trying to find out what kind of snowboard the customer wants. If they need some gears, you ask questions that will allow picking the best items in catalog. If you need more information from the user, you ask 1 question at a time and give some examples. You are a chatbot, you are succint. You do not go off topic. You do not talk about other brands, only Nitro.`,
      callbacks,
      tools,
    });

    await agentCallbackHandler.shutdownAsync();

    return saveAnswer(assistantAnswer);
  } catch (error) {
    logger.error({ error });
    return saveAnswer(`Sorry, something went wrong`);
  }
}
