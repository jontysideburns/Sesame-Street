"""Populate the Wind Farm deal template with realistic illustrative data."""
import openpyxl
from openpyxl.styles import Font
from datetime import datetime

src = "C:/Users/jpste/OneDrive/Documents/TAMC/Illustrative templates/Template Wind 1.xlsx"
out = "C:/Users/jpste/OneDrive/Documents/TAMC/Illustrative templates/Template Wind 1 - Populated.xlsx"

wb = openpyxl.load_workbook(src)
blue = Font(size=10, color="0000FF", name="Arial")

# ── Deal Identity ──
ws = wb["Deal Identity"]
fills = {
    5: "North Sea OWF Ltd",  # trading name = same
    6: "213800ABCDEF12345678",  # LEI
    8: "1 Wind Street, Aberdeen, AB10 1AA, United Kingdom",
    28: "P1-V1-D2",  # Revenue risk: contracted pricing, guaranteed volume (CfD), substantially matched duration
    29: 100,  # Contracted 100% (CfD)
    30: 0,
    31: 105,  # Duration coverage 105% (concession > debt)
}
for row, val in fills.items():
    ws.cell(row=row, column=2, value=val).font = blue

# Fix Phase to match our enum
ws.cell(row=12, column=2, value="operational").font = blue
# Fix Sector to match our template
ws.cell(row=9, column=2, value="Wind Farm").font = blue
# Fix Region
ws.cell(row=15, column=2, value="EMEA").font = blue

# ── Capital Structure ──
ws2 = wb["Capital Structure"]
# Row 2 already has the senior note, add DSRA LC facility and shareholder loan
# Fix existing row types
ws2.cell(row=2, column=2, value="senior_term").font = blue
ws2.cell(row=2, column=3, value="note").font = blue
ws2.cell(row=2, column=6, value=100000000).font = blue  # 100M committed
ws2.cell(row=2, column=7, value=100000000).font = blue  # 100M drawn
ws2.cell(row=2, column=13, value="sculpted").font = blue
ws2.cell(row=2, column=14, value=100000000).font = blue  # Our holding = 100M (100%)
ws2.cell(row=2, column=15, value=100).font = blue
ws2.cell(row=2, column=16, value=6).font = blue  # DSRA months
ws2.cell(row=2, column=17, value="active").font = blue

# Add capex reserve facility
row3_data = ["Capex Reserve Facility", "capex_facility", "loan", "Senior", "A",
             15000000, 8000000, "GBP", 250, "SONIA", "floating",
             datetime(2040, 12, 31), "amortising", 15000000, 100, None, "active"]
for i, v in enumerate(row3_data, 1):
    if v is not None:
        ws2.cell(row=3, column=i, value=v).font = blue

# Add shareholder loan
row4_data = ["Shareholder Loan", "shl", "loan", "Subordinated", "B",
             30000000, 30000000, "GBP", 800, None, "fixed",
             datetime(2045, 12, 31), "bullet", 0, 0, None, "active"]
for i, v in enumerate(row4_data, 1):
    if v is not None:
        ws2.cell(row=4, column=i, value=v).font = blue

# ── Reserve Accounts ──
ws3 = wb["Reserve Accounts"]
# Fix row 2 (DSRA)
ws3.cell(row=2, column=2, value="dsra").font = blue
ws3.cell(row=2, column=4, value=6500000).font = blue  # 6.5M required (6mo DS)
ws3.cell(row=2, column=5, value=6500000).font = blue
ws3.cell(row=2, column=6, value=0).font = blue
ws3.cell(row=2, column=7, value=6500000).font = blue  # LC funded
ws3.cell(row=2, column=8, value="HSBC").font = blue
ws3.cell(row=2, column=9, value=0).font = blue
ws3.cell(row=2, column=10, value="").font = blue
ws3.cell(row=2, column=11, value="fully_funded").font = blue

# Add MRA
mra = ["Maintenance Reserve Account", "mra", "Independent engineer lifecycle model",
       3500000, 3200000, 3200000, 0, "", 0, "", "partially_funded", "GBP"]
for i, v in enumerate(mra, 1):
    ws3.cell(row=3, column=i, value=v).font = blue

# Add O&M reserve
omr = ["O&M Reserve", "o_and_m_reserve", "3 months opex",
       750000, 750000, 750000, 0, "", 0, "", "fully_funded", "GBP"]
