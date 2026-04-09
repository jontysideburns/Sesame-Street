-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRATIONS — Runs on EVERY container start (not just first init)
-- All statements must be idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- This file ensures schema updates are applied without wiping the data directory
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Platform Todos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_todos (
    id          SERIAL PRIMARY KEY,
    text        TEXT NOT NULL,
    done        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deal credit rating columns ──────────────────────────────────────────────
ALTER TABLE deals ADD COLUMN IF NOT EXISTS moodys_rating TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sp_rating TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fitch_rating TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS internal_credit_score TEXT;

-- ── Performance assessments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance_assessments (
    id                          SERIAL PRIMARY KEY,
    deal_id                     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    financial_period_id         INTEGER,
    assessment_period           TEXT NOT NULL,
    performance_grade           INTEGER NOT NULL,
    grade_label                 TEXT NOT NULL,
    prior_grade                 INTEGER,
    grade_changed               BOOLEAN NOT NULL DEFAULT FALSE,
    grade_direction             TEXT,
    dscr_metric                 TEXT,
    dscr_metric_source          TEXT,
    dscr_management_case        DECIMAL,
    dscr_default_level          DECIMAL,
    dscr_lockup_level           DECIMAL,
    dscr_actual                 DECIMAL,
    dscr_expected_headroom      DECIMAL,
    dscr_actual_headroom        DECIMAL,
    dscr_erosion_abs            DECIMAL,
    dscr_erosion_pct            DECIMAL,
    dscr_component_grade        INTEGER,
    coll_metric                 TEXT,
    coll_direction              TEXT,
    coll_management_case        DECIMAL,
    coll_default_level          DECIMAL,
    coll_lockup_level           DECIMAL,
    coll_actual                 DECIMAL,
    coll_expected_headroom      DECIMAL,
    coll_actual_headroom        DECIMAL,
    coll_erosion_abs            DECIMAL,
    coll_erosion_pct            DECIMAL,
    coll_component_grade        INTEGER,
    performance_trend           TEXT,
    trend_label                 TEXT,
    trend_periods               TEXT[],
    dscr_erosion_series         DECIMAL[],
    dscr_delta1                 DECIMAL,
    dscr_delta2                 DECIMAL,
    dscr_persistent_drift       BOOLEAN,
    dscr_trend                  TEXT,
    coll_erosion_series         DECIMAL[],
    coll_delta1                 DECIMAL,
    coll_delta2                 DECIMAL,
    coll_persistent_drift       BOOLEAN,
    coll_trend                  TEXT,
    override_active             BOOLEAN NOT NULL DEFAULT FALSE,
    override_grade              INTEGER,
    override_rationale          TEXT,
    override_by                 TEXT,
    override_at                 TIMESTAMPTZ,
    override_expiry             TIMESTAMPTZ,
    dscr_threshold_pct          DECIMAL NOT NULL DEFAULT 10,
    coll_threshold_pct          DECIMAL NOT NULL DEFAULT 5,
    determinative_ratio         TEXT,
    flags                       TEXT[],
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_perf_assess_deal ON performance_assessments(deal_id);
CREATE INDEX IF NOT EXISTS idx_perf_assess_period ON performance_assessments(assessment_period);
CREATE INDEX IF NOT EXISTS idx_perf_assess_grade ON performance_assessments(performance_grade);
CREATE INDEX IF NOT EXISTS idx_perf_assess_trend ON performance_assessments(performance_trend);

-- ── Normalised financial line-item storage ───────────────────────────────────

CREATE TABLE IF NOT EXISTS deal_reporting_schedule (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    periodicity             TEXT NOT NULL,
    first_period_start      DATE NOT NULL,
    final_period_end        DATE NOT NULL,
    fiscal_year_end_month   INTEGER NOT NULL,
    reporting_lag_days      INTEGER NOT NULL DEFAULT 45,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id)
);

CREATE TABLE IF NOT EXISTS deal_reporting_periods (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    period_flag             TEXT NOT NULL,
    period_label            TEXT NOT NULL,
    period_start            DATE NOT NULL,
    period_end              DATE NOT NULL,
    period_frequency        TEXT NOT NULL,
    period_ordinal          INTEGER NOT NULL,
    report_expected_by      DATE,
    actual_period_id        INTEGER REFERENCES actual_periods(id) ON DELETE SET NULL,
    data_status             TEXT NOT NULL DEFAULT 'awaiting',
    source_document_id      INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, period_flag)
);
CREATE INDEX IF NOT EXISTS idx_drp_deal_flag ON deal_reporting_periods(deal_id, period_flag);
CREATE INDEX IF NOT EXISTS idx_drp_deal_ordinal ON deal_reporting_periods(deal_id, period_ordinal);
CREATE INDEX IF NOT EXISTS idx_drp_status ON deal_reporting_periods(data_status) WHERE data_status != 'approved';

