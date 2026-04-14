# TopSheet Data Template — Instructions for Completion

**Template Version:** v8 (April 2026)
**Template File:** `topsheet-data-template-v8.xlsx`

This document explains how to complete the TopSheet data template. These instructions are written for both human users and AI assistants (Claude, ChatGPT, etc.) that may be populating the template from source documents.

## What's new in v8

- **Tab 1 — Distribution Mechanics section.** Ten new fields describing how distributions actually work on this deal: frequency, calculation basis, waterfall position, sweep behaviour, trapped-cash mechanism, lock-up cure window and escalation regime.
- **Tab 1 — Security Ranking vocabulary expanded** to cover HoldCo-level debt: `Senior Secured HoldCo`, `Senior Secured MajorityHoldCo`, `Senior Secured MinorityHoldCo`, `Subordinated HoldCo`, `Shareholder Loan`.
- **Tab 2 — Capital Structure taxonomy** (8 new columns R–Y): `Entity Level`, `Entity Name`, `Ownership %`, `Structural Seniority`, `Ratio Consolidation Level`, `Intercompany Lender`, `Subordination Agreement`, `Cashflow Priority Rank`. Supports multi-level structures (OpCo/MidCo/HoldCo) with proportional consolidation for partial ownership.
- **Tab 7 — Corporate Entities** (6 new columns G–L): `Ownership %`, `Ownership Type`, `Control Type`, `Consolidation Method`, `Within Security Perimeter`, `Ratio Level`.
- **Tab 8 — Covenant Thresholds** (1 new column L): `Ratio Level` — which entity level the covenant is tested at.
- **Tab 20 — Onboarding Snapshot** (2 new fields): `Number of Distribution Gates`, `Distribution Gates Summary`.
- **Tab 22 — Distribution Conditions** (unchanged from v7).

### Cashflow Priority Ranking

Column Y on Tab 2 records the **priority of claim** each instrument has on the deal's cashflows. Rank 1 is the first claim. The system auto-assigns ranks after ingestion using structural level + contractual subordination. Shareholder loans and intercompany loans are always unranked (blank).

If a cell is left blank, the engine assigns it. If a value is entered manually, the engine respects it.

### Proportional Consolidation

When `Ratio Consolidation Level = proportional_consolidated`, the system applies the entity's `Ownership %` to BOTH cashflows AND debt before computing ratios. This is NOT the same as IFRS full consolidation (which fully consolidates 100% of subsidiary figures and then deducts minority interest) — that approach overstates EBITDA and understates leverage. Proportional consolidation gives the correct economic picture for credit ratios.

---

## General Rules

### Colour Coding
- **Yellow cells** — input fields. Enter your data here.
- **Grey cells** — computed by the system. Do not enter data (it will be overwritten during ingestion).
- **Red labels** — required fields. The deal cannot be ingested without these.
- **Blue header bars** — section headers. Do not modify.

### Data Conventions
- **Dates:** Use YYYY-MM-DD format (e.g. 2024-01-01)
- **Currency amounts:** Enter in the deal's base currency. Do NOT use thousands or millions notation — enter full amounts (e.g. 100000000 not 100M). The system handles display formatting.
- **Percentages:** Enter as whole numbers (e.g. 85 for 85%, not 0.85)
- **Negative numbers:** Enter costs and outflows as negative (e.g. -1180000 for operating costs)
- **Ratios:** Enter as decimal (e.g. 1.35 for 1.35x DSCR)
- **Dropdowns:** Many fields have dropdown validation. Click the cell to see available options. If you need a value not in the dropdown, enter it as free text — the ingestion engine will flag it for review.
- **Empty cells:** Leave blank if not applicable. Do not enter "N/A", "n/a", or "—".

### For AI Assistants
When populating this template from source documents (IC memos, finance agreements, financial models):
1. Extract exact values where available. Do not estimate or round.
2. If a field cannot be determined from the source documents, leave it blank.
3. For fields requiring judgement (e.g. replacement risk, revenue risk code), explain your reasoning in the Notes/Guidance column or a separate notes document.
4. Cross-check: Revenue - Operating Costs should equal EBITDA. CFADS / Debt Service should equal DSCR.
5. Ensure period data in the forecast tabs aligns with the Period Definition tab.

---

## Tab-by-Tab Instructions

### Tab 1: Deal Identity

This is the core deal record. Complete as many fields as possible.

