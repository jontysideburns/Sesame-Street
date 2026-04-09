-- Getlink SE (Eurotunnel + ElecLink + Europorte) ingestion
-- Source: Getlink SE Universal Registration Documents FY2019-FY2024
-- Concession: 99-year concession from 1986 to 2086 (originally 55 years, extended)
-- Listed on Euronext Paris, FR reporting entity

BEGIN;

INSERT INTO deals (
  slug, name, borrower, sector, deal_type, region, currency,
  facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase,
  deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date,
  metrics, country, sub_sector_label,
  borrower_legal_name, borrower_jurisdiction,
  origination_date, maturity_date, fiscal_year_end_month,
  security_ranking, governing_law, sponsor_name, parent_group,
  ownership_structure, revenue_risk_composite, contracted_revenue_pct, merchant_revenue_pct,
  concession_expiry_date,
  tail_anchor_type, tail_anchor_date, tail_anchor_label, tail_residual_value_treatment, tail_notes,
  renewal_profile, debt_repayment_from_renewal_pct, renewal_notes
) VALUES (
  'getlink-eurotunnel',
  'Getlink SE (Eurotunnel Concession)',
  'Getlink SE',
  'Toll Road',
  'Infrastructure Debt',
  'EMEA',
  'EUR',
  5517000000,
  50000000,
  '2 - In Line',
  FALSE,
  'Monitoring',
  'P3-V4-D5',
  'Getlink SE operates the Channel Tunnel (Eurotunnel) under a 99-year concession to 2086, plus the ElecLink interconnector and Europorte rail freight. FY2024 revenue EUR 1.6bn, EBITDA EUR 833m. Net debt EUR 3.6bn, leverage 4.3x. Public entity listed on Euronext Paris.',
  'operational',
  'Getlink SE is the parent of France Manche SA and The Channel Tunnel Group Limited, which jointly hold the Concession Agreement signed in 1986 and extended to 2086 (99 years). The Eurotunnel segment operates Shuttle Services (trucks and cars) and charges Railway Companies (Eurostar, rail freight) for use of the Tunnel. The Group diversified via Europorte (French rail freight, 2010) and ElecLink (500MW France-UK electricity interconnector commissioned 2022). The Channel Tunnel competes with ferry operators on the Short Straits (Dover-Calais) market. FY2024 traffic: 1.2m truck shuttles, 2.2m passenger cars, 11.2m Eurostar passengers (all-time record). Credit ratings: investment grade at HoldCo level; Eurotunnel Term Loan is project-financed, partially index-linked.',
  'FY 2024', '2024-12-31', '2025-03-15 00:00:00+00', '2025-06-30',
  '{}'::jsonb,
  'FR',
  'Rail Tunnel Concession',
  'Getlink SE',
  'FR',
  '2019-01-01'::date,
  '2050-12-31'::date,
  12,
  'Senior Secured',
  'French / English',
  'Public / Listed',
  'Public (Euronext Paris: GET)',
  'Getlink SE is a listed public company on Euronext Paris (ticker GET). Free float is the majority holder. No single sponsor. The Group holds 100% of France Manche SA and The Channel Tunnel Group Limited (the concessionaires), plus Europorte and ElecLink subsidiaries.',
  'P3-V4-D5',
  0,
  100,
  '2086-12-31'::date,
  'concession',
  '2086-12-31'::date,
  'Eurotunnel Concession Agreement (1986 extended to 99 years, expiring 2086)',
  'zero_residual',
  'Asset reverts to the UK and French governments at concession end in 2086 for zero consideration. Debt must be fully repaid before concession expiry. Substantial positive tail (~36 years) from the 2050 Term Loan maturity to the 2086 concession end.',
  'hand_back_zero_value',
  0,
  'Concession-based revenue model with hand-back at zero value. Debt is fully amortised within the concession life and has no reliance on post-2086 cashflows. The Group has diversified into ElecLink and Europorte to provide additional cashflow streams, but these are separate businesses with their own economics and do not change the Eurotunnel concession structure.'
);

-- Jurisdictions (cross-border: UK + France 50/50)
INSERT INTO deal_jurisdiction_splits (deal_id, country_code, country_name, activity_pct, activity_type, is_primary)
SELECT id, 'FR', 'France', 50, 'revenue', TRUE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'GB', 'United Kingdom', 50, 'revenue', FALSE FROM deals WHERE slug='getlink-eurotunnel';

