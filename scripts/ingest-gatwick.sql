-- Gatwick Airport Limited ingestion
-- Source: 6 Companies House filings FY2019-FY2024
-- UK's second-largest airport; 50.01% VINCI Airports / 49.99% GIP (Blackrock)
-- Assumed investment date: earliest year of data provided = 2019
-- Note: FY2019 is a 9-month stub period (Apr-Dec 2019, fiscal year change Mar->Dec)

BEGIN;

-- ─── Deal ──────────────────────────────────────────────────────────────
INSERT INTO deals (
  slug, name, borrower, sector, deal_type, region, currency,
  facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase,
  deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date,
  metrics, country, sub_sector_label,
  borrower_legal_name, borrower_jurisdiction, borrower_registered_address,
  origination_date, maturity_date, fiscal_year_end_month,
  security_ranking, governing_law, sponsor_name, parent_group,
  ownership_structure, revenue_risk_composite, contracted_revenue_pct, merchant_revenue_pct,
  tail_anchor_type, tail_anchor_date, tail_anchor_label, tail_residual_value_treatment, tail_notes,
  renewal_profile, debt_repayment_from_renewal_pct, renewal_notes
) VALUES (
  'gatwick-airport',
  'Gatwick Airport',
  'Gatwick Airport Limited',
  'Airport',
  'Infrastructure Debt',
  'EMEA',
  'GBP',
  3364600000,
  336500000,
  '2 - In Line',
  FALSE,
  'Monitoring',
  'P3-V4-D3',
  'UK second-largest airport (43.2m passengers 2024) owned 50.01% by VINCI Airports and 49.99% by Global Infrastructure Partners (Blackrock). Secured financing via 12 Class A bonds totalling GBP 3,364.6m under 2011 Common Terms Agreement.',
  'operational',
  'London Gatwick is the UK second-largest airport and one of Europe top 10, with 43.2m annual passengers in 2024. Single-runway operation with 55 movements per hour capacity. Owned 50.01% by VINCI Airports and 49.99% by Global Infrastructure Partners (part of Blackrock) since 2019 (when GIP sold 50.01% stake to VINCI). Secured financing under a 2011 Common Terms Agreement includes 12 Class A bonds with scheduled maturities 2026-2049, plus a GBP 300m Revolving Credit Facility and GBP 150m Liquidity Facility. The Group issued a GBP 750m Sustainability-Linked Bond in October 2024. Financial covenants: Senior ICR minimum 1.50 (trigger) / 1.10 (default); Senior RAR maximum 0.70 (trigger) / 0.85 (default). At FY2024: Senior ICR 3.94 and Senior RAR 0.49 with significant headroom. Pre-Covid base case FY2019 (9-month stub period) EBITDA was GBP 367.9m on revenue of GBP 719.6m. Covid collapse in 2020 took EBITDA to GBP (44)m on revenue of GBP 217m (minus 70%). Recovery has been strong with FY2024 EBITDA at GBP 571.4m on revenue of GBP 1,130.3m, well above pre-Covid levels.',
  'FY 2024', '2024-12-31', '2025-03-19 00:00:00+00', '2025-06-30',
  '{}'::jsonb,
  'GB',
  'Single-Runway Origin & Destination Airport',
  'Gatwick Airport Limited',
  'GB',
  '5th Floor Destinations Place, Gatwick Airport, Gatwick, West Sussex, RH6 0NP',
  '2019-04-01',
  '2049-07-05',
  12,
  'Senior Secured',
  'English',
  'VINCI Airports / Global Infrastructure Partners',
  'VINCI SA (50.01%) / Blackrock GIP (49.99%)',
  'Gatwick Airport Limited is 100% owned by Ivy Holdco Limited (borrower entity under the CTA). Ivy Holdco is ultimately owned 50.01% by VINCI Airports (a subsidiary of VINCI SA) and 49.99% by Global Infrastructure Partners (part of Blackrock). VINCI Airports acquired its majority stake in 2019 from GIP.',
  'P3-V4-D3',
  0,
  100,
  'asset_life',
  '2060-01-01'::date,
  'Economic useful life of the airport infrastructure; no concession expiry (freehold-owned)',
  'retained_asset',
  'Gatwick Airport is a privately-owned freehold asset with no concession expiry. Revenue is anchored by long-run airline market depth at a hub airport. Infrastructure asset life assumed to 2060+ for tail computation purposes. The airport is refinanceable at any point.',
  'deep_market_repricing',
  55,
  'Airline contract repricing occurs at each regulatory review (Q7 regulatory period ends 2026). Airlines have clear alternative hub options (Heathrow, Stansted, Luton) creating genuine market pricing. 55% of debt principal is expected to be repaid from post-current-contract cashflows, which is acceptable given market depth.'
);