**Must-have fields (ingestion will fail without these):**
- Investment Name, Borrower Legal Name, Borrower Jurisdiction
- Sector, Deal Type, Phase, Region, Country, Currency
- Origination Date, Maturity Date, Fiscal Year End Month
- Security Ranking, Total Facility Size, Our Exposure
- Internal Credit Score (if no external rating)

**Important notes:**
- **Sector** must match one of the system's sector templates: Wind Farm, Data Center, Port, Airport, Toll Road, Social Infrastructure, Real Estate, Clean Tech Hub, Solar
- **Security Ranking** determines how this deal appears in portfolio analytics. Use: Senior Secured, Senior Unsecured, Second Lien, Mezzanine, Subordinated, Holdco, Majority Holdco, Minority Holdco
- **Revenue Risk Code** uses the P/V/D framework: P1-P6 (Pricing), V1-V6 (Volume), D1-D5 (Duration). Lower numbers = lower risk. If unsure, leave blank and it will be assigned during review.
- **Contracted Revenue %** and **Merchant Revenue %** should sum to 100%.
- **Duration Coverage %** = (Contract life / Debt term) x 100. Above 100% means the contract outlasts the debt.
- **Ratings:** Enter the agency rating exactly as published (e.g. "Baa2" not "BBB equivalent"). If unrated by all agencies, Internal Credit Score is required.

**Tail construct (new in v5) — must-haves:**
- **Tail Anchor Type** (required): `concession` for hand-back assets (toll roads, PFI); `primary_contract` for renewables and PPP operations anchored by a PPA/CfD/lease; `asset_life` for corporate infrastructure (data centres, commercial RE)
- **Tail Anchor Date**: the contractual end date of the anchor (concession expiry or primary offtake end)
- **Tail Anchor Label**: free-text description of the anchor
- **Residual Value Treatment** (required): `zero_residual` for concession hand-back (the asset returns to the grantor for nil value); `nominal_residual` for minor residual; `retained_asset` where the project continues post-anchor
- **Tail Notes**: any narrative explaining the tail position, relevant mitigants, or nuances
- The system computes tail years automatically as `tail_anchor_date − latest_debt_maturity`. Positive = contracted revenue outlives debt; negative = merchant tail.

**Renewal framework (new in v5) — must-haves:**
- **Renewal Profile** (required): one of `deep_market_repricing` (hub airports, data centres), `bilateral_negotiation` (renewable PPAs, corporate leases), `competitive_tender_asset_retained` (operator keeps material assets across retender), `competitive_tender_clean_sheet` (pure concession retender with no asset retention), `hand_back_zero_value` (PFI, toll road concessions), or `no_anchor_contract` (fully merchant)
- **Debt Repayment From Renewal %**: the proportion of debt principal scheduled to be repaid from post-renewal cashflows. **Should be 0 for `hand_back_zero_value` and `competitive_tender_clean_sheet`** — any positive value triggers a HARD FAIL structural flag
- **Renewal Notes**: narrative explaining the renewal logic

**Why the `competitive_tender_clean_sheet` flag is a HARD FAIL with any debt reliance:** In a pure concession retender, the incumbent cannot economically out-bid clean-sheet competitors while carrying legacy debt. A rational new entrant with zero legacy debt can always bid more aggressively. Relying on winning the retender to repay legacy debt is structurally unsound.

### Tab 2: Capital Structure

One row per debt instrument in the capital structure.

**Minimum requirement:** At least one instrument.

**Key fields:**
- **Instrument Type:** senior_term, senior_rcf, capex_facility, mezzanine, shl, bond, note, frn, private_placement
- **Format:** loan, bond, note, frn, il_bond, private_placement, convertible
- **Pari-Passu Group:** Instruments in the same group (e.g. "A") rank equally in the waterfall. Different groups rank sequentially.
- **Committed Amount:** Total facility size for this instrument
- **Drawn Amount:** How much is currently drawn
- **Margin (bps):** Spread over the base rate in basis points (e.g. 200 = 2.00%)
- **Repayment Type:** bullet (single repayment at maturity), amortising (equal instalments), sculpted (shaped to cashflow), cash_sweep (excess cash applied)
- **Our Holding:** Our share of this specific instrument (not the deal total)
- **DSRA Months:** How many months of debt service the DSRA covers for this instrument

### Tab 3: Reserve Accounts

