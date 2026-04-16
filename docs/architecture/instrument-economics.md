# Instrument economics architecture

## Purpose

`capital_structure_instruments` captures the pricing, fees, and time-varying margin for every debt instrument in a deal's capital stack. This document describes the schema and the two computed layers that sit on top of it:

1. **Private-debt premium** — the bps captured above the IC-memo author's view of comparable liquid-market new-issue pricing.
2. **Effective margin at time T** — base-margin tier active at T plus any active ESG adjustments.

## Problem this solves

Prior to this migration, `margin_bps` was a single field asked to represent three different concepts:

| Instrument format | What was stored in margin_bps | What it should be |
|---|---|---|
| Floating-rate loan | Credit spread over SOFR/SONIA | Credit spread (correct) |
| Fixed-rate bond | **Full coupon** (e.g. 612 for 6.125%) | Credit spread only (e.g. 212 above gilts) |
| Parent-company loan | **Full coupon** (e.g. 900 for 9%) | Credit spread only |

The overstated WA Spread on the dashboard (Gatwick 426bp, M6 Toll 900bp) traced directly to this. The fix decomposes the coupon into its components and introduces `spread_bps` as the canonical credit-spread field.

## Pricing components (all instrument formats)

| Column | Role |
|---|---|
| `coupon_bps` | Full coupon at issuance (fixed-rate bonds/notes). E.g. 612 for a 6.125% bond. |
| `base_rate_at_issuance_bps` | Snapshot of the risk-free / benchmark rate at pricing (gilt yield, treasury, SOFR fix at issuance). |
| `spread_bps` | Credit spread at issuance = `coupon_bps − base_rate_at_issuance_bps`, or simply the margin for floating-rate instruments. **This is the canonical field for WA Spread aggregation.** |
| `benchmark_spread_bps` | IC-memo author's view of the comparable new-issue credit spread for a peer deal at pricing. Set manually from the IC memo. |
| `private_debt_premium_bps` | **GENERATED** `spread_bps − benchmark_spread_bps`. What the author captured above the liquid-market comp. |
| `floor_bps` | Base-rate floor (common post-2020 in leveraged loans). |
| `payment_frequency` | `monthly` / `quarterly` / `semi_annual` / `annual`. |
| `day_count_convention` | `act_360` / `act_365` / `30_360`. |

`margin_bps` is **retained** for backward compatibility. WA Spread uses `COALESCE(spread_bps, margin_bps)` until legacy rows are fully migrated.

## Loan fee economics

| Column | Purpose |
|---|---|
| `upfront_fee_bps` | Arrangement / OID paid at drawdown (bps of committed or drawn amount). |
| `upfront_fee_basis` | `committed` / `drawn`. |
| `commitment_fee_pct_of_margin` | Fee on undrawn, expressed as **% of margin** (e.g. 35.00 = 35% of margin). |
| `commitment_fee_bps` | Alternative absolute bps on undrawn when quoted that way. |
| `utilisation_fee_tiers` | JSONB tiered fee schedule: `[{threshold_pct, fee_bps}, ...]`. |
| `ticking_fee_bps` / `ticking_fee_start` | Delayed-draw ticking fee before main commitment period. |
| `agent_fee_annual` | Flat annual agent fee (native currency). |
| `extension_fee_bps` | Fee to exercise extension option. |
| `exit_fee_bps` | Back-end fee at repayment. |

## Prepayment / call protection

| Column | Purpose |
|---|---|
| `prepayment_protection_type` | `make_whole` / `hard_call` / `soft_call` / `none`. |
| `prepayment_schedule` | JSONB declining-premium: `[{from_year, premium_pct}, ...]`. |
| `soft_call_until` | Date until which soft call applies. |
| `mfn_sunset_months` | Most-favoured-nation pricing-protection sunset period. |
| `call_protection` (legacy TEXT) | Freeform notes; retained for backward compat. |

