import { CheerioAPI } from "cheerio";
import { website } from "./scrap-nitro";

export const productsExtractor = (selector: string) => ($: CheerioAPI) => {
  const products: Record<string, string> = {};
  $(`${selector} article h2 a`).each((_, el) => {
    const $link = $(el);
    const key = $link.attr("href")!.trim();
    const value = $link.text()!.trim();
    products[`${website}${key}`] = value;
  });
  return products;
};
