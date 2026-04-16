-- ═══════════════════════════════════════════════════════════════════════════════
-- Project Alpha – Borrower OpCo S.A. — Full Deal Ingestion
-- Idempotent: uses ON CONFLICT DO NOTHING throughout
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_deal_id       INTEGER;
    v_fc_id         INTEGER;   -- forecast_case id
    v_fcv_id        INTEGER;   -- forecast_case_version id
    v_period_ids    INTEGER[];  -- array of reporting period IDs for FY2023..FY2035
BEGIN

-- ─── 1. DEAL ─────────────────────────────────────────────────────────────────
INSERT INTO deals (
    slug, name, borrower, sector, deal_type, region, currency,
    facility_amount, exposure, grade, watchlist, status, revenue_risk,
    summary, phase, deal_overview,
    latest_period_label, latest_period_end, latest_reported_at, next_test_date,
    metrics
) VALUES (
    'project-alpha-port',
    'Project Alpha – Borrower OpCo S.A.',
    'Borrower OpCo S.A.',
    'Port',
    'Acquisition Finance',
    'EMEA',
    'EUR',
    222500000,          -- total facility
    55625000,           -- our exposure
    '2 - In Line',
    FALSE,
    'Monitoring',
    'P2-V3-D2',
    'Acquisition finance for a Spanish container and multipurpose port terminal operated under concession to 2044. Senior secured facilities with sculpted amortisation and 6-month DSRA.',
    'operational',
    'Sponsor 1 (2/3rds) and Sponsor 2 pension fund (1/3rd) acquired OpCo via BidCo/HoldCo structure. OpCo operates a container and multipurpose terminal under concession expiring Dec 2044. Revenue mix is 72% contracted / 28% merchant. Senior facilities total EUR 222.5m across term, capex, RCF and LC tranches. Our 25% participation amounts to EUR 55.6m.',
    'FY 2025',
    '2025-12-31',
    '2026-03-15T00:00:00Z',
    '2026-06-30',
    '{"revenue":132522000,"ebitda":28286000,"cfads":0,"debtService":0,"netDebt":175000000,"cash":8094478}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

SELECT id INTO v_deal_id FROM deals WHERE slug = 'project-alpha-port';

-- Set additional deal columns
UPDATE deals SET
    contracted_revenue_pct = 72,
    merchant_revenue_pct = 28,
    primary_contract_expiry = '2033-12-31',
    duration_coverage_pct = 420,
    borrower_registered_address = 'Port City, Spain',
    primary_business_country = 'ES',
    primary_business_country_name = 'Spain',
    security_ranking = 'Senior Secured',
    internal_credit_score = 'Ba1'
WHERE id = v_deal_id;

-- ─── 2. CAPITAL STRUCTURE ────────────────────────────────────────────────────
INSERT INTO capital_structure_instruments (
    deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
    committed_amount, drawn_amount, currency, start_date, maturity_date,
    interest_type, base_rate, margin_bps, repayment_type,
    our_holding, our_holding_pct, dsra_months, status,
    pari_passu_group, instrument_format
) VALUES
(v_deal_id, 'Facility A – Senior Term Loan', 'senior_term', 1, 'A',
 175000000, 175000000, 'EUR', '2023-06-30', '2028-06-30',
 'floating', 'Reference Rate', 350, 'sculpted',
 43750000, 25.0, 6, 'active', 'A', 'loan'),
(v_deal_id, 'Facility B – Capex Facility', 'capex_facility', 2, 'A',
 30000000, 0, 'EUR', '2023-06-30', '2028-06-30',
 'floating', 'Reference Rate', 350, 'bullet',
 7500000, 25.0, 0, 'active', 'A', 'loan'),
(v_deal_id, 'Facility C – Revolving WCF', 'senior_rcf', 3, 'A',
 10000000, 0, 'EUR', '2023-06-30', '2028-06-30',
 'floating', 'Reference Rate', 350, 'bullet',
 2500000, 25.0, 0, 'active', 'A', 'loan'),
(v_deal_id, 'Facility D – Letter of Credit', 'senior_term', 4, 'A',
 7500000, 0, 'EUR', '2023-06-30', '2028-06-30',
 'floating', 'Reference Rate', 350, 'bullet',
 1875000, 25.0, 0, 'active', 'A', 'loan')
ON CONFLICT DO NOTHING;

-- ─── 3. RESERVE ACCOUNTS ─────────────────────────────────────────────────────
INSERT INTO deal_reserve_accounts (
    deal_id, account_name, account_type, sizing_basis,
    required_balance, current_balance, funded_status, currency,
    cash_amount, lc_amount, pcg_amount
) VALUES
(v_deal_id, 'DSRA', 'dsra', '6 months avg annual DS',
 8094478, 8094478, 'fully_funded', 'EUR',
 8094478, 0, 0),
(v_deal_id, 'Lock-Up Account', 'lockup', 'Holds distributable cash',
 0, 0, 'fully_funded', 'EUR',
 0, 0, 0)
ON CONFLICT DO NOTHING;

-- ─── 4. COUNTERPARTIES ───────────────────────────────────────────────────────
INSERT INTO deal_counterparties (
    deal_id, name, counterparty_type, credit_rating,
    contract_expiry, replacement_risk, dependency_narrative
) VALUES
(v_deal_id, 'Offtaker 1', 'offtaker', 'BB-',
 '2033-12-31', 'high', 'Approximately 65% of container volumes under take-or-pay arrangement'),
(v_deal_id, 'Offtaker 2', 'offtaker', 'BB+',
 NULL, 'medium', 'Terminal B multipurpose operator'),
(v_deal_id, 'Concession Authority', 'offtaker', NULL,
 NULL, 'critical', 'Grantor of port concession expiring Dec 2044'),
(v_deal_id, 'Offtaker 3', 'offtaker', NULL,
 NULL, 'low', 'Approximately 5-6% of volume'),
(v_deal_id, 'Bank 1', 'facility_agent', NULL,
 NULL, 'low', 'Facility agent, security trustee, and account bank')
ON CONFLICT DO NOTHING;

-- ─── 5. HEDGING ──────────────────────────────────────────────────────────────
INSERT INTO hedge_portfolio (
    deal_id, hedge_type, pct_of_debt,
    counterparty, maturity
) VALUES
(v_deal_id, 'interest_rate_swap', 100,
 'MLAs (Bank 2, Bank 1, Bank 3) pro-rata', '2031-06-30')
ON CONFLICT DO NOTHING;

-- ─── 6. JURISDICTION SPLITS ──────────────────────────────────────────────────
INSERT INTO deal_jurisdiction_splits (
    deal_id, country_code, country_name, activity_pct, activity_type, is_primary
) VALUES
(v_deal_id, 'ES', 'Spain', 100.00, 'revenue', TRUE)
ON CONFLICT (deal_id, country_code, activity_type) DO NOTHING;

-- ─── 7. CORPORATE ENTITIES ──────────────────────────────────────────────────
INSERT INTO corporate_entities (
    deal_id, entity_name, entity_type, parent_entity,
    jurisdiction, ring_fenced, securitisation_boundary
) VALUES
(v_deal_id, 'Sponsor 1 BidCo S.L.', 'bidco', NULL,
 'ES', FALSE, TRUE),
(v_deal_id, 'Target HoldCo S.L.', 'holdco', 'Sponsor 1 BidCo S.L.',
 'ES', FALSE, FALSE),
(v_deal_id, 'Borrower OpCo S.A.', 'opco', 'Target HoldCo S.L.',
 'ES', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── 8. COVENANT THRESHOLDS ─────────────────────────────────────────────────
INSERT INTO covenant_thresholds (
    deal_id, covenant_name, ratio_name, covenant_category,
    test_type, direction, test_frequency, enforcement_class,
    lockup_level, default_level, equity_cure_available
) VALUES
(v_deal_id, 'Senior DSCR (backward & forward)', 'seniorDscr', 'cash_flow_cover',
 'hard_covenant', 'min', 'semi_annual', 'Senior',
 1.30, 1.10, TRUE),
(v_deal_id, 'LLCR', 'llcr', 'cash_flow_cover',
 'distribution_condition', 'min', 'semi_annual', 'Senior',
 1.60, NULL, FALSE),
(v_deal_id, 'Leverage Ratio (Year 1)', 'seniorNetDebtEbitda', 'collateral_value',
 'hard_covenant', 'max', 'semi_annual', 'Senior',
 8.0, 8.75, TRUE),
(v_deal_id, 'Leverage Ratio (Year 2)', 'seniorNetDebtEbitda', 'collateral_value',
 'hard_covenant', 'max', 'semi_annual', 'Senior',
 7.25, 8.0, TRUE),
(v_deal_id, 'Leverage Ratio (Year 3)', 'seniorNetDebtEbitda', 'collateral_value',
 'hard_covenant', 'max', 'semi_annual', 'Senior',
 6.5, 7.5, TRUE),
(v_deal_id, 'Leverage Ratio (Year 4)', 'seniorNetDebtEbitda', 'collateral_value',
 'hard_covenant', 'max', 'semi_annual', 'Senior',
 5.5, 7.0, TRUE)
ON CONFLICT DO NOTHING;

-- ─── 9. KPI SCENARIO SERIES ─────────────────────────────────────────────────
-- Held constant across all reporting periods; a real IC memo would vary by year.
-- Management case (IC baseline)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value)
SELECT v_deal_id, fcv.id, drp.id, kpi.kpi_key, kpi.value
FROM (VALUES
    ('sector_kpi_1', 1900.0),   -- TEU Throughput (000s)
    ('sector_kpi_2',   75.0),   -- Capacity Utilisation (%)
    ('sector_kpi_3',   45.0),   -- Gateway Share (%)
    ('sector_kpi_6',   65.0)    -- Offtaker 1 Concentration (%)
) AS kpi(kpi_key, value)
CROSS JOIN deal_reporting_periods drp
JOIN forecast_cases fc ON fc.deal_id = v_deal_id AND (fc.scenario_kind = 'management_case' OR fc.case_type = 'management_case')
JOIN forecast_case_versions fcv ON fcv.forecast_case_id = fc.id AND fcv.is_active = TRUE
WHERE drp.deal_id = v_deal_id
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- Combined downside — ensure a combined_downside forecast_case exists for this deal
INSERT INTO forecast_cases (deal_id, case_key, case_name, case_type, scenario_kind,
                            comparison_priority, drives_monitoring, owner_name, summary, created_at)
VALUES (v_deal_id, 'alpha-downside', 'Combined downside', 'combined_downside', 'combined_downside',
        3, FALSE, 'Credit Committee', 'Alpha combined-downside KPI floor.', NOW())
ON CONFLICT (deal_id, case_key) DO NOTHING;

INSERT INTO forecast_case_versions (forecast_case_id, version_number, version_label, version_status,
                                    source_domain, summary, effective_from, activated_at, is_active)
SELECT fc.id, 1, 'v1', 'active', 'pm_downside', 'IC-approved stress trajectory for Alpha KPIs.',
       CURRENT_DATE, NOW(), TRUE
FROM forecast_cases fc WHERE fc.deal_id = v_deal_id AND fc.case_key = 'alpha-downside'
ON CONFLICT (forecast_case_id, version_number) DO NOTHING;

INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value)
SELECT v_deal_id, fcv.id, drp.id, kpi.kpi_key, kpi.value
FROM (VALUES
    ('sector_kpi_1', 1600.0),  -- Throughput stress
    ('sector_kpi_2',   60.0)   -- Utilisation stress
) AS kpi(kpi_key, value)
CROSS JOIN deal_reporting_periods drp
JOIN forecast_cases fc ON fc.deal_id = v_deal_id AND fc.case_key = 'alpha-downside'
JOIN forecast_case_versions fcv ON fcv.forecast_case_id = fc.id AND fcv.is_active = TRUE
WHERE drp.deal_id = v_deal_id
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- KPI display labels
INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal, is_active) VALUES
(v_deal_id, 'sector_kpi_1', 'TEU Throughput (000s)',        1, TRUE),
(v_deal_id, 'sector_kpi_2', 'Capacity Utilisation (%)',     2, TRUE),
(v_deal_id, 'sector_kpi_3', 'Gateway Share (%)',            3, TRUE),
(v_deal_id, 'sector_kpi_4', 'Revenue per TEU (EUR)',        4, TRUE),
(v_deal_id, 'sector_kpi_5', 'EBITDA Margin (%)',            5, TRUE),
(v_deal_id, 'sector_kpi_6', 'Offtaker 1 Concentration (%)', 6, TRUE)
ON CONFLICT (deal_id, line_key) DO NOTHING;