## Yield & acquisition economics (for instruments we hold)

| Column | Purpose |
|---|---|
| `acquisition_channel` | `primary` / `secondary_purchase`. |
| `purchase_price` | Price paid, par = 100.00 (e.g. 99.5 for primary with OID). |
| `original_issue_price` | OID-adjusted issue price at primary. |
| `ytm_bps` | Yield-to-maturity at our acquisition. |
| `ytw_bps` | Yield-to-worst (call-adjusted). |
| `has_pik` / `pik_margin_bps` / `pik_toggle` | PIK component details. |

## Margin ratchet child table

Time-varying and event-triggered margin changes live in `capital_structure_margin_ratchets`. Two kinds of rows, distinguished by `ratchet_kind`:

### `ratchet_kind = 'base_margin'` (absolute tiers)

Each row is an absolute-margin tier active during a specific period or when a covenant threshold is met. Triggered by:
- `time_based` — fixed date range (construction period, post-COD)
- `leverage` / `dscr` / `icr` / `coverage_ratio` — triggered by financial ratio
- `event_based` — triggered by a deal event (COD, financial close, rating upgrade)
- `pik_toggle` — toggle to PIK under stress

### `ratchet_kind = 'esg_adjustment'` (additive signed deltas)

Each row is a **signed bps delta** (positive or negative) applied on top of the active base-margin tier when a linked ESG SPT is met or missed. Classic Sustainability-Linked Loan / Sustainability-Linked Bond pattern.

Schema:

```
id                      SERIAL PK
instrument_id           UUID FK → capital_structure_instruments(id)
step_order              INTEGER (ordinal within instrument)
ratchet_kind            TEXT: 'base_margin' | 'esg_adjustment'
trigger_type            TEXT: 'time_based' | 'leverage' | 'dscr' | 'icr' | 'coverage_ratio' | 'event_based' | 'esg_kpi' | 'pik_toggle'
trigger_metric          TEXT: free-text reference (e.g. 'net_leverage', 'sector_kpi_3', 'carbon_intensity_tco2_per_pax')
trigger_operator        TEXT: '<' | '<=' | '=' | '>=' | '>' | 'between'
trigger_threshold       NUMERIC
trigger_threshold_upper NUMERIC  -- for 'between'
effective_from, effective_to   DATE
adjustment_mode         TEXT: 'absolute' | 'additive'   -- enforced to match ratchet_kind
margin_bps              INTEGER  -- new total for 'absolute', signed delta for 'additive'
pik_portion_bps         INTEGER  -- PIK split (absolute mode only)
step_type               TEXT: 'initial' | 'step_up' | 'ratchet_down' | 'pik_toggle' | 'default_margin' | 'esg_reward' | 'esg_penalty'
notes                   TEXT
(+ 5-col source_* audit-trail block)
```

**Invariant enforced by CHECK constraint:** `ratchet_kind = 'base_margin'` implies `adjustment_mode = 'absolute'`; `ratchet_kind = 'esg_adjustment'` implies `adjustment_mode = 'additive'`.

### Linking ESG KPIs to observations

`trigger_metric` on an ESG row can reference a `sector_kpi_N` slot (per-deal label in `deal_line_item_labels`). That lets the platform track actual progress against the SPT via the same `deal_kpi_observations` + `forecast_period_items` machinery used for all KPI monitoring. If `sector_kpi_3` = "Carbon Intensity (kgCO2/pax)" for Gatwick, the ESG ratchet row sets `trigger_metric = 'sector_kpi_3'` and `trigger_threshold = 1.5`, and the status of the SPT is readable from the KPI observation stream.

## Effective-margin computation

The capital-stack API computes each instrument's **current effective margin** per the convention:

```
effective_margin_bps
  = (latest active base_margin tier's margin_bps)
  + SUM(all currently-active esg_adjustment tier's margin_bps)
```

