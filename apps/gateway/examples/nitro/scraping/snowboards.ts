import { featuresExtractor } from "./featuresExtractor";
import { productsExtractor } from "./productsExtractor";
import { Extractor } from "./types";

export const pages = [
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
];

export const extractors: Record<string, Extractor> = {
  subheadline: ($) => $(".field--name-field-subheadline").text().trim(),
  matchingProducts: productsExtractor(".field--name-field-matching-products"),
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
};

export const bodySelector = ".node__content .field--name-body";
