"""Compute LLCR for each period of the North Sea OWF management case.

LLCR = (NPV of future CFADS + Reserve balances) / Debt outstanding
Discount rate = IRR of the cost of debt (computed from the debt service cashflows)

The cost of debt IRR is the rate that equates the initial debt drawdown to the
present value of all future debt service payments. For a fixed-rate note at 5%
semi-annual, this is approximately 5% annual = 2.5% per semi-annual period.
"""
import subprocess

# Data from the forecast (extracted above)
periods_data = [
    (1, 8090000, -6223076.92, 4833461.54),
    (2, 8096669.23, -6228207.10, 5167692.60),
    (3, 8295853.85, -6381426.04, 5524906.51),
    (4, 8302998.13, -6386921.64, 5882944.76),
    (5, 8507246.40, -6544035.69, 6264550.11),
    (6, 8514878.50, -6549906.54, 6647036.09),
    (7, 8724311.16, -6711008.58, 7053687.38),
    (8, 8732444.19, -6717264.76, 7461277.09),
    (9, 8947184.79, -6882449.84, 7893644.57),
    (10, 8955832.14, -6889101.64, 8327009.81),
    (11, 9176007.11, -7058467.01, 8785779.86),
    (12, 9185182.51, -7065525.01, 9245608.61),
    (13, 9410921.20, -7239170.15, 9731484.14),
    (14, 9420638.71, -7246645.16, 10218480.91),
    (15, 9652073.48, -7424671.91, 10732181.70),
    (16, 9662347.50, -7432575.00, 11247067.95),
    (17, 9899613.76, -7615087.51, 11789331.07),
    (18, 9910459.03, -7623430.02, 12332845.58),
    (19, 10153695.35, -2823220.50, 15398083.00),  # Final debt repayment period
    (20, 10215000.10, 0, 19905583.05),
    (21, 10543040.26, 0, 24577103.19),
    # ... periods 22-42 have zero debt
]

# Debt balances (opening of each period, computed from principal repayments)
# Starting at 100M, subtract principal each period
opening_debt = [100_000_000]
principals = [3723076.92, 3821284.02, 4070035.06, 4177281.54, 4438827.63,
              4555669.17, 4830662.94, 4957685.69, 5246812.91, 5384635.04,
              5688616.28, 5837889.69, 6157482.08, 6318894.14, 6654893.24,
              6829168.66, 7182410.39, 7370313.15, 2754361.46, 0, 0]

for p in principals:
    opening_debt.append(max(0, opening_debt[-1] - p))

# DSRA balance = 6.5M (constant, LC-backed)
DSRA_BALANCE = 6_500_000

# Discount rate: cost of debt = 5% annual = 2.5% semi-annual
DISCOUNT_RATE = 0.025  # per semi-annual period

# CFADS for all 42 periods
all_cfads = [
    8090000, 8096669.23, 8295853.85, 8302998.13, 8507246.40, 8514878.50,
    8724311.16, 8732444.19, 8947184.79, 8955832.14, 9176007.11, 9185182.51,
    9410921.20, 9420638.71, 9652073.48, 9662347.50, 9899613.76, 9910459.03,
    10153695.35, 10215000.10, 10543040.26, 10636470.66, 10974379.21, 11072123.01,
    11420174.29, 11522376.04, 11880851.65, 11987660.17, 12356849.13, 12468417.62,
    12848616.54, 12965102.70, 13356616.01, 13478182.17, 13881322.29, 14008135.51,
    14423223.06, 14555455.29, 14982819.30, 15120647.49, 15560625.62, 15704231.87,
]

# Last period with debt outstanding
last_debt_period = 19  # period 19 (H1 2033) is the final repayment

# Compute LLCR for each period where debt is outstanding
sql_values = []
for t in range(len(all_cfads)):
    period_ord = t + 1
    debt = opening_debt[t] if t < len(opening_debt) else 0

    if debt <= 0:
        # No debt = LLCR is infinite, store as null or skip
        continue

    # NPV of future CFADS from period t to last_debt_period (loan life)
    npv_cfads = 0
    for future_t in range(t, min(last_debt_period, len(all_cfads))):
        periods_ahead = future_t - t
        npv_cfads += all_cfads[future_t] / (1 + DISCOUNT_RATE) ** periods_ahead

    # LLCR = (NPV of future CFADS + reserve balances) / debt outstanding
    llcr = (npv_cfads + DSRA_BALANCE) / debt
    llcr = round(llcr, 4)

    sql_values.append(
        f"(8, 25, (SELECT id FROM deal_reporting_periods WHERE deal_id=8 AND period_ordinal={period_ord}), 'llcr', {llcr})"
    )

sql = "INSERT INTO forecast_period_items (deal_id, forecast_case_version_id, reporting_period_id, line_key, value) VALUES\n"
sql += ",\n".join(sql_values)
sql += "\nON CONFLICT (forecast_case_version_id, reporting_period_id, line_key) DO NOTHING;"

result = subprocess.run(
    ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
    input=sql, capture_output=True, text=True, timeout=30
)
print(result.stdout.strip() if result.stdout else "no output")
if result.stderr:
    print("STDERR:", result.stderr[-300:])
print(f"\nInserted LLCR for {len(sql_values)} periods")

# Print the LLCRs for verification
for i, v in enumerate(sql_values):
    period = i + 1
    llcr_val = v.split("'llcr', ")[1].rstrip(")")
    debt_m = opening_debt[i] / 1e6 if i < len(opening_debt) else 0
    print(f"  Period {period}: LLCR = {llcr_val}x  (debt outstanding: {debt_m:.1f}M)")
