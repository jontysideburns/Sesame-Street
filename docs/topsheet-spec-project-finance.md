# TopSheet Specification — Project Finance / SPV Single-Asset

This document defines the complete data schema for monitoring a single-asset project finance or SPV-based investment (e.g. infrastructure concession, real estate SPV, renewable energy project). For corporate/holdco investments, a separate specification applies.

---

## F.1 Deal Identity & Static Data

### F.1.1 Borrower & Deal Identification
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| investment_id | UUID | Yes | System-generated |
| investment_name | Text | Yes | e.g. "Aurora Prime Data Campus" |
| borrower_legal_name | Text | Yes | Full registered name |
| borrower_trading_name | Text | | Trading/brand name if different |
| borrower_lei | String(20) | | Legal Entity Identifier |
| borrower_jurisdiction | ISO 3166-1 alpha-2 | Yes | Country of incorporation |
| borrower_registered_number | Text | | Companies House / equivalent |
| borrower_registered_address | Text | | Full registered address |
| project_codename | Text | | Internal codename |
| approved_auditors | Text[] | | List of approved audit firms |

### F.1.2 Sector Classification
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| sic_code | String(5) | Yes | UK SIC 2007 |
| sector_label | Text | Yes | e.g. "Data Center", "Wind Farm" |
| sub_sector_label | Text | Yes | e.g. "Hyperscale Colocation" |
| ticcs_classification | Text | | TICCS infrastructure classification |
| naics_code | String(6) | | North American classification |

### F.1.3 Ownership & Controlling Parties
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| sponsor_name | Text | | Lead sponsor |
| sponsor_fund | Text | | Fund vehicle |
| parent_group | Text | | Ultimate parent |
| ownership_structure | Text | | Narrative description |
| consortium_members | JSONB | | Array of consortium members with stakes |
| government_related | Boolean | Yes | Government-related entity flag |

### F.1.4 Geography & Currency
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| country | ISO alpha-2 | Yes | Primary project country |
| region | Enum | Yes | UK, Europe, North America, APAC, etc. |
| primary_business_country | ISO alpha-2 | | Main operating jurisdiction |
| deal_currency | ISO 4217 | Yes | e.g. USD, GBP, EUR |
| reporting_currency | ISO 4217 | | If different from deal currency |

### F.1.5 Jurisdiction Splits (child table: `deal_jurisdiction_splits`)
One row per country per activity type. Captures multi-jurisdiction revenue/operations.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| country_code | ISO alpha-2 | Yes | |
| country_name | Text | Yes | |
| activity_pct | Decimal | Yes | 0-100, must sum to 100 per activity_type |
| activity_type | Enum | Yes | revenue, operations, assets, headcount |
| is_primary | Boolean | Yes | TRUE for main jurisdiction |

---

## F.2 Deal Structure & Terms

### F.2.1 Structure & Origination
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| structure_type | Enum | Yes | project_finance, acquisition_finance, development_finance, etc. |
| deal_type | Enum | Yes | Project Finance, Infrastructure, Real Estate, etc. |
| origination_type | Enum | Yes | primary, secondary, restructuring |
| seniority | Enum | Yes | senior_secured, senior_unsecured, mezzanine, subordinated |
| security_type | Enum | Yes | Description of security package |
| security_summary | Text | | Narrative of security |

### F.2.2 Key Dates
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| origination_date | Date | Yes | |
| commitment_date | Date | | |
| first_drawdown_date | Date | | |
| cod_date | Date | | Commercial Operations Date |
| maturity_date | Date | Yes | Final maturity |
| weighted_average_life | Decimal | | In years |
| concession_expiry_date | Date | | For concession-based deals |
| fiscal_year_end_month | Integer | Yes | 1-12 |
| current_phase | Enum | Yes | construction, ramp_up, operational, refinancing |
| regulatory_period_current | Text | | For regulated assets |

### F.2.3 Facility Economics
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| total_facility_size | Decimal | Yes | Total committed across all instruments |
| our_commitment | Decimal | Yes | Our share |
| our_holding_pct | Decimal | | Percentage |
| pricing_type | Enum | Yes | fixed, floating, index_linked |
| pricing_margin_bps | Integer | | Spread over reference rate |
| reference_rate | Text | | SONIA, SOFR, Euribor, etc. |
| governing_law | Text | | English, New York, etc. |
| facility_agent | Text | | |
| security_trustee | Text | | |

