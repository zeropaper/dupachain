import { featuresExtractor } from "./featuresExtractor";
import { productsExtractor } from "./productsExtractor";
import { Extractor } from "./types";

export const pages = [
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
];

export const extractors: Record<string, Extractor> = {
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
  matchingProducts: productsExtractor(".field--name-field-matching-products"),
};

export const bodySelector = ".node__content .field--name-body";
