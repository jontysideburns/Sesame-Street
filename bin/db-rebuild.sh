#!/bin/bash
# ── Safe database rebuild ───────────────────────────────────────────────────
# Backs up user data, rebuilds postgres image, and applies migrations
# WITHOUT wiping the data directory (preserving all user data).
#
# Usage: bin/db-rebuild.sh
#
# For a full reset (WIPES ALL DATA): bin/db-rebuild.sh --reset

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="${PROJECT_DIR}/docker"

cd "$DOCKER_DIR"

if [ "$1" = "--reset" ]; then
  echo "=== FULL RESET — this will WIPE ALL DATA ==="
  echo ""

  # Backup first
  echo "[1/5] Backing up database..."
  bash "${SCRIPT_DIR}/db-backup.sh" pre-reset 2>/dev/null || echo "  (no running database to backup)"

  echo "[2/5] Stopping containers..."
  docker compose down

  echo "[3/5] Removing data directory..."
  rm -rf "${PROJECT_DIR}/data/postgres"

  echo "[4/5] Rebuilding postgres image..."
  cd "$PROJECT_DIR"
  docker build -f docker/postgres.Dockerfile -t sesamestreet-postgres:latest .

  echo "[5/5] Starting fresh..."
  cd "$DOCKER_DIR"
  docker compose up -d postgres
  echo ""
  echo "=== Full reset complete. Seed data restored from init.sql ==="
  echo "=== To restore your backup: bin/db-restore.sh data/backups/<file>.sql ==="
else
  echo "=== Safe rebuild — preserving all user data ==="
  echo ""

  # Backup first
  echo "[1/4] Backing up database..."
  bash "${SCRIPT_DIR}/db-backup.sh" pre-migrate 2>/dev/null || echo "  (no running database to backup)"

  echo "[2/4] Rebuilding postgres image..."
  cd "$PROJECT_DIR"
  docker build -f docker/postgres.Dockerfile -t sesamestreet-postgres:latest .

  echo "[3/4] Restarting postgres..."
  cd "$DOCKER_DIR"
  docker compose up -d postgres
  sleep 3

  echo "[4/4] Applying migrations..."
  docker compose exec postgres psql -U sesame -d sesamestreet -f /migrations/migrations.sql 2>&1 | tail -5
  echo ""
  echo "=== Safe rebuild complete. All user data preserved. ==="
fi
