"""Generate Wigmore Solar credit case forecast.
Revenue: cumulative 0.25% pa decline (0.25% yr1, 0.5% yr2, 0.75% yr3...)
Opex: 5% higher than management case in every period
Tax: falls proportionally with reduced EBITDA
All other assumptions same as management case.
"""
import subprocess

DEAL_ID = 9
VERSION_ID = 29  # Credit v1

# Management case base assumptions (same as ingest script)
BASE_REV_HALF = 7_880_000
BASE_OPEX_HALF = 1_180_000
BASE_CAPEX_HALF = 500_000
OPENING_DEBT = 100_000_000
NOTE_RATE = 0.05
PERIODS = 40
CPI = 0.025
OPEX_GROWTH = 0.03
PPA_EXPIRY_PERIOD = 30

# Management case tax rate derived from base: tax/EBITDA
# Base EBITDA = 7.88M - 1.18M = 6.7M, base tax = 0.3M → ~4.5% effective rate
MGMT_BASE_TAX_HALF = 300_000
MGMT_BASE_EBITDA_HALF = BASE_REV_HALF - BASE_OPEX_HALF  # 6.7M

forecast_values = []
debt = OPENING_DEBT
cash = 0.0

for p in range(1, PERIODS + 1):
    year_idx = (p - 1) // 2  # 0-indexed year number

    # ── Management case revenue (before credit case adjustment) ──
    if p <= PPA_EXPIRY_PERIOD:
        mgmt_rev = BASE_REV_HALF * (1 + CPI) ** year_idx
    else:
        mgmt_rev = BASE_REV_HALF * 0.80 * (1 + CPI) ** year_idx
    degradation_factor = (1 - 0.005) ** year_idx
    mgmt_rev *= degradation_factor

    # ── Credit case adjustments ──
    # Revenue: cumulative 0.25% pa decline
    # Year 1 (periods 1-2): -0.25%, Year 2 (3-4): -0.50%, Year 3 (5-6): -0.75% etc.
    year_number = year_idx + 1  # 1-indexed
    cumulative_rev_decline = 0.0025 * year_number  # 0.25% per year, cumulative
    rev = mgmt_rev * (1 - cumulative_rev_decline)

    # Opex: 5% higher than management case
    mgmt_opex = BASE_OPEX_HALF * (1 + OPEX_GROWTH) ** year_idx
    opex = mgmt_opex * 1.05  # 5% uplift

    ebitda = rev - opex

    # Capex: same as management case
    capex = BASE_CAPEX_HALF * (1 + 0.02) ** year_idx

    # Tax: proportional to EBITDA reduction vs management case
    mgmt_ebitda = mgmt_rev - mgmt_opex
    if mgmt_ebitda > 0:
        ebitda_ratio = max(0, ebitda / mgmt_ebitda)
    else:
        ebitda_ratio = 0
    mgmt_tax = MGMT_BASE_TAX_HALF * (1 + CPI) ** year_idx
    tax = mgmt_tax * ebitda_ratio

    interest_on_cash = cash * 0.04 / 2
    cfads = ebitda - capex - tax + interest_on_cash

    senior_interest = debt * NOTE_RATE / 2
    senior_principal = min(debt, OPENING_DEBT / PERIODS)
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
                f"({DEAL_ID}, {VERSION_ID}, (SELECT id FROM deal_reporting_periods WHERE deal_id={DEAL_ID} AND period_ordinal={p}), '{line_key}', {value})"
            )

sql = "INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES\n"
sql += ",\n".join(forecast_values)
sql += "\nON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;"

result = subprocess.run(
    ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
    input=sql, capture_output=True, text=True, timeout=60
)
print(result.stdout.strip() if result.stdout else "no output")
if result.stderr and 'ERROR' in result.stderr:
    print("ERROR:", result.stderr[-300:])

# Print comparison for first few periods
print(f"\nInserted {len(forecast_values)} credit case line items")
print("\nComparison (first 6 periods):")
print(f"{'Period':<8} {'Mgmt Rev':>10} {'Credit Rev':>12} {'Rev Decline':>12} {'Mgmt DSCR':>10} {'Credit DSCR':>12}")

debt2 = OPENING_DEBT
cash2 = 0.0
for p in range(1, 7):
    yi = (p-1)//2
    yr = yi + 1
    if p <= PPA_EXPIRY_PERIOD:
        mr = BASE_REV_HALF * (1+CPI)**yi * (1-0.005)**yi
    else:
        mr = BASE_REV_HALF * 0.80 * (1+CPI)**yi * (1-0.005)**yi
    cr = mr * (1 - 0.0025 * yr)
    mo = BASE_OPEX_HALF * (1+OPEX_GROWTH)**yi
    co = mo * 1.05
    me = mr - mo
    ce = cr - co
    mt = MGMT_BASE_TAX_HALF * (1+CPI)**yi
    ct = mt * max(0, ce/me) if me > 0 else 0
    mc = me - BASE_CAPEX_HALF*(1+0.02)**yi - mt
    cc = ce - BASE_CAPEX_HALF*(1+0.02)**yi - ct
    si = debt2 * NOTE_RATE / 2
    sp = min(debt2, OPENING_DEBT/PERIODS)
    ds = si + sp
    md = mc / ds if ds > 0 else 99
    cd = cc / ds if ds > 0 else 99
    print(f"H{(p%2)+1} {2026+yi:<4} {mr:>10,.0f} {cr:>12,.0f} {-0.0025*yr*100:>10.2f}% {md:>10.2f}x {cd:>12.2f}x")
    debt2 = max(0, debt2 - sp)