CREATE TABLE IF NOT EXISTS line_item_definitions (
    id                      SERIAL PRIMARY KEY,
    line_key                TEXT NOT NULL UNIQUE,
    section                 TEXT NOT NULL,
    display_label           TEXT NOT NULL,
    row_order               INTEGER NOT NULL,
    is_generic              BOOLEAN NOT NULL DEFAULT TRUE,
    is_computed             BOOLEAN NOT NULL DEFAULT FALSE,
    computation_formula     TEXT,
    sign_convention         TEXT NOT NULL DEFAULT 'natural',
    unit                    TEXT NOT NULL DEFAULT 'currency',
    parent_line_key         TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lid_section_order ON line_item_definitions(section, row_order);
CREATE INDEX IF NOT EXISTS idx_lid_parent ON line_item_definitions(parent_line_key) WHERE parent_line_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS period_financial_items (
    id                      BIGSERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    reporting_period_id     INTEGER NOT NULL REFERENCES deal_reporting_periods(id) ON DELETE CASCADE,
    line_key                TEXT NOT NULL REFERENCES line_item_definitions(line_key),
    reported_value          NUMERIC(18, 4),
    computed_value          NUMERIC(18, 4),
    approved_value          NUMERIC(18, 4),
    forecast_value          NUMERIC(18, 4),
    variance_to_forecast    NUMERIC(18, 4),
    variance_pct            NUMERIC(10, 4),
    value_origin            TEXT NOT NULL DEFAULT 'extracted',
    extraction_confidence   NUMERIC(5, 4),
    source_document_id      INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    source_page             INTEGER,
    source_cell_ref         TEXT,
    source_hierarchy        TEXT,
    item_status             TEXT NOT NULL DEFAULT 'pending',
    reviewed_by             TEXT,
    reviewed_at             TIMESTAMPTZ,
    review_note             TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, reporting_period_id, line_key)
);
CREATE INDEX IF NOT EXISTS idx_pfi_period ON period_financial_items(reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_pfi_deal_line ON period_financial_items(deal_id, line_key);
CREATE INDEX IF NOT EXISTS idx_pfi_deal_period ON period_financial_items(deal_id, reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_pfi_status ON period_financial_items(item_status) WHERE item_status IN ('pending', 'flagged');

CREATE TABLE IF NOT EXISTS deal_line_item_labels (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    line_key                TEXT NOT NULL REFERENCES line_item_definitions(line_key),
    display_label           TEXT NOT NULL,
    ordinal                 INTEGER NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(deal_id, line_key)
);
CREATE INDEX IF NOT EXISTS idx_dlil_deal ON deal_line_item_labels(deal_id);

-- Bridge column on actual_periods
ALTER TABLE actual_periods ADD COLUMN IF NOT EXISTS reporting_period_id INTEGER REFERENCES deal_reporting_periods(id) ON DELETE SET NULL;

-- ── Deal jurisdiction splits — multi-country business activity ───────────────
-- Records the proportion of a borrower's business in each country.
-- borrower_registered_country is the legal domicile (single value on deals table).
-- This table captures where revenue/operations actually take place.

CREATE TABLE IF NOT EXISTS deal_jurisdiction_splits (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    country_code            VARCHAR(2) NOT NULL,       -- ISO 3166-1 alpha-2
    country_name            TEXT NOT NULL,              -- Human-readable (e.g. "United States")
    activity_pct            NUMERIC(5, 2) NOT NULL,    -- Percentage of business activity (0.00–100.00)
    activity_type           TEXT NOT NULL DEFAULT 'revenue',  -- revenue, operations, assets, headcount
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE for the main operating jurisdiction
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, country_code, activity_type)
);
CREATE INDEX IF NOT EXISTS idx_djs_deal ON deal_jurisdiction_splits(deal_id);
CREATE INDEX IF NOT EXISTS idx_djs_country ON deal_jurisdiction_splits(country_code);

-- ── Multi-tranche and holding structure enhancements ─────────────────────────

-- Pari-passu grouping: instruments in the same group rank equally
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS pari_passu_group TEXT;
-- e.g. 'A' means all instruments with group 'A' in the same deal rank pari-passu

-- Link instrument to issuing corporate entity (opco vs holdco)
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS issuing_entity_id UUID;
-- References corporate_entities(id) — which entity in the structure issued this instrument

-- Instrument format column on capital_structure_instruments
-- Distinguishes: loan, bond, note, frn, il_bond, private_placement, convertible, other
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS instrument_format TEXT;

-- Ensure deals table has borrower registered address and primary business location
ALTER TABLE deals ADD COLUMN IF NOT EXISTS borrower_registered_address TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS primary_business_country VARCHAR(2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS primary_business_country_name TEXT;

-- ── Instrument-level holdings ────────────────────────────────────────────────
-- Extends the holdings model so accounts can hold specific tranches, not just deals.
-- The existing holdings table (account_id, deal_id, current_amount) remains for
-- backward compatibility and deal-level aggregation.

-- Add optional instrument reference to existing holdings table
ALTER TABLE holdings ADD COLUMN IF NOT EXISTS instrument_id UUID;
-- When NULL: legacy deal-level holding. When set: instrument-specific holding.

-- Drop the old unique constraint and replace with one that allows instrument-level rows
-- (idempotent: only runs if the old constraint exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'holdings_account_id_deal_id_key'
  ) THEN
    ALTER TABLE holdings DROP CONSTRAINT holdings_account_id_deal_id_key;
    ALTER TABLE holdings ADD CONSTRAINT holdings_account_deal_instrument_key
      UNIQUE (account_id, deal_id, instrument_id);
  END IF;
END $$;

-- Create index for instrument-level lookups
CREATE INDEX IF NOT EXISTS idx_holdings_instrument ON holdings(instrument_id) WHERE instrument_id IS NOT NULL;

-- ── Account instrument allocations ──────────────────────────────────────────
-- Normalised table that explicitly tracks which account holds which instrument.
-- Replaces the need to infer from deal-level holdings + instrument-level our_holding.

CREATE TABLE IF NOT EXISTS account_instrument_allocations (
    id                  SERIAL PRIMARY KEY,
    account_id          INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    instrument_id       UUID NOT NULL,   -- FK to capital_structure_instruments(id)
    allocated_amount    DECIMAL NOT NULL, -- amount this account holds of this instrument
    allocated_pct       DECIMAL,         -- percentage of the instrument held by this account
    acquisition_date    DATE,
    acquisition_price   DECIMAL,         -- price paid (par = 100)
    current_nav         DECIMAL,         -- current marked value
    status              TEXT NOT NULL DEFAULT 'active',  -- active, sold, redeemed, written_off
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, instrument_id)
);
CREATE INDEX IF NOT EXISTS idx_aia_account ON account_instrument_allocations(account_id);
CREATE INDEX IF NOT EXISTS idx_aia_deal ON account_instrument_allocations(deal_id);
CREATE INDEX IF NOT EXISTS idx_aia_instrument ON account_instrument_allocations(instrument_id);

-- ── Revenue risk enrichment — contracted/merchant split and duration coverage ─
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contracted_revenue_pct DECIMAL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS merchant_revenue_pct DECIMAL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS primary_contract_expiry DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS duration_coverage_pct DECIMAL;

-- Drop the simplistic sensitivity_monitoring_status (replaced by deal_kpi_observations)
ALTER TABLE deals DROP COLUMN IF EXISTS sensitivity_monitoring_status;

-- ── Reserve account underfunding tracking ────────────────────────────────────
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS periods_underfunded INTEGER NOT NULL DEFAULT 0;
-- Count of consecutive reporting periods where current_balance < required_balance

-- ── Reserve account enhancements ─────────────────────────────────────────────
-- Expand the reserve accounts table with additional liquidity tracking fields
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS target_balance DECIMAL;          -- target/required amount per facility agreement
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS shortfall DECIMAL;               -- required_balance - current_balance (computed)
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS top_up_deadline DATE;            -- deadline to cure any shortfall
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS release_conditions TEXT;         -- conditions under which funds can be released
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS cash_amount DECIMAL;             -- portion held in cash
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS lc_amount DECIMAL;               -- portion covered by letter of credit
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS pcg_amount DECIMAL;              -- portion covered by parent company guarantee
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS surety_amount DECIMAL;           -- portion covered by surety bond
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS lc_provider TEXT;                -- issuing bank for LC
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS lc_expiry DATE;                  -- LC expiry date
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS pcg_provider TEXT;               -- guarantor entity
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS pcg_expiry DATE;                 -- guarantee expiry
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS currency VARCHAR(3);             -- account currency

-- ── IC Memo KPI Monitoring ──────────────────────────────────────────────────

-- KPI targets from IC memo / business plan / lender model
-- One row per KPI per scenario per deal
CREATE TABLE IF NOT EXISTS deal_kpi_targets (
    id                  SERIAL PRIMARY KEY,
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    kpi_key             TEXT NOT NULL,              -- sector_kpi_1, sector_kpi_2, or free-text key
    kpi_label           TEXT NOT NULL,              -- "Leased Capacity (%)", "PUE", etc.
    scenario            TEXT NOT NULL,              -- base_case, management_case, stress_case, ic_memo
    target_value        NUMERIC,                   -- the expected value
    target_floor        NUMERIC,                   -- minimum acceptable (breach threshold)
    target_ceiling      NUMERIC,                   -- maximum acceptable (for lower-is-better metrics)
    direction           TEXT NOT NULL DEFAULT 'higher_is_better',  -- higher_is_better, lower_is_better, range
    unit                TEXT NOT NULL DEFAULT 'count',             -- percentage, currency, count, ratio, years
    source              TEXT,                       -- ic_memo, business_plan, management_presentation, lender_model
    source_date         DATE,                      -- when this target was set
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, kpi_key, scenario)
);
CREATE INDEX IF NOT EXISTS idx_dkt_deal ON deal_kpi_targets(deal_id);
CREATE INDEX IF NOT EXISTS idx_dkt_scenario ON deal_kpi_targets(deal_id, scenario);