-- Corporate entities
INSERT INTO corporate_entities (deal_id, entity_name, entity_type, parent_entity, jurisdiction, ring_fenced, securitisation_boundary)
SELECT id, 'Getlink SE (Euronext Paris: GET)', 'ultimate_parent', NULL, 'FR', FALSE, FALSE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'Eurotunnel Holding SAS', 'holdco', 'Getlink SE', 'FR', TRUE, TRUE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'France Manche SA (FM)', 'opco', 'Eurotunnel Holding SAS', 'FR', TRUE, TRUE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'The Channel Tunnel Group Limited (CTG)', 'opco', 'Eurotunnel Holding SAS', 'GB', TRUE, TRUE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'ElecLink Limited', 'subsidiary', 'Getlink SE', 'GB', FALSE, FALSE FROM deals WHERE slug='getlink-eurotunnel' UNION ALL
SELECT id, 'Europorte SAS', 'subsidiary', 'Getlink SE', 'FR', FALSE, FALSE FROM deals WHERE slug='getlink-eurotunnel';

-- Capital structure (simplified: Eurotunnel Term Loan + Getlink Green Bonds)
INSERT INTO capital_structure_instruments (
  deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class,
  instrument_format, pari_passu_group,
  committed_amount, drawn_amount, currency, margin_bps, base_rate, interest_type,
  maturity_date, repayment_type, our_holding, our_holding_pct, status
)
SELECT id, 'Eurotunnel Term Loan (project finance, partially index-linked)', 'senior_term', 1, 'Senior',
  'loan', 'A',
  4400000000, 4400000000, 'EUR', 350, 'Fixed + RPI', 'index_linked', '2050-12-31'::date, 'amortising',
  40000000, 0.9, 'active' FROM deals WHERE slug='getlink-eurotunnel'
UNION ALL
SELECT id, 'Getlink SE 2025 Green Bonds', 'bond', 2, 'Senior',
  'bond', 'B',
  850000000, 850000000, 'EUR', 375, 'Fixed', 'fixed', '2030-10-20'::date, 'bullet',
  10000000, 1.18, 'active' FROM deals WHERE slug='getlink-eurotunnel'
UNION ALL
SELECT id, 'Other Group Facilities (RCF, leases, other)', 'senior_rcf', 3, 'Senior',
  'loan', 'C',
  267000000, 267000000, 'EUR', 250, 'Euribor', 'floating', '2028-12-31'::date, 'bullet',
  0, 0, 'active' FROM deals WHERE slug='getlink-eurotunnel';

-- Financial template
INSERT INTO deal_financial_template (
  deal_id, sector_template, revenue_line_labels, cost_line_labels,
  growth_capex_labels, maintenance_capex_labels, sector_kpi_labels
)
SELECT id, 'toll_road',
  to_jsonb(ARRAY['Eurotunnel (Shuttle + Railway Network)','ElecLink (Interconnector)','Europorte (Rail Freight)']),
  to_jsonb(ARRAY['Eurotunnel Operating Costs','ElecLink Operating Costs','Europorte Operating Costs']),
  to_jsonb(ARRAY['ElecLink Commissioning','Digital & Customer Experience Programme']),
  to_jsonb(ARRAY['Tunnel & Infrastructure Maintenance','Rolling Stock & Shuttle Renewals']),
  to_jsonb(ARRAY['Truck Shuttle Volume','Passenger Car Volume','Eurostar Passengers (m)','Concession Years Remaining','ElecLink Availability (%)'])
FROM deals WHERE slug='getlink-eurotunnel';

INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal)
SELECT d.id, v.line_key, v.display_label, v.ordinal
FROM deals d, (VALUES
  ('revenue_1','Eurotunnel',1),
  ('revenue_2','ElecLink',2),
  ('revenue_3','Europorte',3),
  ('cost_1','Eurotunnel Operating Costs',1),
  ('cost_2','ElecLink Operating Costs',2),
  ('cost_3','Europorte Operating Costs',3),
  ('sector_kpi_1','Truck Shuttle Volume',1),
  ('sector_kpi_2','Passenger Car Volume',2),
  ('sector_kpi_3','Eurostar Passengers (m)',3),
  ('sector_kpi_4','Concession Years Remaining',4)
) AS v(line_key, display_label, ordinal)
WHERE d.slug='getlink-eurotunnel';

