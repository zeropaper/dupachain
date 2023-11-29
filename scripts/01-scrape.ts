import { load } from "cheerio";

type ProductType = "snowboards" | "bindings" | "boots";
type ScrapMap = Record<
  ProductType,
  {
    pages: string[];
    selectors: Partial<Record<"body" | "features" | "fit", string>>;
  }
>;

// Disclaimer: this is a quick and dirty script to scrape the website,
// however, the author of the website made it very pleasant to scrape
// by using semantic html and not using a lot of javascript,
// it's almost a database.
const website = "https://nitrosnowboards.com";

const scrapMap: ScrapMap = {
  snowboards: {
    pages: [
      "/en/23-24/snowboards/cannon",
      "/en/23-24/snowboards/slash",
      "/en/23-24/snowboards/banker",
      "/en/23-24/snowboards/basher",
      "/en/23-24/snowboards/dinghy",
      "/en/23-24/snowboards/pow",
      "/en/23-24/snowboards/fintwin",
      "/en/23-24/snowboards/vertical",
      "/en/23-24/snowboards/doppleganger",
      "/en/23-24/snowboards/squash-split",
      "/en/23-24/snowboards/slash-split",
      "/en/23-24/snowboards/team-split",
      "/en/23-24/snowboards/nomad",
      "/en/23-24/snowboards/nitro-x-konvoi-surfer",
      "/en/23-24/snowboards/highlander",
      "/en/23-24/snowboards/pantera",
      "/en/23-24/snowboards/alternator",
      "/en/23-24/snowboards/alternator-x-volcom",
      "/en/23-24/snowboards/santoku",
      "/en/23-24/snowboards/squash",
      "/en/23-24/snowboards/team-pro-marcus-kleveland",
      "/en/23-24/snowboards/team-pro",
      "/en/23-24/snowboards/team",
      "/en/23-24/snowboards/dropout",
      "/en/23-24/snowboards/magnum",
      "/en/23-24/snowboards/smp",
      "/en/23-24/snowboards/cinema",
      "/en/23-24/snowboards/prime-view",
      "/en/23-24/snowboards/prime-raw",
      "/en/23-24/snowboards/beast",
      "/en/23-24/snowboards/t1-x-fff",
      "/en/23-24/snowboards/optisym",
      "/en/23-24/snowboards/cheap-thrills-x-wigglestick",
      "/en/23-24/snowboards/squash-split-wmn",
      "/en/23-24/snowboards/volta",
      "/en/23-24/snowboards/victoria",
      "/en/23-24/snowboards/squash-0",
      "/en/23-24/snowboards/drop",
      "/en/23-24/snowboards/karma",
      "/en/23-24/snowboards/team-pro-wmn",
      "/en/23-24/snowboards/fate",
      "/en/23-24/snowboards/mystique",
      "/en/23-24/snowboards/lectra-brush",
      "/en/23-24/snowboards/lectra",
      "/en/23-24/snowboards/beauty",
      "/en/23-24/snowboards/optisym-0",
      "/en/23-24/snowboards/mercy",
      "/en/23-24/snowboards/miniganger",
      "/en/23-24/snowboards/future-team",
      "/en/23-24/snowboards/arial",
      "/en/23-24/snowboards/mini-thrills-x-wigglestick",
      "/en/23-24/snowboards/ripper-x-volcom",
      "/en/23-24/snowboards/ripper",
      "/en/23-24/snowboards/spirit",
    ],
    selectors: {
      body: ".node__content .field--name-body",
      features: ".node__content .field--name-field-snowboard-features",
      // fit: '#fit-riding-style'
    },
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
    selectors: {
      body: ".node__content .field--name-body",
      features: ".node__content .field--name-field-bindings-features",
      // fit: '#character'
    },
  },
  boots: {
    pages: [
      "/en/23-24/boots/capital-tls",
      "/en/23-24/boots/el-mejor-tls",
      "/en/23-24/boots/select-tls",
      "/en/23-24/boots/select-lace",
      "/en/23-24/boots/darkseid-boa-step",
      "/en/23-24/boots/profile-tls-step",
      "/en/23-24/boots/chase-boa",
      "/en/23-24/boots/skylab-tls",
      "/en/23-24/boots/team-pro-mk-tls",
      "/en/23-24/boots/team-tls",
      "/en/23-24/boots/team-lace",
      "/en/23-24/boots/venture-pro-tls",
      "/en/23-24/boots/venture-pro-lace",
      "/en/23-24/boots/club-boa",
      "/en/23-24/boots/venture-tls",
      "/en/23-24/boots/anthem-tls",
      "/en/23-24/boots/sentinel-tls",
      "/en/23-24/boots/sentinel-boa",
      "/en/23-24/boots/tangent-tls",
      "/en/23-24/boots/tangent-boa",
      "/en/23-24/boots/incline-tls",
      "/en/23-24/boots/bianca-tls",
      "/en/23-24/boots/dynasty-boa-step",
      "/en/23-24/boots/cave-tls-step",
      "/en/23-24/boots/faint-tls",
      "/en/23-24/boots/cypress-boa",
      "/en/23-24/boots/crown-tls",
      "/en/23-24/boots/monarch-tls",
      "/en/23-24/boots/scala-tls",
      "/en/23-24/boots/scala-boa",
      "/en/23-24/boots/flora-tls",
      "/en/23-24/boots/flora-boa",
      "/en/23-24/boots/droid-qls",
      "/en/23-24/boots/droid-boa",
    ],
    selectors: {
      body: ".node__content .field--name-body",
      features: ".node__content .field--name-field-boots-features",
      // fit: '.node__content .field--name-field-boots-fit'
    },
  },
};

async function scrapeProduct(
  url: string,
  selectors: ScrapMap[ProductType]["selectors"],
) {
  const html = await fetch(`${website}${url}`).then((res) => res.text());
  const $ = load(html);
  const body = $(selectors.body).html();
  const features =
    selectors.features &&
    $(selectors.features)
      .find("[data-feature-id]")
      .toArray()
      .map((el) => ({
        id: Number($(el).attr("data-feature-id")),
        title: $(el).text().trim(),
      }));
  const fit = selectors.fit ?? $(selectors.fit).text().trim();
  const document = {
    format: "html",
    reference: url,
    content: body,
    metadata: {
      features,
      language: "en",
      type: "product",
      productType: url.split("/")[3],
    },
  };
  return fetch("http://localhost:3000/documents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(document),
  });
}

async function main() {
  // parallelize a bit
  const promises = Promise.allSettled(
    Object.keys(scrapMap).map((key) =>
      Promise.allSettled(
        scrapMap[key as ProductType].pages
          // .slice(0, 1)
          .map((url) =>
            scrapeProduct(url, scrapMap[key as ProductType].selectors),
          ),
      ),
    ),
  );
  console.log(JSON.stringify(await promises, null, 2));
}

main();
