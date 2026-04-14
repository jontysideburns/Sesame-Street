# TopSheet Complete Specification
## Data Template for Manual Population

**Version:** v9 — April 2026
**Template file:** `topsheet-data-template-v9.xlsx`
**Purpose:** This document defines every field, table, and line item in the TopSheet system. Use it to populate deal data outside of Claude Code.

### What's new in v9

- **Tab 1 — new VALUATION & EQUITY section** (5 fields on `deals`):
  `enterprise_value` (already existed), `valuation_date`, `valuation_method`
  (`transaction` | `dcf` | `multiples` | `appraisal` | `mark_to_model` |
  `book`), `valuation_entity`, `equity_invested`.
- **Tab 2 — 2 new optional columns** on `capital_structure_instruments`:
  `pledged_share_entity`, `pledged_share_pct`. Populated only for NAV-style
  debt secured on a specific shareholder stake.
- **Capital Stack feature** — new section F.2B on every Deal TopSheet page.
  Anchored by the Tab 1 EV. Shows layered table (Total / Our Holding),
  horizontal stack bar, two leverage lenses (CTA-consolidated headline +
  grossed-up consolidated-equivalent), our-position summary, parallel
  claims, change-of-control coverage.
- Engine support: `server/capital_structure_engine.py` extended with
  `build_capital_stack()`, `compute_attributable_equity()`,
  `gross_up_facility()`, `build_metrics()`,
  `change_of_control_coverage()`, `validate_capital_stack()`.
- API: `GET /api/deals/{slug}/capital-stack` (optional
  `reporting_currency=GBP|USD|EUR`).

### What's new in v8

- **Tab 1 Distribution Mechanics block** — 10 fields on `deals`:
  `distribution_frequency`, `distribution_calculation_basis`,
  `distribution_waterfall_position`, `sweep_before_distribution`,
  `sweep_in_dscr`, `trapped_cash_mechanism`, `trapped_cash_release`,
  `lockup_cure_window_days`, `lockup_escalation_periods`,
  `lockup_escalation_consequence`.
- **Tab 1 Security Ranking** vocabulary expanded to cover HoldCo-level debt.
- **Tab 2 Capital Structure** — 8 new columns on
  `capital_structure_instruments`: `entity_level`, `entity_name`,
  `ownership_pct`, `structural_seniority`, `ratio_consolidation_level`,
  `intercompany_lender`, `subordination_agreement`, `cashflow_priority_rank`.
  Supports multi-level structures with proportional consolidation for
  partial ownership.
- **Tab 7 Corporate Entities** — 6 new columns on `corporate_entities`:
  `ownership_pct`, `ownership_type`, `control_type`, `consolidation_method`,
  `within_security_perimeter`, `ratio_level`.
- **Tab 8 Covenant Thresholds** — new `ratio_level` column (which entity
  level the covenant is tested at).
- **Tab 20 Onboarding Snapshot** — `distribution_gates_count` +
  `distribution_gates_summary` on `deal_onboarding_snapshots`.
- Engine support: `server/capital_structure_engine.py` provides
  `assign_cashflow_priority_ranks()`, `proportional_consolidation()`, and
  `validate_capital_structure()`.

---

## PART 1: DEAL MASTER RECORD (152 fields)

The `deals` table is the central record. Fields organised by TopSheet section.

### F.1 Deal Identity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | Text | Yes | Deal name as displayed in the system |
| slug | Text | Yes | URL-safe identifier (auto-generated) |
| borrower | Text | Yes | Borrower name (display) |
| borrower_legal_name | Text | | Full registered name |
| borrower_trading_name | Text | | Trading name if different |
| borrower_lei | VARCHAR(20) | | Legal Entity Identifier |
| borrower_jurisdiction | VARCHAR(2) | Yes | ISO country code of incorporation |
| borrower_registered_number | Text | | Companies House / equivalent |
| borrower_registered_address | Text | | Full address |
| sector | Text | Yes | Wind Farm, Data Center, Port, Airport, Toll Road, Social Infrastructure, Real Estate, Clean Tech Hub, Solar |
| sector_label | Text | | Formal sector label |
| sub_sector_label | Text | | e.g. Offshore Wind, Hyperscale Colocation |
| deal_type | Text | Yes | Project Finance, Acquisition Finance, Development Finance |
| phase | Text | Yes | construction, ramp_up, operational, refinancing |
| region | Text | Yes | EMEA, North America, APAC, LATAM |
| country | VARCHAR(2) | Yes | ISO country code |
| primary_business_country | VARCHAR(2) | | Main operating jurisdiction |
| primary_business_country_name | Text | | Full country name |
| currency | Text | Yes | ISO 4217 (USD, GBP, EUR) |
| reporting_currency | VARCHAR(3) | | If different from deal currency |
| sponsor_name | Text | | Lead sponsor |
| sponsor_fund | Text | | Fund vehicle name |
| parent_group | Text | | Ultimate parent |
| ownership_structure | Text | | Narrative |
| consortium_members | JSONB | | Array of consortium members |
| sic_code | VARCHAR(5) | | UK SIC 2007 |
| ticcs_classification | Text | | Infrastructure classification |
| project_codename | Text | | Internal codename |
| approved_auditors | Text[] | | Approved audit firms |
| status | Text | Yes | Monitoring, Heightened Monitoring |
| summary | Text | Yes | One-line deal summary |
| deal_overview | Text | | Full description |

