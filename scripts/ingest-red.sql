-- ═══════════════════════════════════════════════════════════════════════════════
-- Project Beta — Residential PRS Portfolio — Full Deal Ingestion
-- Idempotent: uses ON CONFLICT DO NOTHING throughout
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_deal_id       INTEGER;
    v_fc_mgmt_id    INTEGER;   -- management forecast_case id
    v_fcv_mgmt_id   INTEGER;   -- management forecast_case_version id
    v_fc_credit_id  INTEGER;   -- credit forecast_case id
    v_fcv_credit_id INTEGER;   -- credit forecast_case_version id
    v_period_ids    INTEGER[];  -- array of reporting period IDs for FY Y1..FY Y5
BEGIN

-- ─── 1. DEAL ─────────────────────────────────────────────────────────────────
INSERT INTO deals (
    slug, name, borrower, sector, deal_type, region, currency,
    facility_amount, exposure, grade, watchlist, status, revenue_risk,
    summary, phase, deal_overview,
    latest_period_label, latest_period_end, latest_reported_at, next_test_date,
    metrics, country, sub_sector_label,
    borrower_legal_name, borrower_jurisdiction, borrower_registered_address,
    origination_date, maturity_date, fiscal_year_end_month,
    security_ranking, governing_law, sponsor_name, parent_group,
    ownership_structure, revenue_risk_composite, contracted_revenue_pct, merchant_revenue_pct,
    tail_anchor_type, tail_residual_value_treatment,
    renewal_profile, debt_repayment_from_renewal_pct,
    cash_cover_ratio, primary_collateral_ratio,
    internal_credit_score
) VALUES (
    'project-beta-prs',
    'Project Beta — Residential PRS Portfolio',
    'Borrower REIT S.A.',
    'Real Estate',
    'Acquisition Finance',
    'EMEA',
    'EUR',
    291000000,
    26000000,
    '2 - In Line',
    FALSE,
    'Monitoring',
    'P3-V3-D3',
    'Acquisition finance for a 21-asset Spanish residential PRS portfolio held via listed REIT. Senior secured facilities with bullet maturity and Fund Rental Guarantee providing ICR and DY floor. Sub-participation format via Bank 1.',
    'ramp_up',
    'Sponsor 1 (65%) and Sponsor 2 (35%) co-own Borrower REIT S.A., a listed Spanish REIT holding 8 PropCos with 21 residential assets. EUR 291mn senior secured facilities across three tranches (stabilised, refurbished, forward purchase) with bullet maturity June 2027. Our EUR 26mn participation is 100% of Facility B (refurbished assets). 100% hedged via IRS at 1.85% to maturity. Fund Rental Guarantee (at first demand, max EUR 10.5mn) provides ICR>=2.0x and DY>=6.0% floor. Full cross-collateralisation across portfolio. Security: first ranking mortgages over all 21 properties.',
    'FY Y2',
    '2024-12-31',
    '2024-03-15T00:00:00Z',
    '2025-06-30',
    '{}'::jsonb,
    'ES',
    'Residential PRS (Private Rented Sector)',
    'Borrower REIT S.A.',
    'ES',
    'Capital City, Spain',
    '2022-06-30',
    '2027-06-30',
    12,
    'Senior Secured',
    'Spanish',
    'Sponsor 1',
    'Sponsor 1 Parent',
    'Sponsor 1 (65%) and Sponsor 2 (35%) co-own Borrower REIT S.A. (listed Spanish REIT), which owns 8 Spanish PropCos holding 21 residential assets. Sub-participation format via Bank 1.',
    'P3-V3-D3',
    0,
    100,
    'asset_life',
    'retained_asset',
    'deep_market_repricing',
    100,
    'senior_dscr',
    'ltv',
    'Baa3'
)
ON CONFLICT (slug) DO NOTHING;

SELECT id INTO v_deal_id FROM deals WHERE slug = 'project-beta-prs';

-- ─── 2. JURISDICTIONS ────────────────────────────────────────────────────────
INSERT INTO deal_jurisdiction_splits (deal_id, country_code, country_name, activity_pct, activity_type, is_primary)
VALUES (v_deal_id, 'ES', 'Spain', 100, 'revenue', TRUE)
ON CONFLICT (deal_id, country_code, activity_type) DO NOTHING;