### F.2.4 Revenue Risk Classification
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| revenue_pricing_mechanism | Enum | Yes | P1 (fixed) through P6 (hybrid) |
| revenue_volume_mechanism | Enum | Yes | V1 (guaranteed) through V6 (speculative) |
| revenue_duration_category | Enum | Yes | D1 (fully matched) through D5 (merchant) |
| revenue_risk_composite | Text | Yes | e.g. "P2-V4-D2" |
| revenue_risk_level | Enum | Yes | very_low, low, moderate, high, very_high |
| contracted_revenue_pct | Decimal | | % under contract |
| merchant_revenue_pct | Decimal | | % at spot/merchant |
| primary_contract_expiry | Date | | Earliest material contract expiry |
| duration_coverage_pct | Decimal | | Contract life / debt term x 100 |

---

## F.2A Capital Structure Model

### F.2A.1 Instruments (child table: `capital_structure_instruments`)
One row per debt instrument. Supports pari-passu grouping and multi-entity issuance.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| instrument_name | Text | Yes | e.g. "Senior Term Loan A" |
| instrument_type | Enum | Yes | senior_term, senior_rcf, capex_facility, junior_mezz, shl, bond, private_placement, etc. |
| instrument_format | Enum | | loan, bond, note, frn, il_bond, private_placement, convertible |
| waterfall_priority | Integer | Yes | 1 = most senior |
| pari_passu_group | Text | | Instruments in same group rank equally |
| enforcement_class | Text | | Links to enforcement class |
| issuing_entity_id | UUID | | Which corporate entity issued this |
| committed_amount | Decimal | Yes | |
| drawn_amount | Decimal | | |
| currency | ISO 4217 | Yes | |
| start_date | Date | | |
| maturity_date | Date | Yes | |
| interest_type | Enum | | fixed, floating, index_linked, hybrid |
| base_rate | Text | | SONIA, SOFR, Euribor, etc. |
| margin_bps | Integer | | Spread in basis points |
| all_in_rate | Decimal | | Total cost of funds |
| repayment_type | Enum | Yes | bullet, amortising, sculpted, cash_sweep |
| our_holding | Decimal | | Our share amount |
| our_holding_pct | Decimal | | Our percentage |
| dsra_months | Integer | | DSRA sizing for this instrument |
| status | Enum | Yes | active, repaid, cancelled, restructured |

### F.2A.2 Enforcement Classes (child table: `enforcement_classes`)
Groups instruments into covenant enforcement regimes.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| class_name | Text | Yes | e.g. "Class A Senior Secured" |
| class_code | Text | Yes | e.g. "A", "Senior" |
| priority | Integer | Yes | 1 = most senior |
| included_instruments | JSONB | | Array of instrument references |
| ratio_definitions | JSONB | | DSCR/ICR definitions for this class |
| covenant_thresholds | JSONB | | Lockup/trigger/default for this class |
| distribution_conditions | JSONB | | Conditions for distributions at this level |

### F.2A.3 Corporate Entities (child table: `corporate_entities`)
Maps the SPV / corporate structure.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| entity_name | Text | Yes | |
| entity_type | Enum | Yes | opco, bidco, holdco, topco, spv, issuer, guarantor, servicer |
| parent_entity | Text | | Parent in the chain |
| jurisdiction | ISO alpha-2 | | |
| securitisation_boundary | Boolean | | Inside/outside the ring-fence |
| ring_fenced | Boolean | | |

### F.2A.4 Reserve Accounts (child table: `deal_reserve_accounts`)
One row per reserve account or liquidity facility.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| account_name | Text | Yes | e.g. "Debt Service Reserve Account" |
| account_type | Enum | Yes | dsra, mra, capex_reserve, o_and_m_reserve, distribution_reserve, lifecycle_reserve, escrow, lockup, liquidity_facility, working_capital_facility, rcf, letter_of_credit, pcg, insurance_bond |
| sizing_basis | Text | | e.g. "6 months senior DS" |
| required_balance | Decimal | | Target amount |
| current_balance | Decimal | | Current funded amount |
| funded_status | Enum | | fully_funded, partially_funded, unfunded, surplus |
| cash_amount | Decimal | | Portion held in cash |
| lc_amount | Decimal | | Portion covered by letter of credit |
| pcg_amount | Decimal | | Portion covered by parent company guarantee |
| surety_amount | Decimal | | Portion covered by surety bond |
| lc_provider | Text | | Issuing bank for LC |
| lc_expiry | Date | | LC expiry |
| pcg_provider | Text | | Guarantor entity |
| pcg_expiry | Date | | Guarantee expiry |
| shortfall | Decimal | | Required - current (computed) |
| top_up_deadline | Date | | Deadline to cure shortfall |
| periods_underfunded | Integer | | Consecutive periods below target |
| linked_instrument | Text | | Which debt instrument this supports |
| currency | ISO 4217 | | |