### F.2 Structure & Terms

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| structure_type | Text | | Structure classification |
| origination_type | Text | | primary, secondary, restructuring |
| seniority | Text | | senior_secured, mezzanine, etc. |
| security_type | Text | | Security package description |
| security_summary | Text | | Narrative |
| security_ranking | Text | Yes | Senior Secured, Senior Unsecured, Second Lien, Mezzanine, Subordinated, Holdco, Majority Holdco, Minority Holdco |
| facility_amount | BigInt | Yes | Total committed (deal currency) |
| exposure | BigInt | Yes | Our current exposure |
| total_drawn | Decimal | | Total drawn across instruments |
| our_commitment | Decimal | | Our committed amount |
| our_drawn | Decimal | | Our drawn amount |
| our_holding_pct | Decimal | | Our percentage |
| pricing_type | Text | | fixed, floating, index_linked |
| pricing_margin_bps | Integer | | Spread in basis points |
| reference_rate | Text | | SONIA, SOFR, Euribor, GILT |
| coupon_rate | Decimal | | Fixed coupon if applicable |
| amortisation_profile | Text | | sculpted, amortising, bullet |
| call_protection | Text | | Call protection terms |
| governing_law | Text | | English, New York, etc. |
| syndicated | Boolean | | Syndicated deal flag |
| number_of_lenders | Integer | | |
| facility_agent | Text | | |
| security_trustee | Text | | |
| origination_date | Date | Yes | |
| commitment_date | Date | | |
| first_drawdown_date | Date | | |
| cod_date | Date | | Commercial Operations Date |
| cod_months | Integer | | Months to COD |
| maturity_date | Date | Yes | Final debt maturity |
| weighted_average_life | Decimal | | Years |
| contract_length_months | Integer | | |
| fiscal_year_end_month | Integer | Yes | 1-12 |
| concession_expiry_date | Date | | For concession deals |
| regulatory_period_current | Text | | For regulated assets |
| reporting_periodicity | Text | | semi_annual, quarterly, annual |

### F.2.1 Change of Control

| Field | Type | Description |
|-------|------|-------------|
| coc_regime_exists | Boolean | |
| coc_definition | Text | Definition of "control" |
| coc_consequence | Text | Consequence of change |
| coc_prepayment_basis | Text | par, make_whole, etc. |
| coc_permitted_transfers | JSONB | Whitelist of approved investors |
| coc_consent_threshold | Text | |

### F.2.2 Sources & Uses

| Field | Type | Description |
|-------|------|-------------|
| sources_and_uses | JSONB | S&U breakdown |
| enterprise_value | Decimal | |
| capital_structure_instruments | JSONB | Legacy — use child table |
| capital_structure_classes | JSONB | Legacy — use child table |
| capital_structure_entities | JSONB | Legacy — use child table |
| cashflow_waterfall | JSONB | Waterfall order |
| reserve_accounts | JSONB | Legacy — use child table |
| liquidity_facilities | JSONB | |

### F.3 Ratings

| Field | Type | Description |
|-------|------|-------------|
| moodys_rating | Text | e.g. Baa2 |
| moodys_outlook | Text | stable, positive, negative |
| moodys_watch | Text | |
| sp_rating | Text | e.g. BBB |
| sp_outlook | Text | |
| sp_watch | Text | |
| fitch_rating | Text | e.g. BBB |
| fitch_outlook | Text | |
| fitch_watch | Text | |
| internal_credit_score | Text | Yes (if no external) |
| performance_grade | Integer | 1-4 (computed by grade engine) |
| ma_eligibility | Text | |
| rating_trigger_configured | Boolean | |
| rating_trigger_threshold | Text | |
| rating_trigger_consequence | Text | |

### F.4 Revenue Risk

| Field | Type | Description |
|-------|------|-------------|
| revenue_risk | Text | Composite code (display) |
| revenue_pricing_mechanism | Text | P1-P6 |
| revenue_volume_mechanism | Text | V1-V6 |
| revenue_duration_category | Text | D1-D5 |
| revenue_risk_composite | Text | e.g. P2-V4-D2 |
| revenue_risk_level | Text | very_low to very_high |
| contracted_revenue_pct | Decimal | 0-100 |
| merchant_revenue_pct | Decimal | 0-100 |
| primary_contract_expiry | Date | |
| duration_coverage_pct | Decimal | Contract life / debt term x 100 |

### F.4.1 Tail Construct (new in v5)

The "tail" measures the time gap between the latest debt maturity and the end of the contracted or concessional revenue stream. The system computes signed tail years and a classification (positive/matched/negative) from these fields + the latest debt maturity from `capital_structure_instruments`.

| Field | Type | Description |
|-------|------|-------------|
| tail_anchor_type | Text | `concession` \| `primary_contract` \| `asset_life` |
| tail_anchor_date | Date | End of concession OR end of primary revenue contract |
| tail_anchor_label | Text | Free-text description of the anchor |
| tail_residual_value_treatment | Text | `zero_residual` \| `nominal_residual` \| `retained_asset` |
| tail_notes | Text | Narrative |

Computed by the API (not stored): `tailYears`, `tailDays`, `classification`.

