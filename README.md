# Supabase - LangChain playground

This is a playground for [supabase](https://supabase.com)d
[LangChain](https://js.langchain.com/docs/get_started/introduction) project.

Its aim is to provide some structure and a starting point for the project by putting together
a stack of open-source tools that can help developing LangChain chains, tools and apps.
It considers the usual deterministic approach of engineering and tries to provide a set of tools
that allow assessing the quality of the chain and its tools.

[![Made with Supabase](https://supabase.com/badge-made-with-supabase.svg)](https://supabase.com)

## Prerequisites

### Node

- `node`: install using [NVM](https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating)
  (`nvm install 20 && nvm use 20`)
- `pnpm`: is the package manager that is used in this project, install with `npm i -g pnpm`

### Supabase

In order to run supabase locally, you also need to ensure
[their prerequisites are met](https://github.com/supabase/supabase/blob/master/DEVELOPERS.md#local-development).

## Setup

1. `pnpm i` to install the dependencies
1. `pnpm sb:start` to start the Supabase DB
1. `pnpm sb:db:reset` this will:
   1. import the base SQL files from [`./supbabase/migrations`](./supbabase/migrations)
   1. import the [`./supbabase/seed.sql`](./supbabase/seed.sql)
   1. generate the TypeScript types based on the DB schema  
      (and put them in the [`@local/supabase-types`](./packages/supabase-types))
1. Enable the "realtime" feature on the `chat_messages` table (see below)
1. `pnpm dev` will run the ["gateway" app](./apps/gateway) in "dev" mode

**Notes:**

- Everytime you use the `pnpm sb:db:reset` script, you will need to enable the "realtime"
  feature of the `chat_messages` table  
  ![image](https://github.com/zeropaper/dupachain/assets/65971/a650efe4-233d-4d77-8cf2-8eb3e4d4240d)

### Environment variables

You will need to create a `.env` in the root directory and should look like:

```txt
OPENAI_API_KEY="<no i'm not giving you mine>"

# get the values from running `npm supabase status`
SUPABASE_URL="<usually: http://127.0.0.1:54321>"
SUPABASE_ANON_KEY="<the anon key>"
SUPABASE_SERVICE_ROLE_KEY="<the service key>"

CORS_ORIGINS="http://localhost:3030,http://localhost:5173"
```

## Structure

The "server" part of the app is in the ["gateway" app](./apps/gateway) directory.

It is made of a very simple [ExpressJS](https://expressjs.com/) server that
utilizes [supabase-js](https://www.npmjs.com/package/@supabase/supabase-js)
and [socket.io](https://www.npmjs.com/package/socket.io) to provide a simple API and
realtime communication.

The most interesting bits are probably located in the
[`answerUser.ts`](./apps/gateway/src/chats/answerUser.ts) file and the
[POST `/documents` handler](./apps/gateway/src/index.ts).

The "ingestion" of the content is done by sending "POST" requests to the
`/documents` endpoint. The body of the request should be a JSON object with
the following structure:

```json
{
  "content": "The content of the document",
  "reference": "A unique identifier for the document",
  "metadata": { "whatever": "you want" },
  "format": "html" // or "markdown"
}
```

The whole front-end is in the [index.html](./apps/gateway/src/index.html) file
of the ["gateway" app](./apps/gateway) but it can be overriden by adding a
`index.html` file in the public of the app or by setting the `PUBLIC_DIR`
environment variable.
