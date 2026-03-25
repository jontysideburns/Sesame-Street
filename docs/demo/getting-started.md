# Getting Started

Purpose: run the current investor-demo application locally and reset it to a known state.
Audience: anyone starting or verifying the runnable demo.
Status: current

This guide walks through the local setup for the demo application in more detail than the repository [README.md](../../README.md). For the current architecture and code layout, see [implementation.md](./implementation.md).

All commands below assume `PROJECT_DIR` points to the repository root.

## What You Are Starting

The demo has three main moving parts:

1. PostgreSQL in Docker
2. The FastAPI server in `server/`
3. The Next.js client in `client/`

The seeded demo state is designed for an investor presentation:

- 6 representative data center financing deals
- 1 flagship deal: `Aurora Prime Data Campus`
- 1 overdue compliance certificate
- 2 pending review items in the compliance workflow

## Prerequisites

You need:

- Node.js 23+
- npm 11+
- Python 3.12+
- Docker Desktop or another Docker runtime with Compose support

## First-Time Setup

Install the client dependencies:

```bash
cd "${PROJECT_DIR}/client"
npm install
```

Create a Python environment and install the server dependencies:

```bash
python3 -m venv "${PROJECT_DIR}/.venv"
source "${PROJECT_DIR}/.venv/bin/activate"
pip install -r "${PROJECT_DIR}/server/requirements.txt"
```

Start PostgreSQL:

```bash
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" up -d postgres
```

Postgres persists its files in `${PROJECT_DIR}/data/postgres/` on the host.

## Start the Server

In one terminal:

```bash
cd "${PROJECT_DIR}"
uvicorn server.main:app --reload --host 0.0.0.0 --port 4000
```

Expected result:

```text
Uvicorn running on http://0.0.0.0:4000
```

Core demo APIs include:

- `GET /health`
- `GET /api/portfolio`
- `GET /api/deals`
- `GET /api/deals/:slug`
- `GET /api/deals/:slug/covenants/:covenantId`
- `GET /api/review-queue`
- `POST /api/review-queue/:id/approve`

## Start the Client

In a second terminal:

```bash
cd "${PROJECT_DIR}/client"
npm run dev
```

Expected result:

```text
Local: http://localhost:3000
```

Open:

```text
http://localhost:3000
```

## Recommended Demo Walkthrough

Use this order when reviewing the app:

1. Portfolio dashboard
2. Flagship deal TopSheet at `/deals/aurora-prime-data-campus`
3. Covenant drilldown from the DSCR section
4. Compliance review flow at `/review`

This sequence matches the intended investor narrative:

- the portfolio view creates institutional context
- the flagship deal proves depth
- the covenant drilldown proves analytical rigor
- the review flow proves operational workflow

## Resetting the Demo

The review flow mutates database state. After approving items, the overdue obligation will clear and the review queue will empty.

To restore the initial seeded story:

```bash
"${PROJECT_DIR}/app/clear.sh"
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" up -d postgres
```

This clears the persisted database files under `${PROJECT_DIR}/data/postgres/`, then starts Postgres so `postgres/init.sql` runs again and reloads the demo dataset.

## Stopping Services

Stop the client and server with `Ctrl+C` in their terminals, then stop Docker if you started Postgres separately:

```bash
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" down
```

## Dockerized Startup

If you want the full app to run through Docker instead of local Node processes, use the containerized path from the repo root.

Build the component images:

```bash
"${PROJECT_DIR}/bin/build-postgres-image.sh"
"${PROJECT_DIR}/bin/build-server-image.sh"
"${PROJECT_DIR}/bin/build-client-image.sh"
```

Then start the full stack:

```bash
"${PROJECT_DIR}/bin/build-all-images.sh"
"${PROJECT_DIR}/app/startd.sh" up
```

This compose stack starts:

1. PostgreSQL
2. the FastAPI server
3. the Next.js client

`app/startd.sh` and Docker Compose do not build images. They start the current `latest` images already present on the machine.

Open:

```text
http://localhost:3000
```

Stop the stack:

```bash
"${PROJECT_DIR}/app/startd.sh" down
```

## Troubleshooting

### Port 3000 or 4000 already in use

Stop the process already bound to the port, then restart the relevant app.

### Postgres is not reachable

Check Docker is running, then restart the container:

```bash
"${PROJECT_DIR}/app/clear.sh"
docker compose -f "${PROJECT_DIR}/docker/docker-compose.yml" up -d postgres
```

### Client loads but shows fetch errors

The client expects the server at `http://localhost:4000` by default. Make sure the server is running before opening the UI.

### The demo no longer shows the original late-package scenario

Clear `${PROJECT_DIR}/data/postgres/`, then start Postgres so the initialization SQL runs again and restores the intended presentation state.
