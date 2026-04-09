-- M6 Toll (Midland Expressway Limited) ingestion
-- Source: Companies House filings 2020-2024
-- Registered number 02309767; 27-mile M6 Toll motorway; Concession 2001-2054
-- Ultimate owner: IFM Global Infrastructure Fund via Aleatica SAU

BEGIN;

-- ─── Deal ──────────────────────────────────────────────────────────────
INSERT INTO deals (
  slug, name, borrower, sector, deal_type, region, currency,
  facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase,
  deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date,
  metrics, country, sub_sector_label,
  borrower_legal_name, borrower_registered_number, borrower_jurisdiction,
  origination_date, maturity_date, fiscal_year_end_month,
  security_ranking, governing_law, sponsor_name, parent_group,
  ownership_structure, revenue_risk_composite, contracted_revenue_pct, merchant_revenue_pct,
  concession_expiry_date
) VALUES (
  'm6-toll',
  'M6 Toll (Midland Expressway)',
  'Midland Expressway Limited',
  'Toll Road',
  'Infrastructure Debt',
  'EMEA',
  'GBP',
  770000000,
  77000000,
  '2 - In Line',
  FALSE,
  'Monitoring',
  'P3-V5-D3',
  '27-mile M6 Toll motorway under 53-year UK concession (2001-2054), operated by Midland Expressway Limited. Parent-company loan financing at 9 percent fixed, ultimately held by IFM Global Infrastructure Fund via Aleatica.',
  'operational',
  'The M6 Toll is a 27-mile tolled motorway in the UK West Midlands, operated under a 53-year Concession Agreement with the UK Government (26 January 2001 to 2054). Ultimately owned by IFM Global Infrastructure Fund via Aleatica SAU and Midland Motorways Group Limited. 2024 traffic 16.6m vehicles (AADT 45,287). Fully merchant toll revenue exposed to traffic volatility from competing routes and HS2 construction disruption.',
  'FY 2024', '2024-12-31', '2025-03-19 00:00:00+00', '2025-06-30',
  '{}'::jsonb,
  'GB',
  'Tolled Motorway (Concession)',
  'Midland Expressway Limited',
  '02309767',
  'GB',
  '2020-01-01',
  '2054-01-25',
  12,
  'Senior Secured',
  'English',
  'IFM Global Infrastructure Fund',
  'IFM Investors Pty Ltd',
  'IFM Global Infrastructure Fund (Cayman trustee) owns Global InfraCo Spain SL owns Aleatica SAU owns Midland Motorways Group Limited owns 100 percent of Midland Expressway Limited. GLIL Infrastructure LLP holds an indirect minority interest.',
  'P3-V5-D3',
  0,
  100,
  '2054-01-25'
);

-- Use the id from the insert (next sequential should be 12)
-- ─── Jurisdictions ─────────────────────────────────────────────────────
INSERT INTO deal_jurisdiction_splits (deal_id, country_code, country_name, activity_pct, activity_type, is_primary)
SELECT id, 'GB', 'United Kingdom', 100, 'revenue', TRUE FROM deals WHERE slug = 'm6-toll';

-- ─── Corporate entities (ownership chain) ──────────────────────────────
INSERT INTO corporate_entities (deal_id, entity_name, entity_type, parent_entity, jurisdiction, ring_fenced, securitisation_boundary)
SELECT id, 'IFM Global Infrastructure Fund', 'ultimate_parent', NULL, 'KY', FALSE, FALSE FROM deals WHERE slug='m6-toll' UNION ALL
SELECT id, 'Global InfraCo Spain SL', 'holdco', 'IFM Global Infrastructure Fund', 'ES', FALSE, FALSE FROM deals WHERE slug='m6-toll' UNION ALL
SELECT id, 'Aleatica SAU', 'holdco', 'Global InfraCo Spain SL', 'ES', FALSE, FALSE FROM deals WHERE slug='m6-toll' UNION ALL
SELECT id, 'Midland Motorways Group Limited', 'bidco', 'Aleatica SAU', 'GB', FALSE, TRUE FROM deals WHERE slug='m6-toll' UNION ALL
SELECT id, 'Midland Expressway Limited', 'opco', 'Midland Motorways Group Limited', 'GB', TRUE, TRUE FROM deals WHERE slug='m6-toll';

