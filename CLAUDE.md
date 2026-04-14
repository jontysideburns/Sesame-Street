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
- 12 demo deals across multiple sectors and currencies:
  - **Data centre (USD):** Aurora Prime, Granite Switchyard, Meridian Edge (EUR),
    Ion Harbor, Summit Loop, Cobalt Grid, Apollo Edge
  - **Infrastructure (GBP/EUR):** North Sea OWF, Wigmore Solar, M6 Toll,
    Getlink Eurotunnel, Gatwick Airport
  - **Real estate (EUR):** Beta PRS, Delta PRS, Project Alpha Port
- Deal pages with structure, covenants, financials, risk register
- Document intake pipeline with proposal/commit workflow
- Activity events, notifications, to-dos (database-persisted)

### Engines (all in `server/`)
- **Performance Grade Engine** (`grade_engine.py`) — DSCR + collateral headroom
  assessment with 4-grade scale; trend detection; auto-watchlist flagging;
  alert generation. Auto-compute hook in `commit_document_proposal()` on
  financial period commits.
- **Plan Variance Trend Engine v5** (in `main.py`, `detect_trends`) — headroom
  erosion vs management case on one cash-cover ratio + one collateral ratio
  per deal; 7-band classification from rapid improvement to rapid deterioration.
- **Covenant Testing Engine** — runs every covenant in `covenant_thresholds`
  against actuals, writes tiered test results (performing/lockup/trigger/default)
  into `covenant_tests`.
- **Distribution Assessment Engine** (`assess_distribution`, data-driven) —
  reads `deal_distribution_conditions`, evaluates each gate, returns blocker
  count + status (allowed / review_required / restricted / blocked).
- **Variance Engine** — actuals vs management case, direction + materiality.
- **Three-Case Comparison Engine** — actuals vs management / lender /
  combined-downside simultaneously.
- **Ratio Reconciliation Engine** — borrower-reported ratios vs platform-computed.
- **Risk Narrative Generator** (`generate_risk_narrative`) — template-driven
  deterministic synthesis from structured risk register fields.
- **Deliverables Calendar with Business Day Engine** — modified-following
  convention, 483 holidays × 7 jurisdictions, per-deal and portfolio endpoints.
- **Reserve Account History Engine** — time-series of required / actual /
  expected / shortfall / variance with top-up alerts.
