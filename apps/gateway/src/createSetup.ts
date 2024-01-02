import { createServer } from "http";
import { Server as SocketIOServer, ServerOptions } from "socket.io";
import express from "express";
import helmet from "helmet";
import { type Logger } from "pino";
import pino from "pino";
import pinoHttp from "pino-http";

import { createAnonClient } from "./createAnonClient";
import { createAPIRouter as createAPIRouter } from "./createAPIRouter";
import {
  makeSupabaseEventHandler,
  handleSocketConnection,
} from "./socketHandling";

export default async function createSetup(logger: Logger = pino()): Promise<{
  server: ReturnType<typeof createServer>;
  app: ReturnType<typeof express>;
}> {
  const app = express();
  const server = createServer(app);
  const { PUBLIC_DIR, CORS_ORIGINS, NODE_ENV } = await import("./config");
  const anonClient = await createAnonClient();

  const allowedOrigins = CORS_ORIGINS ? CORS_ORIGINS.split(",") : [];
  const socketServerOptions: Partial<ServerOptions> = CORS_ORIGINS
    ? {
        cors: {
          origin: "*",
        },
        allowRequest: (req, cb) => {
          const origin = req.headers.origin;
          if (!origin) {
            logger.info({
              op: "socket.io allowRequest",
              origin: "no origin",
            });
            // in production, we don't want to allow requests without an origin until we implement some other sort of authentication (headers)
            cb(null, NODE_ENV !== "production");
            return;
          }
          const allowed = allowedOrigins.includes(origin);
          logger.info({ op: "socket.io allowRequest", origin, allowed });
          cb(null, allowed);
        },
      }
    : {};

  const io = new SocketIOServer(server, socketServerOptions);

  // logging - https://www.npmjs.com/package/pino-http#example
  app.use(pinoHttp({ logger }));

  // security - https://helmetjs.github.io/
  app.use(helmet());

  // serve the public directory
  app.get("/", express.static(PUBLIC_DIR));

  const router = createAPIRouter({ logger });

  app.use("/api", router);

  anonClient
    .channel("chat_messages")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
      },
      makeSupabaseEventHandler(),
    )
    .subscribe();

  io.on(
    "connection",
    handleSocketConnection({
      logger,
      client: anonClient,
    }),
  );

  return { app, server };
}
