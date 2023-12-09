export * as prompts from "@inquirer/prompts";
export * as progress from "cli-progress";
export { default as chalk } from "chalk";
export { default as makeDebug } from "debug";

export { CancelablePromise } from "@inquirer/type";

import chalk from "chalk";

// overrides the default console.info method to add a stack trace
export function patchConsoleInfo() {
  const originalInfo = console.info;
  const cwd = process.cwd();
  console.info = (...args: any[]) => {
    const error = new Error();
    const parts = (error.stack || "")
      .replaceAll(cwd, ".")
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !line.includes("patchConsoleInfo") &&
          !line.includes("node_modules") &&
          !line.includes("node:internal"),
      );
    const stack = `\n${parts.join("\n")}`;
    originalInfo(...args, chalk.grey(stack));
  };
}

const colors = [
  "grey",
  "black",
  "blackBright",
  "red",
  "redBright",
  "green",
  "greenBright",
  "yellow",
  "yellowBright",
  "blue",
  "blueBright",
  "magenta",
  "magentaBright",
  "cyan",
  "cyanBright",
  "white",
  "whiteBright",
] as const;
type Logs = Record<
  (typeof colors)[number],
  (str: string, ...rest: any[]) => void
>;
export const log = colors.reduce((obj: Logs, color) => {
  obj[color] = (str: string, ...args: any[]) =>
    console.log(chalk[color](str), ...args);
  return obj;
}, {} as Logs);