### F.4.2 Contract & Concession Renewal (new in v5)

The renewal framework codifies how a deal re-contracts its primary revenue source, and whether the structure is economically sound given that renewal mechanism.

| Field | Type | Description |
|-------|------|-------------|
| renewal_profile | Text | `deep_market_repricing` \| `bilateral_negotiation` \| `competitive_tender_asset_retained` \| `competitive_tender_clean_sheet` \| `hand_back_zero_value` \| `no_anchor_contract` |
| debt_repayment_from_renewal_pct | Decimal(5,2) | % of debt principal scheduled to be repaid from post-renewal cashflows. Should be 0 for hand_back_zero_value and competitive_tender_clean_sheet. |
| renewal_notes | Text | Narrative |

Computed by the API: `profileLabel`, `flagLevel` (ok / amber / red / hard_fail), `flagReasons[]`. The flag level is driven by a 2-D matrix combining `renewal_profile` with `tail_classification`. See Analytics → "Contract & Concession Renewal Profile" for the full rules.

### F.5 Financial Metrics & Key Outputs

| Field | Type | Description |
|-------|------|-------------|
| metrics | JSONB | Current period KPIs: revenue, ebitda, cfads, debtService, netDebt, cash, seniorDscr, etc. |
| latest_period_label | Text | e.g. "H2 2025" |
| latest_period_end | Date | |
| latest_reported_at | Timestamp | When last data received |
| next_test_date | Date | Next covenant test |
| unlevered_irr | Decimal | |
| levered_equity_irr | Decimal | |
| moic | Decimal | Multiple on invested capital |
| all_in_cost_of_debt | Decimal | |
| ebitda_margin_lifetime | Decimal | |
| tax_leakage_rate | Decimal | |
| upfront_economics | Decimal | |

### F.6 Covenant Configuration

| Field | Type | Description |
|-------|------|-------------|
| no_hard_covenant_dscr | Boolean | Proxy default if no hard covenant |
| no_hard_covenant_icr | Boolean | |
| proxy_default_flag | Boolean | |
| equity_cure_available | Boolean | |
| equity_cure_regime | JSONB | |
| overall_covenant_status | Text | performing, distribution_lockup, trigger_event, event_of_default |
| compliance_status | Text | |
| distribution_status | Text | permitted, blocked |
| consecutive_lockup_periods | Integer | |

### F.7 Stress & Scenarios

| Field | Type | Description |
|-------|------|-------------|
| sector_kpis_static | JSONB | Static KPIs from origination |
| stress_parameters | JSONB | |
| named_scenarios | JSONB | |
| model_version | Text | |
| model_date | Date | |

### F.8 Grade Engine Configuration

| Field | Type | Description |
|-------|------|-------------|
| grade | Text | Current grade label |
| watchlist | Boolean | Computed by grade engine |
| grade_dscr_metric | Text | seniorAnnualDscr |
| grade_dscr_fallback | Text | seniorDscr |
| grade_collateral_metric | Text | seniorNetDebtEbitda |
| grade_collateral_direction | Text | lower_is_better |
| grade_dscr_threshold_pct | Decimal | Default 10% |
| grade_coll_threshold_pct | Decimal | Default 5% |
| trend_dscr_large_pp | Decimal | Default 5pp |
| trend_coll_large_pp | Decimal | Default 2.5pp |
| trend_small_pp | Decimal | Default 2.5pp |

### F.9 Monitoring

| Field | Type | Description |
|-------|------|-------------|
| assigned_ham | Text | Human Asset Manager |
| assigned_pm | Text | Portfolio Manager |
| collateral_assessment | JSONB | |
| development_phases | JSONB | Legacy — use child table |
| rollout_plan | JSONB | |
| hedging_policy | JSONB | |
| hedging_portfolio | JSONB | Legacy — use child table |

---

## PART 2: CHILD TABLES

### Capital Structure Instruments (`capital_structure_instruments`)

| Field | Type | Description |
|-------|------|-------------|
| instrument_name | Text | e.g. "Senior Term Loan A" |
| instrument_type | Text | senior_term, senior_rcf, capex_facility, mezzanine, shl, bond, note, frn |
| instrument_format | Text | loan, bond, note, frn, il_bond, private_placement, convertible |
| waterfall_priority | Integer | 1 = most senior |
| pari_passu_group | Text | Same group = same rank (e.g. "A") |
| enforcement_class | Text | Senior, Junior, Subordinated |
| issuing_entity_id | UUID | FK to corporate_entities |
| committed_amount | Decimal | |
| drawn_amount | Decimal | |
| currency | VARCHAR(3) | |
| start_date | Date | |
| maturity_date | Date | |
| interest_type | Text | fixed, floating, index_linked, hybrid |
| base_rate | Text | SONIA, SOFR, Euribor, GILT |
| margin_bps | Integer | |
| all_in_rate | Decimal | |
| repayment_type | Text | bullet, amortising, sculpted, cash_sweep |
| our_holding | Decimal | Our share amount |
| our_holding_pct | Decimal | Our percentage |
| dsra_months | Integer | DSRA sizing |
| status | Text | active, repaid, cancelled, restructured |

### Reserve Accounts (`deal_reserve_accounts`)

