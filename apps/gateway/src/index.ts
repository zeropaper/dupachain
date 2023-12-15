import { resolve } from "path";
import { config } from "dotenv";

import pino from "pino";

// the dotenv config must be called before importing anything else
// it is supposed to be located at the root of the project
config({ path: resolve(__dirname, "../../../.env") });

const logger =
  process.env.NODE_ENV === "production"
    ? pino()
    : pino({
        transport: {
          target: "pino-pretty",
        },
      });

async function main() {
  const createSetup = await import("./createSetup").then((m) => m.default);
  const { PORT } = await import("./config");
  const setup = await createSetup(logger);
  setup.server.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
}

main();
