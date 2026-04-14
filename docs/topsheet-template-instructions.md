# TopSheet Data Template — Instructions for Completion

**Template Version:** v9 (April 2026)
**Template File:** `topsheet-data-template-v9.xlsx`

This document explains how to complete the TopSheet data template. These instructions are written for both human users and AI assistants (Claude, ChatGPT, etc.) that may be populating the template from source documents.

## What's new in v9

- **Tab 1 — new VALUATION & EQUITY section** (5 fields): Enterprise Value, Valuation Date, Valuation Method, Valuation Entity, and Equity Invested at Origination. Anchors the Capital Stack feature — the single most important input is the Enterprise Value.
- **Tab 2 — two optional columns (Z and AA)** for shareholder-level debt: `Pledged Share Entity` and `Pledged Share %`. Present only when a debt is secured on a specific shareholder's stake (e.g. NAV facility). When populated, the Capital Stack engine computes a grossed-up consolidated-equivalent leverage using `face_value / pledged_share_pct`.

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
- **Security Ranking** (v8 vocabulary) determines how this deal appears in portfolio analytics. Use one of: `Senior Secured`, `Senior Secured HoldCo`, `Senior Secured MajorityHoldCo`, `Senior Secured MinorityHoldCo`, `Senior Unsecured`, `Second Lien`, `Mezzanine`, `Subordinated`, `Subordinated HoldCo`, `Holdco`, `Majority Holdco`, `Minority Holdco`, `Shareholder Loan`. Choose the variant that reflects the collateral package *and* the entity level the security is taken at.
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

**Valuation & Equity (new in v9)** — 5 fields anchoring the Capital Stack:
- **Enterprise Value ***: the anchor for the entire capital stack. Every LTV, equity cushion and leverage lens derives from this. If you enter nothing else here, enter this.
- **Valuation Date ***: when the EV was struck (YYYY-MM-DD). Stacks drift over time; stale dates (>12 months) will be flagged in the validation panel.
- **Valuation Method ***: one of `transaction` (price paid on a recent trade), `dcf` (discounted cashflow), `multiples` (peer-set EV/EBITDA or similar), `appraisal` (independent valuer), `mark_to_model` (internal valuation), `book` (GAAP/IFRS book value). Makes the basis of the EV explicit so deals aren't silently compared across incompatible methods.
- **Valuation Entity**: which entity in Tab 7 the EV is measured at. Almost always the OpCo (the operating asset). The stack engine anchors at this entity and walks up the ownership chain from there.
- **Equity Invested at Origination**: the initial sponsor cheque when the deal was done. Used by the IRR / MOIC / performance attribution engines. Optional — leave blank if not known — but recommended for deals acquired (vs originated) by the current holders.

**Distribution Mechanics (new in v8)** — 10 fields describing how distributions actually flow on this deal:
- **Distribution Frequency**: `semi_annual` | `quarterly` | `annual` — when distributions are paid.
- **Distribution Calculation Basis**: narrative describing the figure on which distributions are calculated — e.g. `cashflow_available_for_distribution`, `net_cashflow`, `free_cashflow_after_sweep`.
- **Distribution Waterfall Position**: integer — position in the cashflow waterfall (e.g. 12 = 12th priority after debt service, reserves, taxes, etc.).
- **Sweep Before Distribution**: Yes/No — is a mandatory cash sweep applied before the distribution test?
- **Sweep Included in DSCR**: Yes/No — is the cash sweep included in the DSCR calculation (typically no — DSCR is computed before the sweep).
- **Trapped Cash Mechanism**: `retained_in_proceeds_account` | `held_in_lockup_account` | `swept_to_debt` | `released_after_cure` | `swept_then_released` — what physically happens to cash that fails the distribution test.
- **Trapped Cash Release Conditions**: narrative — e.g. "released after 2 successive Calculation Dates where all conditions satisfied".
- **Lock-Up Cure Window (days)**: integer — days after the Calculation Date during which the borrower can cure the failed test (e.g. 90, 45).
- **Lock-Up Escalation Periods**: integer — number of consecutive lock-up periods before escalation kicks in (e.g. 3).
- **Lock-Up Escalation Consequence**: what happens after the escalation threshold — `excess_cashflow_sweep` | `mandatory_prepayment` | `creditor_step_in`.

