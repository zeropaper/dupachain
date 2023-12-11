import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { Pipeline, pipeline } from "@xenova/transformers";
import { HuggingFaceTransformersEmbeddings } from "langchain/embeddings/hf_transformers";
import { createServiceClient } from "../../createServiceClient";

export function getHftStore({
  filter,
  upsertBatchSize,
}: Omit<
  ConstructorParameters<typeof SupabaseVectorStore>[1],
  "client" | "tableName" | "queryName"
> = {}): SupabaseVectorStore {
  return new SupabaseVectorStore(new HuggingFaceTransformersEmbeddings(), {
    client: createServiceClient(),
    tableName: "hft_embeddings",
    queryName: "match_hft_embeddings",
    filter,
    upsertBatchSize,
  });
}

class HFTEmbeddingPipeline {
  static task = "feature-extrction";
  static model = "Supabase/gte-small";
  static instance: Promise<Pipeline> | null = null;

  static async getInstance(options?: Parameters<Pipeline>[1]) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, options);
    }

    return this.instance;
  }
}

export async function getHftEmbedding(
  input: string,
  options: Parameters<Pipeline>[1] = {},
): Promise<number[]> {
  const generateEmbedding = await HFTEmbeddingPipeline.getInstance(options);

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
