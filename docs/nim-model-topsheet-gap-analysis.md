# NIM Financial Model — TopSheet Gap Analysis

## Deal Overview

**Model**: NIM 120910 for WestLB (September 2010)
**Entity**: Henderson Infrastructure Holdings (HIH) / John Laing Group
**Sector**: Social Infrastructure / PFI (Private Finance Initiative)
**Structure**: Holding company financing a portfolio of PFI concession assets across two funds
**Currency**: GBP (thousands)
**Reporting Frequency**: Semi-annual (June / December)

## What We Can Extract from the Model

### Deal Identity (F.1)
| Field | Value | Source |
|-------|-------|--------|
| Borrower | Henderson Infrastructure Holdings (HIH) | HIHCos sheet |
| Sponsor | John Laing Group | JLplc sheet |
| Sector | Social Infrastructure / PFI | Asset sheets |
| Deal Type | Holdco Acquisition Finance | Structure |
| Region | Multi-jurisdiction (UK, Europe, Americas, Asia) | Portfolio Diversification (Banks R76-80) |
| Currency | GBP | Throughout |
| Scenario | "Big Palio Bank Base Case" (Scenario 3) | Scenario_Manager |

### Capital Structure (F.2)
| Instrument | Type | Amount | Margin | Status |
|-----------|------|--------|--------|--------|
| HIH Facility #1 | Senior Secured | 127,000 (opening) | Swap 2.19% + Margin 4.0-5.0% | Repaid by Dec 2010 |
| HIH Facility #2 | Senior Secured | 0 (undrawn) | TBD | Available |
| JL Bank Facility | Corporate RCF | Stepped (200,000+) | LC costs 3.0% | Active, refinancing modelled |

### Key Financial Covenants (Banks sheet)
| Covenant | Minimum | Model Values (2010-2014) |
|----------|---------|--------------------------|
| Asset Cover Ratio (PPP Value / Net Borrowings) | 1.60x | 2.24x - 3.70x |
| Interest Cover Ratio (Cash Yield / Interest) | 2.00x | 1.12x - 7.59x |
| New Asset Cover Ratio | N/A | 3.51x - 4.55x |

### Cashflow Waterfall (JLplc / Summary sheets)
| Line | 2010 | 2011 | 2012 | 2013 | 2014 |
|------|------|------|------|------|------|
| Operating Cashflow | -2.0M | -15.5M | -13.1M | -12.6M | -13.5M |
| Bid Costs (net) | -8.4M | +8.8M | +1.2M | -2.2M | 0 |
| Financing Costs | -6.1M | -9.4M | -14.4M | -9.1M | -5.6M |
| PFI Portfolio Yield | 16.0M | 19.0M | 25.8M | 36.3M | 24.1M |
| JLIF Dividends | 0 | 2.5M | 3.3M | 3.3M | 3.3M |
| PFI Investment | -52.4M | -52.7M | -81.0M | -47.9M | -75.1M |
| Asset Sales | 211.0M | 63.1M | 109.9M | 99.9M | 138.3M |
| Tax & Other | -0.3M | -0.4M | +4.2M | -3.6M | 0 |
| Pensions | -5.4M | -23.5M | -24.3M | -25.2M | -26.1M |
| Dividends | -135.7M | -0.2M | -0.2M | -0.2M | -0.2M |
| **Net CF** | **+16.8M** | **-8.3M** | **+11.3M** | **+38.7M** | **+45.3M** |

### Portfolio Composition (All_Asset_Summ)
- **Existing PFI Assets** (JL methodology): 652M → declining via disposals
- **New PFI Assets**: 0 → growing via investment programme
- **JLIF Retained Stake**: 55M+ (listed fund holding)
- **Two-fund structure**: Fund I (core, mature) + Fund II (growth, newer assets)

### Geographic Diversification (Banks R76+)
- Americas (Canada, US)
- Asia (Australia)
- UK (majority)
- Rest of Europe

### Scenario Analysis (Scenario_Manager)
- Investment volumes: 21-70M per semi-annual period
- Inflation: 2.5%
- Real growth rate: 3.0%
- New asset yield: 11.0% p.a.
- Construction period: 6 semi-annual periods (3 years)
- Operational period: 50 semi-annual periods (25 years)

---

## TopSheet Mapping — What Can Be Populated

### Fully Available
- Deal identity (borrower, sponsor, sector, region, currency)
- Capital structure (facilities, margins, repayment schedules)
- Covenant thresholds and projected ratios (ACR, ICR)
- Cashflow waterfall (operating CF through to closing cash)
- Portfolio valuations (by methodology, by fund)
- Asset disposals and investment schedule
- Financing costs and facility utilisation
- Scenario parameters (inflation, growth, yields)
- Fund investor fee calculations
- Geographic diversification

### Partially Available (needs assumptions)
- Reserve accounts: LC usage is modelled (Banks R48) but no explicit DSRA/MRA structure
- Weighted average life: can be inferred from maturity profile but not explicitly stated
- Credit ratings: not in the model (would come from rating agencies)
- Reporting periodicity: semi-annual implied by model structure

