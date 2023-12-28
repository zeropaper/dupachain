import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";

export async function loadTools({ callbacks }: { callbacks?: Callbacks }) {
  const serviceClient = await import("../../../src/createServiceClient").then(
    ({ createServiceClient }) => createServiceClient(),
  );
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
    snowboardsBySizes: Record<string, string[]>;
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
        sizes: string[];
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
        .select("reference, metadata")
        .contains("metadata", filter)
        .limit(3);

      if (error) {
        return "Error";
      }
      return JSON.stringify(
        data.map(({ reference, metadata }) => ({
          reference,
          // @ts-expect-error - supabase Json
          sizes: Object.keys(metadata.specs),
        })),
      ).replaceAll("https://nitrosnowboards.com", "");
    },
    callbacks,
  });

  function matchSize(
    boardSizes: string[],
    min?: number,
    max?: number,
    wide?: boolean,
  ) {
    for (const boardSize of boardSizes) {
      const [cmString, wideString] = boardSize.split(" ");
      const cm = parseInt(cmString);
      if (wide && wideString !== "wide") {
        return false;
      }
      if (min && cm < min) {
        return false;
      }
      if (max && cm > max) {
        return false;
      }
    }
    return true;
  }
  const snowboardsByFlex = new DynamicStructuredTool({
    name: "list_snowboards_by_flex",
    description: "List of snowboards by flex",
    schema: z.object({
      order: z.enum(["asc", "desc"]).default("asc"),
      size: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional(),
      wide: z.boolean().optional(),
      min: z.number().min(1).max(9).describe("flex minimum value"),
      max: z.number().min(1).max(9).describe("flex max value"),
    }),
    func: async ({ order, size, max, min, wide }) => {
      const subset: Record<
        string,
        {
          reference: string;
          fit: {
            Park: string;
            "All Mountain": string;
            Backcountry: string;
          };
          sizes: string[];
        }[]
      > = {};
      for (const [
        reference,
        {
          fit: { Flex, ...fit },
          sizes,
        },
      ] of Object.entries(snowboardsData.characteristics)) {
        const flex = parseInt(Flex);
        if (min && flex < min) {
          continue;
        }
        if (max && flex > max) {
          continue;
        }
        if (!matchSize(sizes, size?.min, size?.max, wide)) {
          continue;
        }
        subset[Flex] = subset[Flex] || [];
        subset[Flex].push({
          reference,
          fit: fit as any,
          sizes,
        });
      }
      const sorted = Object.entries(subset)
        .reduce(
          (acc, [flexString, references]) => {
            const flex = parseInt(flexString);
            acc.push({
              flex,
              references,
            });
            return acc;
          },
          [] as { flex: number; references: any[] }[],
        )
        .sort((a, b) => {
          if (order === "asc") {
            return a.flex - b.flex;
          }
          return b.flex - a.flex;
        });
      return JSON.stringify(sorted).replaceAll(
        "https://nitrosnowboards.com",
        "",
      );
    },
    callbacks,
  });

  const snowboardsByRidingStyle = new DynamicStructuredTool({
    name: "list_snowboards_by_riding_style",
    description: "List of snowboards by riding style",
    schema: z.object({
      style: z.enum(["All Mountain", "Backcountry", "Park"]),
      order: z.enum(["asc", "desc"]).default("desc"),
      size: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
        .optional(),
      wide: z.boolean().optional().describe("look for wide boards"),
    }),
    func: async ({ style, order, size, wide }) => {
      const subset: Record<
        string,
        {
          reference: string;
          value: number | string;
          fit: {
            Flex: string;
            Park: string;
            "All Mountain": string;
            Backcountry: string;
          };
          sizes: string[];
        }[]
      > = {};
      for (const [reference, { fit, sizes }] of Object.entries(
        snowboardsData.characteristics,
      )) {
        const raw = fit[style];
        const value = parseInt(raw);
        if (!matchSize(sizes, size?.min, size?.max, wide)) {
          continue;
        }
        subset[raw] = subset[raw] || [];
        subset[raw].push({
          reference,
          value,
          fit: fit as any,
          sizes,
        });
      }
      const sorted = Object.entries(subset)
        .reduce(
          (acc, [raw, references]) => {
            const value = parseInt(raw);
            acc.push({
              value,
              references,
            });
            return acc;
          },
          [] as { value: number; references: any[] }[],
        )
        .sort((a, b) => {
          if (order === "asc") {
            return a.value - b.value;
          }
          return b.value - a.value;
        });
      return JSON.stringify(sorted).replaceAll(
        "https://nitrosnowboards.com",
        "",
      );
    },
    callbacks,
  });

  const snowboardsBySizes = new DynamicStructuredTool({
    name: "list_snowboards_by_sizes",
    description: "List of snowboards by sizes",
    schema: z.object({
      min: z.number().optional().describe("snowboard minimum size in cm"),
      max: z.number().optional().describe("snowboard maximum size in cm"),
    }),
    func: async ({ min, max }) => {
      const filtered: Record<string, string[]> = {};
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

  const bootsByCharacter = new DynamicStructuredTool({
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

  const bindingsByCharacter = new DynamicStructuredTool({
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
    snowboardsByFlex,
    snowboardsByRidingStyle,
    snowboardsBySizes,

    bootsByCharacter,
    bindingsByCharacter,
  };
}
