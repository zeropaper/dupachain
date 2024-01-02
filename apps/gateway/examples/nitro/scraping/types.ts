import type { CheerioAPI } from "cheerio";
export type Extractor = ($: CheerioAPI) => any;
export interface ScrapSetup {
  pages: string[];
  extractors?: Record<string, Extractor>;
  bodySelector: string;
}
export type PageType = "snowboards" | "bindings" | "boots" | "pages" | "team";
export type ScrapMap = Record<PageType, ScrapSetup>;
