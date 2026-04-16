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
-- Plan Variance Trend Engine — ratio selection and ACR split
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE deals ADD COLUMN IF NOT EXISTS primary_collateral_ratio TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cash_cover_ratio TEXT DEFAULT 'senior_dscr';

-- Split ACR into utility (=RAR, lower better) and real estate (=1/LTV, higher better)
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, unit) VALUES
('acr_utility', 'covenant_sector', 'Asset Cover Ratio (Utility/RAR)', 200, FALSE, 'ratio'),
('acr_re', 'covenant_sector', 'Asset Cover Ratio (Real Estate)', 201, FALSE, 'ratio')
ON CONFLICT (line_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Covenant Deliverables & Calendar System
-- ═══════════════════════════════════════════════════════════════════════════════

-- Public holidays reference table (seeded from public-holidays-seed.sql)
CREATE TABLE IF NOT EXISTS public_holidays (
    id              SERIAL PRIMARY KEY,
    jurisdiction    TEXT NOT NULL,
    holiday_date    DATE NOT NULL,
    holiday_name    TEXT NOT NULL,
    UNIQUE(jurisdiction, holiday_date)
);
CREATE INDEX IF NOT EXISTS idx_ph_jurisdiction ON public_holidays(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_ph_date ON public_holidays(holiday_date);

-- Business day support on deal_obligation_register
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS business_days_after_period_end INTEGER;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS business_day_jurisdictions TEXT;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS business_day_convention TEXT DEFAULT 'modified_following';
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS grace_period_business_days INTEGER;

-- Primary business day calendar on deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS business_day_calendar TEXT DEFAULT 'GB';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Distribution Conditions (Tab 22) — full lock-up regime
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deal_distribution_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    condition_id VARCHAR(10) NOT NULL,
    condition_name TEXT NOT NULL,
    condition_category VARCHAR(20) NOT NULL,
    consequence_tier VARCHAR(25) NOT NULL,
    ratio_name VARCHAR(50),
    direction VARCHAR(3),
    threshold_value DECIMAL(10,4),
    threshold_variant TEXT,
    lookback_period VARCHAR(20),
    test_frequency VARCHAR(20),
    remedy_available BOOLEAN DEFAULT FALSE,
    remedy_mechanism TEXT,
    sweep_percentage DECIMAL(5,2),
    sweep_step_schedule JSONB,
    source_clause TEXT,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, condition_id)
);
CREATE INDEX IF NOT EXISTS idx_dist_conditions_deal ON deal_distribution_conditions(deal_id);
CREATE INDEX IF NOT EXISTS idx_dist_conditions_category ON deal_distribution_conditions(condition_category);

-- Distribution mechanics columns on deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_frequency VARCHAR(20);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_calculation_basis TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_waterfall_position INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sweep_before_distribution BOOLEAN;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sweep_in_dscr BOOLEAN;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS trapped_cash_mechanism VARCHAR(40);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS trapped_cash_release TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_cure_window_days INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_escalation_periods INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_escalation_consequence TEXT;

-- Onboarding snapshot additions
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS distribution_gates_count INTEGER;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS distribution_gates_summary TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Reserve Account History — time-series of balances per reporting period
-- ═══════════════════════════════════════════════════════════════════════════════
-- One row per reserve account per reporting period. Records the actual balance,
-- the required balance at that date, the management case expected balance,
-- and the funded status. This enables trend analysis ("was the DSRA fully
-- funded last quarter?") and variance analysis ("actual vs expected reserve").

CREATE TABLE IF NOT EXISTS reserve_account_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                 INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    reserve_account_id      UUID NOT NULL REFERENCES deal_reserve_accounts(id) ON DELETE CASCADE,
    reporting_period_id     INTEGER NOT NULL REFERENCES deal_reporting_periods(id) ON DELETE CASCADE,
    period_label            TEXT NOT NULL,
    period_end              DATE NOT NULL,
    required_balance        NUMERIC,
    actual_balance          NUMERIC,
    expected_balance        NUMERIC,           -- from management case forecast
    shortfall               NUMERIC,           -- required - actual (null if fully funded)
    variance_to_expected    NUMERIC,           -- actual - expected
    funded_status           TEXT NOT NULL DEFAULT 'fully_funded',
    cash_amount             NUMERIC,
    lc_amount               NUMERIC,
    pcg_amount              NUMERIC,
    source_document         TEXT,               -- e.g. compliance certificate reference
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reserve_account_id, reporting_period_id)
);
CREATE INDEX IF NOT EXISTS idx_rah_deal ON reserve_account_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_rah_reserve ON reserve_account_history(reserve_account_id);
CREATE INDEX IF NOT EXISTS idx_rah_period ON reserve_account_history(reporting_period_id);

