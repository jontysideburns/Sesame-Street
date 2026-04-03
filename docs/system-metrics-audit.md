# System Metrics Audit — Current vs Legacy

## Summary

Only **Wigmore Solar (deal 9)** has been fully built out using the new data architecture. The original 7 data centre deals and North Sea OWF have legacy/partial data that needs to be brought up to the same standard.

## What Wigmore Solar Has (the target state)

| Capability | Status | Detail |
|-----------|--------|--------|
| Performance grade (headroom-based) | **Computed** | Grade 3, from grade_engine.py |
| Performance trend | **Computed** | Deteriorating rapidly, from 3-period erosion series |
| Auto-watchlist | **Computed** | TRUE, auto-set by grade engine |
| Forecast cases (management) | **Populated** | 748 line items across 44 periods |
| Forecast cases (credit) | **Populated** | 748 line items |
| Forecast cases (combined downside) | **Populated** | 748 line items |
| Actual period data (period_financial_items) | **Populated** | 64 items across 4 periods |
| Financial periods (legacy, for grade engine) | **Populated** | 3 periods with camelCase JSONB |
| Reporting periods (full calendar) | **Populated** | 44 semi-annual periods (2024-2045) |
| Performance assessment record | **Stored** | 1 assessment in performance_assessments |
| Covenant management_case_value | **Set** | 1.31 (from forecast) |
| Covenant threshold_default | **Set** | 1.05 |
| Headroom (relative) | **Computed** | 68.3% of expected cushion |
| KPI targets (base + stress) | **Populated** | 8 base + 5 stress |
| Reserve accounts | **Populated** | 2 accounts with funding detail |
| Counterparties | **Populated** | 5 counterparties |
| Deal charts (forecast vs actual) | **Rendering** | Line charts on deal page |

## What the Original 7 Data Centre Deals Have (legacy state)

| Capability | Status | Gap |
|-----------|--------|-----|
| Performance grade | **Static seed data** | Not computed by grade engine — grade set manually in INSERT |
| Performance trend | **NULL** | No assessment has been run |
| Watchlist | **Static seed data** | Aurora & Ion set TRUE manually, not from computation |
| Forecast cases | **Summary JSONB only** | forecast_case_periods has 1 period per case with summary metrics, NOT full line-item forecasts |
| Actual period data (period_financial_items) | **Empty** | No normalised actual data |
| Financial periods (legacy) | **3 periods each** | Has reported_metrics/expected_metrics JSONB — this is what the grade engine reads |
| Reporting periods | **5 each** (except Aurora: 40) | Only recent quarters, not full life-of-deal |
| Performance assessment | **None** | 0 assessments stored |
| Covenant management_case_value | **Set** | Populated from deal metrics |
| Covenant threshold_default | **Set** | 1.05 for all |
| Headroom (relative) | **100% for all** | Because current_value = management_case_value (no variance) |
| KPI targets | **Aurora only** | 10 base + 5 stress for Aurora, none for others |
| Reserve accounts | **All deals** | Seeded with balances |
| Counterparties | **Aurora only** | 6 counterparties, others have none |
| Deal charts | **Empty** | No forecast_period_items to chart |

## What North Sea OWF Has (partial state)

| Capability | Status | Gap |
|-----------|--------|-----|
| Performance grade | **Static** | "2 - In Line" from seed, not computed |
| Performance trend | **NULL** | No assessment |
| Forecast cases (management) | **Populated** | 985 line items (full forecast) |
| Actual period data | **Empty** | No actuals ingested |
| Financial periods (legacy) | **None** | 0 legacy periods |
| Reporting periods | **42** | Full calendar |
| Performance assessment | **None** | 0 assessments |

## Actions Required to Bring All Deals to Target State

### Per deal (deals 1-7):

1. **Generate full reporting period calendar** — extend from 5 quarters to full life-of-deal (like Aurora's 40 or Wigmore's 44)

2. **Create forecast_period_items** — populate management case line-item forecasts for all periods (currently only summary JSONB exists). Requires deriving cashflow from the deal's metrics.

3. **Create actual period_financial_items** — populate from the existing financial_periods reported_metrics JSONB (backfill).

4. **Run grade engine** — call `run_assessment()` on each deal to compute performance grade and trend from the financial_periods data. This will auto-set watchlist based on headroom erosion.

5. **Seed KPI targets** — create base case and stress case KPI targets for deals 2-7 (Aurora already has them).

6. **Seed counterparties** — create counterparty records for deals 2-7 (Aurora already has them).

### For North Sea OWF (deal 8):

1. **Create actuals** — populate period_financial_items with reported data
2. **Create financial_periods** — legacy format for grade engine
3. **Run grade engine**

### System-wide:

1. **Automated assessment trigger** — when new actual data is committed, automatically run `run_assessment()` on the deal (the hook exists in `commit_document_proposal()` but needs the data pipeline)

2. **Bridge legacy → new** — when the grade engine runs, it should write results to BOTH `performance_assessments` AND update `deals.grade`, `deals.watchlist`, `deals.performance_grade`

3. **Standardise grade labels** — done (now "Underperforming" everywhere)

4. **Standardise metric keys** — the grade engine expects camelCase (`seniorDscr`) in financial_periods JSONB, but period_financial_items uses snake_case (`senior_dscr`). The bridge needs to translate.
