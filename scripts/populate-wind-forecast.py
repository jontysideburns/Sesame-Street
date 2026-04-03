"""Populate the management case forecast grid for North Sea OWF (deal 8).
Based on spreadsheet data: Revenue 20M/yr, EBITDA 17M/yr, CFADS 16M/yr, DS 13M/yr.
CfD-indexed revenue growing at 2.5% CPI. O&M costs growing at 3% (above inflation).
Senior note sculpted amortisation from 100M to zero over 20 years.
"""
import subprocess

DEAL_ID = 8
VERSION_ID = 25  # Mgmt v1

# Base annual figures from spreadsheet (GBP)
BASE_REVENUE = 20_000_000
BASE_OPEX = 3_000_000  # EBITDA 17M = Revenue 20M - Opex 3M
BASE_CAPEX = 500_000  # Maintenance capex
BASE_TAX = 500_000
OPENING_DEBT = 100_000_000
OPENING_CASH = 4_500_000
SHL_BALANCE = 30_000_000
SHL_INTEREST_RATE = 0.08  # 800bp
SENIOR_RATE = 0.05  # ~200bp over GILT (approx 3% GILT + 2% margin)
CPI = 0.025  # Revenue indexation
OPEX_GROWTH = 0.03  # Cost inflation
CAPEX_GROWTH = 0.025

# Generate 42 semi-annual periods of data
lines = []
debt_balance = OPENING_DEBT
cash = OPENING_CASH

for period_ord in range(1, 43):
    year_idx = (period_ord - 1) // 2  # 0-indexed year
    is_h2 = (period_ord % 2 == 0)

    # Revenue: CfD indexed at CPI, semi-annual = half of annual
    annual_rev = BASE_REVENUE * (1 + CPI) ** year_idx
    rev = annual_rev / 2

    # Operating costs: growing at 3%
    annual_opex = BASE_OPEX * (1 + OPEX_GROWTH) ** year_idx
    opex = annual_opex / 2

    # EBITDA
    ebitda = rev - opex

    # Capex (maintenance only, growing slowly)
    capex = (BASE_CAPEX * (1 + CAPEX_GROWTH) ** year_idx) / 2

    # Tax
    tax = BASE_TAX / 2 * (1 + CPI) ** year_idx

    # Pre-finance CF
    pre_fin_cf = ebitda - capex - tax

    # Interest on cash
    interest_on_cash = cash * 0.04 / 2  # 4% on cash balances

    # CFADS
    cfads = pre_fin_cf + interest_on_cash

    # Senior interest (fixed rate on outstanding balance)
    senior_interest = debt_balance * SENIOR_RATE / 2

    # Senior principal (sculpted: target DSCR ~1.3x, so DS = CFADS/1.3)
    target_ds = cfads / 1.30
    senior_principal = max(0, target_ds - senior_interest)
    # Don't overpay
    senior_principal = min(senior_principal, debt_balance)

    senior_ds = senior_interest + senior_principal
    cf_after_senior = cfads - senior_ds

    # SHL interest (PIK or cash)
    shl_interest = SHL_BALANCE * SHL_INTEREST_RATE / 2

    # Net cashflow
    net_cf = cf_after_senior - shl_interest

    # Distributions (if positive and DSCR > 1.15)
    dscr = cfads / senior_ds if senior_ds > 0 else 99
    distributions = max(0, net_cf * 0.5) if dscr > 1.15 else 0

    # Cash balance
    closing_cash = cash + net_cf - distributions

    # Update for next period
    debt_balance = max(0, debt_balance - senior_principal)
    cash = closing_cash

    # Build SQL values for key line items
    items = {
        'total_revenue': round(rev, 2),
        'total_operating_costs': round(-opex, 2),
        'ebitda': round(ebitda, 2),
        'capital_expenditure': round(-capex, 2),
        'working_capital_movement': 0,
        'reserve_account_movements': 0,
        'pre_finance_pre_tax_cf': round(ebitda - capex, 2),
        'tax_paid': round(-tax, 2),
        'pre_finance_post_tax_cf': round(pre_fin_cf, 2),
        'interest_on_cash': round(interest_on_cash, 2),
        'cfads': round(cfads, 2),
        'senior_interest': round(-senior_interest, 2),
        'senior_principal': round(-senior_principal, 2),
        'senior_debt_service': round(-senior_ds, 2),
        'cf_after_senior_ds': round(cf_after_senior, 2),
        'shareholder_loan_interest': round(-shl_interest, 2),
        'net_cashflow': round(net_cf, 2),
        'cash_bf': round(cash - net_cf + distributions, 2),  # opening
        'distributions': round(-distributions, 2),
        'cash_cf': round(closing_cash, 2),
        'senior_dscr': round(dscr, 4),
        'net_debt_ebitda': round(debt_balance / (ebitda * 2), 2) if ebitda > 0 else None,
        'ffo': round(ebitda - tax + senior_interest + interest_on_cash, 2),
    }

    for line_key, value in items.items():
        if value is not None:
            lines.append(f"(8, 25, (SELECT id FROM deal_reporting_periods WHERE deal_id=8 AND period_ordinal={period_ord}), '{line_key}', {value})")

# Build SQL
sql = "INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES\n"
sql += ",\n".join(lines)
sql += "\nON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;"

# Execute
result = subprocess.run(
    ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
    input=sql, capture_output=True, text=True, timeout=30
)
print(result.stdout[-200:] if result.stdout else "no stdout")
if result.stderr:
    print("STDERR:", result.stderr[-500:])
print(f"\nGenerated {len(lines)} forecast line items across 42 periods")
