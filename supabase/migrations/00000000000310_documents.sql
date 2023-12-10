CREATE TYPE "private"."document_format" AS enum(
  'html',
  'markdown'
);

CREATE TABLE "private"."documents"(
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "reference" text NOT NULL,
  "format" private.document_format NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text)
);

CREATE UNIQUE INDEX documents_pkey ON private.documents USING btree(id);

ALTER TABLE "private"."documents"
  ADD CONSTRAINT "documents_pkey" PRIMARY KEY USING INDEX "documents_pkey";

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON private.documents
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

