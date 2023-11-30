# Supabase - LangChain playground

This is a playground for [supabase](https://supabase.com)d [LangChain](https://js.langchain.com/docs/get_started/introduction) project.

[![Made with Supabase](https://supabase.com/badge-made-with-supabase.svg)](https://supabase.com)

![dupachain-chat-screenshot-1](https://github.com/zeropaper/dupachain/assets/65971/af30b10c-26fe-421d-9d5c-3b7ce7885b47)


## Prerequisites

### Node

- `node`: install using [NVM](https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating)
  (`nvm install 18 && nvm use 18`)
- `pnpm`: is the package manager that is used in this project, install with `npm i -g pnpm`

### Supabase

In order to run supabase locally, you also need to ensure [their prerequisites are met](https://github.com/supabase/supabase/blob/master/DEVELOPERS.md#local-development).

## Setup

1. `pnpm i` to install the dependencies
1. `pnpm sb:start` to start the Supabase DB
1. `pnpm sb:db:reset` this will:
   1. import the base SQL files from [`./supbabase/migrations`](./supbabase/migrations)
   1. import the [`./supbabase/seed.sql`](./supbabase/seed.sql)
   1. generate the TypeScript types based on the DB schema (and put them in the [`@local/supabase-types`](./packages/supabase-types)
1. Enable the "realtime" feature on the `chat_messages` table (see below)
1. `pnpm dev` will run the ["gateway" app](./apps/gateway) in "dev" mode

**Note:** Everytime you use the `pnpm sb:db:reset` script, you will need to enable the "realtime" feature of the `chat_messages` table  
![image](https://github.com/zeropaper/dupachain/assets/65971/a650efe4-233d-4d77-8cf2-8eb3e4d4240d)


## Environment variables

You will need to create a `.env` files with the same content (not awesome, I get it) in the ["gateway" app](./apps/gateway) directory and should look like:

```txt
OPENAI_API_KEY="<no i'm not giving you mine>"

# get the values from running `npm supabase status`
SUPABASE_URL="<usually: http://localhost:54321>"
SUPABASE_ANON_KEY="<the anon key>"
SUPABASE_SERVICE_ROLE_KEY="<the service key>"
```