---

## F.3 Ratings & Credit Assessment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| moodys_rating | Text | | e.g. "Baa2" |
| sp_rating | Text | | e.g. "BBB" |
| fitch_rating | Text | | e.g. "BBB" |
| internal_credit_score | Text | | Internal assessment |
| performance_grade | Integer | Yes | 1-4 (system-computed from headroom) |
| watchlist | Boolean | Yes | Auto-set from grade/trend |

---

## F.4 Key Counterparties (child table: `deal_counterparties`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | Text | Yes | |
| counterparty_type | Enum | Yes | offtaker, contractor, operator, guarantor, insurer, auditor, etc. |
| credit_rating | Text | | |
| lei | Text | | Legal Entity Identifier |
| dependency_narrative | Text | | Key-person or single-counterparty risk |
| replacement_risk | Enum | | low, medium, high, critical |
| contract_expiry | Date | | |
| contract_value | Decimal | | |

---

## F.5 Financial Template & Time Series

### F.5.1 Sector Template (child table: `deal_financial_template`)
Defines the line items recorded for this deal's sector.

| Field | Type | Notes |
|-------|------|-------|
| sector_template | Enum | data_centre, wind_farm, port, airport, toll_road, social_infrastructure, real_estate, clean_tech_hub |
| revenue_line_labels | JSONB | Up to 8 custom revenue lines |
| cost_line_labels | JSONB | Up to 12 custom cost lines |
| capex_line_labels | JSONB | Up to 5 custom capex lines |
| funding_line_labels | JSONB | Up to 4 custom funding lines |
| ds_line_labels | JSONB | Up to 5 custom debt service lines |
| equity_line_labels | JSONB | Up to 4 custom equity lines |
| sector_kpi_labels | JSONB | Up to 10 sector KPIs |
| class_ratio_labels | JSONB | Up to 4 class-based ratios |
| rab_leverage_labels | JSONB | Up to 4 RAB/leverage ratios |

### F.5.2 Generic Cashflow Model (155 line items)

#### Operating Cash Flow (rows 1-6)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 1 | total_revenue | Total Revenue | Computed | SUM of revenue subcategory lines |
| 2 | amort_deferred_income | Amortisation of Deferred Income | Currency | |
| 3 | total_operating_costs | Total Operating Costs | Computed | SUM of cost subcategory lines |
| 4 | disallowed_costs | Disallowed Costs | Currency | Corporate/WBS disallowed costs |
| 5 | exceptional_items | Exceptional Items | Currency | Pensions, separation costs, etc. |
| 6 | ebitda | EBITDA | Computed | Revenue + Deferred - Opex - Disallowed - Exceptional |

#### Capital Expenditure (rows 7-8)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 7 | capital_expenditure | Capital Expenditure | Computed | SUM of capex subcategory lines |
| 8 | charger_replacement_costs | Charger / Equipment Replacement | Currency | Lifecycle replacement capex |

#### Working Capital, Reserves & Tax (rows 9-13)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 9 | working_capital_movement | Working Capital Movement | Currency | Receivables, payables, inventory |
| 10 | reserve_account_movements | Reserve Account Movements | Currency | DSRA, MRA, TRA, capex reserves, lock-up, escrow |
| 11 | pre_finance_pre_tax_cf | Pre-Finance, Pre-Tax Cash Flow | Computed | EBITDA - Capex +/- WC +/- Reserves |
| 12 | tax_paid | Tax Paid | Currency | Corporation tax (negative) |
| 13 | pre_finance_post_tax_cf | Pre-Finance, Post-Tax Cash Flow | Computed | Pre-finance CF - Tax |

