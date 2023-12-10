import { config } from "dotenv";
import {
  afterEach,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import { Server } from "node:http";
import { resolve } from "node:path";
import request from "supertest";
import io from "socket.io-client";

import createSetup from "./app";

config({ path: resolve(__dirname, "../../../.env") });

describe("createSetup", () => {
  it("should return a server", async () => {
    const setup = await createSetup();
    expect(setup).toBeDefined();
    expect(setup).toHaveProperty("server");
    expect(setup).toHaveProperty("server.listen");
    expect(setup).toHaveProperty("app");
  });

  describe("running server", () => {
    let setup: any;
    beforeAll(async () => {
      setup = await createSetup();
    });
    afterAll(() => {
      try {
        setup.server.close();
      } catch (e) {
        console.error(e);
      }
    });

    it("listens on port 3773", async () => {
      expect(setup).toBeDefined();
      setup.server.listen(3773, () => {
        console.log("listening on port 3773");
      });
    });

    it("closes the server", async () => {
      expect(setup).toBeDefined();
      expect(() => setup.server.close()).not.toThrow();
    });
  });
});

describe("app", () => {
  let setup: Awaited<ReturnType<typeof createSetup>>;
  function requestApp() {
    return request(setup.app);
  }
  beforeAll(async () => {
    setup = await createSetup();
  });

  describe("routes", () => {
    describe("404", () => {
      it("serves an error HTML page", async () => {
        const response = await requestApp().get("/does-not-exist");
        expect(response.status).toBe(404);
        expect(response.type).toBe("text/html");
      });
    });

    describe("/", () => {
      it("serves an HTML page", async () => {
        const response = await requestApp().get("/");
        expect(response.status).toBe(200);
        expect(response.type).toBe("text/html");
      });
    });

    describe("/documents", () => {
      it.todo(
        "creates a document with a reference, content, metadata, and format",
      );
      it.todo("does not create a document with an invalid format");
    });

    describe("/messages", () => {
      it.todo("allows users to send messages");
      it.todo("does not accept invalid messages");
    });
  });

  describe("sockets", () => {
    let setup: any;
    beforeAll(async () => {
      setup = await createSetup();
      return new Promise((res) => setup.server.listen(3773, res));
    });
    afterAll(() => {
      try {
        setup.server.close();
      } catch (e) {
        console.error(e);
      }
    });

    it("handles connections", async () => {
      const socket = io("http://localhost:3773");
      expect(
        new Promise((resolve, reject) => {
          socket.on("connect", () => {
            // TODO: we may want to log user connections in the app and look at them
            // for now, to check locally, some messages appear in the console
            resolve(true);
          });
        }),
      ).resolves.toBeTruthy();
    });
  });
});
