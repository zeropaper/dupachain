# Supabase - LangChain playground

This is a playground for [supabase](https://supabase.com)d [LangChain](https://js.langchain.com/docs/get_started/introduction) project.

## Prerequisites

### Node

- `node`: install using [NVM](https://github.com/nvm-sh/nvm/blob/master/README.md#installing-and-updating)
  (`nvm install 18 && nvm use 18`)
- `pnpm`: is the package manager that is used in this project, install with `npm i -g pnpm`

### Environment variables

## Setup

**Note:** The following steps **MUST** be done in the following order.

1. `pnpm sb:start` to start the Supabase DB
2. `pnpm sb:db:reset` this will:
   1. import the base SQL files from [`./supbabase/migrations`](./supbabase/migrations)
   2. import the [`./supbabase/seed.sql`](./supbabase/seed.sql)
   3. generate the TypeScript types based on the DB schema
3. `pnpm i` to install the dependencies
4. `pnpm dev` will run the "app" NextJS app in "dev" mode
