#!/bin/bash
# ── Database restore script ─────────────────────────────────────────────────
# Restores from a backup created by db-backup.sh
# Usage: bin/db-restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
  echo "Usage: bin/db-restore.sh <backup_file>"
  echo "Available backups:"
  ls -1t data/backups/*.sql 2>/dev/null || echo "  (none)"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "[restore] Error: File not found: $BACKUP_FILE"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[restore] Restoring from ${BACKUP_FILE}..."
cd "${PROJECT_DIR}/docker"
docker compose exec -T postgres psql -U sesame -d sesamestreet < "$BACKUP_FILE"
echo "[restore] Done."
