import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { zodToJsonSchema } from "zod-to-json-schema";

config({ path: resolve(__dirname, "../../../../../.env") });

import { loadTools } from "./nitroTools";
import { AgentExecutor } from "langchain/agents";

describe("createNitroTools", () => {
  let tools: Record<string, AgentExecutor["tools"][number]>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    const createServiceClient = await import(
      "../../../src/createServiceClient"
    ).then((m) => m.createServiceClient);
    serviceClient = createServiceClient();
  });

  it("creates a set of tools", async () => {
    const load = async () => {
      tools = await loadTools({ client: serviceClient });
    };
    await expect(load()).resolves.toBeUndefined();
    expect(tools).toHaveProperty("snowboardsSearchTool");
    expect(tools).toHaveProperty("snowboardsSearchTool.call");
    expect(tools).toHaveProperty("snowboardsByRidingStyle");
    expect(tools).toHaveProperty("snowboardsByRidingStyle.call");
    expect(tools).toHaveProperty("snowboardsBySizes");
    expect(tools).toHaveProperty("snowboardsBySizes.call");
    expect(tools).toHaveProperty("bindingsByCharacter");
    expect(tools).toHaveProperty("bindingsByCharacter.call");
    expect(tools).toHaveProperty("bootsByCharacter");
    expect(tools).toHaveProperty("bootsByCharacter.call");
  });

  describe.skip("snowboardsSearchTool", () => {
    it("searches for snowboards", async () => {
      const { snowboardsSearchTool } = tools;
      const schema = zodToJsonSchema(snowboardsSearchTool.schema);
      expect(schema).toHaveProperty("properties");
      expect(schema).toHaveProperty("properties.Flex");
      expect(schema).toHaveProperty("properties.Shape");
      expect(schema).toHaveProperty("properties.Width");
      expect(schema).toHaveProperty("properties.Camber");
      expect(schema).toHaveProperty("properties.Sidecut");
      expect(schema).toHaveProperty("properties.size");
      expect(schema).toHaveProperty("properties.size.type", "object");
      expect(schema).toHaveProperty(
        "properties.size.properties.min.type",
        "number",
      );
      expect(schema).toHaveProperty(
        "properties.size.properties.max.type",
        "number",
      );
      await expect(
        snowboardsSearchTool.invoke({
          Sidecut: "Radial",
        }),
      ).resolves.toBeDefined();
    });
  });

  describe("snowboardsByFley", async () => {
    it("lists all the boards by flex order asc by default", async () => {
      const { snowboardsByFley } = tools;
      const result = JSON.parse(
        await snowboardsByFley.invoke({
          min: 1,
          max: 9,
          size: {
            min: 153,
            max: 159,
          },
          wide: true,
        }),
      );
      expect(result).toHaveProperty("0.flex", 7);
      expect(result).toHaveProperty(
        "0.references.0.reference",
        "/en/23-24/snowboards/pow",
      );
      expect(result).toHaveProperty("1.flex", 8);
      expect(result).toHaveProperty(
        "1.references.0.reference",
        "/en/23-24/snowboards/basher",
      );
      expect(result.map(({ flex }) => flex)).toStrictEqual([7, 8]);
    });

    it("lists all the boards by flex order desc", async () => {
      const { snowboardsByFley } = tools;
      const result = JSON.parse(
        await snowboardsByFley.invoke({
          order: "desc",
          min: 1,
          max: 9,
          size: {
            min: 153,
            max: 159,
          },
          wide: true,
        }),
      );
      expect(result).toHaveProperty("0.flex", 8);
      expect(result).toHaveProperty(
        "0.references.0.reference",
        "/en/23-24/snowboards/basher",
      );
      expect(result).toHaveProperty("1.flex", 7);
      expect(result).toHaveProperty(
        "1.references.0.reference",
        "/en/23-24/snowboards/pow",
      );
      expect(result.map(({ flex }) => flex)).toStrictEqual([8, 7]);
    });
  });

  describe("snowboardsByRidingStyle", async () => {
    it("lists all the boards by riding style", async () => {
      const { snowboardsByRidingStyle } = tools;
      const result = JSON.parse(
        await snowboardsByRidingStyle.invoke({
          style: "Park",
          size: {
            min: 153,
            max: 159,
          },
          // wide: true,
        }),
      );
      expect(result).toHaveProperty(
        "0.references.0.reference",
        "/en/23-24/snowboards/basher",
      );
      expect(result).toHaveProperty(
        "3.references.0.reference",
        "/en/23-24/snowboards/pow",
      );
    });
  });

  describe("snowboardsBySizes", async () => {
    it("lists all the boards by size", async () => {
      const { snowboardsBySizes } = tools;
      let result = JSON.parse(await snowboardsBySizes.invoke({}));
      expect(result).toHaveProperty("86");
      expect(result).toHaveProperty("166 wide");
      result = JSON.parse(
        await snowboardsBySizes.invoke({
          min: 153,
          max: 157,
        }),
      );
      expect(result).not.toHaveProperty("86");
      expect(result).toHaveProperty("153");
      expect(result).toHaveProperty("157");
      expect(result).toHaveProperty("157 mid-wide");
    });
  });
});
