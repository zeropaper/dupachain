CREATE TYPE "public"."document_format" AS enum(
  'html',
  'markdown'
);

CREATE TABLE "public"."documents"(
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL,
  "format" public.document_format NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text)
);

ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree(id);

ALTER TABLE "public"."documents"
  ADD CONSTRAINT "documents_pkey" PRIMARY KEY USING INDEX "documents_pkey";

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

