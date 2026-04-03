"""Regenerate all 3 forecast cases for Wigmore Solar with 2024 origination.
Management: base case
Credit: -0.25% pa cumulative revenue, +5% opex, same tax rate
Combined Downside: -5% revenue, +10% opex, +3% corporate tax rate
"""
import subprocess

DEAL_ID = 9
PERIODS = 44  # H1 2024 to H2 2045
BASE_REV_HALF = 7_880_000
BASE_OPEX_HALF = 1_180_000
BASE_CAPEX_HALF = 500_000
BASE_TAX_HALF = 300_000
OPENING_DEBT = 100_000_000
NOTE_RATE = 0.05
CPI = 0.025
OPEX_GROWTH = 0.03
PPA_EXPIRY_PERIOD = 34  # 17 years from 2024 = H2 2040 (period 34)
# PPA is 15 years from origination 2024 = expires 2039, but let's keep 2041 as stated
# Actually: PPA for 15 years from 2026 stated in brief. Deal originated 2024, PPA starts with revenue.
# Let's say PPA runs 2024-2039 = periods 1-32, then merchant from period 33

PPA_END = 32  # H2 2039

CASES = {
    28: {"name": "Management", "rev_adj": lambda yi: 1.0, "opex_mult": 1.0, "tax_add": 0.0},
    29: {"name": "Credit", "rev_adj": lambda yi: 1.0 - 0.0025 * (yi + 1), "opex_mult": 1.05, "tax_add": 0.0},
    30: {"name": "Downside", "rev_adj": lambda yi: 0.95, "opex_mult": 1.10, "tax_add": 0.03},
}

def run_sql(sql):
    result = subprocess.run(
        ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
        input=sql, capture_output=True, text=True, timeout=60
    )
    if result.stdout.strip():
        print(result.stdout.strip())
    if result.stderr and 'ERROR' in result.stderr:
        print("ERROR:", result.stderr[-300:])

# Create combined downside case
run_sql("""
INSERT INTO forecast_cases (id, deal_id, case_key, case_name, case_type, comparison_priority, drives_monitoring, owner_name, summary, created_at) VALUES
(27, 9, 'wigmore-downside', 'Wigmore Combined Downside', 'combined_downside', 3, FALSE, 'PM - Renewables', 'Combined downside: -5% revenue, +10% opex, +3% tax rate.', NOW())
ON CONFLICT DO NOTHING;

INSERT INTO forecast_case_versions (id, forecast_case_id, version_number, version_label, version_status, source_domain, summary, effective_from, activated_at, is_active) VALUES
(30, 27, 1, 'Downside v1', 'active', 'pm_downside', 'Combined downside frozen Jan 2024.', '2024-01-01', '2024-01-01T09:00:00Z', TRUE)
ON CONFLICT DO NOTHING;
""")

for version_id, case in CASES.items():
    forecast_values = []
    debt = OPENING_DEBT
    cash = 0.0

    for p in range(1, PERIODS + 1):
        year_idx = (p - 1) // 2

        # Base revenue with CPI + degradation
        if p <= PPA_END:
            base_rev = BASE_REV_HALF * (1 + CPI) ** year_idx
        else:
            base_rev = BASE_REV_HALF * 0.80 * (1 + CPI) ** year_idx
        degradation = (1 - 0.005) ** year_idx
        base_rev *= degradation

        # Apply case-specific revenue adjustment
        rev = base_rev * case["rev_adj"](year_idx)

        # Opex with growth + case multiplier
        opex = BASE_OPEX_HALF * (1 + OPEX_GROWTH) ** year_idx * case["opex_mult"]

        ebitda = rev - opex
        capex = BASE_CAPEX_HALF * (1 + 0.02) ** year_idx

        # Tax: base rate + case-specific additional rate
        base_tax_rate = BASE_TAX_HALF / (BASE_REV_HALF - BASE_OPEX_HALF)  # ~4.5%
        effective_tax_rate = base_tax_rate + case["tax_add"]
        tax = max(0, ebitda * effective_tax_rate)

        interest_on_cash = cash * 0.04 / 2
        cfads = ebitda - capex - tax + interest_on_cash

        senior_interest = debt * NOTE_RATE / 2
        senior_principal = min(debt, OPENING_DEBT / 44)  # amortising over 44 periods
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

        for lk, val in items.items():
            if val is not None:
                forecast_values.append(
                    f"({DEAL_ID}, {version_id}, (SELECT id FROM deal_reporting_periods WHERE deal_id={DEAL_ID} AND period_ordinal={p}), '{lk}', {val})"
                )

    sql = "INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES\n"
    sql += ",\n".join(forecast_values)
    sql += "\nON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;"

    run_sql(sql)
    print(f"{case['name']} case: {len(forecast_values)} items inserted")

# Print comparison for period 1
print("\nH1 2024 comparison:")
print(f"{'Metric':<20} {'Management':>12} {'Credit':>12} {'Downside':>12}")
for lk in ['total_revenue', 'total_operating_costs', 'ebitda', 'tax_paid', 'cfads', 'senior_dscr']:
    vals = []
    for vid in [28, 29, 30]:
        # Recalculate quickly
        yi = 0
        br = BASE_REV_HALF * (1 - 0.005) ** yi
        case = CASES[vid]
        r = br * case["rev_adj"](yi)
        o = BASE_OPEX_HALF * case["opex_mult"]
        e = r - o
        btr = BASE_TAX_HALF / (BASE_REV_HALF - BASE_OPEX_HALF)
        t = e * (btr + case["tax_add"])
        c = e - BASE_CAPEX_HALF - t
        ds = OPENING_DEBT * NOTE_RATE / 2 + OPENING_DEBT / 44
        if lk == 'total_revenue': vals.append(r)
        elif lk == 'total_operating_costs': vals.append(-o)
        elif lk == 'ebitda': vals.append(e)
        elif lk == 'tax_paid': vals.append(-t)
        elif lk == 'cfads': vals.append(c)
        elif lk == 'senior_dscr': vals.append(c / ds)
    print(f"{lk:<20} {vals[0]:>12,.0f} {vals[1]:>12,.0f} {vals[2]:>12,.0f}")
