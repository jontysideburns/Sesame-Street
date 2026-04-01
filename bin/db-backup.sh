#!/bin/bash
# ── Database backup script ──────────────────────────────────────────────────
# Creates a full pg_dump before destructive operations like data directory wipes.
# Usage: bin/db-backup.sh [backup_name]
#
# Backups are stored in data/backups/ with timestamps.
# Restore with: bin/db-restore.sh <backup_file>

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/data/backups"
BACKUP_NAME="${1:-manual}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${TIMESTAMP}_${BACKUP_NAME}.sql"

mkdir -p "$BACKUP_DIR"

echo "[backup] Dumping database to ${BACKUP_FILE}..."
cd "${PROJECT_DIR}/docker"
docker compose exec -T postgres pg_dump -U sesame sesamestreet > "$BACKUP_FILE"
echo "[backup] Done. Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "[backup] File: ${BACKUP_FILE}"