| Field | Type | Description |
|-------|------|-------------|
| account_name | Text | e.g. "Debt Service Reserve Account" |
| account_type | Text | dsra, mra, capex_reserve, o_and_m_reserve, distribution_reserve, lifecycle_reserve, escrow, lockup, liquidity_facility, rcf, letter_of_credit, pcg |
| sizing_basis | Text | e.g. "6 months senior DS" |
| required_balance | Decimal | Target amount |
| current_balance | Decimal | Actual funded |
| cash_amount | Decimal | Cash portion |
| lc_amount | Decimal | LC portion |
| pcg_amount | Decimal | PCG portion |
| surety_amount | Decimal | Surety bond portion |
| lc_provider | Text | Issuing bank |
| lc_expiry | Date | |
| pcg_provider | Text | Guarantor |
| pcg_expiry | Date | |
| funded_status | Text | fully_funded, partially_funded, unfunded, surplus |
| shortfall | Decimal | Required - current |
| top_up_deadline | Date | |
| periods_underfunded | Integer | Consecutive periods below target |
| release_conditions | Text | |
| currency | VARCHAR(3) | |

### Counterparties (`deal_counterparties`)

| Field | Type | Description |
|-------|------|-------------|
| name | Text | |
| counterparty_type | Text | offtaker, contractor, operator, guarantor, insurer, auditor, facility_agent, security_trustee |
| credit_rating | Text | e.g. "A+/Stable" |
| lei | Text | |
| contract_value | Decimal | |
| contract_expiry | Date | |
| replacement_risk | Text | low, medium, high, critical |
| dependency_narrative | Text | |

### Corporate Entities (`corporate_entities`)

| Field | Type | Description |
|-------|------|-------------|
| entity_name | Text | |
| entity_type | Text | opco, bidco, holdco, topco, spv, issuer, guarantor, servicer |
| parent_entity | Text | |
| jurisdiction | VARCHAR(2) | |
| securitisation_boundary | Boolean | |
| ring_fenced | Boolean | |

### Enforcement Classes (`enforcement_classes`)

| Field | Type | Description |
|-------|------|-------------|
| class_name | Text | e.g. "Class A Senior Secured" |
| class_code | Text | e.g. "A", "Senior" |
| priority | Integer | 1 = most senior |
| included_instruments | JSONB | |
| ratio_definitions | JSONB | |
| covenant_thresholds | JSONB | |
| distribution_conditions | JSONB | |

### Hedge Portfolio (`hedge_portfolio`)

| Field | Type | Description |
|-------|------|-------------|
| hedge_type | Text | interest_rate_swap, cap, floor, fx_forward, inflation_swap, commodity_swap |
| notional | Decimal | |
| pct_of_debt | Decimal | |
| start_date | Date | |
| maturity | Date | |
| fixed_rate | Decimal | |
| strike | Decimal | |
| counterparty | Text | |
| counterparty_rating | Text | |
| mark_to_market | Decimal | |
| mtm_date | Date | |

### Development Phases (`deal_development_phases`)

| Field | Type | Description |
|-------|------|-------------|
| phase_name | Text | |
| phase_number | Integer | |
| capex_budget | Decimal | |
| start_date | Date | |
| target_end_date | Date | |
| actual_end_date | Date | |
| status | Text | planned, active, complete, delayed |
| actual_spend | Decimal | |
| variance | Decimal | |
| variance_pct | Decimal | |

### Investor Allocations (`investor_allocations`)

| Field | Type | Description |
|-------|------|-------------|
| investor_name | Text | |
| account_mandate | Text | |
| tranche | Text | Which instrument |
| amount | Decimal | |
| mandate_size | Decimal | |
| pct_of_mandate | Decimal | |

### Account-Instrument Allocations (`account_instrument_allocations`)

| Field | Type | Description |
|-------|------|-------------|
| account_id | FK | Which internal account |
| instrument_id | UUID | Which instrument |
| allocated_amount | Decimal | |
| allocated_pct | Decimal | |
| acquisition_date | Date | |
| acquisition_price | Decimal | Par = 100 |
| current_nav | Decimal | |
| status | Text | active, sold, redeemed, written_off |

### Jurisdiction Splits (`deal_jurisdiction_splits`)

| Field | Type | Description |
|-------|------|-------------|
| country_code | VARCHAR(2) | ISO alpha-2 |
| country_name | Text | |
| activity_pct | Decimal | 0-100 (must sum to 100 per type) |
| activity_type | Text | revenue, operations, assets, headcount |
| is_primary | Boolean | |

### Financial Template (`deal_financial_template`)

| Field | Type | Description |
|-------|------|-------------|
| sector_template | Text | data_centre, wind_farm, port, airport, toll_road, social_infrastructure, real_estate, clean_tech_hub, solar |
| revenue_line_labels | JSONB | Up to 8 custom revenue line names |
| cost_line_labels | JSONB | Up to 12 custom cost line names |
| capex_line_labels | JSONB | Up to 5 custom capex line names (legacy — use growth/maintenance split) |
| growth_capex_labels | JSONB | Up to 5 growth capex line names |
| maintenance_capex_labels | JSONB | Up to 5 maintenance capex line names |
| funding_line_labels | JSONB | Up to 4 |
| ds_line_labels | JSONB | Up to 5 |
| equity_line_labels | JSONB | Up to 4 |
| sector_kpi_labels | JSONB | Up to 10 |
| class_ratio_labels | JSONB | Up to 4 |
| rab_leverage_labels | JSONB | Up to 4 |

