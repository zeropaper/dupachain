import { z } from "zod";
import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { formatToOpenAIFunction } from "langchain/tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { AgentExecutor } from "langchain/agents";
import {
  OpenAIFunctionsAgentOutputParser,
  type ToolsAgentStep,
} from "langchain/agents/openai/output_parser";

import {
  AIMessage,
  AgentStep,
  BaseMessage,
  FunctionMessage,
  HumanMessage,
} from "langchain/schema";
import {
  ChatMessageHistory,
  ConversationSummaryBufferMemory,
  EntityMemory,
} from "langchain/memory";

import {
  ChainRunner,
  chatModelNameSchema,
  instructModelNameSchema,
} from "../schemas";
import { findLast } from "../findLast";

const _DEFAULT_ENTITY_EXTRACTION_TEMPLATE = `You are an AI assistant reading the transcript of a conversation between an AI and a human. Extract all of the proper nouns from the last line of conversation. As a guideline, a proper noun is generally capitalized. You should definitely extract all names and places.

The conversation history is provided just in case of a coreference (e.g. "What do you know about him" where "him" is defined in a previous line) -- ignore items mentioned there that are not in the last line.

Return the output as a single comma-separated list, or NONE if there is nothing of note to return (e.g. the user is just issuing a greeting or having a simple conversation).

EXAMPLE
Conversation history:
Person #1: my name is Jacob. how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff.
Output: Jacob,Langchain
END OF EXAMPLE

EXAMPLE
Conversation history:
Person #1: how's it going today?
AI: "It's going great! How about you?"
Person #1: good! busy working on Langchain. lots to do.
AI: "That sounds like a lot of work! What kind of things are you doing to make Langchain better?"
Last line:
Person #1: i'm trying to improve Langchain's interfaces, the UX, its integrations with various products the user might want ... a lot of stuff. I'm working with Person #2.
Output: Langchain, Person #2
END OF EXAMPLE

Conversation history (for reference only):
{history}
Last line of conversation (for extraction):
Human: {input}

Output:`;

const _DEFAULT_ENTITY_SUMMARIZATION_TEMPLATE = `You are an AI assistant helping a human keep track of facts about relevant people, places, and concepts in their life. Update and add to the summary of the provided entity in the "Entity" section based on the last line of your conversation with the human. If you are writing the summary for the first time, return a single sentence.\nThe update should only include facts that are relayed in the last line of conversation about the provided entity, and should only contain facts about the provided entity.

If there is no new information about the provided entity or the information is not worth noting (not an important or relevant fact to remember long-term), output the exact string "UNCHANGED" below.

Full conversation history (for context):
{history}

Entity to summarize:
{entity}

Existing summary of {entity}:
{summary}

Last line of conversation:
Human: {input}\nUpdated summary (or the exact string "UNCHANGED" if there is no new information about {entity} above):`;

const enotityMemoryWithToolsOptionsSchema = z.object({
  memory: z
    .object({
      messagesCount: z.number().default(5),
      llm: z
        .object({
          modelName: instructModelNameSchema,
          temperature: z.number().positive().max(1).default(0),
        })
        .optional(),
      entityExtractionTemplate: z.string().optional(),
      entitySummarizationTemplate: z.string().optional(),
    })
    .optional(),
  model: z
    .object({
      modelName: chatModelNameSchema,
      temperature: z.number().positive().max(1).default(0.9),
    })
    .optional(),
});

export function validateConfig(obj: unknown) {
  return enotityMemoryWithToolsOptionsSchema.parse(obj);
}

type EntityMemoryWithToolsOptions = z.infer<
  typeof enotityMemoryWithToolsOptionsSchema
>;

export async function runChain({
  chatMessages,
  systemPrompt,
  callbacks,
  tools,
  cache,
  runnerOptions,
}: Parameters<ChainRunner<EntityMemoryWithToolsOptions>>[0]) {
  const lastUserMessage = findLast(chatMessages, ({ role }) => role === "user");
  if (!lastUserMessage) {
    throw new Error("No last user message found");
  }

  if (!tools.length) {
    throw new Error("No tools passed to chain runner");
  }
  const {
    memory: memoryOptions = {
      messagesCount: 5,
      llm: {
        modelName: "gpt-3.5-turbo-instruct",
        temperature: 0,
      },
    },
    model: modelOptions = {
      modelName: "gpt-3.5-turbo-0613",
      temperature: 0.9,
    },
  } = validateConfig(runnerOptions || {});

  const chatHistory = new ChatMessageHistory(
    chatMessages
      .slice(memoryOptions.messagesCount * -1, -1)
      .map(({ content, role }) =>
        role === "user" ? new HumanMessage(content) : new AIMessage(content),
      ),
  );

  const memory = new EntityMemory({
    ...memoryOptions,
    entityExtractionPrompt: PromptTemplate.fromTemplate(
      memoryOptions.entityExtractionTemplate ||
        _DEFAULT_ENTITY_EXTRACTION_TEMPLATE,
    ),
    entitySummarizationPrompt: PromptTemplate.fromTemplate(
      memoryOptions.entitySummarizationTemplate ||
        _DEFAULT_ENTITY_SUMMARIZATION_TEMPLATE,
    ),
    chatHistoryKey: "history",
    entitiesKey: "entities",
    llm: new OpenAI({
      ...memoryOptions.llm,
      callbacks,
      cache,
    }),
    chatHistory,
  });

  const model = new ChatOpenAI({
    ...modelOptions,
    callbacks,
    cache,
  });

  // Convert to OpenAI tool format
  const modelWithTools = model.bind({
    // @ts-expect-error - unclear, probably some type mismatch because it works
    functions: tools.map(formatToOpenAIFunction),
  });

  const messages: [string, string][] = (await chatHistory.getMessages())
    .slice(-memoryOptions.messagesCount * 2, -1)
    .map((m: any) => {
      return [m._getType(), m.content];
    });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ...messages,
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
    steps.flatMap(({ action, observation }) => {
      if ("messageLog" in action && action.messageLog !== undefined) {
        const log = action.messageLog as BaseMessage[];
        return log.concat(new FunctionMessage(observation, action.tool));
      } else {
        return [new AIMessage(action.log)];
      }
    });

  const chain = RunnableSequence.from([
    {
      input: (i: { input: string; steps: ToolsAgentStep[] }) => i.input,
      agent_scratchpad: (i: { input: string; steps: ToolsAgentStep[] }) =>
        formatAgentSteps(i.steps),
    },
    prompt,
    modelWithTools,
    new OpenAIFunctionsAgentOutputParser(),
  ]).withConfig({
    runName: "OpenAIFunctionsAgent",
    callbacks,
  });

  const executor = AgentExecutor.fromAgentAndTools({
    agent: chain,
    callbacks,
    memory,
    tools,
  });

  const res = await executor.invoke(
    {
      input: lastUserMessage.content,
    },
    { callbacks },
  );
  return (res && res.output) || res;
}
