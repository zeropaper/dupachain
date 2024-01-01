import { resolve } from "node:path";
import { FileSystemCache } from "@local/cache";
import { load } from "cheerio";
import { scrapMap } from "./scrapMap";
import { ScrapMap, PageType } from "./scrapMap";

// Disclaimer: this is a quick and dirty script to scrape the website,
// however, the author of the website made it very pleasant to scrape
// by using semantic html and not using a lot of javascript,
// it's almost a database.
export const website = "https://nitrosnowboards.com";

// consider using the sitemap instead:
// https://nitrosnowboards.com/sitemaps/default/sitemap.xml?page=1
// https://nitrosnowboards.com/sitemaps/default/sitemap.xml?page=2

async function scrapePage(
  url: string,
  type: string,
  config: ScrapMap[PageType],
) {
  const html = await fetch(`${website}${url}`).then((res) => res.text());
  const $ = load(html);

  const title = $("title").text().split("|").at(0)?.trim();

  const extracted = Object.keys(config.extractors || {}).reduce(
    (acc, key) => {
      acc[key] = config.extractors?.[key]($);
      return acc;
    },
    {} as Record<string, any>,
  );

  const body = $(config.bodySelector);
  const before = body.html()?.length || 0;

  console.info("before cleaning", before);
  body.find("img, picture, script, link, iframe").remove();
  body.find("[class]").removeAttr("class");
  body.find("[id]").removeAttr("id");
  body.find("[style]").removeAttr("style");
  body.find("form").remove();

  let empty = body.find(":empty");
  while (empty.length) {
    console.info("found empty", empty.length);
    empty.remove();
    empty = body.find(":empty");
  }
  const after = body.html()?.length || 0;
  console.info("after cleaning", after, before - after, (before * 100) / after);

  const document: Record<string, any> = {
    format: "html",
    reference: `${website}${url}`,
    content: body.html()?.trim(),
    metadata: {
      ...extracted,
      title,
      language: "en",
      type,
    },
  };

  if (["snowboards", "bindings", "boots"].includes(type)) {
    document.metadata.type = "product";
    document.metadata.productType = type;
  } else if (type === "team") {
    document.metadata.type = "person";
    document.metadata.personType = "team";
  }

  return document;
}

type Root = Root2[];

interface Root2 {
  status: string;
  value: Value[];
}

interface Value {
  status: string;
  value: DocumentBase;
}

interface DocumentBase {
  format: string;
  reference: string;
  content: string;
  // metadata: Metadata
  metadata: {
    title: string;
    language: string;
    type: string;
    productType?: string;
    [key: string]: any;
  };
}

async function postDocument(document: DocumentBase) {
  return fetch("http://localhost:3030/api/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(document),
  });
}