-- ─── Jurisdictions ─────────────────────────────────────────────────────
INSERT INTO deal_jurisdiction_splits (deal_id, country_code, country_name, activity_pct, activity_type, is_primary)
SELECT id, 'GB', 'United Kingdom', 100, 'revenue', TRUE FROM deals WHERE slug='gatwick-airport';

-- ─── Corporate entities ────────────────────────────────────────────────
INSERT INTO corporate_entities (deal_id, entity_name, entity_type, parent_entity, jurisdiction, ring_fenced, securitisation_boundary)
SELECT id, 'VINCI SA', 'ultimate_parent', NULL, 'FR', FALSE, FALSE FROM deals WHERE slug='gatwick-airport' UNION ALL
SELECT id, 'VINCI Airports', 'holdco', 'VINCI SA', 'FR', FALSE, FALSE FROM deals WHERE slug='gatwick-airport' UNION ALL
SELECT id, 'Global Infrastructure Partners (Blackrock)', 'ultimate_parent', NULL, 'US', FALSE, FALSE FROM deals WHERE slug='gatwick-airport' UNION ALL
SELECT id, 'Ivy Holdco Limited', 'bidco', 'VINCI Airports / GIP', 'GB', TRUE, TRUE FROM deals WHERE slug='gatwick-airport' UNION ALL
SELECT id, 'Gatwick Funding Limited', 'issuer', 'Ivy Holdco Limited', 'GB', FALSE, TRUE FROM deals WHERE slug='gatwick-airport' UNION ALL
SELECT id, 'Gatwick Airport Limited', 'opco', 'Ivy Holdco Limited', 'GB', TRUE, TRUE FROM deals WHERE slug='gatwick-airport';

-- ─── Capital structure (12 Class A bonds) ─────────────────────────────
INSERT INTO capital_structure_instruments (
  deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
  instrument_format, pari_passu_group,
  committed_amount, drawn_amount, currency, margin_bps, base_rate, interest_type,
  maturity_date, repayment_type, our_holding, our_holding_pct, status
)
SELECT id, v.nm, 'senior_term', 1, 'Class A', 'bond', 'A', v.amt, v.amt, 'GBP', v.bps, 'Fixed', 'fixed',
  v.mat::date, 'bullet', v.our, 10, 'active'
FROM deals d, (VALUES
  ('Class A 6.125% 2026 Bond', 300000000, 612, '2026-03-02', 30000000),
  ('Class A 2.5% 2030 Bond', 300000000, 250, '2030-04-15', 30000000),
  ('Class A SLB 3.625% 2033 Bond', 627200000, 362, '2033-10-16', 62720000),
  ('Class A 4.625% 2034 Bond', 350000000, 462, '2034-03-27', 35000000),
  ('Class A 5.75% 2037 Bond', 300000000, 575, '2037-01-20', 30000000),
  ('Class A 3.125% 2039 Bond', 350000000, 312, '2039-09-28', 35000000),
  ('Class A 5.5% 2040 Bond', 250000000, 550, '2040-04-04', 25000000),
  ('Class A 6.5% 2041 Bond', 300000000, 650, '2041-03-02', 30000000),
  ('Class A 2.625% 2046 Bond', 180100000, 262, '2046-10-07', 18010000),
  ('Class A 3.25% 2048 Bond', 203300000, 325, '2048-02-26', 20330000),
  ('Class A 2.875% 2049 Bond', 204000000, 287, '2049-07-05', 20400000)
) AS v(nm, amt, bps, mat, our)
WHERE d.slug = 'gatwick-airport';

