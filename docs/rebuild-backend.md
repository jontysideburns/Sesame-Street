# Backend Rebuild Instructions

## Context

Recent changes on the `claude/romantic-tu` branch require both Docker images to be rebuilt:

| Image | What changed |
|---|---|
| `sesamestreet-server:latest` | New API endpoints in `server/main.py` |
| `sesamestreet-postgres:latest` | New tables and seed data in `postgres/init.sql` |

The new schema additions are:
- `risk_taxonomy` — 226-risk controlled vocabulary (seeded once, read-only)
- `deal_risk_register` — per-deal per-risk assessment table
- `deal_risk_register_history` — audit/versioning table
- `initialise_risk_register()` — PostgreSQL function, auto-called for all existing deals

New API endpoints are under `/api/deals/{slug}/risk-register`, `/api/portfolio/risk-heatmap`, `/api/portfolio/weak-mitigation`, and `/api/plumbing/risk-template`.

---

## Rebuild Steps

Run the following from the **project root directory** (the directory containing the `docker/` folder).

### 1. Rebuild the images

```bash
docker build -t sesamestreet-server:latest -f docker/server.Dockerfile .
docker build -t sesamestreet-postgres:latest -f docker/postgres.Dockerfile .
```

### 2. Restart the server container

```bash
docker compose -f docker/docker-compose.yml up -d server
```

This is sufficient if the database schema has not changed since the last deploy. Skip to step 3 only if you are also picking up the `init.sql` changes (risk taxonomy, deal risk register tables).

### 3. Reinitialise the database (required for schema changes)

> **Warning:** This drops all existing data and re-seeds from `init.sql`. Only do this in a demo/development environment.

```bash
# Bring down the database container
docker compose -f docker/docker-compose.yml down postgres

# Remove the postgres data volume (name may vary — check with `docker volume ls`)
docker volume rm sesamestreet_postgres_data

# Bring everything back up
docker compose -f docker/docker-compose.yml up -d
```

### 4. Verify

```bash
# Server health check
curl http://localhost:4000/health

# New risk template endpoint
curl http://localhost:4000/api/plumbing/risk-template | head -c 200

# Risk register for a deal (should return 226 rows)
curl "http://localhost:4000/api/deals/aurora-prime-data-campus/risk-register" | python -m json.tool | grep '"total"'
```

Expected output for the last command: `"total": 83` (74 universal + 9 data centre sector-specific risks).

---

## Alternative: Apply schema changes without data wipe

If you need to preserve existing data, connect directly to the running postgres container and run the new DDL manually:

```bash
docker exec -it <postgres-container-name> psql -U sesame -d sesamestreet
```

Then paste the relevant `CREATE TABLE` and `INSERT` blocks from `postgres/init.sql` starting at the comment:

```
-- ═══ RISK REGISTER — taxonomy, deal register, history ═══
```

The statements all use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` so they are safe to run against an existing database.

---

## Branch reference

All changes are on branch `claude/romantic-tu`. The relevant commits are:

```
177c07f  feat: 226-risk taxonomy, deal risk register, and JPS register UI
b68ccc1  feat: Plumbing section with revenue risk template viewer
d508b2a  ui-phase4: JPS analytics workbench
```