### Covenant Thresholds (`covenant_thresholds`)

| Field | Type | Description |
|-------|------|-------------|
| covenant_name | Text | e.g. "Senior DSCR" |
| ratio_name | Text | seniorDscr, seniorNetDebtEbitda, etc. |
| covenant_category | Text | cash_flow_cover, collateral_value, incurrence, distribution, financial_maintenance |
| test_type | Text | hard_covenant, distribution_condition, trigger, default |
| direction | Text | min (floor), max (ceiling) |
| test_frequency | Text | quarterly, semi_annual, annual |
| enforcement_class | Text | |
| lockup_level | Decimal | |
| trigger_level | Decimal | |
| default_level | Decimal | |
| equity_cure_available | Boolean | |
| step_down_schedule | JSONB | Year-by-year step-down |

### KPI Targets (`deal_kpi_targets`)

| Field | Type | Description |
|-------|------|-------------|
| kpi_key | Text | sector_kpi_1, sector_kpi_2, etc. |
| kpi_label | Text | e.g. "Technical Availability (%)" |
| scenario | Text | base_case, stress_case |
| target_value | Decimal | Expected value |
| target_floor | Decimal | Minimum acceptable |
| target_ceiling | Decimal | Maximum (lower_is_better) |
| direction | Text | higher_is_better, lower_is_better |
| unit | Text | percentage, currency, count, ratio, years |
| source | Text | ic_memo, business_plan |
| source_date | Date | |

### Consent Mechanics (`deal_consent_mechanics`)

| Field | Type | Description |
|-------|------|-------------|
| majority_threshold_pct | Decimal | e.g. 66.67 |
| supermajority_threshold_pct | Decimal | e.g. 75 or 90 |
| voting_basis | Text | by_commitment, by_lender, by_block |
| all_lender_matters | JSONB | Matters requiring unanimous consent |
| snooze_you_lose | Boolean | |
| deemed_consent_on_silence | Boolean | |
| yank_clause | Boolean | |
| non_consenting_replacement_basis | Text | par, make_whole, market_value |
| standard_consent_period_days | Integer | |
| disenfranchisement_triggers | JSONB | |

### Deal Onboarding Snapshots (`deal_onboarding_snapshots`) — new in v5

**Write-once** frozen capture of the deal position at investment. A database trigger blocks any edit to content fields. Restructurings create a new row with incremented `snapshot_number`; the previous row is marked `is_current = FALSE`.

**Supersession fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| deal_id | Integer | FK to deals (multiple rows allowed) |
| snapshot_number | Integer | 1 = original, 2+ = successive re-underwritings |
| snapshot_reason | Text | `origination` \| `restructuring` \| `re_underwriting` \| `covenant_reset` |
| snapshot_date | Date | Effective date of the snapshot |
| is_current | Boolean | Exactly one TRUE per deal (partial unique index) |
| superseded_by_snapshot_id | UUID | FK to the replacement row |
| superseded_at | Timestamp | When the transition happened |
| superseded_reason | Text | Why this snapshot was superseded |
| captured_by | Text | IC approver or credit officer |
| captured_at | Timestamp | Row creation time |

**Group A — Structural position at onboarding:**
| Field | Type | Description |
|-------|------|-------------|
| tail_years_at_onboarding | Decimal(6,2) | Signed (e.g. +3.07) |
| tail_classification_at_onboarding | Text | positive_tail / matched / negative_tail |
| renewal_profile_at_onboarding | Text | Frozen renewal profile |
| debt_repayment_from_renewal_pct_at_onboarding | Decimal(5,2) | |
| revenue_risk_code_at_onboarding | Text | Frozen P-V-D |
| concession_years_remaining_at_onboarding | Decimal(5,2) | |

**Group B — Financial metrics at onboarding:**
| Field | Type | Description |
|-------|------|-------------|
| entry_leverage | Decimal(6,2) | Net Debt / EBITDA at purchase |
| entry_dscr_year_1 | Decimal(6,2) | |
| entry_dscr_min_life | Decimal(6,2) | |
| entry_llcr | Decimal(6,2) | |
| entry_loan_life_years | Decimal(5,2) | |
| entry_wal_years | Decimal(5,2) | |

**Group C — Lender case / stress at onboarding:**
| Field | Type | Description |
|-------|------|-------------|
| lender_case_dscr_min | Decimal(6,2) | |
| lender_case_leverage_peak | Decimal(6,2) | |
| stress_break_even_pct | Decimal(5,2) | % revenue decline to break DSCR 1.0x |
| stress_cases_tested | Text | Free-text description |

**Group D — IC governance:**
| Field | Type | Description |
|-------|------|-------------|
| ic_memo_date | Date | |
| ic_memo_reference | Text | |
| ic_approved_by | Text | |
| ic_approval_conditions | Text | |
| ic_vote_margin | Text | unanimous / majority / dissented |

**Group E — Origination economics:**
| Field | Type | Description |
|-------|------|-------------|
| entry_all_in_margin_bps | Integer | |
| entry_upfront_fees_bps | Integer | |
| entry_secondary_purchase_price_pct | Decimal(6,2) | % of par |
| entry_yield_to_maturity | Decimal(7,4) | Decimal (0.0920 = 9.20%) |
| expected_hold_period_years | Decimal(5,2) | |
| exit_strategy | Text | |