-- ─── 3. CORPORATE ENTITIES ──────────────────────────────────────────────────
INSERT INTO corporate_entities (deal_id, entity_name, entity_type, parent_entity, jurisdiction, ring_fenced, securitisation_boundary)
VALUES
(v_deal_id, 'Borrower REIT S.A.', 'holdco', NULL, 'ES', FALSE, FALSE),
(v_deal_id, 'PropCo 1 S.L.U', 'spv', 'Borrower REIT S.A.', 'ES', TRUE, TRUE),
(v_deal_id, 'PropCo 2 S.L.U', 'spv', 'Borrower REIT S.A.', 'ES', TRUE, TRUE),
(v_deal_id, 'PropCo 3 S.L.U', 'spv', 'Borrower REIT S.A.', 'ES', TRUE, TRUE),
(v_deal_id, 'PropCo 4 S.L.U', 'spv', 'Borrower REIT S.A.', 'ES', TRUE, TRUE),
(v_deal_id, 'PropCo 5 S.L.U', 'spv', 'Borrower REIT S.A.', 'ES', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── 4. CAPITAL STRUCTURE ────────────────────────────────────────────────────
INSERT INTO capital_structure_instruments (
    deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
    instrument_format, pari_passu_group,
    committed_amount, drawn_amount, currency, margin_bps, base_rate, interest_type,
    maturity_date, repayment_type, our_holding, our_holding_pct, status
) VALUES
(v_deal_id, 'Facility A — Stabilised Assets', 'senior_term', 1, 'Senior Secured',
 'loan', 'A', 100900000, 100900000, 'EUR', 140, 'Reference Rate 3M', 'floating',
 '2027-06-30'::date, 'bullet', 0, 0, 'active'),
(v_deal_id, 'Facility B — Refurbished Assets', 'senior_term', 1, 'Senior Secured',
 'loan', 'A', 26800000, 26800000, 'EUR', 140, 'Reference Rate 3M', 'floating',
 '2027-06-30'::date, 'bullet', 26000000, 100, 'active'),
(v_deal_id, 'Facility C — Forward Purchase Assets', 'senior_term', 1, 'Senior Secured',
 'loan', 'A', 163300000, 155100000, 'EUR', 140, 'Reference Rate 3M', 'floating',
 '2027-06-30'::date, 'bullet', 0, 0, 'active')
ON CONFLICT DO NOTHING;

-- ─── 5. RESERVE ACCOUNTS ────────────────────────────────────────────────────
INSERT INTO deal_reserve_accounts (
    deal_id, account_name, account_type, sizing_basis,
    required_balance, current_balance,
    cash_amount, lc_amount, pcg_amount, pcg_provider,
    funded_status, currency
) VALUES
(v_deal_id, 'Fund Rental Guarantee', 'pcg', 'Fund Rental Guarantee at first demand',
 10500000, 10500000,
 0, 0, 10500000, 'Sponsor 1 / Sponsor 2',
 'fully_funded', 'EUR')
ON CONFLICT DO NOTHING;

-- ─── 6. COUNTERPARTIES ──────────────────────────────────────────────────────
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, replacement_risk, dependency_narrative)
VALUES
(v_deal_id, 'Asset Manager 1', 'operator', 'high', 'Property and asset management across 21 residential assets. Key person dependency on Key Person 1.'),
(v_deal_id, 'Bank 1', 'facility_agent', 'low', 'Facility agent (UK) and security trustee (Spain). Sub-participation arranger.'),
(v_deal_id, 'Valuer 1', 'auditor', 'low', 'Independent valuer for annual portfolio valuations.'),
(v_deal_id, 'Sponsor 1', 'guarantor', 'medium', 'Fund Rental Guarantee provider (65% share). Provides ICR>=2.0x and DY>=6.0% floor.'),
(v_deal_id, 'Sponsor 2', 'guarantor', 'medium', 'Fund Rental Guarantee provider (35% share). Co-guarantor with Sponsor 1.')
ON CONFLICT DO NOTHING;

-- ─── 7. HEDGING ─────────────────────────────────────────────────────────────
INSERT INTO hedge_portfolio (deal_id, hedge_type, notional, pct_of_debt, fixed_rate, counterparty, maturity)
VALUES
(v_deal_id, 'interest_rate_swap', 291000000, 100, 1.85, 'Bank 1', '2027-06-30'::date)
ON CONFLICT DO NOTHING;