-- New line item definitions for reserve expected balances in the forecast
INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_computed, unit) VALUES
('dsra_expected_balance',           'balance_sheet', 'DSRA Expected Balance',                50, FALSE, 'currency'),
('mra_expected_balance',            'balance_sheet', 'MRA Expected Balance',                 51, FALSE, 'currency'),
('capex_reserve_expected_balance',  'balance_sheet', 'Capex Reserve Expected Balance',       52, FALSE, 'currency'),
('o_and_m_reserve_expected_balance','balance_sheet', 'O&M Reserve Expected Balance',         53, FALSE, 'currency'),
('lockup_reserve_expected_balance', 'balance_sheet', 'Lock-Up Account Expected Balance',     54, FALSE, 'currency')
ON CONFLICT (line_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Currency magnitude — source vs storage vs display
-- ═══════════════════════════════════════════════════════════════════════════════
-- source_magnitude: what the financial model / source documents use
--   (singles, thousands, millions). Tells the ingestion engine what to expect.
-- All values in period_financial_items and forecast_period_items are stored
--   in SINGLES (full currency units) regardless of source magnitude.
-- Display is always in millions to 1dp (handled by the frontend).
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_magnitude TEXT DEFAULT 'singles';
  -- singles | thousands | millions

-- ═══════════════════════════════════════════════════════════════════════════════
-- FX Rates — ECB-style reference rates (EUR base)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Convention: EUR is always the base currency. rate = quote per 1 EUR.
--   Example: row (EUR, USD, 1.0850) means 1 EUR = 1.0850 USD.
-- Cross-rate from CCY1 to CCY2 = (1 / rate(EUR,CCY1)) * rate(EUR,CCY2).
-- ECB publishes daily reference rates around 16:00 CET.
-- This table holds a time-series of snapshots; the engine uses the latest
-- effective_date <= as_of date when converting.
CREATE TABLE IF NOT EXISTS fx_rates (
    id              SERIAL PRIMARY KEY,
    base_currency   VARCHAR(3) NOT NULL DEFAULT 'EUR',
    quote_currency  VARCHAR(3) NOT NULL,
    rate            DECIMAL(18,6) NOT NULL,
    effective_date  DATE NOT NULL,
    source          TEXT NOT NULL DEFAULT 'ECB',
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(base_currency, quote_currency, effective_date)
);
CREATE INDEX IF NOT EXISTS idx_fx_rates_lookup
    ON fx_rates(quote_currency, effective_date DESC);

-- Seed snapshot — ECB-style reference rates as at 2026-04-14
-- (Placeholder values pending live ECB feed wire-up; replace daily via ingest job)
INSERT INTO fx_rates (base_currency, quote_currency, rate, effective_date, source) VALUES
  ('EUR', 'EUR',  1.000000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'USD',  1.085000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'GBP',  0.855000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'JPY',  162.300000,'2026-04-14', 'ECB-seed'),
  ('EUR', 'CHF',  0.945000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'AUD',  1.645000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'CAD',  1.485000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'NOK',  11.450000, '2026-04-14', 'ECB-seed'),
  ('EUR', 'SEK',  11.350000, '2026-04-14', 'ECB-seed'),
  ('EUR', 'DKK',  7.460000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'NZD',  1.795000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'SGD',  1.470000,  '2026-04-14', 'ECB-seed'),
  ('EUR', 'HKD',  8.470000,  '2026-04-14', 'ECB-seed')
ON CONFLICT (base_currency, quote_currency, effective_date) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TopSheet v8 — Distribution Mechanics, Capital Structure Taxonomy,
-- Cashflow Priority Ranking
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tab 1 new fields: Distribution Mechanics block on deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_frequency VARCHAR(20);
  -- semi_annual | quarterly | annual
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_calculation_basis TEXT;
  -- cashflow_available_for_distribution | net_cashflow | free_cashflow_after_sweep | ...
ALTER TABLE deals ADD COLUMN IF NOT EXISTS distribution_waterfall_position INTEGER;
  -- e.g. 12 = 12th priority in the cashflow waterfall
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sweep_before_distribution BOOLEAN;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sweep_in_dscr BOOLEAN;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS trapped_cash_mechanism VARCHAR(40);
  -- retained_in_proceeds_account | held_in_lockup_account | swept_to_debt |
  -- released_after_cure | swept_then_released
ALTER TABLE deals ADD COLUMN IF NOT EXISTS trapped_cash_release TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_cure_window_days INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_escalation_periods INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lockup_escalation_consequence TEXT;

-- Tab 2 new columns on capital_structure_instruments
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS entity_level VARCHAR(20);
  -- opco | midco | holdco | topco | issuer | bidco | majority_holdco | minority_holdco
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS entity_name TEXT;
  -- FK by name to corporate_entities.entity_name for the same deal
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS ownership_pct DECIMAL(5,2);
  -- Economic ownership at this level (0-100); 100 if wholly-owned
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS structural_seniority INTEGER;
  -- 1 = closest to cashflows; higher = further away
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS ratio_consolidation_level VARCHAR(30);
  -- opco_standalone | consolidated | proportional_consolidated
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS intercompany_lender TEXT;
  -- If intercompany: lending entity. NULL for external debt.
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS subordination_agreement BOOLEAN;
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS cashflow_priority_rank INTEGER;
  -- 1 = first claim on cashflows; NULL for shareholder loans / intercompany loans

-- Tab 7 new columns on corporate_entities
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS ownership_pct DECIMAL(5,2);
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(20);
  -- direct | indirect | joint_venture
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS control_type VARCHAR(25);
  -- full_control | significant_influence | passive | joint_control
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS consolidation_method VARCHAR(25);
  -- proportional | equity_method | not_consolidated | full
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS within_security_perimeter BOOLEAN;
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS ratio_level VARCHAR(20);
  -- opco | midco | holdco | issuer | none

-- Tab 8 new column on covenant_thresholds
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS ratio_level VARCHAR(30);
  -- opco | midco | holdco | consolidated | proportional_consolidated

-- Tab 20 Onboarding Snapshot — distribution gates count + summary
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS distribution_gates_count INTEGER;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS distribution_gates_summary TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TopSheet v9 — Capital Stack: Valuation & Equity + shareholder-level pledges
-- ═══════════════════════════════════════════════════════════════════════════════

-- Tab 1 new VALUATION & EQUITY section on deals
-- enterprise_value already exists from the topsheet-spec-project-finance work.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS valuation_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20);
  -- transaction | dcf | multiples | appraisal | mark_to_model | book
ALTER TABLE deals ADD COLUMN IF NOT EXISTS valuation_entity TEXT;
  -- soft FK by name to corporate_entities.entity_name (per deal); usually OpCo
ALTER TABLE deals ADD COLUMN IF NOT EXISTS equity_invested NUMERIC;
  -- Initial sponsor equity cheque at origination (optional)

