import fs from "node:fs/promises";
import express from "express";
import { basename, resolve } from "node:path";
import { glob } from "glob";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 5172;
const base = process.env.BASE || "/";
const evalsOutput =
  process.env.EVALS_OUTPUT || "../gateway/examples/nitro/evals-output";

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile("./dist/client/index.html", "utf-8")
  : "";
const ssrManifest = isProduction
  ? await fs.readFile("./dist/client/.vite/ssr-manifest.json", "utf-8")
  : undefined;

// Create http server
const app = express();

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    base,
  });
  app.use(vite.middlewares);
} else {
  const compression = (await import("compression")).default;
  const sirv = (await import("sirv")).default;
  app.use(compression());
  app.use(base, sirv("./dist/client", { extensions: [] }));
}

async function getEvals() {
  const files = await glob(resolve(process.cwd(), evalsOutput, "*.json"));
  const info = await Promise.all(
    files.map(async (file) => {
      const id = basename(file, ".json");
      const json = JSON.parse(await fs.readFile(file, "utf-8"));
      return {
        id,
        summary: {
          runners: json?.setup?.runners?.length,
          prompts: json?.setup?.prompts?.length,
          personas: json?.setup?.personas?.length,
        },
      };
    }),
  );
  return info;
}

app.get("/api/evals", async (req, res, next) => {
  try {
    const files = await glob(resolve(process.cwd(), evalsOutput, "*.json"));
    res.send(JSON.stringify(await getEvals()));
  } catch (e) {
    next(e);
  }
});

app.get("/api/evals/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = await fs.readFile(
      resolve(process.cwd(), evalsOutput, `${id}.json`),
      "utf-8",
    );
    res.send(file);
  } catch (e) {
    next(e);
  }
});

// Serve HTML
app.use("*", async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, "");

    let template;
    let render;
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile("./index.html", "utf-8");
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/src/entry-server.ts")).render;
    } else {
      template = templateHtml;
      render = (await import("./dist/server/entry-server.js")).render;
    }

    const rendered = await render(url, ssrManifest);

    const html = template
      .replace(`<!--app-head-->`, rendered.head ?? "")
      .replace(`<!--app-html-->`, rendered.html ?? "");

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite?.ssrFixStacktrace(e);
    console.log(e.stack);
    res.status(500).end(e.stack);
  }
});

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
