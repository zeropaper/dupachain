import "dotenv/config";

import { PORT } from "./config";
import createSetup from "./app";

createSetup().then(({ server }) => {
  server.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
});
