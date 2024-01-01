import { CheerioAPI } from "cheerio";

export const featuresExtractor = (selector: string) => ($: CheerioAPI) =>
  $(selector)
    .find("[data-feature-id]")
    .toArray()
    .map((el) => {
      const id = Number($(el).attr("data-feature-id"));
      return {
        id,
        title: $(el).text().trim(),
        description: $(`.taxonomy-term-${id} .field--name-description`)
          .text()
          .trim(),
      };
    });