"Active" means the tier's `effective_from` is null or ≤ today AND (`effective_to` is null or > today). The API falls back to `spread_bps` (or `margin_bps`) if no ratchet tiers are defined.

Returned on each instrument in the capital-stack API:

- `effective_margin_bps` — current effective margin (base + ESG deltas)
- `effective_margin_base_bps` — base tier only
- `effective_margin_esg_adjustment_bps` — ESG delta only
- `margin_ratchet_schedule` — full ordered array of all tiers for the instrument

## Worked examples

### Aurora Prime Senior Term Loan A
Floating-rate loan with construction-ramp → post-COD ratchet:

| step_order | ratchet_kind | trigger | margin_bps | step_type |
|---|---|---|---|---|
| 1 | base_margin | time_based 2023-06-30 → 2025-09-01 | 325 | initial |
| 2 | base_margin | leverage < 5.0x, from 2025-09-01 | 275 | ratchet_down |
| 3 | base_margin | leverage < 4.0x, from 2025-09-01 | 225 | ratchet_down |

Effective today (2026-04-16, post-COD, leverage ~5.5x): 275bp (tier 2 applies; tier 3 not yet triggered).

### Gatwick SLB 3.625% 2033 Bond
Fixed-rate bond at 137bp spread with two ESG SPTs:

| step | ratchet_kind | trigger | bps | step_type |
|---|---|---|---|---|
| 1 | base_margin | time_based from 2024-10-16 | 137 | initial |
| 2 | esg_adjustment | carbon_intensity ≤ 1.5 by 2027 | −10 | esg_reward |
| 3 | esg_adjustment | carbon_intensity > 1.5 by 2027 | +10 | esg_penalty |
| 4 | esg_adjustment | renewable_electricity ≥ 100% by 2030 | −5 | esg_reward |
| 5 | esg_adjustment | renewable_electricity < 100% by 2030 | +5 | esg_penalty |

Effective today (before SPT measurement dates): 137bp (no ESG adjustments have triggered yet because both `effective_from` dates are in the future).

Once SPT #1's 2027-12-31 measurement date passes, exactly one of tiers 2 or 3 will become active depending on the actual carbon intensity recorded in the KPI observation stream.

## Writer contract

- **TopSheet Tab 2** carries the per-instrument pricing + fee columns (`coupon_bps`, `base_rate_at_issuance_bps`, `spread_bps`, `benchmark_spread_bps`, `payment_frequency`, `upfront_fee_bps`, `commitment_fee_pct_of_margin`).
- **TopSheet Tab 2b "Margin Ratchets"** carries the child-table rows. Each row references its instrument via `instrument_ref` matching the Tab 2 instrument_name.
- `server/topsheet_importer.py::_upsert_margin_ratchets` resolves refs, deletes existing ratchets for touched instruments, and re-inserts from the sheet.

## Reader contract

- `/api/deals/{slug}/topsheet` returns every instrument economics column directly on each `capitalStructure[]` row.
- `/api/deals/{slug}/capital-stack` returns the aggregated `layers` (unchanged) plus, for each instrument, `effective_margin_bps`, `effective_margin_base_bps`, `effective_margin_esg_adjustment_bps`, and the full `margin_ratchet_schedule`.
- Portfolio WA Spread calc uses `COALESCE(spread_bps, margin_bps)` weighted by `drawn_amount`.

## Migration note

The initial migration:
1. Added ~25 columns to `capital_structure_instruments`
2. Created the `capital_structure_margin_ratchets` child table
3. Backfilled `spread_bps` for floating-rate instruments (where margin IS the spread)
4. Backfilled `coupon_bps`, `base_rate_at_issuance_bps`, `spread_bps`, `benchmark_spread_bps` for the specific fixed-rate instruments in the demo portfolio
5. Seeded example ratchets on Aurora's Senior Term Loan A and Gatwick's SLB bond

All operations are idempotent (guarded by `IS NULL` or `NOT EXISTS` checks).
