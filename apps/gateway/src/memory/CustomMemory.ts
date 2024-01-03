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

export const summaryPromptTemplate = `You are an AI assistant reading the transcript of a conversation between an AI and a human. You extract the information that can be used to find the right size for a snowboard and return it as a valid JSON object. Your answer only includes the JSON object, nothing else.

EXAMPLE
Current summary:
{{ "height": null, "weight": null, "ridingStyle": null }}

New lines of conversation:
AI: In order to find the right size for your snowboard, I need to know your height and weight.
Human: I'm 1.8m tall for about 80kg.

Reasoning:
The height and the weight are given by the human but the riding style is not.

New summary:
{{ "height": "1.8m", "weight": "80kg", "ridingStyle": null }}
END OF EXAMPLE

EXAMPLE
Current summary:
{{ "height": null, "weight": null, "ridingStyle": null }}

New lines of conversation:
AI: Do you have a prefered riding style?
Human: I do mostly park.

Reasoning:
The riding style is given by the human. The height and the weight are not and therefore are not updated.

New summary:
{{ "height": "1.8m", "weight": "80kg", "ridingStyle": "park" }}
END OF EXAMPLE

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
}

export class CustomChatMemory extends BaseChatMemory {
  constructor(fields: CustomMemoryOptions) {
    super({
      chatHistory: fields.chatHistory,
      returnMessages: fields.returnMessages ?? false,
      inputKey: fields.inputKey,
      outputKey: fields.outputKey,
    });
    this.entityStore = fields.entityStore;
    this.aiPrefix = fields.aiPrefix || this.aiPrefix;
    this.humanPrefix = fields.humanPrefix || this.humanPrefix;
    this.k = fields.k || this.k;
    this.llm = fields.llm;
    this.chatHistoryKey = fields.chatHistoryKey || this.chatHistoryKey;
    this.entityExtractionChain = new LLMChain({
      llm: this.llm,
      prompt: PromptTemplate.fromTemplate(
        fields.entityExtractionTemplate ?? summaryPromptTemplate,
      ),
    });
  }

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
    if (messages.length < 2) {
      return {};
    }
    const serializedMessages = getBufferString(
      messages.slice(-this.k * 2),
      this.humanPrefix,
      this.aiPrefix,
    );
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
    });
    const buffer = this.returnMessages
      ? messages.slice(-this.k * 2)
      : serializedMessages;
    await this.entityStore.set("memory", JSON.parse(output));
    return {
      [this.chatHistoryKey]: buffer,
      summary: output,
    };
  }

  async loadValues() {
    return this.entityStore.get("memory");
  }
}