-- ─── 8. COVENANT THRESHOLDS ─────────────────────────────────────────────────
INSERT INTO covenant_thresholds (
    deal_id, covenant_name, ratio_name, covenant_category,
    test_type, direction, test_frequency, enforcement_class,
    default_level, equity_cure_available
) VALUES
(v_deal_id, 'LTV (Portfolio, Y1-3)', 'ltv', 'collateral_value',
 'hard_covenant', 'max', 'annual', 'Senior', 70, FALSE),
(v_deal_id, 'LTV (Portfolio, Y4-5)', 'ltv', 'collateral_value',
 'hard_covenant', 'max', 'annual', 'Senior', 67, FALSE),
(v_deal_id, 'ICR 12m Forward', 'icr', 'cash_flow_cover',
 'hard_covenant', 'min', 'annual', 'Senior', 1.5, FALSE),
(v_deal_id, 'DY 12m Forward', 'debt_yield', 'cash_flow_cover',
 'hard_covenant', 'min', 'annual', 'Senior', 5, FALSE),
(v_deal_id, 'LTV (REIT, Y1-3)', 'ltv', 'collateral_value',
 'hard_covenant', 'max', 'annual', 'Senior', 75, FALSE),
(v_deal_id, 'LTV (REIT, Y4-5)', 'ltv', 'collateral_value',
 'hard_covenant', 'max', 'annual', 'Senior', 73.5, FALSE)
ON CONFLICT DO NOTHING;

-- ─── 9. COVENANTS (main monitored) ─────────────────────────────────────────
INSERT INTO covenants (deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet, management_case_value, threshold_default)
VALUES (v_deal_id, 'FIN-ICR', 'ICR 12m Forward', 'icr', 1.8, 2.0, 1.7, 60.0, 'performing',
  'FY Y2 ICR at 1.8x based on EBITDA of EUR 16.6mn against senior interest of EUR 9.8mn. Rental Guarantee provides floor at 2.0x.',
  'EBITDA', 16600000, 'Senior Interest', 9800000, 1, 'Per management case FY Y2',
  1.8, 1.5)
ON CONFLICT DO NOTHING;

-- ─── 10. FINANCIAL TEMPLATE ─────────────────────────────────────────────────
INSERT INTO deal_financial_template (
    deal_id, sector_template,
    revenue_line_labels,
    cost_line_labels,
    capex_line_labels,
    sector_kpi_labels
) VALUES (
    v_deal_id, 'real_estate',
    '["GRI — Existing Leases","GRI — Speculative Leases","Other Income"]'::jsonb,
    '["Bad Debt","Non-Recoverable Charges","Void Costs","Asset Management Fees","Letting Fees"]'::jsonb,
    '["Maintenance Capex","Churn Capex"]'::jsonb,
    '["Occupancy Rate (%)","ERV (EUR/sqm/month)","NOI (EUR mn)","Debt Yield (%)","ICR excl. Rental Guarantee","LTV (%)","Churn Rate (%)","Debt/sqm (EUR)"]'::jsonb
)
ON CONFLICT (deal_id) DO NOTHING;

INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal) VALUES
(v_deal_id, 'revenue_1', 'GRI — Existing Leases', 1),
(v_deal_id, 'revenue_2', 'GRI — Speculative Leases', 2),
(v_deal_id, 'revenue_3', 'Other Income', 3),
(v_deal_id, 'cost_1', 'Bad Debt', 1),
(v_deal_id, 'cost_2', 'Non-Recoverable Charges', 2),
(v_deal_id, 'cost_3', 'Void Costs', 3),
(v_deal_id, 'cost_4', 'Asset Management Fees', 4),
(v_deal_id, 'cost_5', 'Letting Fees', 5),
(v_deal_id, 'capex_1', 'Maintenance Capex', 1),
(v_deal_id, 'capex_2', 'Churn Capex', 2),
(v_deal_id, 'sector_kpi_1', 'Occupancy Rate (%)', 1),
(v_deal_id, 'sector_kpi_2', 'ERV (EUR/sqm/month)', 2),
(v_deal_id, 'sector_kpi_3', 'NOI (EUR mn)', 3),
(v_deal_id, 'sector_kpi_4', 'Debt Yield (%)', 4),
(v_deal_id, 'sector_kpi_5', 'ICR excl. Rental Guarantee', 5),
(v_deal_id, 'sector_kpi_6', 'LTV (%)', 6),
(v_deal_id, 'sector_kpi_7', 'Churn Rate (%)', 7),
(v_deal_id, 'sector_kpi_8', 'Debt/sqm (EUR)', 8)
ON CONFLICT (deal_id, line_key) DO NOTHING;

