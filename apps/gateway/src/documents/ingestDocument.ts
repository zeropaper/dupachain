import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Json } from "../types";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { getHftStore, getOpenAIStore } from "../tools/stores";
import { createServiceClient } from "../createServiceClient";

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
    embeddingType = "hft",
  } = options;

  const supabase = createServiceClient();

  const { error } = await supabase.from("documents").upsert(
    {
      reference,
      content,
      metadata,
      format,
    },
    {
      onConflict: "reference",
    },
  );

  if (error) {
    throw new Error(`Error upserting document: ${error.message}`);
  }

  let store: SupabaseVectorStore;
  let splitter: RecursiveCharacterTextSplitter;

  switch (embeddingType) {
    case "openai":
      await supabase.rpc("delete_openai_embeddings", { reference });
      store = getOpenAIStore();
      splitter = RecursiveCharacterTextSplitter.fromLanguage(format, {
        chunkSize: 1024,
        chunkOverlap: 60,
      });
      break;
    case "hft":
      await supabase.rpc("delete_hft_embeddings", { reference });
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

  // not awaiting on purpose
  store.addDocuments(splitDocuments);
}
