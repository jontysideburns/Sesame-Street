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

-- ═══════════════════════════════════════════════════════════════════════════════
-- End of migrations — all statements above are idempotent
-- ═══════════════════════════════════════════════════════════════════════════════
