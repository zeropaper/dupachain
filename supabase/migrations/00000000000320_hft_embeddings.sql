CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";

CREATE SEQUENCE "public"."hft_embeddings_id_seq";

CREATE TABLE "public"."hft_embeddings"(
  "id" bigint NOT NULL DEFAULT nextval('public.hft_embeddings_id_seq'::regclass),
  "content" text,
  "metadata" jsonb,
  "embedding" vector(384)
);

ALTER TABLE "public"."hft_embeddings" ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."hft_embeddings_id_seq" owned BY "public"."hft_embeddings"."id";

CREATE UNIQUE INDEX hft_embeddings_pkey ON public.hft_embeddings USING btree(id);

ALTER TABLE "public"."hft_embeddings"
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
    public.hft_embeddings AS documents
  WHERE
    documents.metadata @> FILTER
  ORDER BY
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION delete_hft_embeddings(reference text)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM public.hft_embeddings
  WHERE metadata ->> 'reference' = reference::text;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_hft_embeddings()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM public.hft_embeddings
  WHERE metadata ->> 'reference' = OLD.reference::text;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_cleanup_hft_embeddings
  AFTER DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_hft_embeddings();