-- KPI observations — actual values per period, compared to targets
-- One row per KPI per reporting period per deal
CREATE TABLE IF NOT EXISTS deal_kpi_observations (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    reporting_period_id     INTEGER NOT NULL REFERENCES deal_reporting_periods(id) ON DELETE CASCADE,
    kpi_key                 TEXT NOT NULL,
    kpi_label               TEXT NOT NULL,
    observed_value          NUMERIC,                   -- actual value from borrower report
    base_case_target        NUMERIC,                   -- denormalised from deal_kpi_targets
    stress_case_target      NUMERIC,                   -- denormalised from deal_kpi_targets
    variance_to_base        NUMERIC,                   -- observed - base_case_target
    variance_to_base_pct    NUMERIC,                   -- % deviation from base
    deviation_to_stress     NUMERIC,                   -- 0% = at base case, 100% = at stress case, >100% = worse than stress
    status                  TEXT NOT NULL DEFAULT 'on_track',  -- on_track, watch, approaching_stress, breached_stress
    source                  TEXT,                       -- compliance_certificate, business_plan_update, management_presentation, operating_report
    source_document_id      INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    observed_at             DATE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, reporting_period_id, kpi_key)
);
CREATE INDEX IF NOT EXISTS idx_dko_deal ON deal_kpi_observations(deal_id);
CREATE INDEX IF NOT EXISTS idx_dko_period ON deal_kpi_observations(reporting_period_id);
CREATE INDEX IF NOT EXISTS idx_dko_status ON deal_kpi_observations(status) WHERE status != 'on_track';

-- ── Balance sheet / reserve account line items ──────────────────────────────
-- These record period-by-period reserve and liquidity balances alongside the cashflow

INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, unit) VALUES
-- Reserve account balances
('dsra_required',            'balance_sheet', 'DSRA Required Balance',                 1, FALSE, 'currency'),
('dsra_actual',              'balance_sheet', 'DSRA Actual Balance',                   2, FALSE, 'currency'),
('dsra_cash',                'balance_sheet', 'DSRA — Cash Portion',                   3, FALSE, 'currency'),
('dsra_lc',                  'balance_sheet', 'DSRA — LC Portion',                     4, FALSE, 'currency'),
('dsra_pcg',                 'balance_sheet', 'DSRA — PCG Portion',                    5, FALSE, 'currency'),
('mra_required',             'balance_sheet', 'MRA Required Balance',                  6, FALSE, 'currency'),
('mra_actual',               'balance_sheet', 'MRA Actual Balance',                    7, FALSE, 'currency'),
('mra_cash',                 'balance_sheet', 'MRA — Cash Portion',                    8, FALSE, 'currency'),
('mra_lc',                   'balance_sheet', 'MRA — LC Portion',                      9, FALSE, 'currency'),
('capex_reserve_required',   'balance_sheet', 'Capex Reserve Required Balance',       10, FALSE, 'currency'),
('capex_reserve_actual',     'balance_sheet', 'Capex Reserve Actual Balance',         11, FALSE, 'currency'),
('om_reserve_required',      'balance_sheet', 'O&M Reserve Required Balance',         12, FALSE, 'currency'),
('om_reserve_actual',        'balance_sheet', 'O&M Reserve Actual Balance',           13, FALSE, 'currency'),
('distribution_reserve_req', 'balance_sheet', 'Distribution Reserve Required',        14, FALSE, 'currency'),
('distribution_reserve_act', 'balance_sheet', 'Distribution Reserve Actual',          15, FALSE, 'currency'),
('lifecycle_reserve_req',    'balance_sheet', 'Lifecycle Reserve Required',            16, FALSE, 'currency'),
('lifecycle_reserve_act',    'balance_sheet', 'Lifecycle Reserve Actual',              17, FALSE, 'currency'),
('escrow_balance',           'balance_sheet', 'Escrow Account Balance',               18, FALSE, 'currency'),
('lockup_account_balance',   'balance_sheet', 'Lock-Up Account Balance',              19, FALSE, 'currency'),
-- Liquidity facilities
('liquidity_facility_limit', 'balance_sheet', 'Liquidity Facility — Committed Limit', 20, FALSE, 'currency'),
('liquidity_facility_drawn', 'balance_sheet', 'Liquidity Facility — Drawn Amount',    21, FALSE, 'currency'),
('liquidity_facility_avail', 'balance_sheet', 'Liquidity Facility — Available',       22, TRUE,  'currency'),
('wcf_limit',                'balance_sheet', 'Working Capital Facility — Limit',     23, FALSE, 'currency'),
('wcf_drawn',                'balance_sheet', 'Working Capital Facility — Drawn',     24, FALSE, 'currency'),
('wcf_available',            'balance_sheet', 'Working Capital Facility — Available',  25, TRUE,  'currency'),
('rcf_limit',                'balance_sheet', 'Revolving Credit Facility — Limit',    26, FALSE, 'currency'),
('rcf_drawn',                'balance_sheet', 'Revolving Credit Facility — Drawn',    27, FALSE, 'currency'),
('rcf_available',            'balance_sheet', 'Revolving Credit Facility — Available', 28, TRUE,  'currency'),
-- Aggregate liquidity
('total_reserves_required',  'balance_sheet', 'Total Reserves Required',              29, TRUE,  'currency'),
('total_reserves_actual',    'balance_sheet', 'Total Reserves Actual',                30, TRUE,  'currency'),
('total_reserves_shortfall', 'balance_sheet', 'Total Reserves Shortfall',             31, TRUE,  'currency'),
('total_liquidity_available','balance_sheet', 'Total Liquidity Available',            32, TRUE,  'currency')
ON CONFLICT (line_key) DO NOTHING;

