# Sesame Street — Private Credit Monitoring Platform

## What This Is
A demo platform for monitoring private credit / infrastructure debt portfolios. Built for institutional lenders who need to track covenant compliance, financial performance, and credit risk across a portfolio of project finance deals.

## Architecture
- **Client**: Next.js 15 (App Router), React 19, TypeScript — runs on port 3000
- **Server**: Python (Starlette), single `server/main.py` file (~19k lines) — runs on port 4000
- **Database**: PostgreSQL 16 (Alpine) — schema in `postgres/init.sql`
- **Docker**: All services via `docker/docker-compose.yml`, images built from `docker/*.Dockerfile`
- **Working directory for docker commands**: `C:\Users\jpste\OneDrive\Documents\Startups\DEMO\xsesamestreet\docker`

## Key Conventions
- Server is a single large Python file (`server/main.py`) — search by endpoint path or function name
- CSS is in `client/app/globals.css` — design system uses CSS variables (`--accent`, `--good`, `--warning`, `--critical`)
- Badge tones: `.badge.good` (green), `.badge.warning` (orange), `.badge.critical` (red), `.badge.neutral` (grey)
- Panel/card classes: `.panel`, `.section-panel`, `.metric-card`
- All tables use `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT DO NOTHING` for idempotency

## Database Rebuilds — IMPORTANT
**Never wipe the postgres data directory without backing up first.**
- Safe rebuild (preserves data): `bin/db-rebuild.sh`
- Full reset (WIPES data): `bin/db-rebuild.sh --reset`
- Manual backup: `bin/db-backup.sh`
- Schema changes go in `postgres/migrations.sql` (idempotent, runs on existing DB)
- The `init.sql` only runs on first creation; `migrations.sql` handles updates

## Docker Workflow
```bash
# From the worktree root:
docker build -f docker/server.Dockerfile -t sesamestreet-server:latest .
docker build -f docker/postgres.Dockerfile -t sesamestreet-postgres:latest .

# From docker/ directory:
docker compose up -d server    # starts server + postgres
docker compose up -d postgres  # just postgres

# Apply migrations to running database:
docker exec docker-postgres-1 psql -U sesame -d sesamestreet -f //migrations//migrations.sql
```

## What's Been Built

### Core Platform
- 7 demo deals (all data centre sector), full seed data
- Deal pages with structure, covenants, financials, risk register
- Document intake pipeline with proposal/commit workflow
- Activity events, notifications, to-dos (database-persisted)

### Performance Grade Engine (`server/grade_engine.py`)
- DSCR + collateral headroom assessment with 4-grade scale
- Trend detection (improving/flat/deteriorating/deteriorating_rapidly)
- Auto-watchlist flagging (grade 3+ or deteriorating trend)
- Alert generation for grade changes and trend warnings
- Auto-compute hook in `commit_document_proposal()` on financial period commits

### JPS (Portfolio Summary) Page
- **Portfolio summary dashboard** above deal table with Recharts charts
  - 6 KPI cards: Exposure, Deals, WA Spread, Wtd DSCR, Headroom, Watchlist
  - Grade distribution bar chart, sector exposure treemap
  - Trend and covenant status donut charts
  - Attention lists: watchlist, deteriorating, covenant breaches
- **Sortable deal table** — click any column header (desc -> asc -> clear)
- **Filter bar** — organisation, owner, sector, grade, watchlist, search
- Summary updates dynamically based on active filters

### Financial Template System (Plumbing page)
- Interactive 67-row generic cashflow model (F.5.2)
- Click-through to sector sub-templates for all 8 sectors:
  data_centre, wind_farm, port, airport, toll_road, social_infrastructure, real_estate, clean_tech_hub
- 21 sector-specific covenant ratios (LLCR, PLCR, LTV, ACR, PMICR, etc.)
- Every sector has: Other Revenue, Other Opex, Power Cost

### Normalised Financial Data Architecture
- `deal_reporting_schedule` — per-deal reporting calendar
- `deal_reporting_periods` — materialised period slots (5 quarters seeded per deal)
- `line_item_definitions` — chart of accounts (67 generic + 56 subcategory slots = 123 total)
- `period_financial_items` — one row per line item per period (ready for ingestion engine)
- `deal_line_item_labels` — per-deal display names from template JSONB

### Credit Ratings & Spread
- External ratings (Moody's, S&P, Fitch) + internal credit score on deals
- Capital structure instruments seeded for all 7 deals with margin_bps
- WA Spread computed from exposure-weighted instrument margins

## What's Next
- **Ingestion engine**: Extract financial data from uploaded documents into `period_financial_items`
- **Period generation**: Auto-generate `deal_reporting_periods` from schedule
- **Computed rows**: EBITDA, CFADS, ratios calculated from component line items
- **Variance analysis**: Line-level forecast vs actual comparison
- **Multi-sector portfolio**: Add non-data-centre deals to demonstrate sector diversity
- **Deal classifications**: Revenue risk codes (P/V/D) need completing for all deals

## Branch Info
- Main development branch: `claude/romantic-tu`
- PR #1: https://github.com/brodagroupsoftware/xsesamestreet/pull/1