#### Additional Sources / Income (rows 14-16)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 14 | interest_on_cash | Interest on Cash Balances | Currency | |
| 15 | customer_prepayment | Customer Pre-Payments | Currency | |
| 16 | grant_income | Grant / Subsidy Income | Currency | |

#### Funding Sources (rows 17-22)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 17 | senior_debt_drawdown | Senior Debt Drawdown | Currency | |
| 18 | capex_facility_drawdown | Capex Facility Drawdown | Currency | |
| 19 | junior_debt_drawdown | Junior / Mezzanine Debt Drawdown | Currency | |
| 20 | shareholder_loan_drawdown | Shareholder Loan Drawdown | Currency | |
| 21 | equity_drawdown | Equity Drawdown | Currency | |
| 22 | total_funding | Total Funding | Computed | SUM of funding lines |

#### Cash Available for Debt Service (row 23)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 23 | cfads | CFADS | Computed | Post-tax CF + Additional Sources + Funding |

#### Senior Debt Service (rows 24-28)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 24 | senior_interest | Senior Interest | Currency | Interest + commitment fees |
| 25 | senior_principal | Senior Principal (Scheduled) | Currency | Scheduled amortisation |
| 26 | senior_principal_sweep | Senior Principal (Cash Sweep) | Currency | Excess cash sweep |
| 27 | senior_debt_service | Total Senior Debt Service | Computed | Interest + principal + sweep |
| 28 | cf_after_senior_ds | CF After Senior Debt Service | Computed | CFADS - Senior DS |

#### Junior Debt Service (rows 29-31)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 29 | junior_interest | Junior Interest | Currency | Mezzanine interest |
| 30 | junior_principal | Junior Principal | Currency | |
| 31 | junior_debt_service | Total Junior Debt Service | Computed | Junior interest + principal |

#### Shareholder & Intercompany (rows 32-34)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 32 | shareholder_loan_interest | Shareholder Loan Interest | Currency | May capitalise |
| 33 | shareholder_loan_repayment | Shareholder Loan Repayment | Currency | |
| 34 | intercompany_interest_net | Intercompany Interest (Net) | Currency | |

#### Other Fees & Costs (rows 35-37)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 35 | ticking_commitment_fees | Ticking / Commitment Fees | Currency | |
| 36 | debt_arrangement_fees | Debt Arrangement Fees | Currency | |
| 37 | liquidity_facility_drawdown | Liquidity Facility Drawdown | Currency | |

#### Net Cashflow & Closing (rows 38-42)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 38 | net_cashflow | Net Cashflow | Computed | CF after all DS, fees, intercompany |
| 39 | cash_bf | Opening Cash Balance | Currency | Brought forward |
| 40 | distributions | Distributions | Currency | Dividends to equity (negative) |
| 41 | share_capital_redemption | Share Capital Redemption | Currency | Preference share / equity redemption |
| 42 | cash_cf | Closing Cash Balance | Computed | Opening + Net CF - Distributions - Redemptions |

#### Core Covenant Ratios — All Sectors (rows 43-47)
| # | Line Key | Label | Type | Sectors |
|---|----------|-------|------|---------|
| 43 | senior_dscr | Senior DSCR | Ratio | All |
| 44 | senior_annual_dscr | Senior Annual DSCR | Ratio | All |
| 45 | net_debt_ebitda | Net Debt / EBITDA | Ratio | All |
| 46 | icr | Interest Coverage Ratio (ICR) | Ratio | All |
| 47 | fccr | Fixed Charge Coverage Ratio | Ratio | All |

#### Project Finance Ratios (rows 48-49)
| # | Line Key | Label | Type | Sectors |
|---|----------|-------|------|---------|
| 48 | llcr | Loan Life Coverage Ratio (LLCR) | Ratio | Port, Wind, Toll Road, Clean Tech |
| 49 | plcr | Project Life Coverage Ratio (PLCR) | Ratio | Port, Wind, Toll Road |

#### Real Estate Ratios (rows 50-52)
| # | Line Key | Label | Type | Sectors |
|---|----------|-------|------|---------|
| 50 | ltv | Loan-to-Value (LTV) | Ratio | Real Estate |
| 51 | rental_coverage | Rental Coverage Ratio | Ratio | Real Estate |
| 52 | debt_yield | Debt Yield | Ratio | Real Estate |