One row per reserve account or liquidity facility.

**Minimum requirement:** DSRA for most project finance deals.

**Key fields:**
- **Type:** dsra, mra, capex_reserve, o_and_m_reserve, distribution_reserve, lifecycle_reserve, escrow, lockup, liquidity_facility, rcf
- **Sizing Basis:** How the required balance is determined (e.g. "6 months senior DS", "Independent engineer lifecycle model", "3 months opex")
- **Cash/LC/PCG split:** Break down how the reserve is funded. Cash + LC + PCG should equal Current Balance.
- **Funded Status:** fully_funded (current >= required), partially_funded (current < required), unfunded (current = 0), surplus (current > required)

### Tab 4: Counterparties

One row per key counterparty. Focus on parties whose failure would materially impact the deal.

**Minimum requirement:** The primary offtaker/revenue counterparty.

**Key fields:**
- **Type:** offtaker, contractor, operator, guarantor, insurer, auditor, facility_agent, security_trustee, servicer
- **Replacement Risk:** How difficult is it to replace this counterparty? low (many alternatives), medium (some alternatives), high (few alternatives), critical (no replacement possible — deal fails if this party fails)
- **Dependency Narrative:** Explain WHY this counterparty matters and what happens if they fail.

### Tab 5: Hedging

One row per hedge instrument. Leave blank if no hedging (e.g. fixed-rate debt).

**Key fields:**
- **Hedge Type:** interest_rate_swap, cap, floor, fx_forward, fx_option, inflation_swap, commodity_swap
- **% of Debt:** What proportion of the debt is hedged by this instrument
- **Mark to Market:** Current MTM value (positive = in the money for us, negative = out of the money)

### Tab 6: Jurisdictions

Where does the borrower's business activity take place? This drives the Country breakdown chart on the portfolio dashboard.

**Rules:**
- Activity % must sum to 100% per activity type
- At least one row must be marked as Primary = TRUE
- For single-country deals, enter one row at 100%
- For multi-jurisdiction deals (e.g. a European network), split by revenue proportion

### Tab 7: Corporate Entities

The SPV and corporate structure. One row per entity in the ownership chain.

**Key fields:**
- **Type:** opco (operating company), bidco (acquisition vehicle), holdco (holding company), topco (top company), spv (special purpose vehicle), issuer, guarantor, servicer
- **Ring-Fenced:** Is this entity ring-fenced from the rest of the group?

### Tab 8: Covenant Thresholds

Three-tier covenant configuration. One row per tested ratio.

**Minimum requirement:** Senior DSCR covenant.

**Key fields:**
- **Category:** cash_flow_cover (DSCR, ICR), collateral_value (leverage, LTV), incurrence (one-time tests), distribution (lock-up conditions), financial_maintenance (ongoing)
- **Direction:** min (ratio must be ABOVE threshold — DSCR, ICR) or max (ratio must be BELOW threshold — leverage, LTV)
- **Lockup Level:** Distribution lock-up threshold (least severe)
- **Trigger Level:** Trigger event threshold (intermediate severity)
- **Default Level:** Event of default threshold (most severe)

**Example for DSCR:** Direction = min, Lockup = 1.15, Trigger = 1.10, Default = 1.05
**Example for Net Debt/EBITDA:** Direction = max, Lockup = 7.0, Trigger = 8.5, Default = 10.0

### Tab 9: KPI Targets

IC memo KPI expectations. These are frozen at ingestion and used to monitor performance deviation.

**Enter both base case and stress case values for each KPI.**

**Key fields:**
- **Direction:** higher_is_better (e.g. availability, capacity factor) or lower_is_better (e.g. PUE, curtailment, O&M cost)
- **Unit:** percentage, currency, count, ratio, years, bps
- **Source:** ic_memo (from investment committee paper), business_plan (from borrower), management_presentation, lender_model

**Typical KPIs by sector:**
- **Wind:** Capacity factor, P50 yield, availability, wind speed, curtailment
- **Solar:** Performance ratio, degradation rate, irradiance, availability
- **Data Centre:** PUE, leased capacity, WALT, blended $/kW/month
- **Toll Road:** AADT, traffic growth, toll rate, heavy vehicle mix
- **Port:** TEU volume, capacity utilisation, revenue per TEU
- **Real Estate:** Occupancy, WAULT, ERV, cap rate

### Tab 10: Financial Template