-- ─── 10. FINANCIAL TEMPLATE ─────────────────────────────────────────────────
INSERT INTO deal_financial_template (
    deal_id, sector_template,
    revenue_line_labels,
    cost_line_labels,
    capex_line_labels,
    sector_kpi_labels
) VALUES (
    v_deal_id, 'port',
    '["Container Terminal Revenue (Terminal A)","Multipurpose Terminal Revenue (Terminal B)","Ancillary Services Revenue","Other Revenue"]'::jsonb,
    '["Stevedoring & Handling","Power & Utilities","Port Authority Fees","Labour Costs","Insurance","Maintenance & Repairs","Other Opex"]'::jsonb,
    '["Maintenance Capex","Concession Extension Capex (Terminal B)","Expansion Capex"]'::jsonb,
    '["TEU Throughput (000s)","Capacity Utilisation (%)","Gateway Share (%)","Revenue per TEU (EUR)","EBITDA Margin (%)","Offtaker 1 Concentration (%)"]'::jsonb
)
ON CONFLICT (deal_id) DO NOTHING;

-- Deal line item labels
INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal) VALUES
(v_deal_id, 'revenue_1', 'Container Terminal Revenue (Terminal A)', 1),
(v_deal_id, 'revenue_2', 'Multipurpose Terminal Revenue (Terminal B)', 2),
(v_deal_id, 'revenue_3', 'Ancillary Services Revenue', 3),
(v_deal_id, 'revenue_4', 'Other Revenue', 4),
(v_deal_id, 'cost_1', 'Stevedoring & Handling', 1),
(v_deal_id, 'cost_2', 'Power & Utilities', 2),
(v_deal_id, 'cost_3', 'Port Authority Fees', 3),
(v_deal_id, 'cost_4', 'Labour Costs', 4),
(v_deal_id, 'cost_5', 'Insurance', 5),
(v_deal_id, 'cost_6', 'Maintenance & Repairs', 6),
(v_deal_id, 'cost_7', 'Other Opex', 7),
(v_deal_id, 'capex_1', 'Maintenance Capex', 1),
(v_deal_id, 'capex_2', 'Concession Extension Capex (Terminal B)', 2),
(v_deal_id, 'capex_3', 'Expansion Capex', 3),
(v_deal_id, 'sector_kpi_1', 'TEU Throughput (000s)', 1),
(v_deal_id, 'sector_kpi_2', 'Capacity Utilisation (%)', 2),
(v_deal_id, 'sector_kpi_3', 'Gateway Share (%)', 3),
(v_deal_id, 'sector_kpi_4', 'Revenue per TEU (EUR)', 4),
(v_deal_id, 'sector_kpi_5', 'EBITDA Margin (%)', 5),
(v_deal_id, 'sector_kpi_6', 'Offtaker 1 Concentration (%)', 6)
ON CONFLICT (deal_id, line_key) DO NOTHING;