**Group F — Market context:**
| Field | Type | Description |
|-------|------|-------------|
| entry_risk_free_rate_bps | Integer | 10yr gilt / Treasury |
| entry_credit_spread_bps | Integer | Spread over risk-free |
| entry_relative_value_notes | Text | |

**Group G — Initial risk assessment:**
| Field | Type | Description |
|-------|------|-------------|
| initial_risk_score | Decimal(5,2) | |
| initial_grade | Text | |
| critical_risks_at_onboarding | Text | Top 3 risks narrative |
| notes | Text | General snapshot notes |

**Enforcement:** The `enforce_onboarding_snapshot_immutability()` trigger raises an exception on any update to a content field on a current snapshot, or on any update at all to a superseded snapshot. The only allowed edit is the supersession transition itself.

---

## PART 3: FINANCIAL LINE ITEMS (183 total)

### Cashflow Statement (44 rows)

#### Operating Cash Flow
| # | Line Key | Label | Type | Formula |
|---|----------|-------|------|---------|
| 1 | total_revenue | Total Revenue | Computed | SUM(revenue subcategory lines) |
| 2 | amort_deferred_income | Amortisation of Deferred Income | Input | |
| 3 | total_operating_costs | Total Operating Costs | Computed | SUM(cost subcategory lines) |
| 4 | disallowed_costs | Disallowed Costs | Input | |
| 5 | exceptional_items | Exceptional Items | Input | |
| 6 | ebitda | EBITDA | Computed | Revenue + Deferred - Opex - Disallowed - Exceptional |

#### Capital Expenditure
| 7 | capital_expenditure | Capital Expenditure | Computed | SUM(capex subcategory lines) |
| 8 | charger_replacement_costs | Charger / Equipment Replacement | Input | |

#### Working Capital, Reserves & Tax
| 9 | working_capital_movement | Working Capital Movement | Input | |
| 10 | reserve_account_movements | Reserve Account Movements | Input | |
| 11 | pre_finance_pre_tax_cf | Pre-Finance, Pre-Tax Cash Flow | Computed | |
| 12 | tax_paid | Tax Paid | Input | |
| 13 | pre_finance_post_tax_cf | Pre-Finance, Post-Tax Cash Flow | Computed | |

#### Additional Sources
| 14 | interest_on_cash | Interest on Cash Balances | Input | |
| 15 | customer_prepayment | Customer Pre-Payments | Input | |
| 16 | grant_income | Grant / Subsidy Income | Input | |

#### Funding Sources
| 17 | senior_debt_drawdown | Senior Debt Drawdown | Input | |
| 18 | capex_facility_drawdown | Capex Facility Drawdown | Input | |
| 19 | junior_debt_drawdown | Junior / Mezzanine Debt Drawdown | Input | |
| 20 | shareholder_loan_drawdown | Shareholder Loan Drawdown | Input | |
| 21 | equity_drawdown | Equity Drawdown | Input | |
| 22 | total_funding | Total Funding | Computed | SUM(funding lines) |

#### CFADS
| 23 | cfads | CFADS | Computed | Post-tax CF + Additional Sources + Funding |

#### Senior Debt Service
| 24 | senior_interest | Senior Interest | Input | |
| 25 | senior_principal | Senior Principal (Scheduled) | Input | |
| 26 | senior_debt_service | Total Senior Debt Service | Computed | Interest + Scheduled Principal (excludes sweep) |
| 27 | cf_after_senior_ds | CF After Senior Debt Service | Computed | CFADS - Senior DS |
| 28 | senior_principal_sweep | Senior Cash Sweep | Input | NOT included in DSCR |

#### Junior Debt Service
| 29 | junior_interest | Junior Interest | Input | |
| 30 | junior_principal | Junior Principal | Input | |
| 31 | junior_debt_service | Total Junior Debt Service | Computed | Interest + Principal (excludes sweep) |
| 32 | cf_after_junior_ds | CF After Junior Debt Service | Computed | CF After Senior - Junior DS |
| 33 | junior_principal_sweep | Junior Cash Sweep | Input | NOT included in DSCR |

#### Shareholder & Intercompany
| 34 | shareholder_loan_interest | Shareholder Loan Interest | Input | |
| 35 | shareholder_loan_repayment | Shareholder Loan Repayment | Input | |
| 36 | intercompany_interest_net | Intercompany Interest (Net) | Input | |

#### Other Fees & Costs
| 37 | ticking_commitment_fees | Ticking / Commitment Fees | Input | |
| 38 | debt_arrangement_fees | Debt Arrangement Fees | Input | |
| 39 | liquidity_facility_drawdown | Liquidity Facility Drawdown | Input | |

#### Net Cashflow & Closing
| 40 | net_cashflow | Net Cashflow | Computed | |
| 41 | cash_bf | Opening Cash Balance | Input | |
| 42 | distributions | Distributions | Input | |
| 43 | share_capital_redemption | Share Capital Redemption | Input | |
| 44 | cash_cf | Closing Cash Balance | Computed | Opening + Net CF - Distributions - Redemptions |

### Covenant Ratios (21 rows)

