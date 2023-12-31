import { Callbacks } from "langchain/callbacks";
import { PersonaSchema } from "@local/schemas";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { EvalMessage } from "./types";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { BaseCache } from "langchain/schema";

/**
 * Represents a template for testing a goal based on a chat.
 * @remarks
 * The template includes placeholders for the chat description, goal description, and the expected answer.
 * The expected answer must be a valid JSON object with the properties "answer" and "reasoning".
 * @example
 * ```
 * Based on the following chat.
 * <<< chat description begin >>>
 * {messages}
 * <<< chat description end >>>
 *
 * Did the AI meet the following goal?
 * <<< goal description begin >>>
 * {goal}
 * <<< goal description end >>>
 *
 * Your answer must be a valid JSON with the following properties:
 * - answer: "yes" or "no"
 * - reasoning: a description of your reasoning, be succinct and clear
 * ```
 */
export const testerTemplate = `Based on the following chat.
<<< chat description begin >>>
{messages}
<<< chat description end >>>

Did the AI met the following goal?
<<< goal description begin >>>
{goal}
<<< goal description end >>>

Your answer must be a valid JSON with the following properties:
- answer: "yes" or "no"
- reasoning: a description of your reasoning, be succint and clear`;

/**
 * Tests the goal of a persona by evaluating the provided messages.
 * @param callbacks - The callbacks object.
 * @param cache - The cache object.
 * @param persona - The persona file schema.
 * @param messages - The array of evaluation messages.
 * @returns A promise that resolves to a boolean indicating whether the goal is achieved.
 */
export async function testGoal({
  callbacks,
  cache,
  persona,
  messages,
}: {
  callbacks?: Callbacks;
  cache?: BaseCache;
  persona: PersonaSchema;
  messages: EvalMessage[];
}): Promise<boolean> {
  if (!persona.goal) {
    return true;
  }
  const promises: Array<(...args: any[]) => Promise<boolean>> = [];
  if (typeof persona.goal === "string") {
    promises.push(async () => {
      const goalTesterLLM = new ChatOpenAI({
        modelName: "gpt-3.5-turbo-1106",
        temperature: 0,
        callbacks,
        cache,
        modelKwargs: {
          // max_tokens: 120,
        },
      });
      const goalTesterPrompt = PromptTemplate.fromTemplate(testerTemplate);
      const goalTesterChain = new LLMChain({
        llm: goalTesterLLM,
        prompt: goalTesterPrompt,
        callbacks,
        // verbose: true,
      });
      return goalTesterChain
        .call(
          {
            messages: messages
              .slice(-2)
              .map(
                ({ content, role }) =>
                  `${role === "user" ? "AI" : "Tester"}: ${content}`,
              )
              .join("\n"),
            goal: persona.goal,
          },
          {
            callbacks,
          },
        )
        .then(({ text }) => {
          const obj = JSON.parse(text);
          return obj.answer === "yes";
        });
    });
  } else {
    const lastMessage = messages.at(-1)?.content ?? "";
    for (const goal of persona.goal) {
      switch (goal.type) {
        case "matches":
          promises.push(async () => {
            const matches = new RegExp(goal.matches, goal.flags);
            return matches.test(lastMessage);
          });
          break;
        case "includes":
          promises.push(async () => {
            return goal.exact
              ? lastMessage.includes(goal.includes)
              : lastMessage.toLowerCase().includes(goal.includes.toLowerCase());
          });
          break;
        case "equals":
          promises.push(async () => {
            return goal.exact
              ? lastMessage === goal.equals
              : lastMessage.toLowerCase() === goal.equals.toLowerCase();
          });
          break;
      }
    }
  }
  const results = await Promise.allSettled(promises.map((p) => p()));
  return results.every(
    (result) => result.status === "fulfilled" && result.value,
  );
}