#### Regulated Utility / WBS Ratios (rows 53-60)
| # | Line Key | Label | Type | Sectors |
|---|----------|-------|------|---------|
| 53 | net_debt_rab | Net Debt / RAB | Ratio | Airport, Utility |
| 54 | acr | Asset Cover Ratio (ACR) | Ratio | Airport WBS |
| 55 | pmicr | Post-Maintenance ICR (PMICR) | Ratio | Airport, Utility |
| 56 | senior_icr_reg_dep | Senior ICR (Regulatory Dep.) | Ratio | Airport WBS |
| 57 | senior_icr_2pct_rab | Senior ICR (2% RAB) | Ratio | Airport WBS |
| 58 | class_a_debt_rab | Class A Net Debt / RAB | Ratio | Airport WBS |
| 59 | total_debt_rab | Total Debt / RAB | Ratio | Airport, Utility |
| 60 | solvency_ratio | Solvency Ratio | Ratio | Airport WBS |

#### Social Infrastructure / PPP Ratios (rows 61-63)
| # | Line Key | Label | Type | Sectors |
|---|----------|-------|------|---------|
| 61 | annual_dscr_lockup | Annual DSCR (Lock-Up) | Ratio | Social Infra, PPP |
| 62 | lifecycle_reserve_cover | Lifecycle Reserve Cover | Ratio | Social Infra, PPP |
| 63 | mra_cover | Maintenance Reserve Cover | Ratio | Social Infra, PPP, Port |

#### Supplementary P&L Items (rows 64-67)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 64 | ebitda_margin | EBITDA Margin (%) | Percentage | EBITDA / Revenue |
| 65 | depreciation | Depreciation | Currency | Accounting depreciation (non-cash) |
| 66 | regulatory_depreciation | Regulatory Depreciation | Currency | RAB-based (non-cash) |
| 67 | ebit | EBIT | Computed | EBITDA - Depreciation |

#### Balance Sheet / Reserve & Liquidity Balances (rows 68-99)
| # | Line Key | Label | Type | Notes |
|---|----------|-------|------|-------|
| 68 | dsra_required | DSRA Required Balance | Currency | |
| 69 | dsra_actual | DSRA Actual Balance | Currency | |
| 70 | dsra_cash | DSRA — Cash Portion | Currency | |
| 71 | dsra_lc | DSRA — LC Portion | Currency | |
| 72 | dsra_pcg | DSRA — PCG Portion | Currency | |
| 73 | mra_required | MRA Required Balance | Currency | |
| 74 | mra_actual | MRA Actual Balance | Currency | |
| 75 | mra_cash | MRA — Cash Portion | Currency | |
| 76 | mra_lc | MRA — LC Portion | Currency | |
| 77 | capex_reserve_required | Capex Reserve Required | Currency | |
| 78 | capex_reserve_actual | Capex Reserve Actual | Currency | |
| 79 | om_reserve_required | O&M Reserve Required | Currency | |
| 80 | om_reserve_actual | O&M Reserve Actual | Currency | |
| 81 | distribution_reserve_req | Distribution Reserve Required | Currency | |
| 82 | distribution_reserve_act | Distribution Reserve Actual | Currency | |
| 83 | lifecycle_reserve_req | Lifecycle Reserve Required | Currency | |
| 84 | lifecycle_reserve_act | Lifecycle Reserve Actual | Currency | |
| 85 | escrow_balance | Escrow Account Balance | Currency | |
| 86 | lockup_account_balance | Lock-Up Account Balance | Currency | |
| 87 | liquidity_facility_limit | Liquidity Facility — Committed Limit | Currency | |
| 88 | liquidity_facility_drawn | Liquidity Facility — Drawn Amount | Currency | |
| 89 | liquidity_facility_avail | Liquidity Facility — Available | Computed | Limit - Drawn |
| 90 | wcf_limit | Working Capital Facility — Limit | Currency | |
| 91 | wcf_drawn | Working Capital Facility — Drawn | Currency | |
| 92 | wcf_available | Working Capital Facility — Available | Computed | Limit - Drawn |
| 93 | rcf_limit | Revolving Credit Facility — Limit | Currency | |
| 94 | rcf_drawn | Revolving Credit Facility — Drawn | Currency | |
| 95 | rcf_available | Revolving Credit Facility — Available | Computed | Limit - Drawn |
| 96 | total_reserves_required | Total Reserves Required | Computed | SUM of all required |
| 97 | total_reserves_actual | Total Reserves Actual | Computed | SUM of all actual |
| 98 | total_reserves_shortfall | Total Reserves Shortfall | Computed | Required - Actual |
| 99 | total_liquidity_available | Total Liquidity Available | Computed | Cash + undrawn facilities |

