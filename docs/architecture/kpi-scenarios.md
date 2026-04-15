# KPI scenarios architecture

## Purpose

Every deal's sector KPIs carry two classes of expectation:

1. **Management case / IC baseline** — the expected trajectory over time, set at IC approval and frozen.
2. **Stress cases** — downside trajectories set where the IC identified a material risk to a specific KPI, or a **combined downside** bundling several risks.

Both classes are **time series** (one value per reporting period), not scalars. Both live in `forecast_period_items` under the same machinery that holds financial-line forecasts, so they inherit versioning, immutability at IC freeze, and reforecast semantics automatically.

This document describes the shape and the writer/reader contract.

## Scope

Applies to any `line_key LIKE 'sector_kpi_%'` under any `forecast_case_version`. The same tables are also used for financial forecasts (revenue, CFADS, DSCR, leverage, etc.) — KPIs are modelled as additional rows, not as a separate subsystem.

## Concepts

| Concept | How it's represented |
|---|---|
| KPI identity per slot | `line_item_definitions` row with `section='sector_kpi'`, `line_key='sector_kpi_N'` |
| Per-deal KPI label | `deal_line_item_labels (deal_id, line_key, display_label, ordinal)` — gives Gatwick's `sector_kpi_1` the label "Passengers (millions)" |
| Scenario | `forecast_cases` row with `scenario_kind ∈ {management_case, credit_case, lender_case, combined_downside, single_variant_stress, custom}` |
| Scenario version | `forecast_case_versions` row — allows reforecasting (v1, v2, v3...) while preserving historical versions |
| Trajectory value | `forecast_period_items (forecast_case_version_id, reporting_period_id, line_key, value)` — unique per cell |
| Link to the motivating risk | `forecast_cases.driving_risk_id` → `deal_risk_register(id)` — set for `single_variant_stress` cases; NULL for combined downsides and management cases |

### The `scenario_kind` values

- **`management_case`** — the IC-memo baseline. Every KPI actively monitored by the deal should have a management case trajectory. One per deal.
- **`credit_case` / `lender_case`** — lender-adjusted expected case. Typically modelled on financials, not KPIs. One per deal.
- **`combined_downside`** — a single aggregate downside bundling multiple risks stressed together. One per deal. This is the scenario the portfolio dashboard treats as "the" stress line.
- **`single_variant_stress`** — an individual sensitivity on one identified risk (e.g. "P90 wind resource", "pandemic passenger shock"). Sparse: only populated where the IC defined a stress on a specific KPI. Zero, one, or many per deal. Always links back to a `deal_risk_register` row via `driving_risk_id`.
- **`custom`** — escape hatch for bespoke scenarios. Avoid unless justified.

### Why single-variant stresses are their own `forecast_case`

A single-variant stress (wind resource at P90, passenger pandemic shock, construction cost overrun, etc.) represents one IC-identified risk's downside projection. It belongs on the same time axis as the management case but in its own scenario, because:

- Multiple independent stresses can coexist on the same deal. Each needs its own trajectory.
- Reforecasting is per-scenario: the wind-resource stress can be re-cut without touching the construction-cost stress.
- Attribution matters. The UI needs to tell the analyst *which* risk drove *which* downside line. The FK back to the risk register entry makes that lossless.

## Writer contract

Any code path that writes KPI expectations must:

1. **Find or create** a `forecast_cases` row for the deal with the right `scenario_kind`. For single-variant stresses, also populate `driving_risk_id` and `stress_label`.
2. **Find or create** an active `forecast_case_version` row under that case.
3. **Insert one `forecast_period_items` row per (period, KPI)** trajectory point. Use `ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING` for idempotency.

The `topsheet_importer` does this when it processes the new **"KPI Scenario Series"** tab on the v9 Excel template. Manual seed scripts (`scripts/ingest-gatwick.sql`, etc.) do it directly.

### Immutability

Once a `forecast_case_version` has `is_active = TRUE` and an approval timestamp recorded in `forecast_model_metadata.approved_at`, its `forecast_period_items` rows are conceptually immutable. Reforecasting creates a new version (v2), deactivates v1 (`is_active = FALSE`), and writes a fresh set of rows under v2. The old rows stay intact as a historical record.

