#!/bin/sh
# Runs on every container start via the Dockerfile CMD override.
# Applies idempotent migrations to an existing database without data loss.

set -e

echo "[migrations] Waiting for postgres to be ready..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; do
  sleep 1
done

echo "[migrations] Applying migrations.sql..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /migrations/migrations.sql 2>&1 | tail -5
echo "[migrations] Done."
