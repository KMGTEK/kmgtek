# syntax=docker/dockerfile:1.7
###############################################################################
# @kmg/web — Next.js 16 standalone output (multi-stage, pnpm via corepack)
#
# Build context is the REPOSITORY ROOT:
#   docker build -f infra/docker/web.Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://kmgtek.com -t kmg-web:dev .
#
# NOTE — build-time vs runtime env:
#   * NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time,
#     so a web image is specific to the site URL it was built with.
#   * next.config rewrites (/api/v1/* -> API) are also serialized at build time;
#     API_INTERNAL_URL is therefore both a build arg and a runtime env var
#     (server components read it at runtime).
###############################################################################

ARG NODE_IMAGE=node:22-bookworm-slim

##############################  base  #########################################
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    npm_config_strict_dep_builds=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

##############################  deps  #########################################
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store

##############################  build  ########################################
FROM deps AS build
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline --store-dir /pnpm/store \
      --filter "@kmg/web..." --filter "@kmg/shared"

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_GA_ID=""
ARG API_INTERNAL_URL=http://api:4000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_GA_ID=${NEXT_PUBLIC_GA_ID} \
    API_INTERNAL_URL=${API_INTERNAL_URL} \
    NODE_ENV=production

RUN pnpm --filter "@kmg/shared" build
RUN --mount=type=cache,id=next-cache,target=/repo/apps/web/.next/cache \
    pnpm --filter "@kmg/web" build \
 && test -f apps/web/.next/standalone/apps/web/server.js \
    || { echo "ERROR: expected apps/web/.next/standalone/apps/web/server.js."; \
         echo "       next.config must set output:'standalone' and outputFileTracingRoot"; \
         echo "       to the repository root (path.join(__dirname,'../../'))."; exit 1; }

##############################  runtime  ######################################
FROM ${NODE_IMAGE} AS runtime

ARG VERSION=0.0.0
ARG REVISION=unknown
ARG CREATED=1970-01-01T00:00:00Z
LABEL org.opencontainers.image.title="kmg-web" \
      org.opencontainers.image.description="KmgTechnologies website, candidate portal and admin portal (Next.js 16)" \
      org.opencontainers.image.vendor="KmgTechnologies" \
      org.opencontainers.image.licenses="UNLICENSED" \
      org.opencontainers.image.source="https://github.com/kmg-technologies/kmg" \
      org.opencontainers.image.documentation="https://github.com/kmg-technologies/kmg/blob/main/docs/DEPLOYMENT.md" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# HEALTH_PATH is the route used by the container healthcheck below; it must render
# even when the API is unreachable.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    API_INTERNAL_URL=http://api:4000 \
    HEALTH_PATH=/

WORKDIR /app
# standalone bundles its own minimal node_modules; static assets and /public are
# not traced and must be copied at their monorepo-relative paths.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

# ISR / image-optimizer cache. Mount a volume (or emptyDir) here in production.
RUN mkdir -p /app/apps/web/.next/cache && chown -R node:node /app/apps/web/.next

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+(process.env.HEALTH_PATH||'/')).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["tini", "--"]
CMD ["node", "apps/web/server.js"]

# If next/image optimization fails at runtime, add `sharp` to apps/web dependencies
# so Next's file tracing bundles it into the standalone output.
