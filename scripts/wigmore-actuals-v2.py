"""Generate actuals for Wigmore Solar calibrated against management case forecast.
H1 2024: in line (100% of mgmt revenue)
H2 2024: in line (100%)
H1 2025: availability drops 2% → 98% of mgmt revenue
H2 2025: availability drops further → 95% of mgmt revenue (cumulative 5% loss)

This creates erosion % of: ~0%, ~0%, ~15%, ~35% → deteriorating trend.
"""
import subprocess

DEAL_ID = 9

# Management case values per period (from database)
MGMT = {
    1: {"rev": 7880000, "ebitda": 6700000, "cfads": 5900000, "ds": -4772727.27, "dscr": 1.2362,
        "opex": -1180000, "capex": -500000, "tax": -300000, "interest_cash": 0,
        "si": -2500000, "sp": -2272727.27, "cash_bf": 0},
    2: {"rev": 7880000, "ebitda": 6700000, "cfads": 5911272.73, "ds": -4715909.09, "dscr": 1.2535,
        "opex": -1180000, "capex": -500000, "tax": -300000, "interest_cash": 11272.73,
        "si": -2443181.82, "sp": -2272727.27, "cash_bf": 563636.37},
    3: {"rev": 8036615, "ebitda": 6821215, "cfads": 6029013.83, "ds": -4659090.91, "dscr": 1.294,
        "opex": -1215400, "capex": -510000, "tax": -306750, "interest_cash": 24748.83,
        "si": -2386363.64, "sp": -2272727.27, "cash_bf": 1159186.01},
    4: {"rev": 8036615, "ebitda": 6821215, "cfads": 6042713.06, "ds": -4602272.73, "dscr": 1.313,
        "opex": -1215400, "capex": -510000, "tax": -306750, "interest_cash": 38248.06,
        "si": -2329545.46, "sp": -2272727.27, "cash_bf": 1789186.01},
}

# Availability factors — these reduce revenue proportionally
AVAIL = {1: 1.00, 2: 1.00, 3: 0.98, 4: 0.95}

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
default_threshold = 1.05

print(f"{'Period':<10} {'Mgmt DSCR':>10} {'Act DSCR':>10} {'Headroom':>10} {'Erosion':>10}")

for p in range(1, 5):
    m = MGMT[p]
    avail = AVAIL[p]

    # Scale revenue by availability, keep everything else from mgmt case
    act_rev = m["rev"] * avail
    act_opex = m["opex"]  # costs unchanged
    act_ebitda = act_rev + act_opex  # opex is negative

    # Tax scales with EBITDA
    if m["ebitda"] != 0:
        tax_ratio = abs(m["tax"]) / m["ebitda"]
    else:
        tax_ratio = 0.045
    act_tax = -abs(act_ebitda * tax_ratio)

    act_cfads = act_ebitda + m["capex"] + act_tax + m["interest_cash"]
    act_ds = m["ds"]  # debt service unchanged
    act_dscr = abs(act_cfads / act_ds) if act_ds != 0 else 99

    act_cf_after = act_cfads + act_ds  # ds is negative
    act_net = act_cf_after
    act_distrib = -max(0, act_net * 0.5) if act_dscr > 1.10 else 0
    act_closing = m["cash_bf"] + act_net + act_distrib  # distrib is negative

    # Headroom: (actual - default) / (mgmt - default) * 100
    mgmt_dscr = m["dscr"]
    mgmt_cushion = mgmt_dscr - default_threshold
    act_cushion = act_dscr - default_threshold
    headroom = (act_cushion / mgmt_cushion) * 100 if mgmt_cushion > 0 else 0
    erosion = 100 - headroom

    print(f"P{p} {'H1' if p%2==1 else 'H2'} {2024+(p-1)//2}  {mgmt_dscr:>10.4f} {act_dscr:>10.4f} {headroom:>9.1f}% {erosion:>9.1f}%")

    items = {
        'total_revenue': round(act_rev, 2),
        'total_operating_costs': round(act_opex, 2),
        'ebitda': round(act_ebitda, 2),
        'capital_expenditure': round(m["capex"], 2),
        'tax_paid': round(act_tax, 2),
        'interest_on_cash': round(m["interest_cash"], 2),
        'cfads': round(act_cfads, 2),
        'senior_interest': round(m["si"], 2),
        'senior_principal': round(m["sp"], 2),
        'senior_debt_service': round(act_ds, 2),
        'cf_after_senior_ds': round(act_cf_after, 2),
        'net_cashflow': round(act_net, 2),
        'cash_bf': round(m["cash_bf"], 2),
        'distributions': round(act_distrib, 2),
        'cash_cf': round(act_closing, 2),
        'senior_dscr': round(act_dscr, 4),
    }

    for lk, val in items.items():
        actual_values.append(
            f"({DEAL_ID}, (SELECT id FROM deal_reporting_periods WHERE deal_id={DEAL_ID} AND period_ordinal={p}), "
            f"'{lk}', {val}, {val}, {val}, 'extracted', 'approved')"
        )

sql = """INSERT INTO period_financial_items
(deal_id, reporting_period_id, line_key, reported_value, computed_value, approved_value, value_origin, item_status) VALUES\n"""
sql += ",\n".join(actual_values)
sql += "\nON CONFLICT (deal_id, reporting_period_id, line_key) DO NOTHING;"

run_sql(sql)
print(f"\nInserted {len(actual_values)} actual line items across 4 periods")

# Update covenants with latest DSCR (period 4)
m4 = MGMT[4]
act_rev4 = m4["rev"] * AVAIL[4]
act_ebitda4 = act_rev4 + m4["opex"]
tax_ratio4 = abs(m4["tax"]) / m4["ebitda"]
act_tax4 = -abs(act_ebitda4 * tax_ratio4)
act_cfads4 = act_ebitda4 + m4["capex"] + act_tax4 + m4["interest_cash"]
act_dscr4 = abs(act_cfads4 / m4["ds"])
headroom4 = round(((act_dscr4 - 1.05) / (m4["dscr"] - 1.05)) * 100, 1)

run_sql(f"""
UPDATE covenants SET
  current_value = {round(act_dscr4, 2)},
  management_case_value = {round(m4['dscr'], 2)},
  threshold_default = 1.05,
  headroom_pct = {headroom4},
  status = CASE WHEN {round(act_dscr4, 2)} <= 1.05 THEN 'trigger_event' WHEN {round(act_dscr4, 2)} <= 1.10 THEN 'lock_up' ELSE 'performing' END
WHERE deal_id = {DEAL_ID};
""")

# Update deal metrics and grade
run_sql(f"""
UPDATE deals SET
  metrics = jsonb_set(metrics, '{{seniorDscr}}', '{round(act_dscr4, 4)}'::jsonb),
  grade = '2 - In Line'
WHERE id = {DEAL_ID};
""")

print(f"\nLatest actual DSCR: {act_dscr4:.4f}x | Headroom: {headroom4}%")
