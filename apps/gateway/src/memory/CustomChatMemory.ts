import { z } from "zod";
import { LLMChain } from "langchain/chains";
import { BaseLLM } from "langchain/llms/base";
import { PromptTemplate } from "langchain/prompts";
import {
  BaseChatMemory,
  BaseChatMemoryInput,
  InputValues,
  MemoryVariables,
  getBufferString,
} from "langchain/memory";
import { BaseEntityStore } from "langchain/schema";
import { zodToJsonSchema } from "zod-to-json-schema";

export const summaryPromptTemplate = `You are an AI assistant reading the transcript of a conversation between an AI and a human. You extract the information needed, and only them, and return it as a valid JSON object. Your answer only includes the JSON object, nothing else.

EXAMPLE
Current summary:
{{ "age": null, "location": null }}

JSON schema of the information needed:
{{"type":"object","properties":{{"age":{{"type":"number"}},"location":{{"type":"string"}}}},"required":["age","location"],"additionalProperties":false}}

New lines of conversation:
AI: How old are you?
Human: I'm 42.

New summary:
{{ "age": 42, "location": null }}
END OF EXAMPLE

JSON schema of the information needed:
{schema}

Current summary:
{summary}

New lines of conversation:
{new_lines}

New summary:`;

export interface CustomMemoryOptions extends BaseChatMemoryInput {
  llm: BaseLLM;
  chatHistoryKey?: string;
  entityExtractionTemplate?: string;
  aiPrefix?: string;
  humanPrefix?: string;
  k?: number;
  entityStore: BaseEntityStore;
  schema: z.AnyZodObject;
}

export class CustomChatMemory extends BaseChatMemory {
  constructor(fields: CustomMemoryOptions) {
    super({
      chatHistory: fields.chatHistory,
      returnMessages: fields.returnMessages ?? false,
      inputKey: fields.inputKey,
      outputKey: fields.outputKey,
    });
    const template = fields.entityExtractionTemplate ?? summaryPromptTemplate;
    if (!template.includes("{schema}"))
      throw new Error(
        `CustomChatMemory: entityExtractionTemplate must include {schema}`,
      );
    if (!template.includes("{summary}"))
      throw new Error(
        `CustomChatMemory: entityExtractionTemplate must include {summary}`,
      );
    if (!template.includes("{new_lines}"))
      throw new Error(
        `CustomChatMemory: entityExtractionTemplate must include {new_lines}`,
      );
    this.schema = fields.schema;
    this.entityStore = fields.entityStore;
    this.aiPrefix = fields.aiPrefix || this.aiPrefix;
    this.humanPrefix = fields.humanPrefix || this.humanPrefix;
    this.k = fields.k || this.k;
    this.llm = fields.llm;
    this.chatHistoryKey = fields.chatHistoryKey || this.chatHistoryKey;
    this.entityExtractionChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(template),
    });
  }

  protected schema: z.AnyZodObject;

  protected entityStore: BaseEntityStore;

  protected llm: BaseLLM;

  protected entityExtractionChain: LLMChain;

  protected chatHistoryKey: string = "chat_history";

  protected aiPrefix: string = "AI";

  protected humanPrefix: string = "Human";

  protected k: number = 3;

  protected entityCache: string[] = [];

  get memoryKeys() {
    return [this.chatHistoryKey, "summary"];
  }

  /**
   * Method to load memory variables and perform entity extraction.
   * @param inputs Input values for the method.
   * @returns Promise resolving to an object containing memory variables.
   */
  async loadMemoryVariables(values: InputValues): Promise<MemoryVariables> {
    const messages = await this.chatHistory.getMessages();
    // if (messages.length < 2) {
    //   return {};
    // }
    const serializedMessages = getBufferString(
      messages.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix,
    );
    const schema = JSON.stringify(zodToJsonSchema(this.schema));
    console.log("schema", schema);
    const stored = await this.entityStore.get("memory");
    const output = await this.entityExtractionChain.predict({
      new_lines: serializedMessages,
      summary: JSON.stringify(
        stored || {
          height: null,
          weight: null,
          ridingStyle: null,
        },
      ),
      input: values.input,
      schema,
    });
    const buffer = this.returnMessages
      ? messages.slice(-this.k * 2)
      : serializedMessages;
    try {
      await this.entityStore.set("memory", JSON.parse(output));
    } catch (error) {
      console.error("CustomMemory set memory error", error, output);
      return {
        [this.chatHistoryKey]: buffer,
        summary: stored,
      };
    }
    return {
      [this.chatHistoryKey]: buffer,
      summary: output,
    };
  }

  async loadValues() {
    return this.entityStore.get("memory");
  }
}