Select the sector template and define the custom line item labels for this deal's revenue, cost, capex, and KPI breakdown.

**Rules:**
- **Sector Template** must be selected (dropdown)
- Revenue lines: enter each distinct revenue stream (e.g. "PPA Revenue", "Merchant Revenue", "Ancillary Services"). Up to 8.
- Cost lines: enter each distinct cost category (e.g. "O&M Contract", "Insurance", "Land Lease"). Up to 12. Always include "Power Cost" and "Other Opex".
- Growth Capex lines: capital expenditure for expansion, new capacity, or enhancement. Up to 5. Examples: "Terminal Expansion", "New Battery Storage System", "IT Infrastructure".
- Maintenance Capex lines: capital expenditure for replacement, lifecycle, and upkeep. Up to 5. Examples: "Major Component Replacement", "Plant & Equipment Replacement", "Pavement Rehabilitation".
- Total Capital Expenditure is computed as Growth Capex + Maintenance Capex.
- Sector KPIs: the operational metrics you want to track. Up to 10. These should match the KPI Targets in Tab 9.

### Tab 11: Development Phases

For deals in construction or ramp-up phase. Leave blank for fully operational deals.

### Tab 12: Consent Mechanics

Voting and consent provisions from the finance documentation.

**Key provisions:**
- **Majority Threshold:** Typically 66.67% by commitments
- **Snooze-You-Lose:** CRITICAL — if Yes, the system will auto-generate protective "No" vote if no instruction received before deadline
- **Yank Clause:** Whether the borrower can replace non-consenting lenders

### Tab 13: Holdings

Which of our accounts hold this deal and how much. This drives the portfolio hierarchy (Organisation > Owner > Account > Holding).

### Tab 13B: Investors

External investor allocations. Who else is in this deal?

### Tab 13C: Intercreditor

Intercreditor agreement terms. Important for multi-tranche structures.

### Tab 13D: Enforcement Classes

For deals with multiple debt classes (e.g. Class A bonds + Class B bonds). Most single-tranche deals can leave this blank.

### Tab 14: Period Definition

**This tab must be completed before the forecast tabs.**

1. Set the **Periodicity** (semi_annual is standard for infrastructure)
2. Set the **First Period Start** and **Final Period End**
3. Fill in the period labels, start dates, and end dates for up to 80 periods

**Naming convention:**
- Semi-annual: "H1 2024", "H2 2024", "H1 2025", etc.
- Quarterly: "Q1 2024", "Q2 2024", etc.
- Annual: "FY 2024", "FY 2025", etc.

### Tabs 15-17: Management Case, Credit Case, Combined Downside

These are the full cashflow forecast grids. Each tab has the same structure:
- **Column A:** Line key (do not modify — used for machine parsing)
- **Column B:** Line item label
- **Columns C onwards:** Period data (aligned with Tab 14)

**How to complete:**
1. Refer to Tab 14 for which periods correspond to which columns
2. Enter values for each line item in each period
3. Yellow cells = input data. Grey cells = computed (leave blank — the system calculates these)
4. Use the deal's base currency throughout
5. Enter costs and outflows as **negative** numbers
6. Leave cells blank (not zero) if a line item is not applicable for a period

**Computed rows (grey — do not enter):**
- Total Revenue, Total Operating Costs, EBITDA
- Growth Capex, Maintenance Capex, Total Capital Expenditure
- Total Funding, CFADS
- Total Senior DS, CF After Senior DS
- Total Junior DS, CF After Junior DS
- Net Cashflow, Closing Cash Balance
- DSCR, LLCR (ratios)

**Input rows (yellow — enter these):**
- Individual revenue subcategory lines (Revenue 1–8, labelled per sector)
- Individual cost subcategory lines (Cost 1–12, labelled per sector)
- Growth Capex subcategory lines (Growth Capex 1–5)
- Maintenance Capex subcategory lines (Maintenance Capex 1–5)
- Tax Paid, Working Capital Movement, Reserve Account Movements
- Interest on Cash, Customer Pre-Payments, Grant Income
- Debt drawdowns (senior, capex, mezzanine, SHL, equity)
- Senior/Junior Interest and Scheduled Principal
- Cash sweeps (NOT included in DSCR)
- SHL interest and repayment, intercompany flows
- Fees (ticking, arrangement, liquidity)
- Opening Cash Balance, Distributions, Share Capital Redemption

