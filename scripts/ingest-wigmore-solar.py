"""Ingest Wigmore Solar (deal 9) — ground-mounted solar, GB, GBP.
Back-solved from: DSCR 1.18x, 85% EBITDA margin, £100M note at 5% fixed, amortising over 20yr.
"""
import subprocess
from datetime import datetime

DEAL_ID = 9

# ── Back-solve financials ──
# Note: £100M at 5% fixed, amortising over 20 years (40 semi-annual periods)
# Semi-annual interest at start: 100M * 5% / 2 = 2.5M
# Semi-annual principal (straight-line): 100M / 40 = 2.5M
# Semi-annual DS = 5.0M, annual = 10.0M
# DSCR 1.18x → annual CFADS = 11.8M → semi-annual CFADS = 5.9M
# CFADS = EBITDA - capex - tax + interest_on_cash
# Assume capex 0.5M/half, tax 0.3M/half, interest on cash negligible
# EBITDA = CFADS + capex + tax = 5.9 + 0.5 + 0.3 = 6.7M/half = 13.4M/yr
# Revenue at 85% margin: 13.4 / 0.85 = 15.76M/yr → 7.88M/half

BASE_REV_HALF = 7_880_000
BASE_OPEX_HALF = 1_180_000  # 15% of revenue
BASE_CAPEX_HALF = 500_000
BASE_TAX_HALF = 300_000
OPENING_DEBT = 100_000_000
NOTE_RATE = 0.05  # 5% annual
PERIODS = 40  # 20 years semi-annual
CPI = 0.025  # PPA indexed
OPEX_GROWTH = 0.03
PPA_EXPIRY_PERIOD = 30  # Period 30 = H1 2041 (15 years from 2026)