-- ─── 11. CONSENT MECHANICS ──────────────────────────────────────────────────
INSERT INTO deal_consent_mechanics (
    deal_id, majority_threshold_pct, voting_basis,
    all_lender_matters,
    snooze_you_lose, deemed_consent_on_silence, yank_clause,
    non_consenting_replacement_basis, standard_consent_period_days
) VALUES (
    v_deal_id, 66.67, 'by_commitment',
    '["Amendment of governing law","Hedging policy","Maturity extension","Security release","Change of borrower"]'::jsonb,
    TRUE, TRUE, TRUE,
    'par', 30
)
ON CONFLICT (deal_id) DO NOTHING;

-- ─── 12. RISK REGISTER ──────────────────────────────────────────────────────
-- First, insert any missing risk_taxonomy entries for custom IDs
INSERT INTO risk_taxonomy (risk_id, risk_name, category_code, category_name, category_number, sub_sector, sort_order) VALUES
('RISK-BO-003', 'Counterparty concentration', 'OP', 'Business & Operational Risk', 3, NULL, 233),
('RISK-BO-008', 'Increasing counterparty concentration', 'OP', 'Business & Operational Risk', 3, NULL, 234),
('RISK-SS-PORT', 'Transhipment volatility', 'PT', 'Sector-Specific Risk', 7, '7J: Ports', 235),
('RISK-MK-024', 'Forecast optimism - volumes', 'MK', 'Market & Macroeconomic Risk', 4, NULL, 236)
ON CONFLICT (risk_id) DO NOTHING;

