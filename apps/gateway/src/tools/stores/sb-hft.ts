import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { Pipeline, pipeline } from "@xenova/transformers";
import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers";
import { createServiceClient } from "../../createServiceClient";

export async function getHftStore({
  filter,
  upsertBatchSize,
}: Omit<
  ConstructorParameters<typeof SupabaseVectorStore>[1],
  "client" | "tableName" | "queryName"
> = {}): Promise<SupabaseVectorStore> {
  return new SupabaseVectorStore(new HuggingFaceTransformersEmbeddings(), {
    client: await createServiceClient(),
    tableName: "hft_embeddings",
    queryName: "match_hft_embeddings",
    filter,
    upsertBatchSize,
  });
}

export async function getHftEmbedding(
  input: string,
  options: Parameters<Pipeline>[1] = {},
): Promise<number[]> {
  const generateEmbedding = await pipeline(
    "feature-extraction",
    // https://huggingface.co/Supabase/gte-small, for german maybe: "dbmdz/bert-base-german-cased"
    "Supabase/gte-small",
    options,
  );

  // Generate a vector using Transformers.js
  const output = await generateEmbedding(input, {
    pooling: "mean",
    normalize: true,
  });

  // Extract the embedding output
  return Array.from(output.data);
}

export async function queryHftEmbeddings(
  input: string,
  language = "en",
  count = 25,
) {
  const query_embedding = await getHftEmbedding(input);
  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.rpc("match_hft_embeddings", {
    // filter: `{"language":"${language}"}`,
    match_count: count,
    // match_threshold: threshold,
    // @ts-expect-error - the generated types are wrong
    query_embedding,
  });

  if (error) {
    throw new Error(
      `Error querying HuggingFace Transformers with Supabase/gte-small embeddings: ${error.message}`,
    );
  }

  return data;
}
