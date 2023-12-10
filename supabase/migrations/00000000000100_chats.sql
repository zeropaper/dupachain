CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";

CREATE TABLE "public"."chats"(
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{"memory":{},"currentIntent":null}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

ALTER TABLE "public"."chats"
  ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

