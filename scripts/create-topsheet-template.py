"""Generate a controlled TopSheet Excel template with validation for client self-population."""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

wb = Workbook()

# Styles
thin = Side(style="thin", color="CCCCCC")
border = Border(top=thin, bottom=thin, left=thin, right=thin)
hdr_fill = PatternFill("solid", fgColor="1F6FA5")
hdr_font = Font(bold=True, size=10, name="Arial", color="FFFFFF")
section_fill = PatternFill("solid", fgColor="D6E4F0")
section_font = Font(bold=True, size=10, name="Arial", color="1F6FA5")
label_font = Font(size=10, name="Arial")
req_font = Font(bold=True, size=10, name="Arial", color="CC0000")
input_fill = PatternFill("solid", fgColor="FFFFCC")
input_font = Font(size=10, color="0000FF", name="Arial")
note_font = Font(italic=True, size=9, color="666666", name="Arial")
computed_fill = PatternFill("solid", fgColor="E8E8E8")
computed_font = Font(italic=True, size=10, color="888888", name="Arial")
version_font = Font(bold=True, size=12, name="Arial", color="1F6FA5")


def make_header(ws, row, cols):
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.border = border
        cell.alignment = Alignment(wrap_text=True, vertical="top")


def make_section(ws, row, cols, text):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=cols)
    cell = ws.cell(row=row, column=1, value=text)
    cell.font = section_font
    cell.fill = section_fill
    cell.border = border
    for c in range(2, cols + 1):
        ws.cell(row=row, column=c).border = border
        ws.cell(row=row, column=c).fill = section_fill
    return row


def add_field(ws, row, label, required=False, guidance="", validation=None, computed=False):
    ws.cell(row=row, column=1, value=label).font = req_font if required else label_font
    ws.cell(row=row, column=1).border = border
    cell_b = ws.cell(row=row, column=2)
    cell_b.border = border
    if computed:
        cell_b.fill = computed_fill
        cell_b.font = computed_font
        cell_b.value = "(computed)"
    else:
        cell_b.fill = input_fill
        cell_b.font = input_font
    ws.cell(row=row, column=3, value=guidance).font = note_font
    ws.cell(row=row, column=3).border = border
    ws.cell(row=row, column=3).alignment = Alignment(wrap_text=True, vertical="top")
    if validation:
        ws.add_data_validation(validation)
        validation.add(cell_b)
    return row


def add_table_headers(ws, row, headers):
    for i, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=i, value=h)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.border = border
        cell.alignment = Alignment(wrap_text=True, vertical="top")


