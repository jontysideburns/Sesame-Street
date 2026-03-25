#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-${ROOT_DIR}}"
DATA_DIR="${ROOT_DIR}/data"
POSTGRES_DATA_DIR="${DATA_DIR}/postgres"
INTAKE_DIR="${DATA_DIR}/intake"

echo "Stopping docker stack before clearing persisted data"
"${ROOT_DIR}/app/startd.sh" down >/dev/null 2>&1 || true

echo "Removing persisted Postgres data from ${POSTGRES_DATA_DIR}"
rm -rf "${POSTGRES_DATA_DIR}"

echo "Removing persisted application intake data from ${INTAKE_DIR}"
rm -rf "${INTAKE_DIR}"

echo "Recreating empty data directory"
mkdir -p "${DATA_DIR}"
mkdir -p "${INTAKE_DIR}"

echo "Database files cleared"
