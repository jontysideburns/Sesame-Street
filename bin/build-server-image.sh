#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build \
  -f "${ROOT_DIR}/docker/server.Dockerfile" \
  -t "sesamestreet-server:latest" \
  -t "sesamestreet-server:local" \
  "${ROOT_DIR}"