-- ── Moody's-aligned computed ratios and adjustment inputs ────────────────────

-- Additional P&L / balance sheet inputs needed for Moody's standard adjustments
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, computation_formula, unit) VALUES
-- Debt aggregates
('total_debt_drawn',         'balance_sheet', 'Total Debt Drawn',                    33, FALSE, NULL,                                                'currency'),
('net_debt',                 'balance_sheet', 'Net Debt',                             34, TRUE,  'total_debt_drawn - cash_cf',                        'currency'),
-- Moody''s standard adjustment inputs
('operating_lease_obligation','balance_sheet', 'Operating Lease Obligation (Capitalised)', 35, FALSE, NULL,                                           'currency'),
('pension_deficit',          'balance_sheet', 'Pension Deficit (Underfunded)',         36, FALSE, NULL,                                                'currency'),
('hybrid_debt_component',    'balance_sheet', 'Hybrid Securities — Debt Component (50%)', 37, FALSE, NULL,                                           'currency'),
('securitised_receivables',  'balance_sheet', 'Securitised Receivables (Recourse)',    38, FALSE, NULL,                                                'currency'),
-- Adjusted debt (after Moody's adjustments)
('moodys_adjusted_debt',     'balance_sheet', 'Moody''s Adjusted Total Debt',         39, TRUE,  'total_debt_drawn + operating_lease_obligation + pension_deficit + hybrid_debt_component + securitised_receivables', 'currency'),
('moodys_adjusted_net_debt', 'balance_sheet', 'Moody''s Adjusted Net Debt',           40, TRUE,  'moodys_adjusted_debt - cash_cf',                   'currency'),
-- P&L items for FFO computation
('non_cash_charges',         'pnl', 'Other Non-Cash Charges',                          5, FALSE, NULL,                                                'currency'),
('gains_on_disposal',        'pnl', 'Gains on Asset Sales',                            6, FALSE, NULL,                                                'currency'),
('losses_on_disposal',       'pnl', 'Losses on Asset Sales',                           7, FALSE, NULL,                                                'currency')
ON CONFLICT (line_key) DO NOTHING;

-- Moody's computed cashflow measures (FFO, RCF)
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, computation_formula, unit) VALUES
('ffo',                      'moodys_metrics', 'Funds From Operations (FFO)',          1, TRUE,  'ebitda - tax_paid - senior_interest - junior_interest - shareholder_loan_interest + interest_on_cash', 'currency'),
('rcf',                      'moodys_metrics', 'Retained Cash Flow (RCF)',             2, TRUE,  'ffo - distributions',                               'currency'),
('total_debt_service',       'moodys_metrics', 'Total Debt Service',                   3, TRUE,  'senior_debt_service + junior_debt_service',          'currency')
ON CONFLICT (line_key) DO NOTHING;

-- Moody's coverage ratios
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, computation_formula, unit) VALUES
('ffo_interest_coverage',    'moodys_ratios', 'FFO Interest Coverage',                 1, TRUE,  '(ffo + senior_interest + junior_interest) / (senior_interest + junior_interest)', 'ratio'),
('ffo_net_debt',             'moodys_ratios', 'FFO / Net Debt',                        2, TRUE,  'ffo / net_debt',                                    'percentage'),
('rcf_net_debt',             'moodys_ratios', 'RCF / Net Debt',                        3, TRUE,  'rcf / net_debt',                                    'percentage'),
('ffo_debt',                 'moodys_ratios', 'FFO / Debt',                            4, TRUE,  'ffo / total_debt_drawn',                            'percentage'),
('rcf_debt',                 'moodys_ratios', 'RCF / Debt',                            5, TRUE,  'rcf / total_debt_drawn',                            'percentage'),
('total_dscr',               'moodys_ratios', 'Total DSCR',                            6, TRUE,  'cfads / (senior_debt_service + junior_debt_service)','ratio'),
('adscr_breakeven',          'moodys_ratios', 'ADSCR Break-Even (%)',                  7, TRUE,  '(cfads - senior_debt_service) / total_operating_costs * 100', 'percentage'),
('aicr',                     'moodys_ratios', 'Adjusted Interest Coverage (AICR)',      8, TRUE,  '(ffo + senior_interest - regulatory_depreciation) / senior_interest', 'ratio'),
('cash_interest_coverage',   'moodys_ratios', 'Cash Interest Coverage',                9, TRUE,  '(total_revenue - total_operating_costs) / senior_interest', 'ratio'),
-- Moody's adjusted ratios (post standard adjustments)
('adj_ffo_net_debt',         'moodys_ratios', 'Adj FFO / Net Debt (Moody''s)',        10, TRUE,  'ffo / moodys_adjusted_net_debt',                    'percentage'),
('adj_rcf_net_debt',         'moodys_ratios', 'Adj RCF / Net Debt (Moody''s)',        11, TRUE,  'rcf / moodys_adjusted_net_debt',                    'percentage'),
('adj_net_debt_ebitda',      'moodys_ratios', 'Adj Net Debt / EBITDA (Moody''s)',     12, TRUE,  'moodys_adjusted_net_debt / ebitda',                 'ratio')
ON CONFLICT (line_key) DO NOTHING;

-- ── Cash sweep line items (excluded from DSCR calculation) ──────────────────
-- Senior Cash Sweep: after Total Senior DS, NOT included in DS for DSCR purposes
UPDATE line_item_definitions SET row_order = 6, display_label = 'Senior Cash Sweep' WHERE line_key = 'senior_principal_sweep';
UPDATE line_item_definitions SET row_order = 3, computation_formula = 'senior_interest + senior_principal' WHERE line_key = 'senior_debt_service';
UPDATE line_item_definitions SET row_order = 4 WHERE line_key = 'cf_after_senior_ds';

-- Junior Cash Sweep and CF After Junior DS
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, is_computed, computation_formula, unit)
VALUES ('junior_principal_sweep', 'junior_ds', 'Junior Cash Sweep', 5, TRUE, FALSE, NULL, 'currency')
ON CONFLICT (line_key) DO NOTHING;
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, is_computed, computation_formula, unit)
VALUES ('cf_after_junior_ds', 'junior_ds', 'CF After Junior Debt Service', 4, TRUE, TRUE, 'cf_after_senior_ds - junior_debt_service', 'currency')
ON CONFLICT (line_key) DO NOTHING;
UPDATE line_item_definitions SET row_order = 3, computation_formula = 'junior_interest + junior_principal' WHERE line_key = 'junior_debt_service';