-- Tab 2 optional pledged-share fields on capital_structure_instruments.
-- Present when a debt is secured only on a specific shareholding (e.g. an
-- NAV facility pledged on one shareholder's stake). When populated, the
-- Capital Stack engine computes a grossed-up consolidated-equivalent
-- leverage using face_value / pledged_share_pct.
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS pledged_share_entity TEXT;
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS pledged_share_pct DECIMAL(5,2);

-- security_ranking per instrument (Tab 2 col D — dropdown). Previously only
-- captured at deal level on deals.security_ranking; per-instrument is needed
-- for the Capital Stack engine to flag contractual subordination correctly.
-- Standard values: Senior Secured, Senior Secured HoldCo, Senior Secured
-- MajorityHoldCo, Senior Secured MinorityHoldCo, Senior Unsecured,
-- Second Lien, Mezzanine, Subordinated, Subordinated HoldCo, Holdco,
-- Majority Holdco, Minority Holdco, Shareholder Loan.
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS security_ranking VARCHAR(40);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Audit-trail architecture scaffolding (2026-04-15)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Adds a standardised five-column provenance block to every deal-scoped data
-- table that powers the TopSheet, so that when the ingestion engine comes
-- online for the first real client, every field written can carry a pointer
-- back to the source document it came from. All columns are nullable for
-- the demo portfolio. A follow-up migration at real-client cutover will
-- flip these to NOT NULL / add CHECK constraints.
--
-- Standard block (matches the existing pattern on actual_periods):
--   source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL
--   source_page         INTEGER
--   source_snippet      TEXT
--   source_extracted_by TEXT   -- 'topsheet_importer' | 'manual' | 'ai_extraction:<model>' | 'Fitch Report' | ...
--   source_extracted_at TIMESTAMPTZ
-- Plus an index on source_document_id for reverse lookups (which fields came
-- from which doc).

-- ── Capital stack ───────────────────────────────────────────────────────────
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE capital_structure_instruments ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_csi_src_doc ON capital_structure_instruments(source_document_id);

ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE corporate_entities ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ce_src_doc ON corporate_entities(source_document_id);

ALTER TABLE deal_jurisdiction_splits ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_jurisdiction_splits ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_jurisdiction_splits ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_jurisdiction_splits ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_jurisdiction_splits ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_djs_src_doc ON deal_jurisdiction_splits(source_document_id);

-- ── Covenants & tests ───────────────────────────────────────────────────────
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE covenant_thresholds ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ct_src_doc ON covenant_thresholds(source_document_id);

ALTER TABLE deal_distribution_conditions ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_distribution_conditions ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_distribution_conditions ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_distribution_conditions ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_distribution_conditions ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ddc_src_doc ON deal_distribution_conditions(source_document_id);

ALTER TABLE deal_eod_register ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_eod_register ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_eod_register ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_eod_register ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_eod_register ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_deod_src_doc ON deal_eod_register(source_document_id);

ALTER TABLE deal_trigger_events ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_trigger_events ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_trigger_events ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_trigger_events ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_trigger_events ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dte_src_doc ON deal_trigger_events(source_document_id);

-- ── Counterparties & reserves ───────────────────────────────────────────────
ALTER TABLE deal_counterparties ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_counterparties ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_counterparties ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_counterparties ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_counterparties ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dcp_src_doc ON deal_counterparties(source_document_id);

ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_reserve_accounts ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dra_src_doc ON deal_reserve_accounts(source_document_id);

ALTER TABLE hedge_portfolio ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE hedge_portfolio ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE hedge_portfolio ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE hedge_portfolio ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE hedge_portfolio ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_hp_src_doc ON hedge_portfolio(source_document_id);

-- ── Risk & KPIs ─────────────────────────────────────────────────────────────
-- deal_risk_register already carries assessed_by/assessed_at as the narrative
-- "who last reviewed this"; the new block is strictly for source-document
-- provenance (which document sourced the risk, L/S scores, or mitigants).
ALTER TABLE deal_risk_register ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_risk_register ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_risk_register ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_risk_register ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_risk_register ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_drr_src_doc ON deal_risk_register(source_document_id);

ALTER TABLE deal_kpi_targets ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_kpi_targets ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_kpi_targets ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_kpi_targets ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_kpi_targets ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dkt_src_doc ON deal_kpi_targets(source_document_id);

-- ── Lifecycle & governance ──────────────────────────────────────────────────
ALTER TABLE deal_amendments ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_amendments ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_amendments ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_amendments ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_amendments ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dam_src_doc ON deal_amendments(source_document_id);

ALTER TABLE deal_consent_mechanics ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_consent_mechanics ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_consent_mechanics ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_consent_mechanics ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_consent_mechanics ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dcm_src_doc ON deal_consent_mechanics(source_document_id);

ALTER TABLE deal_development_phases ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_development_phases ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_development_phases ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_development_phases ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_development_phases ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ddp_src_doc ON deal_development_phases(source_document_id);

ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_obligation_register ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dor_src_doc ON deal_obligation_register(source_document_id);

ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS source_page         INTEGER;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS source_snippet      TEXT;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS source_extracted_by TEXT;
ALTER TABLE deal_onboarding_snapshots ADD COLUMN IF NOT EXISTS source_extracted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dos_src_doc ON deal_onboarding_snapshots(source_document_id);

-- ── evidence_citations.field_key convention ─────────────────────────────────
-- Freeform TEXT today; formalised pattern so the ingestion engine and
-- TopSheet rendering layer share one convention.
--   row-level:      {table}:{pk_or_natural_id}        e.g. capital_structure_instruments:15
--   column-level:   {table}.{column}:{pk_or_nat_id}   e.g. deals.enterprise_value:26
--   natural-key:    {table}:{natural_id}              e.g. deal_risk_register:RISK-ST-008
-- Regex (for future CHECK): ^[a-z_]+(\.[a-z_]+)?:[A-Za-z0-9_-]+$
COMMENT ON COLUMN evidence_citations.field_key IS
    'Field_key convention: {table}:{pk} | {table}.{column}:{pk} | {table}:{natural_id}. Regex: ^[a-z_]+(\.[a-z_]+)?:[A-Za-z0-9_-]+$. A future migration at real-client cutover will add this as a CHECK constraint.';

-- ── Snapshot pinning — immutable per-field citations frozen at snapshot time ─
-- Populated by the TopSheet snapshot engine when a snapshot is taken.
-- Every rendered field gets one row pinning its citation. Rows are immutable
-- thereafter (application-enforced now; trigger-enforced post-cutover).
CREATE TABLE IF NOT EXISTS topsheet_snapshot_field_citations (
    id                  SERIAL PRIMARY KEY,
    snapshot_id         INTEGER NOT NULL REFERENCES deal_topsheet_snapshots(id) ON DELETE CASCADE,
    field_key           TEXT NOT NULL,
    source_document_id  INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    source_page         INTEGER,
    source_cell_ref     TEXT,
    source_snippet      TEXT,
    source_extracted_by TEXT,
    source_confidence   NUMERIC(5,2),
    pinned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_tsfc_snapshot ON topsheet_snapshot_field_citations(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_tsfc_document ON topsheet_snapshot_field_citations(source_document_id);

COMMENT ON TABLE topsheet_snapshot_field_citations IS
    'Per-field immutable citation pinning for TopSheet snapshots. Populated at snapshot time. Complements topsheet_snapshot_provenance (which records event-level snapshot context).';

-- ── Helper view — audit coverage by deal and table ──────────────────────────
-- Returns one row per (deal_id, table_name) with total_rows and
-- missing_count (rows where source_document_id IS NULL). Used as a CI check
-- in production ("must be empty") and as a dashboard widget for % coverage.
CREATE OR REPLACE VIEW v_topsheet_field_audit_status AS
  SELECT deal_id, 'capital_structure_instruments'::text AS table_name,
         COUNT(*) AS total_rows,
         COUNT(*) FILTER (WHERE source_document_id IS NULL) AS missing_count
  FROM capital_structure_instruments GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'corporate_entities', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM corporate_entities GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_jurisdiction_splits', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_jurisdiction_splits GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'covenant_thresholds', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM covenant_thresholds GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_distribution_conditions', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_distribution_conditions GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_eod_register', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_eod_register GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_trigger_events', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_trigger_events GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_counterparties', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_counterparties GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_reserve_accounts', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_reserve_accounts GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'hedge_portfolio', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM hedge_portfolio GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_risk_register', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_risk_register GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_kpi_targets', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_kpi_targets GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_amendments', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_amendments GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_consent_mechanics', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_consent_mechanics GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_development_phases', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_development_phases GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_obligation_register', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_obligation_register GROUP BY deal_id
  UNION ALL
  SELECT deal_id, 'deal_onboarding_snapshots', COUNT(*),
         COUNT(*) FILTER (WHERE source_document_id IS NULL)
  FROM deal_onboarding_snapshots GROUP BY deal_id;

COMMENT ON VIEW v_topsheet_field_audit_status IS
    'Per (deal, table) audit coverage. In production, SELECT * FROM this WHERE missing_count > 0 must be empty. In the demo portfolio, expect missing_count = total_rows for every row.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- KPI SCENARIOS as FIRST-CLASS TIME SERIES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Retires `deal_kpi_targets` (scalar per-scenario values) in favour of
-- `forecast_period_items` rows keyed on (forecast_case_version, period, line_key).
-- Management case KPI series == IC baseline. Stress cases get their own
-- `forecast_cases` rows, optionally linked to the risk that motivated the stress
-- via forecast_cases.driving_risk_id.
--
-- See docs/architecture/kpi-scenarios.md for the full pattern.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) forecast_cases gains risk linkage + stress metadata
ALTER TABLE forecast_cases
    ADD COLUMN IF NOT EXISTS driving_risk_id UUID REFERENCES deal_risk_register(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS stress_label    TEXT,
    ADD COLUMN IF NOT EXISTS scenario_kind   TEXT;

COMMENT ON COLUMN forecast_cases.driving_risk_id IS
    'When the scenario is a stress case motivated by an IC-identified risk, the FK to that risk register entry.';
COMMENT ON COLUMN forecast_cases.stress_label IS
    'Human-readable name for a stress scenario, e.g. "P90 wind resource", "Pandemic passenger shock".';
COMMENT ON COLUMN forecast_cases.scenario_kind IS
    'Canonical scenario discriminator. One of: management_case, credit_case, lender_case, combined_downside, single_variant_stress, custom.';

CREATE INDEX IF NOT EXISTS idx_forecast_cases_driving_risk
    ON forecast_cases(driving_risk_id) WHERE driving_risk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forecast_cases_scenario_kind
    ON forecast_cases(scenario_kind) WHERE scenario_kind IS NOT NULL;

-- Backfill scenario_kind from existing case_type values (idempotent)
UPDATE forecast_cases SET scenario_kind = case_type
    WHERE scenario_kind IS NULL AND case_type IS NOT NULL;

-- 2) deal_kpi_observations gains audit-trail FK pointers
ALTER TABLE deal_kpi_observations
    ADD COLUMN IF NOT EXISTS base_forecast_item_id   INTEGER REFERENCES forecast_period_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS stress_forecast_item_id INTEGER REFERENCES forecast_period_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN deal_kpi_observations.base_forecast_item_id IS
    'The forecast_period_items row used as the base-case reference for deviation_to_stress on this observation (audit trail).';
COMMENT ON COLUMN deal_kpi_observations.stress_forecast_item_id IS
    'The forecast_period_items row used as the stress-case reference for deviation_to_stress on this observation (audit trail).';

-- 3) Migrate deal_kpi_targets → forecast_period_items (if table still exists)
DO $kpi_mig$
DECLARE
    v_target       RECORD;
    v_case_id      INTEGER;
    v_version_id   INTEGER;
    v_kind         TEXT;
    v_case_key     TEXT;
    v_new_case_id  INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'deal_kpi_targets' AND n.nspname = 'public'
    ) THEN
        RAISE NOTICE 'deal_kpi_targets already retired; skipping migration.';
        RETURN;
    END IF;

    FOR v_target IN
        SELECT dkt.deal_id, dkt.kpi_key, dkt.kpi_label, dkt.scenario,
               dkt.target_value, dkt.target_floor, dkt.target_ceiling,
               dkt.direction, dkt.unit, dkt.source, dkt.source_date,
               dkt.source_document_id, dkt.source_page, dkt.source_snippet,
               dkt.source_extracted_by, dkt.source_extracted_at
        FROM deal_kpi_targets dkt
        ORDER BY dkt.deal_id, dkt.scenario, dkt.kpi_key
    LOOP
        -- Map legacy 'scenario' text to scenario_kind
        IF v_target.scenario = 'base_case' OR v_target.scenario = 'management_case' THEN
            v_kind := 'management_case';
            v_case_key := NULL;  -- resolved by scenario_kind match
        ELSIF v_target.scenario = 'stress_case' OR v_target.scenario = 'combined_downside' THEN
            v_kind := 'combined_downside';
            v_case_key := NULL;
        ELSE
            v_kind := 'combined_downside';  -- default stresses to combined downside
            v_case_key := NULL;
        END IF;

        -- Find the forecast_case for this deal + scenario_kind (or case_type)
        SELECT id INTO v_case_id
        FROM forecast_cases
        WHERE deal_id = v_target.deal_id
          AND (scenario_kind = v_kind OR case_type = v_kind)
        ORDER BY id
        LIMIT 1;

        -- If no combined_downside case exists, create one
        IF v_case_id IS NULL AND v_kind = 'combined_downside' THEN
            INSERT INTO forecast_cases (
                deal_id, case_key, case_name, case_type, scenario_kind,
                comparison_priority, drives_monitoring, owner_name, summary, created_at
            ) VALUES (
                v_target.deal_id,
                'combined_downside_migrated',
                'Combined downside (migrated from deal_kpi_targets)',
                'combined_downside',
                'combined_downside',
                3, FALSE, 'Migration',
                'Automatically created during deal_kpi_targets retirement to hold the stress-case KPI values.',
                NOW()
            )
            ON CONFLICT (deal_id, case_key) DO UPDATE SET case_name = EXCLUDED.case_name
            RETURNING id INTO v_new_case_id;
            v_case_id := v_new_case_id;
        END IF;

        IF v_case_id IS NULL THEN
            RAISE NOTICE 'No forecast_case found for deal_id=% scenario_kind=%; skipping target row.',
                v_target.deal_id, v_kind;
            CONTINUE;
        END IF;

        -- Find the active version for that case (create v1 if missing)
        SELECT id INTO v_version_id
        FROM forecast_case_versions
        WHERE forecast_case_id = v_case_id AND is_active = TRUE
        ORDER BY version_number DESC
        LIMIT 1;

        IF v_version_id IS NULL THEN
            INSERT INTO forecast_case_versions (
                forecast_case_id, version_number, version_label, version_status,
                source_domain, summary, effective_from, activated_at, is_active
            ) VALUES (
                v_case_id, 1, 'v1 (migrated)', 'active',
                'migration', 'Auto-created v1 during deal_kpi_targets migration.',
                COALESCE(v_target.source_date, CURRENT_DATE),
                NOW(), TRUE
            )
            RETURNING id INTO v_version_id;
        END IF;

        -- Ensure the line_key exists in line_item_definitions (it should for sector_kpi_*)
        IF NOT EXISTS (SELECT 1 FROM line_item_definitions WHERE line_key = v_target.kpi_key) THEN
            INSERT INTO line_item_definitions (line_key, section, display_label, row_order, is_generic, unit)
            VALUES (v_target.kpi_key, 'sector_kpi', v_target.kpi_label, 99, FALSE, v_target.unit)
            ON CONFLICT (line_key) DO NOTHING;
        END IF;

        -- Write the scalar target value into forecast_period_items for EVERY reporting period of this deal
        -- (same value across periods — this is the semantic bridge from scalar to series)
        INSERT INTO forecast_period_items (
            deal_id, forecast_case_version_id, reporting_period_id, line_key, value
        )
        SELECT
            v_target.deal_id, v_version_id, drp.id, v_target.kpi_key, v_target.target_value
        FROM deal_reporting_periods drp
        WHERE drp.deal_id = v_target.deal_id
        ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

        -- Keep the deal_line_item_labels override up to date
        INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal, is_active)
        VALUES (
            v_target.deal_id, v_target.kpi_key, v_target.kpi_label,
            COALESCE(SUBSTRING(v_target.kpi_key FROM 'sector_kpi_(\d+)')::INTEGER, 99),
            TRUE
        )
        ON CONFLICT (deal_id, line_key) DO NOTHING;
    END LOOP;

    RAISE NOTICE 'deal_kpi_targets migration complete.';
