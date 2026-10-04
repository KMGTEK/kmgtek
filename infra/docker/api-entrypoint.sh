#!/bin/sh
# KMG API container entrypoint.
#
#   RUN_MIGRATIONS=true   -> run `prisma migrate deploy` before starting the app
#   docker run <image> migrate  -> only run the migrations and exit (k8s Job / CI)
#
# Everything else is passed through to the container CMD (default: node dist/main.js).
set -eu

log() { printf '%s [entrypoint] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

run_migrations() {
  attempts="${MIGRATION_RETRIES:-10}"
  delay="${MIGRATION_RETRY_DELAY:-3}"
  i=1
  while [ "$i" -le "$attempts" ]; do
    log "applying database migrations (attempt $i/$attempts)"
    if prisma migrate deploy --schema /app/prisma/schema.prisma; then
      log "migrations applied"
      return 0
    fi
    if [ "$i" -eq "$attempts" ]; then
      log "ERROR: migrations failed after $attempts attempts"
      return 1
    fi
    log "database not ready / migration failed, retrying in ${delay}s"
    sleep "$delay"
    i=$((i + 1))
  done
}

if [ "${1:-}" = "migrate" ]; then
  run_migrations
  exit $?
fi

if [ "${1:-}" = "migrate-status" ]; then
  exec prisma migrate status --schema /app/prisma/schema.prisma
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  run_migrations
fi

log "starting: $*"
exec "$@"
