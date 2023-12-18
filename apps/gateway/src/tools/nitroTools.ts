import { z } from "zod";
import { DynamicStructuredTool } from "langchain/tools";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";

export async function createNitroSearchTools({
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
    name: "snowboard_characteristics_search",
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
      const metadata = {
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
        .contains("metadata", metadata)
        .limit(5);

      console.info("nitro snowboard search", data, error);

      if (error) {
        return "Error";
      }
      return JSON.stringify(data);
    },
    callbacks,
  });

  return {
    snowboardsSearchTool,
  };
}
