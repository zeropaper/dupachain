import { CheerioAPI } from "cheerio";
import { productsExtractor } from "./productsExtractor";
import { featuresExtractor } from "./featuresExtractor";

export const scrapMap: ScrapMap = {
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
export type PageType = "snowboards" | "bindings" | "boots" | "pages" | "team";
export type ScrapMap = Record<
  PageType,
  {
    pages: string[];
    extractors?: Record<string, ($: CheerioAPI) => any>;
    bodySelector: string;
  }
>;