Use these fields together with the itemised gates in Tab 22 (Distribution Conditions). Tab 22 captures each individual gate; Tab 1 Distribution Mechanics captures the *framework* around the gates.

### Tab 2: Capital Structure

One row per debt instrument in the capital structure.

**Minimum requirement:** At least one instrument.

**Key fields:**
- **Instrument Type:** senior_term, senior_rcf, capex_facility, mezzanine, shl, bond, note, frn, private_placement, intercompany
- **Format:** loan, bond, note, frn, il_bond, private_placement, convertible
- **Pari-Passu Group:** Instruments in the same group (e.g. "A") rank equally in the waterfall. Different groups rank sequentially.
- **Committed Amount:** Total facility size for this instrument
- **Drawn Amount:** How much is currently drawn
- **Margin (bps):** Spread over the base rate in basis points (e.g. 200 = 2.00%)
- **Repayment Type:** bullet (single repayment at maturity), amortising (equal instalments), sculpted (shaped to cashflow), cash_sweep (excess cash applied)
- **Our Holding:** Our share of this specific instrument (not the deal total)
- **DSRA Months:** How many months of debt service the DSRA covers for this instrument

**Capital structure taxonomy (new in v8 — columns R–Y):** these fields tell the ratio engine which entity level each instrument sits at and how it ranks in the overall cashflow priority.
- **Entity Level (R)**: `opco` | `midco` | `holdco` | `topco` | `issuer` | `bidco` | `majority_holdco` | `minority_holdco`. This is the corporate entity that issued the debt — the same entity must appear in Tab 7 (Corporate Entities).
- **Entity Name (S)**: must exactly match one of the entity names in Tab 7.
- **Ownership % (T)**: the economic share that the consolidating group has in this entity (0–100). Use 100 for wholly-owned. For `majority_holdco` / `minority_holdco` rows the ownership should always be < 100.
- **Structural Seniority (U)**: 1 = closest to the cashflows. Higher numbers = structurally further away (each layer of HoldCo adds 1).
- **Ratio Consolidation Level (V)**: `opco_standalone` (ratios tested at OpCo only) | `consolidated` (full consolidation with no ownership adjustment — only for wholly-owned groups) | `proportional_consolidated` (applies ownership % to both cashflows AND debt — this is the correct treatment for partial-ownership structures).
- **Intercompany Lender (W)**: populated only for internal loans (e.g. HoldCo lending to OpCo). Leave blank for external debt. Intercompany and shareholder loans are automatically excluded from ranked claims.
- **Subordination Agreement (X)**: Yes/No — is the instrument subject to a formal intercreditor or subordination deed?
- **Cashflow Priority Rank (Y)**: 1 = first claim on cashflows; 2 = second claim, etc. **You can leave this blank** — the system auto-assigns it based on entity level + contractual subordination. If you enter a value manually, the system respects it. Shareholder loans and intercompany loans should always be blank (they are not ranked).

**Why proportional consolidation matters:** if a portfolio company is 75%-owned, accounting-style full consolidation (100% of subsidiary EBITDA less minority interest) overstates EBITDA for credit purposes. Proportional consolidation multiplies BOTH the EBITDA AND the debt by 75% — giving the correct economic picture of what the lender is exposed to.