-- Initialise risk register for the new deal (creates all 226+ entries)
PERFORM initialise_risk_register(v_deal_id);

-- Now update the specific assessed risks
UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 4,
    trend = 'stable',
    mitigation_party_score = 'M3_contractual',
    mitigation_capital_score = 'C1_none',
    commentary = 'Offtaker 1 accounts for approximately 65% of container volumes under take-or-pay arrangement'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-BO-003';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 3,
    trend = 'stable',
    mitigation_party_score = 'M1_none',
    mitigation_capital_score = 'C1_none',
    commentary = 'Refinancing risk on 2028 maturity'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-CF-012';

-- RISK-CF-012 is "Currency exposure" in taxonomy but user means refinancing risk
-- Use RISK-CF-015 which is "Refinancing risk" in the taxonomy
UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 3,
    trend = 'stable',
    mitigation_party_score = 'M1_none',
    mitigation_capital_score = 'C1_none',
    commentary = 'Refinancing risk on 2028 maturity'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-CF-015';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 4, severity = 3,
    trend = 'deteriorating',
    mitigation_party_score = 'M1_none',
    mitigation_capital_score = 'C1_none',
    commentary = 'Spanish GDP exposure and economic cycle risk'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-MK-001';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 2, severity = 4,
    trend = 'stable',
    mitigation_party_score = 'M3_contractual',
    mitigation_capital_score = 'C1_none',
    commentary = 'Terminal B concession extension risk'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-RL-005';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 3,
    trend = 'stable',
    mitigation_party_score = 'M1_none',
    mitigation_capital_score = 'C1_none',
    commentary = 'Forecast optimism on container throughput volumes'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-MK-024';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 3,
    trend = 'stable',
    mitigation_party_score = 'M2_reputational',
    mitigation_capital_score = 'C1_none',
    commentary = 'Transhipment volume volatility — sensitive to shipping line routing decisions'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-SS-PORT';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 3, severity = 3,
    trend = 'improving',
    mitigation_party_score = 'M3_contractual',
    mitigation_capital_score = 'C3_contractual_backstop',
    commentary = 'Entry leverage elevated at 8x+ but deleveraging on track'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-CF-001';