#### Core (all sectors)
| 45 | senior_dscr | Senior DSCR | Ratio | CFADS / Senior DS (excludes sweep) |
| 46 | senior_annual_dscr | Senior Annual DSCR | Ratio | Annualised (excludes sweep) |
| 47 | net_debt_ebitda | Net Debt / EBITDA | Ratio | |
| 48 | icr | Interest Coverage Ratio | Ratio | EBITDA / Interest |
| 49 | fccr | Fixed Charge Coverage Ratio | Ratio | |

#### Project Finance
| 50 | llcr | LLCR | Ratio | NPV(CFADS to maturity) / Debt |
| 51 | plcr | PLCR | Ratio | NPV(CFADS over project life) / Debt |

#### Real Estate
| 52 | ltv | Loan-to-Value | Ratio | |
| 53 | rental_coverage | Rental Coverage Ratio | Ratio | |
| 54 | debt_yield | Debt Yield | Ratio | |

#### Regulated Utility / WBS
| 55 | net_debt_rab | Net Debt / RAB | Ratio | |
| 56 | acr | Asset Cover Ratio | Ratio | |
| 57 | pmicr | Post-Maintenance ICR | Ratio | |
| 58 | senior_icr_reg_dep | Senior ICR (Reg Dep) | Ratio | |
| 59 | senior_icr_2pct_rab | Senior ICR (2% RAB) | Ratio | |
| 60 | class_a_debt_rab | Class A Net Debt / RAB | Ratio | |
| 61 | total_debt_rab | Total Debt / RAB | Ratio | |
| 62 | solvency_ratio | Solvency Ratio | Ratio | |

#### Social Infrastructure / PPP
| 63 | annual_dscr_lockup | Annual DSCR (Lock-Up) | Ratio | |
| 64 | lifecycle_reserve_cover | Lifecycle Reserve Cover | Ratio | |
| 65 | mra_cover | Maintenance Reserve Cover | Ratio | |

### Supplementary P&L (7 rows)
| 66 | ebitda_margin | EBITDA Margin (%) | Percentage | |
| 67 | depreciation | Depreciation | Input | |
| 68 | regulatory_depreciation | Regulatory Depreciation | Input | |
| 69 | ebit | EBIT | Computed | EBITDA - Depreciation |
| 70 | non_cash_charges | Other Non-Cash Charges | Input | |
| 71 | gains_on_disposal | Gains on Asset Sales | Input | |
| 72 | losses_on_disposal | Losses on Asset Sales | Input | |

### Balance Sheet & Reserves (40 rows)

#### Reserve Account Balances
| 73-77 | dsra_required/actual/cash/lc/pcg | DSRA balances | Input | |
| 78-81 | mra_required/actual/cash/lc | MRA balances | Input | |
| 82-83 | capex_reserve_required/actual | Capex Reserve | Input | |
| 84-85 | om_reserve_required/actual | O&M Reserve | Input | |
| 86-87 | distribution_reserve_req/act | Distribution Reserve | Input | |
| 88-89 | lifecycle_reserve_req/act | Lifecycle Reserve | Input | |
| 90 | escrow_balance | Escrow | Input | |
| 91 | lockup_account_balance | Lock-Up Account | Input | |

#### Liquidity Facilities
| 92-94 | liquidity_facility_limit/drawn/avail | Liquidity Facility | Input/Computed | |
| 95-97 | wcf_limit/drawn/available | Working Capital Facility | Input/Computed | |
| 98-100 | rcf_limit/drawn/available | RCF | Input/Computed | |

#### Aggregates & Moody's Adjustments
| 101-104 | total_reserves_required/actual/shortfall, total_liquidity | Totals | Computed | |
| 105-106 | total_debt_drawn, net_debt | Debt aggregates | Input/Computed | |
| 107-110 | operating_lease/pension/hybrid/securitised | Moody's adjustments | Input | |
| 111-112 | moodys_adjusted_debt/net_debt | Adjusted totals | Computed | |

### Moody's Metrics (3 rows)
| 113 | ffo | FFO | Computed | EBITDA - Tax - Interest + Interest Received |
| 114 | rcf | RCF | Computed | FFO - Distributions |
| 115 | total_debt_service | Total Debt Service | Computed | Senior DS + Junior DS |

### Moody's Ratios (12 rows)
| 116 | ffo_interest_coverage | FFO Interest Coverage | Ratio | |
| 117 | ffo_net_debt | FFO / Net Debt | Percentage | |
| 118 | rcf_net_debt | RCF / Net Debt | Percentage | |
| 119 | ffo_debt | FFO / Debt | Percentage | |
| 120 | rcf_debt | RCF / Debt | Percentage | |
| 121 | total_dscr | Total DSCR | Ratio | CFADS / (Senior + Junior DS) |
| 122 | adscr_breakeven | ADSCR Break-Even | Percentage | |
| 123 | aicr | AICR | Ratio | |
| 124 | cash_interest_coverage | Cash Interest Coverage | Ratio | |
| 125-127 | adj_ffo_net_debt / adj_rcf_net_debt / adj_net_debt_ebitda | Moody's Adjusted | Ratio/% | |