- **Capital Structure Engine v8** (`capital_structure_engine.py`, see below).
- **FX Engine** (in `main.py`) — EUR-base cross-rates, per-deal native
  currency, portfolio-level conversion at spot.

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
- `deal_reporting_schedule` — per-deal reporting calendar (with forecast horizon extension)
- `deal_reporting_periods` — materialised period slots with `period_type` (historical/current/forecast)
- `line_item_definitions` — chart of accounts (181 total: cashflow + covenants + P&L + balance sheet + Moody's ratios)
- `period_financial_items` — one row per line item per period for ACTUALS from borrower reporting
- `deal_line_item_labels` — per-deal display names from template JSONB

### Life-of-Investment Forecast Storage
- `forecast_period_items` — write-once grid: (scenario version × period × line item) = value
  - Frozen at IC approval, immutable after ingestion
  - Supports 500 deals × 60 periods × 181 items × 3 cases = ~16.3M rows (~1.9GB)
- `forecast_model_metadata` — source model provenance (name, date, assumptions, who approved)
- Forecast cases: management_case, lender_case, combined_downside
- Reforecasting: PM creates a new `forecast_case_version` — old version stays frozen as historical record
- Variance = `period_financial_items.approved_value - forecast_period_items.value`

### Multi-Tranche Holdings & Jurisdiction
- `account_instrument_allocations` — which account holds which specific tranche
- `deal_jurisdiction_splits` — multi-country revenue/operations proportions
- Pari-passu grouping, issuing entity linkage, instrument format on capital structure

### IC Memo KPI Monitoring
- `deal_kpi_targets` — base case and stress case KPI expectations from IC memo
- `deal_kpi_observations` — actual KPI values with `deviation_to_stress` (0% = at base, 100% = at stress)

### Moody's Financial Ratios
- FFO, RCF, Total Debt Service as computed building blocks
- 12 Moody's ratios: FFO/Net Debt, RCF/Net Debt, AICR, Total DSCR, ADSCR Break-Even, etc.
- Standard adjustment inputs: operating leases, pension deficit, hybrid debt, securitisations

### Credit Ratings & Spread
- External ratings (Moody's, S&P, Fitch) + internal credit score on deals
- Capital structure instruments seeded for all 7 deals with margin_bps
- WA Spread computed from exposure-weighted instrument margins

### Feeds — Market TopSheet (`/feeds`)
- Centralised market-data feeds consumed by the platform API
- Live FX reference rate table (13 currencies, ECB-seed snapshot)
- Placeholder cards for planned feeds: risk-free rates (SONIA / €STR / SOFR),
  swap curves, credit spreads (iTraxx / CDX), government yields, inflation
  indices, commodities, equity & property indices, carbon / ESG
- Sidebar item between Calendar and Portfolio

### TopSheet Excel template (v8, 26 tabs)
- `docs/topsheet-data-template-v8.xlsx`
- Covers every field the platform stores per deal
- **Tab 1 Deal Identity** — includes Distribution Mechanics block (v8)
- **Tab 2 Capital Structure** — 25 columns incl. capital-structure taxonomy
  (entity_level, ownership_pct, structural_seniority, ratio_consolidation_level,
  cashflow_priority_rank, etc.)
- **Tab 7 Corporate Entities** — 12 columns incl. ownership / control /
  consolidation fields (v8)
- **Tab 8 Covenant Thresholds** — incl. ratio_level (v8)
- **Tab 20 Onboarding Snapshot** — write-once, frozen at investment
- **Tab 21 Obligations & Deliverables** — drives the Deliverables Calendar
- **Tab 22 Distribution Conditions** — full lock-up / trigger / EOD register
- Generator: `scripts/create-topsheet-template.py`
- Importer: `server/topsheet_importer.py`
- Instructions: `docs/topsheet-template-instructions.md`
- Full field spec: `docs/topsheet-complete-specification.md`

### Deal TopSheet Visualisation
- Full-page single-scroll view at `/deals/[slug]/topsheet`
- Sections: Identity, Onboarding Snapshot, Capital Structure, Counterparties,
  Reserves, KPIs, Performance, Tail & Renewal, Risk, Development,
  Distribution Mechanics + Conditions register, Forecasts
- Sourced from the 26-tab v8 Excel template (see TopSheet Excel template
  section below)
- Accessed via "View Full TopSheet" button on deal page

### Capital Structure Taxonomy (v8)
- `capital_structure_instruments` columns (per instrument): `entity_level`,
  `entity_name`, `ownership_pct`, `structural_seniority`,
  `ratio_consolidation_level`, `intercompany_lender`,
  `subordination_agreement`, `cashflow_priority_rank`
- `corporate_entities` columns (per entity): `ownership_pct`, `ownership_type`,
  `control_type`, `consolidation_method`, `within_security_perimeter`,
  `ratio_level`
- `covenant_thresholds.ratio_level` — entity level the covenant is tested at
- **`server/capital_structure_engine.py`**:
  - `assign_cashflow_priority_ranks(instruments)` — auto-assigns rank 1 to
    the closest-to-cashflows external debt, +1 per structural level after
    that, +1 for contractual subordination, +1 extra for `minority_holdco`
    if OpCo debt exists. Shareholder loans and intercompany loans stay
    unranked. Manual overrides are respected.
  - `proportional_consolidation(entities)` — applies ownership% to BOTH
    cashflows AND debt (NOT accounting IFRS full-consolidation), returns
    consolidated EBITDA, CFADS, Debt, DS, DSCR, ND:EBITDA.
  - `validate_capital_structure(instruments, entities)` — warnings/errors
    for missing entity_level, inconsistent pari-passu ranks, HoldCo-at-rank-1
    conflicts, etc.

### FX Architecture
- `fx_rates` table — ECB-style EUR-base reference rates (snapshot time-series)
- Cross-rate maths: amount_in_target = amount * (rate(EUR, target) / rate(EUR, source))
- Helper: `convert_amount(amount, from_ccy, to_ccy, ...)` in `server/main.py`
- Endpoint: `GET /api/fx/snapshot?reporting_currency=GBP|USD|EUR`
- Portfolio API: `?reporting_currency=` parameter (default GBP) converts every
  exposure aggregate (deal, holding, organisation, owner, account, total_aum)
  to the chosen currency at spot
- Deal-level endpoints stay in native currency — only the dashboard/portfolio
  layer aggregates across currencies
- Dashboard: `/jps?currency=GBP|USD|EUR` toggle, persists to localStorage
- Seed: 13 currencies (EUR, USD, GBP, JPY, CHF, AUD, CAD, NOK, SEK, DKK,
  NZD, SGD, HKD) as at 2026-04-14, source 'ECB-seed'. Replace daily when
  live ECB feed (e.g. Frankfurter API) is wired up.

### Documentation
- `docs/topsheet-spec-project-finance.md` — complete PF TopSheet field inventory
- `docs/moodys-ratio-definitions.md` — Moody's ratios mapped to our line items
- `docs/nim-model-topsheet-gap-analysis.md` — NIM financial model analysis

## What's Next
- **Ingestion engine**: Extract financial data from uploaded models into `forecast_period_items` + `period_financial_items`
- **Period generation**: Auto-generate full life-of-deal `deal_reporting_periods` from schedule
- **Computed rows**: Auto-calculate EBITDA, CFADS, FFO, ratios from component line items
- **Variance analysis**: Line-level actual vs frozen forecast comparison
- **Corporate TopSheet**: Separate template for holdco/corporate investments (vs PF/SPV)
- **Multi-sector portfolio**: Add non-data-centre deals to demonstrate sector diversity

## Branch Info
- Main development branch: `claude/romantic-tu`
- PR #1: https://github.com/brodagroupsoftware/xsesamestreet/pull/1