END;
$kpi_mig$;

-- 4) Rebuild v_topsheet_field_audit_status WITHOUT the deal_kpi_targets union branch
CREATE OR REPLACE VIEW v_topsheet_field_audit_status AS
    SELECT deal_id, 'capital_structure_instruments'::text AS table_name,
           COUNT(*) AS total_rows,
           COUNT(*) FILTER (WHERE source_document_id IS NULL) AS missing_count
    FROM capital_structure_instruments GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'corporate_entities', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM corporate_entities GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_jurisdiction_splits', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_jurisdiction_splits GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'covenant_thresholds', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM covenant_thresholds GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_distribution_conditions', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_distribution_conditions GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_eod_register', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_eod_register GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_trigger_events', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_trigger_events GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_counterparties', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_counterparties GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_reserve_accounts', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_reserve_accounts GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'hedge_portfolio', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM hedge_portfolio GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_risk_register', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_risk_register GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_amendments', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_amendments GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_consent_mechanics', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_consent_mechanics GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_development_phases', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_development_phases GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_obligation_register', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_obligation_register GROUP BY deal_id
    UNION ALL
    SELECT deal_id, 'deal_onboarding_snapshots', COUNT(*),
           COUNT(*) FILTER (WHERE source_document_id IS NULL)
    FROM deal_onboarding_snapshots GROUP BY deal_id;

