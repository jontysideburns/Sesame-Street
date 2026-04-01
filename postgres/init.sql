CREATE TABLE IF NOT EXISTS platform_clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  client_type TEXT NOT NULL,
  domicile TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organisations (
  id SERIAL PRIMARY KEY,
  platform_client_id INTEGER NOT NULL REFERENCES platform_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organisation_type TEXT NOT NULL,
  domicile TEXT NOT NULL,
  reporting_currency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio_owners (
  id SERIAL PRIMARY KEY,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  portfolio_owner_id INTEGER NOT NULL REFERENCES portfolio_owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  benchmark TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS app_roles (
  id SERIAL PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  role_name TEXT NOT NULL,
  role_description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS app_user_roles (
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,

  -- Core (existing fields kept as-is)
  name TEXT NOT NULL,
  borrower TEXT NOT NULL,
  sector TEXT NOT NULL,
  deal_type TEXT NOT NULL,
  region TEXT NOT NULL,
  currency TEXT NOT NULL,
  facility_amount BIGINT NOT NULL,
  exposure BIGINT NOT NULL,
  grade TEXT NOT NULL,
  watchlist BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL,
  revenue_risk TEXT NOT NULL,
  summary TEXT NOT NULL,
  phase TEXT NOT NULL,
  deal_overview TEXT NOT NULL,
  latest_period_label TEXT NOT NULL,
  latest_period_end DATE NOT NULL,
  latest_reported_at TIMESTAMPTZ NOT NULL,
  next_test_date DATE NOT NULL,
  metrics JSONB NOT NULL,

  -- F.1 Deal Identity
  borrower_legal_name TEXT,
  borrower_trading_name TEXT,
  borrower_lei VARCHAR(20),
  borrower_jurisdiction VARCHAR(2),
  borrower_registered_number TEXT,
  project_codename TEXT,
  approved_auditors TEXT[],
  sic_code VARCHAR(5),
  sector_label TEXT,
  sub_sector_label TEXT,
  ticcs_classification TEXT,
  sponsor_name TEXT,
  sponsor_fund TEXT,
  parent_group TEXT,
  ownership_structure TEXT,
  consortium_members JSONB,
  country VARCHAR(2),
  reporting_currency VARCHAR(3),
  counterparties JSONB,

  -- F.2 Structure & Terms
  structure_type TEXT,
  origination_type TEXT,
  seniority TEXT,
  security_type TEXT,
  security_summary TEXT,
  origination_date DATE,
  commitment_date DATE,
  first_drawdown_date DATE,
  cod_date DATE,
  cod_months INTEGER,
  maturity_date DATE,
  weighted_average_life DECIMAL,
  contract_length_months INTEGER,
  fiscal_year_end_month INTEGER,
  concession_expiry_date DATE,
  regulatory_period_current TEXT,
  reporting_periodicity TEXT,
  total_drawn DECIMAL,
  our_commitment DECIMAL,
  our_drawn DECIMAL,
  our_holding_pct DECIMAL,
  pricing_type TEXT,
  pricing_margin_bps INTEGER,
  reference_rate TEXT,
  coupon_rate DECIMAL,
  amortisation_profile TEXT,
  call_protection TEXT,
  governing_law TEXT,
  syndicated BOOLEAN DEFAULT FALSE,
  number_of_lenders INTEGER,
  facility_agent TEXT,
  security_trustee TEXT,

  -- F.2.4 Change of Control
  coc_regime_exists BOOLEAN DEFAULT FALSE,
  coc_definition TEXT,
  coc_consequence TEXT,
  coc_prepayment_basis TEXT,
  coc_permitted_transfers JSONB,
  coc_consent_threshold TEXT,

  -- F.2.5 Sources & Uses
  sources_and_uses JSONB,
  enterprise_value DECIMAL,

  -- F.2A Capital Structure
  capital_structure_instruments JSONB,
  capital_structure_classes JSONB,
  capital_structure_entities JSONB,
  cashflow_waterfall JSONB,
  reserve_accounts JSONB,
  liquidity_facilities JSONB,

  -- F.3 Ratings
  moodys_rating TEXT,
  moodys_outlook TEXT,
  moodys_watch TEXT,
  sp_rating TEXT,
  sp_outlook TEXT,
  sp_watch TEXT,
  fitch_rating TEXT,
  fitch_outlook TEXT,
  fitch_watch TEXT,
  internal_credit_score TEXT,
  performance_grade INTEGER,
  ma_eligibility TEXT,
  rating_trigger_configured BOOLEAN DEFAULT FALSE,
  rating_trigger_threshold TEXT,
  rating_trigger_consequence TEXT,

  -- F.6.3 Covenant proxy flags
  no_hard_covenant_dscr BOOLEAN DEFAULT FALSE,
  no_hard_covenant_icr BOOLEAN DEFAULT FALSE,
  proxy_default_flag BOOLEAN DEFAULT FALSE,

  -- F.7 Sector KPIs (static/origination)
  sector_kpis_static JSONB,

  -- F.8 Stress Configuration
  stress_parameters JSONB,
  named_scenarios JSONB,

  -- F.9 Key Outputs
  unlevered_irr DECIMAL,
  levered_equity_irr DECIMAL,
  moic DECIMAL,
  all_in_cost_of_debt DECIMAL,
  ebitda_margin_lifetime DECIMAL,
  tax_leakage_rate DECIMAL,
  upfront_economics DECIMAL,

  -- F.10 Collateral
  collateral_assessment JSONB,

  -- F.11 Revenue Risk (expanded from revenue_risk code)
  revenue_pricing_mechanism TEXT,
  revenue_volume_mechanism TEXT,
  revenue_duration_category TEXT,
  revenue_risk_composite TEXT,
  revenue_risk_level TEXT,

  -- F.12 Equity Cure
  equity_cure_available BOOLEAN DEFAULT FALSE,
  equity_cure_regime JSONB,

  -- F.13 Monitoring State
  overall_covenant_status TEXT DEFAULT 'performing',
  compliance_status TEXT DEFAULT 'fully_compliant',
  distribution_status TEXT DEFAULT 'permitted',
  consecutive_lockup_periods INTEGER DEFAULT 0,
  assigned_ham TEXT,
  assigned_pm TEXT,

  -- F.15 Development
  development_phases JSONB,
  rollout_plan JSONB,

  -- F.16 Hedging
  hedging_policy JSONB,
  hedging_portfolio JSONB,

  -- F.17 Metadata
  model_version TEXT,
  model_date DATE
);

CREATE TABLE IF NOT EXISTS app_entitlements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  entitlement_scope TEXT NOT NULL,
  platform_client_id INTEGER REFERENCES platform_clients(id) ON DELETE CASCADE,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id INTEGER REFERENCES deals(id) ON DELETE CASCADE,
  entitlement_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS covenants (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  composition_tag TEXT NOT NULL,
  current_value NUMERIC(8, 2) NOT NULL,
  threshold_lockup NUMERIC(8, 2) NOT NULL,
  threshold_trigger NUMERIC(8, 2) NOT NULL,
  headroom_pct NUMERIC(8, 2) NOT NULL,
  status TEXT NOT NULL,
  rationale TEXT NOT NULL,
  numerator_label TEXT NOT NULL,
  numerator_value BIGINT NOT NULL,
  denominator_label TEXT NOT NULL,
  denominator_value BIGINT NOT NULL,
  evidence_page INTEGER NOT NULL,
  evidence_snippet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS covenant_history (
  id SERIAL PRIMARY KEY,
  covenant_id INTEGER NOT NULL REFERENCES covenants(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  dscr NUMERIC(8, 2) NOT NULL,
  expected_dscr NUMERIC(8, 2) NOT NULL
);

-- F.6.3 Full covenant threshold configuration (one row per covenant per deal)
CREATE TABLE IF NOT EXISTS covenant_thresholds (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  covenant_name TEXT NOT NULL,
  ratio_name TEXT NOT NULL,
  covenant_category TEXT NOT NULL,  -- cash_flow_cover, collateral_value, incurrence, distribution, financial_maintenance
  test_type TEXT NOT NULL,          -- hard_covenant, distribution_condition, trigger, default, soft_default
  direction TEXT NOT NULL,          -- min, max
  composition_tag TEXT,
  test_frequency TEXT,              -- quarterly, semi_annual, annual
  enforcement_class TEXT,
  lockup_level DECIMAL,
  trigger_level DECIMAL,
  default_level DECIMAL,
  equity_cure_available BOOLEAN DEFAULT FALSE,
  step_down_schedule JSONB,         -- [{period, lockup, trigger, default}]
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_covenant_thresholds_deal ON covenant_thresholds(deal_id);

CREATE TABLE IF NOT EXISTS obligations (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL,
  days_overdue INTEGER NOT NULL DEFAULT 0,
  grace_days INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  period_label TEXT NOT NULL,
  status TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL,
  evidence_page INTEGER NOT NULL,
  snippet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS financial_periods (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  period_label TEXT NOT NULL,
  period_end DATE NOT NULL,
  source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  reported_metrics JSONB NOT NULL,
  expected_metrics JSONB NOT NULL,
  UNIQUE (deal_id, period_key)
);

CREATE TABLE IF NOT EXISTS financial_variances (
  id SERIAL PRIMARY KEY,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  reported_value NUMERIC(14, 2) NOT NULL,
  expected_value NUMERIC(14, 2) NOT NULL,
  variance_value NUMERIC(14, 2) NOT NULL,
  variance_pct NUMERIC(10, 2) NOT NULL,
  direction TEXT NOT NULL,
  materiality TEXT NOT NULL,
  commentary TEXT NOT NULL
);

-- Actuals received from borrowers (one row per period per source hierarchy)
CREATE TABLE IF NOT EXISTS actual_periods (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,         -- e.g. 'Q1 2026'
  period_flag TEXT NOT NULL,          -- e.g. '2026Q1' (sort key)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_frequency TEXT NOT NULL,     -- monthly, quarterly, semi_annual, annual
  source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  source_document_name TEXT,
  source_document_type TEXT,          -- compliance_certificate, financial_statements, operating_report
  received_date DATE,
  extraction_confidence DECIMAL,
  approval_tier TEXT,                 -- auto_approved, ham_reviewed, manual_entry
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  source_hierarchy TEXT DEFAULT 'certificate',  -- audited, certificate, unaudited, management, model
  actual_metrics JSONB NOT NULL DEFAULT '{}',
  borrower_reported_ratios JSONB DEFAULT '{}',
  platform_computed_ratios JSONB DEFAULT '{}',
  ratio_reconciliation_status TEXT,   -- matched, minor_variance, material_variance, unreconciled
  ratio_reconciliation_detail JSONB,
  borrower_narrative TEXT,
  ham_acknowledged BOOLEAN DEFAULT FALSE,
  ham_acknowledged_at TIMESTAMPTZ,
  sector_kpis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, period_flag, source_hierarchy)
);
CREATE INDEX idx_actual_periods_deal ON actual_periods(deal_id);
CREATE INDEX idx_actual_periods_flag ON actual_periods(period_flag);

-- Covenant test results computed against actual_periods data
CREATE TABLE IF NOT EXISTS covenant_tests (
  id SERIAL PRIMARY KEY,
  actual_period_id INTEGER REFERENCES actual_periods(id) ON DELETE CASCADE,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  covenant_threshold_id INTEGER REFERENCES covenant_thresholds(id) ON DELETE SET NULL,
  covenant_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  ratio_value DECIMAL,
  borrower_reported_value DECIMAL,
  lockup_threshold DECIMAL,
  trigger_threshold DECIMAL,
  default_threshold DECIMAL,
  tier_status TEXT NOT NULL,          -- performing, distribution_lockup, trigger_event, event_of_default
  headroom_to_lockup DECIMAL,
  headroom_to_trigger DECIMAL,
  headroom_to_default DECIMAL,
  components JSONB,                   -- {numerator, denominator, numerator_label, denominator_label}
  source_citation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_covenant_tests_deal ON covenant_tests(deal_id);
CREATE INDEX idx_covenant_tests_period ON covenant_tests(actual_period_id);

-- case_type: management_case, lender_case, combined_downside
-- comparison_priority: 1 = primary (management), 2 = secondary (lender), 3 = floor (combined downside)
CREATE TABLE IF NOT EXISTS forecast_cases (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  case_key TEXT NOT NULL,
  case_name TEXT NOT NULL,
  case_type TEXT NOT NULL,              -- management_case, lender_case, combined_downside
  comparison_priority INTEGER NOT NULL DEFAULT 1,  -- 1=primary, 2=secondary, 3=floor
  drives_monitoring BOOLEAN NOT NULL DEFAULT FALSE,
  owner_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (deal_id, case_key)
);

CREATE TABLE IF NOT EXISTS forecast_case_versions (
  id SERIAL PRIMARY KEY,
  forecast_case_id INTEGER NOT NULL REFERENCES forecast_cases(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  version_status TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  summary TEXT NOT NULL,
  effective_from DATE NOT NULL,
  activated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (forecast_case_id, version_number)
);

CREATE TABLE IF NOT EXISTS forecast_case_periods (
  id SERIAL PRIMARY KEY,
  forecast_case_version_id INTEGER NOT NULL REFERENCES forecast_case_versions(id) ON DELETE CASCADE,
  financial_period_id INTEGER REFERENCES financial_periods(id) ON DELETE SET NULL,
  period_key TEXT NOT NULL,
  period_label TEXT NOT NULL,
  scenario_metrics JSONB NOT NULL,
  scenario_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS forecast_refresh_impacts (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  forecast_case_id INTEGER NOT NULL REFERENCES forecast_cases(id) ON DELETE CASCADE,
  forecast_case_version_id INTEGER NOT NULL REFERENCES forecast_case_versions(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id INTEGER,
  impact_summary TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS deal_assessments (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  grade TEXT NOT NULL,
  overall_score NUMERIC(5, 2) NOT NULL,
  covenant_score INTEGER NOT NULL,
  variance_score INTEGER NOT NULL,
  trend_score INTEGER NOT NULL,
  compliance_score INTEGER NOT NULL,
  watchlist_status TEXT NOT NULL,
  watchlist_recommendation TEXT NOT NULL,
  escalation_level TEXT NOT NULL,
  summary TEXT NOT NULL,
  UNIQUE (deal_id, financial_period_id)
);

CREATE TABLE IF NOT EXISTS distribution_assessments (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  assessed_at TIMESTAMPTZ NOT NULL,
  distribution_status TEXT NOT NULL,
  lockup_state TEXT NOT NULL,
  blocker_count INTEGER NOT NULL,
  distribution_capacity NUMERIC(14, 2),
  cash_trap_amount NUMERIC(14, 2),
  summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  failed_conditions JSONB NOT NULL,
  required_actions JSONB NOT NULL,
  UNIQUE (deal_id, financial_period_id)
);

CREATE TABLE IF NOT EXISTS ratio_reconciliations (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  review_item_id INTEGER,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  borrower_reported_value NUMERIC(14, 4) NOT NULL,
  platform_computed_value NUMERIC(14, 4) NOT NULL,
  variance_value NUMERIC(14, 4) NOT NULL,
  variance_pct NUMERIC(10, 2) NOT NULL,
  tolerance_pct NUMERIC(10, 2) NOT NULL,
  reconciliation_status TEXT NOT NULL,
  explanation TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_supersessions (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  superseded_document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  superseding_document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  supersession_reason TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  affected_objects JSONB NOT NULL,
  downstream_recomputed BOOLEAN NOT NULL DEFAULT FALSE,
  effective_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS grade_overrides (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL REFERENCES deal_assessments(id) ON DELETE CASCADE,
  previous_grade TEXT NOT NULL,
  override_grade TEXT NOT NULL,
  override_status TEXT NOT NULL,
  rationale TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  expires_on DATE NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  impact_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trend_records (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  financial_period_id INTEGER NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  metric_label TEXT NOT NULL,
  trend_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  periods_observed INTEGER NOT NULL,
  severity TEXT NOT NULL,
  total_change_pct NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist_events (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assessment_id INTEGER NOT NULL REFERENCES deal_assessments(id) ON DELETE CASCADE,
  status_from TEXT NOT NULL,
  status_to TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  escalation_level TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  next_review_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS holdings (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  current_amount BIGINT NOT NULL,
  acquisition_date DATE NOT NULL,
  status TEXT NOT NULL,
  UNIQUE (account_id, deal_id)
);

CREATE TABLE IF NOT EXISTS incoming_documents (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  matched_obligation_id INTEGER REFERENCES obligations(id) ON DELETE SET NULL,
  canonical_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  intake_source_path TEXT NOT NULL DEFAULT '',
  raw_storage_status TEXT NOT NULL DEFAULT 'retained',
  directory_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fingerprinted_at TIMESTAMPTZ,
  source_channel TEXT NOT NULL,
  sender TEXT NOT NULL,
  subject TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  period_label TEXT,
  document_type TEXT,
  classification_status TEXT NOT NULL,
  processing_status TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  review_tier TEXT NOT NULL,
  confidence NUMERIC(5, 2),
  received_at TIMESTAMPTZ NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS incoming_document_proposals (
  id SERIAL PRIMARY KEY,
  incoming_document_id INTEGER NOT NULL REFERENCES incoming_documents(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL,
  field_key TEXT,
  field_label TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  confidence NUMERIC(5, 2),
  citation_reference TEXT,
  proposal_status TEXT NOT NULL,
  target_entity_type TEXT NOT NULL DEFAULT 'document_metadata',
  target_metric_key TEXT,
  target_period_key TEXT,
  validation_status TEXT NOT NULL DEFAULT 'not_validated',
  validation_summary TEXT NOT NULL DEFAULT '',
  validation_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  routing_decision TEXT NOT NULL DEFAULT 'triage',
  commit_action TEXT NOT NULL DEFAULT 'none',
  committed_entity_type TEXT,
  committed_entity_id INTEGER,
  committed_at TIMESTAMPTZ,
  committed_by TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS document_processing_runs (
  id SERIAL PRIMARY KEY,
  incoming_document_id INTEGER NOT NULL REFERENCES incoming_documents(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_status TEXT NOT NULL,
  processor_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  confidence NUMERIC(5, 2),
  summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id SERIAL PRIMARY KEY,
  incoming_document_id INTEGER REFERENCES incoming_documents(id) ON DELETE SET NULL,
  processing_run_id INTEGER REFERENCES document_processing_runs(id) ON DELETE SET NULL,
  proposal_id INTEGER REFERENCES incoming_document_proposals(id) ON DELETE SET NULL,
  ai_stage TEXT NOT NULL,
  actor_label TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  retrieved_context JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence NUMERIC(5, 2),
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_citations (
  id SERIAL PRIMARY KEY,
  incoming_document_id INTEGER REFERENCES incoming_documents(id) ON DELETE SET NULL,
  canonical_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  proposal_id INTEGER REFERENCES incoming_document_proposals(id) ON DELETE SET NULL,
  review_item_id INTEGER,
  citation_label TEXT NOT NULL,
  citation_kind TEXT NOT NULL,
  page_number INTEGER,
  table_label TEXT,
  cell_reference TEXT,
  bounding_box JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_key TEXT,
  text_snippet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obligation_fulfilments (
  id SERIAL PRIMARY KEY,
  obligation_id INTEGER NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  incoming_document_id INTEGER REFERENCES incoming_documents(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  received_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  days_late INTEGER NOT NULL DEFAULT 0,
  matched_by TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS compliance_cases (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  obligation_id INTEGER REFERENCES obligations(id) ON DELETE SET NULL,
  incoming_document_id INTEGER REFERENCES incoming_documents(id) ON DELETE SET NULL,
  case_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  resolution_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  compliance_case_id INTEGER REFERENCES compliance_cases(id) ON DELETE SET NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS risk_register_entries (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  assessment_id INTEGER REFERENCES deal_assessments(id) ON DELETE SET NULL,
  trend_record_id INTEGER REFERENCES trend_records(id) ON DELETE SET NULL,
  compliance_case_id INTEGER REFERENCES compliance_cases(id) ON DELETE SET NULL,
  ratio_reconciliation_id INTEGER REFERENCES ratio_reconciliations(id) ON DELETE SET NULL,
  source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
  risk_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  probability TEXT NOT NULL,
  impact TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  mitigant TEXT NOT NULL,
  next_review_date DATE NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,

  -- F.11 TopSheet spec additions (Layer 2 risk register fields)
  risk_id TEXT,                       -- e.g. 'RISK-CF-001', 'CUSTOM-001'
  risk_name TEXT,
  likelihood TEXT,                    -- low, moderate, high, very_high
  score DECIMAL,
  trend TEXT,                         -- improving, stable, deteriorating
  sensitised_at_origination BOOLEAN DEFAULT FALSE,
  sensitivity_name TEXT,
  stress_description TEXT,
  stress_parameters JSONB,
  dscr_min_stress DECIMAL,
  dscr_max_stress DECIMAL,
  dscr_avg_stress DECIMAL,
  monitoring_kpi TEXT,
  monitoring_threshold DECIMAL,
  identified_at TEXT DEFAULT 'origination'  -- origination, monitoring, annual_review
);

CREATE TABLE IF NOT EXISTS borrower_requests (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  request_status TEXT NOT NULL,
  priority TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  related_covenant_id INTEGER REFERENCES covenants(id) ON DELETE SET NULL,
  related_distribution_assessment_id INTEGER REFERENCES distribution_assessments(id) ON DELETE SET NULL,
  related_risk_entry_id INTEGER REFERENCES risk_register_entries(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  borrower_contact TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  due_date DATE NOT NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  decision_summary TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS borrower_request_votes (
  id SERIAL PRIMARY KEY,
  borrower_request_id INTEGER NOT NULL REFERENCES borrower_requests(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  vote_status TEXT NOT NULL,
  voter_name TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id SERIAL PRIMARY KEY,
  workflow_type TEXT NOT NULL,
  workflow_status TEXT NOT NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  holding_id INTEGER REFERENCES holdings(id) ON DELETE SET NULL,
  proposed_organisation_name TEXT NOT NULL DEFAULT '',
  proposed_owner_name TEXT NOT NULL DEFAULT '',
  proposed_account_name TEXT NOT NULL DEFAULT '',
  proposed_deal_name TEXT NOT NULL DEFAULT '',
  proposed_holding_amount BIGINT,
  owner_name TEXT NOT NULL,
  target_go_live_date DATE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES onboarding_workflows(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_activation_events (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES onboarding_workflows(id) ON DELETE CASCADE,
  activation_status TEXT NOT NULL,
  activated_by TEXT NOT NULL,
  summary TEXT NOT NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  holding_id INTEGER REFERENCES holdings(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS demo_clock (
  id SERIAL PRIMARY KEY,
  current_demo_date DATE NOT NULL,
  clock_label TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS monitoring_cycles (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  cycle_key TEXT NOT NULL,
  cycle_label TEXT NOT NULL,
  cycle_type TEXT NOT NULL,
  cycle_status TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  package_due_date DATE NOT NULL,
  internal_review_due_date DATE NOT NULL,
  committee_date DATE NOT NULL,
  report_release_date DATE NOT NULL,
  summary TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE (deal_id, cycle_key)
);

CREATE TABLE IF NOT EXISTS monitoring_cycle_events (
  id SERIAL PRIMARY KEY,
  monitoring_cycle_id INTEGER NOT NULL REFERENCES monitoring_cycles(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  event_label TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  event_status TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  owner_name TEXT NOT NULL,
  dependency_key TEXT NOT NULL DEFAULT '',
  source_entity_type TEXT,
  source_entity_id INTEGER,
  detail_text TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS borrower_request_decisions (
  id SERIAL PRIMARY KEY,
  borrower_request_id INTEGER NOT NULL REFERENCES borrower_requests(id) ON DELETE CASCADE,
  decision_status TEXT NOT NULL,
  decision_summary TEXT NOT NULL,
  decision_rationale TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  effective_from DATE NOT NULL,
  expires_on DATE,
  related_grade_override_id INTEGER REFERENCES grade_overrides(id) ON DELETE SET NULL,
  activated_distribution_status TEXT,
  decision_outcome TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS deal_amendments (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  borrower_request_id INTEGER REFERENCES borrower_requests(id) ON DELETE SET NULL,
  borrower_request_decision_id INTEGER REFERENCES borrower_request_decisions(id) ON DELETE SET NULL,
  amendment_type TEXT NOT NULL,
  amendment_status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS amendment_rule_versions (
  id SERIAL PRIMARY KEY,
  amendment_id INTEGER NOT NULL REFERENCES deal_amendments(id) ON DELETE CASCADE,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  rule_domain TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id INTEGER,
  target_label TEXT NOT NULL,
  version_label TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  previous_value JSONB NOT NULL,
  updated_value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS amendment_change_impacts (
  id SERIAL PRIMARY KEY,
  amendment_id INTEGER NOT NULL REFERENCES deal_amendments(id) ON DELETE CASCADE,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  impact_type TEXT NOT NULL,
  target_entity_type TEXT NOT NULL,
  target_entity_id INTEGER,
  target_label TEXT NOT NULL,
  impact_summary TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  recomputed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS deal_topsheet_snapshots (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  financial_period_id INTEGER REFERENCES financial_periods(id) ON DELETE SET NULL,
  snapshot_label TEXT NOT NULL,
  snapshot_type TEXT NOT NULL,
  trigger_event_id INTEGER,
  prior_snapshot_id INTEGER REFERENCES deal_topsheet_snapshots(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  captured_by TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload_hash TEXT NOT NULL DEFAULT '',
  snapshot_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS memo_packs (
  id SERIAL PRIMARY KEY,
  pack_scope TEXT NOT NULL,
  pack_kind TEXT NOT NULL,
  pack_status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  borrower_request_id INTEGER REFERENCES borrower_requests(id) ON DELETE SET NULL,
  financial_period_id INTEGER REFERENCES financial_periods(id) ON DELETE SET NULL,
  assessment_id INTEGER REFERENCES deal_assessments(id) ON DELETE SET NULL,
  distribution_assessment_id INTEGER REFERENCES distribution_assessments(id) ON DELETE SET NULL,
  snapshot_id INTEGER REFERENCES deal_topsheet_snapshots(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS memo_pack_sections (
  id SERIAL PRIMARY KEY,
  memo_pack_id INTEGER NOT NULL REFERENCES memo_packs(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  summary TEXT NOT NULL,
  section_payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS report_exports (
  id SERIAL PRIMARY KEY,
  export_scope TEXT NOT NULL,
  report_kind TEXT NOT NULL,
  export_status TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending_review',
  release_status TEXT NOT NULL DEFAULT 'draft',
  export_format TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  financial_period_id INTEGER REFERENCES financial_periods(id) ON DELETE SET NULL,
  assessment_id INTEGER REFERENCES deal_assessments(id) ON DELETE SET NULL,
  snapshot_id INTEGER REFERENCES deal_topsheet_snapshots(id) ON DELETE SET NULL,
  report_schedule_id INTEGER,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  activity_source_domain TEXT,
  reviewed_by TEXT,
  approved_by TEXT,
  released_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS report_export_sections (
  id SERIAL PRIMARY KEY,
  report_export_id INTEGER NOT NULL REFERENCES report_exports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  summary TEXT NOT NULL,
  section_payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS report_schedules (
  id SERIAL PRIMARY KEY,
  schedule_scope TEXT NOT NULL,
  report_kind TEXT NOT NULL,
  cadence TEXT NOT NULL,
  schedule_status TEXT NOT NULL,
  schedule_label TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  approver_name TEXT NOT NULL,
  release_channel TEXT NOT NULL,
  distribution_mode TEXT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  activity_source_domain TEXT,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  stale_after_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS report_schedule_recipients (
  id SERIAL PRIMARY KEY,
  report_schedule_id INTEGER NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS report_generation_runs (
  id SERIAL PRIMARY KEY,
  report_schedule_id INTEGER REFERENCES report_schedules(id) ON DELETE SET NULL,
  report_export_id INTEGER REFERENCES report_exports(id) ON DELETE SET NULL,
  run_status TEXT NOT NULL,
  trigger_mode TEXT NOT NULL,
  trigger_summary TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  review_status TEXT NOT NULL,
  release_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_delivery_logs (
  id SERIAL PRIMARY KEY,
  report_export_id INTEGER NOT NULL REFERENCES report_exports(id) ON DELETE CASCADE,
  report_schedule_id INTEGER REFERENCES report_schedules(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  delivery_channel TEXT NOT NULL,
  destination TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS report_delivery_exceptions (
  id SERIAL PRIMARY KEY,
  report_schedule_id INTEGER REFERENCES report_schedules(id) ON DELETE SET NULL,
  report_export_id INTEGER REFERENCES report_exports(id) ON DELETE SET NULL,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  raised_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS review_items (
  id SERIAL PRIMARY KEY,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  incoming_document_id INTEGER REFERENCES incoming_documents(id) ON DELETE SET NULL,
  proposal_id INTEGER REFERENCES incoming_document_proposals(id) ON DELETE SET NULL,
  proposal_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL,
  prior_value TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  document_name TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  snippet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id SERIAL PRIMARY KEY,
  source_domain TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id INTEGER NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  task_status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  assignee_team TEXT NOT NULL,
  queue_name TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  sla_due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  escalation_level TEXT NOT NULL,
  escalation_status TEXT NOT NULL,
  blocked_reason TEXT NOT NULL DEFAULT '',
  deep_link TEXT NOT NULL,
  context_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_entity_type, source_entity_id)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  subscriber_name TEXT NOT NULL UNIQUE,
  subscriber_team TEXT NOT NULL,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  digest_frequency TEXT NOT NULL DEFAULT 'daily',
  escalation_only BOOLEAN NOT NULL DEFAULT FALSE,
  immediate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_channel TEXT NOT NULL DEFAULT 'in_app'
);

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id SERIAL PRIMARY KEY,
  subscriber_name TEXT NOT NULL,
  subscriber_team TEXT NOT NULL,
  source_domain TEXT,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  severity_threshold TEXT NOT NULL DEFAULT 'medium',
  delivery_frequency TEXT NOT NULL DEFAULT 'immediate',
  only_escalations BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_events (
  id SERIAL PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  source_domain TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id INTEGER NOT NULL,
  workflow_task_id INTEGER REFERENCES workflow_tasks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  deep_link TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id SERIAL PRIMARY KEY,
  notification_event_id INTEGER NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  subscriber_name TEXT NOT NULL,
  subscriber_team TEXT NOT NULL,
  delivery_channel TEXT NOT NULL,
  delivery_frequency TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'new',
  delivered_at TIMESTAMPTZ NOT NULL,
  seen_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  UNIQUE (notification_event_id, subscriber_name, delivery_channel)
);

CREATE TABLE IF NOT EXISTS notification_digests (
  id SERIAL PRIMARY KEY,
  subscriber_name TEXT NOT NULL,
  subscriber_team TEXT NOT NULL,
  digest_label TEXT NOT NULL,
  digest_frequency TEXT NOT NULL,
  delivery_channel TEXT NOT NULL,
  digest_status TEXT NOT NULL DEFAULT 'queued',
  item_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_digest_items (
  id SERIAL PRIMARY KEY,
  notification_digest_id INTEGER NOT NULL REFERENCES notification_digests(id) ON DELETE CASCADE,
  notification_delivery_id INTEGER NOT NULL REFERENCES notification_deliveries(id) ON DELETE CASCADE,
  UNIQUE (notification_digest_id, notification_delivery_id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  id SERIAL PRIMARY KEY,
  source_domain TEXT NOT NULL,
  event_family TEXT NOT NULL DEFAULT 'workflow',
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  source_event_id INTEGER REFERENCES activity_events(id) ON DELETE SET NULL,
  deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
  organisation_id INTEGER REFERENCES organisations(id) ON DELETE SET NULL,
  owner_id INTEGER REFERENCES portfolio_owners(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user',
  audit_how TEXT NOT NULL DEFAULT 'manual',
  ai_audit_log_id INTEGER REFERENCES ai_audit_logs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  deep_link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topsheet_snapshot_provenance (
  id SERIAL PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES deal_topsheet_snapshots(id) ON DELETE CASCADE,
  provenance_kind TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id INTEGER,
  source_label TEXT NOT NULL,
  source_event_id INTEGER REFERENCES activity_events(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshot_recomputations (
  id SERIAL PRIMARY KEY,
  snapshot_id INTEGER NOT NULL REFERENCES deal_topsheet_snapshots(id) ON DELETE CASCADE,
  recomputed_at TIMESTAMPTZ NOT NULL,
  recomputed_by TEXT NOT NULL,
  recomputation_status TEXT NOT NULL,
  expected_hash TEXT NOT NULL,
  actual_hash TEXT NOT NULL,
  divergence_summary TEXT NOT NULL,
  diff_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (1, 'aurora-prime-data-campus', 'Aurora Prime Data Campus', 'Aurora Prime Holdings Ltd.', 'Data Center', 'Project Finance', 'North America', 'USD', 420000000, 85000000, '2 - In Line', TRUE, 'Monitoring', 'P2-V4-D2', 'Construction financing for a 36MW colocation data center campus with staged tenant fit-out and quarterly compliance certificates.', 'construction', 'The flagship deal finances the first two halls of a hyperscale-ready campus. Revenue visibility is supported by pre-leasing, while the monitoring story focuses on construction progress, liquidity discipline, and debt service coverage as the project moves toward stabilization.', 'Q2 2026', '2026-06-30', '2026-08-22T00:00:00Z', '2026-11-15', '{"revenue":24100000,"ebitda":12400000,"cfads":10800000,"debtService":8200000,"netDebt":286000000,"cash":19300000,"capexToDate":268000000,"leasedCapacityPct":61,"constructionCompletionPct":68}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (2, 'granite-switchyard-campus', 'Granite Switchyard Campus', 'Granite Digital Infrastructure LLC', 'Data Center', 'Project Finance', 'North America', 'USD', 295000000, 52000000, '1 - Outperforming', FALSE, 'Monitoring', 'P2-V3-D2', 'Stabilizing colocation campus with strong occupancy and on-time reporting.', 'ramp_up', 'Granite is used to show a healthy data center peer with better covenant headroom and no overdue compliance items.', 'Q2 2026', '2026-06-30', '2026-08-06T00:00:00Z', '2026-11-10', '{"revenue":18800000,"ebitda":11000000,"cfads":9700000,"debtService":6300000,"netDebt":203000000,"cash":22700000,"leasedCapacityPct":79,"constructionCompletionPct":100}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (3, 'meridian-edge-campus', 'Meridian Edge Campus', 'Meridian Edge DC OpCo', 'Data Center', 'Project Finance', 'EMEA', 'EUR', 355000000, 64000000, '2 - In Line', FALSE, 'Monitoring', 'P3-V4-D3', 'European edge facility with moderate headroom and minor reporting delay history.', 'operational', 'Meridian rounds out the portfolio view with a non-flagship peer that is healthy but not as strong as Granite.', 'Q2 2026', '2026-06-30', '2026-08-11T00:00:00Z', '2026-11-12', '{"revenue":16200000,"ebitda":9100000,"cfads":7800000,"debtService":5900000,"netDebt":246000000,"cash":12400000,"leasedCapacityPct":73,"constructionCompletionPct":100}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (4, 'ion-harbor-campus', 'Ion Harbor Campus', 'Ion Harbor Infrastructure SPV', 'Data Center', 'Project Finance', 'North America', 'USD', 310000000, 47000000, '3 - Underperforming', TRUE, 'Heightened Monitoring', 'P4-V5-D3', 'Lease-up has lagged plan and one reporting package was delivered inside the grace period.', 'ramp_up', 'Ion Harbor gives the dashboard a clearly stressed comparison point without distracting from the flagship story.', 'Q2 2026', '2026-06-30', '2026-08-15T00:00:00Z', '2026-11-18', '{"revenue":12100000,"ebitda":5700000,"cfads":5100000,"debtService":4100000,"netDebt":252000000,"cash":9800000,"leasedCapacityPct":49,"constructionCompletionPct":100}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (5, 'summit-loop-campus', 'Summit Loop Campus', 'Summit Loop DC Finance Co.', 'Data Center', 'Project Finance', 'APAC', 'USD', 278000000, 36000000, '1 - Outperforming', FALSE, 'Monitoring', 'P2-V3-D2', 'Well-performing APAC campus with stable costs and prompt reporting.', 'operational', 'Summit adds geographic breadth to the portfolio while remaining within the same asset class.', 'Q2 2026', '2026-06-30', '2026-08-08T00:00:00Z', '2026-11-09', '{"revenue":14900000,"ebitda":8800000,"cfads":7600000,"debtService":5200000,"netDebt":181000000,"cash":17300000,"leasedCapacityPct":84,"constructionCompletionPct":100}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (6, 'cobalt-grid-campus', 'Cobalt Grid Campus', 'Cobalt Grid Borrower Inc.', 'Data Center', 'Project Finance', 'North America', 'USD', 398000000, 73000000, '2 - In Line', FALSE, 'Monitoring', 'P3-V4-D3', 'Large hyperscale-enabled campus with balanced covenant headroom and no current workflow exceptions.', 'construction', 'Cobalt helps make the dashboard metrics feel portfolio-sized and institutionally relevant.', 'Q2 2026', '2026-06-30', '2026-08-13T00:00:00Z', '2026-11-14', '{"revenue":17100000,"ebitda":9500000,"cfads":8100000,"debtService":5900000,"netDebt":261000000,"cash":14100000,"leasedCapacityPct":58,"constructionCompletionPct":74}'::jsonb);
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics) VALUES (7, 'apollo-edge-campus', 'Apollo Edge Campus', 'Apollo Edge Borrower LLC', 'Data Center', 'Project Finance', 'North America', 'USD', 255000000, 42000000, '2 - In Line', FALSE, 'Monitoring', 'P2-V3-D2', 'Recently activated onboarding example showing a clean new deal packet moving into live monitoring.', 'ramp_up', 'Apollo Edge was created via onboarding activation to demonstrate how a proposed packet becomes a live deal, mandate, and holding with seeded monitoring objects.', 'Q2 2026', '2026-06-30', '2026-09-12T00:00:00Z', '2026-11-21', '{"revenue":13200000,"ebitda":7600000,"cfads":6900000,"debtService":5100000,"netDebt":188000000,"cash":15200000,"leasedCapacityPct":67,"constructionCompletionPct":100}'::jsonb);

-- Credit ratings: external (Moody's, S&P, Fitch) and internal
UPDATE deals SET moodys_rating = 'Baa2', sp_rating = 'BBB',  fitch_rating = 'BBB',  internal_credit_score = 'BBB'  WHERE id = 1; -- Aurora
UPDATE deals SET moodys_rating = 'Baa1', sp_rating = 'BBB+', fitch_rating = NULL,   internal_credit_score = NULL   WHERE id = 2; -- Granite
UPDATE deals SET moodys_rating = NULL,    sp_rating = 'BBB',  fitch_rating = 'BBB-', internal_credit_score = 'BBB-' WHERE id = 3; -- Meridian
UPDATE deals SET moodys_rating = 'Ba1',   sp_rating = 'BB+',  fitch_rating = 'BB+',  internal_credit_score = NULL   WHERE id = 4; -- Ion Harbor
UPDATE deals SET moodys_rating = 'Baa1',  sp_rating = 'BBB+', fitch_rating = 'BBB+', internal_credit_score = NULL   WHERE id = 5; -- Summit
UPDATE deals SET moodys_rating = 'Baa2',  sp_rating = 'BBB',  fitch_rating = NULL,   internal_credit_score = 'BBB'  WHERE id = 6; -- Cobalt
UPDATE deals SET moodys_rating = NULL,    sp_rating = 'BBB',  fitch_rating = 'BBB',  internal_credit_score = NULL   WHERE id = 7; -- Apollo

INSERT INTO platform_clients (id, name, client_type, domicile) VALUES (1, 'Sesame Asset Management', 'asset_manager', 'United States');

INSERT INTO organisations (id, platform_client_id, name, organisation_type, domicile, reporting_currency) VALUES (1, 1, 'County Pension Fund', 'pension_fund', 'United States', 'USD');
INSERT INTO organisations (id, platform_client_id, name, organisation_type, domicile, reporting_currency) VALUES (2, 1, 'Northbridge Insurance Group', 'insurer', 'United States', 'USD');
INSERT INTO organisations (id, platform_client_id, name, organisation_type, domicile, reporting_currency) VALUES (3, 1, 'Sesame Principal Strategies', 'asset_manager_balance_sheet', 'United States', 'USD');
INSERT INTO organisations (id, platform_client_id, name, organisation_type, domicile, reporting_currency) VALUES (4, 1, 'Harborview Retirement System', 'pension_fund', 'United States', 'USD');

INSERT INTO portfolio_owners (id, organisation_id, name, owner_type) VALUES (1, 1, 'County Pension Trustees', 'beneficial_owner');
INSERT INTO portfolio_owners (id, organisation_id, name, owner_type) VALUES (2, 1, 'County Alternatives Committee', 'beneficial_owner');
INSERT INTO portfolio_owners (id, organisation_id, name, owner_type) VALUES (3, 2, 'Northbridge CIO Office', 'beneficial_owner');
INSERT INTO portfolio_owners (id, organisation_id, name, owner_type) VALUES (4, 3, 'Sesame Principal Capital', 'balance_sheet_owner');
INSERT INTO portfolio_owners (id, organisation_id, name, owner_type) VALUES (5, 4, 'Harborview Infrastructure Committee', 'beneficial_owner');

INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (1, 1, 'County Core Infrastructure Mandate', 'segregated_mandate', 'SOFR + 325 bps', 'active');
INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (2, 2, 'County Opportunistic Sleeve', 'co_investment', 'Absolute return 9%', 'active');
INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (3, 3, 'Northbridge General Account Infra', 'direct', 'NAIC yield target', 'active');
INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (4, 3, 'Northbridge Tactical Opportunities', 'co_investment', 'SOFR + 475 bps', 'active');
INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (5, 4, 'Sesame Warehouse Book', 'direct', 'Internal hurdle 11%', 'active');
INSERT INTO accounts (id, portfolio_owner_id, name, account_type, benchmark, status) VALUES (6, 5, 'Harborview Core Infrastructure Sleeve', 'segregated_mandate', 'SOFR + 360 bps', 'active');

INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (1, 1, 1, 38000000, '2025-05-14', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (2, 3, 1, 22000000, '2025-05-14', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (3, 5, 1, 25000000, '2025-05-14', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (4, 1, 2, 28000000, '2024-11-08', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (5, 4, 2, 12000000, '2024-11-08', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (6, 5, 2, 12000000, '2024-11-08', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (7, 3, 3, 30000000, '2024-09-19', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (8, 4, 3, 14000000, '2024-09-19', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (9, 5, 3, 20000000, '2024-09-19', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (10, 2, 4, 16000000, '2025-02-06', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (11, 3, 4, 11000000, '2025-02-06', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (12, 5, 4, 20000000, '2025-02-06', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (13, 1, 5, 18000000, '2024-07-01', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (14, 4, 5, 8000000, '2024-07-01', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (15, 5, 5, 10000000, '2024-07-01', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (16, 2, 6, 24000000, '2025-03-11', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (17, 3, 6, 19000000, '2025-03-11', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (18, 5, 6, 30000000, '2025-03-11', 'active');
INSERT INTO holdings (id, account_id, deal_id, current_amount, acquisition_date, status) VALUES (19, 6, 7, 42000000, '2026-09-12', 'active');

INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (1, 'PM - Infrastructure', 'Portfolio Management', 'active', TRUE);
INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (2, 'HAM - Aurora', 'Credit Monitoring', 'active', FALSE);
INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (3, 'Portfolio Reporting Review', 'Reporting', 'active', FALSE);
INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (4, 'Head of Portfolio Reporting', 'Reporting', 'active', FALSE);
INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (5, 'Distribution Ops', 'Operations', 'active', FALSE);
INSERT INTO app_users (id, display_name, team_name, status, is_default) VALUES (6, 'County Pension Fund Observer', 'Investor Relations', 'active', FALSE);

INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (1, 'portfolio_manager', 'Portfolio Manager', 'Full monitoring workspace access across the client hierarchy.');
INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (2, 'ham_operator', 'HAM Operator', 'Deal-level monitoring access with operational snapshot controls.');
INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (3, 'report_reviewer', 'Report Reviewer', 'Can review generated reports within entitled scope.');
INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (4, 'report_approver', 'Report Approver', 'Can approve reports within entitled scope.');
INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (5, 'report_distribution', 'Report Distribution', 'Can release approved reports to recipients.');
INSERT INTO app_roles (id, role_key, role_name, role_description) VALUES (6, 'investor_viewer', 'Investor Viewer', 'Read-only portfolio and deal visibility for entitled investor scope.');

INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'view_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'view_activity');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'generate_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'decide_requests');
INSERT INTO role_permissions (role_id, permission_key) VALUES (1, 'capture_snapshots');
INSERT INTO role_permissions (role_id, permission_key) VALUES (2, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (2, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (2, 'view_activity');
INSERT INTO role_permissions (role_id, permission_key) VALUES (2, 'capture_snapshots');
INSERT INTO role_permissions (role_id, permission_key) VALUES (3, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (3, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (3, 'view_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (3, 'view_activity');
INSERT INTO role_permissions (role_id, permission_key) VALUES (3, 'review_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (4, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (4, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (4, 'view_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (4, 'view_activity');
INSERT INTO role_permissions (role_id, permission_key) VALUES (4, 'approve_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (5, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (5, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (5, 'view_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (5, 'view_activity');
INSERT INTO role_permissions (role_id, permission_key) VALUES (5, 'release_reports');
INSERT INTO role_permissions (role_id, permission_key) VALUES (6, 'view_portfolio');
INSERT INTO role_permissions (role_id, permission_key) VALUES (6, 'view_deal');
INSERT INTO role_permissions (role_id, permission_key) VALUES (6, 'view_reports');

INSERT INTO app_user_roles (user_id, role_id) VALUES (1, 1);
INSERT INTO app_user_roles (user_id, role_id) VALUES (2, 2);
INSERT INTO app_user_roles (user_id, role_id) VALUES (3, 3);
INSERT INTO app_user_roles (user_id, role_id) VALUES (4, 4);
INSERT INTO app_user_roles (user_id, role_id) VALUES (5, 5);
INSERT INTO app_user_roles (user_id, role_id) VALUES (6, 6);

INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (1, 1, 'platform_client', 1, NULL, NULL, NULL, NULL, 'Full Sesame Asset Management monitoring scope.');
INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (2, 2, 'deal', NULL, NULL, NULL, NULL, 1, 'Aurora Prime Data Campus monitoring scope.');
INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (3, 3, 'platform_client', 1, NULL, NULL, NULL, NULL, 'Reporting review scope across the Sesame Asset Management portfolio.');
INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (4, 4, 'platform_client', 1, NULL, NULL, NULL, NULL, 'Report approval scope across the Sesame Asset Management portfolio.');
INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (5, 5, 'platform_client', 1, NULL, NULL, NULL, NULL, 'Distribution and report release scope across the Sesame Asset Management portfolio.');
INSERT INTO app_entitlements (id, user_id, entitlement_scope, platform_client_id, organisation_id, owner_id, account_id, deal_id, entitlement_summary) VALUES (6, 6, 'organisation', NULL, 1, NULL, NULL, NULL, 'County Pension Fund investor visibility.');

INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (1, 1, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.32, 1.25, 1.15, 5.6, 'performing', 'The deal remains above the lock-up threshold, but headroom is tight following delayed energisation of Hall A and higher-than-plan commissioning costs.', 'CFADS', 10800000, 'Debt Service', 8200000, 8, 'Senior DSCR for the quarter ended 30 June 2026 was 1.32x versus a covenant lock-up threshold of 1.25x.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (2, 2, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.54, 1.25, 1.15, 23.2, 'performing', 'Leasing momentum and stable power costs expanded covenant headroom quarter over quarter.', 'CFADS', 9700000, 'Debt Service', 6300000, 6, 'Senior DSCR improved to 1.54x following customer ramp-up in Hall B.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (3, 3, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.32, 1.2, 1.1, 10.0, 'performing', 'Energy costs offset occupancy growth, keeping the deal close to plan but narrowing headroom modestly.', 'CFADS', 7800000, 'Debt Service', 5900000, 4, 'Debt service cover for the quarter was 1.32x; management expects improvement following pricing resets.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (4, 4, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.24, 1.22, 1.15, 1.6, 'lock_up_risk', 'The deal is still above lock-up but only marginally; further lease-up slippage would push it into restricted distributions.', 'CFADS', 5100000, 'Debt Service', 4100000, 7, 'Senior DSCR measured 1.24x versus a lock-up threshold of 1.22x.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (5, 5, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.46, 1.2, 1.12, 17.8, 'performing', 'Strong contracted occupancy and efficient cooling costs support consistent coverage.', 'CFADS', 7600000, 'Debt Service', 5200000, 3, 'Senior DSCR for the period was 1.46x, with no exceptions noted.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (6, 6, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.37, 1.23, 1.13, 11.4, 'performing', 'The project remains within plan, with modest commissioning noise but no covenant stress.', 'CFADS', 8100000, 'Debt Service', 5900000, 5, 'Senior DSCR was 1.37x for Q2 2026, comfortably above the lock-up threshold.');
INSERT INTO covenants (id, deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES (7, 7, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.35, 1.22, 1.14, 10.7, 'performing', 'Apollo Edge entered live monitoring with healthy opening covenant headroom and no activation exceptions.', 'CFADS', 6900000, 'Debt Service', 5100000, 6, 'Senior DSCR for the initial monitored quarter measured 1.35x on the activation package.');

INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (1, 1, 'Q4 2025', 1.46, 1.48);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (2, 1, 'Q1 2026', 1.39, 1.43);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (3, 1, 'Q2 2026', 1.32, 1.38);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (4, 2, 'Q4 2025', 1.41, 1.38);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (5, 2, 'Q1 2026', 1.49, 1.44);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (6, 2, 'Q2 2026', 1.54, 1.49);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (7, 3, 'Q4 2025', 1.33, 1.36);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (8, 3, 'Q1 2026', 1.36, 1.37);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (9, 3, 'Q2 2026', 1.32, 1.34);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (10, 4, 'Q4 2025', 1.38, 1.44);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (11, 4, 'Q1 2026', 1.31, 1.4);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (12, 4, 'Q2 2026', 1.24, 1.37);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (13, 5, 'Q4 2025', 1.43, 1.4);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (14, 5, 'Q1 2026', 1.45, 1.41);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (15, 5, 'Q2 2026', 1.46, 1.43);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (16, 6, 'Q4 2025', 1.37, 1.39);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (17, 6, 'Q1 2026', 1.35, 1.38);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (18, 6, 'Q2 2026', 1.37, 1.39);
INSERT INTO covenant_history (id, covenant_id, period_label, dscr, expected_dscr) VALUES (19, 7, 'Q2 2026', 1.35, 1.33);

INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (1, 1, 'INFO-010', 'Quarterly compliance certificate', '2026-08-14', 'overdue', 8, 5, 'construction');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (2, 1, 'INFO-004', 'Quarterly management accounts', '2026-08-10', 'fulfilled', 0, 3, 'construction');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (3, 1, 'INFO-008', 'Capex budget vs actual report', '2026-08-14', 'approaching', 0, 0, 'construction');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (4, 2, 'INFO-010', 'Quarterly compliance certificate', '2026-08-06', 'fulfilled', 0, 5, 'ramp_up');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (5, 3, 'INFO-010', 'Quarterly compliance certificate', '2026-08-12', 'fulfilled', 0, 5, 'operational');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (6, 4, 'INFO-010', 'Quarterly compliance certificate', '2026-08-12', 'late_within_grace', 2, 5, 'ramp_up');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (7, 5, 'INFO-010', 'Quarterly compliance certificate', '2026-08-08', 'fulfilled', 0, 5, 'operational');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (8, 6, 'INFO-010', 'Quarterly compliance certificate', '2026-08-14', 'fulfilled', 0, 5, 'construction');
INSERT INTO obligations (id, deal_id, code, title, due_date, status, days_overdue, grace_days, phase) VALUES (9, 7, 'INFO-010', 'Quarterly compliance certificate', '2026-09-19', 'approaching', 0, 5, 'ramp_up');

INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (1, 1, 'compliance_certificate', 'Aurora Prime Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'requires_review', '2026-08-22T14:20:00Z', 8, 'Senior DSCR for the quarter ended 30 June 2026 was 1.32x. Construction drawdowns remain within approved facility limits.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (2, 1, 'management_accounts', 'Aurora Prime Q2 2026 Management Accounts.pdf', 'Q2 2026', 'approved', '2026-08-09T16:10:00Z', 5, 'Revenue of $24.1m reflected the first full quarter of contracted occupancy in Hall A.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (3, 2, 'compliance_certificate', 'Granite Switchyard Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'approved', '2026-08-05T09:00:00Z', 6, 'Senior DSCR improved to 1.54x following occupancy growth and stable utility pass-through.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (4, 3, 'compliance_certificate', 'Meridian Edge Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'approved', '2026-08-11T10:40:00Z', 4, 'Debt service cover for the quarter was 1.32x, broadly in line with base case expectations.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (5, 4, 'compliance_certificate', 'Ion Harbor Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'approved', '2026-08-14T08:45:00Z', 7, 'Senior DSCR measured 1.24x due to slower customer migration into the second hall.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (6, 5, 'compliance_certificate', 'Summit Loop Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'approved', '2026-08-07T07:30:00Z', 3, 'Senior DSCR for the period was 1.46x, with no reporting exceptions.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (7, 6, 'compliance_certificate', 'Cobalt Grid Q2 2026 Compliance Certificate.pdf', 'Q2 2026', 'approved', '2026-08-13T11:15:00Z', 5, 'Senior DSCR was 1.37x for Q2 2026, with construction drawdowns progressing as expected.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (8, 1, 'management_accounts', 'Aurora Prime Q1 2026 Management Accounts.pdf', 'Q1 2026', 'approved', '2026-05-12T15:05:00Z', 6, 'Quarter-one revenue of $22.6m reflected partial occupancy ramp and elevated commissioning costs.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (9, 1, 'audited_financials', 'Aurora Prime Q2 2026 Audited Financial Statements.pdf', 'Q2 2026', 'approved', '2026-09-02T10:20:00Z', 14, 'Audited Q2 statements recomputed Senior DSCR at 1.29x after reserve normalization and updated debt service accruals.');
INSERT INTO documents (id, deal_id, document_type, document_name, period_label, status, received_at, evidence_page, snippet) VALUES (10, 7, 'activation_package', 'Apollo Edge Activation Package.pdf', 'Q2 2026', 'approved', '2026-09-12T09:45:00Z', 6, 'Initial onboarding package established opening monitored metrics, covenant thresholds, and portfolio allocation for Apollo Edge.');

INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (1, 1, 'q1-2026', 'Q1 2026', '2026-03-31', 8, 'approved', 'The first quarter reflected continued construction spend and partial occupancy ramp. Revenue was slightly below base case while debt service remained inside expected range.', '{"revenue":22600000,"ebitda":11800000,"cfads":11200000,"debtService":8050000,"leasedCapacityPct":54,"constructionCompletionPct":61,"seniorDscr":1.39}'::jsonb, '{"revenue":23300000,"ebitda":12100000,"cfads":11500000,"debtService":8030000,"leasedCapacityPct":57,"constructionCompletionPct":63,"seniorDscr":1.43}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (2, 1, 'q2-2026', 'Q2 2026', '2026-06-30', 9, 'under_review', 'Aurora remains above lock-up, but construction delays and utility spend pulled cash generation and leasing below plan. This period is the core investor demo workflow.', '{"revenue":24100000,"ebitda":12400000,"cfads":10800000,"debtService":8200000,"leasedCapacityPct":61,"constructionCompletionPct":68,"seniorDscr":1.32}'::jsonb, '{"revenue":25800000,"ebitda":13200000,"cfads":11300000,"debtService":8180000,"leasedCapacityPct":66,"constructionCompletionPct":72,"seniorDscr":1.38}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (3, 2, 'q2-2026', 'Q2 2026', '2026-06-30', 3, 'approved', 'Granite outperformed its base case as occupancy ramp and utility pass-through remained favorable.', '{"revenue":18800000,"ebitda":11000000,"cfads":9700000,"debtService":6300000,"leasedCapacityPct":79,"constructionCompletionPct":100,"seniorDscr":1.54}'::jsonb, '{"revenue":18100000,"ebitda":10300000,"cfads":9390000,"debtService":6310000,"leasedCapacityPct":75,"constructionCompletionPct":100,"seniorDscr":1.49}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (4, 3, 'q2-2026', 'Q2 2026', '2026-06-30', 4, 'approved', 'Meridian remained broadly in line with plan, with energy costs offsetting modest leasing improvement.', '{"revenue":16200000,"ebitda":9100000,"cfads":7800000,"debtService":5900000,"leasedCapacityPct":73,"constructionCompletionPct":100,"seniorDscr":1.32}'::jsonb, '{"revenue":16500000,"ebitda":9400000,"cfads":7910000,"debtService":5900000,"leasedCapacityPct":74,"constructionCompletionPct":100,"seniorDscr":1.34}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (5, 4, 'q2-2026', 'Q2 2026', '2026-06-30', 5, 'approved', 'Ion Harbor missed lease-up assumptions, compressing DSCR and pulling the deal close to lock-up.', '{"revenue":12100000,"ebitda":5700000,"cfads":5100000,"debtService":4100000,"leasedCapacityPct":49,"constructionCompletionPct":100,"seniorDscr":1.24}'::jsonb, '{"revenue":13800000,"ebitda":6600000,"cfads":5620000,"debtService":4100000,"leasedCapacityPct":56,"constructionCompletionPct":100,"seniorDscr":1.37}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (6, 5, 'q2-2026', 'Q2 2026', '2026-06-30', 6, 'approved', 'Summit continued to outperform with strong occupancy and disciplined operating costs.', '{"revenue":14900000,"ebitda":8800000,"cfads":7600000,"debtService":5200000,"leasedCapacityPct":84,"constructionCompletionPct":100,"seniorDscr":1.46}'::jsonb, '{"revenue":14400000,"ebitda":8400000,"cfads":7440000,"debtService":5200000,"leasedCapacityPct":81,"constructionCompletionPct":100,"seniorDscr":1.43}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (7, 6, 'q2-2026', 'Q2 2026', '2026-06-30', 7, 'approved', 'Cobalt remained within plan, though construction completion and leasing sat slightly behind the sponsor case.', '{"revenue":17100000,"ebitda":9500000,"cfads":8100000,"debtService":5900000,"leasedCapacityPct":58,"constructionCompletionPct":74,"seniorDscr":1.37}'::jsonb, '{"revenue":17600000,"ebitda":9800000,"cfads":8200000,"debtService":5890000,"leasedCapacityPct":61,"constructionCompletionPct":76,"seniorDscr":1.39}'::jsonb);
INSERT INTO financial_periods (id, deal_id, period_key, period_label, period_end, source_document_id, status, summary, reported_metrics, expected_metrics) VALUES (8, 7, 'q2-2026', 'Q2 2026', '2026-06-30', 10, 'approved', 'Apollo Edge entered the monitored portfolio through onboarding activation with stable opening performance and no delivery exceptions.', '{"revenue":13200000,"ebitda":7600000,"cfads":6900000,"debtService":5100000,"leasedCapacityPct":67,"constructionCompletionPct":100,"seniorDscr":1.35}'::jsonb, '{"revenue":12900000,"ebitda":7400000,"cfads":6780000,"debtService":5100000,"leasedCapacityPct":64,"constructionCompletionPct":100,"seniorDscr":1.33}'::jsonb);

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (1, 1, 'revenue', 'Revenue', 22600000, 23300000, -700000, -3.00, 'down', 'notable', 'Occupancy ramp was slightly slower than base case in Q1 2026.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (2, 1, 'ebitda', 'EBITDA', 11800000, 12100000, -300000, -2.48, 'down', 'minor', 'Operating spend was modestly above plan during commissioning.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (3, 1, 'cfads', 'CFADS', 11200000, 11500000, -300000, -2.61, 'down', 'minor', 'Cash conversion remained slightly under base case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (4, 1, 'leasedCapacityPct', 'Leased Capacity %', 54, 57, -3, -5.26, 'down', 'notable', 'Leasing slipped a few points relative to plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (5, 1, 'constructionCompletionPct', 'Construction Completion %', 61, 63, -2, -3.17, 'down', 'minor', 'Construction remained slightly behind the targeted pace.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (6, 1, 'seniorDscr', 'Senior DSCR', 1.39, 1.43, -0.04, -2.80, 'down', 'minor', 'Coverage tracked below base case but stayed above the lock-up threshold.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (7, 2, 'revenue', 'Revenue', 24100000, 25800000, -1700000, -6.59, 'down', 'material', 'Revenue was below plan as Hall A energisation slipped and customer ramp started later than expected.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (8, 2, 'ebitda', 'EBITDA', 12400000, 13200000, -800000, -6.06, 'down', 'material', 'Commissioning and utility spend reduced EBITDA relative to the sponsor case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (9, 2, 'cfads', 'CFADS', 10800000, 11300000, -500000, -4.42, 'down', 'material', 'Cash flow available for debt service undershot plan and triggered Tier 2 review.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (10, 2, 'leasedCapacityPct', 'Leased Capacity %', 61, 66, -5, -7.58, 'down', 'material', 'Lease-up lagged the target occupancy curve.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (11, 2, 'constructionCompletionPct', 'Construction Completion %', 68, 72, -4, -5.56, 'down', 'notable', 'Construction remained behind the expected milestone plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (12, 2, 'seniorDscr', 'Senior DSCR', 1.32, 1.38, -0.06, -4.35, 'down', 'material', 'Coverage tightened toward the lock-up threshold and became the main credit focus for the quarter.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (13, 3, 'revenue', 'Revenue', 18800000, 18100000, 700000, 3.87, 'up', 'notable', 'Occupancy ramp exceeded the business plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (14, 3, 'ebitda', 'EBITDA', 11000000, 10300000, 700000, 6.80, 'up', 'material', 'Utility pass-through and operating discipline supported EBITDA outperformance.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (15, 3, 'cfads', 'CFADS', 9700000, 9390000, 310000, 3.30, 'up', 'notable', 'Cash generation improved with tenant ramp-up.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (16, 3, 'leasedCapacityPct', 'Leased Capacity %', 79, 75, 4, 5.33, 'up', 'notable', 'Leasing closed ahead of plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (17, 3, 'constructionCompletionPct', 'Construction Completion %', 100, 100, 0, 0.00, 'flat', 'minor', 'Construction completed as planned.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (18, 3, 'seniorDscr', 'Senior DSCR', 1.54, 1.49, 0.05, 3.36, 'up', 'notable', 'Coverage improved quarter over quarter.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (19, 4, 'revenue', 'Revenue', 16200000, 16500000, -300000, -1.82, 'down', 'minor', 'Energy cost pressure offset some top-line growth.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (20, 4, 'ebitda', 'EBITDA', 9100000, 9400000, -300000, -3.19, 'down', 'notable', 'EBITDA remained slightly below plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (21, 4, 'cfads', 'CFADS', 7800000, 7910000, -110000, -1.39, 'down', 'minor', 'CFADS stayed broadly in line with expectations.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (22, 4, 'leasedCapacityPct', 'Leased Capacity %', 73, 74, -1, -1.35, 'down', 'minor', 'Occupancy was just below the base case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (23, 4, 'constructionCompletionPct', 'Construction Completion %', 100, 100, 0, 0.00, 'flat', 'minor', 'Asset is fully complete.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (24, 4, 'seniorDscr', 'Senior DSCR', 1.32, 1.34, -0.02, -1.49, 'down', 'minor', 'Coverage remained close to plan.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (25, 5, 'revenue', 'Revenue', 12100000, 13800000, -1700000, -12.32, 'down', 'critical', 'Leasing and customer migration significantly lagged the ramp-up plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (26, 5, 'ebitda', 'EBITDA', 5700000, 6600000, -900000, -13.64, 'down', 'critical', 'Lower revenue translated into pronounced EBITDA underperformance.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (27, 5, 'cfads', 'CFADS', 5100000, 5620000, -520000, -9.25, 'down', 'material', 'Cash generation compressed toward covenant pressure levels.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (28, 5, 'leasedCapacityPct', 'Leased Capacity %', 49, 56, -7, -12.50, 'down', 'critical', 'Occupancy missed the expected ramp-up trajectory.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (29, 5, 'constructionCompletionPct', 'Construction Completion %', 100, 100, 0, 0.00, 'flat', 'minor', 'Construction completed; the issue is commercial ramp-up.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (30, 5, 'seniorDscr', 'Senior DSCR', 1.24, 1.37, -0.13, -9.49, 'down', 'critical', 'Coverage narrowed sharply and left the deal marginally above lock-up.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (31, 6, 'revenue', 'Revenue', 14900000, 14400000, 500000, 3.47, 'up', 'notable', 'Revenue was ahead of plan on stronger occupancy.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (32, 6, 'ebitda', 'EBITDA', 8800000, 8400000, 400000, 4.76, 'up', 'notable', 'Cost control supported EBITDA outperformance.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (33, 6, 'cfads', 'CFADS', 7600000, 7440000, 160000, 2.15, 'up', 'minor', 'Cash flow remained comfortably above plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (34, 6, 'leasedCapacityPct', 'Leased Capacity %', 84, 81, 3, 3.70, 'up', 'notable', 'Occupancy continued to exceed assumptions.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (35, 6, 'constructionCompletionPct', 'Construction Completion %', 100, 100, 0, 0.00, 'flat', 'minor', 'Asset remains fully complete.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (36, 6, 'seniorDscr', 'Senior DSCR', 1.46, 1.43, 0.03, 2.10, 'up', 'minor', 'Coverage remained above plan.');

INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (37, 7, 'revenue', 'Revenue', 17100000, 17600000, -500000, -2.84, 'down', 'minor', 'Revenue tracked slightly below the sponsor case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (38, 7, 'ebitda', 'EBITDA', 9500000, 9800000, -300000, -3.06, 'down', 'notable', 'EBITDA was modestly below plan during construction ramp.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (39, 7, 'cfads', 'CFADS', 8100000, 8200000, -100000, -1.22, 'down', 'minor', 'Cash generation remained near plan.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (40, 7, 'leasedCapacityPct', 'Leased Capacity %', 58, 61, -3, -4.92, 'down', 'notable', 'Leasing ran a few points below expectations.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (41, 7, 'constructionCompletionPct', 'Construction Completion %', 74, 76, -2, -2.63, 'down', 'minor', 'Construction progress was slightly behind target.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (42, 7, 'seniorDscr', 'Senior DSCR', 1.37, 1.39, -0.02, -1.44, 'down', 'minor', 'Coverage remained comfortably above the lock-up threshold.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (43, 8, 'revenue', 'Revenue', 13200000, 12900000, 300000, 2.33, 'up', 'minor', 'Activation quarter revenue landed modestly ahead of the onboarding case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (44, 8, 'ebitda', 'EBITDA', 7600000, 7400000, 200000, 2.70, 'up', 'minor', 'Initial operating margin was slightly above the sponsor case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (45, 8, 'cfads', 'CFADS', 6900000, 6780000, 120000, 1.77, 'up', 'minor', 'Cash generation slightly exceeded the activation underwriting case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (46, 8, 'leasedCapacityPct', 'Leased Capacity %', 67, 64, 3, 4.69, 'up', 'notable', 'Apollo entered the portfolio with leasing slightly ahead of the onboarding base case.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (47, 8, 'constructionCompletionPct', 'Construction Completion %', 100, 100, 0, 0.00, 'flat', 'minor', 'The project was fully complete at activation.');
INSERT INTO financial_variances (id, financial_period_id, metric_key, metric_label, reported_value, expected_value, variance_value, variance_pct, direction, materiality, commentary) VALUES (48, 8, 'seniorDscr', 'Senior DSCR', 1.35, 1.33, 0.02, 1.50, 'up', 'minor', 'Opening DSCR came in slightly ahead of the monitored activation case.');

-- 3-tier forecast comparison: management_case (priority 1, drives grade), lender_case (priority 2), combined_downside (priority 3, floor/alarm)
-- Deal 1: Aurora
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (1, 1, 'aurora-mgmt', 'Aurora Management Case', 'management_case', 1, TRUE, 'PM - Infrastructure', 'Primary monitoring case for Aurora — drives grade and variance signals.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (2, 1, 'aurora-lender', 'Aurora Lender Case', 'lender_case', 2, FALSE, 'Borrower FP&A', 'Secondary comparator provided by the borrower/sponsor for lender reference.', '2026-08-20T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (3, 1, 'aurora-downside', 'Aurora Combined Downside', 'combined_downside', 3, FALSE, 'PM - Infrastructure', 'Floor case — breach signals alarm for delayed energisation and slower lease-up.', '2026-08-20T09:00:00Z');
-- Deal 2: Granite
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (4, 2, 'granite-mgmt', 'Granite Management Case', 'management_case', 1, TRUE, 'HAM - Granite', 'Primary monitoring case for Granite.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (5, 2, 'granite-lender', 'Granite Lender Case', 'lender_case', 2, FALSE, 'HAM - Granite', 'Lender comparator for Granite.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (6, 2, 'granite-downside', 'Granite Combined Downside', 'combined_downside', 3, FALSE, 'HAM - Granite', 'Floor case for Granite.', '2026-07-01T09:00:00Z');
-- Deal 3: Meridian
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (7, 3, 'meridian-mgmt', 'Meridian Management Case', 'management_case', 1, TRUE, 'HAM - Meridian', 'Primary monitoring case for Meridian.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (8, 3, 'meridian-lender', 'Meridian Lender Case', 'lender_case', 2, FALSE, 'HAM - Meridian', 'Lender comparator for Meridian.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (9, 3, 'meridian-downside', 'Meridian Combined Downside', 'combined_downside', 3, FALSE, 'HAM - Meridian', 'Floor case for Meridian.', '2026-07-01T09:00:00Z');
-- Deal 4: Ion Harbor
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (10, 4, 'ion-mgmt', 'Ion Harbor Management Case', 'management_case', 1, TRUE, 'PM - Infrastructure', 'Primary monitoring case for Ion Harbor.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (11, 4, 'ion-lender', 'Ion Harbor Lender Case', 'lender_case', 2, FALSE, 'PM - Infrastructure', 'Lender comparator for Ion Harbor.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (12, 4, 'ion-downside', 'Ion Harbor Combined Downside', 'combined_downside', 3, FALSE, 'PM - Infrastructure', 'Floor case for Ion Harbor lease-up stress.', '2026-07-01T09:00:00Z');
-- Deal 5: Summit
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (13, 5, 'summit-mgmt', 'Summit Management Case', 'management_case', 1, TRUE, 'HAM - Summit', 'Primary monitoring case for Summit.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (14, 5, 'summit-lender', 'Summit Lender Case', 'lender_case', 2, FALSE, 'HAM - Summit', 'Lender comparator for Summit.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (15, 5, 'summit-downside', 'Summit Combined Downside', 'combined_downside', 3, FALSE, 'HAM - Summit', 'Floor case for Summit.', '2026-07-01T09:00:00Z');
-- Deal 6: Cobalt
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (16, 6, 'cobalt-mgmt', 'Cobalt Management Case', 'management_case', 1, TRUE, 'HAM - Cobalt', 'Primary monitoring case for Cobalt.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (17, 6, 'cobalt-lender', 'Cobalt Lender Case', 'lender_case', 2, FALSE, 'HAM - Cobalt', 'Lender comparator for Cobalt.', '2026-07-01T09:00:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (18, 6, 'cobalt-downside', 'Cobalt Combined Downside', 'combined_downside', 3, FALSE, 'HAM - Cobalt', 'Floor case for Cobalt.', '2026-07-01T09:00:00Z');
-- Deal 7: Apollo Edge
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (19, 7, 'apollo-mgmt', 'Apollo Management Case', 'management_case', 1, TRUE, 'HAM - Apollo', 'Primary monitoring case for Apollo Edge.', '2026-09-12T09:45:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (20, 7, 'apollo-lender', 'Apollo Lender Case', 'lender_case', 2, FALSE, 'HAM - Apollo', 'Lender comparator for Apollo Edge.', '2026-09-12T09:45:00Z');
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES (21, 7, 'apollo-downside', 'Apollo Combined Downside', 'combined_downside', 3, FALSE, 'HAM - Apollo', 'Floor case for Apollo Edge.', '2026-09-12T09:45:00Z');

-- Aurora versions (case IDs 1=mgmt, 2=lender, 3=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (1, 1, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Original management case baseline loaded for the Aurora Q2 package.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (2, 1, 2, 'Mgmt v2', 'draft', 'pm_reforecast', 'Revised management case prepared after the September forecast refresh.', '2026-09-18', NULL, FALSE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (3, 2, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Borrower-supplied lender case provided after the Q2 close.', '2026-08-20', '2026-08-20T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (4, 3, 1, 'Downside v1', 'active', 'pm_downside', 'Combined downside case reflecting delayed ramp and higher operating drag.', '2026-08-20', '2026-08-20T09:10:00Z', TRUE);
-- Granite versions (case IDs 4=mgmt, 5=lender, 6=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (5, 4, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Current Granite management case.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (6, 5, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Granite lender comparator.', '2026-07-01', '2026-07-01T09:03:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (7, 6, 1, 'Downside v1', 'active', 'pm_downside', 'Granite combined downside.', '2026-07-01', '2026-07-01T09:05:00Z', TRUE);
-- Meridian versions (case IDs 7=mgmt, 8=lender, 9=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (8, 7, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Current Meridian management case.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (9, 8, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Meridian lender comparator.', '2026-07-01', '2026-07-01T09:03:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (10, 9, 1, 'Downside v1', 'active', 'pm_downside', 'Meridian combined downside.', '2026-07-01', '2026-07-01T09:05:00Z', TRUE);
-- Ion Harbor versions (case IDs 10=mgmt, 11=lender, 12=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (11, 10, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Current Ion Harbor management case.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (12, 11, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Ion Harbor lender comparator.', '2026-07-01', '2026-07-01T09:03:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (13, 12, 1, 'Downside v1', 'active', 'pm_downside', 'Ion Harbor combined downside.', '2026-07-01', '2026-07-01T09:05:00Z', TRUE);
-- Summit versions (case IDs 13=mgmt, 14=lender, 15=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (14, 13, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Current Summit management case.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (15, 14, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Summit lender comparator.', '2026-07-01', '2026-07-01T09:03:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (16, 15, 1, 'Downside v1', 'active', 'pm_downside', 'Summit combined downside.', '2026-07-01', '2026-07-01T09:05:00Z', TRUE);
-- Cobalt versions (case IDs 16=mgmt, 17=lender, 18=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (17, 16, 1, 'Mgmt v1', 'active', 'sponsor_model', 'Current Cobalt management case.', '2026-07-01', '2026-07-01T09:00:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (18, 17, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Cobalt lender comparator.', '2026-07-01', '2026-07-01T09:03:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (19, 18, 1, 'Downside v1', 'active', 'pm_downside', 'Cobalt combined downside.', '2026-07-01', '2026-07-01T09:05:00Z', TRUE);
-- Apollo versions (case IDs 19=mgmt, 20=lender, 21=downside)
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (20, 19, 1, 'Mgmt v1', 'active', 'activation_model', 'Current Apollo management case.', '2026-09-12', '2026-09-12T09:50:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (21, 20, 1, 'Lender v1', 'active', 'borrower_reforecast', 'Apollo lender comparator.', '2026-09-12', '2026-09-12T09:52:00Z', TRUE);
INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES (22, 21, 1, 'Downside v1', 'active', 'pm_downside', 'Apollo combined downside.', '2026-09-12', '2026-09-12T09:55:00Z', TRUE);

-- Aurora: mgmt v1 (ver 1), mgmt v2 draft (ver 2), lender v1 (ver 3), downside v1 (ver 4)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (1, 1, 2, 'q2-2026', 'Q2 2026', '{"revenue":25800000,"ebitda":13200000,"cfads":11300000,"debtService":8180000,"leasedCapacityPct":66,"constructionCompletionPct":72,"seniorDscr":1.38}'::jsonb, 'Management case baseline for Aurora Q2.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (2, 2, 2, 'q2-2026', 'Q2 2026', '{"revenue":25200000,"ebitda":12850000,"cfads":11050000,"debtService":8180000,"leasedCapacityPct":63,"constructionCompletionPct":70,"seniorDscr":1.35}'::jsonb, 'Revised management case after September refresh.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (3, 3, 2, 'q2-2026', 'Q2 2026', '{"revenue":24900000,"ebitda":12700000,"cfads":10980000,"debtService":8180000,"leasedCapacityPct":62,"constructionCompletionPct":69,"seniorDscr":1.34}'::jsonb, 'Borrower-supplied lender case for Aurora.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (4, 4, 2, 'q2-2026', 'Q2 2026', '{"revenue":23600000,"ebitda":11900000,"cfads":10400000,"debtService":8210000,"leasedCapacityPct":59,"constructionCompletionPct":67,"seniorDscr":1.27}'::jsonb, 'Combined downside for Aurora — delayed energisation and slower leasing.');
-- Granite: mgmt v1 (ver 5), lender v1 (ver 6), downside v1 (ver 7)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (5, 5, 3, 'q2-2026', 'Q2 2026', '{"revenue":18100000,"ebitda":10300000,"cfads":9390000,"debtService":6310000,"leasedCapacityPct":75,"constructionCompletionPct":100,"seniorDscr":1.49}'::jsonb, 'Management case for Granite.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (6, 6, 3, 'q2-2026', 'Q2 2026', '{"revenue":17700000,"ebitda":10050000,"cfads":9200000,"debtService":6310000,"leasedCapacityPct":73,"constructionCompletionPct":100,"seniorDscr":1.46}'::jsonb, 'Lender case for Granite.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (7, 7, 3, 'q2-2026', 'Q2 2026', '{"revenue":17300000,"ebitda":9800000,"cfads":9050000,"debtService":6310000,"leasedCapacityPct":71,"constructionCompletionPct":100,"seniorDscr":1.43}'::jsonb, 'Combined downside for Granite.');
-- Meridian: mgmt v1 (ver 8), lender v1 (ver 9), downside v1 (ver 10)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (8, 8, 4, 'q2-2026', 'Q2 2026', '{"revenue":16500000,"ebitda":9400000,"cfads":7910000,"debtService":5900000,"leasedCapacityPct":74,"constructionCompletionPct":100,"seniorDscr":1.34}'::jsonb, 'Management case for Meridian.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (9, 9, 4, 'q2-2026', 'Q2 2026', '{"revenue":16100000,"ebitda":9100000,"cfads":7700000,"debtService":5910000,"leasedCapacityPct":72,"constructionCompletionPct":100,"seniorDscr":1.30}'::jsonb, 'Lender case for Meridian.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (10, 10, 4, 'q2-2026', 'Q2 2026', '{"revenue":15700000,"ebitda":8800000,"cfads":7480000,"debtService":5920000,"leasedCapacityPct":70,"constructionCompletionPct":100,"seniorDscr":1.26}'::jsonb, 'Combined downside for Meridian.');
-- Ion Harbor: mgmt v1 (ver 11), lender v1 (ver 12), downside v1 (ver 13)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (11, 11, 5, 'q2-2026', 'Q2 2026', '{"revenue":13800000,"ebitda":6600000,"cfads":5620000,"debtService":4100000,"leasedCapacityPct":56,"constructionCompletionPct":100,"seniorDscr":1.37}'::jsonb, 'Management case for Ion Harbor.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (12, 12, 5, 'q2-2026', 'Q2 2026', '{"revenue":13200000,"ebitda":6250000,"cfads":5400000,"debtService":4100000,"leasedCapacityPct":53,"constructionCompletionPct":100,"seniorDscr":1.32}'::jsonb, 'Lender case for Ion Harbor.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (13, 13, 5, 'q2-2026', 'Q2 2026', '{"revenue":12600000,"ebitda":5900000,"cfads":5200000,"debtService":4100000,"leasedCapacityPct":50,"constructionCompletionPct":100,"seniorDscr":1.27}'::jsonb, 'Combined downside for Ion Harbor.');
-- Summit: mgmt v1 (ver 14), lender v1 (ver 15), downside v1 (ver 16)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (14, 14, 6, 'q2-2026', 'Q2 2026', '{"revenue":14400000,"ebitda":8400000,"cfads":7440000,"debtService":5200000,"leasedCapacityPct":81,"constructionCompletionPct":100,"seniorDscr":1.43}'::jsonb, 'Management case for Summit.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (15, 15, 6, 'q2-2026', 'Q2 2026', '{"revenue":14050000,"ebitda":8150000,"cfads":7250000,"debtService":5200000,"leasedCapacityPct":79,"constructionCompletionPct":100,"seniorDscr":1.39}'::jsonb, 'Lender case for Summit.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (16, 16, 6, 'q2-2026', 'Q2 2026', '{"revenue":13700000,"ebitda":7900000,"cfads":7050000,"debtService":5220000,"leasedCapacityPct":78,"constructionCompletionPct":100,"seniorDscr":1.35}'::jsonb, 'Combined downside for Summit.');
-- Cobalt: mgmt v1 (ver 17), lender v1 (ver 18), downside v1 (ver 19)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (17, 17, 7, 'q2-2026', 'Q2 2026', '{"revenue":17600000,"ebitda":9800000,"cfads":8200000,"debtService":5890000,"leasedCapacityPct":61,"constructionCompletionPct":76,"seniorDscr":1.39}'::jsonb, 'Management case for Cobalt.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (18, 18, 7, 'q2-2026', 'Q2 2026', '{"revenue":17200000,"ebitda":9500000,"cfads":8000000,"debtService":5895000,"leasedCapacityPct":59,"constructionCompletionPct":74,"seniorDscr":1.36}'::jsonb, 'Lender case for Cobalt.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (19, 19, 7, 'q2-2026', 'Q2 2026', '{"revenue":16800000,"ebitda":9200000,"cfads":7800000,"debtService":5900000,"leasedCapacityPct":56,"constructionCompletionPct":72,"seniorDscr":1.32}'::jsonb, 'Combined downside for Cobalt.');
-- Apollo: mgmt v1 (ver 20), lender v1 (ver 21), downside v1 (ver 22)
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (20, 20, 8, 'q2-2026', 'Q2 2026', '{"revenue":12900000,"ebitda":7400000,"cfads":6780000,"debtService":5100000,"leasedCapacityPct":64,"constructionCompletionPct":100,"seniorDscr":1.33}'::jsonb, 'Management case for Apollo.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (21, 21, 8, 'q2-2026', 'Q2 2026', '{"revenue":12600000,"ebitda":7200000,"cfads":6600000,"debtService":5110000,"leasedCapacityPct":62,"constructionCompletionPct":100,"seniorDscr":1.29}'::jsonb, 'Lender case for Apollo.');
INSERT INTO forecast_case_periods (id, forecast_case_version_id, financial_period_id, period_key, period_label, scenario_metrics, scenario_summary) VALUES (22, 22, 8, 'q2-2026', 'Q2 2026', '{"revenue":12300000,"ebitda":7000000,"cfads":6450000,"debtService":5120000,"leasedCapacityPct":60,"constructionCompletionPct":100,"seniorDscr":1.26}'::jsonb, 'Combined downside for Apollo.');

INSERT INTO forecast_refresh_impacts (id, deal_id, forecast_case_id, forecast_case_version_id, impact_type, target_entity_type, target_entity_id, impact_summary, before_state, after_state, refreshed_at) VALUES (1, 1, 1, 1, 'monitoring_case_activation', 'financial_period', 2, 'Aurora Q2 expected metrics were seeded from the active management case.', '{"expectedMetrics":{}}'::jsonb, '{"expectedMetrics":{"revenue":25800000,"ebitda":13200000,"cfads":11300000,"debtService":8180000,"leasedCapacityPct":66,"constructionCompletionPct":72,"seniorDscr":1.38}}'::jsonb, '2026-07-01T09:00:00Z');
INSERT INTO forecast_refresh_impacts (id, deal_id, forecast_case_id, forecast_case_version_id, impact_type, target_entity_type, target_entity_id, impact_summary, before_state, after_state, refreshed_at) VALUES (2, 1, 1, 1, 'assessment_refresh', 'deal_assessment', 1, 'Aurora assessment narrative and scores were aligned to the active management case.', '{"summary":"Aurora remains investment-grade in the demo, but the combination of negative variances, repeated DSCR slippage, and a late compliance package keeps the deal in enhanced monitoring."}'::jsonb, '{"summary":"Aurora remains investment-grade versus the active Aurora Management Case, but the combination of negative variances, repeated DSCR slippage, and a late compliance package keeps the deal in enhanced monitoring."}'::jsonb, '2026-07-01T09:01:00Z');
INSERT INTO forecast_refresh_impacts (id, deal_id, forecast_case_id, forecast_case_version_id, impact_type, target_entity_type, target_entity_id, impact_summary, before_state, after_state, refreshed_at) VALUES (3, 4, 10, 11, 'monitoring_case_activation', 'financial_period', 5, 'Ion Harbor Q2 expected metrics were seeded from the active management case.', '{"expectedMetrics":{}}'::jsonb, '{"expectedMetrics":{"revenue":13800000,"ebitda":6600000,"cfads":5620000,"debtService":4100000,"leasedCapacityPct":56,"constructionCompletionPct":100,"seniorDscr":1.37}}'::jsonb, '2026-07-01T09:00:00Z');

INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (1, 1, 2, '2026-08-22', '2 - In Line', 63.00, 58, 42, 38, 72, 'enhanced_monitoring', 'keep_on_watchlist', 'ham', 'Aurora remains investment-grade in the demo, but the combination of negative variances, repeated DSCR slippage, and a late compliance package keeps the deal in enhanced monitoring.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (2, 2, 3, '2026-08-06', '1 - Outperforming', 88.00, 92, 84, 76, 95, 'standard', 'no_change', 'none', 'Granite continues to outperform plan with strong covenant headroom, positive variance trends, and clean compliance execution.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (3, 3, 4, '2026-08-11', '2 - In Line', 74.00, 70, 68, 65, 90, 'standard', 'no_change', 'none', 'Meridian remains broadly in line with expectations. Small negative trends are visible, but they are not persistent enough to justify escalation.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (4, 4, 5, '2026-08-15', '3 - Underperforming', 46.00, 34, 28, 24, 78, 'watchlist', 'escalate_to_pm', 'pm', 'Ion Harbor is the clearest stressed comparator in the portfolio. Weak lease-up, a near-lock-up covenant position, and repeated deterioration justify PM attention.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (5, 5, 6, '2026-08-07', '1 - Outperforming', 89.00, 90, 86, 82, 96, 'standard', 'no_change', 'none', 'Summit is one of the healthiest monitoring names in the demo, with positive operating performance and no workflow concerns.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (6, 6, 7, '2026-08-13', '2 - In Line', 69.00, 72, 64, 58, 82, 'standard', 'monitor', 'ham', 'Cobalt remains within plan, but construction and leasing are soft enough to warrant a trend watch rather than a formal watchlist action.');
INSERT INTO deal_assessments (id, deal_id, financial_period_id, assessment_date, grade, overall_score, covenant_score, variance_score, trend_score, compliance_score, watchlist_status, watchlist_recommendation, escalation_level, summary) VALUES (7, 7, 8, '2026-09-12', '2 - In Line', 80.00, 78, 74, 70, 96, 'standard', 'no_change', 'none', 'Apollo Edge entered live monitoring cleanly through onboarding activation, with a healthy opening covenant position, modest positive variance, and no compliance exceptions.');

INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (1, 1, 2, '2026-08-22T15:10:00Z', 'review_required', 'near_lock_up', 1, 1500000, 4200000, 'A temporary capped distribution can proceed only under the approved waiver conditions and final PM review.', 'The conditional waiver softens the earlier restriction, but Aurora still requires final review while the audited ratio reconciliation and compliance package close out.', '[{"code":"FIN-003","label":"Senior DSCR buffer","status":"near_lock_up","detail":"Current DSCR of 1.32x leaves only 5.6% headroom above the 1.25x lock-up threshold."}]'::jsonb, '[{"label":"Complete final PM review before releasing cash","owner":"PM - Infrastructure"},{"label":"Close the outstanding ratio reconciliation and compliance workflow","owner":"HAM - Aurora"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (2, 2, 3, '2026-08-06T11:10:00Z', 'allowed', 'clear', 0, 3800000, NULL, 'Distributions are permitted with no active blockers.', 'Granite has comfortable covenant headroom, clean compliance execution, and no reserve or default constraints in the current period.', '[]'::jsonb, '[{"label":"Maintain standard quarterly certification cadence","owner":"HAM - Granite"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (3, 3, 4, '2026-08-11T12:00:00Z', 'allowed', 'clear', 0, 1900000, NULL, 'Distributions are allowed, though sizing should remain aligned to the base-case reserve plan.', 'Meridian is in line with plan and retains adequate covenant and compliance headroom for ordinary upstreaming.', '[]'::jsonb, '[{"label":"Keep reserve account testing aligned to quarterly close","owner":"HAM - Meridian"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (4, 4, 5, '2026-08-15T10:45:00Z', 'blocked', 'lock_up', 3, NULL, 6100000, 'Distributions are blocked and cash remains trapped pending performance recovery.', 'Ion Harbor is only marginally above lock-up, missed its lease-up case, and delivered reporting inside grace; the combination forces a cash trap until coverage recovers.', '[{"code":"FIN-003","label":"Senior DSCR lock-up test","status":"failed","detail":"Current DSCR of 1.24x sits effectively on the 1.22x lock-up threshold and does not support upstreaming."},{"code":"LEASE-UP","label":"Minimum occupancy trajectory","status":"failed","detail":"Leased capacity remains materially below the sponsor case and prevents discretionary distributions."},{"code":"CMP-GRACE","label":"Timely reporting condition","status":"monitoring","detail":"The latest package landed inside grace, which keeps the lock-up in place until the next clean period is observed."}]'::jsonb, '[{"label":"Escalate to PM and maintain cash trap","owner":"PM - Infrastructure"},{"label":"Obtain revised lease-up plan from sponsor","owner":"HAM - Ion Harbor"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (5, 5, 6, '2026-08-07T07:45:00Z', 'allowed', 'clear', 0, 2600000, NULL, 'Distributions are permitted and supported by strong operating outperformance.', 'Summit has strong contracted occupancy, healthy DSCR headroom, and no workflow exceptions in the current quarter.', '[]'::jsonb, '[{"label":"Continue ordinary distribution testing at quarter-end","owner":"HAM - Summit"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (6, 6, 7, '2026-08-13T11:40:00Z', 'restricted', 'construction_restricted', 1, NULL, 3300000, 'Distributions remain restricted while the project is still in construction and completion tests are outstanding.', 'Cobalt is performing within plan, but the legal documents still require retained cash until construction completion and ramp tests are formally satisfied.', '[{"code":"CONSTRUCTION","label":"Substantial completion release test","status":"pending","detail":"Construction completion remains below the legal release threshold for unrestricted upstreaming."}]'::jsonb, '[{"label":"Re-test release conditions after the next construction certificate","owner":"HAM - Cobalt"}]'::jsonb);
INSERT INTO distribution_assessments (id, deal_id, financial_period_id, assessed_at, distribution_status, lockup_state, blocker_count, distribution_capacity, cash_trap_amount, summary, rationale, failed_conditions, required_actions) VALUES (7, 7, 8, '2026-09-12T10:00:00Z', 'allowed', 'clear', 0, 2100000, NULL, 'Apollo entered live monitoring with no active blockers to ordinary distributions.', 'The onboarding activation package showed comfortable covenant headroom, complete reporting, and no legal constraints requiring a cash trap.', '[]'::jsonb, '[{"label":"Maintain standard quarterly distribution testing cadence","owner":"HAM - Apollo"}]'::jsonb);

INSERT INTO ratio_reconciliations (id, deal_id, financial_period_id, source_document_id, review_item_id, metric_key, metric_label, borrower_reported_value, platform_computed_value, variance_value, variance_pct, tolerance_pct, reconciliation_status, explanation) VALUES (1, 1, 2, 9, 2, 'seniorDscr', 'Senior DSCR', 1.3200, 1.2900, -0.0300, -2.27, 1.00, 'pending_review', 'The audited package normalizes reserve treatment and debt service accruals, reducing DSCR below the borrower-certified value.');
INSERT INTO ratio_reconciliations (id, deal_id, financial_period_id, source_document_id, review_item_id, metric_key, metric_label, borrower_reported_value, platform_computed_value, variance_value, variance_pct, tolerance_pct, reconciliation_status, explanation) VALUES (2, 1, 2, 9, NULL, 'cfads', 'CFADS', 10800000.0000, 10650000.0000, -150000.0000, -1.39, 1.00, 'exception', 'Audited reserve deductions reduce CFADS below the management certificate and breach the configured tolerance.');
INSERT INTO ratio_reconciliations (id, deal_id, financial_period_id, source_document_id, review_item_id, metric_key, metric_label, borrower_reported_value, platform_computed_value, variance_value, variance_pct, tolerance_pct, reconciliation_status, explanation) VALUES (3, 2, 3, 3, NULL, 'seniorDscr', 'Senior DSCR', 1.5400, 1.5400, 0.0000, 0.00, 1.00, 'matched', 'Borrower-reported DSCR matches the platform computation.');
INSERT INTO ratio_reconciliations (id, deal_id, financial_period_id, source_document_id, review_item_id, metric_key, metric_label, borrower_reported_value, platform_computed_value, variance_value, variance_pct, tolerance_pct, reconciliation_status, explanation) VALUES (4, 4, 5, 5, NULL, 'seniorDscr', 'Senior DSCR', 1.2400, 1.2300, -0.0100, -0.81, 1.00, 'within_tolerance', 'Ion Harbor differs slightly because of reserve timing, but the result remains within policy tolerance.');

INSERT INTO document_supersessions (id, deal_id, period_label, superseded_document_id, superseding_document_id, supersession_reason, impact_summary, affected_objects, downstream_recomputed, effective_at) VALUES (1, 1, 'Q2 2026', 2, 9, 'audited_replacement', 'Audited financials supersede prior management accounts and trigger recomputation of period metrics, distribution posture, and assessment outputs.', '["financial_period:q2-2026","ratio_reconciliation:1","distribution_assessment:1","deal_assessment:1"]'::jsonb, TRUE, '2026-09-02T10:20:00Z');

INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (1, 1, 2, 'seniorDscr', 'Senior DSCR', 'consecutive_deterioration', 'down', 3, 'concern', -9.59, 'active', 'Senior DSCR has declined for three consecutive periods, tightening headroom and pushing the deal into a concern state.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (2, 1, 2, 'leasedCapacityPct', 'Leased Capacity %', 'consecutive_deterioration', 'down', 2, 'watch', -8.96, 'active', 'Leasing has missed the expected ramp for two periods and remains below the sponsor curve.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (3, 2, 3, 'seniorDscr', 'Senior DSCR', 'recovery', 'up', 3, 'stable', 9.22, 'active', 'Coverage has improved across three periods and now comfortably exceeds the plan case.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (4, 4, 5, 'revenue', 'Revenue', 'consecutive_deterioration', 'down', 3, 'alert', -12.32, 'active', 'Revenue underperformance has compounded across the last three reporting periods and now drives the watchlist posture.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (5, 4, 5, 'seniorDscr', 'Senior DSCR', 'consecutive_deterioration', 'down', 3, 'alert', -10.14, 'active', 'Coverage has declined for three straight periods and is now only marginally above lock-up.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (6, 6, 7, 'constructionCompletionPct', 'Construction Completion %', 'consecutive_deterioration', 'down', 2, 'watch', -5.13, 'active', 'Construction progress has slipped relative to plan for two periods and should remain on the HAM watch list.');
INSERT INTO trend_records (id, deal_id, financial_period_id, metric_key, metric_label, trend_type, direction, periods_observed, severity, total_change_pct, status, summary) VALUES (7, 7, 8, 'leasedCapacityPct', 'Leased Capacity %', 'activation_outperformance', 'up', 1, 'stable', 4.69, 'active', 'Apollo activated with leased capacity modestly above the base case.');

INSERT INTO watchlist_events (id, deal_id, assessment_id, status_from, status_to, recommendation, escalation_level, owner_name, rationale, decided_at, next_review_date) VALUES (1, 1, 1, 'standard', 'enhanced_monitoring', 'keep_on_watchlist', 'ham', 'HAM - Aurora', 'Late compliance delivery and a three-period DSCR decline justify enhanced monitoring rather than a full downgrade.', '2026-08-22T15:00:00Z', '2026-09-15');
INSERT INTO watchlist_events (id, deal_id, assessment_id, status_from, status_to, recommendation, escalation_level, owner_name, rationale, decided_at, next_review_date) VALUES (2, 4, 4, 'enhanced_monitoring', 'watchlist', 'escalate_to_pm', 'pm', 'PM - Infrastructure', 'Persistent lease-up underperformance and near-lock-up headroom require PM escalation and formal watchlist treatment.', '2026-08-15T10:30:00Z', '2026-09-05');
INSERT INTO watchlist_events (id, deal_id, assessment_id, status_from, status_to, recommendation, escalation_level, owner_name, rationale, decided_at, next_review_date) VALUES (3, 2, 2, 'enhanced_monitoring', 'standard', 'deescalate', 'none', 'HAM - Granite', 'Repeated positive trend and clean compliance performance support de-escalation back to standard monitoring.', '2026-08-06T11:00:00Z', '2026-11-10');
INSERT INTO watchlist_events (id, deal_id, assessment_id, status_from, status_to, recommendation, escalation_level, owner_name, rationale, decided_at, next_review_date) VALUES (4, 7, 7, 'standard', 'standard', 'no_change', 'none', 'HAM - Apollo', 'Activation review concluded that Apollo can enter standard monitoring with no escalation.', '2026-09-12T10:10:00Z', '2026-12-15');

INSERT INTO grade_overrides (id, deal_id, assessment_id, previous_grade, override_grade, override_status, rationale, owner_name, expires_on, decided_at, impact_summary) VALUES (1, 1, 1, '2 - In Line', '3 - Underperforming', 'active', 'Pending audited ratio reconciliation and the late compliance package justify a temporary downgrade until the next committee review.', 'PM - Infrastructure', '2026-09-15', '2026-09-02T11:00:00Z', 'Override pushes Aurora into the underperforming bucket while audited numbers are finalized.');

INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (1, 1, 1, 1, 'email', 'compliance@auroraprime.example', 'Aurora Prime Q2 2026 compliance package', 'Aurora Prime Q2 2026 Compliance Certificate.pdf', 2843120, 'sha256-aurora-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'in_review', 'review', 'tier_2', 0.97, '2026-08-22T14:20:00Z', '2026-08-22T14:42:00Z', 'Matched to overdue quarterly compliance certificate and routed to Tier 2 review.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (2, 1, 2, 2, 'email', 'finance@auroraprime.example', 'Aurora Prime Q2 2026 management accounts', 'Aurora Prime Q2 2026 Management Accounts.pdf', 4218091, 'sha256-aurora-q2-mgmt', 'application/pdf', 'Q2 2026', 'management_accounts', 'matched', 'committed', 'committed', 'tier_1', 0.99, '2026-08-09T16:10:00Z', '2026-08-09T16:18:00Z', 'Auto-committed after validation checks passed.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (3, 2, 4, 3, 'email', 'treasury@graniteswitchyard.example', 'Granite Switchyard Q2 2026 compliance certificate', 'Granite Switchyard Q2 2026 Compliance Certificate.pdf', 2517772, 'sha256-granite-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'committed', 'committed', 'tier_1', 0.98, '2026-08-05T09:00:00Z', '2026-08-05T09:06:00Z', 'Received and committed on time.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (4, 3, 5, 4, 'portal', 'operations@meridianedge.example', 'Meridian Edge Q2 2026 compliance certificate upload', 'Meridian Edge Q2 2026 Compliance Certificate.pdf', 2339042, 'sha256-meridian-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'committed', 'committed', 'tier_1', 0.98, '2026-08-11T10:40:00Z', '2026-08-11T10:48:00Z', 'Portal upload matched to operational compliance schedule.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (5, 4, 6, 5, 'email', 'compliance@ionharbor.example', 'Ion Harbor Q2 2026 certificate', 'Ion Harbor Q2 2026 Compliance Certificate.pdf', 2467311, 'sha256-ion-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'committed', 'committed', 'tier_1', 0.96, '2026-08-14T08:45:00Z', '2026-08-14T08:56:00Z', 'Received inside grace window and committed after validation.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (6, 5, 7, 6, 'email', 'reporting@summitloop.example', 'Summit Loop Q2 2026 compliance certificate', 'Summit Loop Q2 2026 Compliance Certificate.pdf', 2104458, 'sha256-summit-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'committed', 'committed', 'tier_1', 0.99, '2026-08-07T07:30:00Z', '2026-08-07T07:35:00Z', 'Standard certificate committed without exception.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (7, 6, 8, 7, 'portal', 'controller@cobaltgrid.example', 'Cobalt Grid Q2 2026 package', 'Cobalt Grid Q2 2026 Compliance Certificate.pdf', 2411398, 'sha256-cobalt-q2-cert', 'application/pdf', 'Q2 2026', 'compliance_certificate', 'matched', 'committed', 'committed', 'tier_1', 0.98, '2026-08-13T11:15:00Z', '2026-08-13T11:22:00Z', 'Construction certificate matched and committed.');
INSERT INTO incoming_documents (id, deal_id, matched_obligation_id, canonical_document_id, source_channel, sender, subject, file_name, file_size_bytes, checksum, mime_type, period_label, document_type, classification_status, processing_status, current_stage, review_tier, confidence, received_at, last_updated_at, notes) VALUES (8, NULL, NULL, NULL, 'email', 'borrower-docs@unknownsender.example', 'Insurance renewal and supporting scans', 'Unmatched Insurance Renewal Bundle.pdf', 5182204, 'sha256-unmatched-insurance-bundle', 'application/pdf', NULL, NULL, 'needs_triage', 'awaiting_classification', 'classification', 'tier_2', 0.62, '2026-08-23T09:12:00Z', '2026-08-23T09:15:00Z', 'Sender domain is not yet mapped; waiting for human triage before obligation matching.');

INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (1, 1, 'receipt', 'completed', 'mail_ingest', '2026-08-22T14:20:00Z', '2026-08-22T14:21:00Z', NULL, 'Inbound email captured and file fingerprint recorded.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (2, 1, 'classification', 'completed', 'ai_classifier', '2026-08-22T14:21:00Z', '2026-08-22T14:23:00Z', 0.97, 'Matched to Aurora Prime Q2 2026 compliance certificate.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (3, 1, 'validation', 'completed', 'rules_engine', '2026-08-22T14:23:00Z', '2026-08-22T14:26:00Z', 0.94, 'Variance checks triggered human review because DSCR moved close to threshold.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (4, 1, 'review', 'in_progress', 'ham_queue', '2026-08-22T14:26:00Z', NULL, NULL, 'Queued for Tier 2 approval.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (5, 2, 'receipt', 'completed', 'mail_ingest', '2026-08-09T16:10:00Z', '2026-08-09T16:11:00Z', NULL, 'Management accounts received and attached to Aurora Prime.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (6, 2, 'classification', 'completed', 'ai_classifier', '2026-08-09T16:11:00Z', '2026-08-09T16:13:00Z', 0.99, 'Document classified as management accounts for Q2 2026.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (7, 2, 'commit', 'completed', 'auto_commit', '2026-08-09T16:13:00Z', '2026-08-09T16:18:00Z', NULL, 'No review required; canonical record updated.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (8, 5, 'grace_assessment', 'completed', 'rules_engine', '2026-08-14T08:45:00Z', '2026-08-14T08:46:00Z', NULL, 'Received inside grace; no escalation required.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (9, 8, 'receipt', 'completed', 'mail_ingest', '2026-08-23T09:12:00Z', '2026-08-23T09:12:30Z', NULL, 'Unknown sender ingested into raw inbox.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (10, 8, 'classification', 'failed', 'ai_classifier', '2026-08-23T09:12:30Z', '2026-08-23T09:15:00Z', 0.62, 'Classification confidence below threshold; routed to manual triage.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (11, 3, 'commit', 'completed', 'auto_commit', '2026-08-05T09:03:00Z', '2026-08-05T09:06:00Z', NULL, 'Granite certificate committed and obligation marked fulfilled.');
INSERT INTO document_processing_runs (id, incoming_document_id, stage_name, stage_status, processor_type, started_at, completed_at, confidence, summary) VALUES (12, 7, 'commit', 'completed', 'auto_commit', '2026-08-13T11:18:00Z', '2026-08-13T11:22:00Z', NULL, 'Cobalt certificate committed with no exceptions.');

INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (1, 1, 'deal_match', 'dealSlug', 'Matched deal', 'aurora-prime-data-campus', 0.97, 'subject', 'accepted', 'classification_agent', '2026-08-22T14:22:00Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (2, 1, 'document_type', 'documentType', 'Document type', 'compliance_certificate', 0.97, 'filename', 'accepted', 'classification_agent', '2026-08-22T14:22:00Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (3, 1, 'period_match', 'periodLabel', 'Reporting period', 'Q2 2026', 0.95, 'filename', 'accepted', 'classification_agent', '2026-08-22T14:22:30Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (4, 1, 'package_summary', NULL, 'Package summary', 'Quarterly compliance certificate for Aurora Prime with tight DSCR headroom and one late delivery indicator.', 0.92, 'page:1', 'accepted', 'narrative_agent', '2026-08-22T14:25:00Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (5, 8, 'document_type', 'documentType', 'Document type', 'insurance_renewal_bundle', 0.62, 'filename', 'pending_review', 'classification_agent', '2026-08-23T09:14:30Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (6, 8, 'deal_match', 'dealSlug', 'Matched deal', 'unmatched', 0.34, 'sender_domain', 'pending_review', 'classification_agent', '2026-08-23T09:14:45Z');
INSERT INTO incoming_document_proposals (id, incoming_document_id, proposal_type, field_key, field_label, proposed_value, confidence, citation_reference, proposal_status, created_by, created_at) VALUES (7, 8, 'package_summary', NULL, 'Package summary', 'Insurance renewal bundle from an unmapped sender; requires human triage before obligation matching.', 0.68, 'subject', 'pending_review', 'narrative_agent', '2026-08-23T09:15:00Z');

INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (1, 1, 2, NULL, 'classification', 'classification_agent', 'sesame-intake-classifier', 'demo-v1', 'watched_directory_classification_v1', '[{"kind":"filename","value":"Aurora Prime Q2 2026 Compliance Certificate.pdf"},{"kind":"subject","value":"Aurora Prime Q2 2026 compliance package"}]'::jsonb, '[{"tool":"deal_slug_matcher","status":"completed"}]'::jsonb, 0.97, 'Aurora package classified as a Q2 2026 compliance certificate.', '2026-08-22T14:23:00Z');
INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (2, 1, 2, 1, 'deal_matching', 'matching_agent', 'sesame-deal-matcher', 'demo-v1', 'deal_match_from_filename_v1', '[{"kind":"filename","value":"Aurora Prime Q2 2026 Compliance Certificate.pdf"}]'::jsonb, '[{"tool":"slugify_match","status":"completed"}]'::jsonb, 0.97, 'Matched the package to aurora-prime-data-campus.', '2026-08-22T14:22:00Z');
INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (3, 1, 2, 4, 'narrative_summary', 'narrative_agent', 'sesame-narrative-summarizer', 'demo-v1', 'watched_directory_summary_v1', '[{"kind":"classification","value":"compliance_certificate"},{"kind":"period","value":"Q2 2026"}]'::jsonb, '[]'::jsonb, 0.92, 'Generated a review-ready package summary for the Aurora compliance certificate.', '2026-08-22T14:25:00Z');
INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (4, 2, 6, NULL, 'classification', 'classification_agent', 'sesame-intake-classifier', 'demo-v1', 'watched_directory_classification_v1', '[{"kind":"filename","value":"Aurora Prime Q2 2026 Management Accounts.pdf"}]'::jsonb, '[]'::jsonb, 0.99, 'Aurora management accounts were classified at high confidence and routed to auto-commit.', '2026-08-09T16:13:00Z');
INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (5, 8, 10, 5, 'classification', 'classification_agent', 'sesame-intake-classifier', 'demo-v1', 'watched_directory_classification_v1', '[{"kind":"filename","value":"Unmatched Insurance Renewal Bundle.pdf"},{"kind":"sender","value":"borrower-docs@unknownsender.example"}]'::jsonb, '[{"tool":"deal_slug_matcher","status":"no_match"}]'::jsonb, 0.62, 'Insurance renewal bundle remained below confidence threshold and could not be matched to a known deal.', '2026-08-23T09:15:00Z');
INSERT INTO ai_audit_logs (id, incoming_document_id, processing_run_id, proposal_id, ai_stage, actor_label, model_name, model_version, prompt_template, retrieved_context, tool_calls, confidence, summary, created_at) VALUES (6, 8, 10, 7, 'narrative_summary', 'narrative_agent', 'sesame-narrative-summarizer', 'demo-v1', 'watched_directory_summary_v1', '[{"kind":"classification","value":"insurance_renewal_bundle"},{"kind":"sender","value":"borrower-docs@unknownsender.example"}]'::jsonb, '[]'::jsonb, 0.68, 'Generated a triage summary for the unmatched insurance renewal bundle.', '2026-08-23T09:15:00Z');

INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (1, 1, 1, '2026-08-14', '2026-08-22T14:20:00Z', 'late_pending_review', 8, 'ai_match_plus_ham_review', 'Matched to overdue compliance certificate but still awaiting final approval.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (2, 2, 2, '2026-08-10', '2026-08-09T16:10:00Z', 'fulfilled', 0, 'auto_match', 'Management accounts delivered before deadline.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (3, 4, 3, '2026-08-06', '2026-08-05T09:00:00Z', 'fulfilled', 0, 'auto_match', 'Granite certificate arrived on time.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (4, 5, 4, '2026-08-12', '2026-08-11T10:40:00Z', 'fulfilled', 0, 'auto_match', 'Meridian certificate matched and fulfilled.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (5, 6, 5, '2026-08-12', '2026-08-14T08:45:00Z', 'late_within_grace', 2, 'auto_match', 'Ion Harbor package was late but remained inside the grace period.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (6, 7, 6, '2026-08-08', '2026-08-07T07:30:00Z', 'fulfilled', 0, 'auto_match', 'Summit certificate fulfilled without exception.');
INSERT INTO obligation_fulfilments (id, obligation_id, incoming_document_id, due_date, received_at, status, days_late, matched_by, notes) VALUES (7, 8, 7, '2026-08-14', '2026-08-13T11:15:00Z', 'fulfilled', 0, 'auto_match', 'Cobalt package committed ahead of due date.');

INSERT INTO compliance_cases (id, deal_id, obligation_id, incoming_document_id, case_type, severity, status, owner_name, title, summary, opened_at, sla_due_at, closed_at, resolution_note) VALUES (1, 1, 1, 1, 'overdue_obligation', 'high', 'open', 'HAM - Aurora', 'Aurora compliance certificate overdue', 'Compliance certificate arrived eight days late and remains pending Tier 2 review before fulfilment can be confirmed.', '2026-08-22T14:20:00Z', '2026-08-24T17:00:00Z', NULL, '');
INSERT INTO compliance_cases (id, deal_id, obligation_id, incoming_document_id, case_type, severity, status, owner_name, title, summary, opened_at, sla_due_at, closed_at, resolution_note) VALUES (2, NULL, NULL, 8, 'classification_exception', 'medium', 'open', 'HAM - Shared Inbox', 'Unmatched inbound insurance bundle', 'Unknown sender and low-confidence classification require manual triage before the package can be attached to a deal.', '2026-08-23T09:15:00Z', '2026-08-25T17:00:00Z', NULL, '');
INSERT INTO compliance_cases (id, deal_id, obligation_id, incoming_document_id, case_type, severity, status, owner_name, title, summary, opened_at, sla_due_at, closed_at, resolution_note) VALUES (3, 4, 6, 5, 'late_within_grace', 'medium', 'monitoring', 'HAM - Ion Harbor', 'Ion Harbor certificate delivered within grace', 'Delivery landed inside the grace period; keep under observation until period close and archive with fulfilment evidence.', '2026-08-14T08:45:00Z', '2026-08-29T17:00:00Z', NULL, '');
INSERT INTO compliance_cases (id, deal_id, obligation_id, incoming_document_id, case_type, severity, status, owner_name, title, summary, opened_at, sla_due_at, closed_at, resolution_note) VALUES (4, 2, 4, 3, 'timely_delivery', 'low', 'resolved', 'HAM - Granite', 'Granite certificate auto-committed', 'On-time package committed automatically and case closed for audit completeness.', '2026-08-05T09:00:00Z', '2026-08-06T17:00:00Z', '2026-08-05T09:06:00Z', 'Auto-commit completed without review.');

INSERT INTO compliance_alerts (id, deal_id, compliance_case_id, priority, status, channel, title, description, triggered_at, acknowledged_at, resolved_at) VALUES (1, 1, 1, 'high', 'active', 'in_app', 'Aurora deliverable overdue', 'Quarterly compliance certificate is overdue and still pending review before fulfilment can be closed.', '2026-08-22T14:20:00Z', NULL, NULL);
INSERT INTO compliance_alerts (id, deal_id, compliance_case_id, priority, status, channel, title, description, triggered_at, acknowledged_at, resolved_at) VALUES (2, NULL, 2, 'medium', 'active', 'in_app', 'Unmatched inbound package', 'Unknown insurance bundle requires manual triage and deal assignment.', '2026-08-23T09:15:00Z', NULL, NULL);
INSERT INTO compliance_alerts (id, deal_id, compliance_case_id, priority, status, channel, title, description, triggered_at, acknowledged_at, resolved_at) VALUES (3, 4, 3, 'medium', 'acknowledged', 'in_app', 'Ion Harbor delivered inside grace', 'Late delivery fell inside grace window; monitor until fulfilment closes.', '2026-08-14T08:45:00Z', '2026-08-14T10:00:00Z', NULL);
INSERT INTO compliance_alerts (id, deal_id, compliance_case_id, priority, status, channel, title, description, triggered_at, acknowledged_at, resolved_at) VALUES (4, 2, 4, 'low', 'resolved', 'in_app', 'Granite auto-commit completed', 'The Granite package was received and committed on time.', '2026-08-05T09:06:00Z', '2026-08-05T09:07:00Z', '2026-08-05T09:07:00Z');

INSERT INTO risk_register_entries (id, deal_id, assessment_id, trend_record_id, compliance_case_id, ratio_reconciliation_id, source_document_id, risk_category, severity, probability, impact, status, owner_name, title, summary, mitigant, next_review_date, opened_at, closed_at) VALUES (1, 1, 1, 1, 1, 1, 9, 'financial_performance', 'high', 'likely', 'high', 'open', 'PM - Infrastructure', 'Aurora DSCR reconciliation pressure', 'Audited DSCR is below the borrower-certified figure and keeps Aurora close to lock-up while the package remains under review.', 'Maintain enhanced monitoring, clear the ratio reconciliation, and hold distributions until the next clean period.', '2026-09-15', '2026-09-02T11:10:00Z', NULL);
INSERT INTO risk_register_entries (id, deal_id, assessment_id, trend_record_id, compliance_case_id, ratio_reconciliation_id, source_document_id, risk_category, severity, probability, impact, status, owner_name, title, summary, mitigant, next_review_date, opened_at, closed_at) VALUES (2, 4, 4, 4, 3, NULL, 5, 'leasing', 'high', 'likely', 'high', 'open', 'HAM - Ion Harbor', 'Ion Harbor lease-up underperformance', 'Lease-up remains materially below case, reinforcing the cash trap and limiting the borrower''s flexibility to request waivers.', 'Obtain sponsor leasing remediation plan and keep PM escalation active until occupancy recovers.', '2026-09-05', '2026-08-15T10:40:00Z', NULL);
INSERT INTO risk_register_entries (id, deal_id, assessment_id, trend_record_id, compliance_case_id, ratio_reconciliation_id, source_document_id, risk_category, severity, probability, impact, status, owner_name, title, summary, mitigant, next_review_date, opened_at, closed_at) VALUES (3, 6, 6, 6, NULL, NULL, 7, 'construction', 'medium', 'possible', 'medium', 'monitoring', 'HAM - Cobalt', 'Cobalt completion milestone risk', 'Construction completion has slipped against plan for two periods and still constrains distribution release tests.', 'Re-test release conditions after the next construction certificate and keep the risk on the HAM monitor list.', '2026-09-14', '2026-08-13T12:00:00Z', NULL);
INSERT INTO risk_register_entries (id, deal_id, assessment_id, trend_record_id, compliance_case_id, ratio_reconciliation_id, source_document_id, risk_category, severity, probability, impact, status, owner_name, title, summary, mitigant, next_review_date, opened_at, closed_at) VALUES (4, 2, 2, NULL, 4, 3, 3, 'reporting', 'low', 'unlikely', 'low', 'resolved', 'HAM - Granite', 'Granite reporting discipline', 'Granite''s reporting and ratio package were received and matched cleanly, closing the prior operating concern.', 'Maintain standard monitoring only.', '2026-11-10', '2026-08-05T09:06:00Z', '2026-08-05T09:07:00Z');
INSERT INTO risk_register_entries (id, deal_id, assessment_id, trend_record_id, compliance_case_id, ratio_reconciliation_id, source_document_id, risk_category, severity, probability, impact, status, owner_name, title, summary, mitigant, next_review_date, opened_at, closed_at) VALUES (5, 7, 7, 7, NULL, NULL, 10, 'onboarding_execution', 'low', 'possible', 'low', 'monitoring', 'HAM - Apollo', 'Apollo first-quarter monitoring transition', 'Apollo was activated cleanly, but the first live monitored quarter should be reviewed closely while the new borrower cadence settles in.', 'Review the first ordinary compliance package and validate that the onboarding assumptions remain intact.', '2026-11-21', '2026-09-12T10:20:00Z', NULL);

INSERT INTO borrower_requests (id, deal_id, request_type, request_status, priority, owner_name, related_covenant_id, related_distribution_assessment_id, related_risk_entry_id, title, summary, requested_action, borrower_contact, submitted_at, due_date, sla_due_at, decision_summary) VALUES (1, 1, 'waiver_request', 'approved_with_conditions', 'high', 'PM - Infrastructure', 1, 1, 1, 'Aurora temporary distribution waiver request', 'The borrower requests a temporary waiver to allow a limited upstream distribution before the audited ratio reconciliation and compliance review are fully cleared.', 'Approve a one-time capped distribution subject to PM review.', 'treasury@auroraprime.example', '2026-09-03T09:30:00Z', '2026-09-10', '2026-09-08T17:00:00Z', 'Approved with conditions: capped release only after PM sign-off and no further covenant deterioration.');
INSERT INTO borrower_requests (id, deal_id, request_type, request_status, priority, owner_name, related_covenant_id, related_distribution_assessment_id, related_risk_entry_id, title, summary, requested_action, borrower_contact, submitted_at, due_date, sla_due_at, decision_summary) VALUES (2, 4, 'consent_request', 'declined', 'high', 'PM - Infrastructure', 4, 4, 2, 'Ion Harbor covenant relief and lease-up consent', 'Ion Harbor requests lender consent to adjust the lease-up milestone test and defer cash trap mechanics for one quarter.', 'Decline until revised sponsor plan and updated downside case are delivered.', 'cfo@ionharbor.example', '2026-08-20T14:00:00Z', '2026-09-06', '2026-09-03T17:00:00Z', 'Declined pending a revised sponsor support package and downside case refresh.');

INSERT INTO borrower_request_votes (id, borrower_request_id, account_id, vote_status, voter_name, rationale, decided_at) VALUES (1, 1, 1, 'support_with_conditions', 'County Core Infrastructure IC', 'Would support only if the distribution cap remains below the trapped cash amount and the audited reconciliation is cleared first.', '2026-09-04T10:00:00Z');
INSERT INTO borrower_request_votes (id, borrower_request_id, account_id, vote_status, voter_name, rationale, decided_at) VALUES (2, 1, 5, 'oppose', 'Sesame Warehouse Risk', 'Opposes waiver while the active grade override and overdue compliance workflow remain unresolved.', '2026-09-04T13:15:00Z');
INSERT INTO borrower_request_votes (id, borrower_request_id, account_id, vote_status, voter_name, rationale, decided_at) VALUES (3, 2, 4, 'oppose', 'Northbridge Tactical Committee', 'No relief before updated sponsor support and revised leasing case are delivered.', '2026-08-22T16:20:00Z');

INSERT INTO borrower_request_decisions (id, borrower_request_id, decision_status, decision_summary, decision_rationale, decided_by, effective_from, expires_on, related_grade_override_id, activated_distribution_status, decision_outcome, decided_at) VALUES (1, 1, 'approved_with_conditions', 'Approved for one capped distribution release subject to PM sign-off and completion of the open review chain.', 'Committee accepted a limited exception because the borrower remains above lock-up, but retained conditions because the audited reconciliation and compliance workflow are still open.', 'PM - Infrastructure Committee', '2026-09-06', '2026-09-30', 1, 'review_required', 'temporary_waiver', '2026-09-06T12:00:00Z');
INSERT INTO borrower_request_decisions (id, borrower_request_id, decision_status, decision_summary, decision_rationale, decided_by, effective_from, expires_on, related_grade_override_id, activated_distribution_status, decision_outcome, decided_at) VALUES (2, 2, 'declined', 'Declined until sponsor support and a revised downside case are delivered.', 'Ion Harbor remains too close to lock-up and the lease-up miss is unresolved; there is no basis to relax the cash trap or milestone test at this point.', 'PM - Infrastructure Committee', '2026-08-25', NULL, NULL, 'blocked', 'decline', '2026-08-25T15:00:00Z');

INSERT INTO deal_amendments (id, deal_id, borrower_request_id, borrower_request_decision_id, amendment_type, amendment_status, title, summary, source_domain, effective_from, effective_to, created_by, created_at) VALUES (1, 1, 1, 1, 'waiver', 'active', 'Aurora temporary distribution waiver', 'Temporary capped distribution release approved through month-end while PM sign-off, ratio reconciliation, and the compliance workflow remain open.', 'borrower_request', '2026-09-06', '2026-09-30', 'PM - Infrastructure Committee', '2026-09-06T12:00:00Z');
INSERT INTO deal_amendments (id, deal_id, borrower_request_id, borrower_request_decision_id, amendment_type, amendment_status, title, summary, source_domain, effective_from, effective_to, created_by, created_at) VALUES (2, 4, 2, 2, 'consent', 'declined', 'Ion Harbor covenant relief request', 'Requested milestone and cash-trap relief was declined, preserving the live covenant and distribution rules until the sponsor refresh is delivered.', 'borrower_request', '2026-08-25', NULL, 'PM - Infrastructure Committee', '2026-08-25T15:00:00Z');

INSERT INTO amendment_rule_versions (id, amendment_id, deal_id, rule_domain, rule_type, target_entity_type, target_entity_id, target_label, version_label, change_summary, effective_from, effective_to, is_active, previous_value, updated_value) VALUES (1, 1, 1, 'distribution', 'temporary_release_window', 'distribution_assessment', 1, 'Aurora Q2 2026 distribution posture', 'Aurora waiver v1', 'Temporary capped release enabled while PM sign-off remains mandatory.', '2026-09-06', '2026-09-30', TRUE, '{"distributionStatus":"restricted","distributionCapacity":0,"cashTrapAmount":4200000,"pmSignoffRequired":false}'::jsonb, '{"distributionStatus":"review_required","distributionCapacity":1500000,"cashTrapAmount":4200000,"pmSignoffRequired":true}'::jsonb);
INSERT INTO amendment_rule_versions (id, amendment_id, deal_id, rule_domain, rule_type, target_entity_type, target_entity_id, target_label, version_label, change_summary, effective_from, effective_to, is_active, previous_value, updated_value) VALUES (2, 1, 1, 'covenant', 'distribution_gate', 'covenant', 1, 'FIN-003 Senior DSCR distribution gate', 'Aurora covenant interpretation v1', 'The legal DSCR threshold is unchanged, but one capped release is permitted while the waiver is effective.', '2026-09-06', '2026-09-30', TRUE, '{"thresholdLockup":1.25,"distributionGate":"standard","requiresPmReview":false}'::jsonb, '{"thresholdLockup":1.25,"distributionGate":"temporary_waiver","requiresPmReview":true,"releaseCap":1500000}'::jsonb);

INSERT INTO amendment_change_impacts (id, amendment_id, deal_id, impact_type, target_entity_type, target_entity_id, target_label, impact_summary, before_state, after_state, recomputed_at) VALUES (1, 1, 1, 'distribution_recompute', 'distribution_assessment', 1, 'Aurora Q2 2026 distribution posture', 'Distribution posture moved from restricted to review-required with a capped release window and explicit PM sign-off requirement.', '{"distributionStatus":"restricted","lockupState":"lock_up","distributionCapacity":0,"cashTrapAmount":4200000}'::jsonb, '{"distributionStatus":"review_required","lockupState":"near_lock_up","distributionCapacity":1500000,"cashTrapAmount":4200000}'::jsonb, '2026-09-06T12:01:00Z');
INSERT INTO amendment_change_impacts (id, amendment_id, deal_id, impact_type, target_entity_type, target_entity_id, target_label, impact_summary, before_state, after_state, recomputed_at) VALUES (2, 1, 1, 'risk_recompute', 'risk_register_entry', 1, 'Aurora DSCR reconciliation pressure', 'Risk remained open but its mitigant and monitoring stance were updated to reflect the temporary waiver controls.', '{"status":"open","mitigant":"Maintain enhanced monitoring, clear the ratio reconciliation, and hold distributions until the next clean period."}'::jsonb, '{"status":"monitoring","mitigant":"Maintain enhanced monitoring, clear the ratio reconciliation, and hold distributions until the next clean period. Approved for one capped distribution release subject to PM sign-off and completion of the open review chain."}'::jsonb, '2026-09-06T12:02:00Z');
INSERT INTO amendment_change_impacts (id, amendment_id, deal_id, impact_type, target_entity_type, target_entity_id, target_label, impact_summary, before_state, after_state, recomputed_at) VALUES (3, 1, 1, 'topsheet_snapshot', 'deal_topsheet_snapshot', 5, 'Aurora rule change snapshot', 'A new TopSheet snapshot was captured to preserve the monitored posture immediately after the waiver became effective.', '{"grade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring","openRisks":1,"openRequests":1,"overdueObligations":1}'::jsonb, '{"grade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring","openRisks":1,"openRequests":1,"overdueObligations":1}'::jsonb, '2026-09-06T12:05:00Z');
INSERT INTO amendment_change_impacts (id, amendment_id, deal_id, impact_type, target_entity_type, target_entity_id, target_label, impact_summary, before_state, after_state, recomputed_at) VALUES (4, 2, 4, 'distribution_recompute', 'distribution_assessment', 4, 'Ion Harbor Q2 2026 distribution posture', 'Declining the consent request kept the live cash trap in place and reaffirmed the blocked distribution posture.', '{"distributionStatus":"blocked","lockupState":"lock_up","distributionCapacity":null,"cashTrapAmount":6100000}'::jsonb, '{"distributionStatus":"blocked","lockupState":"lock_up","distributionCapacity":null,"cashTrapAmount":6100000}'::jsonb, '2026-08-25T15:01:00Z');
INSERT INTO amendment_change_impacts (id, amendment_id, deal_id, impact_type, target_entity_type, target_entity_id, target_label, impact_summary, before_state, after_state, recomputed_at) VALUES (5, 2, 4, 'risk_recompute', 'risk_register_entry', 2, 'Ion Harbor lease-up underperformance', 'The lease-up risk remained open and its mitigant was updated to reflect that no covenant relief was granted.', '{"status":"open","mitigant":"Obtain sponsor leasing remediation plan and keep PM escalation active until occupancy recovers."}'::jsonb, '{"status":"open","mitigant":"Obtain sponsor leasing remediation plan and keep PM escalation active until occupancy recovers. Declined until sponsor support and a revised downside case are delivered."}'::jsonb, '2026-08-25T15:02:00Z');

INSERT INTO onboarding_workflows (id, workflow_type, workflow_status, organisation_id, owner_id, account_id, deal_id, holding_id, proposed_organisation_name, proposed_owner_name, proposed_account_name, proposed_deal_name, proposed_holding_amount, owner_name, target_go_live_date, summary, created_at, completed_at) VALUES (1, 'new_deal_packet', 'completed', 4, 5, 6, 7, 19, 'Harborview Retirement System', 'Harborview Infrastructure Committee', 'Harborview Core Infrastructure Sleeve', 'Apollo Edge Campus', 42000000, 'Onboarding - PMO', '2026-10-15', 'New investor onboarding packet covering a prospective data center investment, related mandate, and initial holding allocation.', '2026-09-01T09:00:00Z', '2026-09-12T10:25:00Z');
INSERT INTO onboarding_workflows (id, workflow_type, workflow_status, organisation_id, owner_id, account_id, deal_id, holding_id, proposed_organisation_name, proposed_owner_name, proposed_account_name, proposed_deal_name, proposed_holding_amount, owner_name, target_go_live_date, summary, created_at, completed_at) VALUES (2, 'holding_allocation', 'pending_committee', 2, 3, 4, 2, NULL, '', '', '', '', 18000000, 'Onboarding - Portfolio Ops', '2026-09-20', 'Northbridge is preparing a tactical co-investment allocation into Granite Switchyard pending committee approval.', '2026-08-28T11:00:00Z', NULL);
INSERT INTO onboarding_workflows (id, workflow_type, workflow_status, organisation_id, owner_id, account_id, deal_id, holding_id, proposed_organisation_name, proposed_owner_name, proposed_account_name, proposed_deal_name, proposed_holding_amount, owner_name, target_go_live_date, summary, created_at, completed_at) VALUES (3, 'new_deal_packet', 'in_progress', NULL, NULL, NULL, NULL, NULL, 'Bluepeak Retirement Trust', 'Bluepeak Digital Assets Committee', 'Bluepeak Opportunistic Infra Sleeve', 'Atlas Point Campus', 31000000, 'Onboarding - PMO', '2026-11-05', 'Draft onboarding packet for a second new investor and prospective digital infrastructure deal.', '2026-09-18T09:15:00Z', NULL);

INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (1, 1, 'entity_setup', 'Create client and ownership hierarchy', 'completed', 'PMO - Client Operations', '2026-09-20', 'Organisation, owner, and account were activated successfully.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (2, 1, 'deal_intake', 'Load draft deal profile and covenant template', 'completed', 'PMO - Deal Intake', '2026-09-24', 'Apollo Edge monitoring objects were created from the approved packet.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (3, 1, 'allocation', 'Confirm proposed initial holding amount', 'completed', 'PMO - Allocations', '2026-10-01', 'Initial Harborview holding was created at activation.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (4, 2, 'committee_vote', 'Collect tactical allocation votes', 'in_progress', 'Portfolio Ops', '2026-09-05', 'Northbridge tactical sleeve is awaiting final vote records.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (5, 2, 'holding_commit', 'Create holding once approved', 'pending', 'Portfolio Ops', '2026-09-20', 'Commit only after committee decision is uploaded.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (6, 3, 'entity_setup', 'Create client and ownership hierarchy', 'in_progress', 'PMO - Client Operations', '2026-10-10', 'Draft names confirmed; awaiting legal entity pack.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (7, 3, 'deal_intake', 'Load draft deal profile and covenant template', 'pending', 'PMO - Deal Intake', '2026-10-17', 'Waiting for sponsor data room access.');
INSERT INTO onboarding_tasks (id, workflow_id, task_type, title, status, owner_name, due_date, notes) VALUES (8, 3, 'allocation', 'Confirm proposed initial holding amount', 'pending', 'PMO - Allocations', '2026-10-24', 'Allocation amount remains indicative until IC approval.');

INSERT INTO onboarding_activation_events (id, workflow_id, activation_status, activated_by, summary, organisation_id, owner_id, account_id, deal_id, holding_id, activated_at) VALUES (1, 1, 'activated', 'Onboarding - PMO', 'Workflow activated into a live organisation, account, deal, and holding with seeded monitoring records.', 4, 5, 6, 7, 19, '2026-09-12T10:25:00Z');

INSERT INTO demo_clock (id, current_demo_date, clock_label, updated_by, updated_at) VALUES (1, '2026-09-09', 'Quarter-end readiness week', 'Configuration Workspace', '2026-09-09T08:00:00Z');

INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (1, 1, 'q3-2026-monitoring', 'Aurora Q3 2026 monitoring cycle', 'quarterly_monitoring', 'in_review', 'HAM - Aurora', '2026-09-01', '2026-09-07', '2026-09-09', '2026-09-12', '2026-09-15', 'Aurora is in its quarter-end monitoring cycle with intake complete, review open, and committee readiness dependent on clearing the final ratio and waiver workflow.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (2, 2, 'q3-2026-monitoring', 'Granite Q3 2026 monitoring cycle', 'quarterly_monitoring', 'ready_for_release', 'HAM - Granite', '2026-09-01', '2026-09-05', '2026-09-08', '2026-09-10', '2026-09-12', 'Granite has cleared package intake and review and is effectively ready for routine report release.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (3, 3, 'q3-2026-monitoring', 'Meridian Q3 2026 monitoring cycle', 'quarterly_monitoring', 'awaiting_package', 'HAM - Meridian', '2026-09-01', '2026-09-10', '2026-09-12', '2026-09-16', '2026-09-18', 'Meridian is on schedule but still waiting for the borrower package before internal review can start.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (4, 4, 'q3-2026-monitoring', 'Ion Harbor Q3 2026 monitoring cycle', 'quarterly_monitoring', 'blocked', 'PM - Infrastructure', '2026-09-01', '2026-09-06', '2026-09-08', '2026-09-11', '2026-09-15', 'Ion Harbor is blocked in the cycle because watchlist, request, and risk items remain unresolved ahead of committee.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (5, 5, 'q3-2026-monitoring', 'Summit Q3 2026 monitoring cycle', 'quarterly_monitoring', 'in_progress', 'HAM - Summit', '2026-09-01', '2026-09-08', '2026-09-10', '2026-09-14', '2026-09-17', 'Summit is progressing normally through the cycle with intake in and review about to start.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (6, 6, 'q3-2026-monitoring', 'Cobalt Q3 2026 monitoring cycle', 'quarterly_monitoring', 'in_progress', 'HAM - Cobalt', '2026-09-01', '2026-09-09', '2026-09-11', '2026-09-16', '2026-09-19', 'Cobalt is in-flight and depends on the next construction certificate to move confidently toward release.', NULL);
INSERT INTO monitoring_cycles (id, deal_id, cycle_key, cycle_label, cycle_type, cycle_status, owner_name, start_date, package_due_date, internal_review_due_date, committee_date, report_release_date, summary, completed_at) VALUES (7, 7, 'activation-cycle', 'Apollo activation operating cycle', 'activation_readiness', 'complete', 'PMO - Client Operations', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-12', '2026-09-16', 'Apollo finished its onboarding activation cycle and is now in standard monitoring.', '2026-09-12T10:25:00Z');

INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (1, 1, 'package_expected', 'Borrower package due', 'intake', 'completed', '2026-09-07T09:00:00Z', '2026-09-06T15:00:00Z', 'HAM - Aurora', '', 'incoming_document', 1, 'Aurora package landed ahead of the formal due date.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (2, 1, 'internal_review', 'Internal review cleared', 'review', 'in_progress', '2026-09-09T17:00:00Z', NULL, 'HAM - Aurora', 'package_expected', 'review_item', 2, 'Ratio reconciliation review remains open and prevents committee readiness.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (3, 1, 'committee_readiness', 'Committee readiness check', 'committee', 'blocked', '2026-09-12T11:00:00Z', NULL, 'PM - Infrastructure', 'internal_review', 'borrower_request', 1, 'Aurora cannot move to committee until review is cleared and waiver dependencies are closed.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (4, 1, 'report_release', 'Investor report release', 'release', 'pending', '2026-09-15T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', 'report_schedule', 1, 'Release remains dependent on committee readiness.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (5, 2, 'package_expected', 'Borrower package due', 'intake', 'completed', '2026-09-05T09:00:00Z', '2026-09-05T08:10:00Z', 'HAM - Granite', '', 'incoming_document', 3, 'Granite package arrived cleanly and on time.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (6, 2, 'internal_review', 'Internal review cleared', 'review', 'completed', '2026-09-08T17:00:00Z', '2026-09-08T15:00:00Z', 'HAM - Granite', 'package_expected', NULL, NULL, 'No review exceptions remain for Granite.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (7, 2, 'committee_readiness', 'Committee readiness check', 'committee', 'completed', '2026-09-10T11:00:00Z', '2026-09-09T09:00:00Z', 'HAM - Granite', 'internal_review', NULL, NULL, 'Granite needs no escalation and is committee-ready by exception.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (8, 2, 'report_release', 'Investor report release', 'release', 'ready', '2026-09-12T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', 'report_schedule', 2, 'The release slot is approaching and all prerequisites are complete.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (9, 3, 'package_expected', 'Borrower package due', 'intake', 'pending', '2026-09-10T09:00:00Z', NULL, 'HAM - Meridian', '', 'obligation', 5, 'Meridian package is not yet due on the demo clock.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (10, 3, 'internal_review', 'Internal review cleared', 'review', 'pending', '2026-09-12T17:00:00Z', NULL, 'HAM - Meridian', 'package_expected', NULL, NULL, 'Review will open once the package arrives.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (11, 3, 'committee_readiness', 'Committee readiness check', 'committee', 'pending', '2026-09-16T11:00:00Z', NULL, 'PM - Infrastructure', 'internal_review', NULL, NULL, 'Committee readiness is not yet in focus for Meridian.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (12, 3, 'report_release', 'Investor report release', 'release', 'pending', '2026-09-18T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', NULL, NULL, 'Release remains well ahead of the current demo date.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (13, 4, 'package_expected', 'Borrower package due', 'intake', 'completed', '2026-09-06T09:00:00Z', '2026-09-06T12:00:00Z', 'HAM - Ion Harbor', '', 'incoming_document', 5, 'Ion Harbor package arrived inside the cycle window.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (14, 4, 'internal_review', 'Internal review cleared', 'review', 'blocked', '2026-09-08T17:00:00Z', NULL, 'HAM - Ion Harbor', 'package_expected', 'risk_register_entry', 2, 'High-severity risk and open request items prevent the cycle from clearing review.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (15, 4, 'committee_readiness', 'Committee readiness check', 'committee', 'blocked', '2026-09-11T11:00:00Z', NULL, 'PM - Infrastructure', 'internal_review', 'borrower_request', 2, 'Ion Harbor remains on the PM escalation path and is not ready for committee.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (16, 4, 'report_release', 'Investor report release', 'release', 'pending', '2026-09-15T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', NULL, NULL, 'Release cannot start until the blocked committee stage clears.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (17, 5, 'package_expected', 'Borrower package due', 'intake', 'completed', '2026-09-08T09:00:00Z', '2026-09-08T08:05:00Z', 'HAM - Summit', '', 'incoming_document', 6, 'Summit package arrived on time.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (18, 5, 'internal_review', 'Internal review cleared', 'review', 'pending', '2026-09-10T17:00:00Z', NULL, 'HAM - Summit', 'package_expected', NULL, NULL, 'Summit review is queued for the next working day.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (19, 5, 'committee_readiness', 'Committee readiness check', 'committee', 'pending', '2026-09-14T11:00:00Z', NULL, 'PM - Infrastructure', 'internal_review', NULL, NULL, 'Committee readiness remains downstream of review clearance.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (20, 5, 'report_release', 'Investor report release', 'release', 'pending', '2026-09-17T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', NULL, NULL, 'Release sits behind committee readiness.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (21, 6, 'package_expected', 'Borrower package due', 'intake', 'ready', '2026-09-09T09:00:00Z', NULL, 'HAM - Cobalt', '', 'obligation', 8, 'Cobalt package is due on the current demo date.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (22, 6, 'internal_review', 'Internal review cleared', 'review', 'pending', '2026-09-11T17:00:00Z', NULL, 'HAM - Cobalt', 'package_expected', NULL, NULL, 'Review remains downstream of the package receipt.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (23, 6, 'committee_readiness', 'Committee readiness check', 'committee', 'pending', '2026-09-16T11:00:00Z', NULL, 'PM - Infrastructure', 'internal_review', NULL, NULL, 'Committee readiness is not yet active.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (24, 6, 'report_release', 'Investor report release', 'release', 'pending', '2026-09-19T10:00:00Z', NULL, 'Reporting Workspace', 'committee_readiness', NULL, NULL, 'Release remains later in the cycle.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (25, 7, 'package_expected', 'Activation packet due', 'intake', 'completed', '2026-09-11T09:00:00Z', '2026-09-11T14:00:00Z', 'PMO - Client Operations', '', 'onboarding_workflow', 1, 'Apollo activation packet was complete before go-live.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (26, 7, 'internal_review', 'Activation review cleared', 'review', 'completed', '2026-09-12T09:00:00Z', '2026-09-12T09:45:00Z', 'PMO - Client Operations', 'package_expected', 'onboarding_activation_event', 1, 'Apollo activation review cleared without open exceptions.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (27, 7, 'committee_readiness', 'Activation readiness decision', 'committee', 'completed', '2026-09-12T10:00:00Z', '2026-09-12T10:10:00Z', 'PMO - Client Operations', 'internal_review', 'watchlist_event', 4, 'Apollo entered standard monitoring immediately after activation.');
INSERT INTO monitoring_cycle_events (id, monitoring_cycle_id, event_key, event_label, stage_key, event_status, scheduled_for, completed_at, owner_name, dependency_key, source_entity_type, source_entity_id, detail_text) VALUES (28, 7, 'report_release', 'Activation report release', 'release', 'completed', '2026-09-16T10:00:00Z', '2026-09-12T10:25:00Z', 'Reporting Workspace', 'committee_readiness', 'deal_topsheet_snapshot', 4, 'Activation snapshot and operating summary were captured at go-live.');

INSERT INTO deal_topsheet_snapshots (id, deal_id, financial_period_id, snapshot_label, snapshot_type, captured_at, captured_by, summary, snapshot_data) VALUES (1, 1, 1, 'Aurora Q1 2026 TopSheet', 'quarter_end', '2026-05-15T09:00:00Z', 'System snapshot', 'Quarter-end snapshot before the Q2 deterioration and waiver cycle.', '{"grade":"2 - In Line","distributionStatus":"restricted","watchlistStatus":"standard","openRisks":0,"highlights":["Partial occupancy ramp remained below plan.","Construction spend stayed elevated but inside approved limits."]}'::jsonb);
INSERT INTO deal_topsheet_snapshots (id, deal_id, financial_period_id, snapshot_label, snapshot_type, captured_at, captured_by, summary, snapshot_data) VALUES (2, 1, 2, 'Aurora Q2 2026 TopSheet', 'quarter_end', '2026-08-22T15:20:00Z', 'System snapshot', 'Snapshot captured at the point the Q2 package entered enhanced monitoring.', '{"grade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring","openRisks":1,"highlights":["DSCR deterioration tightened headroom to 5.6%.","Late compliance delivery pushed the deal into enhanced monitoring."]}'::jsonb);
INSERT INTO deal_topsheet_snapshots (id, deal_id, financial_period_id, snapshot_label, snapshot_type, captured_at, captured_by, summary, snapshot_data) VALUES (3, 2, 3, 'Granite Q2 2026 TopSheet', 'quarter_end', '2026-08-06T11:05:00Z', 'System snapshot', 'Healthy comparator snapshot after Granite de-escalated back to standard monitoring.', '{"grade":"1 - Outperforming","distributionStatus":"allowed","watchlistStatus":"standard","openRisks":0,"highlights":["Strong covenant headroom and clean delivery execution.","Positive operating variance supported de-escalation."]}'::jsonb);
INSERT INTO deal_topsheet_snapshots (id, deal_id, financial_period_id, snapshot_label, snapshot_type, captured_at, captured_by, summary, snapshot_data) VALUES (4, 7, 8, 'Apollo Activation Snapshot', 'activation', '2026-09-12T10:30:00Z', 'Onboarding - PMO', 'Opening TopSheet snapshot captured when Apollo Edge was activated into the live portfolio.', '{"grade":"2 - In Line","distributionStatus":"allowed","watchlistStatus":"standard","openRisks":1,"highlights":["Apollo was created through onboarding activation.","Opening monitored metrics landed slightly ahead of the activation case."]}'::jsonb);
INSERT INTO deal_topsheet_snapshots (id, deal_id, financial_period_id, snapshot_label, snapshot_type, captured_at, captured_by, summary, snapshot_data) VALUES (5, 1, 2, 'Aurora waiver effective snapshot', 'rule_change', '2026-09-06T12:05:00Z', 'PM - Infrastructure Committee', 'Automatic snapshot captured when the temporary distribution waiver became effective.', '{"grade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring","openRisks":1,"highlights":["Temporary capped distribution waiver became effective through month-end.","PM sign-off and final reconciliation remain required before release."]}'::jsonb);

INSERT INTO memo_packs (id, pack_scope, pack_kind, pack_status, title, summary, deal_id, borrower_request_id, financial_period_id, assessment_id, distribution_assessment_id, snapshot_id, organisation_id, owner_id, account_id, generated_by, generated_at) VALUES (1, 'deal', 'deal_committee', 'generated', 'Aurora Prime Q2 committee pack', 'Decision-ready deal pack for the Aurora Q2 monitoring review, combining the TopSheet, latest period, risk posture, forecast baseline, and active amendment context.', 1, NULL, 2, 1, 1, 5, NULL, NULL, NULL, 'System pack generator', '2026-09-06T12:10:00Z');
INSERT INTO memo_packs (id, pack_scope, pack_kind, pack_status, title, summary, deal_id, borrower_request_id, financial_period_id, assessment_id, distribution_assessment_id, snapshot_id, organisation_id, owner_id, account_id, generated_by, generated_at) VALUES (2, 'deal', 'borrower_request_decision', 'generated', 'Aurora waiver decision pack', 'Consent / waiver pack for the temporary Aurora distribution waiver, capturing the borrower ask, votes, committee decision, active amendment, and downstream impacts.', 1, 1, 2, 1, 1, 5, NULL, NULL, NULL, 'System pack generator', '2026-09-06T12:12:00Z');
INSERT INTO memo_packs (id, pack_scope, pack_kind, pack_status, title, summary, deal_id, borrower_request_id, financial_period_id, assessment_id, distribution_assessment_id, snapshot_id, organisation_id, owner_id, account_id, generated_by, generated_at) VALUES (3, 'deal', 'borrower_request_decision', 'generated', 'Ion Harbor consent decision pack', 'Decision pack for the declined Ion Harbor covenant-relief request, summarizing the request, rationale for decline, and continued blocked distribution posture.', 4, 2, 5, 4, 4, NULL, NULL, NULL, NULL, 'System pack generator', '2026-08-25T15:10:00Z');
INSERT INTO memo_packs (id, pack_scope, pack_kind, pack_status, title, summary, deal_id, borrower_request_id, financial_period_id, assessment_id, distribution_assessment_id, snapshot_id, organisation_id, owner_id, account_id, generated_by, generated_at) VALUES (4, 'portfolio', 'watchlist_committee', 'generated', 'Platform watchlist committee pack', 'Portfolio committee pack summarizing watchlist names, blocked distributions, high-severity risks, and immediate committee attention items across the full hierarchy.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'System pack generator', '2026-09-07T08:30:00Z');

INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (1, 1, 'deal_overview', 'Deal overview', 1, 'TopSheet summary for the current monitored state.', '{"dealName":"Aurora Prime Data Campus","grade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring","snapshotLabel":"Aurora waiver effective snapshot"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (2, 1, 'period_view', 'Latest period', 2, 'Q2 2026 actuals versus the active Aurora base case.', '{"periodLabel":"Q2 2026","reportedRevenue":24100000,"expectedRevenue":25200000,"reportedDscr":1.32,"expectedDscr":1.35,"materialVariances":4}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (3, 1, 'risks_and_actions', 'Risk and actions', 3, 'Open risk, watchlist posture, and active amendment controls.', '{"openRisks":1,"highSeverityRisks":1,"activeAmendments":1,"nextReviewDate":"2026-09-15"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (4, 1, 'forecast_context', 'Forecast context', 4, 'Committee baseline and comparator scenarios.', '{"monitoringCase":"Aurora Base Case","monitoringVersion":"Base v2","scenarioCount":3,"latestRefreshAt":"2026-09-18T09:00:00Z"}'::jsonb);

INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (5, 2, 'request_summary', 'Borrower request summary', 1, 'One-time capped distribution waiver request submitted by Aurora.', '{"requestType":"waiver_request","priority":"high","requestedAction":"Approve a one-time capped distribution subject to PM review.","dueDate":"2026-09-10"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (6, 2, 'voting_position', 'Voting position', 2, 'Accounts split between support with conditions and opposition.', '{"totalVotes":2,"supportWithConditions":1,"oppose":1,"committeeOutcome":"approved_with_conditions"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (7, 2, 'decision_and_amendment', 'Decision and amendment', 3, 'Committee approved a temporary waiver and activated effective-dated rule versions.', '{"decisionStatus":"approved_with_conditions","amendmentTitle":"Aurora temporary distribution waiver","ruleVersions":2,"effectiveFrom":"2026-09-06","effectiveTo":"2026-09-30"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (8, 2, 'downstream_impacts', 'Downstream impacts', 4, 'Distribution, risk, and snapshot outputs updated when the waiver became effective.', '{"distributionStatus":"review_required","recomputedObjects":3,"snapshotLabel":"Aurora waiver effective snapshot"}'::jsonb);

INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (9, 3, 'request_summary', 'Borrower request summary', 1, 'Ion Harbor sought covenant and lease-up relief.', '{"requestType":"consent_request","priority":"high","requestedAction":"Decline until revised sponsor plan and updated downside case are delivered.","dueDate":"2026-09-06"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (10, 3, 'decision_rationale', 'Decision rationale', 2, 'Request was declined due to weak lease-up and a continued cash trap.', '{"decisionStatus":"declined","distributionStatus":"blocked","riskTitle":"Ion Harbor lease-up underperformance","watchlistStatus":"watchlist"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (11, 3, 'required_follow_up', 'Required follow-up', 3, 'Committee expects a sponsor support package and refreshed downside case before any reconsideration.', '{"requiredActions":["Obtain sponsor leasing remediation plan","Refresh downside case","Maintain cash trap"]}'::jsonb);

INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (12, 4, 'watchlist_summary', 'Watchlist summary', 1, 'Current watchlist names and heightened-monitoring concentration.', '{"watchlistDeals":2,"blockedDistributions":1,"highSeverityRisks":2}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (13, 4, 'committee_focus', 'Committee focus', 2, 'Aurora and Ion Harbor require immediate committee attention.', '{"deals":["Aurora Prime Data Campus","Ion Harbor Campus"],"focus":"waiver controls, blocked distributions, and stressed lease-up"}'::jsonb);
INSERT INTO memo_pack_sections (id, memo_pack_id, section_key, section_title, display_order, summary, section_payload) VALUES (14, 4, 'portfolio_actions', 'Portfolio actions', 3, 'Recommended committee actions across the monitored portfolio.', '{"actions":["Review Aurora waiver controls and expiry","Maintain Ion Harbor cash trap","Track next review dates for open high-severity risks"]}'::jsonb);

INSERT INTO review_items (id, deal_id, proposal_type, field_name, proposed_value, confidence, prior_value, status, reason, owner_name, due_at, sla_due_at, document_name, page_number, snippet) VALUES (1, 1, 'metric', 'cfads', '$10.8m', 0.94, '$11.2m', 'pending', 'Material variance vs prior quarter', 'Review - Tier 2', '2026-09-04T17:00:00Z', '2026-09-05T17:00:00Z', 'Aurora Prime Q2 2026 Compliance Certificate.pdf', 7, 'Cash Flow Available for Debt Service for the quarter was $10.8m after higher utility and commissioning spend.');
INSERT INTO review_items (id, deal_id, proposal_type, field_name, proposed_value, confidence, prior_value, status, reason, owner_name, due_at, sla_due_at, document_name, page_number, snippet) VALUES (2, 1, 'ratio_reconciliation', 'senior_dscr', '1.29x', 0.92, '1.32x', 'pending', 'Audited recomputation differs from borrower-reported ratio', 'Review - Tier 2', '2026-09-03T17:00:00Z', '2026-09-04T17:00:00Z', 'Aurora Prime Q2 2026 Audited Financial Statements.pdf', 14, 'Audited Q2 statements recomputed Senior DSCR at 1.29x after reserve normalization and updated debt service accruals.');

INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (1, 1, 1, 1, NULL, 'Matched deal from filename', 'filename', NULL, NULL, NULL, '{}'::jsonb, 'dealSlug', 'Aurora Prime Q2 2026 Compliance Certificate.pdf');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (2, 1, 1, 2, NULL, 'Document type cue from filename', 'filename', NULL, NULL, NULL, '{}'::jsonb, 'documentType', 'Compliance Certificate');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (3, 1, 1, 3, NULL, 'Reporting period from filename', 'filename', NULL, NULL, NULL, '{}'::jsonb, 'periodLabel', 'Q2 2026');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (4, 1, 1, 4, NULL, 'Certificate summary text', 'page', 1, NULL, NULL, '{"x":0.12,"y":0.18,"width":0.63,"height":0.09}'::jsonb, 'packageSummary', 'Quarterly compliance certificate for Aurora Prime with tight DSCR headroom and one late delivery indicator.');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (5, NULL, 9, NULL, 2, 'Audited DSCR line item', 'cell', 14, 'Debt service covenant', 'B12', '{"x":0.42,"y":0.51,"width":0.16,"height":0.05}'::jsonb, 'senior_dscr', 'Audited Q2 statements recomputed Senior DSCR at 1.29x after reserve normalization and updated debt service accruals.');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (6, 8, NULL, 5, NULL, 'Filename classification cue', 'filename', NULL, NULL, NULL, '{}'::jsonb, 'documentType', 'Unmatched Insurance Renewal Bundle.pdf');
INSERT INTO evidence_citations (id, incoming_document_id, canonical_document_id, proposal_id, review_item_id, citation_label, citation_kind, page_number, table_label, cell_reference, bounding_box, field_key, text_snippet) VALUES (7, 8, NULL, 6, NULL, 'Sender domain match failure', 'subject', NULL, NULL, NULL, '{}'::jsonb, 'dealSlug', 'borrower-docs@unknownsender.example');

INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (1, 'review', 'review_item', 1, 1, NULL, NULL, NULL, 'Review cfads for Aurora Prime Data Campus', 'Material variance vs prior quarter', 'new', 'medium', 'Review - Tier 2', 'Credit Review', 'Tier 2 review', '2026-09-04T17:00:00Z', '2026-09-05T17:00:00Z', NULL, 'ham', 'approaching_due', '', '/deals/aurora-prime-data-campus/periods/latest#variance-cfads', '{"proposalType":"metric","fieldName":"cfads","documentName":"Aurora Prime Q2 2026 Compliance Certificate.pdf","confidence":0.94}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (2, 'review', 'review_item', 2, 1, NULL, NULL, NULL, 'Review senior dscr for Aurora Prime Data Campus', 'Audited recomputation differs from borrower-reported ratio', 'new', 'high', 'Review - Tier 2', 'Credit Review', 'Tier 2 review', '2026-09-03T17:00:00Z', '2026-09-04T17:00:00Z', NULL, 'pm', 'escalated', '', '/deals/aurora-prime-data-campus/periods/latest#reconciliation-seniorDscr', '{"proposalType":"ratio_reconciliation","fieldName":"senior_dscr","documentName":"Aurora Prime Q2 2026 Audited Financial Statements.pdf","confidence":0.92}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (3, 'compliance', 'compliance_case', 1, 1, NULL, NULL, NULL, 'Aurora compliance certificate overdue', 'Compliance certificate arrived eight days late and remains pending Tier 2 review before fulfilment can be confirmed.', 'new', 'high', 'HAM - Aurora', 'Compliance', 'Compliance exceptions', '2026-08-24T17:00:00Z', '2026-08-24T17:00:00Z', NULL, 'pm', 'overdue', '', '/deals/aurora-prime-data-campus', '{"caseType":"overdue_obligation","severity":"high","status":"open"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (4, 'compliance', 'compliance_case', 2, NULL, NULL, NULL, NULL, 'Unmatched inbound insurance bundle', 'Unknown sender and low-confidence classification require manual triage before the package can be attached to a deal.', 'new', 'medium', 'HAM - Shared Inbox', 'Compliance', 'Compliance exceptions', '2026-08-25T17:00:00Z', '2026-08-25T17:00:00Z', NULL, 'ham', 'approaching_due', '', '/compliance/exceptions', '{"caseType":"classification_exception","severity":"medium","status":"open"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (5, 'compliance', 'compliance_case', 3, 4, NULL, NULL, NULL, 'Ion Harbor certificate delivered within grace', 'Delivery landed inside the grace period; keep under observation until period close and archive with fulfilment evidence.', 'in_progress', 'medium', 'HAM - Ion Harbor', 'Compliance', 'Compliance exceptions', '2026-08-29T17:00:00Z', '2026-08-29T17:00:00Z', NULL, 'ham', 'on_track', '', '/deals/ion-harbor-campus', '{"caseType":"late_within_grace","severity":"medium","status":"monitoring"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (6, 'risk', 'risk_register_entry', 1, 1, NULL, NULL, NULL, 'Aurora DSCR reconciliation pressure', 'Audited DSCR is below the borrower-certified figure and keeps Aurora close to lock-up while the package remains under review.', 'in_progress', 'high', 'PM - Infrastructure', 'Portfolio Management', 'Risk register', '2026-09-15T17:00:00Z', '2026-09-15T17:00:00Z', NULL, 'pm', 'escalated', '', '/deals/aurora-prime-data-campus/risk', '{"riskCategory":"financial_performance","severity":"high","nextReviewDate":"2026-09-15"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (7, 'risk', 'risk_register_entry', 2, 4, NULL, NULL, NULL, 'Ion Harbor lease-up underperformance', 'Lease-up remains materially below case, reinforcing the cash trap and limiting the borrower''s flexibility to request waivers.', 'in_progress', 'high', 'HAM - Ion Harbor', 'Portfolio Management', 'Risk register', '2026-09-05T17:00:00Z', '2026-09-05T17:00:00Z', NULL, 'pm', 'escalated', '', '/deals/ion-harbor-campus/risk', '{"riskCategory":"leasing","severity":"high","nextReviewDate":"2026-09-05"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (8, 'risk', 'risk_register_entry', 3, 6, NULL, NULL, NULL, 'Cobalt completion milestone risk', 'Construction completion has slipped against plan for two periods and still constrains distribution release tests.', 'in_progress', 'medium', 'HAM - Cobalt', 'Portfolio Management', 'Risk register', '2026-09-14T17:00:00Z', '2026-09-14T17:00:00Z', NULL, 'ham', 'on_track', '', '/deals/cobalt-grid-campus/risk', '{"riskCategory":"construction","severity":"medium","nextReviewDate":"2026-09-14"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (9, 'risk', 'risk_register_entry', 5, 7, NULL, NULL, NULL, 'Apollo first-quarter monitoring transition', 'Apollo was activated cleanly, but the first live monitored quarter should be reviewed closely while the new borrower cadence settles in.', 'in_progress', 'low', 'HAM - Apollo', 'Portfolio Management', 'Risk register', '2026-11-21T17:00:00Z', '2026-11-21T17:00:00Z', NULL, 'ham', 'on_track', '', '/deals/apollo-edge-campus/risk', '{"riskCategory":"onboarding_execution","severity":"low","nextReviewDate":"2026-11-21"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (10, 'borrower_requests', 'borrower_request', 1, 1, NULL, NULL, NULL, 'Aurora temporary distribution waiver request', 'The borrower requests a temporary waiver to allow a limited upstream distribution before the audited ratio reconciliation and compliance review are fully cleared.', 'resolved', 'high', 'PM - Infrastructure', 'Portfolio Management', 'Consents and waivers', '2026-09-10T17:00:00Z', '2026-09-08T17:00:00Z', '2026-09-06T12:00:00Z', 'committee', 'resolved', '', '/deals/aurora-prime-data-campus/requests', '{"requestType":"waiver_request","requestStatus":"approved_with_conditions","requestedAction":"Approve a one-time capped distribution subject to PM review."}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (11, 'borrower_requests', 'borrower_request', 2, 4, NULL, NULL, NULL, 'Ion Harbor covenant relief and lease-up consent', 'Ion Harbor requests lender consent to adjust the lease-up milestone test and defer cash trap mechanics for one quarter.', 'resolved', 'high', 'PM - Infrastructure', 'Portfolio Management', 'Consents and waivers', '2026-09-06T17:00:00Z', '2026-09-03T17:00:00Z', '2026-08-25T15:00:00Z', 'committee', 'resolved', '', '/deals/ion-harbor-campus/requests', '{"requestType":"consent_request","requestStatus":"declined","requestedAction":"Decline until revised sponsor plan and updated downside case are delivered."}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (12, 'configuration', 'onboarding_task', 1, 7, 4, 5, 6, 'Create client and ownership hierarchy', 'Organisation, owner, and account were activated successfully.', 'resolved', 'medium', 'PMO - Client Operations', 'Configuration', 'Onboarding', '2026-09-20T17:00:00Z', '2026-09-20T17:00:00Z', '2026-09-12T10:25:00Z', 'ham', 'resolved', '', '/configuration', '{"workflowStatus":"completed","taskType":"entity_setup","dealName":"Apollo Edge Campus"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (13, 'configuration', 'onboarding_task', 4, 2, 2, 3, 4, 'Collect tactical allocation votes', 'Northbridge tactical sleeve is awaiting final vote records.', 'in_progress', 'high', 'Portfolio Ops', 'Configuration', 'Onboarding', '2026-09-05T17:00:00Z', '2026-09-05T17:00:00Z', NULL, 'committee', 'escalated', '', '/configuration', '{"workflowStatus":"pending_committee","taskType":"committee_vote","dealName":"Granite Switchyard Campus"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (14, 'configuration', 'onboarding_task', 5, 2, 2, 3, 4, 'Create holding once approved', 'Commit only after committee decision is uploaded.', 'new', 'high', 'Portfolio Ops', 'Configuration', 'Onboarding', '2026-09-20T17:00:00Z', '2026-09-20T17:00:00Z', NULL, 'committee', 'escalated', '', '/configuration', '{"workflowStatus":"pending_committee","taskType":"holding_commit","dealName":"Granite Switchyard Campus"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (15, 'configuration', 'onboarding_task', 6, NULL, NULL, NULL, NULL, 'Create client and ownership hierarchy', 'Draft names confirmed; awaiting legal entity pack.', 'in_progress', 'medium', 'PMO - Client Operations', 'Configuration', 'Onboarding', '2026-10-10T17:00:00Z', '2026-10-10T17:00:00Z', NULL, 'ham', 'approaching_due', '', '/configuration', '{"workflowStatus":"in_progress","taskType":"entity_setup","dealName":"Atlas Point Campus"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (16, 'configuration', 'onboarding_task', 7, NULL, NULL, NULL, NULL, 'Load draft deal profile and covenant template', 'Waiting for sponsor data room access.', 'new', 'medium', 'PMO - Deal Intake', 'Configuration', 'Onboarding', '2026-10-17T17:00:00Z', '2026-10-17T17:00:00Z', NULL, 'ham', 'on_track', '', '/configuration', '{"workflowStatus":"in_progress","taskType":"deal_intake","dealName":"Atlas Point Campus"}'::jsonb);
INSERT INTO workflow_tasks (id, source_domain, source_entity_type, source_entity_id, deal_id, organisation_id, owner_id, account_id, title, summary, task_status, priority, assignee_name, assignee_team, queue_name, due_at, sla_due_at, completed_at, escalation_level, escalation_status, blocked_reason, deep_link, context_payload) VALUES (17, 'configuration', 'onboarding_task', 8, NULL, NULL, NULL, NULL, 'Confirm proposed initial holding amount', 'Allocation amount remains indicative until IC approval.', 'new', 'medium', 'PMO - Allocations', 'Configuration', 'Onboarding', '2026-10-24T17:00:00Z', '2026-10-24T17:00:00Z', NULL, 'ham', 'on_track', '', '/configuration', '{"workflowStatus":"in_progress","taskType":"allocation","dealName":"Atlas Point Campus"}'::jsonb);

INSERT INTO notification_preferences (id, subscriber_name, subscriber_team, in_app_enabled, digest_enabled, digest_frequency, escalation_only, immediate_enabled, default_channel) VALUES (1, 'PM - Infrastructure', 'Portfolio Management', TRUE, TRUE, 'daily', FALSE, TRUE, 'in_app');
INSERT INTO notification_preferences (id, subscriber_name, subscriber_team, in_app_enabled, digest_enabled, digest_frequency, escalation_only, immediate_enabled, default_channel) VALUES (2, 'HAM - Aurora', 'Compliance', TRUE, TRUE, 'daily', FALSE, TRUE, 'in_app');
INSERT INTO notification_preferences (id, subscriber_name, subscriber_team, in_app_enabled, digest_enabled, digest_frequency, escalation_only, immediate_enabled, default_channel) VALUES (3, 'Portfolio Ops', 'Configuration', TRUE, TRUE, 'daily', TRUE, TRUE, 'in_app');
INSERT INTO notification_preferences (id, subscriber_name, subscriber_team, in_app_enabled, digest_enabled, digest_frequency, escalation_only, immediate_enabled, default_channel) VALUES (4, 'Review - Tier 2', 'Credit Review', TRUE, FALSE, 'daily', FALSE, TRUE, 'in_app');

INSERT INTO notification_subscriptions (id, subscriber_name, subscriber_team, source_domain, deal_id, organisation_id, owner_id, account_id, severity_threshold, delivery_frequency, only_escalations, active, subscription_label) VALUES (1, 'PM - Infrastructure', 'Portfolio Management', 'risk', NULL, NULL, NULL, NULL, 'high', 'immediate', TRUE, TRUE, 'High-severity risk escalations');
INSERT INTO notification_subscriptions (id, subscriber_name, subscriber_team, source_domain, deal_id, organisation_id, owner_id, account_id, severity_threshold, delivery_frequency, only_escalations, active, subscription_label) VALUES (2, 'PM - Infrastructure', 'Portfolio Management', 'borrower_requests', NULL, NULL, NULL, NULL, 'medium', 'immediate', FALSE, TRUE, 'Borrower requests and decisions');
INSERT INTO notification_subscriptions (id, subscriber_name, subscriber_team, source_domain, deal_id, organisation_id, owner_id, account_id, severity_threshold, delivery_frequency, only_escalations, active, subscription_label) VALUES (3, 'HAM - Aurora', 'Compliance', 'compliance', 1, NULL, NULL, NULL, 'medium', 'immediate', FALSE, TRUE, 'Aurora compliance flow');
INSERT INTO notification_subscriptions (id, subscriber_name, subscriber_team, source_domain, deal_id, organisation_id, owner_id, account_id, severity_threshold, delivery_frequency, only_escalations, active, subscription_label) VALUES (4, 'Portfolio Ops', 'Configuration', 'configuration', NULL, 2, 3, 4, 'medium', 'daily_digest', TRUE, TRUE, 'Northbridge onboarding and tactical allocation');
INSERT INTO notification_subscriptions (id, subscriber_name, subscriber_team, source_domain, deal_id, organisation_id, owner_id, account_id, severity_threshold, delivery_frequency, only_escalations, active, subscription_label) VALUES (5, 'Review - Tier 2', 'Credit Review', 'review', NULL, NULL, NULL, NULL, 'medium', 'immediate', FALSE, TRUE, 'Tier 2 review queue');

INSERT INTO notification_events (id, event_key, source_domain, source_entity_type, source_entity_id, workflow_task_id, event_type, severity, deal_id, organisation_id, owner_id, account_id, title, summary, deep_link, payload, created_at) VALUES (1, 'review_item:2:task_escalated', 'review', 'review_item', 2, 2, 'task_escalated', 'high', 1, NULL, NULL, NULL, 'Aurora ratio review escalated', 'Senior DSCR reconciliation needs PM attention before the latest period can be finalized.', '/deals/aurora-prime-data-campus/periods/latest#reconciliation-seniorDscr', '{"queueName":"Tier 2 review","assigneeName":"Review - Tier 2"}'::jsonb, '2026-09-03T10:15:00Z');
INSERT INTO notification_events (id, event_key, source_domain, source_entity_type, source_entity_id, workflow_task_id, event_type, severity, deal_id, organisation_id, owner_id, account_id, title, summary, deep_link, payload, created_at) VALUES (2, 'compliance_case:1:task_overdue', 'compliance', 'compliance_case', 1, 3, 'task_overdue', 'high', 1, NULL, NULL, NULL, 'Aurora compliance case is overdue', 'The overdue compliance certificate still requires review and has breached its SLA.', '/deals/aurora-prime-data-campus', '{"queueName":"Compliance exceptions","assigneeName":"HAM - Aurora"}'::jsonb, '2026-08-24T17:10:00Z');
INSERT INTO notification_events (id, event_key, source_domain, source_entity_type, source_entity_id, workflow_task_id, event_type, severity, deal_id, organisation_id, owner_id, account_id, title, summary, deep_link, payload, created_at) VALUES (3, 'risk_register_entry:2:task_escalated', 'risk', 'risk_register_entry', 2, 7, 'task_escalated', 'high', 4, NULL, NULL, NULL, 'Ion Harbor risk remains escalated', 'Lease-up underperformance continues to drive watchlist pressure and blocked distribution posture.', '/deals/ion-harbor-campus/risk', '{"queueName":"Risk register","assigneeName":"HAM - Ion Harbor"}'::jsonb, '2026-09-01T09:00:00Z');
INSERT INTO notification_events (id, event_key, source_domain, source_entity_type, source_entity_id, workflow_task_id, event_type, severity, deal_id, organisation_id, owner_id, account_id, title, summary, deep_link, payload, created_at) VALUES (4, 'onboarding_task:4:task_escalated', 'configuration', 'onboarding_task', 4, 13, 'task_escalated', 'high', 2, 2, 3, 4, 'Northbridge tactical allocation needs committee action', 'Committee vote collection is still open and remains on the escalated onboarding queue.', '/configuration', '{"queueName":"Onboarding","assigneeName":"Portfolio Ops"}'::jsonb, '2026-09-02T08:00:00Z');
INSERT INTO notification_events (id, event_key, source_domain, source_entity_type, source_entity_id, workflow_task_id, event_type, severity, deal_id, organisation_id, owner_id, account_id, title, summary, deep_link, payload, created_at) VALUES (5, 'borrower_request:1:decision_recorded', 'borrower_requests', 'borrower_request', 1, 10, 'decision_recorded', 'high', 1, NULL, NULL, NULL, 'Aurora waiver decision recorded', 'The temporary distribution waiver was approved with conditions and routed into amendment tracking.', '/deals/aurora-prime-data-campus/requests', '{"queueName":"Consents and waivers","assigneeName":"PM - Infrastructure"}'::jsonb, '2026-09-06T12:10:00Z');

INSERT INTO notification_deliveries (id, notification_event_id, subscriber_name, subscriber_team, delivery_channel, delivery_frequency, delivery_status, delivered_at, seen_at, acknowledged_at, dismissed_at) VALUES (1, 1, 'Review - Tier 2', 'Credit Review', 'in_app', 'immediate', 'new', '2026-09-03T10:15:00Z', NULL, NULL, NULL);
INSERT INTO notification_deliveries (id, notification_event_id, subscriber_name, subscriber_team, delivery_channel, delivery_frequency, delivery_status, delivered_at, seen_at, acknowledged_at, dismissed_at) VALUES (2, 2, 'HAM - Aurora', 'Compliance', 'in_app', 'immediate', 'acknowledged', '2026-08-24T17:10:00Z', '2026-08-24T17:15:00Z', '2026-08-24T17:20:00Z', NULL);
INSERT INTO notification_deliveries (id, notification_event_id, subscriber_name, subscriber_team, delivery_channel, delivery_frequency, delivery_status, delivered_at, seen_at, acknowledged_at, dismissed_at) VALUES (3, 3, 'PM - Infrastructure', 'Portfolio Management', 'in_app', 'immediate', 'new', '2026-09-01T09:00:00Z', NULL, NULL, NULL);
INSERT INTO notification_deliveries (id, notification_event_id, subscriber_name, subscriber_team, delivery_channel, delivery_frequency, delivery_status, delivered_at, seen_at, acknowledged_at, dismissed_at) VALUES (4, 4, 'Portfolio Ops', 'Configuration', 'in_app', 'daily_digest', 'new', '2026-09-02T08:00:00Z', NULL, NULL, NULL);
INSERT INTO notification_deliveries (id, notification_event_id, subscriber_name, subscriber_team, delivery_channel, delivery_frequency, delivery_status, delivered_at, seen_at, acknowledged_at, dismissed_at) VALUES (5, 5, 'PM - Infrastructure', 'Portfolio Management', 'in_app', 'immediate', 'seen', '2026-09-06T12:10:00Z', '2026-09-06T12:30:00Z', NULL, NULL);

INSERT INTO notification_digests (id, subscriber_name, subscriber_team, digest_label, digest_frequency, delivery_channel, digest_status, item_count, summary, generated_at) VALUES (1, 'Portfolio Ops', 'Configuration', '2026-09-02 configuration digest', 'daily', 'in_app', 'queued', 1, 'One escalated onboarding task requires committee routing for the Northbridge tactical allocation.', '2026-09-02T18:00:00Z');
INSERT INTO notification_digests (id, subscriber_name, subscriber_team, digest_label, digest_frequency, delivery_channel, digest_status, item_count, summary, generated_at) VALUES (2, 'PM - Infrastructure', 'Portfolio Management', '2026-09-06 portfolio digest', 'daily', 'in_app', 'queued', 2, 'Aurora decision routing and Ion Harbor risk escalation require portfolio-management attention.', '2026-09-06T18:00:00Z');

INSERT INTO notification_digest_items (id, notification_digest_id, notification_delivery_id) VALUES (1, 1, 4);
INSERT INTO notification_digest_items (id, notification_digest_id, notification_delivery_id) VALUES (2, 2, 3);
INSERT INTO notification_digest_items (id, notification_digest_id, notification_delivery_id) VALUES (3, 2, 5);

INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (1, 'review', 'review_approved', 'review_item', 2, 1, NULL, NULL, NULL, 'Review - Tier 2', 'Aurora ratio reconciliation approved', 'Senior DSCR was approved after PM challenge and moved the latest period toward finalization.', '{"reviewStatus":"pending","reconciliationStatus":"pending_review"}'::jsonb, '{"reviewStatus":"approved","reconciliationStatus":"approved"}'::jsonb, '/deals/aurora-prime-data-campus/periods/latest#reconciliation-seniorDscr', '2026-09-03T11:20:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (2, 'compliance', 'triage_updated', 'incoming_document', 1, 1, NULL, NULL, NULL, 'HAM - Shared Inbox', 'Aurora compliance package moved to review', 'Inbox triage assigned the incoming compliance package to the review workflow.', '{"processingStatus":"triage_in_progress","currentStage":"matching"}'::jsonb, '{"processingStatus":"in_review","currentStage":"review"}'::jsonb, '/compliance/inbox', '2026-08-22T14:42:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (3, 'borrower_requests', 'decision_recorded', 'borrower_request', 1, 1, NULL, NULL, NULL, 'PM - Infrastructure Committee', 'Aurora waiver decision recorded', 'The temporary distribution waiver was approved with conditions and moved into amendment tracking.', '{"requestStatus":"pending_decision","decisionOutcome":"awaiting_committee"}'::jsonb, '{"requestStatus":"approved_with_conditions","decisionOutcome":"amendment_activated"}'::jsonb, '/deals/aurora-prime-data-campus/requests', '2026-09-06T12:10:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (4, 'amendments', 'amendment_activated', 'deal_amendment', 1, 1, NULL, NULL, NULL, 'PM - Infrastructure Committee', 'Aurora temporary distribution amendment activated', 'Approved waiver terms created an effective-dated covenant/distribution amendment.', '{"amendmentStatus":"pending"}'::jsonb, '{"amendmentStatus":"active","effectiveFrom":"2026-09-06"}'::jsonb, '/deals/aurora-prime-data-campus/amendments', '2026-09-06T12:14:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (5, 'snapshots', 'snapshot_captured', 'deal_topsheet_snapshot', 3, 1, NULL, NULL, NULL, 'HAM workspace', 'Aurora TopSheet snapshot captured', 'A manual TopSheet snapshot was captured after the waiver decision for audit and committee reference.', '{"snapshotCount":2}'::jsonb, '{"snapshotCount":3,"snapshotLabel":"Post-waiver monitoring snapshot"}'::jsonb, '/deals/aurora-prime-data-campus/snapshots', '2026-09-06T12:20:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (6, 'forecasts', 'forecast_version_activated', 'forecast_case_version', 2, 1, NULL, NULL, NULL, 'PM - Forecast Workspace', 'Aurora downside monitoring case activated', 'The active monitoring case was switched to a revised downside view and expected metrics were refreshed.', '{"activeForecastVersion":"Aurora Base Case v1"}'::jsonb, '{"activeForecastVersion":"Aurora Downside Case v2"}'::jsonb, '/deals/aurora-prime-data-campus/forecasts', '2026-09-07T09:30:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (7, 'configuration', 'onboarding_activated', 'onboarding_workflow', 1, 7, 4, 5, 6, 'PMO - Client Operations', 'Apollo onboarding activated', 'The proposed onboarding packet was activated into a live organisation, owner, account, holding, and monitored deal.', '{"workflowStatus":"approved_for_activation","holdingStatus":"proposed"}'::jsonb, '{"workflowStatus":"activated","holdingStatus":"active"}'::jsonb, '/configuration', '2026-09-12T10:25:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (8, 'risk', 'risk_review_escalated', 'risk_register_entry', 2, 4, NULL, NULL, NULL, 'PM - Infrastructure', 'Ion Harbor risk remained escalated', 'Lease-up underperformance kept the risk entry on the PM escalation path.', '{"status":"open","escalationLevel":"ham"}'::jsonb, '{"status":"open","escalationLevel":"pm"}'::jsonb, '/deals/ion-harbor-campus/risk', '2026-09-01T09:00:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (9, 'memo_packs', 'pack_generated', 'memo_pack', 2, 4, NULL, NULL, NULL, 'Credit Committee Workspace', 'Ion Harbor consent pack generated', 'A decision pack was generated for the Ion Harbor covenant-relief request.', '{"packStatus":"draft"}'::jsonb, '{"packStatus":"generated","packKind":"borrower_request_decision"}'::jsonb, '/deals/ion-harbor-campus/packs', '2026-08-25T15:10:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (10, 'notifications', 'delivery_acknowledged', 'notification_delivery', 2, 1, NULL, NULL, NULL, 'HAM - Aurora', 'Aurora overdue notification acknowledged', 'The overdue compliance notification was acknowledged in the in-app inbox.', '{"deliveryStatus":"new"}'::jsonb, '{"deliveryStatus":"acknowledged"}'::jsonb, '/notifications', '2026-08-24T17:20:00Z');
INSERT INTO activity_events (id, source_domain, event_type, entity_type, entity_id, deal_id, organisation_id, owner_id, account_id, actor_name, title, summary, before_state, after_state, deep_link, created_at) VALUES (11, 'portfolio', 'watchlist_pack_generated', 'memo_pack', 3, NULL, NULL, NULL, NULL, 'Portfolio Management', 'Portfolio watchlist committee pack generated', 'The latest portfolio watchlist pack was generated for committee circulation.', '{"packStatus":"draft"}'::jsonb, '{"packStatus":"generated","scope":"platform_watchlist"}'::jsonb, '/portfolio/packs', '2026-09-06T18:10:00Z');

UPDATE activity_events SET event_family = 'approval', audit_how = 'human_review' WHERE id IN (1, 3, 4);
UPDATE activity_events SET event_family = 'audit', audit_how = 'manual_capture' WHERE id = 5;
UPDATE activity_events SET event_family = 'workflow', audit_how = 'forecast_activation' WHERE id = 6;
UPDATE activity_events SET event_family = 'workflow', audit_how = 'onboarding_activation' WHERE id = 7;
UPDATE activity_events SET event_family = 'alerting', audit_how = 'inbox_action' WHERE id = 10;

UPDATE deal_topsheet_snapshots SET prior_snapshot_id = NULL, payload_hash = 'aurora-q1-seeded-hash' WHERE id = 1;
UPDATE deal_topsheet_snapshots SET prior_snapshot_id = 1, payload_hash = 'aurora-q2-seeded-hash' WHERE id = 2;
UPDATE deal_topsheet_snapshots SET prior_snapshot_id = NULL, payload_hash = 'granite-q2-seeded-hash' WHERE id = 3;
UPDATE deal_topsheet_snapshots SET prior_snapshot_id = NULL, payload_hash = 'apollo-activation-seeded-hash', trigger_event_id = 7 WHERE id = 4;
UPDATE deal_topsheet_snapshots SET prior_snapshot_id = 2, payload_hash = 'aurora-waiver-seeded-hash', trigger_event_id = 5 WHERE id = 5;

INSERT INTO topsheet_snapshot_provenance (id, snapshot_id, provenance_kind, source_entity_type, source_entity_id, source_label, source_event_id, payload, created_at) VALUES (1, 1, 'deal_state', 'deal', 1, 'Aurora Prime Data Campus', NULL, '{"periodLabel":"Q1 2026"}'::jsonb, '2026-05-15T09:00:00Z');
INSERT INTO topsheet_snapshot_provenance (id, snapshot_id, provenance_kind, source_entity_type, source_entity_id, source_label, source_event_id, payload, created_at) VALUES (2, 2, 'financial_period', 'financial_period', 2, 'Aurora Q2 2026 monitored period', NULL, '{"periodKey":"q2-2026"}'::jsonb, '2026-08-22T15:20:00Z');
INSERT INTO topsheet_snapshot_provenance (id, snapshot_id, provenance_kind, source_entity_type, source_entity_id, source_label, source_event_id, payload, created_at) VALUES (3, 4, 'trigger_event', 'activity_event', 7, 'Apollo onboarding activation', 7, '{"workflowStatus":"activated"}'::jsonb, '2026-09-12T10:25:00Z');
INSERT INTO topsheet_snapshot_provenance (id, snapshot_id, provenance_kind, source_entity_type, source_entity_id, source_label, source_event_id, payload, created_at) VALUES (4, 5, 'trigger_event', 'activity_event', 5, 'Aurora waiver snapshot capture', 5, '{"snapshotType":"rule_change"}'::jsonb, '2026-09-06T12:20:00Z');
INSERT INTO topsheet_snapshot_provenance (id, snapshot_id, provenance_kind, source_entity_type, source_entity_id, source_label, source_event_id, payload, created_at) VALUES (5, 5, 'amendment', 'deal_amendment', 1, 'Aurora temporary distribution amendment', 4, '{"effectiveFrom":"2026-09-06"}'::jsonb, '2026-09-06T12:14:00Z');

INSERT INTO snapshot_recomputations (id, snapshot_id, recomputed_at, recomputed_by, recomputation_status, expected_hash, actual_hash, divergence_summary, diff_payload) VALUES (1, 5, '2026-09-06T18:00:00Z', 'System recomputation check', 'diverged', 'aurora-waiver-seeded-hash', 'aurora-waiver-recomputed-hash', 'Seeded rule-change snapshot was recomputed after additional workflow updates and no longer matches byte-for-byte.', '{"stored":{"grade":"3 - Underperforming","distributionStatus":"review_required"},"recomputed":{"grade":"3 - Underperforming","distributionStatus":"review_required","openRequests":1}}'::jsonb);

INSERT INTO report_exports (id, export_scope, report_kind, export_status, review_status, release_status, export_format, title, summary, deal_id, financial_period_id, assessment_id, snapshot_id, report_schedule_id, organisation_id, owner_id, account_id, activity_source_domain, reviewed_by, approved_by, released_by, reviewed_at, approved_at, released_at, generated_by, generated_at) VALUES (1, 'deal', 'deal_monitoring', 'generated', 'approved', 'released', 'json', 'Aurora Prime Data Campus monitoring report', 'Quarter-end deal monitoring export covering the TopSheet, latest period, risk posture, requests, and distribution controls.', 1, 2, 1, 5, 1, NULL, NULL, NULL, NULL, 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'Distribution Ops', '2026-09-06T13:00:00Z', '2026-09-06T14:00:00Z', '2026-09-06T15:00:00Z', 'Reporting Workspace', '2026-09-06T12:30:00Z');
INSERT INTO report_exports (id, export_scope, report_kind, export_status, review_status, release_status, export_format, title, summary, deal_id, financial_period_id, assessment_id, snapshot_id, report_schedule_id, organisation_id, owner_id, account_id, activity_source_domain, reviewed_by, approved_by, released_by, reviewed_at, approved_at, released_at, generated_by, generated_at) VALUES (2, 'portfolio', 'portfolio_monitoring', 'generated', 'approved', 'released', 'json', 'Sesame Asset Management portfolio monitoring report', 'Portfolio monitoring export covering scoped exposure, watchlist concentration, blocked distributions, risks, and recent material events.', NULL, NULL, NULL, NULL, 2, NULL, NULL, NULL, NULL, 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'Distribution Ops', '2026-09-06T18:30:00Z', '2026-09-06T19:00:00Z', '2026-09-06T19:30:00Z', 'Reporting Workspace', '2026-09-06T18:20:00Z');
INSERT INTO report_exports (id, export_scope, report_kind, export_status, review_status, release_status, export_format, title, summary, deal_id, financial_period_id, assessment_id, snapshot_id, report_schedule_id, organisation_id, owner_id, account_id, activity_source_domain, reviewed_by, approved_by, released_by, reviewed_at, approved_at, released_at, generated_by, generated_at) VALUES (3, 'activity', 'activity_audit', 'generated', 'approved', 'released', 'json', 'Aurora Prime Data Campus audit timeline export', 'Deal-level audit export capturing approvals, decisions, amendments, snapshots, and inbox acknowledgements.', 1, NULL, NULL, NULL, 3, NULL, NULL, NULL, 'All domains', 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'Distribution Ops', '2026-09-06T18:45:00Z', '2026-09-06T19:05:00Z', '2026-09-06T19:20:00Z', 'Reporting Workspace', '2026-09-06T18:35:00Z');

INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (1, 1, 'topsheet_overview', 'TopSheet overview', 1, 'Core deal identity, grade, and distribution posture at the point of export.', '{"dealName":"Aurora Prime Data Campus","effectiveGrade":"3 - Underperforming","distributionStatus":"review_required","watchlistStatus":"enhanced_monitoring"}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (2, 1, 'latest_period', 'Latest period', 2, 'Approved reported metrics against the active monitoring case.', '{"periodLabel":"Q2 2026","reportedMetrics":{"revenue":24100000,"ebitda":12400000,"cfads":10800000,"debtService":8200000},"expectedMetrics":{"revenue":25800000,"ebitda":13200000,"cfads":11300000,"debtService":8180000}}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (3, 1, 'risk_and_requests', 'Risk and requests', 3, 'Open risk posture, borrower-request state, and active amendment controls.', '{"openRisks":1,"highSeverityRisks":1,"openRequests":1,"activeAmendments":1}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (4, 1, 'recent_activity', 'Recent activity', 4, 'Most recent material workflow changes for the deal.', '{"events":["Waiver decision recorded","Amendment activated","Snapshot captured"]}'::jsonb);

INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (5, 2, 'portfolio_summary', 'Portfolio summary', 1, 'High-level portfolio monitoring summary for the platform scope.', '{"scopeTitle":"Sesame Asset Management","dealCount":7,"watchlistCount":2,"blockedDistributions":1,"totalExposure":399000000}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (6, 2, 'watchlist_and_distribution', 'Watchlist and distribution', 2, 'Names driving current watchlist and blocked distribution attention.', '{"watchlistDeals":["Aurora Prime Data Campus","Ion Harbor Campus"],"blockedDistributions":["Ion Harbor Campus"]}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (7, 2, 'risk_and_events', 'Risk and events', 3, 'High-severity risks and recent material workflow events in scope.', '{"topRisks":["Ion Harbor lease-up underperformance","Aurora ratio reconciliation"],"recentEvents":["Portfolio watchlist pack generated","Aurora waiver decision recorded"]}'::jsonb);

INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (8, 3, 'audit_scope', 'Audit scope', 1, 'Scope and timing of the exported deal activity timeline.', '{"dealName":"Aurora Prime Data Campus","eventCount":6,"exportedAt":"2026-09-06T18:35:00Z"}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (9, 3, 'event_log', 'Event log', 2, 'Chronological material events exported from the activity timeline.', '{"events":[{"title":"Aurora waiver decision recorded","actor":"PM - Infrastructure Committee"},{"title":"Aurora temporary distribution amendment activated","actor":"PM - Infrastructure Committee"},{"title":"Aurora TopSheet snapshot captured","actor":"HAM workspace"}]}'::jsonb);
INSERT INTO report_export_sections (id, report_export_id, section_key, section_title, display_order, summary, section_payload) VALUES (10, 3, 'before_after', 'Before / after summary', 3, 'Selected before/after state transitions for the exported period.', '{"transitions":[{"event":"decision_recorded","before":{"requestStatus":"pending_decision"},"after":{"requestStatus":"approved_with_conditions"}},{"event":"snapshot_captured","before":{"snapshotCount":2},"after":{"snapshotCount":3}}]}'::jsonb);

INSERT INTO report_schedules (id, schedule_scope, report_kind, cadence, schedule_status, schedule_label, owner_name, reviewer_name, approver_name, release_channel, distribution_mode, deal_id, organisation_id, owner_id, account_id, activity_source_domain, next_run_at, last_run_at, stale_after_days, notes) VALUES (1, 'deal', 'deal_monitoring', 'quarterly', 'active', 'Aurora quarterly monitoring report', 'Reporting Workspace', 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'portal', 'scheduled', 1, NULL, NULL, NULL, NULL, '2026-10-07T09:00:00Z', '2026-09-06T12:30:00Z', 10, 'Quarter-end borrower monitoring package for Aurora.');
INSERT INTO report_schedules (id, schedule_scope, report_kind, cadence, schedule_status, schedule_label, owner_name, reviewer_name, approver_name, release_channel, distribution_mode, deal_id, organisation_id, owner_id, account_id, activity_source_domain, next_run_at, last_run_at, stale_after_days, notes) VALUES (2, 'portfolio', 'portfolio_monitoring', 'monthly', 'active', 'Platform monthly monitoring report', 'Reporting Workspace', 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'portal', 'scheduled', NULL, NULL, NULL, NULL, NULL, '2026-10-01T08:00:00Z', '2026-09-06T18:20:00Z', 5, 'Monthly management and investor monitoring pack.');
INSERT INTO report_schedules (id, schedule_scope, report_kind, cadence, schedule_status, schedule_label, owner_name, reviewer_name, approver_name, release_channel, distribution_mode, deal_id, organisation_id, owner_id, account_id, activity_source_domain, next_run_at, last_run_at, stale_after_days, notes) VALUES (3, 'activity', 'activity_audit', 'monthly', 'active', 'Aurora audit timeline export', 'Reporting Workspace', 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'secure_share', 'scheduled', 1, NULL, NULL, NULL, 'All domains', '2026-10-03T10:00:00Z', '2026-09-06T18:35:00Z', 30, 'Monthly audit export covering all Aurora material events.');
INSERT INTO report_schedules (id, schedule_scope, report_kind, cadence, schedule_status, schedule_label, owner_name, reviewer_name, approver_name, release_channel, distribution_mode, deal_id, organisation_id, owner_id, account_id, activity_source_domain, next_run_at, last_run_at, stale_after_days, notes) VALUES (4, 'portfolio', 'activity_audit', 'weekly', 'active', 'Platform weekly risk-and-workflow audit export', 'Reporting Workspace', 'Portfolio Reporting Review', 'Head of Portfolio Reporting', 'secure_share', 'scheduled', NULL, NULL, NULL, NULL, 'risk', '2026-03-16T08:30:00Z', '2026-03-09T08:30:00Z', 7, 'Weekly risk-domain audit export for governance review.');

INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (1, 1, 'Aurora Relationship Team', 'internal_team', 'portal', 'portal://aurora-monitoring', TRUE);
INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (2, 1, 'County Pension Trustees', 'investor_group', 'portal', 'portal://county-pension/aurora', TRUE);
INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (3, 2, 'Sesame Executive Committee', 'internal_committee', 'portal', 'portal://sesame-exec/monthly-monitoring', TRUE);
INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (4, 2, 'County Pension Fund', 'investor_group', 'portal', 'portal://county-pension/monthly-monitoring', TRUE);
INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (5, 3, 'Internal Audit', 'audit_team', 'secure_share', 'share://internal-audit/aurora', TRUE);
INSERT INTO report_schedule_recipients (id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, active) VALUES (6, 4, 'Risk Governance Committee', 'governance_group', 'secure_share', 'share://governance/risk-audit', FALSE);

INSERT INTO report_generation_runs (id, report_schedule_id, report_export_id, run_status, trigger_mode, trigger_summary, started_at, completed_at, review_status, release_status) VALUES (1, 1, 1, 'completed', 'scheduled', 'Aurora quarterly monitoring schedule generated the Q3 monitoring export.', '2026-09-06T12:25:00Z', '2026-09-06T12:30:00Z', 'approved', 'released');
INSERT INTO report_generation_runs (id, report_schedule_id, report_export_id, run_status, trigger_mode, trigger_summary, started_at, completed_at, review_status, release_status) VALUES (2, 2, 2, 'completed', 'scheduled', 'Platform monthly schedule generated the September portfolio monitoring export.', '2026-09-06T18:15:00Z', '2026-09-06T18:20:00Z', 'approved', 'released');
INSERT INTO report_generation_runs (id, report_schedule_id, report_export_id, run_status, trigger_mode, trigger_summary, started_at, completed_at, review_status, release_status) VALUES (3, 3, 3, 'completed', 'scheduled', 'Aurora audit schedule generated the monthly activity export.', '2026-09-06T18:32:00Z', '2026-09-06T18:35:00Z', 'approved', 'released');
INSERT INTO report_generation_runs (id, report_schedule_id, report_export_id, run_status, trigger_mode, trigger_summary, started_at, completed_at, review_status, release_status) VALUES (4, 4, NULL, 'failed', 'scheduled', 'Weekly risk audit export could not be released because there were no active recipients on the schedule.', '2026-03-16T08:30:00Z', '2026-03-16T08:31:00Z', 'pending_review', 'delivery_blocked');

INSERT INTO report_delivery_logs (id, report_export_id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, delivery_status, delivered_at, opened_at, acknowledged_at, failure_reason) VALUES (1, 1, 1, 'Aurora Relationship Team', 'internal_team', 'portal', 'portal://aurora-monitoring', 'delivered', '2026-09-06T15:02:00Z', '2026-09-06T15:14:00Z', '2026-09-06T16:00:00Z', NULL);
INSERT INTO report_delivery_logs (id, report_export_id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, delivery_status, delivered_at, opened_at, acknowledged_at, failure_reason) VALUES (2, 1, 1, 'County Pension Trustees', 'investor_group', 'portal', 'portal://county-pension/aurora', 'delivered', '2026-09-06T15:04:00Z', NULL, NULL, NULL);
INSERT INTO report_delivery_logs (id, report_export_id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, delivery_status, delivered_at, opened_at, acknowledged_at, failure_reason) VALUES (3, 2, 2, 'Sesame Executive Committee', 'internal_committee', 'portal', 'portal://sesame-exec/monthly-monitoring', 'delivered', '2026-09-06T19:31:00Z', '2026-09-06T20:10:00Z', NULL, NULL);
INSERT INTO report_delivery_logs (id, report_export_id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, delivery_status, delivered_at, opened_at, acknowledged_at, failure_reason) VALUES (4, 2, 2, 'County Pension Fund', 'investor_group', 'portal', 'portal://county-pension/monthly-monitoring', 'delivered', '2026-09-06T19:33:00Z', NULL, NULL, NULL);
INSERT INTO report_delivery_logs (id, report_export_id, report_schedule_id, recipient_name, recipient_type, delivery_channel, destination, delivery_status, delivered_at, opened_at, acknowledged_at, failure_reason) VALUES (5, 3, 3, 'Internal Audit', 'audit_team', 'secure_share', 'share://internal-audit/aurora', 'delivered', '2026-09-06T19:22:00Z', '2026-09-07T09:00:00Z', '2026-09-07T09:30:00Z', NULL);

INSERT INTO report_delivery_exceptions (id, report_schedule_id, report_export_id, exception_type, severity, status, title, summary, owner_name, raised_at, resolved_at) VALUES (1, 4, NULL, 'missing_recipients', 'high', 'open', 'Weekly risk audit export has no active recipients', 'The scheduled weekly risk-domain audit export could not be released because the only configured recipient is inactive.', 'Reporting Workspace', '2026-03-16T08:31:00Z', NULL);
INSERT INTO report_delivery_exceptions (id, report_schedule_id, report_export_id, exception_type, severity, status, title, summary, owner_name, raised_at, resolved_at) VALUES (2, 1, 1, 'stale_open_acknowledgement', 'medium', 'open', 'Aurora investor delivery remains unopened', 'The County Pension Trustees portal delivery has not yet been opened, leaving the release trail incomplete.', 'Distribution Ops', '2026-09-07T10:00:00Z', NULL);

SELECT setval(pg_get_serial_sequence('deals', 'id'), COALESCE((SELECT MAX(id) FROM deals), 1), TRUE);
SELECT setval(pg_get_serial_sequence('platform_clients', 'id'), COALESCE((SELECT MAX(id) FROM platform_clients), 1), TRUE);
SELECT setval(pg_get_serial_sequence('organisations', 'id'), COALESCE((SELECT MAX(id) FROM organisations), 1), TRUE);
SELECT setval(pg_get_serial_sequence('portfolio_owners', 'id'), COALESCE((SELECT MAX(id) FROM portfolio_owners), 1), TRUE);
SELECT setval(pg_get_serial_sequence('accounts', 'id'), COALESCE((SELECT MAX(id) FROM accounts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('covenants', 'id'), COALESCE((SELECT MAX(id) FROM covenants), 1), TRUE);
SELECT setval(pg_get_serial_sequence('covenant_history', 'id'), COALESCE((SELECT MAX(id) FROM covenant_history), 1), TRUE);
SELECT setval(pg_get_serial_sequence('obligations', 'id'), COALESCE((SELECT MAX(id) FROM obligations), 1), TRUE);
SELECT setval(pg_get_serial_sequence('documents', 'id'), COALESCE((SELECT MAX(id) FROM documents), 1), TRUE);
SELECT setval(pg_get_serial_sequence('financial_periods', 'id'), COALESCE((SELECT MAX(id) FROM financial_periods), 1), TRUE);
SELECT setval(pg_get_serial_sequence('financial_variances', 'id'), COALESCE((SELECT MAX(id) FROM financial_variances), 1), TRUE);
SELECT setval(pg_get_serial_sequence('forecast_cases', 'id'), COALESCE((SELECT MAX(id) FROM forecast_cases), 1), TRUE);
SELECT setval(pg_get_serial_sequence('forecast_case_versions', 'id'), COALESCE((SELECT MAX(id) FROM forecast_case_versions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('forecast_case_periods', 'id'), COALESCE((SELECT MAX(id) FROM forecast_case_periods), 1), TRUE);
SELECT setval(pg_get_serial_sequence('forecast_refresh_impacts', 'id'), COALESCE((SELECT MAX(id) FROM forecast_refresh_impacts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('deal_assessments', 'id'), COALESCE((SELECT MAX(id) FROM deal_assessments), 1), TRUE);
SELECT setval(pg_get_serial_sequence('distribution_assessments', 'id'), COALESCE((SELECT MAX(id) FROM distribution_assessments), 1), TRUE);
SELECT setval(pg_get_serial_sequence('ratio_reconciliations', 'id'), COALESCE((SELECT MAX(id) FROM ratio_reconciliations), 1), TRUE);
SELECT setval(pg_get_serial_sequence('document_supersessions', 'id'), COALESCE((SELECT MAX(id) FROM document_supersessions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('trend_records', 'id'), COALESCE((SELECT MAX(id) FROM trend_records), 1), TRUE);
SELECT setval(pg_get_serial_sequence('watchlist_events', 'id'), COALESCE((SELECT MAX(id) FROM watchlist_events), 1), TRUE);
SELECT setval(pg_get_serial_sequence('grade_overrides', 'id'), COALESCE((SELECT MAX(id) FROM grade_overrides), 1), TRUE);
SELECT setval(pg_get_serial_sequence('holdings', 'id'), COALESCE((SELECT MAX(id) FROM holdings), 1), TRUE);
SELECT setval(pg_get_serial_sequence('incoming_documents', 'id'), COALESCE((SELECT MAX(id) FROM incoming_documents), 1), TRUE);
SELECT setval(pg_get_serial_sequence('incoming_document_proposals', 'id'), COALESCE((SELECT MAX(id) FROM incoming_document_proposals), 1), TRUE);
SELECT setval(pg_get_serial_sequence('ai_audit_logs', 'id'), COALESCE((SELECT MAX(id) FROM ai_audit_logs), 1), TRUE);
SELECT setval(pg_get_serial_sequence('evidence_citations', 'id'), COALESCE((SELECT MAX(id) FROM evidence_citations), 1), TRUE);
SELECT setval(pg_get_serial_sequence('document_processing_runs', 'id'), COALESCE((SELECT MAX(id) FROM document_processing_runs), 1), TRUE);
SELECT setval(pg_get_serial_sequence('obligation_fulfilments', 'id'), COALESCE((SELECT MAX(id) FROM obligation_fulfilments), 1), TRUE);
SELECT setval(pg_get_serial_sequence('compliance_cases', 'id'), COALESCE((SELECT MAX(id) FROM compliance_cases), 1), TRUE);
SELECT setval(pg_get_serial_sequence('compliance_alerts', 'id'), COALESCE((SELECT MAX(id) FROM compliance_alerts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('risk_register_entries', 'id'), COALESCE((SELECT MAX(id) FROM risk_register_entries), 1), TRUE);
SELECT setval(pg_get_serial_sequence('borrower_requests', 'id'), COALESCE((SELECT MAX(id) FROM borrower_requests), 1), TRUE);
SELECT setval(pg_get_serial_sequence('borrower_request_votes', 'id'), COALESCE((SELECT MAX(id) FROM borrower_request_votes), 1), TRUE);
SELECT setval(pg_get_serial_sequence('onboarding_workflows', 'id'), COALESCE((SELECT MAX(id) FROM onboarding_workflows), 1), TRUE);
SELECT setval(pg_get_serial_sequence('onboarding_tasks', 'id'), COALESCE((SELECT MAX(id) FROM onboarding_tasks), 1), TRUE);
SELECT setval(pg_get_serial_sequence('onboarding_activation_events', 'id'), COALESCE((SELECT MAX(id) FROM onboarding_activation_events), 1), TRUE);
SELECT setval(pg_get_serial_sequence('demo_clock', 'id'), COALESCE((SELECT MAX(id) FROM demo_clock), 1), TRUE);
SELECT setval(pg_get_serial_sequence('monitoring_cycles', 'id'), COALESCE((SELECT MAX(id) FROM monitoring_cycles), 1), TRUE);
SELECT setval(pg_get_serial_sequence('monitoring_cycle_events', 'id'), COALESCE((SELECT MAX(id) FROM monitoring_cycle_events), 1), TRUE);
SELECT setval(pg_get_serial_sequence('borrower_request_decisions', 'id'), COALESCE((SELECT MAX(id) FROM borrower_request_decisions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('deal_amendments', 'id'), COALESCE((SELECT MAX(id) FROM deal_amendments), 1), TRUE);
SELECT setval(pg_get_serial_sequence('amendment_rule_versions', 'id'), COALESCE((SELECT MAX(id) FROM amendment_rule_versions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('amendment_change_impacts', 'id'), COALESCE((SELECT MAX(id) FROM amendment_change_impacts), 1), TRUE);
SELECT setval(pg_get_serial_sequence('deal_topsheet_snapshots', 'id'), COALESCE((SELECT MAX(id) FROM deal_topsheet_snapshots), 1), TRUE);
SELECT setval(pg_get_serial_sequence('topsheet_snapshot_provenance', 'id'), COALESCE((SELECT MAX(id) FROM topsheet_snapshot_provenance), 1), TRUE);
SELECT setval(pg_get_serial_sequence('snapshot_recomputations', 'id'), COALESCE((SELECT MAX(id) FROM snapshot_recomputations), 1), TRUE);
SELECT setval(pg_get_serial_sequence('memo_packs', 'id'), COALESCE((SELECT MAX(id) FROM memo_packs), 1), TRUE);
SELECT setval(pg_get_serial_sequence('memo_pack_sections', 'id'), COALESCE((SELECT MAX(id) FROM memo_pack_sections), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_exports', 'id'), COALESCE((SELECT MAX(id) FROM report_exports), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_export_sections', 'id'), COALESCE((SELECT MAX(id) FROM report_export_sections), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_schedules', 'id'), COALESCE((SELECT MAX(id) FROM report_schedules), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_schedule_recipients', 'id'), COALESCE((SELECT MAX(id) FROM report_schedule_recipients), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_generation_runs', 'id'), COALESCE((SELECT MAX(id) FROM report_generation_runs), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_delivery_logs', 'id'), COALESCE((SELECT MAX(id) FROM report_delivery_logs), 1), TRUE);
SELECT setval(pg_get_serial_sequence('report_delivery_exceptions', 'id'), COALESCE((SELECT MAX(id) FROM report_delivery_exceptions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('review_items', 'id'), COALESCE((SELECT MAX(id) FROM review_items), 1), TRUE);
SELECT setval(pg_get_serial_sequence('workflow_tasks', 'id'), COALESCE((SELECT MAX(id) FROM workflow_tasks), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_preferences', 'id'), COALESCE((SELECT MAX(id) FROM notification_preferences), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_subscriptions', 'id'), COALESCE((SELECT MAX(id) FROM notification_subscriptions), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_events', 'id'), COALESCE((SELECT MAX(id) FROM notification_events), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_deliveries', 'id'), COALESCE((SELECT MAX(id) FROM notification_deliveries), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_digests', 'id'), COALESCE((SELECT MAX(id) FROM notification_digests), 1), TRUE);
SELECT setval(pg_get_serial_sequence('notification_digest_items', 'id'), COALESCE((SELECT MAX(id) FROM notification_digest_items), 1), TRUE);
SELECT setval(pg_get_serial_sequence('activity_events', 'id'), COALESCE((SELECT MAX(id) FROM activity_events), 1), TRUE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RISK REGISTER — taxonomy, deal register, history
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS risk_taxonomy (
    risk_id         TEXT PRIMARY KEY,
    risk_name       TEXT NOT NULL,
    category_code   TEXT NOT NULL,
    category_name   TEXT NOT NULL,
    category_number INTEGER NOT NULL,
    sub_sector      TEXT,
    description     TEXT,
    typical_sectors TEXT,
    key_indicators  TEXT,
    sort_order      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_tax_category ON risk_taxonomy(category_code);
CREATE INDEX IF NOT EXISTS idx_risk_tax_subsector ON risk_taxonomy(sub_sector);

CREATE TABLE IF NOT EXISTS deal_risk_register (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                     INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    risk_id                     TEXT NOT NULL REFERENCES risk_taxonomy(risk_id),

    status                      TEXT NOT NULL DEFAULT 'not_yet_assessed',

    likelihood                  INTEGER CHECK (likelihood BETWEEN 1 AND 5),
    severity                    INTEGER CHECK (severity BETWEEN 1 AND 6),

    risk_score                  INTEGER GENERATED ALWAYS AS (likelihood * severity) STORED,
    risk_level                  TEXT GENERATED ALWAYS AS (
        CASE
            WHEN likelihood * severity BETWEEN 1  AND 4  THEN 'low'
            WHEN likelihood * severity BETWEEN 5  AND 9  THEN 'moderate'
            WHEN likelihood * severity BETWEEN 10 AND 15 THEN 'high'
            WHEN likelihood * severity BETWEEN 16 AND 24 THEN 'critical'
            WHEN likelihood * severity BETWEEN 25 AND 30 THEN 'fatal'
            ELSE NULL
        END
    ) STORED,

    mitigation_party_score      TEXT CHECK (mitigation_party_score IN (
        'M1_none','M2_reputational','M3_contractual','M4_direct_economic','M5_rated_sovereign'
    )),
    mitigation_party_name       TEXT,
    mitigation_party_detail     TEXT,

    mitigation_capital_score    TEXT CHECK (mitigation_capital_score IN (
        'C1_none','C2_comfort','C3_contractual_backstop','C4_funded_reserve','C5_unconditional_guarantee'
    )),
    mitigation_capital_type     TEXT,
    mitigation_capital_provider TEXT,
    mitigation_capital_amount   DECIMAL,
    mitigation_capital_expiry   DATE,
    mitigation_capital_detail   TEXT,

    sensitised_at_origination   BOOLEAN DEFAULT FALSE,
    sensitivity_name            TEXT,
    stress_applied              TEXT,
    stress_dscr_min             DECIMAL,
    stress_dscr_max             DECIMAL,
    stress_dscr_avg             DECIMAL,
    stress_other_ratios         JSONB,
    stress_model_scenario       TEXT,

    monitoring_kpi              TEXT,
    monitoring_threshold        DECIMAL,

    trend                       TEXT DEFAULT 'new',
    commentary                  TEXT,

    assessed_by                 TEXT,
    assessed_at                 TIMESTAMPTZ,
    review_trigger              TEXT,
    prior_assessment_id         UUID REFERENCES deal_risk_register(id),

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(deal_id, risk_id)
);

CREATE INDEX IF NOT EXISTS idx_drr_deal    ON deal_risk_register(deal_id);
CREATE INDEX IF NOT EXISTS idx_drr_risk    ON deal_risk_register(risk_id);
CREATE INDEX IF NOT EXISTS idx_drr_status  ON deal_risk_register(status);
CREATE INDEX IF NOT EXISTS idx_drr_level   ON deal_risk_register(risk_level);
CREATE INDEX IF NOT EXISTS idx_drr_score   ON deal_risk_register(risk_score);

CREATE TABLE IF NOT EXISTS deal_risk_register_history (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id                     INTEGER NOT NULL,
    risk_id                     TEXT NOT NULL,
    likelihood                  INTEGER,
    severity                    INTEGER,
    risk_score                  INTEGER,
    risk_level                  TEXT,
    mitigation_party_score      TEXT,
    mitigation_capital_score    TEXT,
    trend                       TEXT,
    commentary                  TEXT,
    assessed_by                 TEXT,
    assessed_at                 TIMESTAMPTZ,
    review_trigger              TEXT,
    superseded_at               TIMESTAMPTZ DEFAULT NOW(),
    superseded_by               UUID REFERENCES deal_risk_register(id)
);

CREATE INDEX IF NOT EXISTS idx_drrh_deal ON deal_risk_register_history(deal_id);
CREATE INDEX IF NOT EXISTS idx_drrh_risk ON deal_risk_register_history(deal_id, risk_id);

-- Risk taxonomy seed data (226 risks)
INSERT INTO risk_taxonomy (risk_id, risk_name, category_code, category_name, category_number, sub_sector, sort_order) VALUES
-- Category 1: Credit & Financial Risk (15)
('RISK-CF-001','Revenue concentration','CF','Credit & Financial Risk',1,NULL,1),
('RISK-CF-002','Revenue cyclicality / volatility','CF','Credit & Financial Risk',1,NULL,2),
('RISK-CF-003','Revenue visibility','CF','Credit & Financial Risk',1,NULL,3),
('RISK-CF-004','Cost structure rigidity','CF','Credit & Financial Risk',1,NULL,4),
('RISK-CF-005','Margin compression','CF','Credit & Financial Risk',1,NULL,5),
('RISK-CF-006','Working capital volatility','CF','Credit & Financial Risk',1,NULL,6),
('RISK-CF-007','Capital expenditure requirements','CF','Credit & Financial Risk',1,NULL,7),
('RISK-CF-008','EBITDA quality / adjustment reliance','CF','Credit & Financial Risk',1,NULL,8),
('RISK-CF-009','Cash flow timing mismatch','CF','Credit & Financial Risk',1,NULL,9),
('RISK-CF-010','Leverage trajectory','CF','Credit & Financial Risk',1,NULL,10),
('RISK-CF-011','Interest rate exposure','CF','Credit & Financial Risk',1,NULL,11),
('RISK-CF-012','Currency exposure','CF','Credit & Financial Risk',1,NULL,12),
('RISK-CF-013','Pension / deferred obligations','CF','Credit & Financial Risk',1,NULL,13),
('RISK-CF-014','Tax risk','CF','Credit & Financial Risk',1,NULL,14),
('RISK-CF-015','Refinancing risk','CF','Credit & Financial Risk',1,NULL,15),
-- Category 2: Structural & Documentation Risk (11)
('RISK-ST-001','Covenant adequacy','ST','Structural & Documentation Risk',2,NULL,16),
('RISK-ST-002','Covenant leakage / EBITDA definition','ST','Structural & Documentation Risk',2,NULL,17),
('RISK-ST-003','Restricted payment controls','ST','Structural & Documentation Risk',2,NULL,18),
('RISK-ST-004','Permitted debt / incremental facilities','ST','Structural & Documentation Risk',2,NULL,19),
('RISK-ST-005','Security package','ST','Structural & Documentation Risk',2,NULL,20),
('RISK-ST-006','Intercreditor complexity','ST','Structural & Documentation Risk',2,NULL,21),
('RISK-ST-007','Amendment / waiver risk','ST','Structural & Documentation Risk',2,NULL,22),
('RISK-ST-008','Subordination / structural subordination','ST','Structural & Documentation Risk',2,NULL,23),
('RISK-ST-009','Change of control provisions','ST','Structural & Documentation Risk',2,NULL,24),
('RISK-ST-010','Governing law / enforcement jurisdiction','ST','Structural & Documentation Risk',2,NULL,25),
('RISK-ST-011','Matching adjustment eligibility','ST','Structural & Documentation Risk',2,NULL,26),
-- Category 3: Business & Operational Risk (15)
('RISK-OP-001','Management quality / key person','OP','Business & Operational Risk',3,NULL,27),
('RISK-OP-002','Competitive position','OP','Business & Operational Risk',3,NULL,28),
('RISK-OP-003','Technology / disruption risk','OP','Business & Operational Risk',3,NULL,29),
('RISK-OP-004','Supply chain risk','OP','Business & Operational Risk',3,NULL,30),
('RISK-OP-005','Operational concentration','OP','Business & Operational Risk',3,NULL,31),
('RISK-OP-006','Labour / workforce risk','OP','Business & Operational Risk',3,NULL,32),
('RISK-OP-007','Counterparty credit risk','OP','Business & Operational Risk',3,NULL,33),
('RISK-OP-008','Contract renewal / re-pricing risk','OP','Business & Operational Risk',3,NULL,34),
('RISK-OP-009','Equipment lifecycle / major component risk','OP','Business & Operational Risk',3,NULL,35),
('RISK-OP-010','Decommissioning / end-of-life cost risk','OP','Business & Operational Risk',3,NULL,36),
('RISK-OP-011','Health, safety & environmental','OP','Business & Operational Risk',3,NULL,37),
('RISK-OP-012','Cyber / IT risk','OP','Business & Operational Risk',3,NULL,38),
('RISK-OP-013','Insurance adequacy','OP','Business & Operational Risk',3,NULL,39),
('RISK-OP-014','Construction / completion risk','OP','Business & Operational Risk',3,NULL,40),
('RISK-OP-015','Performance / availability risk','OP','Business & Operational Risk',3,NULL,41),
-- Category 4: Market & Macroeconomic Risk (16)
('RISK-MK-001','Economic cycle exposure','MK','Market & Macroeconomic Risk',4,NULL,42),
('RISK-MK-002','Inflation exposure','MK','Market & Macroeconomic Risk',4,NULL,43),
('RISK-MK-003','Interest rate environment','MK','Market & Macroeconomic Risk',4,NULL,44),
('RISK-MK-004','Real estate market / valuation risk','MK','Market & Macroeconomic Risk',4,NULL,45),
('RISK-MK-005','Commodity / input price exposure','MK','Market & Macroeconomic Risk',4,NULL,46),
('RISK-MK-006','Output price / revenue price risk','MK','Market & Macroeconomic Risk',4,NULL,47),
('RISK-MK-007','Total addressable market (TAM) risk','MK','Market & Macroeconomic Risk',4,NULL,48),
('RISK-MK-008','Inter-modal / inter-product competition','MK','Market & Macroeconomic Risk',4,NULL,49),
('RISK-MK-009','Intra-modal / within-market competition','MK','Market & Macroeconomic Risk',4,NULL,50),
('RISK-MK-010','Market position / incumbent vs challenger','MK','Market & Macroeconomic Risk',4,NULL,51),
('RISK-MK-011','Disruptive technology / new entrant risk','MK','Market & Macroeconomic Risk',4,NULL,52),
('RISK-MK-012','Power / electricity price risk','MK','Market & Macroeconomic Risk',4,NULL,53),
('RISK-MK-013','Geopolitical / country risk','MK','Market & Macroeconomic Risk',4,NULL,54),
('RISK-MK-014','Liquidity / secondary market risk','MK','Market & Macroeconomic Risk',4,NULL,55),
('RISK-MK-015','Contagion / sector sentiment','MK','Market & Macroeconomic Risk',4,NULL,56),
('RISK-MK-016','Supply chain / equipment market risk','MK','Market & Macroeconomic Risk',4,NULL,57),
-- Category 5: Regulatory & Legal Risk (9)
('RISK-RL-001','Regulatory regime change','RL','Regulatory & Legal Risk',5,NULL,58),
('RISK-RL-002','Licence / concession risk','RL','Regulatory & Legal Risk',5,NULL,59),
('RISK-RL-003','Environmental regulation','RL','Regulatory & Legal Risk',5,NULL,60),
('RISK-RL-004','Tax law changes','RL','Regulatory & Legal Risk',5,NULL,61),
('RISK-RL-005','Employment / labour law changes','RL','Regulatory & Legal Risk',5,NULL,62),
('RISK-RL-006','Planning / permitting risk','RL','Regulatory & Legal Risk',5,NULL,63),
('RISK-RL-007','Litigation / claims exposure','RL','Regulatory & Legal Risk',5,NULL,64),
('RISK-RL-008','Sanctions / AML / KYC risk','RL','Regulatory & Legal Risk',5,NULL,65),
('RISK-RL-009','Data protection / privacy','RL','Regulatory & Legal Risk',5,NULL,66),
-- Category 6: ESG & Climate Risk (8)
('RISK-ESG-001','Physical climate risk','ESG','ESG & Climate Risk',6,NULL,67),
('RISK-ESG-002','Transition risk','ESG','ESG & Climate Risk',6,NULL,68),
('RISK-ESG-003','Biodiversity / natural capital','ESG','ESG & Climate Risk',6,NULL,69),
('RISK-ESG-004','Social licence / community relations','ESG','ESG & Climate Risk',6,NULL,70),
('RISK-ESG-005','Labour practices / human rights','ESG','ESG & Climate Risk',6,NULL,71),
('RISK-ESG-006','Corporate governance','ESG','ESG & Climate Risk',6,NULL,72),
('RISK-ESG-007','Sponsor / shareholder governance','ESG','ESG & Climate Risk',6,NULL,73),
('RISK-ESG-008','Greenwashing / taxonomy alignment','ESG','ESG & Climate Risk',6,NULL,74),
-- Category 7: Sector-Specific
-- 7A Solar (5)
('RISK-RE-001','Solar resource / irradiance risk','RE','Sector-Specific Risk',7,'7A: Renewable Energy — Solar',75),
('RISK-RE-002','Panel degradation','RE','Sector-Specific Risk',7,'7A: Renewable Energy — Solar',76),
('RISK-RE-003','Inverter failure / availability','RE','Sector-Specific Risk',7,'7A: Renewable Energy — Solar',77),
('RISK-RE-004','Soiling and shading','RE','Sector-Specific Risk',7,'7A: Renewable Energy — Solar',78),
('RISK-RE-005','Solar technology obsolescence','RE','Sector-Specific Risk',7,'7A: Renewable Energy — Solar',79),
-- 7B Wind (6)
('RISK-RE-011','Wind resource risk','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',80),
('RISK-RE-012','Turbine availability / reliability','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',81),
('RISK-RE-013','Blade erosion and fatigue','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',82),
('RISK-RE-014','Gearbox and drivetrain failure','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',83),
('RISK-RE-015','Wake effects and array losses','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',84),
('RISK-RE-016','Foundation and structural risk','RE','Sector-Specific Risk',7,'7B: Renewable Energy — Wind',85),
-- 7C Common Renewable (9)
('RISK-RE-021','Grid connection / curtailment risk','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',86),
('RISK-RE-022','PPA / offtake risk','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',87),
('RISK-RE-023','Merchant exposure / contract tail risk','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',88),
('RISK-RE-024','O&M contractor performance','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',89),
('RISK-RE-025','Major component reserve adequacy','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',90),
('RISK-RE-026','Land lease / site tenure risk','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',91),
('RISK-RE-027','Decommissioning cost and obligation','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',92),
('RISK-RE-028','Repowering optionality','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',93),
('RISK-RE-029','Climate change impact on resource','RE','Sector-Specific Risk',7,'7C: Renewable Energy — Common',94),
-- 7D Energy Storage (6)
('RISK-ES-001','Battery degradation / cycle life','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',95),
('RISK-ES-002','Revenue model uncertainty','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',96),
('RISK-ES-003','Technology obsolescence','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',97),
('RISK-ES-004','Fire and safety risk','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',98),
('RISK-ES-005','Augmentation cost and timing','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',99),
('RISK-ES-006','Grid services market evolution','ES','Sector-Specific Risk',7,'7D: Energy Storage / Battery',100),
-- 7E Energy Transition (7)
('RISK-ET-001','Green hydrogen production cost','ET','Sector-Specific Risk',7,'7E: Energy Transition',101),
('RISK-ET-002','Electrolyser performance and durability','ET','Sector-Specific Risk',7,'7E: Energy Transition',102),
('RISK-ET-003','Hydrogen offtake / demand risk','ET','Sector-Specific Risk',7,'7E: Energy Transition',103),
('RISK-ET-004','CCUS storage permanence','ET','Sector-Specific Risk',7,'7E: Energy Transition',104),
('RISK-ET-005','CCUS capture rate risk','ET','Sector-Specific Risk',7,'7E: Energy Transition',105),
('RISK-ET-006','Emerging technology scale-up risk','ET','Sector-Specific Risk',7,'7E: Energy Transition',106),
('RISK-ET-007','Policy / subsidy dependency','ET','Sector-Specific Risk',7,'7E: Energy Transition',107),
-- 7F Data Centres (9)
('RISK-DC-001','Power availability and cost','DC','Sector-Specific Risk',7,'7F: Data Centres',108),
('RISK-DC-002','Cooling infrastructure risk','DC','Sector-Specific Risk',7,'7F: Data Centres',109),
('RISK-DC-003','Customer concentration / hyperscaler dependency','DC','Sector-Specific Risk',7,'7F: Data Centres',110),
('RISK-DC-004','Technology density and obsolescence','DC','Sector-Specific Risk',7,'7F: Data Centres',111),
('RISK-DC-005','Location and connectivity risk','DC','Sector-Specific Risk',7,'7F: Data Centres',112),
('RISK-DC-006','Regulatory and planning risk','DC','Sector-Specific Risk',7,'7F: Data Centres',113),
('RISK-DC-007','Supply chain — critical equipment','DC','Sector-Specific Risk',7,'7F: Data Centres',114),
('RISK-DC-008','Demand sustainability / AI cycle risk','DC','Sector-Specific Risk',7,'7F: Data Centres',115),
('RISK-DC-009','Uptime and SLA risk','DC','Sector-Specific Risk',7,'7F: Data Centres',116),
-- 7G Telecoms (4)
('RISK-TC-001','Network technology obsolescence','TC','Sector-Specific Risk',7,'7G: Telecommunications',117),
('RISK-TC-002','Overbuild / competitive infrastructure','TC','Sector-Specific Risk',7,'7G: Telecommunications',118),
('RISK-TC-003','Take-up and penetration rate','TC','Sector-Specific Risk',7,'7G: Telecommunications',119),
('RISK-TC-004','Churn and ARPU pressure','TC','Sector-Specific Risk',7,'7G: Telecommunications',120),
-- 7H Rail (6)
('RISK-RA-001','Franchise / concession reversion risk','RA','Sector-Specific Risk',7,'7H: Rail',121),
('RISK-RA-002','Farebox / revenue risk','RA','Sector-Specific Risk',7,'7H: Rail',122),
('RISK-RA-003','Track access charges','RA','Sector-Specific Risk',7,'7H: Rail',123),
('RISK-RA-004','Subsidy dependency','RA','Sector-Specific Risk',7,'7H: Rail',124),
('RISK-RA-005','Timetable and capacity allocation','RA','Sector-Specific Risk',7,'7H: Rail',125),
('RISK-RA-006','Performance regime / penalties','RA','Sector-Specific Risk',7,'7H: Rail',126),
-- 7I Rolling Stock (6)
('RISK-RS-001','Residual value / re-leasing risk','RS','Sector-Specific Risk',7,'7I: Rolling Stock',127),
('RISK-RS-002','Single fleet / single operator risk','RS','Sector-Specific Risk',7,'7I: Rolling Stock',128),
('RISK-RS-003','Technological obsolescence','RS','Sector-Specific Risk',7,'7I: Rolling Stock',129),
('RISK-RS-004','Heavy maintenance cost escalation','RS','Sector-Specific Risk',7,'7I: Rolling Stock',130),
('RISK-RS-005','Availability guarantee','RS','Sector-Specific Risk',7,'7I: Rolling Stock',131),
('RISK-RS-006','Regulatory / safety compliance','RS','Sector-Specific Risk',7,'7I: Rolling Stock',132),
-- 7J Ports (7)
('RISK-PT-001','Cargo volume / throughput risk','PT','Sector-Specific Risk',7,'7J: Ports',133),
('RISK-PT-002','Competition from neighbouring ports','PT','Sector-Specific Risk',7,'7J: Ports',134),
('RISK-PT-003','Shipping line concentration','PT','Sector-Specific Risk',7,'7J: Ports',135),
('RISK-PT-004','Vessel size / infrastructure adequacy','PT','Sector-Specific Risk',7,'7J: Ports',136),
('RISK-PT-005','Landlord port — tenant credit and lease risk','PT','Sector-Specific Risk',7,'7J: Ports',137),
('RISK-PT-006','Dredging and maritime access','PT','Sector-Specific Risk',7,'7J: Ports',138),
('RISK-PT-007','Environmental and decarbonisation','PT','Sector-Specific Risk',7,'7J: Ports',139),
-- 7K Airports (7)
('RISK-AP-001','Passenger volume risk','AP','Sector-Specific Risk',7,'7K: Airports',140),
('RISK-AP-002','Airline concentration and carrier dependency','AP','Sector-Specific Risk',7,'7K: Airports',141),
('RISK-AP-003','Aeronautical vs commercial revenue mix','AP','Sector-Specific Risk',7,'7K: Airports',142),
('RISK-AP-004','Capacity constraint / expansion risk','AP','Sector-Specific Risk',7,'7K: Airports',143),
('RISK-AP-005','Competition from other airports','AP','Sector-Specific Risk',7,'7K: Airports',144),
('RISK-AP-006','Noise, environment, and night flight restrictions','AP','Sector-Specific Risk',7,'7K: Airports',145),
('RISK-AP-007','Ground transport access','AP','Sector-Specific Risk',7,'7K: Airports',146),
-- 7L Roads (6)
('RISK-RD-001','Traffic volume risk (toll roads)','RD','Sector-Specific Risk',7,'7L: Roads',147),
('RISK-RD-002','Toll rate / escalation risk','RD','Sector-Specific Risk',7,'7L: Roads',148),
('RISK-RD-003','Availability payment mechanism','RD','Sector-Specific Risk',7,'7L: Roads',149),
('RISK-RD-004','Pavement lifecycle cost','RD','Sector-Specific Risk',7,'7L: Roads',150),
('RISK-RD-005','Competing route risk','RD','Sector-Specific Risk',7,'7L: Roads',151),
('RISK-RD-006','Winter maintenance / weather','RD','Sector-Specific Risk',7,'7L: Roads',152),
-- 7M Gas Utilities (5)
('RISK-GU-001','Demand decline from electrification','GU','Sector-Specific Risk',7,'7M: Gas Utilities',153),
('RISK-GU-002','RAB / regulatory price review risk','GU','Sector-Specific Risk',7,'7M: Gas Utilities',154),
('RISK-GU-003','Hydrogen conversion feasibility','GU','Sector-Specific Risk',7,'7M: Gas Utilities',155),
('RISK-GU-004','Leakage and safety','GU','Sector-Specific Risk',7,'7M: Gas Utilities',156),
('RISK-GU-005','Decommissioning and stranding','GU','Sector-Specific Risk',7,'7M: Gas Utilities',157),
-- 7N Electricity Utilities (5)
('RISK-EU-001','RAB / regulatory price review risk','EU','Sector-Specific Risk',7,'7N: Electricity Utilities',158),
('RISK-EU-002','Investment programme delivery','EU','Sector-Specific Risk',7,'7N: Electricity Utilities',159),
('RISK-EU-003','Connection queue and grid congestion','EU','Sector-Specific Risk',7,'7N: Electricity Utilities',160),
('RISK-EU-004','Weather and resilience','EU','Sector-Specific Risk',7,'7N: Electricity Utilities',161),
('RISK-EU-005','Distributed generation and demand-side response','EU','Sector-Specific Risk',7,'7N: Electricity Utilities',162),
-- 7O Pipelines (6)
('RISK-PL-001','Throughput / utilisation risk','PL','Sector-Specific Risk',7,'7O: Pipelines',163),
('RISK-PL-002','Tariff / regulated return risk','PL','Sector-Specific Risk',7,'7O: Pipelines',164),
('RISK-PL-003','Integrity and corrosion','PL','Sector-Specific Risk',7,'7O: Pipelines',165),
('RISK-PL-004','Environmental and permitting','PL','Sector-Specific Risk',7,'7O: Pipelines',166),
('RISK-PL-005','Stranding risk (hydrocarbon pipelines)','PL','Sector-Specific Risk',7,'7O: Pipelines',167),
('RISK-PL-006','Transmission line — right of way and EMF','PL','Sector-Specific Risk',7,'7O: Pipelines',168),
-- 7P Oil and Gas Storage (5)
('RISK-ST-101','Storage demand and utilisation','ST1','Sector-Specific Risk',7,'7P: Oil and Gas Storage',169),
('RISK-ST-102','Contango / spread risk','ST1','Sector-Specific Risk',7,'7P: Oil and Gas Storage',170),
('RISK-ST-103','Cavern / tank integrity','ST1','Sector-Specific Risk',7,'7P: Oil and Gas Storage',171),
('RISK-ST-104','Strategic storage mandate risk','ST1','Sector-Specific Risk',7,'7P: Oil and Gas Storage',172),
('RISK-ST-105','Transition risk','ST1','Sector-Specific Risk',7,'7P: Oil and Gas Storage',173),
-- 7Q Thermal Generation (7)
('RISK-TG-001','Dispatch / merit order risk','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',174),
('RISK-TG-002','Spark / dark / clean spread risk','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',175),
('RISK-TG-003','Carbon price and emission regulation','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',176),
('RISK-TG-004','Fuel supply risk','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',177),
('RISK-TG-005','Plant availability and efficiency','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',178),
('RISK-TG-006','Capacity market revenue risk','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',179),
('RISK-TG-007','Biomass sustainability and reputational risk','TG','Sector-Specific Risk',7,'7Q: Thermal Generation',180),
-- 7R Geothermal (5)
('RISK-GE-001','Reservoir / resource risk','GE','Sector-Specific Risk',7,'7R: Geothermal',181),
('RISK-GE-002','Drilling risk','GE','Sector-Specific Risk',7,'7R: Geothermal',182),
('RISK-GE-003','Scaling, corrosion, and fluid chemistry','GE','Sector-Specific Risk',7,'7R: Geothermal',183),
('RISK-GE-004','Induced seismicity','GE','Sector-Specific Risk',7,'7R: Geothermal',184),
('RISK-GE-005','Plant performance and heat rate','GE','Sector-Specific Risk',7,'7R: Geothermal',185),
-- 7S Power Grids (5)
('RISK-PG-001','Regulatory and revenue risk','PG','Sector-Specific Risk',7,'7S: Power Grids',186),
('RISK-PG-002','System operation complexity','PG','Sector-Specific Risk',7,'7S: Power Grids',187),
('RISK-PG-003','Major project delivery (HVDC, interconnectors)','PG','Sector-Specific Risk',7,'7S: Power Grids',188),
('RISK-PG-004','Interconnector merchant risk','PG','Sector-Specific Risk',7,'7S: Power Grids',189),
('RISK-PG-005','Cyber and physical security','PG','Sector-Specific Risk',7,'7S: Power Grids',190),
-- 7T Real Estate (10)
('RISK-RE-101','Office — remote working structural shift','REE','Sector-Specific Risk',7,'7T: Real Estate',191),
('RISK-RE-102','Retail — e-commerce displacement','REE','Sector-Specific Risk',7,'7T: Real Estate',192),
('RISK-RE-103','Logistics / industrial — supply chain reshoring','REE','Sector-Specific Risk',7,'7T: Real Estate',193),
('RISK-RE-104','Residential — affordability and regulation','REE','Sector-Specific Risk',7,'7T: Real Estate',194),
('RISK-RE-105','Student accommodation — demographic and policy','REE','Sector-Specific Risk',7,'7T: Real Estate',195),
('RISK-RE-106','Healthcare real estate — operator risk','REE','Sector-Specific Risk',7,'7T: Real Estate',196),
('RISK-RE-107','Hotels — cyclicality and brand','REE','Sector-Specific Risk',7,'7T: Real Estate',197),
('RISK-RE-108','Self-storage — maturity and saturation','REE','Sector-Specific Risk',7,'7T: Real Estate',198),
('RISK-RE-109','Mixed-use — complexity and cross-default','REE','Sector-Specific Risk',7,'7T: Real Estate',199),
('RISK-RE-110','Build quality / defects (new build)','REE','Sector-Specific Risk',7,'7T: Real Estate',200),
-- 7U Social Infrastructure (5)
('RISK-SI-001','PFI / PPP availability regime','SI','Sector-Specific Risk',7,'7U: Social Infrastructure',201),
('RISK-SI-002','Authority / public sector credit','SI','Sector-Specific Risk',7,'7U: Social Infrastructure',202),
('RISK-SI-003','Lifecycle cost escalation','SI','Sector-Specific Risk',7,'7U: Social Infrastructure',203),
('RISK-SI-004','Hand-back conditions','SI','Sector-Specific Risk',7,'7U: Social Infrastructure',204),
('RISK-SI-005','Demand risk (social housing)','SI','Sector-Specific Risk',7,'7U: Social Infrastructure',205),
-- 7V Other Sectors (6)
('RISK-OT-001','Resource / reserve risk','OT','Sector-Specific Risk',7,'7V: Other Sectors',206),
('RISK-OT-002','Healthcare reimbursement risk','OT','Sector-Specific Risk',7,'7V: Other Sectors',207),
('RISK-OT-003','Network / platform risk','OT','Sector-Specific Risk',7,'7V: Other Sectors',208),
('RISK-OT-004','Product liability / recall risk','OT','Sector-Specific Risk',7,'7V: Other Sectors',209),
('RISK-OT-005','Education — regulatory and fee risk','OT','Sector-Specific Risk',7,'7V: Other Sectors',210),
('RISK-OT-006','Leisure and entertainment — discretionary spend','OT','Sector-Specific Risk',7,'7V: Other Sectors',211),
-- 7W Energy from Waste (8)
('RISK-EW-001','Gate fee risk','EW','Sector-Specific Risk',7,'7W: Energy from Waste',212),
('RISK-EW-002','Waste volume / feedstock risk','EW','Sector-Specific Risk',7,'7W: Energy from Waste',213),
('RISK-EW-003','Calorific value variability','EW','Sector-Specific Risk',7,'7W: Energy from Waste',214),
('RISK-EW-004','Power / heat revenue','EW','Sector-Specific Risk',7,'7W: Energy from Waste',215),
('RISK-EW-005','Emissions and environmental regulation','EW','Sector-Specific Risk',7,'7W: Energy from Waste',216),
('RISK-EW-006','Residue disposal cost','EW','Sector-Specific Risk',7,'7W: Energy from Waste',217),
('RISK-EW-007','Technology / availability risk','EW','Sector-Specific Risk',7,'7W: Energy from Waste',218),
('RISK-EW-008','Contract renewal / merchant tail','EW','Sector-Specific Risk',7,'7W: Energy from Waste',219),
-- 7X Clean Tech Charging (7)
('RISK-EV-001','Utilisation / throughput risk','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',220),
('RISK-EV-002','Electricity procurement and demand charges','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',221),
('RISK-EV-003','Competition and pricing pressure','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',222),
('RISK-EV-004','Technology obsolescence / charging speed','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',223),
('RISK-EV-005','Grid connection and power capacity','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',224),
('RISK-EV-006','Site location and lease risk','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',225),
('RISK-EV-007','Regulatory and subsidy risk','EV','Sector-Specific Risk',7,'7X: Clean Tech Charging',226)
ON CONFLICT (risk_id) DO NOTHING;

-- Function to initialise risk register for a deal
CREATE OR REPLACE FUNCTION initialise_risk_register(p_deal_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    row_count INTEGER;
BEGIN
    INSERT INTO deal_risk_register (deal_id, risk_id, status)
    SELECT p_deal_id, risk_id, 'not_yet_assessed'
    FROM risk_taxonomy
    ON CONFLICT (deal_id, risk_id) DO NOTHING;
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RETURN row_count;
END;
$$ LANGUAGE plpgsql;

-- Initialise risk registers for all existing deals
SELECT initialise_risk_register(id) FROM deals;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DEAL STRUCTURE CHILD TABLES (Template 3 — table-format sheets)
-- Promotes JSONB fields on deals to proper relational tables for querying,
-- filtering, and maintaining structured data per the Integrated Platform Ref v2.2
-- ═══════════════════════════════════════════════════════════════════════════════

-- F.2A Capital Structure — one row per debt instrument per deal
CREATE TABLE IF NOT EXISTS capital_structure_instruments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    instrument_name     TEXT NOT NULL,
    instrument_type     TEXT NOT NULL,           -- senior_term, senior_rcf, capex_facility, junior_mezz, shl, bond, private_placement, other
    waterfall_priority  INTEGER NOT NULL,        -- 1 = most senior
    enforcement_class   TEXT,                    -- links to enforcement_classes.class_code
    committed_amount    DECIMAL,
    drawn_amount        DECIMAL,
    currency            VARCHAR(3),
    start_date          DATE,
    maturity_date       DATE,
    interest_type       TEXT,                    -- fixed, floating, index_linked, hybrid
    base_rate           TEXT,                    -- e.g. 'SONIA', 'SOFR', 'Euribor 3m'
    margin_bps          INTEGER,
    all_in_rate         DECIMAL,
    repayment_type      TEXT,                    -- bullet, amortising, sculpted, cash_sweep, hybrid
    amortisation_profile TEXT,
    call_protection     TEXT,
    our_holding         DECIMAL,                -- our share of this instrument
    our_holding_pct     DECIMAL,
    dsra_months         INTEGER,
    status              TEXT DEFAULT 'active',   -- active, repaid, cancelled, restructured
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_csi_deal ON capital_structure_instruments(deal_id);

-- F.2A.3 Enforcement Classes — one row per class per deal
CREATE TABLE IF NOT EXISTS enforcement_classes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    class_name          TEXT NOT NULL,
    class_code          TEXT NOT NULL,           -- e.g. 'A', 'B', 'Senior', 'Junior'
    priority            INTEGER NOT NULL,        -- 1 = most senior class
    included_instruments JSONB,                  -- [{instrument_name, instrument_type}]
    ratio_definitions   JSONB,                   -- [{ratio_name, numerator, denominator, description}]
    covenant_thresholds JSONB,                   -- [{ratio_name, lockup, trigger, default}]
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id, class_code)
);
CREATE INDEX IF NOT EXISTS idx_ec_deal ON enforcement_classes(deal_id);

-- F.2A.4 Entity Map — one row per corporate entity per deal
CREATE TABLE IF NOT EXISTS corporate_entities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    entity_name         TEXT NOT NULL,
    entity_type         TEXT NOT NULL,           -- opco, bidco, holdco, topco, spv, issuer, guarantor, servicer
    parent_entity       TEXT,                    -- name of parent in the structure
    position            TEXT,                    -- description of position in structure
    jurisdiction        VARCHAR(2),
    securitisation_boundary BOOLEAN DEFAULT FALSE,
    intercompany_loans  JSONB,                   -- [{from, to, amount, rate, subordinated}]
    ring_fenced         BOOLEAN DEFAULT FALSE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ce_deal ON corporate_entities(deal_id);

-- F.4 Counterparties — one row per counterparty per deal
CREATE TABLE IF NOT EXISTS deal_counterparties (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    counterparty_type   TEXT NOT NULL,           -- epc_contractor, o_and_m, offtaker, supplier, anchor_tenant, operator, servicer, facility_agent, security_trustee, hedging_provider, insurer, other
    credit_rating       TEXT,
    lei                 TEXT,
    dependency_narrative TEXT,                   -- how critical is this counterparty
    replacement_risk    TEXT,                    -- low, medium, high, critical
    contract_expiry     DATE,
    contract_value      DECIMAL,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcp_deal ON deal_counterparties(deal_id);

-- F.2A.2.6 Reserve Accounts — one row per reserve/facility per deal
CREATE TABLE IF NOT EXISTS deal_reserve_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    account_name        TEXT NOT NULL,
    account_type        TEXT NOT NULL,           -- dsra, mra, capex_reserve, o_and_m_reserve, distribution_reserve, liquidity_facility, letter_of_credit, other
    sizing_basis        TEXT,                    -- e.g. '6 months DS', '3 months opex', 'fixed amount'
    required_balance    DECIMAL,
    current_balance     DECIMAL,
    funded_status       TEXT DEFAULT 'fully_funded', -- fully_funded, partially_funded, unfunded, surplus
    funding_method      TEXT,                    -- cash, letter_of_credit, surety_bond, insurance
    provider            TEXT,                    -- provider of LC/surety if applicable
    provider_rating     TEXT,
    linked_instrument   TEXT,                    -- which debt instrument this reserve supports
    expiry              DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dra_deal ON deal_reserve_accounts(deal_id);

-- F.16 Hedge Portfolio — one row per hedge per deal
CREATE TABLE IF NOT EXISTS hedge_portfolio (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    hedge_type          TEXT NOT NULL,           -- interest_rate_swap, interest_rate_cap, interest_rate_floor, fx_forward, fx_option, inflation_swap, commodity_swap, other
    notional            DECIMAL,
    pct_of_debt         DECIMAL,
    start_date          DATE,
    maturity            DATE,
    fixed_rate          DECIMAL,                -- for IRS: the fixed leg rate
    strike              DECIMAL,                -- for caps/floors: the strike rate
    counterparty        TEXT,
    counterparty_rating TEXT,
    mark_to_market      DECIMAL,                -- current MTM value
    mtm_date            DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hp_deal ON hedge_portfolio(deal_id);

-- F.15 Development Phases — one row per phase per deal
CREATE TABLE IF NOT EXISTS deal_development_phases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    phase_name          TEXT NOT NULL,
    phase_number        INTEGER,
    capex_budget        DECIMAL,
    start_date          DATE,
    target_end_date     DATE,
    actual_end_date     DATE,
    status              TEXT DEFAULT 'not_started', -- not_started, in_progress, completed, delayed, cancelled
    actual_spend        DECIMAL,
    variance            DECIMAL,                -- budget - actual
    variance_pct        DECIMAL,
    description         TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ddp_deal ON deal_development_phases(deal_id);

-- F.14 Investor Allocations — one row per investor per deal
CREATE TABLE IF NOT EXISTS investor_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    investor_name       TEXT NOT NULL,
    account_mandate     TEXT,                    -- mandate/fund name
    tranche             TEXT,                    -- which instrument/tranche
    amount              DECIMAL,
    mandate_size        DECIMAL,                -- total mandate size
    pct_of_mandate      DECIMAL,                -- amount / mandate_size
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ia_deal ON investor_allocations(deal_id);

-- F.2A.8 Intercreditor Terms — one row per deal (could be on deals table but complex enough for its own)
CREATE TABLE IF NOT EXISTS intercreditor_terms (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    governing_law       TEXT,
    standstill_period   TEXT,                    -- e.g. '180 days', '12 months'
    turnover_provisions TEXT,                    -- description of turnover waterfall
    permitted_junior_payments TEXT,              -- what junior creditors can receive during standstill
    security_release_conditions TEXT,            -- conditions under which security can be released
    non_petition_clause BOOLEAN DEFAULT FALSE,
    enforcement_priority TEXT,                   -- description of enforcement hierarchy
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FINANCIAL TEMPLATE (Template 1 — line label configuration)
-- ═══════════════════════════════════════════════════════════════════════════════

-- One record per deal — stores the sector template and custom line labels
CREATE TABLE IF NOT EXISTS deal_financial_template (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id             INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    sector_template     TEXT,                    -- data_centre, wind_farm, port, airport, toll_road, social_infrastructure, real_estate, clean_tech_hub
    revenue_line_labels JSONB DEFAULT '[]',      -- up to 8 custom revenue line labels
    cost_line_labels    JSONB DEFAULT '[]',      -- up to 12 custom cost line labels
    capex_line_labels   JSONB DEFAULT '[]',      -- up to 5 custom capex line labels
    funding_line_labels JSONB DEFAULT '[]',      -- up to 2 custom other funding line labels
    ds_line_labels      JSONB DEFAULT '[]',      -- up to 2 custom other debt service line labels
    equity_line_labels  JSONB DEFAULT '[]',      -- up to 2 custom equity movement line labels
    sector_kpi_labels   JSONB DEFAULT '[]',      -- up to 10 sector KPI labels
    class_ratio_labels  JSONB DEFAULT '[]',      -- up to 4 class-based ratio labels
    rab_leverage_labels JSONB DEFAULT '[]',      -- up to 4 RAB-based leverage labels
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deal_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Demo deal child records
-- Populates the new child tables for the Aurora Prime Data Campus demo deal
-- ═══════════════════════════════════════════════════════════════════════════════

-- Capital structure for Aurora Prime (deal_id = 1)
INSERT INTO capital_structure_instruments (deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class, committed_amount, drawn_amount, currency, start_date, maturity_date, interest_type, base_rate, margin_bps, repayment_type, our_holding, our_holding_pct, dsra_months, status) VALUES
(1, 'Senior Term Loan A', 'senior_term', 1, 'Senior', 180000000, 180000000, 'GBP', '2023-03-15', '2033-03-15', 'floating', 'SONIA', 225, 'sculpted', 45000000, 25.0, 6, 'active'),
(1, 'Senior RCF', 'senior_rcf', 2, 'Senior', 20000000, 0, 'GBP', '2023-03-15', '2028-03-15', 'floating', 'SONIA', 200, 'bullet', 5000000, 25.0, NULL, 'active'),
(1, 'Capex Facility', 'capex_facility', 3, 'Senior', 30000000, 15000000, 'GBP', '2023-03-15', '2031-03-15', 'floating', 'SONIA', 275, 'amortising', 7500000, 25.0, NULL, 'active')
ON CONFLICT DO NOTHING;

-- Enforcement classes for Aurora Prime
INSERT INTO enforcement_classes (deal_id, class_name, class_code, priority, included_instruments, ratio_definitions, covenant_thresholds) VALUES
(1, 'Senior Class', 'Senior', 1, '[{"instrument_name":"Senior Term Loan A","instrument_type":"senior_term"},{"instrument_name":"Senior RCF","instrument_type":"senior_rcf"},{"instrument_name":"Capex Facility","instrument_type":"capex_facility"}]'::jsonb, '[{"ratio_name":"senior_quarterly_dscr","numerator":"CFADS","denominator":"Senior Debt Service"},{"ratio_name":"ltv_npv","numerator":"Senior Net Debt","denominator":"NPV of Cashflows"}]'::jsonb, '[{"ratio_name":"senior_quarterly_dscr","lockup":1.20,"trigger":1.10,"default":1.05},{"ratio_name":"ltv_npv","lockup":0.70,"trigger":0.80,"default":0.85}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Corporate entities for Aurora Prime
INSERT INTO corporate_entities (deal_id, entity_name, entity_type, parent_entity, position, jurisdiction, securitisation_boundary, ring_fenced) VALUES
(1, 'Aurora Prime Holdings Ltd', 'holdco', NULL, 'Top of structure — equity ownership', 'GB', FALSE, FALSE),
(1, 'Aurora Prime Data Campus Ltd', 'opco', 'Aurora Prime Holdings Ltd', 'Operating company — owns and operates data centre', 'GB', TRUE, TRUE),
(1, 'Aurora Prime Finance Ltd', 'spv', 'Aurora Prime Holdings Ltd', 'Issuer — borrower under facility agreement', 'GB', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Counterparties for Aurora Prime
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, credit_rating, dependency_narrative, replacement_risk, contract_expiry) VALUES
(1, 'Hyperion Cloud Services Inc', 'anchor_tenant', 'A-/Stable', 'Anchor tenant — 60% of contracted capacity on 10yr take-or-pay. Default would trigger covenant breach.', 'high', '2033-06-30'),
(1, 'TechVault Systems Ltd', 'anchor_tenant', 'BBB/Stable', 'Second tenant — 25% capacity on 7yr contract. Material but replaceable given location quality.', 'medium', '2030-09-30'),
(1, 'Meridian Power Solutions', 'supplier', 'A/Stable', 'Sole electricity supplier under 15yr PPA. Grid-connected with backup diesel.', 'medium', '2038-03-15'),
(1, 'DataOps International', 'o_and_m', 'BBB+/Stable', 'O&M contractor for mechanical/electrical systems. 5yr contract with 2yr extension option.', 'low', '2028-03-15'),
(1, 'Fluor Corporation', 'epc_contractor', 'BBB/Stable', 'EPC contractor for Phase 2 expansion. Fixed-price lump sum with LD regime.', 'low', '2025-12-31')
ON CONFLICT DO NOTHING;

-- Reserve accounts for Aurora Prime
INSERT INTO deal_reserve_accounts (deal_id, account_name, account_type, sizing_basis, required_balance, current_balance, funded_status, funding_method, linked_instrument) VALUES
(1, 'Debt Service Reserve Account', 'dsra', '6 months senior DS', 4500000, 4500000, 'fully_funded', 'cash', 'Senior Term Loan A'),
(1, 'Maintenance Reserve Account', 'mra', 'Independent engineer lifecycle model', 2000000, 1800000, 'partially_funded', 'cash', NULL),
(1, 'Capex Reserve', 'capex_reserve', 'Phase 2 expansion budget', 8000000, 3000000, 'partially_funded', 'cash', 'Capex Facility')
ON CONFLICT DO NOTHING;

-- Hedge portfolio for Aurora Prime
INSERT INTO hedge_portfolio (deal_id, hedge_type, notional, pct_of_debt, start_date, maturity, fixed_rate, counterparty, counterparty_rating, mark_to_market, mtm_date) VALUES
(1, 'interest_rate_swap', 180000000, 100.0, '2023-03-15', '2033-03-15', 3.45, 'Barclays Bank PLC', 'A/Stable', 2300000, '2025-12-31'),
(1, 'interest_rate_cap', 30000000, 100.0, '2023-03-15', '2031-03-15', 4.50, 'HSBC Holdings PLC', 'A+/Stable', 450000, '2025-12-31')
ON CONFLICT DO NOTHING;

-- Development phases for Aurora Prime
INSERT INTO deal_development_phases (deal_id, phase_name, phase_number, capex_budget, start_date, target_end_date, actual_end_date, status, actual_spend, variance, description) VALUES
(1, 'Phase 1 — Core Data Hall (4MW)', 1, 85000000, '2022-06-01', '2023-09-30', '2023-08-15', 'completed', 83500000, 1500000, 'Initial 4MW data hall with N+1 cooling, dual feed power, and edge network POP'),
(1, 'Phase 2 — Expansion (6MW)', 2, 110000000, '2024-01-15', '2025-06-30', NULL, 'in_progress', 65000000, NULL, 'Additional 6MW capacity, second data hall, enhanced cooling for high-density GPU workloads'),
(1, 'Phase 3 — Campus Completion (10MW)', 3, 95000000, '2025-09-01', '2027-03-31', NULL, 'not_started', 0, NULL, 'Final 10MW phase, campus-wide redundancy, on-site renewable generation')
ON CONFLICT DO NOTHING;

-- Investor allocations for Aurora Prime
INSERT INTO investor_allocations (deal_id, investor_name, account_mandate, tranche, amount, mandate_size, pct_of_mandate) VALUES
(1, 'Meridian Insurance Group', 'UK Infrastructure Debt Fund III', 'Senior Term Loan A', 45000000, 2500000000, 1.80),
(1, 'Sovereign Wealth Partners', 'Global Infrastructure Credit', 'Senior Term Loan A', 36000000, 8000000000, 0.45),
(1, 'Northern Pensions Consortium', 'Matching Adjustment Portfolio', 'Senior Term Loan A', 54000000, 1200000000, 4.50),
(1, 'Meridian Insurance Group', 'UK Infrastructure Debt Fund III', 'Capex Facility', 7500000, 2500000000, 0.30)
ON CONFLICT DO NOTHING;

-- Intercreditor terms for Aurora Prime
INSERT INTO intercreditor_terms (deal_id, governing_law, standstill_period, turnover_provisions, permitted_junior_payments, security_release_conditions, non_petition_clause, enforcement_priority) VALUES
(1, 'English law', '180 days from enforcement notice', 'All junior receipts turned over to senior waterfall during enforcement', 'Scheduled interest only; no principal, no PIK capitalisation during standstill', 'Requires 75% senior creditor consent; automatic on full senior repayment', TRUE, 'Senior agent leads enforcement; junior can accelerate only after standstill expiry and senior non-action for 30 days')
ON CONFLICT DO NOTHING;

-- Financial template for Aurora Prime (data centre sector)
INSERT INTO deal_financial_template (deal_id, sector_template, revenue_line_labels, cost_line_labels, capex_line_labels, sector_kpi_labels) VALUES
(1, 'data_centre',
 '["GPU/Compute Revenue","Colocation Revenue","Power Recharge","Connectivity Revenue","Managed Services","Storage Revenue","Edge Services","Other Revenue"]'::jsonb,
 '["Power Cost","Cooling Cost","Network/Connectivity","Managed Infrastructure Platform (MIP)","Facilities Management","Security & Access","Insurance","Land Lease / Rent","Management Fee","Marketing & Sales","General & Admin","Other Opex"]'::jsonb,
 '["IT Infrastructure","Power & Cooling Plant","Building & Civil Works","Network Equipment","Other Capex"]'::jsonb,
 '["Contracted Capacity (MW)","Leased Capacity (%)","PUE (Power Usage Effectiveness)","Weighted Average Lease Term (yrs)","Blended $/kW/month","GPU Utilisation (%)","Customer Concentration (top 3 %)","Availability (% uptime)","Carbon Intensity (tCO2e/MW)","Capex per MW Installed"]'::jsonb
)
ON CONFLICT DO NOTHING;
