CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";

CREATE SEQUENCE "public"."openai_embeddings_id_seq";

CREATE TABLE "public"."openai_embeddings"(
  "id" bigint NOT NULL DEFAULT nextval('openai_embeddings_id_seq'::regclass),
  "content" text,
  "metadata" jsonb,
  "embedding" vector(1536)
);

ALTER SEQUENCE "public"."openai_embeddings_id_seq" owned BY "public"."openai_embeddings"."id";

CREATE UNIQUE INDEX openai_embeddings_pkey ON public.openai_embeddings USING btree(id);

ALTER TABLE "public"."openai_embeddings"
  ADD CONSTRAINT "openai_embeddings_pkey" PRIMARY KEY USING INDEX "openai_embeddings_pkey";

-- borrowed from
-- https://js.langchain.com/docs/modules/data_connection/retrievers/integrations/supabase-hybrid
CREATE OR REPLACE FUNCTION public.match_openai_embeddings(query_embedding vector, FILTER jsonb DEFAULT '{}' ::jsonb, match_count integer DEFAULT NULL::integer)
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
    openai_embeddings AS documents
  WHERE
    documents.metadata @> FILTER
  ORDER BY
    documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