-- 5) Retire the old table
DROP TABLE IF EXISTS deal_kpi_targets CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- INSTRUMENT ECONOMICS — pricing components, fees, ratchets, yield
-- ═══════════════════════════════════════════════════════════════════════════════
-- Decomposes capital_structure_instruments.margin_bps (which was conflating
-- coupon / base_rate / spread for fixed-rate bonds) into canonical pricing
-- components. Adds fee economics for loans. Adds a child table for time-
-- and trigger-varying margin (base-margin ratchets + ESG SPT adjustments).
--
-- See docs/architecture/instrument-economics.md for the full pattern.
-- ═══════════════════════════════════════════════════════════════════════════════

-- A) Pricing components (canonical)
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS coupon_bps                INTEGER,
    ADD COLUMN IF NOT EXISTS base_rate_at_issuance_bps INTEGER,
    ADD COLUMN IF NOT EXISTS spread_bps                INTEGER,
    ADD COLUMN IF NOT EXISTS benchmark_spread_bps      INTEGER,
    ADD COLUMN IF NOT EXISTS floor_bps                 INTEGER,
    ADD COLUMN IF NOT EXISTS payment_frequency         TEXT,
    ADD COLUMN IF NOT EXISTS day_count_convention      TEXT;

-- Generated: private-debt premium vs IC-memo author's benchmark at pricing
-- Wrapped in a DO block so we can drop-and-recreate cleanly if the formula ever changes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'capital_structure_instruments'
          AND column_name = 'private_debt_premium_bps'
    ) THEN
        EXECUTE 'ALTER TABLE capital_structure_instruments
                   ADD COLUMN private_debt_premium_bps INTEGER
                     GENERATED ALWAYS AS (spread_bps - benchmark_spread_bps) STORED';
    END IF;