for i, v in enumerate(omr, 1):
    ws3.cell(row=4, column=i, value=v).font = blue

# ── Counterparties ──
ws4 = wb["Counterparties"]
# Row 2 already has LCCC, fix contract value
ws4.cell(row=2, column=4, value=400000000).font = blue  # CfD total nominal
ws4.cell(row=2, column=5, value=datetime(2044, 12, 31)).font = blue

# Add more counterparties
cps = [
    ["Siemens Gamesa", "contractor", "BBB+", 25000000, datetime(2029, 12, 31), "medium", "O&M contract for turbine maintenance"],
    ["National Grid ESO", "offtaker", "AA-", None, datetime(2045, 12, 31), "low", "Grid connection agreement"],
    ["Marsh Insurance", "insurer", "A+", 5000000, datetime(2026, 6, 30), "low", "All-risks, BI, and third-party liability"],
    ["PwC LLP", "auditor", None, None, None, "low", "Annual audit engagement"],
    ["BNP Paribas", "facility_agent", "A+", None, None, "low", "Facility agent and security trustee"],
]
for ri, cp in enumerate(cps, 3):
    for ci, v in enumerate(cp, 1):
        if v is not None:
            ws4.cell(row=ri, column=ci, value=v).font = blue

# ── Hedging ──
ws5 = wb["Hedging"]
# Fixed-rate note so no interest rate hedging needed, but add inflation swap for CfD indexation
ws5.cell(row=2, column=1, value="N/A - Fixed rate senior note").font = blue

hedges = [
    ["inflation_swap", 80000000, 80, None, None, "BNP Paribas", "A+", -2500000, datetime(2039, 12, 31)],
]
for ri, h in enumerate(hedges, 3):
    for ci, v in enumerate(h, 1):
        if v is not None:
            ws5.cell(row=ri, column=ci, value=v).font = blue

# ── Jurisdiction Splits ──
ws6 = wb["Jurisdiction Splits"]
ws6.cell(row=2, column=2, value="United Kingdom").font = blue
ws6.cell(row=2, column=3, value=100).font = blue
ws6.cell(row=2, column=5, value="TRUE").font = blue

# ── Key Metrics ──
ws7 = wb["Key Metrics"]
# Scale to realistic GBP values for a mid-size offshore wind farm
metrics = {
    3: 20000000,    # Revenue 20M
    4: 17000000,    # EBITDA 17M
    5: 16000000,    # CFADS 16M
    6: 13000000,    # Debt Service 13M
    7: 92000000,    # Net Debt 92M (after amortisation)
    8: 4500000,     # Cash 4.5M
    9: 1.23,        # Senior DSCR
    10: 5.4,        # Net Debt / EBITDA
    11: "H2 2025",  # Latest period
    12: datetime(2025, 12, 31),
}
for row, val in metrics.items():
    ws7.cell(row=row, column=2, value=val).font = blue

# ── KPI Targets ──
ws8 = wb["KPI Targets"]
kpis = [
    ["Performance Factor (%)", 95, 85, "higher_is_better", "percentage", "ic_memo"],
    ["Technical Availability (%)", 97, 92, "higher_is_better", "percentage", "ic_memo"],
    ["Wind Resource (P50 capacity factor %)", 42, 36, "higher_is_better", "percentage", "ic_memo"],
    ["Net Generation (GWh)", 900, 750, "higher_is_better", "count", "ic_memo"],
    ["CfD Strike Price (GBP/MWh)", 155, 155, "higher_is_better", "currency", "ic_memo"],
    ["Grid Curtailment (%)", 3, 8, "lower_is_better", "percentage", "ic_memo"],
    ["O&M Cost per MWh (GBP)", 18, 25, "lower_is_better", "currency", "ic_memo"],
    ["Major Component Failures (count)", 0, 2, "lower_is_better", "count", "ic_memo"],
    ["Availability (% uptime)", 95, 88, "higher_is_better", "percentage", "ic_memo"],
    ["Cable Fault Events (count)", 0, 1, "lower_is_better", "count", "ic_memo"],
]
for ri, kpi in enumerate(kpis, 3):
    for ci, v in enumerate(kpi, 1):
        ws8.cell(row=ri, column=ci, value=v).font = blue

wb.save(out)
print(f"Saved populated template to: {out}")
