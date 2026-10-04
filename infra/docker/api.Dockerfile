# syntax=docker/dockerfile:1.7
###############################################################################
# @kmg/api — NestJS 11 + Prisma 6 (multi-stage, pnpm via corepack)
#
# Build context is the REPOSITORY ROOT:
#   docker build -f infra/docker/api.Dockerfile -t kmg-api:dev .
#
# Base image: Debian bookworm-slim (glibc + OpenSSL 3.0) which matches the
# Prisma binaryTarget "debian-openssl-3.0.x" declared in apps/api/prisma/schema.prisma.
# (Do not switch to alpine without switching the target to linux-musl-openssl-3.0.x.)
#
# Stages: base -> deps (pnpm fetch) -> build (shared + prisma generate + nest build + pnpm deploy)
#         -> prisma-cli (standalone Prisma CLI for `migrate deploy`) -> runtime
# The `tools` stage is also published/used for the one-shot seed job (it has devDeps + tsx).
###############################################################################

ARG NODE_IMAGE=node:22-bookworm-slim

##############################  base  #########################################
FROM ${NODE_IMAGE} AS base
# npm_config_strict_dep_builds=false: do not fail the build when a transitive
# dependency's build script is not in the workspace allow-list.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1 \
    npm_config_strict_dep_builds=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

##############################  deps  #########################################
# Only the manifests + lockfile, so the (cached) fetch layer is reused whenever
# application sources change.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store

##############################  build  ########################################
FROM deps AS build
# All workspace manifests are required for `--frozen-lockfile` to validate.
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --store-dir /pnpm/store \
      --filter "@kmg/api..." --filter "@kmg/shared"

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

# 1) shared must be built first (api imports @kmg/shared/dist)
RUN pnpm --filter "@kmg/shared" build
# 2) Prisma client for the workspace (used by tests/seed in the `tools` stage)
RUN pnpm --filter "@kmg/api" exec prisma generate
# 3) Nest build -> apps/api/dist/main.js
RUN pnpm --filter "@kmg/api" build

# 4) Production-only node_modules tree for the runtime image.
#    pnpm 11's default deploy implementation requires injected workspace packages;
#    `--legacy` copies workspace deps instead, which needs no repo-wide config change.
RUN pnpm --filter "@kmg/api" deploy --prod --legacy /out \
 && rm -rf /out/dist /out/prisma /out/src /out/test /out/uploads \
 && cp -R apps/api/dist /out/dist \
 && cp -R apps/api/prisma /out/prisma \
 && node -p "require('/repo/apps/api/node_modules/prisma/package.json').version" > /prisma-version \
 && cd /out \
 && /repo/apps/api/node_modules/.bin/prisma generate --schema ./prisma/schema.prisma \
 && rm -rf /out/node_modules/.cache

##############################  tools  ########################################
# Full workspace with devDependencies: used by the one-shot `seed` service and
# for ad-hoc `prisma studio` / `prisma migrate` work. Not the production image.
FROM build AS tools
ENV NODE_ENV=development
WORKDIR /repo/apps/api
# runs as root on purpose: this is a short-lived maintenance image (pnpm needs a
# writable store/home), it is never exposed to traffic.
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "prisma:seed"]

##############################  prisma-cli  ###################################
# The production image ships prod dependencies only, so the Prisma CLI (a devDep)
# is installed side-by-side at a pinned, matching version for `migrate deploy`.
FROM base AS prisma-cli
COPY --from=build /prisma-version /prisma-version
RUN npm install --no-audit --no-fund --prefix /opt/prisma "prisma@$(cat /prisma-version)" \
 && /opt/prisma/node_modules/.bin/prisma --version \
 && rm -rf /root/.npm

##############################  runtime  ######################################
FROM ${NODE_IMAGE} AS runtime

ARG VERSION=0.0.0
ARG REVISION=unknown
ARG CREATED=1970-01-01T00:00:00Z
LABEL org.opencontainers.image.title="kmg-api" \
      org.opencontainers.image.description="KmgTechnologies REST API (NestJS 11 + Prisma 6)" \
      org.opencontainers.image.vendor="KmgTechnologies" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.source="https://github.com/kmg-technologies/kmg" \
      org.opencontainers.image.documentation="https://github.com/kmg-technologies/kmg/blob/main/docs/DEPLOYMENT.md" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    API_PORT=4000 \
    PORT=4000 \
    PATH=/opt/prisma/node_modules/.bin:$PATH \
    PRISMA_HIDE_UPDATE_MESSAGE=1 \
    CHECKPOINT_DISABLE=1 \
    NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY --from=prisma-cli /opt/prisma /opt/prisma
COPY --from=build --chown=node:node /out /app
COPY --chmod=0755 infra/docker/api-entrypoint.sh /usr/local/bin/kmg-entrypoint.sh

# STORAGE_DRIVER=local (dev only) writes here; production uses S3/MinIO.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.API_PORT||4000)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# tini reaps zombies and forwards SIGTERM so Nest can shut down gracefully.
ENTRYPOINT ["tini", "--", "/usr/local/bin/kmg-entrypoint.sh"]
CMD ["node", "dist/main.js"]