def add_table_rows(ws, start_row, num_rows, num_cols, validations=None):
    for r in range(start_row, start_row + num_rows):
        for c in range(1, num_cols + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = border
            cell.fill = input_fill
            cell.font = input_font
    if validations:
        for col, dv in validations.items():
            ws.add_data_validation(dv)
            for r in range(start_row, start_row + num_rows):
                dv.add(ws.cell(row=r, column=col))


# ═══════════════════════════════════════════════════════════════════
# TAB 1: Deal Identity
# ═══════════════════════════════════════════════════════════════════
ws = wb.active
ws.title = "1. Deal Identity"
ws.column_dimensions["A"].width = 32
ws.column_dimensions["B"].width = 40
ws.column_dimensions["C"].width = 50

# Version header
ws.merge_cells("A1:C1")
ws["A1"] = "TOPSHEET DATA TEMPLATE v1.0"
ws["A1"].font = version_font
ws.merge_cells("A2:C2")
ws["A2"] = "Fill in yellow cells. Required fields marked with *. Grey cells are computed by the system."
ws["A2"].font = note_font
ws.row_dimensions[2].height = 25

r = 3
make_header(ws, r, 3)
ws.cell(row=r, column=1, value="Field")
ws.cell(row=r, column=2, value="Value")
ws.cell(row=r, column=3, value="Guidance")

# Validation lists
dv_sector = DataValidation(type="list", formula1='"Wind Farm,Data Center,Port,Airport,Toll Road,Social Infrastructure,Real Estate,Clean Tech Hub,Solar"')
dv_phase = DataValidation(type="list", formula1='"construction,ramp_up,operational,refinancing"')
dv_region = DataValidation(type="list", formula1='"EMEA,North America,APAC,LATAM,Middle East Africa"')
dv_yesno = DataValidation(type="list", formula1='"Yes,No"')
dv_ranking = DataValidation(type="list", formula1='"Senior Secured,Senior Unsecured,Second Lien,Mezzanine,Subordinated,Holdco,Majority Holdco,Minority Holdco"')
dv_risk_level = DataValidation(type="list", formula1='"very_low,low,moderate,high,very_high"')

r = 4
make_section(ws, r, 3, "BORROWER & DEAL IDENTIFICATION"); r += 1
add_field(ws, r, "Investment Name *", True, "Full deal name"); r += 1
add_field(ws, r, "Borrower Legal Name *", True, "Registered company name"); r += 1
add_field(ws, r, "Borrower Trading Name", guidance="If different from legal name"); r += 1
add_field(ws, r, "Borrower LEI", guidance="20-character Legal Entity Identifier"); r += 1
add_field(ws, r, "Borrower Jurisdiction *", True, "ISO 2-letter (GB, US, NL)"); r += 1
add_field(ws, r, "Borrower Registered Address", guidance="Full address"); r += 1
add_field(ws, r, "Borrower Registered Number", guidance="Companies House or equivalent"); r += 1

r += 1; make_section(ws, r, 3, "SECTOR & CLASSIFICATION"); r += 1
add_field(ws, r, "Sector *", True, "Select from dropdown", dv_sector); r += 1
add_field(ws, r, "Sub-Sector", guidance="e.g. Offshore Wind, Hyperscale Colocation"); r += 1
add_field(ws, r, "Deal Type *", True, "Project Finance, Acquisition Finance, Development Finance"); r += 1
add_field(ws, r, "Phase *", True, "Select from dropdown", dv_phase); r += 1
add_field(ws, r, "SIC Code", guidance="UK SIC 2007 (5 digits)"); r += 1
add_field(ws, r, "TICCS Classification", guidance="Infrastructure classification"); r += 1

r += 1; make_section(ws, r, 3, "OWNERSHIP & PARTIES"); r += 1
add_field(ws, r, "Sponsor Name", guidance="Lead sponsor / equity investor"); r += 1
add_field(ws, r, "Sponsor Fund", guidance="Fund vehicle name"); r += 1
add_field(ws, r, "Parent Group", guidance="Ultimate parent"); r += 1
add_field(ws, r, "Ownership Structure", guidance="Narrative description"); r += 1

r += 1; make_section(ws, r, 3, "GEOGRAPHY & CURRENCY"); r += 1
add_field(ws, r, "Region *", True, "Select from dropdown", dv_region); r += 1
add_field(ws, r, "Country *", True, "ISO 2-letter (GB, US, DE)"); r += 1
add_field(ws, r, "Currency *", True, "ISO 3-letter (GBP, USD, EUR)"); r += 1
add_field(ws, r, "Reporting Currency", guidance="If different from deal currency"); r += 1

r += 1; make_section(ws, r, 3, "KEY DATES"); r += 1
add_field(ws, r, "Origination Date *", True, "YYYY-MM-DD"); r += 1
add_field(ws, r, "Commitment Date", guidance="YYYY-MM-DD"); r += 1
add_field(ws, r, "First Drawdown Date", guidance="YYYY-MM-DD"); r += 1
add_field(ws, r, "COD Date", guidance="Commercial Operations Date"); r += 1
add_field(ws, r, "Maturity Date *", True, "Final debt maturity"); r += 1
add_field(ws, r, "Weighted Average Life", guidance="Years (e.g. 7.5)"); r += 1
add_field(ws, r, "Concession Expiry Date", guidance="For concession-based deals"); r += 1
add_field(ws, r, "Fiscal Year End Month *", True, "1-12"); r += 1
add_field(ws, r, "Reporting Periodicity", guidance="semi_annual, quarterly, annual"); r += 1
add_field(ws, r, "Governing Law", guidance="English, New York, etc."); r += 1

r += 1; make_section(ws, r, 3, "SECURITY & RANKING"); r += 1
add_field(ws, r, "Security Ranking *", True, "Select from dropdown", dv_ranking); r += 1
add_field(ws, r, "Security Type", guidance="Description of security package"); r += 1
add_field(ws, r, "Security Summary", guidance="Narrative"); r += 1

r += 1; make_section(ws, r, 3, "REVENUE RISK CLASSIFICATION"); r += 1
add_field(ws, r, "Revenue Risk Code", guidance="e.g. P2-V4-D2"); r += 1
add_field(ws, r, "Pricing Mechanism", guidance="P1 (fixed) to P6 (hybrid)"); r += 1
add_field(ws, r, "Volume Mechanism", guidance="V1 (guaranteed) to V6 (speculative)"); r += 1
add_field(ws, r, "Duration Category", guidance="D1 (matched) to D5 (merchant)"); r += 1
add_field(ws, r, "Revenue Risk Level", guidance="Select from dropdown", validation=dv_risk_level); r += 1
add_field(ws, r, "Contracted Revenue %", guidance="0-100"); r += 1
add_field(ws, r, "Merchant Revenue %", guidance="0-100 (should sum to 100 with contracted)"); r += 1
add_field(ws, r, "Primary Contract Expiry", guidance="YYYY-MM-DD"); r += 1
add_field(ws, r, "Duration Coverage %", guidance="Contract life / debt term x 100"); r += 1

r += 1; make_section(ws, r, 3, "RATINGS"); r += 1
add_field(ws, r, "Moody's Rating", guidance="e.g. Baa2, Ba1, or n/a"); r += 1
add_field(ws, r, "Moody's Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "S&P Rating", guidance="e.g. BBB, BB+, or n/a"); r += 1
add_field(ws, r, "S&P Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "Fitch Rating", guidance="e.g. BBB, or n/a"); r += 1
add_field(ws, r, "Fitch Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "Internal Credit Score *", True, "Required if no external rating"); r += 1

r += 1; make_section(ws, r, 3, "FACILITY ECONOMICS"); r += 1
add_field(ws, r, "Total Facility Size *", True, "Total committed across all tranches"); r += 1
add_field(ws, r, "Our Exposure *", True, "Our current holding amount"); r += 1
add_field(ws, r, "Our Holding %", guidance="Percentage"); r += 1
add_field(ws, r, "Pricing Type", guidance="fixed, floating, index_linked"); r += 1
add_field(ws, r, "Pricing Margin (bps)", guidance="Spread over reference rate"); r += 1
add_field(ws, r, "Reference Rate", guidance="SONIA, SOFR, Euribor, GILT"); r += 1
add_field(ws, r, "Facility Agent", guidance=""); r += 1
add_field(ws, r, "Security Trustee", guidance=""); r += 1

r += 1; make_section(ws, r, 3, "MONITORING"); r += 1
add_field(ws, r, "Assigned HAM", guidance="Human Asset Manager"); r += 1
add_field(ws, r, "Assigned PM", guidance="Portfolio Manager"); r += 1
add_field(ws, r, "Performance Grade", computed=True, guidance="Computed by grade engine (1-4)"); r += 1
add_field(ws, r, "Watchlist", computed=True, guidance="Computed by grade engine"); r += 1
add_field(ws, r, "Trend", computed=True, guidance="Computed from 3-period erosion"); r += 1
add_field(ws, r, "Headroom %", computed=True, guidance="Computed: (actual-default)/(mgmt-default) x 100"); r += 1


# ═══════════════════════════════════════════════════════════════════
# TAB 2: Capital Structure
# ═══════════════════════════════════════════════════════════════════
ws2 = wb.create_sheet("2. Capital Structure")
ws2.merge_cells("A1:Q1")
ws2["A1"] = "CAPITAL STRUCTURE INSTRUMENTS — One row per debt instrument"
ws2["A1"].font = version_font

headers_cs = ["Instrument Name", "Type", "Format", "Security Ranking", "Pari-Passu Group",
              "Committed Amount", "Drawn Amount", "Currency", "Margin (bps)", "Base Rate",
              "Interest Type", "Maturity Date", "Repayment Type", "Our Holding Amount",
              "Our Holding %", "DSRA Months", "Status"]
add_table_headers(ws2, 2, headers_cs)

dv_inst_type = DataValidation(type="list", formula1='"senior_term,senior_rcf,capex_facility,mezzanine,shl,bond,note,frn,private_placement"')
dv_format = DataValidation(type="list", formula1='"loan,bond,note,frn,il_bond,private_placement,convertible"')
dv_int_type = DataValidation(type="list", formula1='"fixed,floating,index_linked,hybrid"')
dv_repay = DataValidation(type="list", formula1='"bullet,amortising,sculpted,cash_sweep"')
dv_status = DataValidation(type="list", formula1='"active,repaid,cancelled,restructured"')

add_table_rows(ws2, 3, 8, len(headers_cs), {2: dv_inst_type, 3: dv_format, 11: dv_int_type, 13: dv_repay, 17: dv_status})
for c in range(1, len(headers_cs) + 1):
    ws2.column_dimensions[get_column_letter(c)].width = max(14, len(headers_cs[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 3: Reserve Accounts
# ═══════════════════════════════════════════════════════════════════
ws3 = wb.create_sheet("3. Reserve Accounts")
ws3.merge_cells("A1:L1")
ws3["A1"] = "RESERVE ACCOUNTS & LIQUIDITY FACILITIES"
ws3["A1"].font = version_font

headers_ra = ["Account Name", "Type", "Sizing Basis", "Required Balance", "Current Balance",
              "Cash Amount", "LC Amount", "LC Provider", "PCG Amount", "PCG Provider",
              "Funded Status", "Currency"]
add_table_headers(ws3, 2, headers_ra)

dv_ra_type = DataValidation(type="list", formula1='"dsra,mra,capex_reserve,o_and_m_reserve,distribution_reserve,lifecycle_reserve,escrow,lockup,liquidity_facility,rcf,letter_of_credit,pcg"')
dv_funded = DataValidation(type="list", formula1='"fully_funded,partially_funded,unfunded,surplus"')

add_table_rows(ws3, 3, 6, len(headers_ra), {2: dv_ra_type, 11: dv_funded})
for c in range(1, len(headers_ra) + 1):
    ws3.column_dimensions[get_column_letter(c)].width = max(14, len(headers_ra[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 4: Counterparties
# ═══════════════════════════════════════════════════════════════════
ws4 = wb.create_sheet("4. Counterparties")
ws4.merge_cells("A1:G1")
ws4["A1"] = "KEY COUNTERPARTIES & DEPENDENCIES"
ws4["A1"].font = version_font

headers_cp = ["Name", "Type", "Credit Rating", "Contract Value", "Contract Expiry", "Replacement Risk", "Dependency Narrative"]
add_table_headers(ws4, 2, headers_cp)

dv_cp_type = DataValidation(type="list", formula1='"offtaker,contractor,operator,guarantor,insurer,auditor,facility_agent,security_trustee,servicer"')
dv_repl = DataValidation(type="list", formula1='"low,medium,high,critical"')

add_table_rows(ws4, 3, 8, len(headers_cp), {2: dv_cp_type, 6: dv_repl})
ws4.column_dimensions["A"].width = 30
ws4.column_dimensions["B"].width = 20
ws4.column_dimensions["G"].width = 40


# ═══════════════════════════════════════════════════════════════════
# TAB 5: Hedging
# ═══════════════════════════════════════════════════════════════════
ws5 = wb.create_sheet("5. Hedging")
ws5.merge_cells("A1:I1")
ws5["A1"] = "HEDGE PORTFOLIO"
ws5["A1"].font = version_font

headers_hg = ["Hedge Type", "Notional", "% of Debt", "Fixed Rate", "Strike", "Counterparty", "Counterparty Rating", "Mark to Market", "Maturity Date"]
add_table_headers(ws5, 2, headers_hg)

dv_hedge = DataValidation(type="list", formula1='"interest_rate_swap,cap,floor,fx_forward,fx_option,inflation_swap,commodity_swap"')
add_table_rows(ws5, 3, 5, len(headers_hg), {1: dv_hedge})
for c in range(1, len(headers_hg) + 1):
    ws5.column_dimensions[get_column_letter(c)].width = max(14, len(headers_hg[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 6: Jurisdiction Splits
# ═══════════════════════════════════════════════════════════════════
ws6 = wb.create_sheet("6. Jurisdictions")
ws6.merge_cells("A1:E1")
ws6["A1"] = "JURISDICTION SPLITS — Must sum to 100% per activity type"
ws6["A1"].font = version_font

headers_js = ["Country Code (ISO)", "Country Name", "Activity %", "Activity Type", "Is Primary"]
add_table_headers(ws6, 2, headers_js)

dv_activity = DataValidation(type="list", formula1='"revenue,operations,assets,headcount"')
dv_primary = DataValidation(type="list", formula1='"TRUE,FALSE"')
add_table_rows(ws6, 3, 6, len(headers_js), {4: dv_activity, 5: dv_primary})
for c in range(1, len(headers_js) + 1):
    ws6.column_dimensions[get_column_letter(c)].width = 18


# ═══════════════════════════════════════════════════════════════════
# TAB 7: Corporate Entities
# ═══════════════════════════════════════════════════════════════════
ws7 = wb.create_sheet("7. Corporate Entities")
ws7.merge_cells("A1:F1")
ws7["A1"] = "CORPORATE ENTITY STRUCTURE"
ws7["A1"].font = version_font

headers_ce = ["Entity Name", "Type", "Parent Entity", "Jurisdiction", "Ring-Fenced", "Securitisation Boundary"]
add_table_headers(ws7, 2, headers_ce)

dv_ent_type = DataValidation(type="list", formula1='"opco,bidco,holdco,topco,spv,issuer,guarantor,servicer"')
add_table_rows(ws7, 3, 6, len(headers_ce), {2: dv_ent_type, 5: dv_yesno, 6: dv_yesno})
for c in range(1, len(headers_ce) + 1):
    ws7.column_dimensions[get_column_letter(c)].width = 22


# ═══════════════════════════════════════════════════════════════════
# TAB 8: Covenant Thresholds
# ═══════════════════════════════════════════════════════════════════
ws8 = wb.create_sheet("8. Covenant Thresholds")
ws8.merge_cells("A1:K1")
ws8["A1"] = "COVENANT THRESHOLD CONFIGURATION — Three-tier framework per ratio"
ws8["A1"].font = version_font

headers_ct = ["Covenant Name", "Ratio Name", "Category", "Test Type", "Direction",
              "Test Frequency", "Enforcement Class", "Lockup Level", "Trigger Level",
              "Default Level", "Equity Cure Available"]
add_table_headers(ws8, 2, headers_ct)

dv_cov_cat = DataValidation(type="list", formula1='"cash_flow_cover,collateral_value,incurrence,distribution,financial_maintenance"')
dv_test_type = DataValidation(type="list", formula1='"hard_covenant,distribution_condition,trigger,default"')
dv_direction = DataValidation(type="list", formula1='"min,max"')
dv_freq = DataValidation(type="list", formula1='"quarterly,semi_annual,annual"')

add_table_rows(ws8, 3, 6, len(headers_ct), {3: dv_cov_cat, 4: dv_test_type, 5: dv_direction, 6: dv_freq, 11: dv_yesno})
for c in range(1, len(headers_ct) + 1):
    ws8.column_dimensions[get_column_letter(c)].width = max(14, len(headers_ct[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 9: KPI Targets
# ═══════════════════════════════════════════════════════════════════
ws9 = wb.create_sheet("9. KPI Targets")
ws9.merge_cells("A1:H1")
ws9["A1"] = "IC MEMO KPI TARGETS — Frozen at ingestion. Base case and stress case."
ws9["A1"].font = version_font

headers_kpi = ["KPI Name", "Base Case Value", "Stress Case Value", "Target Floor",
               "Target Ceiling", "Direction", "Unit", "Source"]
add_table_headers(ws9, 2, headers_kpi)

dv_dir = DataValidation(type="list", formula1='"higher_is_better,lower_is_better,range"')
dv_unit = DataValidation(type="list", formula1='"percentage,currency,count,ratio,years,bps"')
dv_source = DataValidation(type="list", formula1='"ic_memo,business_plan,management_presentation,lender_model"')

add_table_rows(ws9, 3, 12, len(headers_kpi), {6: dv_dir, 7: dv_unit, 8: dv_source})
for c in range(1, len(headers_kpi) + 1):
    ws9.column_dimensions[get_column_letter(c)].width = max(16, len(headers_kpi[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 10: Financial Template
# ═══════════════════════════════════════════════════════════════════
ws10 = wb.create_sheet("10. Financial Template")
ws10.merge_cells("A1:B1")
ws10["A1"] = "SECTOR TEMPLATE CONFIGURATION — Line item labels for this deal"
ws10["A1"].font = version_font

dv_template = DataValidation(type="list", formula1='"data_centre,wind_farm,port,airport,toll_road,social_infrastructure,real_estate,clean_tech_hub,solar"')

r = 2
make_header(ws10, r, 3)
ws10.cell(row=r, column=1, value="Field")
ws10.cell(row=r, column=2, value="Value")
ws10.cell(row=r, column=3, value="Guidance")
ws10.column_dimensions["A"].width = 25
ws10.column_dimensions["B"].width = 60
ws10.column_dimensions["C"].width = 40

r = 3
add_field(ws10, r, "Sector Template *", True, "Select from dropdown", dv_template); r += 1

r += 1; make_section(ws10, r, 3, "REVENUE LINES (up to 8, comma-separated)"); r += 1
add_field(ws10, r, "Revenue Line 1", guidance="e.g. PPA Revenue (Contracted)"); r += 1
add_field(ws10, r, "Revenue Line 2", guidance="e.g. Merchant Revenue"); r += 1
add_field(ws10, r, "Revenue Line 3"); r += 1
add_field(ws10, r, "Revenue Line 4"); r += 1
add_field(ws10, r, "Revenue Line 5"); r += 1
add_field(ws10, r, "Revenue Line 6"); r += 1
add_field(ws10, r, "Revenue Line 7"); r += 1
add_field(ws10, r, "Revenue Line 8 (Other Revenue)"); r += 1

r += 1; make_section(ws10, r, 3, "COST LINES (up to 12)"); r += 1
for i in range(1, 13):
    label = f"Cost Line {i}"
    if i == 1: label += " (e.g. Power Cost)"
    if i == 12: label += " (Other Opex)"
    add_field(ws10, r, label); r += 1

r += 1; make_section(ws10, r, 3, "CAPEX LINES (up to 5)"); r += 1
for i in range(1, 6):
    add_field(ws10, r, f"Capex Line {i}"); r += 1

r += 1; make_section(ws10, r, 3, "SECTOR KPI LABELS (up to 10)"); r += 1
for i in range(1, 11):
    add_field(ws10, r, f"Sector KPI {i}"); r += 1


# ═══════════════════════════════════════════════════════════════════
# TAB 11: Development Phases
# ═══════════════════════════════════════════════════════════════════
ws11 = wb.create_sheet("11. Development Phases")
ws11.merge_cells("A1:I1")
ws11["A1"] = "DEVELOPMENT & CONSTRUCTION PHASES"
ws11["A1"].font = version_font

headers_dev = ["Phase #", "Phase Name", "Capex Budget", "Actual Spend", "Variance",
               "Start Date", "Target End", "Actual End", "Status"]
add_table_headers(ws11, 2, headers_dev)

dv_dev_status = DataValidation(type="list", formula1='"planned,active,complete,delayed,not_started"')
add_table_rows(ws11, 3, 6, len(headers_dev), {9: dv_dev_status})
for c in range(1, len(headers_dev) + 1):
    ws11.column_dimensions[get_column_letter(c)].width = max(14, len(headers_dev[c-1]) + 2)


# ═══════════════════════════════════════════════════════════════════
# TAB 12: Consent Mechanics
# ═══════════════════════════════════════════════════════════════════
ws12 = wb.create_sheet("12. Consent Mechanics")
ws12.column_dimensions["A"].width = 35
ws12.column_dimensions["B"].width = 40
ws12.column_dimensions["C"].width = 45

ws12.merge_cells("A1:C1")
ws12["A1"] = "CONSENT & VOTING MECHANICS (from finance documentation)"
ws12["A1"].font = version_font

r = 2
make_header(ws12, r, 3)
ws12.cell(row=r, column=1, value="Provision")
ws12.cell(row=r, column=2, value="Value")
ws12.cell(row=r, column=3, value="Guidance")

r = 3
add_field(ws12, r, "Majority Threshold %", guidance="e.g. 66.67"); r += 1
add_field(ws12, r, "Supermajority Threshold %", guidance="e.g. 75 or 90"); r += 1
dv_voting = DataValidation(type="list", formula1='"by_commitment,by_lender,by_block"')
add_field(ws12, r, "Voting Basis", guidance="Select from dropdown", validation=dv_voting); r += 1
add_field(ws12, r, "All-Lender Consent Matters", guidance="List matters requiring unanimous consent"); r += 1
add_field(ws12, r, "Snooze-You-Lose", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws12, r, "Deemed Consent on Silence", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws12, r, "Yank Clause", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws12, r, "Non-Consenting Replacement Basis", guidance="par, make_whole, market_value"); r += 1
add_field(ws12, r, "Standard Consent Period (days)", guidance="e.g. 15, 20, 30"); r += 1
add_field(ws12, r, "Disenfranchisement Triggers", guidance="Conditions where lender loses voting rights"); r += 1


# ═══════════════════════════════════════════════════════════════════
# TAB 13: Validation Summary
# ═══════════════════════════════════════════════════════════════════
ws13 = wb.create_sheet("Validation")
ws13.merge_cells("A1:C1")
ws13["A1"] = "COMPLETENESS CHECK — Review before submission"
ws13["A1"].font = version_font

ws13.column_dimensions["A"].width = 30
ws13.column_dimensions["B"].width = 15
ws13.column_dimensions["C"].width = 40

make_header(ws13, 2, 3)
ws13.cell(row=2, column=1, value="Section")
ws13.cell(row=2, column=2, value="Status")
ws13.cell(row=2, column=3, value="Notes")

sections = [
    ("1. Deal Identity", "Check all * fields are filled"),
    ("2. Capital Structure", "At least 1 instrument required"),
    ("3. Reserve Accounts", "DSRA required for most deals"),
    ("4. Counterparties", "Key offtaker/contractor required"),
    ("5. Hedging", "If floating rate debt, hedging expected"),
    ("6. Jurisdictions", "Must sum to 100% per activity type"),
    ("7. Corporate Entities", "At least borrower SPV"),
    ("8. Covenant Thresholds", "DSCR covenant required"),
    ("9. KPI Targets", "3-5 sector KPIs recommended"),
    ("10. Financial Template", "Sector template selection required"),
    ("11. Development Phases", "If construction phase"),
    ("12. Consent Mechanics", "Majority threshold required"),
]
for i, (section, note) in enumerate(sections, 3):
    ws13.cell(row=i, column=1, value=section).font = label_font
    ws13.cell(row=i, column=1).border = border
    cell = ws13.cell(row=i, column=2)
    cell.border = border
    cell.fill = input_fill
    ws13.cell(row=i, column=3, value=note).font = note_font
    ws13.cell(row=i, column=3).border = border


# Save
import os
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "topsheet-data-template.xlsx")
wb.save(out)
print(f"Saved to {out}")
