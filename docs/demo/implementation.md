# Demo Implementation

Purpose: describe the current runnable demo as implemented in this repository.
Audience: contributors working on the FastAPI, Next.js, and Postgres demo stack.
Status: current

This document consolidates the old frontend, backend, and UX notes into one current-state guide.

## Demo Objective

The runnable app is intentionally narrower than the full platform specification. The demo is designed to prove a few things quickly:

1. The portfolio can be summarized in a credible institutional format.
2. A flagship deal can be opened into a dense but readable monitoring view.
3. Covenant health can be explained with evidence.
4. Intake and review still resolve through controlled human workflow.

## Current Stack

- Next.js App Router frontend in `client/`
- FastAPI backend in `server/`
- PostgreSQL seed schema and demo data in `postgres/init.sql`
- Docker Compose for local Postgres and full-stack containerized runs

The current implementation is a local demo stack. It is not the same as the target Snowflake architecture described in `docs/roadmap/target-snowflake.md`.

## Application Shape

The app is organized around a small number of demo domains:

- portfolio and dashboard views
- deal detail and covenant drilldown
- intake, review, and compliance workflows
- notifications, work queue, reports, configuration, and setup flows

The frontend routes live under `client/app/`. The backend routes are currently centralized in `server/main.py`.

## Frontend Structure

The frontend uses server-rendered pages by default and groups API access into domain files under `client/api/`.

Key pieces:

- `client/app/layout.tsx` for the shell and metadata
- `client/app/page.tsx` and adjacent route directories for screens
- `client/app/*/actions.ts` for server actions where mutation is needed
- `client/components/` for reusable UI pieces
- `client/app/globals.css` for the shared visual system

Rendering is intentionally live against the backend so the demo reflects current seeded state without a rebuild.

## Backend Structure

The backend is intentionally thin but broad enough to power the demo story.

Key pieces:

- `server/main.py` for the FastAPI app, route handlers, and workflow logic
- `server/database.py` for Postgres connections
- `server/config.py` for local runtime defaults
- `postgres/init.sql` for schema creation and demo data seeding

The server currently handles portfolio aggregation, deal detail, workflow endpoints, demo-clock mutation, and a variety of supporting endpoints for the broader demo surface.

## UX And Narrative

The implemented UX is pitch-oriented rather than platform-complete. It favors:

- shallow navigation
- strong hierarchy and readable density
- evidence-backed details
- visible state transitions after review and approval

The recommended narrative still moves from portfolio context into deal depth and then into workflow proof, even though the app now includes additional pages.

## Mutation Model

The demo relies on live server state, so the key mutation paths are deliberately simple:

- frontend server actions call backend endpoints
- backend endpoints mutate Postgres state
- the frontend revalidates affected routes after mutation
- resetting the demo restores the seeded narrative from `postgres/init.sql`

This keeps the investor story deterministic and easy to recover after a demo run.

## Known Boundaries

The current implementation deliberately avoids trying to represent the full target product. It is still a demo-oriented codebase with a few practical constraints:

- `server/main.py` is large and should eventually be modularized
- the schema is narrower than the canonical enterprise model
- many routes are optimized for the demo dataset rather than general multi-tenant production use
- styling is centralized for speed and narrative cohesion

## Next Cleanup Targets

If this implementation grows, the next sensible refactors are:

1. split backend routes and query logic into modules
2. document the main frontend route groups in more detail
3. move shared demo concepts into explicit types and DTOs
4. replace init-time demo seeding with migrations plus idempotent fixtures
