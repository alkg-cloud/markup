#!/bin/sh
set -e

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
DATA_DIR="${DATA_DIR:-/app/data}"
export DATABASE_URL="${DATABASE_URL:-file:${DATA_DIR}/db.sqlite}"

mkdir -p "$DATA_DIR"
chown -R "$PUID:$PGID" "$DATA_DIR" || true

# Run migrations as the unprivileged user
su-exec "$PUID:$PGID" ./node_modules/.bin/prisma migrate deploy

exec su-exec "$PUID:$PGID" "$@"
