import { config } from "dotenv";
import { resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { zodToJsonSchema } from "zod-to-json-schema";

config({ path: resolve(__dirname, "../../../../.env") });

import { loadTools } from "./nitroTools";
import { AgentExecutor } from "langchain/agents";

describe("createNitroTools", () => {
  let tools: Record<string, AgentExecutor["tools"][number]>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    const createServiceClient = await import("../../createServiceClient").then(
      (m) => m.createServiceClient,
    );
    serviceClient = createServiceClient();
  });

  it("creates a set of tools", async () => {
    const load = async () => {
      tools = await loadTools({ client: serviceClient });
    };
    await expect(load()).resolves.toBeUndefined();
    expect(tools).toHaveProperty("snowboardsSearchTool");
    expect(tools).toHaveProperty("snowboardsSearchTool.call");
    expect(tools).toHaveProperty("listSnowboardByFits");
    expect(tools).toHaveProperty("listSnowboardByFits.call");
    expect(tools).toHaveProperty("listSnowboardBySizes");
    expect(tools).toHaveProperty("listSnowboardBySizes.call");
    expect(tools).toHaveProperty("listBindingsByCharacter");
    expect(tools).toHaveProperty("listBindingsByCharacter.call");
    expect(tools).toHaveProperty("listBootsByCharacter");
    expect(tools).toHaveProperty("listBootsByCharacter.call");
  });

  describe("snowboardsSearchTool", () => {
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

  describe("listSnowboardByFits", async () => {
    it("lists all the boards by fit", async () => {
      const { listSnowboardByFits } = tools;
      const result = JSON.parse(await listSnowboardByFits.invoke({}));
      expect(result).toHaveProperty("Flex");
      expect(result).toHaveProperty("Park");
      expect(result).toHaveProperty("Backcountry");
      expect(result).toHaveProperty("All Mountain");
    });
  });

  describe("listSnowboardBySizes", async () => {
    it("lists all the boards by size", async () => {
      const { listSnowboardBySizes } = tools;
      let result = JSON.parse(await listSnowboardBySizes.invoke({}));
      expect(result).toHaveProperty("86");
      expect(result).toHaveProperty("166 wide");
      result = JSON.parse(
        await listSnowboardBySizes.invoke({
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

  describe.skip("listBindingsByCharacter", async () => {
    it("lists all the bindings by character", async () => {
      const { listBindingsByCharacter } = tools;
      const result = JSON.parse(await listBindingsByCharacter.invoke({}));
      expect(result).toHaveProperty("Park");
      expect(result).toHaveProperty("Backcountry");
      expect(result).toHaveProperty("All Mountain");
    });
  });
});
