#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build \
  -f "${ROOT_DIR}/docker/postgres.Dockerfile" \
  -t "sesamestreet-postgres:latest" \
  -t "sesamestreet-postgres:local" \
  "${ROOT_DIR}"
