CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";

CREATE SEQUENCE "private"."hft_embeddings_id_seq";

CREATE TABLE "private"."hft_embeddings"(
  "id" bigint NOT NULL DEFAULT nextval('private.hft_embeddings_id_seq'::regclass),
  "content" text,
  "metadata" jsonb,
  "embedding" vector(384)
);

ALTER TABLE "private"."hft_embeddings" ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "private"."hft_embeddings_id_seq" owned BY "private"."hft_embeddings"."id";

CREATE UNIQUE INDEX hft_embeddings_pkey ON private.hft_embeddings USING btree(id);

ALTER TABLE "private"."hft_embeddings"
  ADD CONSTRAINT "hft_embeddings_pkey" PRIMARY KEY USING INDEX "hft_embeddings_pkey";

-- borrowed from
-- https://js.langchain.com/docs/modules/data_connection/retrievers/integrations/supabase-hybrid
CREATE OR REPLACE FUNCTION match_hft_embeddings(query_embedding vector, FILTER jsonb DEFAULT '{}' ::jsonb, match_count integer DEFAULT NULL::integer)
  RETURNS TABLE(
    id bigint,
    content text,
    metadata jsonb,
    embedding jsonb,
    similarity double precision)
  LANGUAGE plpgsql
  AS $function$
  # variable_conflict use_column
BEGIN
  RETURN query
  SELECT
    id,
    content,
    metadata,
(embedding::text)::jsonb AS embedding,
    1 -(documents.embedding <=> query_embedding) AS similarity
  FROM
    private.hft_embeddings AS documents
  WHERE
    documents.metadata @> FILTER
  ORDER BY
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION delete_hft_embeddings(doc_id text)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM private.hft_embeddings
  WHERE metadata ->> 'document_id' = doc_id::text;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_hft_embeddings()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM private.hft_embeddings
  WHERE metadata ->> 'document_id' = OLD.id::text;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_cleanup_hft_embeddings
  AFTER DELETE ON private.documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_hft_embeddings();

