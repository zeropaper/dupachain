import { describe, it, expect, beforeAll, vi } from "vitest";
import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "node:path";

import { CustomChatMemory } from "./CustomChatMemory";
import { BaseEntityStore } from "langchain/schema";
import {
  Serialized,
  SerializedNotImplemented,
} from "langchain/load/serializable";
import { OpenAI } from "langchain/llms/openai";
import { BaseLLM } from "langchain/llms/base";

beforeAll(async () => {
  config({ path: resolve(__dirname, "../../../../.env") });
});

class EntityStoreMock implements BaseEntityStore {
  protected entities: Record<string, any> = {};
  clear = vi.fn(async () => {
    this.entities = {};
  });
  delete = vi.fn(async (key: string) => {
    this.entities[key] = undefined;
  });
  exists = vi.fn(async (key: string) => {
    return this.entities[key] !== undefined;
  });
  get = vi.fn(async (key: string, defaultValue?: string) => {
    console.log("EntityStoreMock get", key, defaultValue);
    return this.entities[key] ?? defaultValue;
  });
  set = vi.fn(async (key: string, value?: string) => {
    console.log("EntityStoreMock set", key, value);
    this.entities[key] = value;
  });
  get lc_aliases(): { [key: string]: string } | undefined {
    return undefined;
  }
  get lc_attributes() {
    return undefined;
  }
  get lc_id(): string[] {
    return ["mock", "entity", "store"];
  }
  lc_kwargs = {};
  lc_serializable = false;
  lc_namespace: string[] = [];
  get lc_secrets(): { [key: string]: string } | undefined {
    return undefined;
  }
  toJSON(): Serialized {
    return {
      id: this.lc_id,
      lc: 1,
      type: "not_implemented",
    };
  }
  toJSONNotImplemented(): SerializedNotImplemented {
    return {
      id: this.lc_id,
      lc: 1,
      type: "not_implemented",
    };
  }
}

const entityStore = new EntityStoreMock();

describe("CustomChatMemory", () => {
  let llm: BaseLLM;
  let instance: CustomChatMemory;

  beforeAll(async () => {
    llm = new OpenAI({
      modelName: "gpt-3.5-turbo-instruct",
      temperature: 0,
    });
  });

  it("instanciates", () => {
    expect(() => {
      instance = new CustomChatMemory({
        entityStore,
        schema: z.object({
          ridingStyle: z.string(),
          height: z.string(),
          weight: z.string(),
        }),
        llm,
      });
    }).not.toThrow();
  });

  it("executes entity extraction", async () => {
    const promise = instance.loadMemoryVariables({
      messages: [
        {
          id: "1",
          role: "assistant",
          content: "How tall are you?",
        },
        {
          id: "2",
          role: "user",
          content: "I am 5'10\"",
        },
      ],
    });
    await expect(promise).resolves.toMatchObject(
      expect.objectContaining({
        chat_history: expect.any(String),
        summary: expect.any(String),
      }),
    );
    const result = await promise;
    console.info("result", result);
    const json = JSON.parse(result.summary);
    console.info("json", json);
  });

  it("loads memory variables", async () => {
    await expect(
      instance.loadMemoryVariables({
        messages: [],
        prompt: "",
      }),
    ).resolves.toMatchObject(
      expect.objectContaining({
        chat_history: expect.any(String),
        summary: expect.any(String),
      }),
    );
  });
});
