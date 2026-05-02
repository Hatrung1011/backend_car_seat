#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  echo "Usage: ./restore-db.sh <env-file> <dump-file>"
  exit 1
fi

ENV_FILE="$1"
DUMP_FILE="$2"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file not found: $DUMP_FILE"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

cat "$DUMP_FILE" | docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T db \
  pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "Restore completed from: $DUMP_FILE"