#### Sector Subcategory Slots
| Slot Range | Parent | Max |
|-----------|--------|-----|
| revenue_1 to revenue_8 | total_revenue | 8 |
| cost_1 to cost_12 | total_operating_costs | 12 |
| capex_1 to capex_5 | capital_expenditure | 5 |
| funding_1 to funding_4 | total_funding | 4 |
| ds_1 to ds_5 | senior_debt_service | 5 |
| equity_1 to equity_4 | distributions | 4 |
| sector_kpi_1 to sector_kpi_10 | — | 10 |
| class_ratio_1 to class_ratio_4 | — | 4 |
| rab_leverage_1 to rab_leverage_4 | — | 4 |

---

## F.6 Covenant Thresholds (child table: `covenant_thresholds`)

Three-tier structure for each monitored ratio.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| covenant_name | Text | Yes | Human-readable name |
| ratio_name | Text | Yes | Maps to line_key |
| covenant_category | Enum | Yes | cash_flow_cover, collateral_value, incurrence, distribution, financial_maintenance |
| test_type | Enum | Yes | hard_covenant, distribution_condition, trigger, default, soft_default |
| direction | Enum | Yes | min (floor), max (ceiling) |
| test_frequency | Enum | Yes | quarterly, semi_annual, annual |
| enforcement_class | Text | | Which class this covenant applies to |
| lockup_level | Decimal | | Distribution lock-up threshold |
| trigger_level | Decimal | | Trigger event threshold |
| default_level | Decimal | | Event of default threshold |
| equity_cure_available | Boolean | | |
| step_down_schedule | JSONB | | Year-by-year step-down |

---

## F.7 Sector KPIs

### F.7.1 KPI Scenario Series (stored in `forecast_period_items` where `line_key LIKE 'sector_kpi_%'`)

IC-memo KPI expectations are **time series**, one row per (scenario × period × KPI), under the same `forecast_cases` / `forecast_case_versions` machinery as financial forecasts. Management case = IC-memo baseline. Single-variant stresses link to a specific risk in `deal_risk_register` via `forecast_cases.driving_risk_id`. See [docs/architecture/kpi-scenarios.md](architecture/kpi-scenarios.md).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| kpi_key | Text | Yes | sector_kpi_1 … sector_kpi_10 |
| kpi_label | Text | Yes | Per-deal in `deal_line_item_labels.display_label` |
| scenario_kind | Enum | Yes | `management_case`, `combined_downside`, `single_variant_stress`, `credit_case`, `lender_case`, `custom` (on `forecast_cases`) |
| stress_label | Text | Single-variant only | Human name (e.g. "Pandemic passenger shock") |
| driving_risk_id | UUID | Single-variant only | FK to `deal_risk_register(id)` — the risk that motivated the stress |
| period_flag | Text | Yes | e.g. FY2026 — resolves to `deal_reporting_periods` |
| value | Decimal | Yes | The expected value at that scenario × period |
| forecast_case_version.direction | Enum | Yes | higher_is_better, lower_is_better, range (unchanged) |
| forecast_case_version.unit | Enum | Yes | percentage, currency, count, ratio, years (unchanged) |
| forecast_model_metadata.source | Enum | | ic_memo, business_plan, management_presentation, lender_model |
| forecast_model_metadata.approved_at | Timestamp | | IC-freeze timestamp |

