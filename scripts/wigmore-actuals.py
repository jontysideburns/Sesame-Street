"""Generate actual period data for Wigmore Solar (deal 9).
H1 2024, H2 2024: in line with management case
H1 2025: availability drops 2% → revenue down ~2%
H2 2025: availability drops further 1% annualised → revenue down ~3% cumulative
This creates a deteriorating trend in the grade engine.
"""
import subprocess

DEAL_ID = 9
BASE_REV_HALF = 7_880_000
BASE_OPEX_HALF = 1_180_000
BASE_CAPEX_HALF = 500_000
BASE_TAX_HALF = 300_000
OPENING_DEBT = 100_000_000
NOTE_RATE = 0.05
CPI = 0.025

# Availability impact on revenue (availability directly scales generation → revenue)
# Period 1-2: 100% of expected (in line)
# Period 3: 98% (2% availability drop)
# Period 4: 97% (cumulative 3% drop — 2% + 1% further)
AVAILABILITY_FACTOR = {1: 1.00, 2: 1.00, 3: 0.98, 4: 0.97}

def run_sql(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
        input=sql, capture_output=True, text=True, timeout=60
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr and 'ERROR' in result.stderr:
        print("ERROR:", result.stderr[-300:])

actual_values = []
debt = OPENING_DEBT
cash = 0.0

for p in range(1, 5):  # 4 historical periods
    year_idx = (p - 1) // 2
    avail = AVAILABILITY_FACTOR[p]

    # Revenue: same as management case base, scaled by availability
    rev = BASE_REV_HALF * (1 + CPI) ** year_idx * (1 - 0.005) ** year_idx * avail

    # Opex: in line with management (no stress on costs)
    opex = BASE_OPEX_HALF * (1 + 0.03) ** year_idx

    ebitda = rev - opex
    capex = BASE_CAPEX_HALF * (1 + 0.02) ** year_idx

    # Tax proportional to EBITDA
    base_ebitda = BASE_REV_HALF * (1 + CPI) ** year_idx * (1 - 0.005) ** year_idx - opex
    tax_rate = BASE_TAX_HALF / (BASE_REV_HALF - BASE_OPEX_HALF) if (BASE_REV_HALF - BASE_OPEX_HALF) > 0 else 0.045
    tax = max(0, ebitda * tax_rate)

    interest_on_cash = cash * 0.04 / 2
    cfads = ebitda - capex - tax + interest_on_cash

    senior_interest = debt * NOTE_RATE / 2
    senior_principal = min(debt, OPENING_DEBT / 44)
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

    period_label = f"H{1 + (p-1) % 2} {2024 + (p-1) // 2}"
    mgmt_dscr = 1.18  # management case expected
    headroom_pct = round(((dscr - 1.05) / (mgmt_dscr - 1.05)) * 100, 1)
    erosion_pct = round(100 - headroom_pct, 1)

    print(f"{period_label}: Rev {rev:,.0f} | EBITDA {ebitda:,.0f} | DSCR {dscr:.4f}x | Avail {avail*100:.0f}% | Headroom {headroom_pct:.1f}% | Erosion {erosion_pct:.1f}%")

    for lk, val in items.items():
        if val is not None:
            actual_values.append(
                f"({DEAL_ID}, (SELECT id FROM deal_reporting_periods WHERE deal_id={DEAL_ID} AND period_ordinal={p}), "
                f"'{lk}', {val}, {val}, {val}, 'extracted', 'approved')"
            )

# Insert into period_financial_items (actuals table)
sql = """INSERT INTO period_financial_items
(deal_id, reporting_period_id, line_key, reported_value, computed_value, approved_value, value_origin, item_status) VALUES\n"""
sql += ",\n".join(actual_values)
sql += "\nON CONFLICT (deal_id, reporting_period_id, line_key) DO NOTHING;"

run_sql(sql)
print(f"\nInserted {len(actual_values)} actual line items across 4 periods")

# Also update the covenants table with the latest actual DSCR (H2 2025)
# H2 2025 DSCR needs to be calculated — it's the last period
# Let me recalculate for p=4
yi = 1  # year index for H2 2025
avail_p4 = 0.97
rev_p4 = BASE_REV_HALF * (1 + CPI) ** yi * (1 - 0.005) ** yi * avail_p4
opex_p4 = BASE_OPEX_HALF * (1 + 0.03) ** yi
ebitda_p4 = rev_p4 - opex_p4
tax_rate_p4 = BASE_TAX_HALF / (BASE_REV_HALF - BASE_OPEX_HALF)
tax_p4 = ebitda_p4 * tax_rate_p4
capex_p4 = BASE_CAPEX_HALF * (1 + 0.02) ** yi
# Need running debt/cash from loop above — use approximate
approx_debt = OPENING_DEBT - 3 * (OPENING_DEBT / 44)
cfads_p4 = ebitda_p4 - capex_p4 - tax_p4
si_p4 = approx_debt * NOTE_RATE / 2
sp_p4 = OPENING_DEBT / 44
ds_p4 = si_p4 + sp_p4
latest_dscr = cfads_p4 / ds_p4

headroom = round(((latest_dscr - 1.05) / (1.18 - 1.05)) * 100, 1)

run_sql(f"""
UPDATE covenants SET
  current_value = {round(latest_dscr, 2)},
  management_case_value = 1.18,
  threshold_default = 1.05,
  headroom_pct = {headroom},
  status = CASE WHEN {round(latest_dscr, 2)} <= 1.05 THEN 'trigger_event' WHEN {round(latest_dscr, 2)} <= 1.10 THEN 'lock_up' ELSE 'performing' END
WHERE deal_id = {DEAL_ID};
""")

print(f"\nLatest DSCR: {latest_dscr:.4f}x | Headroom: {headroom}%")

# Update deal metrics
run_sql(f"""
UPDATE deals SET metrics = jsonb_set(
  metrics, '{{seniorDscr}}', '{round(latest_dscr, 4)}'::jsonb
) WHERE id = {DEAL_ID};
""")