END $$;

COMMENT ON COLUMN capital_structure_instruments.coupon_bps                IS 'Full coupon at issuance (fixed-rate bonds/notes). E.g. 612 for a 6.125% bond.';
COMMENT ON COLUMN capital_structure_instruments.base_rate_at_issuance_bps IS 'Snapshot of the risk-free/benchmark rate at pricing (gilt, bund, SOFR fix).';
COMMENT ON COLUMN capital_structure_instruments.spread_bps                IS 'Credit spread at issuance = coupon − base_rate, or margin for FRNs. Canonical field for WA Spread.';
COMMENT ON COLUMN capital_structure_instruments.benchmark_spread_bps      IS 'IC-memo author view of comparable new-issue spread at pricing (peer/market benchmark in bps).';
COMMENT ON COLUMN capital_structure_instruments.private_debt_premium_bps  IS 'GENERATED: spread_bps − benchmark_spread_bps. What the author captured above the liquid comp.';
COMMENT ON COLUMN capital_structure_instruments.floor_bps                 IS 'Base-rate floor (common in modern leveraged loans).';
COMMENT ON COLUMN capital_structure_instruments.payment_frequency         IS 'monthly | quarterly | semi_annual | annual';
COMMENT ON COLUMN capital_structure_instruments.day_count_convention      IS 'act_360 | act_365 | 30_360';

-- B) Loan fee economics
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS upfront_fee_bps              INTEGER,
    ADD COLUMN IF NOT EXISTS upfront_fee_basis            TEXT,
    ADD COLUMN IF NOT EXISTS commitment_fee_pct_of_margin NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS commitment_fee_bps           INTEGER,
    ADD COLUMN IF NOT EXISTS utilisation_fee_tiers        JSONB,
    ADD COLUMN IF NOT EXISTS ticking_fee_bps              INTEGER,
    ADD COLUMN IF NOT EXISTS ticking_fee_start            DATE,
    ADD COLUMN IF NOT EXISTS agent_fee_annual             NUMERIC,
    ADD COLUMN IF NOT EXISTS extension_fee_bps            INTEGER,
    ADD COLUMN IF NOT EXISTS exit_fee_bps                 INTEGER;

COMMENT ON COLUMN capital_structure_instruments.upfront_fee_bps              IS 'Arrangement / OID paid at drawdown, expressed as bps of committed (or drawn — see upfront_fee_basis).';
COMMENT ON COLUMN capital_structure_instruments.commitment_fee_pct_of_margin IS 'Fee on undrawn commitment, expressed as % of margin (e.g. 35.00 = 35% of margin).';
COMMENT ON COLUMN capital_structure_instruments.utilisation_fee_tiers        IS 'Tiered fee schedule: [{threshold_pct, fee_bps}, ...].';

-- C) Prepayment / call protection upgrades (legacy call_protection TEXT stays for freeform notes)
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS prepayment_protection_type TEXT,
    ADD COLUMN IF NOT EXISTS prepayment_schedule        JSONB,
    ADD COLUMN IF NOT EXISTS soft_call_until            DATE,
    ADD COLUMN IF NOT EXISTS mfn_sunset_months          INTEGER;

COMMENT ON COLUMN capital_structure_instruments.prepayment_protection_type IS 'make_whole | hard_call | soft_call | none';
COMMENT ON COLUMN capital_structure_instruments.prepayment_schedule        IS 'Array of {from_year, premium_pct} declining-premium schedules.';

-- D) Yield & acquisition economics (for instruments we hold)
ALTER TABLE capital_structure_instruments
    ADD COLUMN IF NOT EXISTS acquisition_channel    TEXT,
    ADD COLUMN IF NOT EXISTS purchase_price         NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS original_issue_price   NUMERIC(8,4),
    ADD COLUMN IF NOT EXISTS ytm_bps                INTEGER,
    ADD COLUMN IF NOT EXISTS ytw_bps                INTEGER,
    ADD COLUMN IF NOT EXISTS has_pik                BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pik_margin_bps         INTEGER,
    ADD COLUMN IF NOT EXISTS pik_toggle             BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN capital_structure_instruments.acquisition_channel IS 'primary | secondary_purchase';