-- Counterparties
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, credit_rating, replacement_risk, dependency_narrative)
SELECT d.id, v.nm, v.tp, v.cr, v.rr, v.nar
FROM deals d, (VALUES
  ('UK Government + French Government','concession_grantor','AA','critical','Joint grantors of the Eurotunnel Concession. 99-year agreement running to 2086.'),
  ('Eurostar International Limited','offtaker','BB','high','Pays Railway Network usage fees to Eurotunnel. Primary user of the rail network, 11.2m passengers in 2024.'),
  ('Ferry operators (P&O, DFDS, Irish Ferries, Brittany Ferries)','competitor','n/a','high','Direct competitors on the Short Straits Dover-Calais market. 2024 saw intensified competition reducing Eurotunnel market share.'),
  ('National Grid ESO / RTE','regulator','AA','medium','Regulators for the ElecLink interconnector exemption. ElecLink profit sharing arrangement.'),
  ('DB Cargo / GB Railfreight / SNCF','offtaker','BBB','medium','Rail freight operators using the Tunnel for cross-channel freight services.')
) AS v(nm, tp, cr, rr, nar)
WHERE d.slug='getlink-eurotunnel';

-- Risk register
INSERT INTO risk_register_entries (deal_id, risk_id, risk_name, risk_category, title, summary, mitigant, likelihood, probability, severity, impact, score, trend, monitoring_kpi, owner_name, status, identified_at, next_review_date, opened_at)
SELECT d.id, v.rid, v.rn, v.rc, v.rn, v.summ, 'See risk detail', v.l, v.l, v.s, v.s, v.sc, v.tr, v.mk, 'Portfolio Manager', 'active', NOW(), NOW() + INTERVAL '6 months', NOW()
FROM deals d, (VALUES
  ('RISK-MK-001','Ferry Competition on Short Straits','Market & Macro','Intensified ferry competition in 2024 led to Truck Shuttle market share of 35.7% (vs 35.9% 2023) and Passenger Shuttle market share down 3.2pts. Direct substitution between Tunnel and ferries.',4,4,16,'deteriorating','Market share %'),
  ('RISK-SS-TUNNEL','Cross-Channel Demand Volatility','Sector-Specific','Traffic exposed to GDP, tourism, trade flows. Covid shock dropped revenue 25% in 2020 with loss of EUR 113m.',4,4,16,'stable','Truck Shuttle Volume'),
  ('RISK-CF-001','Index-Linked Debt Inflation Exposure','Credit & Financial','Eurotunnel Term Loan has tranches indexed to UK/French inflation. 2022-2023 inflation spike added significant finance costs.',3,3,9,'improving','Net finance costs'),
  ('RISK-SS-ELECLINK','ElecLink Operational Availability','Sector-Specific','Interconnector suspended from 25 September 2024 following fault detection. EBITDA impact estimated at EUR 78m for Q4 2024.',4,4,16,'deteriorating','ElecLink availability'),
  ('RISK-RL-001','Concession Expiry 2086 (Hand-Back)','Regulatory & Legal','Asset reverts to governments at 2086 for zero consideration. Hand-back condition requires asset in good condition.',1,5,5,'stable','Concession remaining (yrs)'),
  ('RISK-MK-002','Eurostar Counterparty Dependency','Market & Macro','Railway Network revenue (EUR 398m in 2024) depends on Eurostar continuing to operate through the Tunnel. Eurostar 11.2m passengers = record.',3,3,9,'improving','Eurostar passengers'),
  ('RISK-CF-002','ElecLink Profit Sharing Provision','Credit & Financial','Exemption granted in 2014 requires profit sharing with French/UK grid operators. EUR 76m provision in 2024 alone (vs 156m 2023).',3,2,6,'improving','Profit sharing provision')
) AS v(rid, rn, rc, summ, l, s, sc, tr, mk)
WHERE d.slug='getlink-eurotunnel';

-- Reporting schedule (annual, to concession end 2086)
INSERT INTO deal_reporting_schedule (deal_id, periodicity, first_period_start, final_period_end, fiscal_year_end_month, reporting_lag_days)
SELECT id, 'annual', '2019-01-01'::date, '2086-12-31'::date, 12, 90 FROM deals WHERE slug='getlink-eurotunnel';

-- Historical periods FY2019 to FY2024 (6 years of accounts)
INSERT INTO deal_reporting_periods (deal_id, period_flag, period_label, period_start, period_end, period_frequency, period_ordinal, period_type, data_status)
SELECT d.id, v.flag, v.lbl, v.ps::date, v.pe::date, 'annual', v.ord, 'historical', 'approved'
FROM deals d, (VALUES
  ('FY2019','FY 2019','2019-01-01','2019-12-31',1),
  ('FY2020','FY 2020','2020-01-01','2020-12-31',2),
  ('FY2021','FY 2021','2021-01-01','2021-12-31',3),
  ('FY2022','FY 2022','2022-01-01','2022-12-31',4),
  ('FY2023','FY 2023','2023-01-01','2023-12-31',5),
  ('FY2024','FY 2024','2024-01-01','2024-12-31',6)
) AS v(flag, lbl, ps, pe, ord)
WHERE d.slug='getlink-eurotunnel';