-- ─── Capital structure ─────────────────────────────────────────────────
-- Parent loans at 9 percent fixed. Non-current GBP 87.8m, current GBP 681.8m (2024 values).
-- Current tranche is on-demand but parent has given non-recall letter.
-- MEL also guarantees MMG external debt due 2042-2050.
INSERT INTO capital_structure_instruments (
  deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
  instrument_format, pari_passu_group,
  committed_amount, drawn_amount, currency, margin_bps, base_rate, interest_type,
  maturity_date, repayment_type, our_holding, our_holding_pct, status
)
SELECT id, 'Parent Loan Facility A (term)', 'shareholder_loan', 1, 'Senior',
  'loan', 'A',
  87800000, 87800000, 'GBP', 900, 'Fixed', 'fixed', '2054-01-25'::date, 'bullet',
  8780000, 10, 'active' FROM deals WHERE slug='m6-toll'
UNION ALL
SELECT id, 'Parent Loan Facility B (on-demand)', 'shareholder_loan', 2, 'Senior',
  'loan', 'A',
  681849000, 681849000, 'GBP', 900, 'Fixed', 'fixed', '2054-01-25'::date, 'bullet',
  68185000, 10, 'active' FROM deals WHERE slug='m6-toll';

-- ─── Financial template ────────────────────────────────────────────────
INSERT INTO deal_financial_template (
  deal_id, sector_template, revenue_line_labels, cost_line_labels,
  growth_capex_labels, maintenance_capex_labels, sector_kpi_labels
)
SELECT id, 'toll_road',
  to_jsonb(ARRAY['Toll Revenue','Other Operating Income']),
  to_jsonb(ARRAY['Cost of Sales','Staff Costs','Other Operating Expenses']),
  to_jsonb(ARRAY[]::text[]),
  to_jsonb(ARRAY['Maintenance Capex','RoadAhead ANPR Transformation']),
  to_jsonb(ARRAY['Annual Traffic (m vehicles)','AADT','EBITDA Margin (%)','Concession Remaining (yrs)'])
FROM deals WHERE slug='m6-toll';

-- ─── Line labels ───────────────────────────────────────────────────────
INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal)
SELECT id, v.line_key, v.display_label, v.ordinal
FROM deals d, (VALUES
  ('revenue_1','Toll Revenue',1),
  ('revenue_2','Other Operating Income',2),
  ('cost_1','Cost of Sales',1),
  ('cost_2','Staff Costs',2),
  ('cost_3','Other Operating Expenses',3),
  ('maintenance_capex_1','Maintenance Capex',1),
  ('maintenance_capex_2','RoadAhead ANPR Transformation',2),
  ('sector_kpi_1','Annual Traffic (m vehicles)',1),
  ('sector_kpi_2','AADT',2),
  ('sector_kpi_3','EBITDA Margin (%)',3),
  ('sector_kpi_4','Concession Remaining (yrs)',4)
) AS v(line_key, display_label, ordinal)
WHERE d.slug='m6-toll';

-- ─── Counterparties ────────────────────────────────────────────────────
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, credit_rating, replacement_risk, dependency_narrative)
SELECT d.id, v.nm, v.tp, v.cr, v.rr, v.nar
FROM deals d, (VALUES
  ('UK Government (Secretary of State for Transport)','offtaker','AA','critical','Concession grantor under 53-year agreement running to January 2054. Policy risk is a principal concern.'),
  ('National Highways / DfT','regulator','AA','high','Manages competing parallel routes (M6, M42). Dialogue maintained on strategic road network and HS2 impact.'),
  ('Barclays Bank','bank','A+','low','Banking counterparty for operating accounts.'),
  ('PricewaterhouseCoopers LLP','auditor',NULL,'low','Statutory auditor.'),
  ('BNY Mellon','security_trustee','A','low','Security trustee under security trust and intercreditor deed.')
) AS v(nm, tp, cr, rr, nar)
WHERE d.slug='m6-toll';