-- ─── 11. CONSENT MECHANICS ──────────────────────────────────────────────────
INSERT INTO deal_consent_mechanics (
    deal_id, majority_threshold_pct, voting_basis
) VALUES (
    v_deal_id, 66.67, 'by_commitment'
)
ON CONFLICT (deal_id) DO NOTHING;

-- ─── 12. RISK REGISTER ─────────────────────────────────────────────────────
INSERT INTO risk_register_entries (deal_id, risk_id, risk_name, risk_category, title, summary, mitigant, likelihood, probability, severity, impact, score, trend, monitoring_kpi, owner_name, status, identified_at, next_review_date, opened_at)
SELECT v_deal_id, v.rid, v.rn, v.rc, v.rn, v.summ, 'See risk detail', v.l, v.l, v.s, v.s, v.sc, v.tr, v.mk, 'Portfolio Manager', 'active', NOW(), NOW() + INTERVAL '6 months', NOW()
FROM (VALUES
  ('RISK-RE-001','Lease-Up Risk (Occupancy)','Sector-Specific','Occupancy 87% at close vs 95% target. Forward purchases not yet delivered.',3,3,9,'stable','Occupancy %'),
  ('RISK-MK-001','Spanish Residential Market Correction','Market & Macro','Residential property values exposed to Spanish macro cycle. ERV at EUR 11/sqm/month needs to hold.',3,4,12,'stable','ERV'),
  ('RISK-CF-001','Refinancing Risk (5yr Bullet)','Credit & Financial','EUR 291mn bullet maturity June 2027. No scheduled amortisation. Fully dependent on refinancing.',3,4,12,'stable','LTV %'),
  ('RISK-RE-002','Key Person Risk (Asset Manager)','Sector-Specific','Asset Manager 1 co-owned 45% by Key Person 1 (former RE director at Investment Bank 1). Material key person dependency.',2,3,6,'stable','AM performance'),
  ('RISK-CF-002','Interest Rate Sensitivity','Credit & Financial','100% hedged at 1.85% swap rate to maturity. Refinancing rate risk at 2027.',2,3,6,'stable','All-in rate'),
  ('RISK-RE-003','Tenant Churn and Void Costs','Sector-Specific','Base case assumes 10% churn. Stress case 20%. Void costs sensitive to market conditions.',3,2,6,'stable','Churn Rate %'),
  ('RISK-RL-001','Spanish REIT Regulatory Requirements','Regulatory & Legal','Borrower REIT must maintain listed REIT status. Distribution requirements and asset disposal restrictions.',2,3,6,'stable','REIT compliance')
) AS v(rid, rn, rc, summ, l, s, sc, tr, mk)
ON CONFLICT DO NOTHING;

-- ─── 13. REPORTING SCHEDULE & PERIODS ───────────────────────────────────────
INSERT INTO deal_reporting_schedule (
    deal_id, periodicity, first_period_start, final_period_end,
    fiscal_year_end_month, reporting_lag_days
) VALUES (
    v_deal_id, 'annual', '2022-12-31', '2027-12-31', 12, 90
)
ON CONFLICT (deal_id) DO NOTHING;

INSERT INTO deal_reporting_periods (
    deal_id, period_flag, period_label, period_start, period_end,
    period_frequency, period_ordinal, period_type, data_status
) VALUES
(v_deal_id, 'FYY1', 'FY Y1', '2022-12-31', '2023-12-31', 'annual', 1, 'historical', 'approved'),
(v_deal_id, 'FYY2', 'FY Y2', '2023-12-31', '2024-12-31', 'annual', 2, 'historical', 'approved'),
(v_deal_id, 'FYY3', 'FY Y3', '2024-12-31', '2025-12-31', 'annual', 3, 'current', 'awaiting'),
(v_deal_id, 'FYY4', 'FY Y4', '2025-12-31', '2026-12-31', 'annual', 4, 'forecast', 'awaiting'),
(v_deal_id, 'FYY5', 'FY Y5', '2026-12-31', '2027-12-31', 'annual', 5, 'forecast', 'awaiting')
ON CONFLICT (deal_id, period_flag) DO NOTHING;

