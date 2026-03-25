#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"${ROOT_DIR}/bin/build-postgres-image.sh"
"${ROOT_DIR}/bin/build-server-image.sh"
"${ROOT_DIR}/bin/build-client-image.sh"