---

## TopSheet Gaps — What's Missing

### 1. Reserve Account Detail
**Gap**: The model tracks LC usage (Letters of Credit) as off-balance-sheet commitments but has no explicit DSRA, MRA, or maintenance reserve structure. This is typical for holdco-level financing where reserves sit at the project SPV level, not the holdco.

**Impact**: Cannot populate `deal_reserve_accounts` with required/current balances.

**Resolution**: Reserve account data would need to come from the underlying PFI project company compliance certificates, not the holdco model.

### 2. Individual Asset-Level Data
**Gap**: The model aggregates ~30+ PFI assets into fund-level summaries. Individual asset names are listed (Banks R79-80: Abbotsford Hospital, Avon & Somerset Courts, etc.) but financial performance is only shown at portfolio level.

**Impact**: Cannot create deal-level topsheets for individual concessions.

**Resolution**: Each PFI asset has its own project finance model. The `All_Asset_Inputs` sheet (930 rows x 175 cols) likely contains asset-level inputs but would need separate extraction.

### 3. Credit Ratings
**Gap**: No Moody's, S&P, or Fitch ratings in the model.

**Impact**: Cannot populate `moodys_rating`, `sp_rating`, `fitch_rating` fields.

### 4. Compliance Certificate / Reporting Data
**Gap**: This is a projection model, not a monitoring tool. No actual reported figures, compliance certificates, or period-end actuals.

**Impact**: Cannot populate `actual_periods`, `period_financial_items`, or `covenant_tests` with reported values.

### 5. Sector KPIs
**Gap**: No operational KPIs (availability, deduction points, payment mechanism scores) at the portfolio level. These would sit in the individual SPV models.

**Impact**: Cannot populate `deal_kpi_targets` or `deal_kpi_observations`.

### 6. Risk Register
**Gap**: No risk assessment, likelihood/severity scoring, or mitigation tracking.

**Impact**: Cannot populate `deal_risk_register`.

### 7. Corporate Entity Structure
**Gap**: The model shows HIH and JL as entities but doesn't detail the full corporate chain (SPVs, holdcos, guarantors).

**Impact**: Can partially populate `corporate_entities` (HIH as holdco, JL as opco) but not the full securitisation boundary.

### 8. Counterparty Details
**Gap**: No counterparty names, LEIs, or credit ratings beyond the fund investors (Henderson) and bank (WestLB).

**Impact**: Partial `deal_counterparties` population only.

### 9. Revenue Risk Classification
**Gap**: No P/V/D coding. The underlying PFI assets would each have their own revenue risk profile (mostly availability-based = P1/V1/D1-D2).

**Impact**: Cannot auto-populate revenue risk codes.

### 10. Pension Obligations
**Gap**: Pension contributions are modelled (-5.4M to -26.1M p.a.) but there's no explicit pension deficit, asset cover ratio, or funding schedule.

**Impact**: This is a material cash drain (circa 25M p.a.) that affects CFADS but isn't captured in our standard template. May need a supplementary line item.

---

## Structural Observations

### This Deal Doesn't Fit the Standard Template Cleanly
The NIM model represents a **portfolio holding company** financing structure, not a single-asset project finance deal. Key differences:

1. **Multi-asset**: 30+ PFI concessions aggregated, not one project
2. **Holdco financing**: Bank debt at JL/HIH level, not project SPV level
3. **Asset rotation**: Active disposal and reinvestment programme
4. **Fund structure**: Two funds (Fund I and Fund II) with different vintages
5. **Management fees**: JLIS, JLCM, and MSA revenue streams from managing the assets
6. **Pension liability**: Defined benefit pension scheme creating ongoing cash drag

### Recommended Sector Template
This deal would need a **new sector template** — something like `infrastructure_holdco` or `pfi_portfolio` — with line items for:
- Portfolio yield (by fund)
- Asset disposals and reinvestment
- Fund management fee income (JLIS, JLCM, MSA)
- Pension contributions
- LC utilisation and off-balance-sheet commitments
- Fund investor distributions and fee blockage
- Bid costs (new investment origination)

### TopSheet Readiness Score
| Category | Readiness | Notes |
|----------|-----------|-------|
| Deal Identity | 80% | Missing ratings and some counterparty detail |
| Capital Structure | 90% | Facilities, margins, and schedules extractable |
| Financial Template | 40% | Needs custom sector template for holdco structure |
| Covenants | 85% | ACR and ICR thresholds + projections available |
| Reserve Accounts | 10% | LC usage only; reserves at SPV level |
| Risk Register | 0% | Not in the model |
| KPI Monitoring | 0% | Not applicable at holdco level |
| Period Actuals | 0% | Projection model only |

---

## Recommended Next Steps

1. **Create `infrastructure_holdco` sector template** with appropriate revenue/cost/KPI line items
2. **Seed the deal** using the extractable data (identity, capital structure, covenants, cashflow projections)
3. **Flag gaps** as requiring manual input from the investment team (ratings, risk register, counterparties)
4. **Consider pension obligations** as a new standard line item in the cashflow template (currently missing from the generic 67-row model)
