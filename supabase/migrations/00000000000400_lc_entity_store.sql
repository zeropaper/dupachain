create table "private"."lc_entity_store" (
    "id" text not null,
    "key" text not null,
    "value" jsonb not null
);


alter table "private"."lc_entity_store" enable row level security;

CREATE UNIQUE INDEX lc_entity_store_id_key ON private.lc_entity_store USING btree (id);

CREATE UNIQUE INDEX lc_entity_store_pkey ON private.lc_entity_store USING btree (id);

alter table "private"."lc_entity_store" add constraint "lc_entity_store_pkey" PRIMARY KEY using index "lc_entity_store_pkey";

alter table "private"."lc_entity_store" add constraint "lc_entity_store_id_key" UNIQUE using index "lc_entity_store_id_key";

CREATE INDEX ON "private"."lc_entity_store" USING btree (id, key);