COMMENT ON COLUMN capital_structure_instruments.purchase_price      IS 'Price paid, par = 100.00 (e.g. 99.5 for new-issue with OID, 102.25 for secondary premium).';

-- E) Margin ratchet child table — base-margin tiers AND ESG SPT adjustments
-- One row per ratchet/adjustment tier. Effective margin at time T =
-- (latest active base_margin tier) + SUM(currently-active esg_adjustment deltas).
CREATE TABLE IF NOT EXISTS capital_structure_margin_ratchets (
    id                        SERIAL PRIMARY KEY,
    instrument_id             UUID    NOT NULL REFERENCES capital_structure_instruments(id) ON DELETE CASCADE,
    step_order                INTEGER NOT NULL,
    ratchet_kind              TEXT    NOT NULL,   -- 'base_margin' | 'esg_adjustment'
    trigger_type              TEXT    NOT NULL,   -- 'time_based' | 'leverage' | 'dscr' | 'icr' | 'coverage_ratio' | 'event_based' | 'esg_kpi' | 'pik_toggle'
    trigger_metric            TEXT,               -- 'net_leverage' | 'senior_dscr' | 'COD' | 'sector_kpi_3' | 'carbon_intensity_tco2_per_pax' | ...
    trigger_operator          TEXT,               -- '<' | '<=' | '=' | '>=' | '>' | 'between'
    trigger_threshold         NUMERIC,            -- e.g. 5.0 for '< 5.0x', 35 for '< 35 tCO2'
    trigger_threshold_upper   NUMERIC,            -- used when trigger_operator = 'between'
    effective_from            DATE,               -- optional — null for purely threshold-driven without fixed date
    effective_to              DATE,               -- optional — null if runs to maturity
    adjustment_mode           TEXT    NOT NULL,   -- 'absolute' (margin_bps replaces base) | 'additive' (margin_bps added to base)
    margin_bps                INTEGER NOT NULL,   -- new total if absolute, signed delta if additive (e.g. -10 for ESG reward, +10 for penalty)
    pik_portion_bps           INTEGER,            -- PIK split within this tier (absolute mode only)
    step_type                 TEXT    NOT NULL,   -- 'initial' | 'step_up' | 'ratchet_down' | 'pik_toggle' | 'default_margin' | 'esg_reward' | 'esg_penalty'
    notes                     TEXT,
    -- 5-col audit-trail provenance block
    source_document_id        INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    source_page               INTEGER,
    source_snippet            TEXT,
    source_extracted_by       TEXT,
    source_extracted_at       TIMESTAMPTZ,
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instrument_id, step_order),
    CHECK (ratchet_kind IN ('base_margin', 'esg_adjustment')),
    CHECK (adjustment_mode IN ('absolute', 'additive')),
    CHECK (trigger_operator IS NULL OR trigger_operator IN ('<', '<=', '=', '>=', '>', 'between')),
    -- ESG adjustments are always additive; base margin tiers are always absolute
    CHECK (
        (ratchet_kind = 'base_margin' AND adjustment_mode = 'absolute')
        OR
        (ratchet_kind = 'esg_adjustment' AND adjustment_mode = 'additive')
    )
);
CREATE INDEX IF NOT EXISTS idx_csmr_instrument     ON capital_structure_margin_ratchets(instrument_id);
CREATE INDEX IF NOT EXISTS idx_csmr_effective_from ON capital_structure_margin_ratchets(effective_from);
CREATE INDEX IF NOT EXISTS idx_csmr_kind           ON capital_structure_margin_ratchets(ratchet_kind);
CREATE INDEX IF NOT EXISTS idx_csmr_src_doc        ON capital_structure_margin_ratchets(source_document_id);

COMMENT ON TABLE  capital_structure_margin_ratchets IS
    'Margin ratchet schedule per instrument. ratchet_kind=base_margin holds absolute-margin tiers (time- or covenant-triggered step-downs/step-ups). ratchet_kind=esg_adjustment holds signed bps deltas applied on top of the active base tier when linked sustainability SPTs are met/missed.';

-- F) Backfill spread_bps = margin_bps for floating-rate (and GILT-indexed) instruments
--    where margin IS the spread. Fixed-rate instruments need coupon + base_rate
--    backfill — handled by a seed block below.
UPDATE capital_structure_instruments
   SET spread_bps = margin_bps
 WHERE spread_bps IS NULL
   AND margin_bps IS NOT NULL
   AND (interest_type = 'floating'
        OR base_rate IN ('SOFR','SONIA','EURIBOR','ESTR','CORRA','TONA','EURIBOR3M','SOFR3M','GILT'));

-- F.1) Fixed-rate instrument backfill — coupon, base rate at issuance, spread, benchmark
--      from IC-memo-era estimates. Only touches rows still NULL.
WITH f AS (SELECT * FROM (VALUES
    ('gatwick-airport', 'Class A 6.125% 2026 Bond',       612,  400,  212,  175),
    ('gatwick-airport', 'Class A 2.5% 2030 Bond',         250,  120,  130,  115),
    ('gatwick-airport', 'Class A SLB 3.625% 2033 Bond',   362,  225,  137,  150),
    ('gatwick-airport', 'Class A 4.625% 2034 Bond',       462,  300,  162,  150),
    ('gatwick-airport', 'Class A 5.75% 2037 Bond',        575,  350,  225,  200),
    ('gatwick-airport', 'Class A 3.125% 2039 Bond',       312,  230,   82,   75),
    ('gatwick-airport', 'Class A 5.5% 2040 Bond',         550,  350,  200,  175),
    ('gatwick-airport', 'Class A 6.5% 2041 Bond',         650,  450,  200,  175),
    ('gatwick-airport', 'Class A 2.625% 2046 Bond',       262,  200,   62,   60),
    ('gatwick-airport', 'Class A 3.25% 2048 Bond',        325,  250,   75,   75),
    ('gatwick-airport', 'Class A 2.875% 2049 Bond',       287,  150,  137,  125),
    ('gatwick-airport', 'GAF 6% 2030 Bond (XS3221827911)',600,  425,  175,  160),
    ('getlink-eurotunnel', 'Eurotunnel Term Loan (project finance, partially index-linked)', 350, 0, 350, 325),
    ('getlink-eurotunnel', 'Getlink SE 2025 Green Bonds', 375, 280, 95, 85),
    ('m6-toll', 'Parent Loan Facility A (term)', 900, 120, 780, 450),
    ('m6-toll', 'Parent Loan Facility B (on-demand)', 900, 120, 780, 450),
    ('north-sea-owf', 'Shareholder Loan', 800, 150, 650, 600)
  ) AS v(slug, name, coupon, base_rate, spread, benchmark))