-- Holdings (EUR 50m split across 2 accounts)
INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status)
SELECT 3, d.id, 35000000, '2019-01-01'::date, 'active' FROM deals d WHERE slug='getlink-eurotunnel' UNION ALL
SELECT 5, d.id, 15000000, '2019-01-01'::date, 'active' FROM deals d WHERE slug='getlink-eurotunnel';

-- Covenant (Senior DSCR at 1.76x per FY2024 Term Loan test)
INSERT INTO covenants (deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet, management_case_value, threshold_default)
SELECT id, 'FIN-003', 'Senior DSCR (Eurotunnel Term Loan)', 'cfads_over_ds', 1.76, 1.25, 1.10, 175.00, 'performing',
  'FY2024 Term Loan test. DSCR of 1.76x reported by Getlink in the 2024 URD, described as the synthetic service cover ratio on the Eurotunnel Holding SAS sub-group. Well above both lockup (1.25x) and trigger (1.10x) levels.',
  'CFADS', 1466000000, 'Debt Service', 833000000, 44, 'Getlink SE 2024 URD, section 2.1.5: DSCR and synthetic DSCR of approximately 1.76x.',
  1.60, 1.10
FROM deals WHERE slug='getlink-eurotunnel';

-- Onboarding snapshot (frozen at 2019-01-01)
INSERT INTO deal_onboarding_snapshots (
  deal_id, snapshot_date, snapshot_number, snapshot_reason, captured_by, is_current,
  tail_years_at_onboarding, tail_classification_at_onboarding,
  renewal_profile_at_onboarding, debt_repayment_from_renewal_pct_at_onboarding,
  revenue_risk_code_at_onboarding, concession_years_remaining_at_onboarding,
  entry_leverage, entry_dscr_year_1, entry_dscr_min_life, entry_llcr,
  entry_loan_life_years, entry_wal_years,
  lender_case_dscr_min, lender_case_leverage_peak, stress_break_even_pct, stress_cases_tested,
  ic_memo_date, ic_memo_reference, ic_approved_by, ic_approval_conditions, ic_vote_margin,
  entry_all_in_margin_bps, entry_upfront_fees_bps, entry_secondary_purchase_price_pct,
  entry_yield_to_maturity, expected_hold_period_years, exit_strategy,
  entry_risk_free_rate_bps, entry_credit_spread_bps, entry_relative_value_notes,
  initial_risk_score, initial_grade, critical_risks_at_onboarding,
  notes
)
SELECT id, '2019-01-01'::date, 1, 'origination', 'IC at origination', TRUE,
  36.00, 'positive_tail',
  'hand_back_zero_value', 0.00,
  'P3-V4-D5', 67.00,
  -- Entry metrics based on 2018 reported figures (ref 2019 URD restated 2018 numbers):
  -- 2018 EBITDA EUR 572m, net debt approx EUR 3.9bn → leverage ~6.8x
  6.80, 1.55, 1.20, 1.45,
  32.00, 22.50,
  0.95, 8.50, 18.00,
  'Lender case: -15% truck volumes, -25% passenger volumes, inflation +3% above budget. Covid-style single-year stress test.',
  '2018-12-14'::date, 'IC-2018-GET-001', 'Credit Committee',
  'Approved subject to: (i) annual review of concession compliance, (ii) ongoing monitoring of ferry competition and market share, (iii) distribution lockup at DSCR < 1.25x.',
  'unanimous',
  350, 100, 99.50,
  0.0420, 10.00, 'Hold to refinance. Monitor Eurotunnel Term Loan refinancing in 2050.',
  100, 320, 'Entry spread of 320bps over 10yr Bund reflected the combined infrastructure + merchant traffic risk. Attractive relative to ferry operators in the peer set given asset quality and concession tail.',
  48.00, '2 - In Line',
  'Top 3 at origination: (1) Cross-channel demand volatility with ferry competition; (2) Index-linked debt inflation exposure in rising rate environment; (3) Brexit uncertainty impacting trade flows.',
  'First onboarding snapshot at investment 1 Jan 2019. Based on 2018 FY results as reported in 2019 URD. Brexit and Covid were unknown unknowns at this point.'
FROM deals WHERE slug='getlink-eurotunnel';

COMMIT;
SELECT id, slug, name, sector FROM deals WHERE slug='getlink-eurotunnel';