-- ─── Risk register ─────────────────────────────────────────────────────
INSERT INTO risk_register_entries (deal_id, risk_id, risk_name, risk_category, title, summary, mitigant, likelihood, probability, severity, impact, score, trend, monitoring_kpi, owner_name, status, identified_at, next_review_date, opened_at)
SELECT d.id, v.rid, v.rn, v.rc, v.rn, v.summ, 'See risk detail', v.l, v.l, v.s, v.s, v.sc, v.tr, v.mk, 'Portfolio Manager', 'active', NOW(), NOW() + INTERVAL '6 months', NOW()
FROM deals d, (VALUES
  ('RISK-MK-001','Traffic Volume Decline (HS2 disruption)','Market & Macro','HS2 construction works on M42 south of M6 Toll caused 6.2 percent traffic decline in 2024. Ongoing HS2 disruption expected to continue.',4,4,16,'deteriorating','Annual Traffic'),
  ('RISK-MK-002','Competing Route Improvements','Market & Macro','Improvement in service levels on parallel M6 reduces demand for tolled alternative.',3,3,9,'stable','AADT'),
  ('RISK-RL-001','Government Policy / Concession Risk','Regulatory & Legal','Change in government policy towards private toll operators. Concession provides contractual protection but political risk remains.',2,5,10,'stable','Concession status'),
  ('RISK-CF-001','Net Liabilities / Parent Loan Recall','Credit & Financial','Company in net liabilities of GBP 188m (2024). Dependent on parent not recalling on-demand loan tranche.',3,3,9,'improving','Net liabilities'),
  ('RISK-SS-TOLL','Merchant Traffic Risk','Sector-Specific','Fully merchant toll revenue with no availability payment or minimum traffic guarantee.',4,3,12,'stable','Toll Revenue per Vehicle'),
  ('RISK-RL-002','Transport Decarbonisation','Regulatory & Legal','UK Government 2050 net zero target. Long-term impact on ICE vehicle usage and toll road demand.',3,2,6,'stable','Carbon Intensity')
) AS v(rid, rn, rc, summ, l, s, sc, tr, mk)
WHERE d.slug='m6-toll';

-- ─── Reporting schedule and periods ────────────────────────────────────
INSERT INTO deal_reporting_schedule (deal_id, periodicity, first_period_start, final_period_end, fiscal_year_end_month, reporting_lag_days)
SELECT id, 'annual', '2020-01-01'::date, '2054-12-31'::date, 12, 120 FROM deals WHERE slug='m6-toll';

-- 5 historical periods FY2020 to FY2024 (the 5 years of accounts provided)
INSERT INTO deal_reporting_periods (deal_id, period_flag, period_label, period_start, period_end, period_frequency, period_ordinal, period_type, data_status)
SELECT d.id, v.flag, v.lbl, v.ps::date, v.pe::date, 'annual', v.ord, v.tp, 'approved'
FROM deals d, (VALUES
  ('FY2020','FY 2020','2020-01-01','2020-12-31',1,'historical'),
  ('FY2021','FY 2021','2021-01-01','2021-12-31',2,'historical'),
  ('FY2022','FY 2022','2022-01-01','2022-12-31',3,'historical'),
  ('FY2023','FY 2023','2023-01-01','2023-12-31',4,'historical'),
  ('FY2024','FY 2024','2024-01-01','2024-12-31',5,'historical')
) AS v(flag, lbl, ps, pe, ord, tp)
WHERE d.slug='m6-toll';

-- ─── Holdings (investment made in 2020 - the earliest year of data) ────
-- Split across 2 accounts for the EUR/GBP equivalent portfolio
INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status)
SELECT 3, d.id, 50000000, '2020-01-01'::date, 'active' FROM deals d WHERE slug='m6-toll' UNION ALL
SELECT 5, d.id, 27000000, '2020-01-01'::date, 'active' FROM deals d WHERE slug='m6-toll';

-- ─── Covenants ─────────────────────────────────────────────────────────
-- The external MMG debt covenants are not visible in the MEL accounts.
-- Use DSCR as the primary monitored covenant with assumed thresholds.
INSERT INTO covenants (deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet, management_case_value, threshold_default)
SELECT id, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.69, 1.20, 1.10, 90.00, 'performing',
  'DSCR computed as FY2024 EBITDA (GBP 123.2m) less maintenance capex (GBP 6.5m) divided by external group debt service proxy (GBP 69m annual). Strong headroom driven by cash-generative operations.',
  'CFADS', 116700000, 'Debt Service', 69000000, 1, 'Computed from Midland Expressway FY2024 accounts (EBITDA and capex).',
  1.60, 1.10
FROM deals WHERE slug='m6-toll';

COMMIT;

-- Show the new deal id
SELECT id, slug, name FROM deals WHERE slug='m6-toll';