**Key principle:** The cashflow should "add down" — each section flows into the next. Revenue minus costs = EBITDA. EBITDA minus capex/tax = pre-finance CF. Pre-finance + additional sources + funding = CFADS. CFADS minus debt service = CF after DS. And so on through to Closing Cash Balance.

**Credit Case guidance:**
The Credit Case should reflect a moderately stressed scenario. Common adjustments:
- Revenue 2-5% below management case
- Costs 5-10% above management case
- Delayed ramp-up
- Higher tax assumptions

**Combined Downside guidance:**
The Combined Downside should reflect multiple adverse factors occurring simultaneously:
- Revenue 5-10% below management case
- Costs 10-15% above
- Higher tax, delayed construction, counterparty stress
- This is the "what if several things go wrong at once" scenario

### Tab 18: Actuals

Same grid as the forecast tabs, but for **reported actual data** from compliance certificates and financial statements.

- Only complete periods where actual data has been received
- These values will be compared against the Management Case forecast to compute headroom and trend
- Enter the borrower-reported figures, not your own calculations

### Tab 19: Key Risks

Record the 5-10 most important risks for this deal. You do not need to map every risk from the 236-item taxonomy.

**How to complete:**
1. **Risk ID:** If the risk maps to a taxonomy item (e.g. RISK-MK-024 for forecast optimism), enter the ID. For custom risks not in the taxonomy, leave blank or use "CUSTOM-001" etc.
2. **Likelihood (1-5):** 1=Remote, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain
3. **Severity (1-6):** 1=Negligible, 2=Low, 3=Moderate, 4=High, 5=Critical, 6=Fatal (will cause EoD and significant loss of capital)
4. **Risk Score:** Auto-calculated (Likelihood x Severity). Range 1-30.
5. **Trend:** Is this risk getting better (improving), staying the same (stable), or getting worse (deteriorating)?
6. **Mitigation Party (M1-M5):** Who is the primary mitigant?
   - M1 = None
   - M2 = Reputational (counterparty has incentive to perform)
   - M3 = Contractual (legally binding obligation)
   - M4 = Insured (insurance policy covers the risk)
   - M5 = Guaranteed/Sovereign (government or rated guarantor)
7. **Capital at Risk (C1-C5):** What capital protection exists?
   - C1 = None
   - C2 = Comfort (letter of comfort, soft support)
   - C3 = Reserve (funded reserve account)
   - C4 = Funded (specific capital allocated)
   - C5 = Overcollateralised (excess collateral covers the risk)

**Risks to always consider:**
- Forecast optimism (RISK-MK-023 to MK-026) — especially for greenfield infrastructure and renewables
- Counterparty concentration — single offtaker or operator dependency
- Regulatory/political risk — for concessions and regulated assets
- Construction risk — if in construction phase
- Refinancing risk — if bullet maturity approaching
- **Contract & concession renewal (new REN codes)** — use RISK-REN-001 through RISK-REN-007 for any renewal-adjacent risk. These replace the fragmented legacy codes (RA-001, RL-002, EW-008, RE-023, OP-008, ET-003). See the Analytics tab for full methodology.
  - RISK-REN-001: Contract / concession expiry without renewal
  - RISK-REN-002: Renewal into deep liquid market
  - RISK-REN-003: Renewal by bilateral negotiation
  - RISK-REN-004: Concession auction / competitive tender
  - RISK-REN-005: Hand-back at zero consideration
  - RISK-REN-006: Reliance on extension assumption
  - RISK-REN-007: Incumbent legacy debt disadvantage

### Tab 20: Onboarding Snapshot (NEW in v5)

A **write-once** frozen capture of the deal position at the point of investment. These fields are immutable once ingested — any change requires a new snapshot via a restructuring event. Populate as many as possible at origination; the ingestion engine will flag gaps but will not reject the deal.

**Purpose:**
- **Performance attribution** — compare today's position against the position at entry
- **IC audit trail** — record exactly what the IC signed off on
- **Retrospective diligence** — support ex-post underwriting review

**Snapshot metadata (required):**
- **Snapshot Date** — usually the origination date
- **Snapshot Reason** — for the first ingestion this is always `origination`. Future snapshots use `restructuring`, `re_underwriting`, or `covenant_reset`
- **Captured By** — name of the IC approver or credit officer

