import { resolve } from "path";
import { writeFile } from "fs/promises";
import { evalFileSchema } from "../src/index";
import zodToJsonSchema from "zod-to-json-schema";

async function main() {
  const evalFileJSONSchema = zodToJsonSchema(evalFileSchema);

  await writeFile(
    resolve(__dirname, "../eval-json-schema.json"),
    JSON.stringify(evalFileJSONSchema, null, 2),
  );
}

main();