-- Collect period IDs in order for forecast insertion
SELECT ARRAY(
    SELECT id FROM deal_reporting_periods
    WHERE deal_id = v_deal_id
    ORDER BY period_ordinal
) INTO v_period_ids;

-- ─── 14. HOLDINGS ───────────────────────────────────────────────────────────
INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status)
VALUES
(3, v_deal_id, 16000000, '2022-06-30'::date, 'active'),
(5, v_deal_id, 10000000, '2022-06-30'::date, 'active')
ON CONFLICT DO NOTHING;

-- ─── 15. FORECAST CASES & VERSIONS ─────────────────────────────────────────
-- Management Case
INSERT INTO forecast_cases (
    deal_id, case_key, case_name, case_type,
    comparison_priority, drives_monitoring, owner_name, summary, created_at
) VALUES (
    v_deal_id, 'management_case', 'Management Case', 'management_case',
    1, TRUE, 'IC at origination',
    'IC approval management case for Project Beta residential PRS portfolio. 95% stabilised occupancy, EUR 11/sqm ERV, 10% churn assumption.',
    NOW()
)
ON CONFLICT (deal_id, case_key) DO NOTHING;

SELECT id INTO v_fc_mgmt_id FROM forecast_cases WHERE deal_id = v_deal_id AND case_key = 'management_case';

INSERT INTO forecast_case_versions (
    forecast_case_id, version_number, version_label, version_status,
    source_domain, summary, effective_from, activated_at, is_active
) VALUES (
    v_fc_mgmt_id, 1, 'IC Approval v1', 'active',
    'ic_memo', 'Original IC approval management case frozen at commitment.',
    '2022-06-30', NOW(), TRUE
)
ON CONFLICT (forecast_case_id, version_number) DO NOTHING;

SELECT id INTO v_fcv_mgmt_id FROM forecast_case_versions WHERE forecast_case_id = v_fc_mgmt_id AND version_number = 1;

-- Credit Case
INSERT INTO forecast_cases (
    deal_id, case_key, case_name, case_type,
    comparison_priority, drives_monitoring, owner_name, summary, created_at
) VALUES (
    v_deal_id, 'credit_case', 'Credit Case', 'credit_case',
    2, FALSE, 'IC at origination',
    'IC approval credit/stress case for Project Beta. 88% occupancy, EUR 9/sqm ERV, 20% churn, compressed margins.',
    NOW()
)
ON CONFLICT (deal_id, case_key) DO NOTHING;

SELECT id INTO v_fc_credit_id FROM forecast_cases WHERE deal_id = v_deal_id AND case_key = 'credit_case';

INSERT INTO forecast_case_versions (
    forecast_case_id, version_number, version_label, version_status,
    source_domain, summary, effective_from, activated_at, is_active
) VALUES (
    v_fc_credit_id, 1, 'IC Approval v1', 'active',
    'ic_memo', 'Original IC approval credit case frozen at commitment.',
    '2022-06-30', NOW(), TRUE
)
ON CONFLICT (forecast_case_id, version_number) DO NOTHING;

SELECT id INTO v_fcv_credit_id FROM forecast_case_versions WHERE forecast_case_id = v_fc_credit_id AND version_number = 1;

-- ─── 16. MANAGEMENT CASE FORECAST PERIOD ITEMS ─────────────────────────────
-- Period order: FY Y1(1), FY Y2(2), FY Y3(3), FY Y4(4), FY Y5(5)