### F.7.2 KPI Observations (child table: `deal_kpi_observations`)
Actual KPI values per period with deviation-to-stress computation.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| reporting_period_id | FK | Yes | Links to period |
| kpi_key | Text | Yes | Same key as the scenario series |
| observed_value | Decimal | | Actual from borrower |
| base_case_target | Decimal | | Denormalised at write-time from the period-matched management_case `forecast_period_items` row (display cache) |
| stress_case_target | Decimal | | Denormalised at write-time from the period-matched combined_downside `forecast_period_items` row |
| base_forecast_item_id | FK | | Pointer to the exact `forecast_period_items` row used for the base value (audit trace) |
| stress_forecast_item_id | FK | | Pointer to the `forecast_period_items` row used for the stress value (audit trace) |
| variance_to_base | Decimal | | observed - base |
| variance_to_base_pct | Decimal | | % deviation from base |
| deviation_to_stress | Decimal | | 0% = at management case, 100% = at combined downside, >100% = worse |
| status | Enum | | on_track, watch, approaching_stress, breached_stress |
| source | Enum | | compliance_certificate, business_plan_update, management_presentation |

---

## F.8 Hedging (child table: `hedge_portfolio`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| hedge_type | Enum | Yes | interest_rate_swap, cap, floor, fx_forward, fx_option, inflation_swap, commodity_swap |
| notional | Decimal | Yes | |
| pct_of_debt | Decimal | | |
| start_date | Date | | |
| maturity | Date | Yes | |
| fixed_rate | Decimal | | For swaps |
| strike | Decimal | | For caps/floors |
| counterparty | Text | Yes | |
| counterparty_rating | Text | | |
| mark_to_market | Decimal | | Current MTM value |
| mtm_date | Date | | |

---

## F.9 Development Phases (child table: `deal_development_phases`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| phase_name | Text | Yes | |
| phase_number | Integer | Yes | |
| capex_budget | Decimal | | |
| start_date | Date | | |
| target_end_date | Date | | |
| actual_end_date | Date | | |
| status | Enum | Yes | planned, active, complete, delayed |
| actual_spend | Decimal | | |
| variance | Decimal | | Budget - actual |
| variance_pct | Decimal | | |

---

## F.10 Investor Allocations

### F.10.1 External Investors (child table: `investor_allocations`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| investor_name | Text | Yes | |
| account_mandate | Text | | Fund/mandate name |
| tranche | Text | | Which instrument |
| amount | Decimal | Yes | |
| mandate_size | Decimal | | Total mandate AUM |
| pct_of_mandate | Decimal | | This deal as % of mandate |

### F.10.2 Account-Instrument Allocations (child table: `account_instrument_allocations`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| account_id | FK | Yes | Which internal account |
| instrument_id | FK | Yes | Which specific tranche |
| allocated_amount | Decimal | Yes | Amount held |
| allocated_pct | Decimal | | % of instrument |
| acquisition_date | Date | | |
| acquisition_price | Decimal | | Par = 100 |
| current_nav | Decimal | | Current marked value |
| status | Enum | Yes | active, sold, redeemed, written_off |

---

## F.11 Risk Register

### F.11.1 Risk Taxonomy
226 pre-defined risks across 7 categories:
1. Credit & Financial Risk (15 risks)
2. Structural & Documentation Risk (11 risks)
3. Business & Operational Risk (15 risks)
4. Market & Macroeconomic Risk (16 risks)
5. Regulatory & Legal Risk (9 risks)
6. ESG & Climate Risk (8 risks)
7. Sector-Specific Risk (137 risks across all sectors)

### F.11.2 Deal Risk Register (child table: `deal_risk_register`)
One row per risk per deal. Scored and tracked over time.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| risk_id | FK | Yes | Links to taxonomy |
| likelihood | Integer | Yes | 1-5 |
| severity | Integer | Yes | 1-6 |
| risk_score | Integer | Yes | Likelihood x Severity |
| risk_level | Enum | Yes | low, moderate, high, critical, fatal |
| mitigation_party_score | Enum | | M1-M5 |
| mitigation_capital_score | Enum | | C1-C5 |
| mitigation_capital_amount | Decimal | | |
| mitigation_capital_expiry | Date | | |
| sensitised_at_origination | Boolean | | Was this stressed at IC? |
| sensitivity_name | Text | | Name of stress test |
| stress_applied | Text | | Description of stress |
| stress_dscr_min | Decimal | | Stressed DSCR floor |
| stress_dscr_max | Decimal | | |
| stress_dscr_avg | Decimal | | |
| stress_other_ratios | JSONB | | Other ratio impacts |
| monitoring_kpi | Text | | KPI to watch |
| monitoring_threshold | Decimal | | Alert threshold |
| trend | Enum | | improving, stable, deteriorating |