UPDATE capital_structure_instruments csi
   SET coupon_bps = f.coupon,
       base_rate_at_issuance_bps = f.base_rate,
       spread_bps = COALESCE(csi.spread_bps, f.spread),
       benchmark_spread_bps = COALESCE(csi.benchmark_spread_bps, f.benchmark)
  FROM f JOIN deals d ON d.slug = f.slug
 WHERE csi.deal_id = d.id
   AND csi.instrument_name = f.name
   AND csi.coupon_bps IS NULL;

-- F.2) Default benchmark for any remaining instrument: spread − 20bp (a flat
--      20bp private-debt premium baseline). Individual IC-memo values override.
UPDATE capital_structure_instruments
   SET benchmark_spread_bps = GREATEST(spread_bps - 20, 0)
 WHERE benchmark_spread_bps IS NULL
   AND spread_bps IS NOT NULL;

-- F.3) Example margin ratchets — Aurora base-margin step-down + Gatwick SLB ESG SPTs.
--      Only inserted if no ratchets exist for the instrument yet (first-run only).
DO $ratchet_seed$
DECLARE
    v_inst_id UUID;
BEGIN
    -- Aurora Senior Term Loan A: construction → post-COD → further leverage-based step-down
    SELECT csi.id INTO v_inst_id
      FROM capital_structure_instruments csi
      JOIN deals d ON d.id = csi.deal_id
     WHERE d.slug = 'aurora-prime-data-campus'
       AND csi.instrument_name = 'Senior Term Loan A'
     LIMIT 1;
    IF v_inst_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM capital_structure_margin_ratchets WHERE instrument_id = v_inst_id
    ) THEN
        INSERT INTO capital_structure_margin_ratchets
          (instrument_id, step_order, ratchet_kind, trigger_type, trigger_metric,
           trigger_operator, trigger_threshold, effective_from, effective_to,
           adjustment_mode, margin_bps, step_type, notes)
        VALUES
          (v_inst_id, 1, 'base_margin', 'time_based', NULL, NULL, NULL,
           '2023-06-30'::date, '2025-09-01'::date, 'absolute', 325, 'initial',
           'Construction/ramp period — margin 325bp'),
          (v_inst_id, 2, 'base_margin', 'leverage', 'net_leverage', '<', 5.0,
           '2025-09-01'::date, NULL, 'absolute', 275, 'ratchet_down',
           'Post-COD ratchet down to 275bp when leverage < 5.0x'),
          (v_inst_id, 3, 'base_margin', 'leverage', 'net_leverage', '<', 4.0,
           '2025-09-01'::date, NULL, 'absolute', 225, 'ratchet_down',
           'Further ratchet to 225bp when leverage < 4.0x');
    END IF;

    -- Gatwick SLB 3.625% 2033 Bond: ESG SPTs linked to carbon intensity + renewable electricity
    SELECT csi.id INTO v_inst_id
      FROM capital_structure_instruments csi
      JOIN deals d ON d.id = csi.deal_id
     WHERE d.slug = 'gatwick-airport'
       AND csi.instrument_name = 'Class A SLB 3.625% 2033 Bond'
     LIMIT 1;
    IF v_inst_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM capital_structure_margin_ratchets WHERE instrument_id = v_inst_id
    ) THEN
        INSERT INTO capital_structure_margin_ratchets
          (instrument_id, step_order, ratchet_kind, trigger_type, trigger_metric,
           trigger_operator, trigger_threshold, effective_from,
           adjustment_mode, margin_bps, step_type, notes)
        VALUES
          (v_inst_id, 1, 'base_margin',    'time_based', NULL,                               NULL, NULL,  '2024-10-16'::date, 'absolute', 137, 'initial',      'Issuance margin (coupon 362 − 225 gilt)'),
          (v_inst_id, 2, 'esg_adjustment', 'esg_kpi',    'carbon_intensity_tco2_per_pax',   '<=',  1.5,   '2027-12-31'::date, 'additive', -10, 'esg_reward',   'SPT 1: Scope 1+2 CO2/PAX ≤ 1.5 by 2027 → −10bp'),
          (v_inst_id, 3, 'esg_adjustment', 'esg_kpi',    'carbon_intensity_tco2_per_pax',   '>',   1.5,   '2027-12-31'::date, 'additive', 10,  'esg_penalty', 'SPT 1 missed: +10bp step-up'),
          (v_inst_id, 4, 'esg_adjustment', 'esg_kpi',    'renewable_electricity_pct',       '>=',  100.0, '2030-12-31'::date, 'additive', -5,  'esg_reward',   'SPT 2: 100% renewable electricity by 2030 → −5bp'),
          (v_inst_id, 5, 'esg_adjustment', 'esg_kpi',    'renewable_electricity_pct',       '<',   100.0, '2030-12-31'::date, 'additive', 5,   'esg_penalty', 'SPT 2 missed: +5bp step-up');
    END IF;
END $ratchet_seed$;

-- G) Extend v_topsheet_field_audit_status to cover ratchets
DROP VIEW IF EXISTS v_topsheet_field_audit_status_v2 CASCADE;
-- (the main view recreation lives up-stream; ratchet coverage added by a future pass)

-- ═══════════════════════════════════════════════════════════════════════════════
-- End of migrations — all statements above are idempotent
-- ═══════════════════════════════════════════════════════════════════════════════