-- revenue_1 (GRI Existing)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'revenue_1', 16800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'revenue_1', 15800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'revenue_1', 14800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'revenue_1', 13700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'revenue_1', 12500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- revenue_2 (GRI Speculative)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'revenue_2', 900000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'revenue_2', 5100000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'revenue_2', 7200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'revenue_2', 8800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'revenue_2', 10400000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_revenue
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'total_revenue', 17700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'total_revenue', 20900000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'total_revenue', 22000000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'total_revenue', 22500000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'total_revenue', 23000000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_1 (Bad Debt)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'cost_1', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'cost_1', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'cost_1', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'cost_1', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'cost_1', -200000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_2 (Non-Recoverable)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'cost_2', -3200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'cost_2', -3800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'cost_2', -4000000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'cost_2', -4000000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'cost_2', -4100000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_3 (Void Costs)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'cost_3', -700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'cost_3', -300000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'cost_3', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'cost_3', -200000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'cost_3', -200000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_operating_costs
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'total_operating_costs', -4100000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'total_operating_costs', -4300000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'total_operating_costs', -4400000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'total_operating_costs', -4400000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'total_operating_costs', -4500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ebitda
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'ebitda', 13600000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'ebitda', 16600000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'ebitda', 17600000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'ebitda', 18000000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'ebitda', 18400000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- capital_expenditure
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'capital_expenditure', -700000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_interest
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'senior_interest', -9800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'senior_interest', -9800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'senior_interest', -9800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'senior_interest', -9800000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'senior_interest', -9800000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ticking_commitment_fees
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'ticking_commitment_fees', -900000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'ticking_commitment_fees', -1000000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'ticking_commitment_fees', -1100000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'ticking_commitment_fees', -1100000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'ticking_commitment_fees', -1100000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- distributions
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'distributions', -2100000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'distributions', -4900000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'distributions', -5900000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'distributions', -6300000),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'distributions', -6600000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_dscr
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'senior_dscr', 2.3),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'senior_dscr', 1.8),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'senior_dscr', 1.9),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'senior_dscr', 2.0),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'senior_dscr', 2.0)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_1 (Occupancy %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_1', 87),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_1', 95),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_1', 95),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_1', 95),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_1', 95)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_2 (ERV)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_2', 11),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_2', 11),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_2', 11),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_2', 11),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_2', 11)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_3 (NOI)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_3', 13.6),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_3', 16.6),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_3', 17.6),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_3', 18.0),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_3', 18.4)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_4 (DY %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_4', 7.5),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_4', 6.1),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_4', 6.2),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_4', 6.3),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_4', 6.5)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_5 (ICR)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_5', 2.3),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_5', 1.8),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_5', 1.9),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_5', 2.0),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_5', 2.0)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_6 (LTV %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_6', 56.5)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_7 (Churn %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_7', 10),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_7', 10),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_7', 10),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_7', 10),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_7', 10)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_8 (Debt/sqm)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_mgmt_id, v_period_ids[1], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[2], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[3], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[4], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_mgmt_id, v_period_ids[5], 'sector_kpi_8', 1747)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ─── 17. CREDIT CASE FORECAST PERIOD ITEMS ──────────────────────────────────

