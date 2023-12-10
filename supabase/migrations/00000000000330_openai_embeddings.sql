CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";

CREATE SEQUENCE "private"."openai_embeddings_id_seq";

CREATE TABLE "private"."openai_embeddings"(
  "id" bigint NOT NULL DEFAULT nextval('private.openai_embeddings_id_seq'::regclass),
  "content" text,
  "metadata" jsonb,
  "embedding" vector(1536)
);

ALTER TABLE "private"."openai_embeddings" ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "private"."openai_embeddings_id_seq" owned BY "private"."openai_embeddings"."id";

CREATE UNIQUE INDEX openai_embeddings_pkey ON private.openai_embeddings USING btree(id);

ALTER TABLE "private"."openai_embeddings"
  ADD CONSTRAINT "openai_embeddings_pkey" PRIMARY KEY USING INDEX "openai_embeddings_pkey";

-- borrowed from
-- https://js.langchain.com/docs/modules/data_connection/retrievers/integrations/supabase-hybrid
CREATE OR REPLACE FUNCTION match_openai_embeddings(query_embedding vector, FILTER jsonb DEFAULT '{}' ::jsonb, match_count integer DEFAULT NULL::integer)
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
    private.openai_embeddings AS documents
  WHERE
    documents.metadata @> FILTER
  ORDER BY
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION delete_openai_embeddings(doc_id text)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM private.openai_embeddings
  WHERE metadata ->> 'document_id' = doc_id::text;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_openai_embeddings()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM private.openai_embeddings
  WHERE metadata ->> 'document_id' = OLD.id::text;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_cleanup_openai_embeddings
  AFTER DELETE ON private.documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_openai_embeddings();