### Sector Subcategory Slots (56 slots)
| revenue_1 to revenue_8 | Revenue lines | Up to 8 per deal |
| cost_1 to cost_12 | Cost lines | Up to 12 per deal |
| capex_1 to capex_5 | Capex lines (legacy) | Up to 5 per deal |
| growth_capex_1 to growth_capex_5 | Growth capex lines | Up to 5 per deal |
| maintenance_capex_1 to maintenance_capex_5 | Maintenance capex lines | Up to 5 per deal |
| funding_1 to funding_4 | Funding lines | Up to 4 per deal |
| ds_1 to ds_5 | Debt service lines | Up to 5 per deal |
| equity_1 to equity_4 | Equity lines | Up to 4 per deal |
| sector_kpi_1 to sector_kpi_10 | Sector KPIs | Up to 10 per deal |
| class_ratio_1 to class_ratio_4 | Class ratios | Up to 4 per deal |
| rab_leverage_1 to rab_leverage_4 | RAB leverage | Up to 4 per deal |

---

## PART 4: REPORTING & FORECAST STRUCTURE

### Reporting Schedule (`deal_reporting_schedule`)
One per deal — defines the reporting calendar.
| periodicity | semi_annual, quarterly, annual |
| first_period_start | Date |
| final_period_end | Date (maturity or concession expiry) |
| fiscal_year_end_month | 1-12 |
| reporting_lag_days | Default 45-60 |
| forecast_end_date | If model extends beyond maturity |

### Reporting Periods (`deal_reporting_periods`)
One per period slot. Default: semi-annual for 30 years = 60 periods.
| period_flag | Sort key: "2026H1" |
| period_label | Display: "H1 2026" |
| period_start / period_end | Date range |
| period_frequency | semi_annual, quarterly, annual |
| period_ordinal | 1-based sequential |
| period_type | historical, current, forecast |
| data_status | awaiting, extracted, reviewed, approved, restatement |

### Forecast Period Items (`forecast_period_items`)
Write-once at IC approval. One row per (version x period x line item).
| forecast_case_version_id | Which frozen scenario version |
| reporting_period_id | Which period |
| line_key | Which line item |
| value | The forecast value |

### Actual Period Items (`period_financial_items`)
From borrower compliance certificates. One row per (period x line item).
| reporting_period_id | Which period |
| line_key | Which line item |
| reported_value | From document extraction |
| computed_value | Platform-calculated |
| approved_value | Final golden value |
| forecast_value | From active forecast for comparison |
| variance_to_forecast | approved - forecast |
| value_origin | extracted, computed, manual, override |
| item_status | pending, auto_approved, flagged, reviewed, approved |

### Forecast Cases
Three per deal: management_case, credit_case, combined_downside.
Each has versions (frozen at IC, new version on reforecast).

### Forecast Model Metadata (`forecast_model_metadata`)
Records the source financial model.
| model_name | e.g. "Aurora IC Model v3.2" |
| model_date | When prepared |
| model_source | ic_memo, sponsor_model, lender_model |
| model_periodicity | semi_annual, quarterly, annual |
| model_start_date / model_end_date | Coverage |
| model_periods | Total periods |
| model_currency | |
| base_rate_assumption / inflation_assumption | Key assumptions |

---

## PART 5: RISK & OBLIGATION FRAMEWORKS

### Risk Taxonomy — 236 risks across 7 categories
| Category | Count |
|----------|-------|
| 1. Credit & Financial Risk | 15 |
| 2. Structural & Documentation Risk | 11 |
| 3. Business & Operational Risk | 15 |
| 4. Market & Macroeconomic Risk | 22 (incl. Forecast Optimism) |
| 5. Regulatory & Legal Risk | 9 |
| 6. ESG & Climate Risk | 8 |
| 7. Sector-Specific Risk | 156 (24 sub-sectors) |

### Obligation Taxonomy — 229 items across 13 categories
| Category | Count |
|----------|-------|
| 1. Financial Information Deliverables | 24 |
| 2. Financial Covenants | 17 |
| 3. Notification Obligations | 28 |
| 4. Periodic Non-Financial Deliverables | 10 |
| 5. Affirmative Covenants | 22 |
| 6. Negative Covenants | 16 |
| 7. Events of Default | 32 |
| 8. Trigger Events | 10 |
| 9. Sector-Specific Deliverables | 39 |
| 10. Agent / Administrative | 8 |
| 11. Distribution Conditions | 10 |
| 12. Consents & Voting | 8 |
| 13. Invitations & Engagement | 5 |

---

## PART 6: PERFORMANCE GRADES

| Grade | Label | Headroom Erosion | Watchlist |
|-------|-------|-----------------|-----------|
| 1 | Outperforming | < -10% (better than expected) | No |
| 2 | In Line | -10% to +10% | No |
| 3 | Underperforming | > +10% (below expectation) | Auto-set by trend |
| 4 | Watchlist | Breached lockup or default | Yes |

### Headroom Formula
```
Headroom % = (Actual DSCR - Default) / (Management Case DSCR - Default) x 100
```
- 100% = at management case
- 0% = at default threshold
- Negative = breached

### Trend Classification
From 3 consecutive periods of erosion data:
- **Improving** — erosion decreasing
- **Flat** — within ±2.5pp
- **Deteriorating** — erosion increasing
- **Deteriorating Rapidly** — large positive deltas with persistent drift

---

*Document generated from the Sesame Street platform schema, April 2026.*