**Group A — Structural position at onboarding:**
These are the tail and renewal fields frozen at entry, so you can measure drift over time. If you've already filled in the live tail/renewal fields in Tab 1, copy the same values here (they will match at the point of origination but may diverge later).

**Group B — Financial metrics at onboarding:**
Frozen origination ratios. These tell the retrospective story of how aggressively the deal was underwritten.
- **Entry Leverage** — Net Debt / EBITDA at purchase
- **Entry Year-1 DSCR** — the Year 1 management case DSCR. A value close to 1.0x indicates very tight underwriting
- **Min DSCR Across Life** — minimum management case DSCR across the debt life
- **Entry LLCR** — Year 1 Loan Life Coverage Ratio
- **Entry Loan Life** — years from origination to final debt maturity
- **Entry WAL** — Weighted Average Life of debt at origination

**Group C — Lender case / stress at onboarding:**
Captures the defensive work done at IC. When a deal is heading toward lender case numbers in real life, you need the original lender case to know how close you are.
- **Lender Case Min DSCR** — the floor DSCR under the lender stress case
- **Lender Case Peak Leverage** — the peak Net Debt / EBITDA under lender stress
- **Stress Break-Even %** — % revenue decline that drives DSCR to 1.0x
- **Stress Cases Tested** — free-text describing the scenarios stressed at IC

**Group D — IC governance at onboarding:**
- **IC Memo Date, Reference, Approved By, Conditions, Vote Margin**
- Record any conditions imposed by the IC as they are part of the approval envelope

**Group E — Origination economics:**
Tells you what the investment was originally trying to deliver.
- **Entry All-In Margin (bps)**
- **Entry Upfront Fees (bps)**
- **Entry Secondary Purchase Price %** — for secondary purchases only (e.g. 98.50 for 98.5% of par)
- **Entry Yield to Maturity** — as a decimal (e.g. 0.0920 for 9.20%)
- **Expected Hold Period (years)**
- **Exit Strategy** — hold to maturity / sell / refinance / describe

**Group F — Market context at onboarding:**
Enables performance decomposition into market-wide vs deal-specific movements.
- **Entry Risk-Free Rate (bps)** — 10yr gilt / Treasury at entry
- **Entry Credit Spread (bps)** — spread over risk-free
- **Entry Relative Value Notes** — rationale for the deal at that time

**Group G — Initial risk assessment:**
- **Initial Risk Score, Initial Grade, Critical Risks at Onboarding**
- Preserve the origination risk register summary even as new risks emerge later

**Restructuring / re-underwriting — creating a new snapshot:**
If the deal is later restructured, refinanced, or re-underwritten, the platform will:
1. Mark the existing snapshot as superseded (`is_current = FALSE`, `superseded_at`, `superseded_reason`)
2. Create a new snapshot row with `snapshot_number = N+1` and `snapshot_reason = 'restructuring'`
3. Both rows remain in the database; the TopSheet page shows the current snapshot plus the count of historical snapshots

**A superseded snapshot cannot be edited.** The database enforces this via a trigger. The error message guides you to create a new snapshot instead.

### Validation Tab

Before submitting, review the Validation tab. Mark each section as "Complete", "Partial", or "N/A" and add any notes about missing data or assumptions made.

---

## Submission

Once complete:
1. Save the file with the deal name: `TopSheet_[DealName]_[Date].xlsx`
2. Review the Validation tab for completeness
3. Submit to the platform team for ingestion
4. The ingestion engine will validate the data, flag any issues, and create the deal in the system
5. After ingestion, the system will auto-generate: covenants summary, reporting periods, forecast case versions, obligation register, and run the performance grade engine

---

## Common Mistakes

| Mistake | Impact | How to Avoid |
|---------|--------|--------------|
| Entering amounts in millions | All values will be 1000x too small | Enter full amounts: 100000000 not 100 |
| Positive costs/outflows | EBITDA and CFADS will be wrong | Costs, tax, DS, distributions should be negative |
| Mismatched periods | Forecast data won't align with period calendar | Complete Tab 14 first, then fill forecast tabs |
| Missing DSCR covenant | Deal won't appear in portfolio analytics | Always complete at least one covenant in Tab 8 |
| Entering "N/A" in blank cells | Parser may treat as text value | Leave cells empty if not applicable |
| Wrong direction on covenants | Headroom calculations will be inverted | DSCR = min (higher is better), Leverage = max (lower is better) |
