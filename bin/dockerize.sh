#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_NAMESPACE="${DOCKER_USERNAME:-}"
DEFAULT_TAG="latest"

usage() {
  cat <<'EOF'
Usage:
  bin/dockerize.sh <component|all> [options]

Components:
  client      Build the Next.js client image
  server      Build the FastAPI server image
  postgres    Build the Postgres image with init.sql
  all         Build all three images

Options:
  -p, --publish            Tag and push images to Docker Hub
  -n, --namespace <name>   Docker Hub namespace/user for published images
  -t, --tag <tag>          Tag to use when publishing (default: latest)
  -h, --help               Show this help

Examples:
  bin/dockerize.sh client
  bin/dockerize.sh all
  bin/dockerize.sh server --publish --namespace myuser --tag v1
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

TARGET="$1"
shift

PUBLISH="false"
NAMESPACE="$DEFAULT_NAMESPACE"
TAG="$DEFAULT_TAG"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--publish)
      PUBLISH="true"
      shift
      ;;
    -n|--namespace)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      NAMESPACE="$2"
      shift 2
      ;;
    -t|--tag)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      TAG="$2"
      shift 2
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

components_for_target() {
  case "$1" in
    client|server|postgres)
      COMPONENTS=("$1")
      ;;
    all)
      COMPONENTS=("postgres" "server" "client")
      ;;
    *)
      echo "Unsupported component: $1" >&2
      usage
      exit 1
      ;;
  esac
}

local_image_for() {
  case "$1" in
    client) printf 'sesamestreet-client:latest\n' ;;
    server) printf 'sesamestreet-server:latest\n' ;;
    postgres) printf 'sesamestreet-postgres:latest\n' ;;
    *)
      echo "Unsupported component: $1" >&2
      exit 1
      ;;
  esac
}

remote_image_for() {
  local component="$1"
  printf '%s/sesamestreet-%s:%s\n' "$NAMESPACE" "$component" "$TAG"
}

build_component() {
  local component="$1"

  case "$component" in
    client)
      "${ROOT_DIR}/bin/build-client-image.sh"
      ;;
    server)
      "${ROOT_DIR}/bin/build-server-image.sh"
      ;;
    postgres)
      "${ROOT_DIR}/bin/build-postgres-image.sh"
      ;;
    *)
      echo "Unsupported component: $component" >&2
      exit 1
      ;;
  esac
}

dockerhub_login() {
  if [[ -z "$NAMESPACE" ]]; then
    echo "Publishing requires --namespace or DOCKER_USERNAME." >&2
    exit 1
  fi

  if [[ -z "${DOCKER_TOKEN:-}" ]]; then
    echo "Publishing requires DOCKER_TOKEN." >&2
    exit 1
  fi

  printf '%s' "$DOCKER_TOKEN" | docker login -u "$NAMESPACE" --password-stdin
}

publish_component() {
  local component="$1"
  local local_image
  local remote_image

  local_image="$(local_image_for "$component")"
  remote_image="$(remote_image_for "$component")"

  echo "Tagging ${local_image} as ${remote_image}"
  docker tag "$local_image" "$remote_image"

  echo "Pushing ${remote_image}"
  docker push "$remote_image"
}

echo "--- Dockerize ---"
echo "Root directory: ${ROOT_DIR}"
echo "Target: ${TARGET}"
echo "Publish: ${PUBLISH}"
echo "Namespace: ${NAMESPACE:-<none>}"
echo "Tag: ${TAG}"
echo

COMPONENTS=()
components_for_target "$TARGET"

for component in "${COMPONENTS[@]}"; do
  echo "Building ${component} image"
  build_component "$component"
done

if [[ "$PUBLISH" == "true" ]]; then
  dockerhub_login

  for component in "${COMPONENTS[@]}"; do
    publish_component "$component"
  done

  docker logout
fi