-- ── Security ranking on deals ────────────────────────────────────────────────
-- Distinct from enforcement_class (instrument-level). This is the deal-level security ranking.
-- Values: Senior Secured, Senior Unsecured, Second Lien, Mezzanine, Subordinated,
--         Holdco, Majority Holdco, Minority Holdco, PIK, Equity
-- Holdco variants based on % equity ownership of OpCo:
--   Majority Holdco = HoldCo owns >50% of OpCo equity
--   Minority Holdco = HoldCo owns ≤50% of OpCo equity
ALTER TABLE deals ADD COLUMN IF NOT EXISTS security_ranking TEXT;

-- ── Full life-of-investment forecast storage ─────────────────────────────────

-- Period type discriminator (historical, current, forecast)
ALTER TABLE deal_reporting_periods ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'historical';

-- Forecast horizon on schedule
ALTER TABLE deal_reporting_schedule ADD COLUMN IF NOT EXISTS forecast_end_date DATE;
ALTER TABLE deal_reporting_schedule ADD COLUMN IF NOT EXISTS model_periods_count INTEGER;

-- Forecast period items — write-once at ingestion, one row per cell in the grid
-- (line_key × period × frozen scenario version)
CREATE TABLE IF NOT EXISTS forecast_period_items (
    id                          BIGSERIAL PRIMARY KEY,
    deal_id                     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    forecast_case_version_id    INTEGER NOT NULL REFERENCES forecast_case_versions(id) ON DELETE CASCADE,
    reporting_period_id         INTEGER NOT NULL REFERENCES deal_reporting_periods(id) ON DELETE CASCADE,
    line_key                    TEXT NOT NULL REFERENCES line_item_definitions(line_key),
    value                       NUMERIC(18, 4),         -- the forecast value (null = not modelled for this line)
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(forecast_case_version_id, reporting_period_id, line_key)
);
CREATE INDEX IF NOT EXISTS idx_fpi_deal_version ON forecast_period_items(deal_id, forecast_case_version_id);
CREATE INDEX IF NOT EXISTS idx_fpi_deal_line ON forecast_period_items(deal_id, line_key);
CREATE INDEX IF NOT EXISTS idx_fpi_version_period ON forecast_period_items(forecast_case_version_id, reporting_period_id);

-- Forecast model metadata — records the source financial model
CREATE TABLE IF NOT EXISTS forecast_model_metadata (
    id                          SERIAL PRIMARY KEY,
    deal_id                     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    forecast_case_version_id    INTEGER REFERENCES forecast_case_versions(id) ON DELETE SET NULL,
    model_name                  TEXT NOT NULL,           -- e.g. "Aurora IC Model v3.2"
    model_date                  DATE NOT NULL,           -- date the model was prepared
    model_source                TEXT,                    -- ic_memo, sponsor_model, lender_model
    model_periodicity           TEXT NOT NULL,           -- semi_annual, quarterly, annual
    model_start_date            DATE NOT NULL,           -- first forecast period
    model_end_date              DATE NOT NULL,           -- last forecast period
    model_periods               INTEGER NOT NULL,        -- total periods in the model
    model_currency              VARCHAR(3) NOT NULL,
    base_rate_assumption        TEXT,                    -- e.g. "SONIA forward curve Mar 2023"
    inflation_assumption        TEXT,                    -- e.g. "2.5% CPI"
    prepared_by                 TEXT,
    approved_by                 TEXT,                    -- IC approval
    approved_at                 TIMESTAMPTZ,             -- frozen timestamp
    source_document_id          INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fmm_deal ON forecast_model_metadata(deal_id);

-- ── Relative headroom: management case value on covenants ────────────────────
ALTER TABLE covenants ADD COLUMN IF NOT EXISTS management_case_value NUMERIC(8,2);
ALTER TABLE covenants ADD COLUMN IF NOT EXISTS threshold_default NUMERIC(8,2);
-- headroom_pct is now: (current_value - threshold_default) / (management_case_value - threshold_default) * 100

-- ── Part A: Obligation Taxonomy & Deal Obligation Register ───────────────────

-- Master reference list of all possible deliverables, covenants, and monitoring items
-- (like risk_taxonomy is for risks). 230+ items across 13 categories from Part A.
CREATE TABLE IF NOT EXISTS obligation_taxonomy (
    item_id             TEXT PRIMARY KEY,           -- INFO-001, NOTIF-003, AFF-005, EOD-012, etc.
    category_number     INTEGER NOT NULL,            -- 1-13
    category_name       TEXT NOT NULL,               -- "Financial Information Deliverables"
    sub_category        TEXT,                        -- "1A", "9B", "12A"
    title               TEXT NOT NULL,               -- Short name
    description         TEXT,                        -- Full description with notes
    typical_frequency   TEXT,                        -- annual, semi_annual, quarterly, monthly, event_driven
    typical_deadline    TEXT,                        -- "90 days after FY end"
    typical_severity    TEXT,                        -- informational, potential_default, event_of_default
    typical_phase       TEXT,                        -- all, construction, operational
    sector_applicability TEXT DEFAULT 'all',         -- all, real_estate, infrastructure, uspp, wbs, pfi
    sort_order          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ot_category ON obligation_taxonomy(category_number);

-- Per-deal obligation tracking — each deal gets its subset from the taxonomy
CREATE TABLE IF NOT EXISTS deal_obligation_register (
    id                  SERIAL PRIMARY KEY,
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    item_id             TEXT NOT NULL REFERENCES obligation_taxonomy(item_id),
    applicable          BOOLEAN NOT NULL DEFAULT TRUE,
    title               TEXT NOT NULL,
    description         TEXT,
    responsible_party   TEXT,                        -- borrower, auditor, agent, adviser, insurer
    frequency           TEXT,                        -- annual, semi_annual, quarterly, monthly, event_driven
    deadline_rule       TEXT,                        -- "90 days after FY end"
    grace_period_days   INTEGER,
    severity_if_missed  TEXT,                        -- informational, potential_default, event_of_default
    phase               TEXT,                        -- all, construction, operational
    covenant_tier       TEXT,                        -- normal, trigger_event, event_of_default
    source_clause       TEXT,                        -- clause reference in finance documents
    auto_approve_rule   TEXT,
    current_status      TEXT NOT NULL DEFAULT 'not_yet_due',  -- not_yet_due, compliant, overdue, waived, not_applicable
    last_delivered_date DATE,
    next_due_date       DATE,
    depends_on_item_id  TEXT,                        -- linked deadline dependency
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_dor_deal ON deal_obligation_register(deal_id);
CREATE INDEX IF NOT EXISTS idx_dor_status ON deal_obligation_register(current_status) WHERE current_status IN ('overdue', 'not_yet_due');
CREATE INDEX IF NOT EXISTS idx_dor_next_due ON deal_obligation_register(next_due_date) WHERE next_due_date IS NOT NULL;

-- Per-deal consent mechanics configuration (CONS-001 to CONS-008)
CREATE TABLE IF NOT EXISTS deal_consent_mechanics (
    id                              SERIAL PRIMARY KEY,
    deal_id                         INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    majority_threshold_pct          DECIMAL,            -- e.g. 66.67
    supermajority_threshold_pct     DECIMAL,            -- e.g. 75 or 90
    voting_basis                    TEXT,                -- by_commitment, by_lender, by_block
    all_lender_matters              JSONB DEFAULT '[]',  -- list of matters requiring unanimous consent
    snooze_you_lose                 BOOLEAN DEFAULT FALSE,
    deemed_consent_on_silence       BOOLEAN DEFAULT FALSE,
    yank_clause                     BOOLEAN DEFAULT FALSE,
    non_consenting_replacement_basis TEXT,               -- par, make_whole, market_value
    standard_consent_period_days    INTEGER,
    disenfranchisement_triggers     JSONB DEFAULT '[]',
    notes                           TEXT,
    created_at                      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id)
);

-- Per-deal events of default register (EOD-001 to EOD-032)
CREATE TABLE IF NOT EXISTS deal_eod_register (
    id                      SERIAL PRIMARY KEY,
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    eod_id                  TEXT NOT NULL,               -- EOD-001, EOD-002, etc.
    title                   TEXT NOT NULL,
    grace_period_days       INTEGER,
    remedy_capable          BOOLEAN NOT NULL DEFAULT FALSE,
    cross_default_threshold DECIMAL,                    -- e.g. 50000 or percentage
    cross_default_basis     TEXT,                        -- absolute, pct_of_assets
    current_state           TEXT NOT NULL DEFAULT 'not_triggered', -- not_triggered, triggered, cured, waived
    triggered_date          DATE,
    cure_deadline           DATE,
    waived_until            DATE,
    waiver_conditions       TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, eod_id)
);
CREATE INDEX IF NOT EXISTS idx_deod_deal ON deal_eod_register(deal_id);
CREATE INDEX IF NOT EXISTS idx_deod_state ON deal_eod_register(current_state) WHERE current_state != 'not_triggered';

-- Per-deal trigger events (TE-001 to TE-010) with consequence escalation
CREATE TABLE IF NOT EXISTS deal_trigger_events (
    id                          SERIAL PRIMARY KEY,
    deal_id                     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    trigger_id                  TEXT NOT NULL,           -- TE-001, TE-002, etc.
    title                       TEXT NOT NULL,
    trigger_type                TEXT,                    -- tested, event_driven
    trigger_condition           TEXT,                    -- e.g. "ACR > 0.70" or "credit rating downgrade"
    current_state               TEXT NOT NULL DEFAULT 'not_triggered', -- not_triggered, triggered, remedied
    triggered_date              DATE,
    consequence_immediate       TEXT,                    -- e.g. "Distributions locked. No restricted payments."
    consequence_0_12m           TEXT,                    -- e.g. "Enhanced reporting, additional forecast periods"
    consequence_beyond_12m      TEXT,                    -- e.g. "Remedial plan required, independent review"
    exit_mechanism              TEXT,                    -- e.g. "Ratios back within limits at next Calculation Date"
    exit_certification          TEXT,                    -- e.g. "Director's certificate confirming remedy"
    remedial_plan_required      BOOLEAN DEFAULT FALSE,
    independent_review_required BOOLEAN DEFAULT FALSE,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, trigger_id)
);
CREATE INDEX IF NOT EXISTS idx_dte_deal ON deal_trigger_events(deal_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Growth Capex / Maintenance Capex split
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add growth_capex and maintenance_capex computed parents
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, computation_formula, unit) VALUES
('growth_capex',       'capex', 'Growth Capex',       3, TRUE,  'SUM(growth_capex_1..growth_capex_N)', 'currency'),
('maintenance_capex',  'capex', 'Maintenance Capex',  6, TRUE,  'SUM(maintenance_capex_1..maintenance_capex_N)', 'currency')
ON CONFLICT (line_key) DO NOTHING;

