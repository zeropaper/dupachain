import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { createServiceClient } from "../../createServiceClient";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../../config";

export function getOpenAIStore({
  filter,
  upsertBatchSize,
}: Omit<
  ConstructorParameters<typeof SupabaseVectorStore>[1],
  "client" | "tableName" | "queryName"
> = {}): SupabaseVectorStore {
  return new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client: createServiceClient(),
    tableName: "openai_embeddings",
    queryName: "match_openai_embeddings",
    filter,
    upsertBatchSize,
  });
}

export async function getOpenaiEmbedding(input: string): Promise<number[]> {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
  const result = await openai.embeddings.create({
    input,
    model: "text-embedding-ada-002",
  });
  return result.data[0].embedding;
}

export async function queryOpenaiEmbeddings(
  input: string,
  language = "en",
  count = 25,
) {
  // Moderate the content to comply with OpenAI T&C - TODO: consider that user messages are already moderated
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
  const sanitizedQuery = input.trim();
  const moderationResponse = await openai.moderations.create({
    input: sanitizedQuery,
  });

  const [results] = moderationResponse.results;

  if (results.flagged) {
    throw new Error("Flagged content");
  }

  const query_embedding = await getOpenaiEmbedding(input);
  console.log("queryOpenaiEmbeddings", input, query_embedding.length);
  // TODO: keep track of token usage
  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient.rpc("match_openai_embeddings", {
    // filter: `{"language":"${language}"}`,
    match_count: count,
    // match_threshold: threshold,
    // @ts-expect-error
    query_embedding,
  });

  if (error) {
    throw new Error(`Error querying OpenAI embeddings: ${error.message}`);
  }

  return data;
}