def run_sql(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
        input=sql.encode('utf-8', errors='replace').decode('utf-8', errors='replace'),
        capture_output=True, text=True, timeout=30
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr and 'ERROR' in result.stderr:
        print("ERROR:", result.stderr[-300:])

# ── Insert deal ──
run_sql(f"""
INSERT INTO deals (id, slug, name, borrower, sector, deal_type, region, currency, facility_amount, exposure, grade, watchlist, status, revenue_risk, summary, phase, deal_overview, latest_period_label, latest_period_end, latest_reported_at, next_test_date, metrics,
  borrower_legal_name, borrower_jurisdiction, sub_sector_label, sponsor_name, country,
  origination_date, maturity_date, weighted_average_life, fiscal_year_end_month, governing_law,
  security_ranking, contracted_revenue_pct, merchant_revenue_pct, duration_coverage_pct,
  internal_credit_score, primary_business_country, primary_business_country_name,
  reporting_periodicity
) VALUES (
  {DEAL_ID}, 'wigmore-solar', 'Wigmore Solar', 'Wigmore Solar Ltd', 'Solar', 'Project Finance', 'EMEA', 'GBP',
  100000000, 100000000, '1 - Outperforming', FALSE, 'Monitoring', 'P1-V2-D3',
  'Operational ground-mounted solar farm with 15-year corporate PPA. Performing in line with base case.',
  'operational',
  'Wigmore Solar is a ground-mounted solar farm in the UK. Revenue is 100% contracted under a 15-year corporate PPA with an A-rated offtaker until 2041, after which it becomes fully merchant. The project is financed with a GBP100M senior secured fixed-rate note amortising over 20 years.',
  'H1 2026', '2026-06-30', '2026-08-15T00:00:00Z', '2026-12-31',
  '{{"revenue":15760000,"ebitda":13400000,"cfads":11800000,"debtService":10000000,"netDebt":100000000,"cash":0,"seniorDscr":1.18}}'::jsonb,
  'Wigmore Solar Ltd', 'GB', 'Ground Mounted Solar', 'Wigmore Equity Partners LLP', 'GB',
  '2026-01-01', '2046-01-01', 10, 12, 'English',
  'Senior Secured', 100, 0, 75,
  'Baa3', 'GB', 'United Kingdom',
  'semi_annual'
) ON CONFLICT DO NOTHING;
""")

# ── Covenant (required for portfolio query) ──
run_sql(f"""
INSERT INTO covenants (deal_id, code, name, composition_tag, current_value, threshold_lockup, threshold_trigger, headroom_pct, status, rationale, numerator_label, numerator_value, denominator_label, denominator_value, evidence_page, evidence_snippet) VALUES
({DEAL_ID}, 'FIN-003', 'Senior DSCR', 'cfads_over_ds', 1.18, 1.10, 1.05, 7.27, 'performing',
 'DSCR of 1.18x provides 7.27% headroom above 1.10x lockup.',
 'CFADS', 11800000, 'Senior Debt Service', 10000000, 1,
 'H1 2026 compliance certificate confirms DSCR of 1.18x.')
ON CONFLICT DO NOTHING;
""")

# ── Capital structure ──
run_sql(f"""
INSERT INTO capital_structure_instruments (deal_id, instrument_name, instrument_type, waterfall_priority, enforcement_class, committed_amount, drawn_amount, currency, start_date, maturity_date, interest_type, base_rate, margin_bps, repayment_type, our_holding, our_holding_pct, dsra_months, status, instrument_format, pari_passu_group) VALUES
({DEAL_ID}, 'Senior Secured Note', 'senior_term', 1, 'Senior', 100000000, 100000000, 'GBP', '2026-01-01', '2046-01-01', 'fixed', 'GILT', 150, 'amortising', 100000000, 100.0, 6, 'active', 'note', 'A')
ON CONFLICT DO NOTHING;
""")

# ── Reserve accounts ──
run_sql(f"""
INSERT INTO deal_reserve_accounts (deal_id, account_name, account_type, sizing_basis, required_balance, current_balance, cash_amount, lc_amount, funded_status, currency, periods_underfunded) VALUES
({DEAL_ID}, 'Debt Service Reserve Account', 'dsra', '6 months senior DS', 5000000, 5000000, 5000000, 0, 'fully_funded', 'GBP', 0),
({DEAL_ID}, 'Maintenance Reserve Account', 'mra', 'Independent engineer lifecycle model', 1500000, 1500000, 1500000, 0, 'fully_funded', 'GBP', 0)
ON CONFLICT DO NOTHING;
""")

# ── Counterparties ──
run_sql(f"""
INSERT INTO deal_counterparties (deal_id, name, counterparty_type, credit_rating, contract_value, contract_expiry, replacement_risk, dependency_narrative) VALUES
({DEAL_ID}, 'A-Rated Corporate Offtaker', 'offtaker', 'A', 200000000, '2041-01-01', 'critical', '15-year corporate PPA. Single revenue source.'),
({DEAL_ID}, 'Siemens', 'contractor', 'BBB+', 15000000, '2036-01-01', 'medium', 'O&M contract for panel maintenance and inverter servicing.'),
({DEAL_ID}, 'UK Power Networks', 'offtaker', 'AA-', NULL, '2046-01-01', 'low', 'Grid connection agreement.'),
({DEAL_ID}, 'Marsh Insurance', 'insurer', 'A+', 3000000, '2027-06-30', 'low', 'All-risks and business interruption.'),
({DEAL_ID}, 'BDO LLP', 'auditor', NULL, NULL, NULL, 'low', 'Annual audit engagement.')
ON CONFLICT DO NOTHING;
""")

# ── Jurisdiction ──
run_sql(f"""
INSERT INTO deal_jurisdiction_splits (deal_id, country_code, country_name, activity_pct, activity_type, is_primary) VALUES
({DEAL_ID}, 'GB', 'United Kingdom', 100.00, 'revenue', TRUE)
ON CONFLICT (deal_id, country_code, activity_type) DO NOTHING;
""")

# ── Holdings ──
run_sql(f"""
INSERT INTO holdings (account_id, deal_id, current_amount, acquisition_date, status) VALUES
(3, {DEAL_ID}, 60000000, '2026-01-01', 'active'),
(5, {DEAL_ID}, 40000000, '2026-01-01', 'active')
ON CONFLICT DO NOTHING;
""")

# ── Financial template ──
run_sql(f"""
INSERT INTO deal_financial_template (deal_id, sector_template, revenue_line_labels, cost_line_labels, capex_line_labels, sector_kpi_labels) VALUES
({DEAL_ID}, 'solar',
 '["PPA Revenue (Contracted)","Merchant Revenue (Spot)","ROC / Subsidy Income","Embedded Benefit Income","Other Revenue"]'::jsonb,
 '["O&M Contract","Land Lease / Rent","Insurance","Grid Connection Charges","Management Fee","General & Admin","Power Cost","Other Opex"]'::jsonb,
 '["Panel Replacement / Degradation","Inverter Replacement","Other Capex"]'::jsonb,
 '["Technical Availability (%)","Performance Ratio (%)","Degradation Rate (% pa)","Solar Irradiance (kWh/m2)","Net Generation (GWh)","Capacity Factor (%)","PPA Price (GBP/MWh)","Grid Curtailment (%)"]'::jsonb
) ON CONFLICT (deal_id) DO NOTHING;
""")

# ── Covenant thresholds ──
run_sql(f"""
INSERT INTO covenant_thresholds (deal_id, covenant_name, ratio_name, covenant_category, test_type, direction, test_frequency, lockup_level, trigger_level, default_level) VALUES
({DEAL_ID}, 'Senior DSCR', 'seniorDscr', 'cash_flow_cover', 'hard_covenant', 'min', 'semi_annual', 1.10, 1.05, 1.00),
({DEAL_ID}, 'LLCR', 'llcr', 'cash_flow_cover', 'hard_covenant', 'min', 'semi_annual', 1.15, 1.10, 1.05)
ON CONFLICT DO NOTHING;
""")

# ── Reporting schedule + periods ──
run_sql(f"""
INSERT INTO deal_reporting_schedule (deal_id, periodicity, first_period_start, final_period_end, fiscal_year_end_month, reporting_lag_days) VALUES
({DEAL_ID}, 'semi_annual', '2026-01-01', '2046-01-01', 12, 60)
ON CONFLICT (deal_id) DO NOTHING;
""")

# Generate 40 semi-annual periods
period_values = []
for p in range(1, 41):
    year = 2026 + (p - 1) // 2
    half = "H1" if p % 2 == 1 else "H2"
    ps = f"{year}-01-01" if half == "H1" else f"{year}-07-01"
    pe = f"{year}-06-30" if half == "H1" else f"{year}-12-31"
    ptype = "historical" if year < 2026 else ("current" if year == 2026 and half == "H1" else "forecast")
    status = "approved" if ptype != "forecast" else "awaiting"
    period_values.append(f"({DEAL_ID}, '{year}{half}', '{half} {year}', '{ps}', '{pe}', 'semi_annual', {p}, '{ptype}', '{status}')")

run_sql(f"""
INSERT INTO deal_reporting_periods (deal_id, period_flag, period_label, period_start, period_end, period_frequency, period_ordinal, period_type, data_status) VALUES
{','.join(period_values)}
ON CONFLICT (deal_id, period_flag) DO NOTHING;
""")

# ── Forecast cases ──
run_sql(f"""
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES
(25, {DEAL_ID}, 'wigmore-mgmt', 'Wigmore Management Case', 'management_case', 1, TRUE, 'PM - Renewables', 'Management case from IC memo. PPA-backed with P50 solar assumptions.', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES
(28, 25, 1, 'Mgmt v1', 'active', 'sponsor_model', 'IC memo management case frozen Jan 2026.', '2026-01-01', '2026-01-01T09:00:00Z', TRUE)
ON CONFLICT DO NOTHING;
""")

# ── Generate forecast ──
forecast_values = []
debt = OPENING_DEBT
cash = 0.0

for p in range(1, 41):
    year_idx = (p - 1) // 2

    # Revenue: PPA indexed at CPI for first 30 periods, then -20% for merchant tail
    if p <= PPA_EXPIRY_PERIOD:
        rev = BASE_REV_HALF * (1 + CPI) ** year_idx
    else:
        # Merchant: 80% of PPA price, still growing with power prices
        rev = BASE_REV_HALF * 0.80 * (1 + CPI) ** year_idx

    # Degradation: 0.5% per year on revenue (panel degradation)
    degradation_factor = (1 - 0.005) ** year_idx
    rev *= degradation_factor

    opex = BASE_OPEX_HALF * (1 + OPEX_GROWTH) ** year_idx
    ebitda = rev - opex
    capex = BASE_CAPEX_HALF * (1 + 0.02) ** year_idx
    tax = BASE_TAX_HALF * (1 + CPI) ** year_idx

    interest_on_cash = cash * 0.04 / 2
    cfads = ebitda - capex - tax + interest_on_cash

    senior_interest = debt * NOTE_RATE / 2
    senior_principal = min(debt, OPENING_DEBT / PERIODS)  # Straight-line amortisation
    senior_ds = senior_interest + senior_principal

    cf_after_senior = cfads - senior_ds
    net_cf = cf_after_senior

    dscr = cfads / senior_ds if senior_ds > 0 else 99
    distributions = max(0, net_cf * 0.5) if dscr > 1.10 and net_cf > 0 else 0

    closing_cash = cash + net_cf - distributions

    debt = max(0, debt - senior_principal)
    cash = closing_cash

    items = {
        'total_revenue': round(rev, 2),
        'total_operating_costs': round(-opex, 2),
        'ebitda': round(ebitda, 2),
        'capital_expenditure': round(-capex, 2),
        'tax_paid': round(-tax, 2),
        'pre_finance_post_tax_cf': round(ebitda - capex - tax, 2),
        'interest_on_cash': round(interest_on_cash, 2),
        'cfads': round(cfads, 2),
        'senior_interest': round(-senior_interest, 2),
        'senior_principal': round(-senior_principal, 2),
        'senior_debt_service': round(-senior_ds, 2),
        'cf_after_senior_ds': round(cf_after_senior, 2),
        'net_cashflow': round(net_cf, 2),
        'cash_bf': round(cash - net_cf + distributions, 2),
        'distributions': round(-distributions, 2),
        'cash_cf': round(closing_cash, 2),
        'senior_dscr': round(dscr, 4),
    }

    for line_key, value in items.items():
        if value is not None:
            forecast_values.append(
                f"({DEAL_ID}, 28, (SELECT id FROM deal_reporting_periods WHERE deal_id={DEAL_ID} AND period_ordinal={p}), '{line_key}', {value})"
            )

sql = "INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES\n"
sql += ",\n".join(forecast_values)
sql += "\nON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;"

run_sql(sql)

# ── KPI scenario series (management_case + combined_downside, held constant across periods)
run_sql(f"""
-- Management case (IC baseline) KPI series for Wigmore Solar
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value)
SELECT {DEAL_ID}, fcv.id, drp.id, kpi.kpi_key, kpi.value
FROM (VALUES
    ('sector_kpi_1',   98.0),    -- Technical Availability (%)
    ('sector_kpi_2',   82.0),    -- Performance Ratio (%)
    ('sector_kpi_3',    0.5),    -- Degradation Rate (% pa)
    ('sector_kpi_4', 1050.0),    -- Solar Irradiance (kWh/m2)
    ('sector_kpi_5',  110.0),    -- Net Generation (GWh)
    ('sector_kpi_6',   12.5),    -- Capacity Factor (%)
    ('sector_kpi_7',   65.0),    -- PPA Price (GBP/MWh)
    ('sector_kpi_8',    2.0)     -- Grid Curtailment (%)
) AS kpi(kpi_key, value)
CROSS JOIN deal_reporting_periods drp
JOIN forecast_cases fc ON fc.deal_id = {DEAL_ID} AND (fc.scenario_kind = 'management_case' OR fc.case_type = 'management_case')
JOIN forecast_case_versions fcv ON fcv.forecast_case_id = fc.id AND fcv.is_active = TRUE
WHERE drp.deal_id = {DEAL_ID}
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- Combined downside KPI series
INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value)
SELECT {DEAL_ID}, fcv.id, drp.id, kpi.kpi_key, kpi.value
FROM (VALUES
    ('sector_kpi_1',   92.0),   -- Technical Availability stress
    ('sector_kpi_2',   72.0),   -- Performance Ratio stress
    ('sector_kpi_4',  850.0),   -- P90 solar resource
    ('sector_kpi_5',   85.0),   -- Low generation
    ('sector_kpi_8',    8.0)    -- Grid congestion
) AS kpi(kpi_key, value)
CROSS JOIN deal_reporting_periods drp
JOIN forecast_cases fc ON fc.deal_id = {DEAL_ID} AND (fc.scenario_kind = 'combined_downside' OR fc.case_type = 'combined_downside')
JOIN forecast_case_versions fcv ON fcv.forecast_case_id = fc.id AND fcv.is_active = TRUE
WHERE drp.deal_id = {DEAL_ID}
ON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;

-- Register KPI display labels
INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal, is_active) VALUES
({DEAL_ID}, 'sector_kpi_1', 'Technical Availability (%)', 1, TRUE),
({DEAL_ID}, 'sector_kpi_2', 'Performance Ratio (%)',      2, TRUE),
({DEAL_ID}, 'sector_kpi_3', 'Degradation Rate (% pa)',    3, TRUE),
({DEAL_ID}, 'sector_kpi_4', 'Solar Irradiance (kWh/m2)',  4, TRUE),
({DEAL_ID}, 'sector_kpi_5', 'Net Generation (GWh)',       5, TRUE),
({DEAL_ID}, 'sector_kpi_6', 'Capacity Factor (%)',        6, TRUE),
({DEAL_ID}, 'sector_kpi_7', 'PPA Price (GBP/MWh)',        7, TRUE),
({DEAL_ID}, 'sector_kpi_8', 'Grid Curtailment (%)',       8, TRUE)
ON CONFLICT (deal_id, line_key) DO NOTHING;
""")

print(f"\nWigmore Solar (deal {DEAL_ID}) fully ingested.")
print(f"Forecast: {len(forecast_values)} line items across 40 periods.")