-- Growth capex subcategory slots (up to 5)
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, parent_line_key, unit) VALUES
('growth_capex_1', 'capex', 'Growth Capex Line 1', 111, FALSE, 'growth_capex', 'currency'),
('growth_capex_2', 'capex', 'Growth Capex Line 2', 112, FALSE, 'growth_capex', 'currency'),
('growth_capex_3', 'capex', 'Growth Capex Line 3', 113, FALSE, 'growth_capex', 'currency'),
('growth_capex_4', 'capex', 'Growth Capex Line 4', 114, FALSE, 'growth_capex', 'currency'),
('growth_capex_5', 'capex', 'Growth Capex Line 5', 115, FALSE, 'growth_capex', 'currency')
ON CONFLICT (line_key) DO NOTHING;

-- Maintenance capex subcategory slots (up to 5)
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, parent_line_key, unit) VALUES
('maintenance_capex_1', 'capex', 'Maintenance Capex Line 1', 121, FALSE, 'maintenance_capex', 'currency'),
('maintenance_capex_2', 'capex', 'Maintenance Capex Line 2', 122, FALSE, 'maintenance_capex', 'currency'),
('maintenance_capex_3', 'capex', 'Maintenance Capex Line 3', 123, FALSE, 'maintenance_capex', 'currency'),
('maintenance_capex_4', 'capex', 'Maintenance Capex Line 4', 124, FALSE, 'maintenance_capex', 'currency'),
('maintenance_capex_5', 'capex', 'Maintenance Capex Line 5', 125, FALSE, 'maintenance_capex', 'currency')
ON CONFLICT (line_key) DO NOTHING;

-- Update capital_expenditure formula to sum growth + maintenance
UPDATE line_item_definitions
SET computation_formula = 'growth_capex + maintenance_capex'
WHERE line_key = 'capital_expenditure';

-- Add growth/maintenance capex label columns to deal_financial_template
ALTER TABLE deal_financial_template ADD COLUMN IF NOT EXISTS growth_capex_labels JSONB DEFAULT '[]';
ALTER TABLE deal_financial_template ADD COLUMN IF NOT EXISTS maintenance_capex_labels JSONB DEFAULT '[]';

-- Update Aurora Prime (deal_id=1) template with growth/maintenance split
UPDATE deal_financial_template
SET growth_capex_labels = '["IT Infrastructure","Power & Cooling Plant","Building & Civil Works","Network Equipment"]'::jsonb,
    maintenance_capex_labels = '["Other Capex"]'::jsonb
WHERE deal_id = 1;

