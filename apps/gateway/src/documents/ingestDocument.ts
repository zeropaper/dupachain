import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Json } from "../types";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { getHftStore, getOpenAIStore } from "../tools/stores";

export async function ingestDocument(options: {
  content: string;
  metadata:
    | ((string | number | boolean | { [key: string]: Json } | Json[]) &
        (
          | string
          | number
          | boolean
          | { [key: string]: Json }
          | Json[]
          | undefined
        ))
    | null;
  reference: string;
  format: "html" | "markdown";
  embeddingType?: "openai" | "hft";
}) {
  const {
    format,
    content,
    metadata,
    reference,
    embeddingType = "openai",
  } = options;

  let store: SupabaseVectorStore;
  let splitter: RecursiveCharacterTextSplitter;

  switch (embeddingType) {
    case "openai":
      store = getOpenAIStore();
      splitter = RecursiveCharacterTextSplitter.fromLanguage(format, {
        chunkSize: 1024,
        chunkOverlap: 60,
      });
      break;
    case "hft":
      store = getHftStore();
      splitter = RecursiveCharacterTextSplitter.fromLanguage(format, {
        chunkSize: 256,
        chunkOverlap: 20,
      });
      break;
    default:
      throw new Error(`Unknown embedding type ${embeddingType}`);
  }

  const splitDocuments = await splitter.createDocuments(
    [content],
    [
      {
        ...(metadata as Record<string, any>),
        format,
        reference,
      },
    ],
  );

  return store.addDocuments(splitDocuments);
}
