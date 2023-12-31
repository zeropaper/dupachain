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

### Langfuse

Is used log LLM and chat model calls. You can run it locally or use their hosted version.
The integration is done through the
[`langfuse-langchain` package](https://langfuse.com/docs/langchain/typescript).

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

LANGFUSE_BASE_URL="http://localhost:8000"
LANGFUSE_PUBLIC_KEY="<starts with pk-lf->"
LANGFUSE_SECRET_KEY="<starts with sk-lf->"

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

## Evaluations

The gateway app has a `npm` script to run evaluations based on the
[default.evalsconfig.yml file](./apps/gateway/default.evalsconfig.yml) in the app directory.

You can run the script with `pnpm eval`.

## Work in progress

This is an early stage prototype and there are a lot of things that are not yet ideal.

### TODOs

The code contains a lot of `TODO`s that need attention.

### Bigger changes

- figure a way to render the "eval" results in a more readable way
- deeper integration with langfuse (user feedback / scores) and supabase (langchain caching / memory)
- add options to the eval files to allow for more flexibility
- re-organize code scaffolding to allow better sharing of types

## Docker

### Build

```sh
DOCKER_BUILDKIT=1 docker build . --target gateway --tag gateway:latest
```

### Run

```sh
docker run -it \
-p 3050:3040 \
--env-file .env \
-e SUPABASE_URL="http://host.docker.internal:54321" \
docker.io/library/gateway:latest
```

http://localhost:3050
