import "dotenv/config";

import pino from "pino";
import { PORT } from "./config";
import createSetup from "./app";

const logger = pino();

createSetup(logger)
  .then(({ server }) => {
    server.listen(PORT, () => {
      logger.info(`listening on port ${PORT}`);
    });
  })
  .catch((err) => logger.fatal(err));
