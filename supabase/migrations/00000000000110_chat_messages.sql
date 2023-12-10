CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";

CREATE TABLE "public"."chat_messages"(
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "finished" boolean NOT NULL DEFAULT FALSE,
  "name" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  "updated_at" timestamp with time zone NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;

CREATE INDEX "idx_chat_messages_chat" ON "public"."chat_messages"("chat_id");

ALTER TABLE "public"."chat_messages" validate CONSTRAINT "chat_messages_chat_id_fkey";

ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;

create policy "Allow anonymous insert on chat_messages" on public.chat_messages
  for insert with check (true);

create policy "Allow anonymous select on chat_messages no older than 5 days" on public.chat_messages
for select using (
  current_timestamp - created_at <= interval '5 days'
  and chat_id in (select id from public.chats where current_timestamp - created_at <= interval '5 days')
);

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime('updated_at');

