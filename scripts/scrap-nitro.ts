import { CheerioAPI, load } from "cheerio";
import { writeFile, stat, readFile } from "fs/promises";
import { resolve } from "path";

async function fileExists(path: string) {
  try {
    await stat(path);
    return true;
  } catch (e) {
    return false;
  }
}

const cacheFilePath = resolve(__dirname, "cache.json");
async function readCacheFile() {
  return (await fileExists(cacheFilePath))
    ? JSON.parse(await readFile(cacheFilePath, "utf-8"))
    : null;
}
async function writeCacheFile(data: any) {
  return writeFile(cacheFilePath, JSON.stringify(data, null, 2));
}

type PageType = "snowboards" | "bindings" | "boots" | "pages" | "team";
type ScrapMap = Record<
  PageType,
  {
    pages: string[];
    extractors?: Record<string, ($: CheerioAPI) => any>;
    bodySelector: string;
  }
>;

// Disclaimer: this is a quick and dirty script to scrape the website,
// however, the author of the website made it very pleasant to scrape
// by using semantic html and not using a lot of javascript,
// it's almost a database.
const website = "https://nitrosnowboards.com";

// consider using the sitemap instead:
// https://nitrosnowboards.com/sitemaps/default/sitemap.xml?page=1
// https://nitrosnowboards.com/sitemaps/default/sitemap.xml?page=2

const featuresExtractor = (selector: string) => ($: CheerioAPI) =>
  $(selector)
    .find("[data-feature-id]")
    .toArray()
    .map((el) => {
      const id = Number($(el).attr("data-feature-id"));
      return {
        id,
        title: $(el).text().trim(),
        description: $(
          `[about="/en/taxonomy/term/${id}"] .field--name-description`,
        )
          .text()
          .trim(),
      };
    });

const productsExtractor = (selector: string) => ($: CheerioAPI) => {
  const products: Record<string, string> = {};
  $(`${selector} article h2 a`).each((_, el) => {
    const $link = $(el);
    const key = $link.attr("href")!.trim();
    const value = $link.text()!.trim();
    products[`${website}${key}`] = value;
  });
  return products;
};

