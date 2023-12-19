import { z } from "zod";
import { DynamicStructuredTool, DynamicTool } from "langchain/tools";
import { OpenAI } from "langchain/llms/openai";
import { Callbacks } from "langchain/callbacks";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@local/supabase-types";
import { parseDate } from "chrono-node";
import { PromptTemplate } from "langchain/prompts";

export async function loadTools({
  callbacks,
}: {
  callbacks?: Callbacks;
  client: SupabaseClient<Database>;
}) {
  const dateParserChronoTool = new DynamicTool({
    name: "dateParser",
    description: "Parse dates from text",
    async func(input, runManager) {
      return JSON.stringify(
        parseDate(input, new Date(), {
          forwardDate: true,
        }),
      );
    },
  });

  const dateParserChronoStructuredTool = new DynamicStructuredTool({
    name: "dateParser",
    description: "Parse dates from text",
    schema: z.object({
      text: z.string().describe("Text to parse dates from"),
    }),
    async func(input, runManager) {
      // const { parseDate } = await import('@local/core/src/chrono-node');
      const { text } = input;
      const results = parseDate(text, new Date(), {
        forwardDate: true,
      });
      console.log("results", results);
      try {
        return JSON.stringify(results, null, 2);
      } catch (err) {
        return "error";
      }
    },
  });

  const today = new Date().toLocaleDateString();
  const promptTemplate =
    PromptTemplate.fromTemplate(`Process the following date input, considering that TODAY is "{today}". The input represents a future date and your response must reflect a date that is in the future. Note that weekdays are not indicative of specific dates.
Your response should be in a VALID JSON object containing:
- reasoning: a concise explanation of how the future date was determined, considering the type of input (specific date, relative date, or date pattern).
- date: the calculated future date, formatted as "Sunday, May 29th, 1453" and verified to be a valid calendar date and in the future relative to 'today' and usually within 1 year.

Input: {input}

Note: If the input is ambiguous or lacks specificity, use the closest future instance of the described date. If the input is a specific future date, ensure it's valid and in the correct format.`);

  const dateParserLLMTool = new DynamicTool({
    name: "dateParser",
    description: "Parse dates from text",
    async func(input, runManager) {
      const model = new OpenAI({
        modelName: "gpt-3.5-turbo-instruct",
        temperature: 0,
        callbacks,
      });
      const result = await model.invoke(
        await promptTemplate.format({
          today,
          input: input,
        }),
        {
          // callbacks: makeCallbacks('dateParserLLMTool'),
        },
      );
      console.info("result", today, result);
      return result;
    },
  });

  const dateParserLLMStructuredTool = new DynamicStructuredTool({
    name: "dateParser",
    description: "Parse dates from text",
    schema: z.object({
      text: z.string().describe("Text to parse dates from"),
    }),
    async func(input, runManager) {
      const { text } = input;
      const model = new OpenAI({
        modelName: "gpt-3.5-turbo-instruct",
        temperature: 0,
        callbacks,
      });
      const result = await model.invoke(
        await promptTemplate.format({
          today,
          input: text,
        }),
        {
          // callbacks: makeCallbacks('dateParserLLMStructuredTool'),
        },
      );
      // only return the string matching the date format
      console.info("result", today, result);
      return result;
    },
  });

  return {
    dateParserChronoTool,
    dateParserChronoStructuredTool,
    dateParserLLMTool,
    dateParserLLMStructuredTool,
  };
}
