#!/usr/bin/env python3
"""Generate SQL updates for Gatwick segment revenue, annualised FY2019, historical covenants."""
import sys

factor = 12.0 / 9.0  # Annualisation factor for FY2019 9-month stub

revenue_segments = {
    # key           FY19(9m)  FY20    FY21   FY22    FY23    FY24
    "revenue_1":   [405.2,    89.7,   85.6,  405.7,  545.7,  599.4],  # Aeronautical
    "revenue_2":   [159.4,    49.8,   38.6,  158.6,  207.7,  241.3],  # Retail
    "revenue_3":   [70.6,     17.7,   18.0,  101.7,  132.8,  147.8],  # Car parking
    "revenue_4":   [24.5,     30.6,   25.9,  30.8,   31.0,   35.0],   # Property
    "revenue_5":   [27.1,     12.7,   10.5,  41.5,   41.2,   45.5],   # Ops facilities
    "revenue_6":   [32.8,     16.5,   14.1,  38.3,   56.7,   61.3],   # Other
}
for k in revenue_segments:
    revenue_segments[k][0] = round(revenue_segments[k][0] * factor, 1)

total_rev = [round(sum(v[i] for v in revenue_segments.values()), 1) for i in range(6)]

# Annualise FY2019 other lines
costs = [round(-509.2 * factor, 1), -484.0, -393.9, -525.0, -650.4, -716.5]
ebitda = [round(367.9 * factor, 1), -44.0, -26.3, 446.3, 518.8, 571.4]
depr = [round(-134.9 * factor, 1), -180.4, -174.7, -164.2, -154.1, -157.6]
interest = [round(-87.5 * factor, 1), -129.1, -149.8, -171.8, -129.8, -145.4]
capex = [0, 0, 0, 0, -132.0, -145.2]

# Historical covenant ratios from filings
icr = [11.78, 0.00, 0.00, 4.15, 3.48, 3.94]  # 2020/2021 waived
rar = [0.60, None, None, 0.55, 0.45, 0.49]
net_debt_m = [2931.3, 3400.0, 2860.0, 2745.1, 2637.4, 3364.6]

period_ids = [320, 321, 322, 323, 324, 325]
deal_id = 26

out = []
out.append("-- Clear existing revenue/cost/ebitda lines")
out.append("DELETE FROM period_financial_items WHERE deal_id = 26 AND line_key IN ('total_revenue','total_operating_costs','ebitda','depreciation','senior_interest','interest_on_cash','cfads','senior_debt_service','senior_dscr','net_debt_ebitda','revenue_1','revenue_2','revenue_3','revenue_4','revenue_5','revenue_6','sector_kpi_3','sector_kpi_4','sector_kpi_5');")
out.append("")

rows = []
# Segment revenues
for key, vals in revenue_segments.items():
    for i, v in enumerate(vals):
        rows.append(f"({deal_id},{period_ids[i]},'{key}',{round(v*1000000)},{round(v*1000000)},'approved')")

for i, v in enumerate(total_rev):
    rows.append(f"({deal_id},{period_ids[i]},'total_revenue',{round(v*1000000)},{round(v*1000000)},'approved')")
for i, v in enumerate(costs):
    rows.append(f"({deal_id},{period_ids[i]},'total_operating_costs',{round(v*1000000)},{round(v*1000000)},'approved')")
for i, v in enumerate(ebitda):
    rows.append(f"({deal_id},{period_ids[i]},'ebitda',{round(v*1000000)},{round(v*1000000)},'approved')")
for i, v in enumerate(depr):
    rows.append(f"({deal_id},{period_ids[i]},'depreciation',{round(v*1000000)},{round(v*1000000)},'approved')")
for i, v in enumerate(interest):
    rows.append(f"({deal_id},{period_ids[i]},'senior_interest',{round(v*1000000)},{round(v*1000000)},'approved')")