UPDATE deal_risk_register SET
    status = 'assessed',
    likelihood = 4, severity = 4,
    trend = 'deteriorating',
    mitigation_party_score = 'M3_contractual',
    mitigation_capital_score = 'C1_none',
    commentary = 'Offtaker 1 concentration increasing above 65% threshold'
WHERE deal_id = v_deal_id AND risk_id = 'RISK-BO-008';

-- ─── 13. REPORTING SCHEDULE & PERIODS ───────────────────────────────────────
INSERT INTO deal_reporting_schedule (
    deal_id, periodicity, first_period_start, final_period_end,
    fiscal_year_end_month, reporting_lag_days
) VALUES (
    v_deal_id, 'annual', '2023-01-01', '2035-12-31', 12, 45
)
ON CONFLICT (deal_id) DO NOTHING;

-- 13 annual periods: FY2023 to FY2035
INSERT INTO deal_reporting_periods (
    deal_id, period_flag, period_label, period_start, period_end,
    period_frequency, period_ordinal, data_status
) VALUES
(v_deal_id, 'FY2023', 'FY 2023', '2023-01-01', '2023-12-31', 'annual', 1, 'approved'),
(v_deal_id, 'FY2024', 'FY 2024', '2024-01-01', '2024-12-31', 'annual', 2, 'approved'),
(v_deal_id, 'FY2025', 'FY 2025', '2025-01-01', '2025-12-31', 'annual', 3, 'approved'),
(v_deal_id, 'FY2026', 'FY 2026', '2026-01-01', '2026-12-31', 'annual', 4, 'awaiting'),
(v_deal_id, 'FY2027', 'FY 2027', '2027-01-01', '2027-12-31', 'annual', 5, 'awaiting'),
(v_deal_id, 'FY2028', 'FY 2028', '2028-01-01', '2028-12-31', 'annual', 6, 'awaiting'),
(v_deal_id, 'FY2029', 'FY 2029', '2029-01-01', '2029-12-31', 'annual', 7, 'awaiting'),
(v_deal_id, 'FY2030', 'FY 2030', '2030-01-01', '2030-12-31', 'annual', 8, 'awaiting'),
(v_deal_id, 'FY2031', 'FY 2031', '2031-01-01', '2031-12-31', 'annual', 9, 'awaiting'),
(v_deal_id, 'FY2032', 'FY 2032', '2032-01-01', '2032-12-31', 'annual', 10, 'awaiting'),
(v_deal_id, 'FY2033', 'FY 2033', '2033-01-01', '2033-12-31', 'annual', 11, 'awaiting'),
(v_deal_id, 'FY2034', 'FY 2034', '2034-01-01', '2034-12-31', 'annual', 12, 'awaiting'),
(v_deal_id, 'FY2035', 'FY 2035', '2035-01-01', '2035-12-31', 'annual', 13, 'awaiting')
ON CONFLICT (deal_id, period_flag) DO NOTHING;