## Reader contract

The API exposes KPI scenarios under `GET /api/deals/{slug}/topsheet` in a `kpiScenarios` block:

```json
{
  "kpiScenarios": [
    {
      "kpi_key": "sector_kpi_1",
      "kpi_label": "Passengers (millions)",
      "management_case": {
        "forecast_case_id": 31,
        "forecast_case_version_id": 34,
        "version_label": "IC Approval v1 (April 2019)",
        "case_name": "Original Management Case (April 2019)",
        "series": [
          { "period_flag": "FY2025", "period_label": "FY 2025", "period_ordinal": 7,
            "value": 44.0, "forecast_period_item_id": 12345 }
          /* … one entry per period */
        ]
      },
      "stress_cases": [
        {
          "forecast_case_id": 42,
          "forecast_case_version_id": 43,
          "case_key": "gatwick-downside",
          "case_name": "Combined downside",
          "scenario_kind": "combined_downside",
          "stress_label": null,
          "driving_risk_id": null,
          "driving_risk_code": null,
          "series": [ /* … */ ]
        },
        {
          "forecast_case_id": 44,
          "forecast_case_version_id": 45,
          "case_key": "gatwick-stress-pandemic",
          "case_name": "Stress — pandemic passenger shock",
          "scenario_kind": "single_variant_stress",
          "stress_label": "Pandemic passenger shock",
          "driving_risk_id": "848fa089-3805-481b-9030-eae684b3ca63",
          "driving_risk_code": "RISK-AP-001",
          "series": [ /* … */ ]
        }
      ]
    }
  ]
}
```

`stress_cases` are sorted with `combined_downside` first, then single-variant stresses alphabetically by `case_key`. Only rows under active `forecast_case_versions` are returned.

## Observation pairing

`deal_kpi_observations` captures reported actuals against IC expectations. After this change:

- `observed_value` — actual as reported in the compliance certificate.
- `base_case_target` / `stress_case_target` — **denormalised** display values at the time the observation was written. These stay as a snapshot even if the underlying forecast is reforecast later (audit trail).
- `base_forecast_item_id` / `stress_forecast_item_id` (new) — FK pointers to the exact `forecast_period_items` rows used to compute `deviation_to_stress`. Lets us trace which version + period the observation was compared against.
- `deviation_to_stress` — computed per period against the management-case and combined-downside values matching the observation's reporting period:
  ```
  (for higher_is_better)
  deviation_to_stress = (mgmt_value − observed) / (mgmt_value − stress_value) × 100
  ```
  0% = at management case, 50% = half-way to combined downside, 100% = at combined downside, >100% = worse than combined downside. Banded to `on_track` ≤ 50%, `watch` ≤ 90%, `approaching_stress` < 100%, `breached_stress` ≥ 100%.

## Migration note

`deal_kpi_targets` (scalar-per-scenario) was retired in favour of this model. The migration copied each old scalar value across every reporting period as a constant-trajectory bridge. Newly authored scenarios should write actual time-varying values.

## Worked example — Gatwick

Gatwick has three KPI scenarios:

| Scenario | `scenario_kind` | `driving_risk_id` | What it covers |
|---|---|---|---|
| Original Management Case (April 2019) | `management_case` | null | IC baseline for all 5 Gatwick KPIs, FY2025–FY2033 |
| Combined downside | `combined_downside` | null | All 5 KPIs simultaneously stressed (passengers, retail spend, margin, coverage, leverage) |
| Stress — pandemic passenger shock | `single_variant_stress` | `RISK-AP-001` UUID | Only `sector_kpi_1` (passengers): 15m in FY2025, recovery to 50m by FY2030 |

The "Pandemic passenger shock" stress line only appears on the Passengers KPI chart (because it's the only KPI it stresses). The combined-downside band is visible on all 5 KPI charts.

## Related documents

- [docs/architecture/audit-trail.md](../architecture/audit-trail.md) — the five-column provenance block applied to every KPI-writing row via `forecast_period_items` when the ingestion engine writes it.
- [docs/topsheet-template-instructions.md](../topsheet-template-instructions.md) — how the v9 Excel template "KPI Scenario Series" tab maps to these rows.
