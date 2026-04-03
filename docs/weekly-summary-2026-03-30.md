# Weekly Development Summary — 30 Mar to 3 Apr 2026

## Portfolio Dashboard (JPS Page)
- **8 KPI cards**: Exposure, Deals, WA Rating (Moody's scale), WA Spread, WA Life, Wtd DSCR, Headroom, Watchlist
- **8 charts in 2x4 grid**: Sector treemap, Country donut, Security Ranking, Format, Credit Rating bar, Performance Grade bar, Trend donut, Covenant Status donut — all with legend-left/chart-right layout
- **Sortable deal table**: Click any column header (desc/asc/clear) with 15 columns including Ratio Status and Reserves
- **Dynamic filtering**: All summary data and charts update in real time based on filter selections

## Performance Grade Engine
- DSCR + collateral headroom assessment with 4-grade scale
- Trend detection across 3 periods (improving/flat/deteriorating/deteriorating_rapidly)
- Auto-watchlist flagging and alert generation
- Auto-compute hook on financial period commits

## Financial Template Explorer (Templates page)
- Interactive 67-row generic cashflow model with click-through to sector sub-templates
- All 8 sectors defined: data centre, wind farm, port, airport, toll road, social infrastructure, real estate, clean tech hub
- 21 sector-specific covenant ratios (LLCR, PLCR, LTV, ACR, PMICR, etc.)

## Deal TopSheet Visualisation
- Full single-scroll page at `/deals/[slug]/topsheet` with 10 sections
- Forecast grid: 181 line items x 40 periods with case selector (Management, Credit, Combined Downside, Actuals)
- Liquidity & Reserve Accounts table with cash/LC/PCG funding breakdown and shortfall tracking

## Normalised Data Architecture (new tables)
- **deal_reporting_schedule** + **deal_reporting_periods** — full life-of-deal period calendar
- **line_item_definitions** — 181 line items across 21 sections (cashflow + covenants + P&L + balance sheet + Moody's ratios)
- **period_financial_items** — one row per line item per period for actuals
- **forecast_period_items** — write-once grid for frozen IC memo projections (supports 500 deals at ~16M rows)
- **forecast_model_metadata** — source model provenance
- **deal_kpi_targets** + **deal_kpi_observations** — IC memo KPI monitoring with deviation-to-stress
- **deal_jurisdiction_splits** — multi-country revenue/operations proportions
- **account_instrument_allocations** — which account holds which specific tranche

## Moody's Financial Ratios
- FFO, RCF, Total Debt Service as computed building blocks
- 12 ratios: FFO/Net Debt, RCF/Net Debt, FFO Interest Coverage, AICR, Total DSCR, ADSCR Break-Even, and Moody's-adjusted variants
- Standard adjustment inputs: operating leases, pension deficit, hybrid debt, securitisations

## Multi-Tranche & Holdco Support
- Pari-passu grouping, instrument format, issuing entity linkage
- Security ranking with Holdco/Majority Holdco/Minority Holdco options
- WA Credit Rating: lower-of-two / middle-of-three agency logic with Moody's scale

## Analytics Rules Page
- 14 documented rules across 5 categories with click-to-expand methodology
- Covers every scoring function, threshold, and weighted average in the system

## Safe Database Migrations
- `postgres/migrations.sql` — idempotent schema changes, no data wipe needed
- `bin/db-rebuild.sh` — auto-backup before any rebuild
- Renamed "Lender Case" to "Credit Case" throughout

## Documentation
- `docs/topsheet-spec-project-finance.md` — complete PF TopSheet field inventory
- `docs/moodys-ratio-definitions.md` — all Moody's ratios mapped to our line items
- `docs/nim-model-topsheet-gap-analysis.md` — NIM financial model analysis
- `docs/deal-onboarding-template.xlsx` — 8-tab Excel template for new deal ingestion