-- Collect period IDs in order for forecast insertion
SELECT ARRAY(
    SELECT id FROM deal_reporting_periods
    WHERE deal_id = v_deal_id
    ORDER BY period_ordinal
) INTO v_period_ids;

-- ─── 14. FORECAST CASE & VERSION ────────────────────────────────────────────
INSERT INTO forecast_cases (
    deal_id, case_key, case_name, case_type,
    comparison_priority, drives_monitoring, owner_name, summary, created_at
) VALUES (
    v_deal_id, 'alpha-mgmt', 'Project Alpha Management Case', 'management_case',
    1, TRUE, 'PM - Infrastructure',
    'IC approval management case for Project Alpha port acquisition.',
    '2023-06-30T00:00:00Z'
)
ON CONFLICT (deal_id, case_key) DO NOTHING;

SELECT id INTO v_fc_id FROM forecast_cases WHERE deal_id = v_deal_id AND case_key = 'alpha-mgmt';

INSERT INTO forecast_case_versions (
    forecast_case_id, version_number, version_label, version_status,
    source_domain, summary, effective_from, activated_at, is_active
) VALUES (
    v_fc_id, 1, 'IC Approval v1', 'active',
    'sponsor_model', 'Original IC approval management case frozen at commitment.',
    '2023-06-30', '2023-06-30T00:00:00Z', TRUE
)
ON CONFLICT (forecast_case_id, version_number) DO NOTHING;

SELECT id INTO v_fcv_id FROM forecast_case_versions WHERE forecast_case_id = v_fc_id AND version_number = 1;

-- ─── 15. FORECAST PERIOD ITEMS ──────────────────────────────────────────────
-- 13 periods × ~20 line items with non-zero values
-- Period order: FY2023(1), FY2024(2), ..., FY2035(13)

