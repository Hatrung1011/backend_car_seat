#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ] || [ "${2:-}" = "" ]; then
  echo "Usage: ./backup-db.sh <env-file> <backup-dir>"
  exit 1
fi

ENV_FILE="$1"
BACKUP_DIR="$2"
NOW="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

set -a
. "$ENV_FILE"
set +a

OUT_FILE="$BACKUP_DIR/car_seat_${NOW}.dump"

docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT_FILE"

echo "Backup created: $OUT_FILE"