const scrapMap: ScrapMap = {
  snowboards: {
    pages: [
      "/en/23-24/snowboards/alternator-x-volcom",
      "/en/23-24/snowboards/alternator",
      "/en/23-24/snowboards/arial",
      "/en/23-24/snowboards/banker",
      "/en/23-24/snowboards/basher",
      "/en/23-24/snowboards/beast",
      "/en/23-24/snowboards/beauty",
      "/en/23-24/snowboards/cannon",
      "/en/23-24/snowboards/cheap-thrills-x-wigglestick",
      "/en/23-24/snowboards/cinema",
      "/en/23-24/snowboards/dinghy",
      "/en/23-24/snowboards/doppleganger",
      "/en/23-24/snowboards/drop",
      "/en/23-24/snowboards/dropout",
      "/en/23-24/snowboards/fate",
      "/en/23-24/snowboards/fintwin",
      "/en/23-24/snowboards/future-team",
      "/en/23-24/snowboards/highlander",
      "/en/23-24/snowboards/karma",
      "/en/23-24/snowboards/lectra-brush",
      "/en/23-24/snowboards/lectra",
      "/en/23-24/snowboards/magnum",
      "/en/23-24/snowboards/mercy",
      "/en/23-24/snowboards/mini-thrills-x-wigglestick",
      "/en/23-24/snowboards/miniganger",
      "/en/23-24/snowboards/mystique",
      "/en/23-24/snowboards/nitro-x-konvoi-surfer",
      "/en/23-24/snowboards/nomad",
      "/en/23-24/snowboards/optisym-0",
      "/en/23-24/snowboards/optisym",
      "/en/23-24/snowboards/pantera",
      "/en/23-24/snowboards/pow",
      "/en/23-24/snowboards/prime-raw",
      "/en/23-24/snowboards/prime-view",
      "/en/23-24/snowboards/ripper-x-volcom",
      "/en/23-24/snowboards/ripper",
      "/en/23-24/snowboards/santoku",
      "/en/23-24/snowboards/slash-split",
      "/en/23-24/snowboards/slash",
      "/en/23-24/snowboards/smp",
      "/en/23-24/snowboards/spirit",
      "/en/23-24/snowboards/squash-0",
      "/en/23-24/snowboards/squash-split-wmn",
      "/en/23-24/snowboards/squash-split",
      "/en/23-24/snowboards/squash",
      "/en/23-24/snowboards/t1-x-fff",
      "/en/23-24/snowboards/team-pro-marcus-kleveland",
      "/en/23-24/snowboards/team-pro-wmn",
      "/en/23-24/snowboards/team-pro",
      "/en/23-24/snowboards/team-split",
      "/en/23-24/snowboards/team",
      "/en/23-24/snowboards/vertical",
      "/en/23-24/snowboards/victoria",
      "/en/23-24/snowboards/volta",
    ],
    extractors: {
      subheadline: ($) => $(".field--name-field-subheadline").text().trim(),
      matchingProducts: productsExtractor(
        ".field--name-field-matching-products",
      ),
      features: featuresExtractor(
        ".node__content .field--name-field-snowboard-features",
      ),
      sustainabilityEfforts: featuresExtractor(
        "#product-specs .field--name-field-sustainability-efforts",
      ),
      characteristics: ($) => {
        const characteristics: Record<string, string> = {};
        $(".group-characteristics .field").each((_, el) => {
          const key = $(el).find(".field__label").text().trim();
          const value = $(el).find("div").text().trim();
          characteristics[key] = value;
        });
        return characteristics;
      },
      fit: ($) => {
        const fields = $("#fit-riding-style .field--type-range-integer")
          .toArray()
          .map((el) => $(el).text().trim());
        return fields.reduce(
          (acc, field) => {
            const [key, value] = field.split(/\s{2,}/);
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        );
      },
      specs: ($) => {
        const cells = $(".view-snowboard-specs tr")
          .toArray()
          .map((el) =>
            $(el)
              .find("td, th")
              .toArray()
              .map((el) => $(el).text().trim()),
          );
        const modelNames = cells[0].slice(1);
        const specs = cells.slice(1).reduce(
          (acc, row) => {
            const [name, ...values] = row;
            values.forEach((value, index) => {
              acc[modelNames[index]] = acc[modelNames[index]] || {};
              acc[modelNames[index]][name] = value;
            });
            return acc;
          },
          {} as Record<string, Record<string, string>>,
        );
        return specs;
      },
    },
    bodySelector: ".node__content .field--name-body",
  },
  bindings: {
    pages: [
      "/en/23-24/bindings/vertical-st",
      "/en/23-24/bindings/phantom-plus",
      "/en/23-24/bindings/phantom",
      "/en/23-24/bindings/team-pro",
      "/en/23-24/bindings/team",
      "/en/23-24/bindings/one",
      "/en/23-24/bindings/zero",
      "/en/23-24/bindings/rambler",
      "/en/23-24/bindings/staxx",
      "/en/23-24/bindings/team-pro-wmn",
      "/en/23-24/bindings/poison",
      "/en/23-24/bindings/ivy",
      "/en/23-24/bindings/cosmic",
      "/en/23-24/bindings/rythm",
      "/en/23-24/bindings/charger",
      "/en/23-24/bindings/charger-mini",
      "/en/23-24/bindings/charger-micro",
    ],
    extractors: {
      subheadline: ($) => $(".field--name-field-subheadline").text().trim(),
      features: featuresExtractor(
        ".node__content .field--name-field-bindings-features",
      ),
      character: ($) => {
        const fields = $("#character .field--type-range-integer")
          .toArray()
          .map((el) => $(el).text().trim());
        return fields.reduce(
          (acc, field) => {
            const [key, value] = field.split(/\s{2,}/);
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        );
      },
    },
    bodySelector: ".node__content .field--name-body",
  },
  boots: {
    pages: [
      "/en/23-24/boots/anthem-tls",
      "/en/23-24/boots/bianca-tls",
      "/en/23-24/boots/capital-tls",
      "/en/23-24/boots/cave-tls-step",
      "/en/23-24/boots/chase-boa",
      "/en/23-24/boots/club-boa",
      "/en/23-24/boots/crown-tls",
      "/en/23-24/boots/cypress-boa",
      "/en/23-24/boots/darkseid-boa-step",
      "/en/23-24/boots/droid-boa",
      "/en/23-24/boots/droid-qls",
      "/en/23-24/boots/dynasty-boa-step",
      "/en/23-24/boots/el-mejor-tls",
      "/en/23-24/boots/faint-tls",
      "/en/23-24/boots/flora-boa",
      "/en/23-24/boots/flora-tls",
      "/en/23-24/boots/incline-tls",
      "/en/23-24/boots/monarch-tls",
      "/en/23-24/boots/profile-tls-step",
      "/en/23-24/boots/scala-boa",
      "/en/23-24/boots/scala-tls",
      "/en/23-24/boots/select-lace",
      "/en/23-24/boots/select-tls",
      "/en/23-24/boots/sentinel-boa",
      "/en/23-24/boots/sentinel-tls",
      "/en/23-24/boots/skylab-tls",
      "/en/23-24/boots/tangent-boa",
      "/en/23-24/boots/tangent-tls",
      "/en/23-24/boots/team-lace",
      "/en/23-24/boots/team-pro-mk-tls",
      "/en/23-24/boots/team-tls",
      "/en/23-24/boots/venture-pro-lace",
      "/en/23-24/boots/venture-pro-tls",
      "/en/23-24/boots/venture-tls",
    ],
    extractors: {
      subheadline: ($) => $(".field--name-field-subheadline").text().trim(),
      // TODO: boot sizes in #boot-size-table
      features: featuresExtractor(
        ".node__content .field--name-field-boots-features",
      ),
      character: ($) => {
        const fields = $("#character-sizes .field--type-range-integer")
          .toArray()
          .map((el) => $(el).text().trim());
        return fields.reduce(
          (acc, field) => {
            const [key, value] = field.split(/\s{2,}/);
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        );
      },
      matchingProducts: productsExtractor(
        ".field--name-field-matching-products",
      ),
    },
    bodySelector: ".node__content .field--name-body",
  },
  pages: {
    pages: [
      "/en/splitboarding/explore-your-backyard",
      "/en/snowboards/ultimate-diversity",
      // "/en/23-24/snowboards",
      // "/en/23-24/bindings",
      // "/en/23-24/boots",
      // "/en/team",
    ],
    bodySelector: ".node__content",
  },
  team: {
    pages: [
      "/en/team/alexis-roland",
      "/en/team/andre-hoflich",
      "/en/team/benny-urban",
      "/en/team/brantley-mullins",
      "/en/team/bryan-fox",
      "/en/team/cai-xuetong",
      "/en/team/celia-petrig",
      "/en/team/chae-un-lee",
      "/en/team/christy-prior",
      "/en/team/cool-wakushima",
      "/en/team/davide-boggio",
      "/en/team/dominik-wagner",
      "/en/team/eero-ettala",
      "/en/team/elias-elhardt",
      "/en/team/gabriel-almqvist",
      "/en/team/griffin-siebert",
      "/en/team/hailey-langland",
      "/en/team/hunter-goulet",
      "/en/team/jan-scherrer",
      "/en/team/jared-elston",
      "/en/team/jia-xin",
      "/en/team/jordan-morse",
      "/en/team/laurie-blouin",
      "/en/team/lucas-baume",
      "/en/team/ludvig-billtoft",
      "/en/team/marcus-kleveland",
      "/en/team/markus-keller",
      "/en/team/mateo-massitti",
      "/en/team/max-dai",
      "/en/team/minsik",
      "/en/team/miyabi-onitsuka",
      "/en/team/moritz-boll",
      "/en/team/nils-arvidsson",
      "/en/team/patrick-hofmann",
      "/en/team/sam-taxwood",
      "/en/team/sean-miskiman",
      "/en/team/seth-huot",
      "/en/team/simon-gschaider",
      "/en/team/thomas-feurstein",
      "/en/team/tom-tramnitz",
      "/en/team/torgeir-bergrem",
      "/en/team/vladislav-khadarin",
      "/en/team/yanneck-konda",
      "/en/team/yuto-yamada",
      "/en/team/zenja-potapov",
    ],
    extractors: {
      favorites: productsExtractor(".field--name-field-products"),
    },
    bodySelector: ".node__content",
  },
};

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
/* 
interface Metadata {
  subheadline?: string
  matchingProducts?: Record<string, string>;
  features?: Feature[]
  sustainabilityEfforts?: Feature[]
  characteristics?: Characteristics
  fit?: Fit
  specs?: Record<string, any>;
  title: string
  language: string
  type: string
  productType?: string
  character?: Character
  favorites?: Record<string, string>;
  personType?: string
}

interface Feature {
  id: number
  title: string
  description: string
}

interface Characteristics {
  Shape: string
  Camber: string
  Width: string
  Flex: string
  Sidecut: string
}

interface Fit {
  "All Mountain": string
  Backcountry: string
  Park: string
  Flex: string
}

interface Character {
  Response: string
  Freedom: string
  Comfort: string
}
 */

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
      (document) => document.metadata.productType === productType,
    );
    const link = (product: DocumentBase) =>
      `[${product.metadata.title}](${product.reference})`;

    let content = "";
    switch (productType) {
      case "snowboards":
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

async function main() {
  const cached = await readCacheFile();

  if (cached) {
    await processScrap(cached);
    console.log("done");
    return;
  }
  // parallelize a bit
  const promises = (await Promise.allSettled(
    Object.keys(scrapMap)
      // .filter((key) => key === "snowboards")
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
  await writeCacheFile(normalized);
  await processScrap(normalized);
  console.log("done");
}

main();
