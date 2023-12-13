CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";

CREATE SEQUENCE "public"."openai_embeddings_id_seq";

CREATE TABLE "public"."openai_embeddings"(
  "id" bigint NOT NULL DEFAULT nextval('public.openai_embeddings_id_seq'::regclass),
  "content" text,
  "metadata" jsonb,
  "embedding" vector(1536)
);

ALTER TABLE "public"."openai_embeddings" ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."openai_embeddings_id_seq" owned BY "public"."openai_embeddings"."id";

CREATE UNIQUE INDEX openai_embeddings_pkey ON public.openai_embeddings USING btree(id);

ALTER TABLE "public"."openai_embeddings"
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
    public.openai_embeddings AS documents
  WHERE
    documents.metadata @> FILTER
  ORDER BY
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION delete_openai_embeddings(reference text)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM public.openai_embeddings
  WHERE metadata ->> 'reference' = reference::text;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_openai_embeddings()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM public.openai_embeddings
  WHERE metadata ->> 'reference' = OLD.reference::text;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_cleanup_openai_embeddings
  AFTER DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_openai_embeddings();

