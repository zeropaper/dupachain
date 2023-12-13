import { config } from "dotenv";
import { vi, describe, it, expect, beforeAll } from "vitest";

import { resolve } from "node:path";

vi.mock("../tools/stores/sb-hft");

config({ path: resolve(__dirname, "../../../../.env") });

const runs = [
  [
    "html",
    "<h1>test</h1><h2>test</h2><h3>test</h3><h4>test</h4><h5>test</h5><h6>test</h6><p>test</p>",
  ],
  [
    "markdown",
    "# test\n## test\n### test\n#### test\n##### test\n###### test\n\ntest",
  ],
] as const;

describe.each(["hft", "openai"] as const)(
  "ingestDocument with %s embeddings",
  (embeddingType) => {
    let ingestDocument: any;
    beforeAll(async () => {
      ingestDocument = await import("./ingestDocument").then(
        (m) => m.ingestDocument,
      );
    });

    it.each(runs)("ingests a %s document", async (format) => {
      await expect(
        ingestDocument({
          reference: "test",
          content: "test",
          metadata: { whatever: "test" },
          format,
          embeddingType,
        }),
      ).resolves.toBeUndefined();
    });
  },
);
