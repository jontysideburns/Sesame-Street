#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-${ROOT_DIR}}"
DOCKER_COMPOSE_YML="${PROJECT_DIR}/docker/docker-compose.yml"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-sesamestreet}"
POSTGRES_USER="${POSTGRES_USER:-sesame}"

usage() {
  cat <<EOF
Usage:
  app/sql.sh "<sql statement>"

Examples:
  "${PROJECT_DIR}/app/sql.sh" "\\dt"
  "${PROJECT_DIR}/app/sql.sh" "SELECT slug, name, exposure FROM deals;"
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if [[ ! -f "${DOCKER_COMPOSE_YML}" ]]; then
  echo "docker compose file not found: ${DOCKER_COMPOSE_YML}" >&2
  exit 1
fi

SQL="$*"

docker compose -f "${DOCKER_COMPOSE_YML}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "${SQL}"
