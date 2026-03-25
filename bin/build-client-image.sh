#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker build \
  -f "${ROOT_DIR}/docker/client.Dockerfile" \
  -t "sesamestreet-client:latest" \
  -t "sesamestreet-client:local" \
  "${ROOT_DIR}"