### F.11.3 Risk Register History (child table: `deal_risk_register_history`)
Immutable audit trail of all prior assessments with superseded_by linkage.

---

## F.12 Reporting Schedule & Period Data

### F.12.1 Reporting Schedule (child table: `deal_reporting_schedule`)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| periodicity | Enum | Yes | monthly, quarterly, semi_annual, annual |
| first_period_start | Date | Yes | |
| final_period_end | Date | Yes | Maturity or concession expiry |
| fiscal_year_end_month | Integer | Yes | 1-12 |
| reporting_lag_days | Integer | Yes | Days after period_end until report expected |

### F.12.2 Reporting Periods (child table: `deal_reporting_periods`)
Materialised calendar of period slots.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| period_flag | Text | Yes | Sort key: "2026Q1" |
| period_label | Text | Yes | Display: "Q1 2026" |
| period_start | Date | Yes | |
| period_end | Date | Yes | |
| period_frequency | Enum | Yes | |
| period_ordinal | Integer | Yes | Sequential position |
| report_expected_by | Date | | |
| data_status | Enum | Yes | awaiting, extracted, reviewed, approved, restatement |

### F.12.3 Period Financial Items (child table: `period_financial_items`)
One row per line item per period — the normalised financial data store.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| line_key | FK | Yes | Links to line_item_definitions |
| reported_value | Decimal | | From document extraction / manual entry |
| computed_value | Decimal | | Platform-calculated |
| approved_value | Decimal | | Final golden value after review |
| forecast_value | Decimal | | From active forecast case |
| variance_to_forecast | Decimal | | approved - forecast |
| variance_pct | Decimal | | |
| value_origin | Enum | Yes | extracted, computed, manual, override, interpolated |
| extraction_confidence | Decimal | | 0.0 - 1.0 |
| source_document_id | FK | | |
| source_hierarchy | Enum | | audited, certificate, unaudited, management, model |
| item_status | Enum | Yes | pending, auto_approved, flagged, reviewed, approved, disputed |

---

## F.13 Monitoring Status

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| overall_covenant_status | Enum | Yes | performing, distribution_lockup, trigger_event, event_of_default |
| compliance_status | Enum | Yes | |
| distribution_status | Enum | Yes | permitted, blocked, conditional |
| trigger_event_active | Boolean | Yes | |
| equity_cure_available | Boolean | | |
| consecutive_lockup_periods | Integer | | |
| assigned_ham | Text | | Human Asset Manager |
| assigned_pm | Text | | Portfolio Manager |
| next_test_date | Date | Yes | |
| latest_period_label | Text | Yes | |
| latest_period_end | Date | Yes | |

---

## F.14 Intercreditor Terms (child table: `intercreditor_terms`)

| Field | Type | Notes |
|-------|------|-------|
| agreement_type | Text | ICA, STID, etc. |
| governing_law | Text | |
| enforcement_standstill_days | Integer | |
| turnover_provisions | JSONB | |
| permitted_payments | JSONB | |
| release_conditions | JSONB | |
| non_petition_clause | Boolean | |

---

## F.15 Performance Assessment (child table: `performance_assessments`)
System-computed grade and trend from covenant headroom analysis.

| Field | Type | Notes |
|-------|------|-------|
| performance_grade | Integer | 1-4 |
| grade_label | Text | 1A, 2A, 3A, 4A etc. |
| prior_grade | Integer | |
| grade_changed | Boolean | |
| grade_direction | Enum | upgraded, downgraded, stable |
| dscr_actual | Decimal | |
| dscr_expected_headroom | Decimal | |
| dscr_actual_headroom | Decimal | |
| dscr_erosion_pct | Decimal | |
| coll_actual | Decimal | |
| coll_expected_headroom | Decimal | |
| coll_actual_headroom | Decimal | |
| coll_erosion_pct | Decimal | |
| performance_trend | Enum | improving, flat, deteriorating, deteriorating_rapidly, new |
| override_active | Boolean | |
| override_grade | Integer | |
| override_rationale | Text | |
| override_expiry | Date | |

---

*Document version: April 2026. Generated from the Sesame Street platform schema.*
*For corporate/holdco investments, see: topsheet-spec-corporate.md (TBD)*