async function processScrap(documents: DocumentBase[]) {
  await Promise.allSettled(documents.map(postDocument));

  const productTypes = ["snowboards", "bindings", "boots"];
  for (const productType of productTypes) {
    const products = documents.filter(
      (document) => document?.metadata?.productType === productType,
    );
    const link = (product: DocumentBase) =>
      `[${product.metadata.title}](${product.reference})`;

    let content = "";
    switch (productType) {
      case "snowboards":
        const features = new Set<{
          id: string;
          title: string;
          description: string;
        }>();
        const characteristicValues: Record<string, Set<string>> = {};
        const snowboardsBySizes: Record<string, string[]> = {};
        const snowboardsByFits: Record<string, Record<string, string[]>> = {};
        const characteristics = products.reduce(
          (obj, p) => {
            for (const size of Object.keys(p.metadata.specs)) {
              snowboardsBySizes[size] = snowboardsBySizes[size] || [];
              snowboardsBySizes[size].push(p.reference);
            }
            Object.entries(p.metadata.fit as Record<string, string>).forEach(
              ([fit, value]) => {
                if (!snowboardsByFits[fit]) {
                  snowboardsByFits[fit] = {};
                }
                snowboardsByFits[fit][value] =
                  snowboardsByFits[fit][value] || [];
                snowboardsByFits[fit][value].push(p.reference);
              },
            );
            obj[p.reference] = {
              characteristics: p.metadata.characteristics,
              fit: p.metadata.fit,
              sizes: Object.keys(p.metadata.specs),
              features: p.metadata.features.map((feature: any) => feature.id),
            };
            p.metadata.features.forEach((feature: any) => {
              features.add(feature);
            });
            Object.entries(p.metadata.characteristics).forEach(
              ([key, value]) => {
                characteristicValues[key] =
                  characteristicValues[key] || new Set();
                characteristicValues[key].add(value as string);
              },
            );
            return obj;
          },
          {} as Record<string, any>,
        );

        await postDocument({
          content: "data",
          format: "markdown",
          reference: `snowboards data en`,
          metadata: {
            title: "snowboards data",
            language: "en",
            type: "data",

            characteristicValues: Object.entries(characteristicValues).reduce(
              (obj, [key, value]) => {
                obj[key] = Array.from(value);
                return obj;
              },
              {} as any,
            ),
            features: Array.from(features),
            characteristics,
            snowboardsBySizes,
            snowboardsByFits,
          },
        });
        content = `# Snowboards
${products
  .map(
    (product) => `## ${link(product)}

**${product.metadata.subheadline}**

${product.content}`,
  )
  .join("\n\n")}`;
        break;

      case "bindings":
        const bindingsByCharacter: Record<
          string,
          Record<string, string[]>
        > = {};
        for (const product of products) {
          const { character } = product.metadata;
          for (const key of Object.keys(character)) {
            bindingsByCharacter[key] = bindingsByCharacter[key] || {};
            bindingsByCharacter[key][character[key]] =
              bindingsByCharacter[key][character[key]] || [];
            bindingsByCharacter[key][character[key]].push(product.reference);
          }
        }
        await postDocument({
          content: "data",
          format: "markdown",
          reference: `bindings data en`,
          metadata: {
            title: "bindings data",
            language: "en",
            type: "data",

            bindingsByCharacter,
          },
        });
        content = `# Bindings

${products
  .map(
    (product) => `## ${link(product)}

**${product.metadata.subheadline}**

${product.content}`,
  )
  .join("\n\n")}`;
        break;

      case "boots":
        const bootsByCharacter: Record<string, Record<string, string[]>> = {};
        for (const product of products) {
          const { character } = product.metadata;
          for (const key of Object.keys(character)) {
            bootsByCharacter[key] = bootsByCharacter[key] || {};
            bootsByCharacter[key][character[key]] =
              bootsByCharacter[key][character[key]] || [];
            bootsByCharacter[key][character[key]].push(product.reference);
          }
        }
        await postDocument({
          content: "data",
          format: "markdown",
          reference: `boots data en`,
          metadata: {
            title: "boots data",
            language: "en",
            type: "data",

            bootsByCharacter,
          },
        });
        content = `# Boots\n\n${products
          .map(
            (product) => `## ${link(product)}
        
**${product.metadata.subheadline}**
        
${product.content}`,
          )
          .join("\n\n")}`;
        break;
    }

    console.log(`posting ${productType} summary`, content.length);
    await postDocument({
      format: "markdown",
      reference: `${productType} summary`,
      content,
      metadata: {
        title: productType,
        language: "en",
        type: "summary",
        productType,
      },
    });
  }
}

const cache = new FileSystemCache<DocumentBase[]>({
  path: resolve(__dirname, ".cache"),
});

async function main() {
  const cached = await cache.get("scrap-nitro");

  if (cached) {
    await processScrap(cached);
    console.log("done");
    return;
  }
  // parallelize a bit
  const promises = (await Promise.allSettled(
    Object.keys(scrapMap)
      // .filter((key) => key === "boots")
      .map((key) =>
        Promise.allSettled(
          scrapMap[key as PageType].pages
            // .slice(0, 1)
            .map((url) => scrapePage(url, key, scrapMap[key as PageType])),
        ),
      ),
  )) as Root;

  const normalized = promises
    .map((page) => page.value)
    .flat()
    .map((page) => page.value);
  await cache.set("scrap-nitro", normalized);
  await processScrap(normalized);
  console.log("done");
}

main();