-- ─── Financial template ────────────────────────────────────────────────
INSERT INTO deal_financial_template (
  deal_id, sector_template, revenue_line_labels, cost_line_labels,
  growth_capex_labels, maintenance_capex_labels, sector_kpi_labels
)
SELECT id, 'airport',
  to_jsonb(ARRAY['Aeronautical Revenue','Retail Revenue','Car Parking','Property Income','Other Revenue']),
  to_jsonb(ARRAY['Staff Costs','Retail Expenditure','Car Parking Expenditure','Maintenance & IT','Utilities','Rent & Rates','Other Operating Expenses']),
  to_jsonb(ARRAY['Pier 6 Extension','Northern Runway Project']),
  to_jsonb(ARRAY['Rapid Exit Taxiway','Terminal Refurbishment','Runway/Taxiway Resurfacing']),
  to_jsonb(ARRAY['Passengers (millions)','Net Retail per PAX','EBITDA Margin','Senior ICR','Senior RAR'])
FROM deals WHERE slug='gatwick-airport';

INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal)
SELECT d.id, v.line_key, v.display_label, v.ordinal
FROM deals d, (VALUES
  ('revenue_1','Aeronautical Revenue',1),
  ('revenue_2','Retail Revenue',2),
  ('revenue_3','Car Parking',3),
  ('revenue_4','Property Income',4),
  ('revenue_5','Other Revenue',5),
  ('cost_1','Staff Costs',1),
  ('cost_2','Retail Expenditure',2),
  ('cost_3','Car Parking Expenditure',3),
  ('cost_4','Maintenance & IT',4),
  ('cost_5','Utilities',5),
  ('cost_6','Rent & Rates',6),
  ('cost_7','Other Operating Expenses',7),
  ('sector_kpi_1','Passengers (millions)',1),
  ('sector_kpi_2','Net Retail per PAX',2),
  ('sector_kpi_3','EBITDA Margin %',3),
  ('sector_kpi_4','Senior ICR',4),
  ('sector_kpi_5','Senior RAR',5)
) AS v(line_key, display_label, ordinal)
WHERE d.slug='gatwick-airport';

-- ─── Counterparties ────────────────────────────────────────────────────
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, credit_rating, replacement_risk, dependency_narrative)
SELECT d.id, v.nm, v.tp, v.cr, v.rr, v.nar
FROM deals d, (VALUES
  ('EasyJet','offtaker','BBB','high','Largest airline customer by passenger volume. Long-standing relationship at Gatwick.'),
  ('British Airways','offtaker','BBB','high','Major airline customer operating both short and long-haul services from Gatwick.'),
  ('Wizz Air','offtaker','BBB-','medium','Growing short-haul customer on discretionary leisure routes.'),
  ('TUI Airways','offtaker','BB+','medium','Leisure carrier and package holiday operator.'),
  ('CAA (Civil Aviation Authority)','regulator','AA','critical','Economic regulator setting aeronautical charges framework during regulatory review periods (H7, Q7).'),
  ('Deutsche Trustee Company Limited','security_trustee','A','low','Borrower Security Trustee for the Class A bonds under the Common Terms Agreement.'),
  ('Gatwick Funding Limited','issuer','A','low','Bond issuer SPV; proceeds lent to Gatwick Airport Limited or Ivy Holdco.'),
  ('Santander UK / Banco Santander London','bank','A+','low','Banking counterparty.'),
  ('KPMG LLP','auditor',NULL,'low','Statutory auditor (appointed 2023, previously PwC).')
) AS v(nm, tp, cr, rr, nar)
WHERE d.slug='gatwick-airport';

-- ─── Covenants (Senior ICR and Senior RAR) ────────────────────────────
INSERT INTO covenants (deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet, management_case_value, threshold_default)
SELECT id, 'FIN-ICR', 'Senior ICR', 'senior_icr', 3.94, 1.50, 1.30, 162.7, 'performing',
  'FY2024 Senior ICR 3.94x provides significant headroom above the 1.50x trigger. Strong recovery from Covid lows driven by passenger volume recovery to 43.2m and continued cost discipline.',
  'EBITDA', 571400000, 'Senior Interest', 145000000, 37, 'Per Note 23 / APMs section: Senior ICR 3.94 vs trigger < 1.50 and default < 1.10.',
  2.20, 1.10
FROM deals WHERE slug='gatwick-airport';

