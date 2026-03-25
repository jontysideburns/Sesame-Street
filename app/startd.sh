#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PROJECT_DIR="${PROJECT_DIR:-${ROOT_DIR}}"
DOCKER_COMPOSE_YML="${ROOT_DIR}/docker/docker-compose.yml"

usage() {
    cat <<EOF
Usage:
  app/startd.sh [up|down|restart|logs|ps] [--detach]

Commands:
  up        Start the full stack from existing images: postgres, server, client
  down      Stop and remove the stack
  restart   Restart the full stack
  logs      Stream logs for the full stack
  ps        Show service status

Options:
  -d, --detach   Run 'up' in detached mode
  -h, --help     Show this help

Examples:
  app/startd.sh
  app/startd.sh up --detach
  app/startd.sh logs
EOF
}

if [[ ! -f "${DOCKER_COMPOSE_YML}" ]]; then
    echo "docker compose file not found: ${DOCKER_COMPOSE_YML}" >&2
    exit 1
fi

COMMAND="up"
DETACH="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        up|down|restart|logs|ps)
            COMMAND="$1"
            shift
            ;;
        -d|--detach)
            DETACH="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage
            exit 1
            ;;
    esac
done

compose() {
    docker compose -f "${DOCKER_COMPOSE_YML}" "$@"
}

case "${COMMAND}" in
    up)
        if [[ "${DETACH}" == "true" ]]; then
            compose up -d
        else
            compose up
        fi
        ;;
    down)
        compose down
        ;;
    restart)
        compose down
        if [[ "${DETACH}" == "true" ]]; then
            compose up -d
        else
            compose up
        fi
        ;;
    logs)
        compose logs -f
        ;;
    ps)
        compose ps
        ;;
esac
