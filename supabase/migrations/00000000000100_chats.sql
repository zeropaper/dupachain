CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";

CREATE TABLE "public"."chats"(
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{"memory":{},"currentIntent":null}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

ALTER TABLE "public"."chats"
  ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;

create policy "Allow anonymous insert on chats" on public.chats
  for insert with check (true);
create policy "Allow anonymous select on chats no older than 5 days" on public.chats
for select using (
  current_timestamp - created_at <= interval '5 days'
);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