**Shareholder-level pledge (new in v9 — columns Z, AA):** only populate these two columns when a debt is secured specifically on one shareholder's stake rather than on the operating-company assets or on a common MidCo's shareholding. A typical example is a shareholder-NAV facility: the lender advances funds to a sponsor-specific SPV that holds a particular stake, with security limited to that stake.
- **Pledged Share Entity**: the entity in Tab 7 whose shareholding is pledged (e.g. the sponsor's holding vehicle).
- **Pledged Share %**: the percentage of the group's ownership represented by that stake. For a 49.99% shareholder's NAV facility, enter 49.99.

When these fields are populated, the Capital Stack engine computes a **grossed-up consolidated-equivalent leverage** as `face_value / pledged_share_pct`. A £475m debt secured on a 49.99% stake has the same distribution-coverage impact as a £950m debt at the consolidated group level, because the operating company has to distribute £2 to put £1 in the pledged shareholder's hands for debt service.

Leave both blank for normal debt instruments (debt at the OpCo, Issuer, or a common MidCo whose shares are 100%-owned within the group).

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

**Key fields (columns A–F):**
- **Type:** `opco` (operating company), `midco` (intermediate holding), `bidco` (acquisition vehicle), `holdco` (holding company), `topco` (top company), `spv` (special purpose vehicle), `issuer`, `guarantor`, `servicer`, `majority_holdco`, `minority_holdco`
- **Parent Entity:** the parent by name (must reference another row in this tab, or blank for the ultimate parent)
- **Jurisdiction:** ISO 2-letter country code
- **Ring-Fenced:** is this entity ring-fenced from the rest of the group?
- **Securitisation Boundary:** is the entity within the securitisation/financing ring-fence?

**Ownership, control and consolidation (new in v8 — columns G–L):**
- **Ownership % (G)**: the percentage owned by the parent entity (0–100). 100 if wholly-owned. For joint ventures or partial stakes, enter the actual stake (e.g. 50 for a 50/50 JV, 75 for a 75% controlled subsidiary).
- **Ownership Type (H)**: `direct` (parent directly owns) | `indirect` (held via one or more intermediate entities) | `joint_venture`.
- **Control Type (I)**: `full_control` (>50% with consolidation) | `significant_influence` (20–50%, equity method) | `passive` (<20%) | `joint_control`.
- **Consolidation Method (J)**: `proportional` (apply ownership % to cashflows and debt — the correct method for credit ratios) | `equity_method` (investment carried at net asset value, no cashflow consolidation) | `not_consolidated` (off-balance-sheet) | `full` (only for 100%-owned entities where IFRS full consolidation is equivalent).
- **Within Security Perimeter (K)**: Yes/No — is this entity inside the ring-fenced financing group (i.e. its cashflows and assets are captured by the lender's security)?
- **Ratio Level (L)**: what level of credit ratios is calculated at this entity — `opco` | `midco` | `holdco` | `issuer` | `none`. Use `none` for entities that are not the point of ratio measurement.

The combination of these fields drives the proportional consolidation engine. For a 75%-owned asset, you would have `ownership_pct = 75`, `control_type = full_control`, `consolidation_method = proportional`, `within_security_perimeter = Yes`, `ratio_level = opco`.

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

**Ratio Level (new in v8 — column L):** which entity level the covenant is actually tested at. Values: `opco` | `midco` | `holdco` | `consolidated` (full, for wholly-owned groups) | `proportional_consolidated` (uses the proportional consolidation engine described in Tab 2 / Tab 7). For a typical PF deal this is `opco`. For a HoldCo-level covenant taken on a 75%-owned asset, use `proportional_consolidated` so the covenant is tested on the proportionally-consolidated numbers.

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

Group A also captures the distribution-gates framework frozen at entry (new in v8):
- **Number of Distribution Gates**: integer count of `distribution_condition` rows from Tab 22 at origination (e.g. 11 if the deal had 3 ratio gates + 8 non-ratio gates).
- **Distribution Gates Summary**: one-line narrative summary — e.g. "3 ratio gates + 8 non-ratio gates + stepped cash sweep". This is the snapshot-at-origination view; the live Tab 22 itself evolves if the deal is amended or restructured.

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

### Tab 21: Obligations & Deliverables

One row per obligation from the finance documentation. Drives the Deliverables Calendar (both the per-deal view and the portfolio calendar page) and the deliverables-ingestion engine.

**How to complete:**
1. **Obligation ID**: either a taxonomy ID from the 230-item register (e.g. `INFO-001`, `NOTIF-003`, `COV-015`) or a custom ID (e.g. `CUSTOM-001`). Use taxonomy IDs where possible so the system can group obligations across deals.
2. **Obligation Name**: short title (e.g. "Annual financial statements", "Insurance certificate").
3. **Applicable**: Yes/No — whether this obligation applies to this deal. Mark No for any template rows that don't apply.
4. **Responsible Party**: `borrower` | `auditor` | `agent` | `adviser` | `insurer` — who actually has to deliver the item.
5. **Frequency**: `annual` | `semi_annual` | `quarterly` | `monthly` | `event_driven`.
6. **Business Days After Period End**: integer. For example, 90 = "90 business days after financial year end".
7. **Business Day Jurisdictions**: comma-separated ISO codes (e.g. `GB` for a UK-only deal, `GB,US` for a cross-border deal that needs both calendars observed).
8. **Business Day Convention**: `modified_following` (default — move forward unless it crosses a month, then backward) | `following` | `preceding` | `no_adjustment`.
9. **Grace Period (Business Days)**: additional business days the borrower gets before the item becomes overdue (e.g. 10).
10. **Severity if Missed**: `informational` | `potential_default` | `event_of_default`.
11. **Phase**: `all` | `construction` | `operational` — some obligations only apply in certain phases.
12. **Source Clause**: reference to the finance document clause (e.g. `CTA 18.5(a)(iv)`, `SFA Cl. 9.4`).
13. **Notes**: free text for any nuances.

**What happens at ingestion:** the system generates one deliverable per (obligation × reporting period) for the life of the deal, applies the business-day convention and jurisdiction calendar, and writes them into the deliverables table. The Calendar page then shows them grouped by due date with status (delivered / approaching / overdue) colour-coded.

**Pre-seeded template:** the template ships with ~30 of the most common obligations already listed. Fill in the columns and set `Applicable = No` for anything that doesn't apply.

### Tab 22: Distribution Conditions

One row per **condition** that must be satisfied before cash can be distributed to equity. This captures the full lock-up / trigger-event / event-of-default regime from the finance documentation. Powers the Distribution Assessment engine — which reads this tab to determine, for any given period, whether distributions are allowed.

**Minimum requirement:** at least one `distribution_condition` row. Covenant-based conditions must reference ratios that also exist in Tab 8.

**How to complete:**
1. **Condition ID**: sequential `DC-001`, `DC-002`, ... unique within the deal.
2. **Condition Name**: short title (e.g. "Senior DSCR historic 12m", "DSRA fully funded", "No Event of Default outstanding").
3. **Category**: `ratio` | `reserve` | `compliance` | `timing` | `structural` | `behavioural` | `cash_sweep` | `credit_support` | `rating` | `liquidity` | `regulatory` | `capex_funding` | `incurrence` | `revolving_facility`.
4. **Consequence Tier**: what happens if the condition fails — `distribution_condition` (lock-up) | `trigger_event` (cash trap) | `cash_trap` | `remedial_plan` | `incurrence_test` | `event_of_default` | `sweep_mechanic`.
5. **Ratio Name** (if category = ratio): `seniorDscr` | `llcr` | `ltv` | `icr` | `netDebtEbitda` | `debtYield` | `seniorRar` | `seniorIcr`. Null for non-ratio conditions.
6. **Direction**: `min` or `max`. Null for non-ratio.
7. **Threshold Value**: decimal threshold (e.g. 1.35, 0.70). Null for non-ratio.
8. **Threshold Variant**: if the threshold varies over time — `pre_completion` | `post_completion` | `year_1` | `year_2_plus`, etc.
9. **Lookback Period**: `historic_12m` | `projected_12m` | `projected_24m` | `spot` | `average`.
10. **Test Frequency**: `semi_annual` | `quarterly` | `annual` | `each_distribution` | `event_driven`.
11. **Remedy Available**: Yes/No.
12. **Remedy Mechanism**: narrative (equity injection, reserve top-up, director's certificate, etc.).
13. **Sweep %** (for cash_sweep only): 0–100.
14. **Sweep Step Schedule** (for stepped sweeps): concise format like `Y1:25, Y2:50, Y3:75, Y4:100`.
15. **Source Clause**: reference to the finance document clause.
16. **Notes**: free text.

**Relationship with Tab 1 Distribution Mechanics:** Tab 1 captures the *framework* (frequency, calculation basis, waterfall position, sweep before/after, trapped-cash mechanism, lock-up cure window, escalation regime). Tab 22 captures the individual *gates*. Both are needed — one without the other is incomplete.

**Relationship with Tab 8:** ratio-based rows in Tab 22 should reference ratios that also appear in Tab 8 (Covenant Thresholds). The system cross-validates this at ingestion and warns if a Tab 22 ratio is not configured in Tab 8.

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
