import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";

export async function loadTools({
  callbacks,
  client: serviceClient,
}: {
  callbacks?: Callbacks;
  client: SupabaseClient<Database>;
}) {
  async function loadDataFromDocument<T = any>(reference: string) {
    const { data, error } = await serviceClient
      .from("documents")
      .select("reference, metadata, content")
      .eq("reference", reference)
      .single();
    if (error) {
      throw new Error(`Error fetching document: ${error.message}`);
    }
    if (!data) {
      throw new Error(`Document not found: ${reference}`);
    }
    return data.metadata as T;
  }

  const snowboardsData = await loadDataFromDocument<{
    snowboardsByFits: Record<string, Record<string, string[]>>;
    snowboardsBySizes: Record<string, Record<string, string[]>>;
    features: Record<
      string,
      {
        id: number;
        title: string;
        description: string;
      }
    >;
    characteristicValues: Record<string, string[]>;
    characteristics: Record<
      string,
      {
        fit: Record<string, string>;
        characteristics: Record<string, string>;
        features: number[];
      }
    >;
  }>("snowboards data en");
  const { characteristicValues } = snowboardsData;
  const bindingsData = await loadDataFromDocument<{
    bindingsByCharacter: Record<string, Record<string, string[]>>;
  }>("bindings data en");
  const bootsData = await loadDataFromDocument<{
    bootsByCharacter: Record<string, Record<string, string[]>>;
  }>("boots data en");

  const characteristicsSchema = z.object({
    ...Object.entries(characteristicValues).reduce(
      (acc, [key, values]) => {
        if (!Array.isArray(values)) {
          console.warn(
            "Expected array of values for key",
            key,
            "but got",
            values,
            "instead",
          );
          return acc;
        }
        acc[key as keyof typeof characteristicValues] = z
          .string()
          .optional()
          .describe(`can be one of: ${values.map((v) => `"${v}"`).join(", ")}`);
        return acc;
      },
      {} as Record<
        keyof typeof characteristicValues,
        z.ZodOptional<z.ZodString>
      >,
    ),
  });

  const snowboardsSearchTool = new DynamicStructuredTool({
    name: "search_snowboard_by_characteristics",
    description: "Search the snowboards catalog by characteristics",
    schema: characteristicsSchema.extend({
      size: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional()
        .describe("Size range in cm"),
    }),
    func: async (search) => {
      const filter = {
        characteristics: Object.entries(search).reduce(
          (acc, [key, value]) => {
            if (!value || key === "size") {
              return acc;
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      const { data, error } = await serviceClient
        .from("documents")
        .select("reference, metadata, content")
        .contains("metadata", filter)
        .limit(3);

      if (error) {
        return "Error";
      }
      return JSON.stringify(
        data.map(({ content, reference, metadata }) => ({
          content,
          reference,
          // @ts-expect-error - supabase Json
          sizes: Object.keys(metadata.specs),
        })),
      ).replaceAll("https://nitrosnowboards.com", "");
    },
    callbacks,
  });

  const listSnowboardByFits = new DynamicStructuredTool({
    name: "list_snowboards_by_fits",
    description: "List of snowboards by fits",
    schema: z.object({}),
    func: async () =>
      JSON.stringify(snowboardsData.snowboardsByFits).replaceAll(
        "https://nitrosnowboards.com",
        "",
      ),
    callbacks,
  });

  const listSnowboardBySizes = new DynamicStructuredTool({
    name: "list_snowboards_by_sizes",
    description: "List of snowboards by sizes",
    schema: z.object({
      min: z.number().optional().describe("snowboard minimum size in cm"),
      max: z.number().optional().describe("snowboard maximum size in cm"),
    }),
    func: async ({ min, max }) => {
      const filtered: Record<string, Record<string, string[]>> = {};
      for (const [key, value] of Object.entries(
        snowboardsData.snowboardsBySizes,
      )) {
        if (min && max) {
          if (parseInt(key) >= min && parseInt(key) <= max) {
            filtered[key] = value;
          }
        } else if (min) {
          if (parseInt(key) >= min) {
            filtered[key] = value;
          }
        } else if (max) {
          if (parseInt(key) <= max) {
            filtered[key] = value;
          }
        } else {
          filtered[key] = value;
        }
      }
      return JSON.stringify(filtered).replaceAll(
        "https://nitrosnowboards.com",
        "",
      );
    },
    callbacks,
  });

  const listBootsByCharacter = new DynamicStructuredTool({
    name: "list_boots_by_character",
    description: "List of boots by character",
    schema: z.object({}),
    func: async () =>
      JSON.stringify(bootsData.bootsByCharacter).replaceAll(
        "https://nitrosnowboards.com",
        "",
      ),
    callbacks,
  });

  const listBindingsByCharacter = new DynamicStructuredTool({
    name: "list_bindings_by_character",
    description: "List of bindings by character",
    schema: z.object({}),
    func: async () =>
      JSON.stringify(bindingsData.bindingsByCharacter).replaceAll(
        "https://nitrosnowboards.com",
        "",
      ),
    callbacks,
  });

  return {
    snowboardsSearchTool,
    listSnowboardByFits,
    listSnowboardBySizes,
    listBootsByCharacter,
    listBindingsByCharacter,
  };
}