-- revenue_1 (GRI Existing)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'revenue_1', 16700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'revenue_1', 14400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'revenue_1', 11900000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'revenue_1', 9400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'revenue_1', 6800000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- revenue_2 (GRI Speculative)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'revenue_2', 0),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'revenue_2', 3800000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'revenue_2', 6000000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'revenue_2', 8100000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'revenue_2', 10600000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_revenue
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'total_revenue', 16700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'total_revenue', 18200000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'total_revenue', 17900000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'total_revenue', 17700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'total_revenue', 17500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_1 (Bad Debt)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'cost_1', -300000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'cost_1', -400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'cost_1', -400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'cost_1', -400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'cost_1', -300000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_2 (Non-Recoverable)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'cost_2', -3300000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'cost_2', -3600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'cost_2', -3600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'cost_2', -3500000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'cost_2', -3500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_3 (Void Costs)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'cost_3', -1000000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'cost_3', -600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'cost_3', -600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'cost_3', -600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'cost_3', -700000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_operating_costs
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'total_operating_costs', -4600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'total_operating_costs', -4600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'total_operating_costs', -4600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'total_operating_costs', -4500000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'total_operating_costs', -4500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ebitda
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'ebitda', 12100000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'ebitda', 13500000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'ebitda', 13400000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'ebitda', 13200000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'ebitda', 13000000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- capital_expenditure
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'capital_expenditure', -700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'capital_expenditure', -700000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_interest
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'senior_interest', -9800000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'senior_interest', -9800000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'senior_interest', -9600000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'senior_interest', -9300000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'senior_interest', -9300000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_principal (only Y3 has non-zero)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'senior_principal', -10500000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ticking_commitment_fees
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'ticking_commitment_fees', -800000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'ticking_commitment_fees', -900000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'ticking_commitment_fees', -900000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'ticking_commitment_fees', -900000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'ticking_commitment_fees', -900000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- distributions
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'distributions', -500000),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'distributions', -1700000),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'distributions', -1800000),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'distributions', -2000000),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'distributions', -1800000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_dscr
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'senior_dscr', 2.0),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'senior_dscr', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'senior_dscr', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'senior_dscr', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'senior_dscr', 1.4)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_1 (Occupancy %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_1', 80),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_1', 88),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_1', 88),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_1', 88),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_1', 88)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_2 (ERV)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_2', 9),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_2', 9),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_2', 9),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_2', 9),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_2', 9)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_3 (NOI)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_3', 12.1),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_3', 13.5),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_3', 13.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_3', 13.2),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_3', 13.0)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_4 (DY %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_4', 6.0),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_4', 4.6),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_4', 4.7),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_4', 4.6),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_4', 4.5)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_5 (ICR)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_5', 1.8),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_5', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_5', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_5', 1.4),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_5', 1.4)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_6 (LTV %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_6', 56.5),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_6', 54.5),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_6', 54.5),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_6', 54.5)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_7 (Churn %)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_7', 20),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_7', 20),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_7', 20),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_7', 20),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_7', 20)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- sector_kpi_8 (Debt/sqm)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_credit_id, v_period_ids[1], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_credit_id, v_period_ids[2], 'sector_kpi_8', 1747),
(v_deal_id, v_fcv_credit_id, v_period_ids[3], 'sector_kpi_8', 1684),
(v_deal_id, v_fcv_credit_id, v_period_ids[4], 'sector_kpi_8', 1684),
(v_deal_id, v_fcv_credit_id, v_period_ids[5], 'sector_kpi_8', 1684)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ─── 18. BACKFILL ACTUALS (FY Y1 and FY Y2 from management case) ───────────
-- Historical periods get actual values in period_financial_items
INSERT INTO period_financial_items (deal_id, reporting_period_id, line_key, reported_value, approved_value, forecast_value, variance_to_forecast, value_origin, item_status) VALUES
-- FY Y1
(v_deal_id, v_period_ids[1], 'revenue_1', 16800000, 16800000, 16800000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'revenue_2', 900000, 900000, 900000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'total_revenue', 17700000, 17700000, 17700000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'cost_1', -200000, -200000, -200000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'cost_2', -3200000, -3200000, -3200000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'cost_3', -700000, -700000, -700000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'total_operating_costs', -4100000, -4100000, -4100000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'ebitda', 13600000, 13600000, 13600000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'capital_expenditure', -700000, -700000, -700000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'senior_interest', -9800000, -9800000, -9800000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[1], 'senior_dscr', 2.3, 2.3, 2.3, 0, 'extracted', 'approved'),
-- FY Y2
(v_deal_id, v_period_ids[2], 'revenue_1', 15800000, 15800000, 15800000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'revenue_2', 5100000, 5100000, 5100000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'total_revenue', 20900000, 20900000, 20900000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'cost_1', -200000, -200000, -200000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'cost_2', -3800000, -3800000, -3800000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'cost_3', -300000, -300000, -300000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'total_operating_costs', -4300000, -4300000, -4300000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'ebitda', 16600000, 16600000, 16600000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'capital_expenditure', -700000, -700000, -700000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'senior_interest', -9800000, -9800000, -9800000, 0, 'extracted', 'approved'),
(v_deal_id, v_period_ids[2], 'senior_dscr', 1.8, 1.8, 1.8, 0, 'extracted', 'approved')
ON CONFLICT (deal_id, reporting_period_id, line_key) DO NOTHING;

RAISE NOTICE 'Project Beta PRS ingestion complete. deal_id = %', v_deal_id;

END $$;

-- Verification query
SELECT id, slug, name, sector, borrower, exposure, facility_amount, grade, country
FROM deals WHERE slug = 'project-beta-prs';