-- Add Aurora Prime growth/maintenance capex labels to materialised table
INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal) VALUES
(1, 'growth_capex_1', 'IT Infrastructure',         1),
(1, 'growth_capex_2', 'Power & Cooling Plant',     2),
(1, 'growth_capex_3', 'Building & Civil Works',    3),
(1, 'growth_capex_4', 'Network Equipment',         4),
(1, 'maintenance_capex_1', 'Other Capex',          1)
ON CONFLICT (deal_id, line_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tail construct — contracted revenue / concession life vs debt maturity
-- ═══════════════════════════════════════════════════════════════════════════════
-- The "tail" is the gap between the end of contracted/concessional cashflow
-- and the maturity of the debt financing the project. It can be:
--   positive: contracted revenue outlives debt (typical PF concession 0-2 yrs)
--   zero:     matched
--   negative: debt extends beyond contracted revenue (aka "merchant tail")
-- The anchor depends on deal type:
--   concession       — concession expiry, asset hand-back at zero value
--   primary_contract — end of primary offtake (PPA/CfD/lease/unitary charge)
--   asset_life       — end of economic/physical useful life
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tail_anchor_type TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tail_anchor_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tail_anchor_label TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tail_residual_value_treatment TEXT;
  -- zero_residual | nominal_residual | retained_asset
ALTER TABLE deals ADD COLUMN IF NOT EXISTS tail_notes TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Contract & Concession Renewal Risk Framework
-- ═══════════════════════════════════════════════════════════════════════════════
-- Consolidates fragmented sector-specific renewal risks into a single cross-cutting
-- framework. Every deal must be classified on a renewal_profile and must disclose
-- the proportion of debt that relies on post-renewal cashflows. The combination of
-- renewal_profile and tail_classification forms a 2-D risk matrix.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS renewal_profile TEXT;
  -- deep_market_repricing | bilateral_negotiation | competitive_tender
  -- | hand_back_zero_value | no_anchor_contract
ALTER TABLE deals ADD COLUMN IF NOT EXISTS debt_repayment_from_renewal_pct NUMERIC(5,2);
  -- % of debt principal scheduled to be repaid from post-renewal cashflows
ALTER TABLE deals ADD COLUMN IF NOT EXISTS renewal_notes TEXT;

-- New risk taxonomy sub-category REN under CF (Credit & Financial Risk)
INSERT INTO risk_taxonomy (risk_id, risk_name, category_code, category_name, category_number, description, typical_sectors, key_indicators, sort_order) VALUES
('RISK-REN-001', 'Contract / concession expiry without renewal', 'REN', 'Contract & Concession Renewal', 3,
 'Primary revenue contract or concession ends during or before debt tenor with no assured successor contract. Debt depends on successful renewal.',
 'Toll roads, social infrastructure, renewables, PPPs',
 'renewal_profile, debt_repayment_from_renewal_pct, tail_years', 801),
('RISK-REN-002', 'Renewal into deep liquid market', 'REN', 'Contract & Concession Renewal', 3,
 'Asset re-contracts at prevailing market prices into a liquid market. Low risk: market pricing is observable and refinanceable.',
 'Hub airports, data centres, commercial real estate',
 'Market depth, historical repricing outcomes', 802),
('RISK-REN-003', 'Renewal by bilateral negotiation', 'REN', 'Contract & Concession Renewal', 3,
 'Asset renewal depends on bilateral negotiation with a single counterparty. Counterparty bargaining power is a key risk driver.',
 'Renewable PPAs, corporate leases, concession extensions',
 'Counterparty identity, alternatives, regulatory backstop', 803),
('RISK-REN-004', 'Concession auction / competitive tender', 'REN', 'Contract & Concession Renewal', 3,
 'Renewal requires winning a competitive tender against new bidders. Incumbent advantage is typically modest.',
 'Rail franchises, bus concessions, port concessions',
 'Tender frequency, incumbent win rate, bid economics', 804),
('RISK-REN-005', 'Hand-back at zero consideration', 'REN', 'Contract & Concession Renewal', 3,
 'No renewal possible. Asset returns to grantor for nil value at end of concession. Debt must be fully repaid before hand-back.',
 'PFI, toll road concessions, social infrastructure',
 'Hand-back condition, residual works', 805),
('RISK-REN-006', 'Reliance on extension assumption', 'REN', 'Contract & Concession Renewal', 3,
 'Borrower financial model assumes concession or contract extension without binding commitment. Lenders should never rely on uncommitted extension for debt repayment.',
 'All concession structures where extension is plausible but not contractual',
 'debt_repayment_from_renewal_pct, extension mechanics', 806),
('RISK-REN-007', 'Incumbent legacy debt disadvantage', 'REN', 'Contract & Concession Renewal', 3,
 'Incumbent operator cannot economically win a clean-sheet concession re-tender while carrying legacy debt. Clean-sheet competitors bid with zero legacy cost, so any economically rational bid will defeat the incumbent. Applies to all concession structures where assets revert to the grantor before the tender.',
 'All clean-sheet concession retenders (toll roads, PFI, most traditional PF)',
 'renewal_profile = competitive_tender_clean_sheet, debt_repayment_from_renewal_pct > 0', 807)
ON CONFLICT (risk_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Deal Onboarding Snapshots — frozen position at the point of investment
-- ═══════════════════════════════════════════════════════════════════════════════
-- A write-once snapshot of everything that mattered at origination. Used for
-- performance attribution, IC audit trail, and retrospective diligence.
-- Live fields on the deals table evolve; this snapshot is immutable (except
-- in cases of a formal restructuring / re-underwriting event).
CREATE TABLE IF NOT EXISTS deal_onboarding_snapshots (
    id                                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    snapshot_number                         INTEGER NOT NULL DEFAULT 1,
      -- 1 = original onboarding, 2+ = successive re-underwritings
    snapshot_reason                         TEXT NOT NULL DEFAULT 'origination',
      -- origination | restructuring | re_underwriting | covenant_reset
    snapshot_date                           DATE NOT NULL,
    is_current                              BOOLEAN NOT NULL DEFAULT TRUE,
    superseded_by_snapshot_id               UUID REFERENCES deal_onboarding_snapshots(id),
    superseded_at                           TIMESTAMPTZ,
    superseded_reason                       TEXT,
    captured_by                             TEXT,
    captured_at                             TIMESTAMPTZ DEFAULT NOW(),

    -- ── Group A: Structural position at onboarding ──
    tail_years_at_onboarding                NUMERIC(6,2),
    tail_classification_at_onboarding       TEXT,
    renewal_profile_at_onboarding           TEXT,
    debt_repayment_from_renewal_pct_at_onboarding NUMERIC(5,2),
    revenue_risk_code_at_onboarding         TEXT,
    concession_years_remaining_at_onboarding NUMERIC(5,2),

    -- ── Group B: Financial metrics at onboarding ──
    entry_leverage                          NUMERIC(6,2),
    entry_dscr_year_1                       NUMERIC(6,2),
    entry_dscr_min_life                     NUMERIC(6,2),
    entry_llcr                              NUMERIC(6,2),
    entry_loan_life_years                   NUMERIC(5,2),
    entry_wal_years                         NUMERIC(5,2),

    -- ── Group C: Lender case / stress at onboarding ──
    lender_case_dscr_min                    NUMERIC(6,2),
    lender_case_leverage_peak               NUMERIC(6,2),
    stress_break_even_pct                   NUMERIC(5,2),
    stress_cases_tested                     TEXT,

    -- ── Group D: IC governance at onboarding ──
    ic_memo_date                            DATE,
    ic_memo_reference                       TEXT,
    ic_approved_by                          TEXT,
    ic_approval_conditions                  TEXT,
    ic_vote_margin                          TEXT,

    -- ── Group E: Origination economics ──
    entry_all_in_margin_bps                 INTEGER,
    entry_upfront_fees_bps                  INTEGER,
    entry_secondary_purchase_price_pct      NUMERIC(6,2),
    entry_yield_to_maturity                 NUMERIC(7,4),
    expected_hold_period_years              NUMERIC(5,2),
    exit_strategy                           TEXT,

    -- ── Group F: Market context at onboarding ──
    entry_risk_free_rate_bps                INTEGER,
    entry_credit_spread_bps                 INTEGER,
    entry_relative_value_notes              TEXT,

    -- ── Group G: Initial risk assessment ──
    initial_risk_score                      NUMERIC(5,2),
    initial_grade                           TEXT,
    critical_risks_at_onboarding            TEXT,

    notes                                   TEXT,
    UNIQUE (deal_id, snapshot_number)
);
CREATE INDEX IF NOT EXISTS idx_dos_deal ON deal_onboarding_snapshots(deal_id);
CREATE INDEX IF NOT EXISTS idx_dos_current ON deal_onboarding_snapshots(deal_id) WHERE is_current = TRUE;
-- Only one current snapshot per deal
CREATE UNIQUE INDEX IF NOT EXISTS idx_dos_one_current ON deal_onboarding_snapshots(deal_id) WHERE is_current = TRUE;

-- Write-once immutability: a snapshot that has been superseded cannot be modified.
-- Only is_current / superseded_by_snapshot_id / superseded_at / superseded_reason
-- can transition from the "current" state to the "superseded" state.
CREATE OR REPLACE FUNCTION enforce_onboarding_snapshot_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Block all updates once a snapshot is superseded
    IF OLD.is_current = FALSE THEN
        RAISE EXCEPTION 'deal_onboarding_snapshot % is superseded and immutable', OLD.id;
    END IF;

    -- When still current, only allow the supersession fields to change
    IF NEW.snapshot_date IS DISTINCT FROM OLD.snapshot_date
       OR NEW.snapshot_number IS DISTINCT FROM OLD.snapshot_number
       OR NEW.snapshot_reason IS DISTINCT FROM OLD.snapshot_reason
       OR NEW.tail_years_at_onboarding IS DISTINCT FROM OLD.tail_years_at_onboarding
       OR NEW.tail_classification_at_onboarding IS DISTINCT FROM OLD.tail_classification_at_onboarding
       OR NEW.renewal_profile_at_onboarding IS DISTINCT FROM OLD.renewal_profile_at_onboarding
       OR NEW.debt_repayment_from_renewal_pct_at_onboarding IS DISTINCT FROM OLD.debt_repayment_from_renewal_pct_at_onboarding
       OR NEW.revenue_risk_code_at_onboarding IS DISTINCT FROM OLD.revenue_risk_code_at_onboarding
       OR NEW.concession_years_remaining_at_onboarding IS DISTINCT FROM OLD.concession_years_remaining_at_onboarding
       OR NEW.entry_leverage IS DISTINCT FROM OLD.entry_leverage
       OR NEW.entry_dscr_year_1 IS DISTINCT FROM OLD.entry_dscr_year_1
       OR NEW.entry_dscr_min_life IS DISTINCT FROM OLD.entry_dscr_min_life
       OR NEW.entry_llcr IS DISTINCT FROM OLD.entry_llcr
       OR NEW.entry_loan_life_years IS DISTINCT FROM OLD.entry_loan_life_years
       OR NEW.entry_wal_years IS DISTINCT FROM OLD.entry_wal_years
       OR NEW.lender_case_dscr_min IS DISTINCT FROM OLD.lender_case_dscr_min
       OR NEW.lender_case_leverage_peak IS DISTINCT FROM OLD.lender_case_leverage_peak
       OR NEW.stress_break_even_pct IS DISTINCT FROM OLD.stress_break_even_pct
       OR NEW.stress_cases_tested IS DISTINCT FROM OLD.stress_cases_tested
       OR NEW.ic_memo_date IS DISTINCT FROM OLD.ic_memo_date
       OR NEW.ic_memo_reference IS DISTINCT FROM OLD.ic_memo_reference
       OR NEW.ic_approved_by IS DISTINCT FROM OLD.ic_approved_by
       OR NEW.ic_approval_conditions IS DISTINCT FROM OLD.ic_approval_conditions
       OR NEW.ic_vote_margin IS DISTINCT FROM OLD.ic_vote_margin
       OR NEW.entry_all_in_margin_bps IS DISTINCT FROM OLD.entry_all_in_margin_bps
       OR NEW.entry_upfront_fees_bps IS DISTINCT FROM OLD.entry_upfront_fees_bps
       OR NEW.entry_secondary_purchase_price_pct IS DISTINCT FROM OLD.entry_secondary_purchase_price_pct
       OR NEW.entry_yield_to_maturity IS DISTINCT FROM OLD.entry_yield_to_maturity
       OR NEW.expected_hold_period_years IS DISTINCT FROM OLD.expected_hold_period_years
       OR NEW.exit_strategy IS DISTINCT FROM OLD.exit_strategy
       OR NEW.entry_risk_free_rate_bps IS DISTINCT FROM OLD.entry_risk_free_rate_bps
       OR NEW.entry_credit_spread_bps IS DISTINCT FROM OLD.entry_credit_spread_bps
       OR NEW.entry_relative_value_notes IS DISTINCT FROM OLD.entry_relative_value_notes
       OR NEW.initial_risk_score IS DISTINCT FROM OLD.initial_risk_score
       OR NEW.initial_grade IS DISTINCT FROM OLD.initial_grade
       OR NEW.critical_risks_at_onboarding IS DISTINCT FROM OLD.critical_risks_at_onboarding
       OR NEW.notes IS DISTINCT FROM OLD.notes
    THEN
        RAISE EXCEPTION 'Onboarding snapshot fields are write-once. Create a new snapshot (snapshot_number = %) instead of updating this one.', OLD.snapshot_number + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onboarding_snapshot_immutability ON deal_onboarding_snapshots;
CREATE TRIGGER trg_onboarding_snapshot_immutability
    BEFORE UPDATE ON deal_onboarding_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION enforce_onboarding_snapshot_immutability();

-- ═══════════════════════════════════════════════════════════════════════════════
-- End of migrations — all statements above are idempotent
-- ═══════════════════════════════════════════════════════════════════════════════
