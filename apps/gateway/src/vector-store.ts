import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createAnonClient } from "./supabase-client";

export function getVectorStore({
  filter,
  upsertBatchSize,
}: Omit<
  ConstructorParameters<typeof SupabaseVectorStore>[1],
  "client" | "tableName" | "queryName"
> = {}): SupabaseVectorStore {
  return new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client: createAnonClient(),
    tableName: "openai_embeddings",
    queryName: "match_openai_embeddings",
    filter,
    upsertBatchSize,
  });
}