-- ─── Risk register ─────────────────────────────────────────────────────
INSERT INTO risk_register_entries (deal_id, risk_id, risk_name, risk_category, title, summary, mitigant, likelihood, probability, severity, impact, score, trend, monitoring_kpi, owner_name, status, identified_at, next_review_date, opened_at)
SELECT d.id, v.rid, v.rn, v.rc, v.rn, v.summ, 'See risk detail', v.l, v.l, v.s, v.s, v.sc, v.tr, v.mk, 'Portfolio Manager', 'active', NOW(), NOW() + INTERVAL '6 months', NOW()
FROM deals d, (VALUES
  ('RISK-MK-001','Passenger Volume Risk (pandemic shock repeat)','Market & Macro','Gatwick is fully exposed to discretionary passenger demand. The 2020-2021 Covid shock cut passengers from 46m to 6.1m (-87%) with EBITDA loss of GBP 44m. A future global event could trigger similar shock.',4,4,16,'stable','Passengers (m)'),
  ('RISK-MK-002','Competition from Heathrow and Stansted','Market & Macro','Heathrow (hub) and Stansted (low-cost) compete directly for airline capacity and passenger volumes. Heathrow expansion would be material.',3,4,12,'stable','Market share %'),
  ('RISK-RL-001','Regulatory Review (CAA / H7)','Regulatory & Legal','Aeronautical charges are set under CAA regulatory periods. Current Q7 period runs to 2026, next review could reduce allowed return on RAB.',3,3,9,'stable','Regulatory decisions'),
  ('RISK-RL-002','Northern Runway Planning Approval','Regulatory & Legal','The planned Northern Runway project requires DCO planning consent. Refusal or material modifications would impact growth plans and RAB expansion case.',3,3,9,'stable','Planning decision'),
  ('RISK-OP-001','Single Runway Operational Risk','Business & Operational','Gatwick operates with a single main runway. Any long-duration closure (incident, weather, drone attack as in 2018) creates material revenue disruption.',2,4,8,'stable','Runway availability'),
  ('RISK-CF-001','Refinancing Risk at Bond Maturities','Credit & Financial','12 Class A bonds have scheduled maturities ranging from 2026 to 2049 requiring regular refinancing. Market conditions at each maturity affect pricing.',3,2,6,'improving','Bond maturity profile'),
  ('RISK-ESG-001','Net Zero and Carbon Regulation','ESG & Climate','UK net zero 2050 target and potential aviation carbon pricing create long-term demand and cost pressures. Sustainability-Linked Bond (SLB) ties financing to climate KPIs.',3,2,6,'stable','CO2 per passenger')
) AS v(rid, rn, rc, summ, l, s, sc, tr, mk)
WHERE d.slug='gatwick-airport';

-- ─── Reporting schedule + periods ─────────────────────────────────────
INSERT INTO deal_reporting_schedule (deal_id, periodicity, first_period_start, final_period_end, fiscal_year_end_month, reporting_lag_days)
SELECT id, 'annual', '2019-04-01'::date, '2049-12-31'::date, 12, 90 FROM deals WHERE slug='gatwick-airport';

INSERT INTO deal_reporting_periods (deal_id, period_flag, period_label, period_start, period_end, period_frequency, period_ordinal, period_type, data_status)
SELECT d.id, v.flag, v.lbl, v.ps::date, v.pe::date, 'annual', v.ord, 'historical', 'approved'
FROM deals d, (VALUES
  ('FY2019','FY 2019 (9m stub)','2019-04-01','2019-12-31',1),
  ('FY2020','FY 2020','2020-01-01','2020-12-31',2),
  ('FY2021','FY 2021','2021-01-01','2021-12-31',3),
  ('FY2022','FY 2022','2022-01-01','2022-12-31',4),
  ('FY2023','FY 2023','2023-01-01','2023-12-31',5),
  ('FY2024','FY 2024','2024-01-01','2024-12-31',6)
) AS v(flag, lbl, ps, pe, ord)
WHERE d.slug='gatwick-airport';

-- ─── Holdings ─────────────────────────────────────────────────────────
INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status)
SELECT 3, d.id, 200000000, '2019-04-01'::date, 'active' FROM deals d WHERE slug='gatwick-airport' UNION ALL
SELECT 5, d.id, 136500000, '2019-04-01'::date, 'active' FROM deals d WHERE slug='gatwick-airport';

COMMIT;

SELECT id, slug, name FROM deals WHERE slug='gatwick-airport';
