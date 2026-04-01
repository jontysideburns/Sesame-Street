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

-- ═══════════════════════════════════════════════════════════════════════════════
-- End of migrations — all statements above are idempotent
-- ═══════════════════════════════════════════════════════════════════════════════
