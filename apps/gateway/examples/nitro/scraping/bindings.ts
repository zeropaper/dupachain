import { featuresExtractor } from "./featuresExtractor";
import { Extractor } from "./types";

export const pages = [
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
];

export const extractors: Record<string, Extractor> = {
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
};

export const bodySelector = ".node__content .field--name-body";