-- revenue_1
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'revenue_1', 106659000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'revenue_1', 108032000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'revenue_1', 112514000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'revenue_1', 118271000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'revenue_1', 125046000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'revenue_1', 132522000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'revenue_1', 140567000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'revenue_1', 149000000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'revenue_1', 158432000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'revenue_1', 170620000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'revenue_1', 176865000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'revenue_1', 169109000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'revenue_1', 178520000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_revenue
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'total_revenue', 106659000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'total_revenue', 108032000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'total_revenue', 112514000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'total_revenue', 118271000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'total_revenue', 125046000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'total_revenue', 132522000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'total_revenue', 140567000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'total_revenue', 149000000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'total_revenue', 158432000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'total_revenue', 170620000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'total_revenue', 176865000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'total_revenue', 169109000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'total_revenue', 178520000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_1 (Stevedoring)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_1', -48785000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_1', -49826000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_1', -51837000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_1', -54352000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_1', -56894000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_1', -59711000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_1', -62767000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_1', -66052000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_1', -69788000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_1', -74528000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_1', -78709000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_1', -79639000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_1', -84917000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_2 (Power & Utilities)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_2', -4666000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_2', -4751000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_2', -4958000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_2', -5225000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_2', -5479000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_2', -5761000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_2', -6066000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_2', -6393000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_2', -6768000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_2', -7259000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_2', -7671000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_2', -7680000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_2', -8213000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_3 (Port Authority Fees)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_3', -4134000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_3', -4181000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_3', -4281000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_3', -4401000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_3', -4537000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_3', -4686000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_3', -4847000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_3', -5019000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_3', -5209000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_3', -5442000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_3', -5602000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_3', -5586000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_3', -5798000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_4 (Labour Costs)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_4', -21188000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_4', -21717000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_4', -22288000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_4', -22884000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_4', -23522000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_4', -24206000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_4', -24940000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_4', -25723000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_4', -26562000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_4', -27459000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_4', -28420000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_4', -29415000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_4', -30445000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_5 (Insurance)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_5', -1459000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_5', -1481000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_5', -1511000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_5', -1544000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_5', -1578000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_5', -1615000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_5', -1655000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_5', -1699000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_5', -1747000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_5', -1802000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_5', -1856000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_5', -1895000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_5', -1956000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_6 (Maintenance & Repairs)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_6', -4020000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_6', -4053000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_6', -4186000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_6', -4368000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_6', -4534000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_6', -4720000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_6', -4920000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_6', -5134000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_6', -5435000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_6', -5771000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_6', -6037000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_6', -5983000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_6', -6335000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- cost_7 (Other Opex)
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'cost_7', -3244000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'cost_7', -3307000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'cost_7', -3358000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'cost_7', -3413000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'cost_7', -3472000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'cost_7', -3537000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'cost_7', -3607000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'cost_7', -3682000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'cost_7', -3764000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'cost_7', -3856000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'cost_7', -3951000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'cost_7', -4034000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'cost_7', -4137000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- total_operating_costs
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'total_operating_costs', -87496000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'total_operating_costs', -89316000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'total_operating_costs', -92419000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'total_operating_costs', -96187000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'total_operating_costs', -100015000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'total_operating_costs', -104235000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'total_operating_costs', -108802000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'total_operating_costs', -113701000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'total_operating_costs', -119272000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'total_operating_costs', -126116000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'total_operating_costs', -132247000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'total_operating_costs', -134232000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'total_operating_costs', -141801000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- ebitda
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'ebitda', 19163000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'ebitda', 18716000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'ebitda', 20094000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'ebitda', 22084000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'ebitda', 25031000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'ebitda', 28286000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'ebitda', 31765000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'ebitda', 35299000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'ebitda', 39159000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'ebitda', 44504000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'ebitda', 44619000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'ebitda', 34876000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'ebitda', 36719000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- capital_expenditure
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'capital_expenditure', -14910000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'capital_expenditure', -5386000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'capital_expenditure', -3332000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'capital_expenditure', -2629000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'capital_expenditure', -3579000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'capital_expenditure', -7990000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'capital_expenditure', -8691000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'capital_expenditure', -5860000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'capital_expenditure', -2907000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'capital_expenditure', -6886000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'capital_expenditure', -9526000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'capital_expenditure', -9764000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'capital_expenditure', -10008000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- working_capital_movement
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'working_capital_movement', 2348000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'working_capital_movement', 552000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'working_capital_movement', 1181000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'working_capital_movement', -445000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'working_capital_movement', 1152000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'working_capital_movement', -517000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'working_capital_movement', -535000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'working_capital_movement', -589000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'working_capital_movement', -629000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'working_capital_movement', -846000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'working_capital_movement', -157000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'working_capital_movement', 1122000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'working_capital_movement', -435000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- reserve_account_movements
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'reserve_account_movements', -6271000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'reserve_account_movements', 8679000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'reserve_account_movements', -784000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'reserve_account_movements', 366000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'reserve_account_movements', 38000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'reserve_account_movements', 9209000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'reserve_account_movements', 0),
(v_deal_id, v_fcv_id, v_period_ids[8], 'reserve_account_movements', 0),
(v_deal_id, v_fcv_id, v_period_ids[9], 'reserve_account_movements', 0),
(v_deal_id, v_fcv_id, v_period_ids[10], 'reserve_account_movements', 0),
(v_deal_id, v_fcv_id, v_period_ids[11], 'reserve_account_movements', 0),
(v_deal_id, v_fcv_id, v_period_ids[12], 'reserve_account_movements', -3154000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'reserve_account_movements', -16818000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- tax_paid
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'tax_paid', -931000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'tax_paid', -945000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'tax_paid', -903000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'tax_paid', -504000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'tax_paid', -189000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'tax_paid', 0),
(v_deal_id, v_fcv_id, v_period_ids[7], 'tax_paid', 0),
(v_deal_id, v_fcv_id, v_period_ids[8], 'tax_paid', 0),
(v_deal_id, v_fcv_id, v_period_ids[9], 'tax_paid', -460000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'tax_paid', -4946000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'tax_paid', -7673000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'tax_paid', -6162000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'tax_paid', -5986000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- interest_on_cash
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[2], 'interest_on_cash', 40000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'interest_on_cash', 65000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'interest_on_cash', 137000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'interest_on_cash', 188000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'interest_on_cash', 224000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_debt_drawdown
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'senior_debt_drawdown', 150000000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- capex_facility_drawdown
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'capex_facility_drawdown', 3627000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'capex_facility_drawdown', 4202000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'capex_facility_drawdown', 2129000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'capex_facility_drawdown', 1042000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- equity_drawdown
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'equity_drawdown', 10000000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_interest
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'senior_interest', -6930000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'senior_interest', -10854000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'senior_interest', -11525000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'senior_interest', -12135000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'senior_interest', -12614000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'senior_interest', -11633000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'senior_interest', -9799000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'senior_interest', -9031000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'senior_interest', -7773000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'senior_interest', -5667000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'senior_interest', -3726000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'senior_interest', -1648000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'senior_interest', -319000)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- senior_principal_sweep
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES
(v_deal_id, v_fcv_id, v_period_ids[1], 'senior_principal_sweep', -6033000),
(v_deal_id, v_fcv_id, v_period_ids[2], 'senior_principal_sweep', -5465000),
(v_deal_id, v_fcv_id, v_period_ids[3], 'senior_principal_sweep', -6797000),
(v_deal_id, v_fcv_id, v_period_ids[4], 'senior_principal_sweep', -7785000),
(v_deal_id, v_fcv_id, v_period_ids[5], 'senior_principal_sweep', -9892000),
(v_deal_id, v_fcv_id, v_period_ids[6], 'senior_principal_sweep', -17512000),
(v_deal_id, v_fcv_id, v_period_ids[7], 'senior_principal_sweep', -12740000),
(v_deal_id, v_fcv_id, v_period_ids[8], 'senior_principal_sweep', -19820000),
(v_deal_id, v_fcv_id, v_period_ids[9], 'senior_principal_sweep', -27391000),
(v_deal_id, v_fcv_id, v_period_ids[10], 'senior_principal_sweep', -26158000),
(v_deal_id, v_fcv_id, v_period_ids[11], 'senior_principal_sweep', -23536000),
(v_deal_id, v_fcv_id, v_period_ids[12], 'senior_principal_sweep', -15270000),
(v_deal_id, v_fcv_id, v_period_ids[13], 'senior_principal_sweep', 0)
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

RAISE NOTICE 'Project Alpha ingestion complete. deal_id = %', v_deal_id;

END $$;
