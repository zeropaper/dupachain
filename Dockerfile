# based on
# https://pnpm.io/docker#example-2-build-multiple-docker-images-in-a-monorepo
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /project
WORKDIR /project
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=gateway --prod /prod/gateway
RUN pnpm deploy --filter=evals-viewer --prod /prod/evals-viewer

FROM base AS gateway
COPY --from=build /prod/gateway /prod/gateway
WORKDIR /prod/gateway
ENV PORT=3040
ENV NODE_ENV=production
EXPOSE 3040
CMD [ "pnpm", "start" ]

FROM base AS evals-viewer
COPY --from=build /prod/evals-viewer /prod/evals-viewer
WORKDIR /prod/evals-viewer
ENV PORT=4040
ENV NODE_ENV=production
EXPOSE 4040
CMD [ "pnpm", "start" ]