for i in range(6):
    cfads = ebitda[i] + capex[i]
    rows.append(f"({deal_id},{period_ids[i]},'cfads',{round(cfads*1000000)},{round(cfads*1000000)},'approved')")
    ds = abs(interest[i])
    rows.append(f"({deal_id},{period_ids[i]},'senior_debt_service',{round(ds*1000000)},{round(ds*1000000)},'approved')")
    rows.append(f"({deal_id},{period_ids[i]},'senior_dscr',{icr[i]},{icr[i]},'approved')")
    if ebitda[i] > 0:
        lev = round(net_debt_m[i] / ebitda[i], 2)
    else:
        lev = 99.99
    rows.append(f"({deal_id},{period_ids[i]},'net_debt_ebitda',{lev},{lev},'approved')")

margins = [round(ebitda[i]/total_rev[i]*100, 1) if total_rev[i] > 0 else 0 for i in range(6)]
for i, v in enumerate(margins):
    rows.append(f"({deal_id},{period_ids[i]},'sector_kpi_3',{v},{v},'approved')")
for i, v in enumerate(icr):
    if v > 0:
        rows.append(f"({deal_id},{period_ids[i]},'sector_kpi_4',{v},{v},'approved')")
for i, v in enumerate(rar):
    if v is not None:
        rows.append(f"({deal_id},{period_ids[i]},'sector_kpi_5',{v},{v},'approved')")

out.append("INSERT INTO period_financial_items (deal_id, reporting_period_id, line_key, reported_value, approved_value, item_status) VALUES")
out.append(",\n".join(rows) + ";")
out.append("")
out.append("UPDATE deal_reporting_periods SET period_start = '2019-01-01'::date, period_label = 'FY 2019 (annualised)' WHERE id = 320;")
out.append("")
out.append("INSERT INTO deal_line_item_labels (deal_id, line_key, display_label, ordinal) VALUES (26,'revenue_6','Other Revenue',6) ON CONFLICT (deal_id, line_key) DO UPDATE SET display_label = EXCLUDED.display_label, ordinal = EXCLUDED.ordinal;")
out.append("UPDATE deal_line_item_labels SET display_label = 'Property Income' WHERE deal_id = 26 AND line_key = 'revenue_4';")
out.append("UPDATE deal_line_item_labels SET display_label = 'Operational Facilities and Utilities' WHERE deal_id = 26 AND line_key = 'revenue_5';")
out.append("")
out.append("DELETE FROM actual_periods WHERE deal_id = 26;")
out.append("""WITH pivoted AS (
  SELECT drp.id AS rp_id, drp.period_label, drp.period_flag,
    drp.period_start, drp.period_end, drp.period_frequency,
    jsonb_object_agg(
      CASE pfi.line_key
        WHEN 'total_revenue' THEN 'revenue'
        WHEN 'total_operating_costs' THEN 'opex'
        WHEN 'ebitda' THEN 'ebitda'
        WHEN 'cfads' THEN 'cfads'
        WHEN 'capital_expenditure' THEN 'capex'
        WHEN 'senior_debt_service' THEN 'debt_service'
        WHEN 'senior_dscr' THEN 'dscr'
        WHEN 'net_debt_ebitda' THEN 'net_debt_ebitda'
        ELSE pfi.line_key
      END,
      ABS(pfi.approved_value)
    ) AS metrics
  FROM deal_reporting_periods drp
  JOIN period_financial_items pfi ON pfi.reporting_period_id = drp.id
  WHERE drp.deal_id = 26
    AND pfi.line_key IN ('total_revenue','total_operating_costs','ebitda','cfads',
                         'capital_expenditure','senior_debt_service','senior_dscr','net_debt_ebitda')
  GROUP BY drp.id, drp.period_label, drp.period_flag, drp.period_start, drp.period_end, drp.period_frequency
)
INSERT INTO actual_periods (deal_id, period_label, period_flag, period_start, period_end, period_frequency, actual_metrics, received_date, source_hierarchy)
SELECT 26, period_label, period_flag, period_start, period_end, period_frequency, metrics, period_end + INTERVAL '90 days', 'annual_report'
FROM pivoted;""")

print("\n".join(out))
