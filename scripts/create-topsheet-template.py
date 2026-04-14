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
ws["A1"] = "TOPSHEET DATA TEMPLATE v9.0"
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
dv_ranking = DataValidation(type="list", formula1='"Senior Secured,Senior Secured HoldCo,Senior Secured MajorityHoldCo,Senior Secured MinorityHoldCo,Senior Unsecured,Second Lien,Mezzanine,Subordinated,Subordinated HoldCo,Holdco,Majority Holdco,Minority Holdco,Shareholder Loan"')
dv_dist_freq = DataValidation(type="list", formula1='"semi_annual,quarterly,annual"')
dv_trapped_cash = DataValidation(type="list", formula1='"retained_in_proceeds_account,held_in_lockup_account,swept_to_debt,released_after_cure,swept_then_released"')
dv_val_method = DataValidation(type="list", formula1='"transaction,dcf,multiples,appraisal,mark_to_model,book"')
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
add_field(ws, r, "Source Magnitude *", True, "singles, thousands, or millions — what units are the financial values in Tabs 15-18 entered in? The system stores everything in singles internally."); r += 1

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
add_field(ws, r, "Security Ranking *", True,
          "Senior Secured | Senior Secured HoldCo | Senior Secured MajorityHoldCo | Senior Secured MinorityHoldCo | Senior Unsecured | Second Lien | Mezzanine | Subordinated | Subordinated HoldCo | Holdco | Shareholder Loan",
          dv_ranking); r += 1
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

r += 1; make_section(ws, r, 3, "TAIL CONSTRUCT (gap between anchor and debt maturity)"); r += 1
add_field(ws, r, "Tail Anchor Type *", True, "concession | primary_contract | asset_life"); r += 1
add_field(ws, r, "Tail Anchor Date", guidance="End of concession OR end of primary revenue contract (YYYY-MM-DD)"); r += 1
add_field(ws, r, "Tail Anchor Label", guidance="e.g. M6 Toll Concession expiry; Wigmore Solar PPA end"); r += 1
add_field(ws, r, "Residual Value Treatment *", True, "zero_residual | nominal_residual | retained_asset"); r += 1
add_field(ws, r, "Tail Notes", guidance="Narrative describing the tail position and any mitigants"); r += 1

r += 1; make_section(ws, r, 3, "CONTRACT & CONCESSION RENEWAL"); r += 1
add_field(ws, r, "Renewal Profile *", True, "deep_market_repricing | bilateral_negotiation | competitive_tender_asset_retained | competitive_tender_clean_sheet | hand_back_zero_value | no_anchor_contract"); r += 1
add_field(ws, r, "Debt Repayment From Renewal %", guidance="% of debt principal scheduled to be repaid from post-renewal cashflows. Should be 0 for hand_back_zero_value and competitive_tender_clean_sheet."); r += 1
add_field(ws, r, "Renewal Notes", guidance="Narrative explaining the renewal assumptions and any mitigants"); r += 1

r += 1; make_section(ws, r, 3, "RATINGS"); r += 1
add_field(ws, r, "Moody's Rating", guidance="e.g. Baa2, Ba1, or n/a"); r += 1
add_field(ws, r, "Moody's Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "S&P Rating", guidance="e.g. BBB, BB+, or n/a"); r += 1
add_field(ws, r, "S&P Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "Fitch Rating", guidance="e.g. BBB, or n/a"); r += 1
add_field(ws, r, "Fitch Outlook", guidance="stable, positive, negative"); r += 1
add_field(ws, r, "Internal Credit Score *", True, "Required if no external rating"); r += 1

r += 1; make_section(ws, r, 3, "VALUATION & EQUITY"); r += 1
add_field(ws, r, "Enterprise Value *", True, "Anchor for the capital stack. Single most important field \u2014 every LTV and equity cushion is derived from this."); r += 1
add_field(ws, r, "Valuation Date *", True, "When the EV was struck (YYYY-MM-DD). Stale dates (>12 months) will be flagged in the stack validation."); r += 1
add_field(ws, r, "Valuation Method *", True, "transaction | dcf | multiples | appraisal | mark_to_model | book", validation=dv_val_method); r += 1
add_field(ws, r, "Valuation Entity", guidance="Entity in Tab 7 the EV is measured at (usually OpCo). Drives which entity the stack is anchored to."); r += 1
add_field(ws, r, "Equity Invested at Origination", guidance="Initial sponsor equity cheque. Optional but recommended \u2014 used for IRR/MOIC tracking and performance attribution."); r += 1

r += 1; make_section(ws, r, 3, "FACILITY ECONOMICS"); r += 1
add_field(ws, r, "Total Facility Size *", True, "Total committed across all tranches"); r += 1
add_field(ws, r, "Our Exposure *", True, "Our current holding amount"); r += 1
add_field(ws, r, "Our Holding %", guidance="Percentage"); r += 1
add_field(ws, r, "Pricing Type", guidance="fixed, floating, index_linked"); r += 1
add_field(ws, r, "Pricing Margin (bps)", guidance="Spread over reference rate"); r += 1
add_field(ws, r, "Reference Rate", guidance="SONIA, SOFR, Euribor, GILT"); r += 1
add_field(ws, r, "Facility Agent", guidance=""); r += 1
add_field(ws, r, "Security Trustee", guidance=""); r += 1

r += 1; make_section(ws, r, 3, "CHANGE OF CONTROL"); r += 1
add_field(ws, r, "CoC Regime Exists", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws, r, "CoC Definition", guidance="How is 'control' defined?"); r += 1
add_field(ws, r, "CoC Consequence", guidance="Mandatory prepayment, EoD, consent required"); r += 1
add_field(ws, r, "CoC Prepayment Basis", guidance="par, make_whole, market_value"); r += 1

r += 1; make_section(ws, r, 3, "EQUITY CURE & MODEL"); r += 1
add_field(ws, r, "Equity Cure Available", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws, r, "Equity Cure Regime", guidance="Max frequency, amount limits, mechanism"); r += 1
add_field(ws, r, "Model Version", guidance="e.g. v3.2"); r += 1
add_field(ws, r, "Model Date", guidance="YYYY-MM-DD"); r += 1

r += 1; make_section(ws, r, 3, "DISTRIBUTION MECHANICS"); r += 1
add_field(ws, r, "Distribution Frequency", guidance="semi_annual, quarterly, annual", validation=dv_dist_freq); r += 1
add_field(ws, r, "Distribution Calculation Basis", guidance="e.g. cashflow_available_for_distribution, net_cashflow, free_cashflow_after_sweep"); r += 1
add_field(ws, r, "Distribution Waterfall Position", guidance="Integer: position in cashflow waterfall (e.g. 12 = 12th priority)"); r += 1
add_field(ws, r, "Sweep Before Distribution", guidance="Yes/No \u2014 is a mandatory cash sweep applied before distribution test?", validation=dv_yesno); r += 1
add_field(ws, r, "Sweep Included in DSCR", guidance="Yes/No \u2014 is the cash sweep included in the DSCR calculation?", validation=dv_yesno); r += 1
add_field(ws, r, "Trapped Cash Mechanism", guidance="retained_in_proceeds_account | held_in_lockup_account | swept_to_debt | released_after_cure | swept_then_released", validation=dv_trapped_cash); r += 1
add_field(ws, r, "Trapped Cash Release Conditions", guidance="Narrative: e.g. released after 2 successive Calculation Dates where all conditions satisfied"); r += 1
add_field(ws, r, "Lock-Up Cure Window (days)", guidance="Integer: days after Calculation Date to cure (e.g. 90, 45)"); r += 1
add_field(ws, r, "Lock-Up Escalation Periods", guidance="Integer: consecutive lock-up periods before escalation (e.g. 3)"); r += 1
add_field(ws, r, "Lock-Up Escalation Consequence", guidance="excess_cashflow_sweep | mandatory_prepayment | creditor_step_in"); r += 1

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
ws2.merge_cells("A1:AA1")
ws2["A1"] = "CAPITAL STRUCTURE INSTRUMENTS — One row per debt instrument. Cols R\u2013Y capture the entity level and priority-of-claim ranking used by the consolidation and ratio engines. Cols Z\u2013AA (v9) capture shareholder-level pledges for the capital stack engine."
ws2["A1"].font = version_font
ws2["A1"].alignment = Alignment(wrap_text=True)

headers_cs = ["Instrument Name", "Type", "Format", "Security Ranking", "Pari-Passu Group",
              "Committed Amount", "Drawn Amount", "Currency", "Margin (bps)", "Base Rate",
              "Interest Type", "Maturity Date", "Repayment Type", "Our Holding Amount",
              "Our Holding %", "DSRA Months", "Status",
              # Capital-structure taxonomy (v8)
              "Entity Level", "Entity Name", "Ownership %", "Structural Seniority",
              "Ratio Consolidation Level", "Intercompany Lender", "Subordination Agreement",
              "Cashflow Priority Rank",
              # Shareholder-level pledge (v9) — for capital-stack gross-up
              "Pledged Share Entity", "Pledged Share %"]
add_table_headers(ws2, 2, headers_cs)

# Row 3: guidance strip so users understand the v8+v9 columns at a glance
guidance_cs = [
    "", "", "", "", "",
    "", "", "", "", "",
    "", "", "", "", "",
    "", "",
    "opco | midco | holdco | topco | issuer | bidco | majority_holdco | minority_holdco",
    "Entity name from Tab 7",
    "Economic ownership at this level (0\u2013100). 100 if wholly-owned.",
    "Integer: 1 = closest to cashflows. Higher = further away.",
    "opco_standalone | consolidated | proportional_consolidated",
    "If intercompany loan: lending entity name. Blank for external debt.",
    "Yes/No \u2014 subject to formal intercreditor/subordination agreement?",
    "Priority of claim: 1 = first claim. Blank for shareholder loans / intercompany.",
    "v9: shareholder entity in Tab 7 whose stake secures this debt (blank for normal debt)",
    "v9: ownership % pledged \u2014 drives the grossed-up leverage factor (1 / pct)",
]
for i, g in enumerate(guidance_cs, 1):
    if g:
        cell = ws2.cell(row=3, column=i, value=g)
        cell.font = note_font
        cell.fill = PatternFill("solid", fgColor="F5F5F0")
        cell.border = border
        cell.alignment = Alignment(wrap_text=True, vertical="top")
ws2.row_dimensions[3].height = 50

dv_inst_type = DataValidation(type="list", formula1='"senior_term,senior_rcf,capex_facility,mezzanine,shl,bond,note,frn,private_placement,intercompany"')
dv_format = DataValidation(type="list", formula1='"loan,bond,note,frn,il_bond,private_placement,convertible"')
dv_int_type = DataValidation(type="list", formula1='"fixed,floating,index_linked,hybrid"')
dv_repay = DataValidation(type="list", formula1='"bullet,amortising,sculpted,cash_sweep"')
dv_status = DataValidation(type="list", formula1='"active,repaid,cancelled,restructured"')
dv_entity_level = DataValidation(type="list", formula1='"opco,midco,holdco,topco,issuer,bidco,majority_holdco,minority_holdco"')
dv_ratio_consol = DataValidation(type="list", formula1='"opco_standalone,consolidated,proportional_consolidated"')

# Data rows now start at row 4 (row 3 is guidance strip)
add_table_rows(ws2, 4, 8, len(headers_cs), {
    2: dv_inst_type, 3: dv_format, 11: dv_int_type, 13: dv_repay, 17: dv_status,
    18: dv_entity_level, 22: dv_ratio_consol, 24: dv_yesno,
})
cs_widths = {
    18: 18, 19: 22, 20: 12, 21: 14, 22: 28, 23: 22, 24: 12, 25: 14,
    26: 22, 27: 14,
}
for c in range(1, len(headers_cs) + 1):
    width = cs_widths.get(c, max(14, len(headers_cs[c-1]) + 2))
    ws2.column_dimensions[get_column_letter(c)].width = width
ws2.freeze_panes = "A4"


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
ws7.merge_cells("A1:L1")
ws7["A1"] = "CORPORATE ENTITY STRUCTURE — One row per entity in the group. Columns G\u2013L capture ownership, control and consolidation treatment used by the proportional consolidation engine."
ws7["A1"].font = version_font
ws7["A1"].alignment = Alignment(wrap_text=True)

headers_ce = ["Entity Name", "Type", "Parent Entity", "Jurisdiction", "Ring-Fenced", "Securitisation Boundary",
              # v8 additions
              "Ownership %", "Ownership Type", "Control Type", "Consolidation Method",
              "Within Security Perimeter", "Ratio Level"]
add_table_headers(ws7, 2, headers_ce)

guidance_ce = [
    "", "", "", "", "", "",
    "% owned by parent entity (0\u2013100). 100 if wholly-owned.",
    "direct | indirect | joint_venture",
    "full_control (>50%) | significant_influence (20\u201350%) | passive (<20%) | joint_control",
    "proportional | equity_method | not_consolidated | full",
    "Yes/No \u2014 is this entity within the ring-fenced financing group?",
    "opco | midco | holdco | issuer | none",
]
for i, g in enumerate(guidance_ce, 1):
    if g:
        cell = ws7.cell(row=3, column=i, value=g)
        cell.font = note_font
        cell.fill = PatternFill("solid", fgColor="F5F5F0")
        cell.border = border
        cell.alignment = Alignment(wrap_text=True, vertical="top")
ws7.row_dimensions[3].height = 50

dv_ent_type = DataValidation(type="list", formula1='"opco,bidco,holdco,topco,midco,spv,issuer,guarantor,servicer,majority_holdco,minority_holdco"')
dv_own_type = DataValidation(type="list", formula1='"direct,indirect,joint_venture"')
dv_ctrl_type = DataValidation(type="list", formula1='"full_control,significant_influence,passive,joint_control"')
dv_consol = DataValidation(type="list", formula1='"proportional,equity_method,not_consolidated,full"')
dv_ratio_level = DataValidation(type="list", formula1='"opco,midco,holdco,issuer,none"')

add_table_rows(ws7, 4, 6, len(headers_ce), {
    2: dv_ent_type, 5: dv_yesno, 6: dv_yesno,
    8: dv_own_type, 9: dv_ctrl_type, 10: dv_consol, 11: dv_yesno, 12: dv_ratio_level,
})
for c in range(1, len(headers_ce) + 1):
    ws7.column_dimensions[get_column_letter(c)].width = max(18, len(headers_ce[c-1]) + 2)
ws7.freeze_panes = "A4"


# ═══════════════════════════════════════════════════════════════════
# TAB 8: Covenant Thresholds
# ═══════════════════════════════════════════════════════════════════
ws8 = wb.create_sheet("8. Covenant Thresholds")
ws8.merge_cells("A1:L1")
ws8["A1"] = "COVENANT THRESHOLD CONFIGURATION \u2014 Three-tier framework per ratio. Column L records which entity level the covenant is tested at (needed for multi-level structures)."
ws8["A1"].font = version_font
ws8["A1"].alignment = Alignment(wrap_text=True)

headers_ct = ["Covenant Name", "Ratio Name", "Category", "Test Type", "Direction",
              "Test Frequency", "Enforcement Class", "Lockup Level", "Trigger Level",
              "Default Level", "Equity Cure Available",
              "Ratio Level"]
add_table_headers(ws8, 2, headers_ct)

guidance_ct = [
    "", "", "", "", "", "", "", "", "", "", "",
    "opco | midco | holdco | consolidated | proportional_consolidated",
]
for i, g in enumerate(guidance_ct, 1):
    if g:
        cell = ws8.cell(row=3, column=i, value=g)
        cell.font = note_font
        cell.fill = PatternFill("solid", fgColor="F5F5F0")
        cell.border = border
        cell.alignment = Alignment(wrap_text=True, vertical="top")
ws8.row_dimensions[3].height = 35

dv_cov_cat = DataValidation(type="list", formula1='"cash_flow_cover,collateral_value,incurrence,distribution,financial_maintenance"')
dv_test_type = DataValidation(type="list", formula1='"hard_covenant,distribution_condition,trigger,default"')
dv_direction = DataValidation(type="list", formula1='"min,max"')
dv_freq = DataValidation(type="list", formula1='"quarterly,semi_annual,annual"')
dv_cov_ratio_level = DataValidation(type="list", formula1='"opco,midco,holdco,consolidated,proportional_consolidated"')

add_table_rows(ws8, 4, 6, len(headers_ct), {
    3: dv_cov_cat, 4: dv_test_type, 5: dv_direction, 6: dv_freq,
    11: dv_yesno, 12: dv_cov_ratio_level,
})
for c in range(1, len(headers_ct) + 1):
    ws8.column_dimensions[get_column_letter(c)].width = max(14, len(headers_ct[c-1]) + 2)
ws8.freeze_panes = "A4"


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

r += 1; make_section(ws10, r, 3, "GROWTH CAPEX LINES (up to 5)"); r += 1
for i in range(1, 6):
    add_field(ws10, r, f"Growth Capex Line {i}"); r += 1

r += 1; make_section(ws10, r, 3, "MAINTENANCE CAPEX LINES (up to 5)"); r += 1
for i in range(1, 6):
    add_field(ws10, r, f"Maintenance Capex Line {i}"); r += 1

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


# ═══════════════════════════════════════════════════════════════════
# TAB 13: Holdings & Allocations
# ═══════════════════════════════════════════════════════════════════
ws_hold = wb.create_sheet("13. Holdings")
ws_hold.merge_cells("A1:F1")
ws_hold["A1"] = "HOLDINGS — Which accounts hold this deal and how much"
ws_hold["A1"].font = version_font

headers_hold = ["Account Name", "Holding Amount", "Instrument Name", "Tranche Amount", "Acquisition Date", "Acquisition Price"]
for i, h in enumerate(headers_hold, 1):
    cell = ws_hold.cell(row=2, column=i, value=h)
    cell.font = hdr_font; cell.fill = hdr_fill; cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
add_table_rows(ws_hold, 3, 8, len(headers_hold))
for c in range(1, len(headers_hold) + 1):
    ws_hold.column_dimensions[get_column_letter(c)].width = 22

# ═══════════════════════════════════════════════════════════════════
# TAB 13B: Investor Allocations
# ═══════════════════════════════════════════════════════════════════
ws_inv = wb.create_sheet("13B. Investors")
ws_inv.merge_cells("A1:F1")
ws_inv["A1"] = "INVESTOR ALLOCATIONS — External investors and their mandates"
ws_inv["A1"].font = version_font

headers_inv = ["Investor Name", "Account / Mandate", "Tranche", "Amount", "Mandate Size", "% of Mandate"]
for i, h in enumerate(headers_inv, 1):
    cell = ws_inv.cell(row=2, column=i, value=h)
    cell.font = hdr_font; cell.fill = hdr_fill; cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
add_table_rows(ws_inv, 3, 8, len(headers_inv))
for c in range(1, len(headers_inv) + 1):
    ws_inv.column_dimensions[get_column_letter(c)].width = 22

# ═══════════════════════════════════════════════════════════════════
# TAB 13C: Intercreditor Terms
# ═══════════════════════════════════════════════════════════════════
ws_ica = wb.create_sheet("13C. Intercreditor")
ws_ica.column_dimensions["A"].width = 30
ws_ica.column_dimensions["B"].width = 40
ws_ica.column_dimensions["C"].width = 45
ws_ica.merge_cells("A1:C1")
ws_ica["A1"] = "INTERCREDITOR TERMS"
ws_ica["A1"].font = version_font

r = 2
make_header(ws_ica, r, 3)
ws_ica.cell(row=r, column=1, value="Provision")
ws_ica.cell(row=r, column=2, value="Value")
ws_ica.cell(row=r, column=3, value="Guidance")
r = 3
add_field(ws_ica, r, "Agreement Type", guidance="ICA, STID, Common Terms"); r += 1
add_field(ws_ica, r, "Governing Law", guidance="English, New York, etc."); r += 1
add_field(ws_ica, r, "Enforcement Standstill (days)", guidance="e.g. 180"); r += 1
add_field(ws_ica, r, "Non-Petition Clause", guidance="Yes/No", validation=dv_yesno); r += 1
add_field(ws_ica, r, "Turnover Provisions", guidance="Description"); r += 1
add_field(ws_ica, r, "Permitted Payments", guidance="Description"); r += 1
add_field(ws_ica, r, "Release Conditions", guidance="Description"); r += 1
add_field(ws_ica, r, "Subrogation Rights", guidance="Description"); r += 1

# ═══════════════════════════════════════════════════════════════════
# TAB 13D: Enforcement Classes
# ═══════════════════════════════════════════════════════════════════
ws_ec = wb.create_sheet("13D. Enforcement Classes")
ws_ec.merge_cells("A1:F1")
ws_ec["A1"] = "ENFORCEMENT CLASSES — For multi-class capital structures (WBS, bond structures)"
ws_ec["A1"].font = version_font

headers_ec = ["Class Name", "Class Code", "Priority", "Included Instruments", "Distribution Conditions", "Notes"]
for i, h in enumerate(headers_ec, 1):
    cell = ws_ec.cell(row=2, column=i, value=h)
    cell.font = hdr_font; cell.fill = hdr_fill; cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
add_table_rows(ws_ec, 3, 5, len(headers_ec))
ws_ec.column_dimensions["A"].width = 22
ws_ec.column_dimensions["B"].width = 12
ws_ec.column_dimensions["C"].width = 10
ws_ec.column_dimensions["D"].width = 35
ws_ec.column_dimensions["E"].width = 35
ws_ec.column_dimensions["F"].width = 30

# ═══════════════════════════════════════════════════════════════════
# TAB 14: Period Definition (was 13A)
# ═══════════════════════════════════════════════════════════════════
ws_pd = wb.create_sheet("14. Period Definition")
# ═══════════════════════════════════════════════════════════════════
# Old 13. Period Definition tab already created above as 14
ws_pd.merge_cells("A1:D1")
ws_pd["A1"] = "REPORTING PERIOD CALENDAR — Define the period structure before entering forecast data"
ws_pd["A1"].font = version_font

r = 2
make_header(ws_pd, r, 4)
ws_pd.cell(row=r, column=1, value="Field")
ws_pd.cell(row=r, column=2, value="Value")
ws_pd.cell(row=r, column=3, value="Guidance")
ws_pd.column_dimensions["A"].width = 30
ws_pd.column_dimensions["B"].width = 25
ws_pd.column_dimensions["C"].width = 50

r = 3
dv_periodicity = DataValidation(type="list", formula1='"semi_annual,quarterly,annual"')
add_field(ws_pd, r, "Periodicity *", True, "Frequency of reporting periods", dv_periodicity); r += 1
add_field(ws_pd, r, "First Period Start *", True, "YYYY-MM-DD"); r += 1
add_field(ws_pd, r, "Final Period End *", True, "YYYY-MM-DD (maturity or concession expiry)"); r += 1
add_field(ws_pd, r, "Fiscal Year End Month *", True, "1-12"); r += 1
add_field(ws_pd, r, "Total Periods", guidance="Auto-calculated or enter manually (max 80)"); r += 1
add_field(ws_pd, r, "Reporting Lag Days", guidance="Days after period end until report expected (default 45)"); r += 1

r += 2
ws_pd.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
ws_pd.cell(row=r, column=1, value="PERIOD HEADERS — Fill in below. These become column headers on forecast tabs. Max 80 periods.").font = note_font
r += 1

make_header(ws_pd, r, 4)
ws_pd.cell(row=r, column=1, value="#")
ws_pd.cell(row=r, column=2, value="Period Label")
ws_pd.cell(row=r, column=3, value="Period Start")
ws_pd.cell(row=r, column=4, value="Period End")
r += 1

for p in range(1, 81):
    ws_pd.cell(row=r, column=1, value=p).font = label_font
    ws_pd.cell(row=r, column=1).border = border
    for c in range(2, 5):
        cell = ws_pd.cell(row=r, column=c)
        cell.border = border
        cell.fill = input_fill
        cell.font = input_font
    r += 1


# ═══════════════════════════════════════════════════════════════════
# FORECAST GRID TABS — One per case
# ═══════════════════════════════════════════════════════════════════

# Define the cashflow line items (rows)
CASHFLOW_ROWS = [
    # (section_header, line_key, label, is_section, is_computed)
    ("OPERATING CASH FLOW", None, None, True, False),
    (None, "total_revenue", "Total Revenue", False, True),
    (None, "revenue_1", "Revenue 1", False, False),
    (None, "revenue_2", "Revenue 2", False, False),
    (None, "revenue_3", "Revenue 3", False, False),
    (None, "revenue_4", "Revenue 4", False, False),
    (None, "revenue_5", "Revenue 5", False, False),
    (None, "revenue_6", "Revenue 6", False, False),
    (None, "revenue_7", "Revenue 7", False, False),
    (None, "revenue_8", "Revenue 8", False, False),
    (None, "amort_deferred_income", "Amortisation of Deferred Income", False, False),
    (None, "total_operating_costs", "Total Operating Costs", False, True),
    (None, "cost_1", "Cost 1", False, False),
    (None, "cost_2", "Cost 2", False, False),
    (None, "cost_3", "Cost 3", False, False),
    (None, "cost_4", "Cost 4", False, False),
    (None, "cost_5", "Cost 5", False, False),
    (None, "cost_6", "Cost 6", False, False),
    (None, "cost_7", "Cost 7", False, False),
    (None, "cost_8", "Cost 8", False, False),
    (None, "cost_9", "Cost 9", False, False),
    (None, "cost_10", "Cost 10", False, False),
    (None, "cost_11", "Cost 11", False, False),
    (None, "cost_12", "Cost 12", False, False),
    (None, "disallowed_costs", "Disallowed Costs", False, False),
    (None, "exceptional_items", "Exceptional Items", False, False),
    (None, "ebitda", "EBITDA", False, True),
    ("CAPITAL EXPENDITURE", None, None, True, False),
    (None, "growth_capex", "Growth Capex", False, True),
    (None, "growth_capex_1", "Growth Capex 1", False, False),
    (None, "growth_capex_2", "Growth Capex 2", False, False),
    (None, "growth_capex_3", "Growth Capex 3", False, False),
    (None, "growth_capex_4", "Growth Capex 4", False, False),
    (None, "growth_capex_5", "Growth Capex 5", False, False),
    (None, "maintenance_capex", "Maintenance Capex", False, True),
    (None, "maintenance_capex_1", "Maintenance Capex 1", False, False),
    (None, "maintenance_capex_2", "Maintenance Capex 2", False, False),
    (None, "maintenance_capex_3", "Maintenance Capex 3", False, False),
    (None, "maintenance_capex_4", "Maintenance Capex 4", False, False),
    (None, "maintenance_capex_5", "Maintenance Capex 5", False, False),
    (None, "capital_expenditure", "Total Capital Expenditure", False, True),
    (None, "charger_replacement_costs", "Charger / Equipment Replacement", False, False),
    ("WORKING CAPITAL, RESERVES & TAX", None, None, True, False),
    (None, "working_capital_movement", "Working Capital Movement", False, False),
    (None, "reserve_account_movements", "Reserve Account Movements", False, False),
    (None, "pre_finance_pre_tax_cf", "Pre-Finance, Pre-Tax Cash Flow", False, True),
    (None, "tax_paid", "Tax Paid", False, False),
    (None, "pre_finance_post_tax_cf", "Pre-Finance, Post-Tax Cash Flow", False, True),
    ("ADDITIONAL SOURCES / INCOME", None, None, True, False),
    (None, "interest_on_cash", "Interest on Cash Balances", False, False),
    (None, "customer_prepayment", "Customer Pre-Payments", False, False),
    (None, "grant_income", "Grant / Subsidy Income", False, False),
    ("FUNDING SOURCES", None, None, True, False),
    (None, "senior_debt_drawdown", "Senior Debt Drawdown", False, False),
    (None, "capex_facility_drawdown", "Capex Facility Drawdown", False, False),
    (None, "junior_debt_drawdown", "Junior / Mezzanine Debt Drawdown", False, False),
    (None, "shareholder_loan_drawdown", "Shareholder Loan Drawdown", False, False),
    (None, "equity_drawdown", "Equity Drawdown", False, False),
    (None, "total_funding", "Total Funding", False, True),
    ("CASH AVAILABLE FOR DEBT SERVICE", None, None, True, False),
    (None, "cfads", "CFADS", False, True),
    ("SENIOR DEBT SERVICE", None, None, True, False),
    (None, "senior_interest", "Senior Interest", False, False),
    (None, "senior_principal", "Senior Principal (Scheduled)", False, False),
    (None, "senior_debt_service", "Total Senior Debt Service", False, True),
    (None, "cf_after_senior_ds", "CF After Senior Debt Service", False, True),
    (None, "senior_principal_sweep", "Senior Cash Sweep", False, False),
    ("JUNIOR DEBT SERVICE", None, None, True, False),
    (None, "junior_interest", "Junior Interest", False, False),
    (None, "junior_principal", "Junior Principal", False, False),
    (None, "junior_debt_service", "Total Junior Debt Service", False, True),
    (None, "cf_after_junior_ds", "CF After Junior Debt Service", False, True),
    (None, "junior_principal_sweep", "Junior Cash Sweep", False, False),
    ("SHAREHOLDER & INTERCOMPANY", None, None, True, False),
    (None, "shareholder_loan_interest", "Shareholder Loan Interest", False, False),
    (None, "shareholder_loan_repayment", "Shareholder Loan Repayment", False, False),
    (None, "intercompany_interest_net", "Intercompany Interest (Net)", False, False),
    ("OTHER FEES & COSTS", None, None, True, False),
    (None, "ticking_commitment_fees", "Ticking / Commitment Fees", False, False),
    (None, "debt_arrangement_fees", "Debt Arrangement Fees", False, False),
    (None, "liquidity_facility_drawdown", "Liquidity Facility Drawdown", False, False),
    ("NET CASHFLOW & CLOSING", None, None, True, False),
    (None, "net_cashflow", "Net Cashflow", False, True),
    (None, "cash_bf", "Opening Cash Balance", False, False),
    (None, "distributions", "Distributions", False, False),
    (None, "share_capital_redemption", "Share Capital Redemption", False, False),
    (None, "cash_cf", "Closing Cash Balance", False, True),
    ("COVENANT RATIOS", None, None, True, False),
    (None, "senior_dscr", "Senior DSCR", False, True),
    (None, "senior_annual_dscr", "Senior Annual DSCR", False, True),
    (None, "net_debt_ebitda", "Net Debt / EBITDA", False, True),
    (None, "llcr", "LLCR", False, True),
    ("SECTOR KPIs", None, None, True, False),
    (None, "sector_kpi_1", "Sector KPI 1", False, False),
    (None, "sector_kpi_2", "Sector KPI 2", False, False),
    (None, "sector_kpi_3", "Sector KPI 3", False, False),
    (None, "sector_kpi_4", "Sector KPI 4", False, False),
    (None, "sector_kpi_5", "Sector KPI 5", False, False),
    (None, "sector_kpi_6", "Sector KPI 6", False, False),
    (None, "sector_kpi_7", "Sector KPI 7", False, False),
    (None, "sector_kpi_8", "Sector KPI 8", False, False),
    (None, "sector_kpi_9", "Sector KPI 9", False, False),
    (None, "sector_kpi_10", "Sector KPI 10", False, False),
]

NUM_PERIODS = 80

section_fill_grid = PatternFill("solid", fgColor="1F6FA5")
section_font_grid = Font(bold=True, size=9, name="Arial", color="FFFFFF")
row_label_font = Font(size=9, name="Arial", bold=True)
row_sub_font = Font(size=9, name="Arial")
computed_row_font = Font(size=9, name="Arial", italic=True, color="888888")
cell_input_fill = PatternFill("solid", fgColor="FFFFEE")
cell_font = Font(size=9, color="0000FF", name="Arial")
thin_grid = Side(style="thin", color="DDDDDD")
border_grid = Border(top=thin_grid, bottom=thin_grid, left=thin_grid, right=thin_grid)

CASE_TABS = [
    ("15. Management Case", "MANAGEMENT CASE FORECAST — Line items (rows) x periods (columns). Values in deal currency."),
    ("16. Credit Case", "CREDIT CASE FORECAST — Stress assumptions applied to management case."),
    ("17. Combined Downside", "COMBINED DOWNSIDE FORECAST — Worst-case scenario across all risk factors."),
    ("18. Actuals", "ACTUAL REPORTED DATA — From compliance certificates and financial statements."),
]

for tab_name, tab_desc in CASE_TABS:
    ws_fc = wb.create_sheet(tab_name)

    # Title row
    ws_fc.merge_cells(start_row=1, start_column=1, end_row=1, end_column=5)
    ws_fc["A1"] = tab_desc
    ws_fc["A1"].font = version_font
    ws_fc["A1"].alignment = Alignment(wrap_text=True)
    ws_fc.row_dimensions[1].height = 30

    # Column A = line key, Column B = label, Columns C onwards = periods
    ws_fc.column_dimensions["A"].width = 22
    ws_fc.column_dimensions["B"].width = 30

    # Header row: line_key | label | Period 1 | Period 2 | ... | Period 80
    header_row = 2
    ws_fc.cell(row=header_row, column=1, value="Line Key").font = hdr_font
    ws_fc.cell(row=header_row, column=1).fill = hdr_fill
    ws_fc.cell(row=header_row, column=1).border = border_grid
    ws_fc.cell(row=header_row, column=2, value="Line Item").font = hdr_font
    ws_fc.cell(row=header_row, column=2).fill = hdr_fill
    ws_fc.cell(row=header_row, column=2).border = border_grid

    for p in range(1, NUM_PERIODS + 1):
        col = p + 2
        cell = ws_fc.cell(row=header_row, column=col, value=f"Period {p}")
        cell.font = Font(bold=True, size=8, name="Arial", color="FFFFFF")
        cell.fill = hdr_fill
        cell.border = border_grid
        cell.alignment = Alignment(horizontal="center")
        ws_fc.column_dimensions[get_column_letter(col)].width = 11

    # Data rows
    data_row = 3
    for item in CASHFLOW_ROWS:
        section_header, line_key, label, is_section, is_computed = item

        if is_section:
            # Section header row — spans all columns
            ws_fc.cell(row=data_row, column=1, value="").border = border_grid
            ws_fc.cell(row=data_row, column=1).fill = section_fill_grid
            ws_fc.cell(row=data_row, column=2, value=section_header).font = section_font_grid
            ws_fc.cell(row=data_row, column=2).fill = section_fill_grid
            ws_fc.cell(row=data_row, column=2).border = border_grid
            for p in range(1, NUM_PERIODS + 1):
                cell = ws_fc.cell(row=data_row, column=p + 2)
                cell.fill = section_fill_grid
                cell.border = border_grid
        else:
            # Data row
            ws_fc.cell(row=data_row, column=1, value=line_key).font = Font(size=8, name="Arial", color="888888")
            ws_fc.cell(row=data_row, column=1).border = border_grid

            label_cell = ws_fc.cell(row=data_row, column=2, value=label)
            label_cell.border = border_grid
            if is_computed:
                label_cell.font = computed_row_font
            else:
                label_cell.font = row_label_font

            for p in range(1, NUM_PERIODS + 1):
                cell = ws_fc.cell(row=data_row, column=p + 2)
                cell.border = border_grid
                if is_computed:
                    cell.fill = computed_fill
                    cell.font = computed_font
                else:
                    cell.fill = cell_input_fill
                    cell.font = cell_font

        data_row += 1

    # Freeze panes: freeze column A+B and header row
    ws_fc.freeze_panes = "C3"


# ═══════════════════════════════════════════════════════════════════
# TAB 18: Key Risks
# ═══════════════════════════════════════════════════════════════════
ws_risk = wb.create_sheet("19. Key Risks")
ws_risk.merge_cells("A1:L1")
ws_risk["A1"] = "KEY RISKS — Record the main risks as you see them. You do not need to complete all 236 taxonomy items. Focus on the risks that matter most for this deal."
ws_risk["A1"].font = version_font
ws_risk["A1"].alignment = Alignment(wrap_text=True)
ws_risk.row_dimensions[1].height = 35

headers_risk = [
    "Risk ID", "Risk Name", "Category", "Description",
    "Likelihood (1-5)", "Severity (1-6)", "Risk Score",
    "Trend", "Mitigation Party", "Mitigation Detail",
    "Capital at Risk", "Monitoring KPI"
]
for i, h in enumerate(headers_risk, 1):
    cell = ws_risk.cell(row=2, column=i, value=h)
    cell.font = hdr_font
    cell.fill = hdr_fill
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")

# Notes row
notes_risk = [
    "From taxonomy (e.g. RISK-MK-024) or custom",
    "Short name",
    "Credit & Financial, Structural, Operational, Market & Macro, Regulatory, ESG, Sector-Specific",
    "What is the risk and how does it apply to this deal?",
    "1=Remote, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain",
    "1=Negligible, 2=Low, 3=Moderate, 4=High, 5=Critical, 6=Fatal",
    "Likelihood x Severity (auto or manual)",
    "improving, stable, deteriorating",
    "M1=None, M2=Reputational, M3=Contractual, M4=Insured, M5=Guaranteed",
    "Who mitigates and how?",
    "C1=None, C2=Comfort, C3=Reserve, C4=Funded, C5=Overcollateralised",
    "KPI to watch for early warning"
]
for i, n in enumerate(notes_risk, 1):
    cell = ws_risk.cell(row=3, column=i, value=n)
    cell.font = note_font
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
ws_risk.row_dimensions[3].height = 45

# Validations
dv_likelihood = DataValidation(type="list", formula1='"1,2,3,4,5"')
dv_severity = DataValidation(type="list", formula1='"1,2,3,4,5,6"')
dv_risk_cat = DataValidation(type="list", formula1='"Credit & Financial,Structural & Documentation,Business & Operational,Market & Macroeconomic,Regulatory & Legal,ESG & Climate,Sector-Specific"')
dv_trend_risk = DataValidation(type="list", formula1='"improving,stable,deteriorating"')
dv_mit_party = DataValidation(type="list", formula1='"M1 - None,M2 - Reputational,M3 - Contractual,M4 - Insured,M5 - Guaranteed/Sovereign"')
dv_mit_capital = DataValidation(type="list", formula1='"C1 - None,C2 - Comfort,C3 - Reserve,C4 - Funded,C5 - Overcollateralised"')

add_table_rows(ws_risk, 4, 20, len(headers_risk), {
    3: dv_risk_cat,
    5: dv_likelihood,
    6: dv_severity,
    8: dv_trend_risk,
    9: dv_mit_party,
    11: dv_mit_capital,
})

# Column widths
col_widths_risk = [14, 25, 22, 40, 12, 12, 10, 12, 20, 35, 20, 25]
for i, w in enumerate(col_widths_risk, 1):
    ws_risk.column_dimensions[get_column_letter(i)].width = w

# Add risk score formula (Likelihood x Severity) for all 20 rows
for r in range(4, 24):
    ws_risk.cell(row=r, column=7, value=f"=IF(AND(E{r}<>\"\",F{r}<>\"\"),E{r}*F{r},\"\")")
    ws_risk.cell(row=r, column=7).font = Font(size=10, bold=True, name="Arial")
    ws_risk.cell(row=r, column=7).fill = computed_fill

# Freeze header
ws_risk.freeze_panes = "A4"

# Update Validation tab to include Key Risks
ws13 = wb["Validation"]
next_row = 15  # After existing 12 sections
ws13.cell(row=next_row, column=1, value="18. Key Risks").font = label_font
ws13.cell(row=next_row, column=1).border = border
ws13.cell(row=next_row, column=2).border = border
ws13.cell(row=next_row, column=2).fill = input_fill
ws13.cell(row=next_row, column=3, value="Top 5-10 risks recommended. Include forecast optimism if relevant.").font = note_font
ws13.cell(row=next_row, column=3).border = border


# ═══════════════════════════════════════════════════════════════════
# TAB 20: Onboarding Snapshot (write-once, frozen at investment)
# ═══════════════════════════════════════════════════════════════════
ws_ob = wb.create_sheet("20. Onboarding Snapshot")
ws_ob.merge_cells("A1:C1")
ws_ob["A1"] = "ONBOARDING SNAPSHOT — Frozen at investment. WRITE-ONCE in the database: edits are blocked by trigger; restructurings create a new snapshot with snapshot_number + 1."
ws_ob["A1"].font = version_font
ws_ob["A1"].alignment = Alignment(wrap_text=True)
ws_ob.row_dimensions[1].height = 40

r = 3
ws_ob.cell(row=r, column=1, value="Field").font = hdr_font
ws_ob.cell(row=r, column=1).fill = hdr_fill
ws_ob.cell(row=r, column=1).border = border
ws_ob.cell(row=r, column=2, value="Value").font = hdr_font
ws_ob.cell(row=r, column=2).fill = hdr_fill
ws_ob.cell(row=r, column=2).border = border
ws_ob.cell(row=r, column=3, value="Guidance").font = hdr_font
ws_ob.cell(row=r, column=3).fill = hdr_fill
ws_ob.cell(row=r, column=3).border = border
r += 1

ws_ob.column_dimensions["A"].width = 42
ws_ob.column_dimensions["B"].width = 30
ws_ob.column_dimensions["C"].width = 65

# Metadata
make_section(ws_ob, r, 3, "SNAPSHOT METADATA"); r += 1
add_field(ws_ob, r, "Snapshot Date *", True, "Usually the origination date (YYYY-MM-DD)"); r += 1
add_field(ws_ob, r, "Snapshot Reason *", True, "origination | restructuring | re_underwriting | covenant_reset"); r += 1
add_field(ws_ob, r, "Captured By", guidance="IC approver or credit officer"); r += 1

# Group A
r += 1; make_section(ws_ob, r, 3, "A. STRUCTURAL POSITION AT ONBOARDING"); r += 1
add_field(ws_ob, r, "Tail Years at Onboarding", guidance="Signed number of years (e.g. +3.07 or -2.50)"); r += 1
add_field(ws_ob, r, "Tail Classification at Onboarding", guidance="positive_tail | matched | negative_tail"); r += 1
add_field(ws_ob, r, "Renewal Profile at Onboarding", guidance="Same values as main Renewal Profile field"); r += 1
add_field(ws_ob, r, "Debt Repayment From Renewal % at Onboarding", guidance="0-100"); r += 1
add_field(ws_ob, r, "Revenue Risk Code at Onboarding", guidance="Frozen P-V-D code (e.g. P3-V5-D5)"); r += 1
add_field(ws_ob, r, "Concession Years Remaining at Onboarding", guidance="Years remaining at investment date"); r += 1
add_field(ws_ob, r, "Number of Distribution Gates", guidance="Integer: count of distribution_condition rows in Tab 22"); r += 1
add_field(ws_ob, r, "Distribution Gates Summary", guidance="One-line summary: e.g. 3 ratio gates + 8 non-ratio gates + stepped cash sweep"); r += 1

# Group B
r += 1; make_section(ws_ob, r, 3, "B. FINANCIAL METRICS AT ONBOARDING"); r += 1
add_field(ws_ob, r, "Entry Leverage", guidance="Net Debt / EBITDA at purchase (e.g. 6.50)"); r += 1
add_field(ws_ob, r, "Entry Year-1 DSCR", guidance="Year 1 management case DSCR (e.g. 1.35)"); r += 1
add_field(ws_ob, r, "Min DSCR Across Life", guidance="Minimum management case DSCR over debt life"); r += 1
add_field(ws_ob, r, "Entry LLCR", guidance="Year 1 Loan Life Coverage Ratio"); r += 1
add_field(ws_ob, r, "Entry Loan Life (years)", guidance="Years from origination to final debt maturity"); r += 1
add_field(ws_ob, r, "Entry Weighted Average Life", guidance="Debt WAL at origination"); r += 1

# Group C
r += 1; make_section(ws_ob, r, 3, "C. LENDER CASE / STRESS AT ONBOARDING"); r += 1
add_field(ws_ob, r, "Lender Case Min DSCR", guidance="Minimum DSCR under lender downside"); r += 1
add_field(ws_ob, r, "Lender Case Peak Leverage", guidance="Peak Net Debt / EBITDA under lender downside"); r += 1
add_field(ws_ob, r, "Stress Break-Even %", guidance="% revenue decline required to breach DSCR 1.0x"); r += 1
add_field(ws_ob, r, "Stress Cases Tested", guidance="Free text describing the scenarios stressed at IC"); r += 1

# Group D
r += 1; make_section(ws_ob, r, 3, "D. IC GOVERNANCE AT ONBOARDING"); r += 1
add_field(ws_ob, r, "IC Memo Date", guidance="Date the IC memo was approved (YYYY-MM-DD)"); r += 1
add_field(ws_ob, r, "IC Memo Reference", guidance="Document reference / ID"); r += 1
add_field(ws_ob, r, "IC Approved By", guidance="Committee name or delegated approver"); r += 1
add_field(ws_ob, r, "IC Approval Conditions", guidance="Any conditions imposed by the IC"); r += 1
add_field(ws_ob, r, "IC Vote Margin", guidance="unanimous | majority | dissented"); r += 1

# Group E
r += 1; make_section(ws_ob, r, 3, "E. ORIGINATION ECONOMICS"); r += 1
add_field(ws_ob, r, "Entry All-In Margin (bps)", guidance="All-in margin at entry over reference rate"); r += 1
add_field(ws_ob, r, "Entry Upfront Fees (bps)", guidance="Fees earned at origination"); r += 1
add_field(ws_ob, r, "Entry Secondary Purchase Price %", guidance="e.g. 98.50 for 98.5% of par (for secondary purchases)"); r += 1
add_field(ws_ob, r, "Entry Yield to Maturity", guidance="Expected YTM at origination (decimal, e.g. 0.0920 for 9.20%)"); r += 1
add_field(ws_ob, r, "Expected Hold Period (years)", guidance="Expected investment horizon"); r += 1
add_field(ws_ob, r, "Exit Strategy", guidance="hold to maturity | sell | refinance | describe"); r += 1

# Group F
r += 1; make_section(ws_ob, r, 3, "F. MARKET CONTEXT AT ONBOARDING"); r += 1
add_field(ws_ob, r, "Entry Risk-Free Rate (bps)", guidance="10yr gilt / Treasury at entry"); r += 1
add_field(ws_ob, r, "Entry Credit Spread (bps)", guidance="Spread over risk-free rate at entry"); r += 1
add_field(ws_ob, r, "Entry Relative Value Notes", guidance="Rationale for the deal at that time"); r += 1

# Group G
r += 1; make_section(ws_ob, r, 3, "G. INITIAL RISK ASSESSMENT"); r += 1
add_field(ws_ob, r, "Initial Risk Score", guidance="Risk register score at origination"); r += 1
add_field(ws_ob, r, "Initial Grade", guidance="Grade at origination (e.g. 2 - In Line)"); r += 1
add_field(ws_ob, r, "Critical Risks at Onboarding", guidance="Top 3 risks summary narrative"); r += 1

r += 1
add_field(ws_ob, r, "Snapshot Notes", guidance="Any general notes about this snapshot"); r += 1

# Update Validation tab
ws13 = wb["Validation"]
next_row = 16
ws13.cell(row=next_row, column=1, value="20. Onboarding Snapshot").font = label_font
ws13.cell(row=next_row, column=1).border = border
ws13.cell(row=next_row, column=2).border = border
ws13.cell(row=next_row, column=2).fill = input_fill
ws13.cell(row=next_row, column=3, value="Write-once snapshot frozen at investment. Fill in as much as is available at origination.").font = note_font
ws13.cell(row=next_row, column=3).border = border


# ═══════════════════════════════════════════════════════════════════
# TAB 21: Obligations & Deliverables
# ═══════════════════════════════════════════════════════════════════
ws_del = wb.create_sheet("21. Obligations")
ws_del.merge_cells("A1:M1")
ws_del["A1"] = "OBLIGATIONS & DELIVERABLES — Record each obligation from the finance documentation. One row per obligation. These drive the deliverables calendar."
ws_del["A1"].font = version_font
ws_del["A1"].alignment = Alignment(wrap_text=True)
ws_del.row_dimensions[1].height = 40

headers_del = [
    "Obligation ID", "Obligation Name", "Applicable", "Responsible Party",
    "Frequency", "Business Days After Period End", "Business Day Jurisdictions",
    "Business Day Convention", "Grace Period (Business Days)",
    "Severity if Missed", "Phase", "Source Clause", "Notes"
]
for i, h in enumerate(headers_del, 1):
    cell = ws_del.cell(row=2, column=i, value=h)
    cell.font = hdr_font
    cell.fill = hdr_fill
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")

# Guidance row
notes_del = [
    "From taxonomy (e.g. INFO-001) or custom",
    "Short title from finance docs",
    "Yes/No",
    "borrower, auditor, agent, adviser, insurer",
    "annual, semi_annual, quarterly, monthly, event_driven",
    "Integer (e.g. 90 = 90 business days after period end)",
    "ISO codes e.g. GB or GB,US",
    "modified_following, following, preceding, no_adjustment",
    "Additional business days before overdue",
    "informational, potential_default, event_of_default",
    "all, construction, operational",
    "Clause reference in finance documents",
    "Free text"
]
for i, n in enumerate(notes_del, 1):
    cell = ws_del.cell(row=3, column=i, value=n)
    cell.font = note_font
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
ws_del.row_dimensions[3].height = 50

# Validations
dv_yn = DataValidation(type="list", formula1='"Yes,No"')
dv_resp = DataValidation(type="list", formula1='"borrower,auditor,agent,adviser,insurer"')
dv_freq_del = DataValidation(type="list", formula1='"annual,semi_annual,quarterly,monthly,event_driven"')
dv_bdc = DataValidation(type="list", formula1='"modified_following,following,preceding,no_adjustment"')
dv_sev_del = DataValidation(type="list", formula1='"informational,potential_default,event_of_default"')
dv_phase_del = DataValidation(type="list", formula1='"all,construction,operational"')

# Pre-populate with common obligations
common_obligations = [
    ("INFO-001", "Annual Audited Financial Statements", "Yes", "borrower", "annual", 90, "", "modified_following", 10, "potential_default", "operational"),
    ("INFO-002", "Semi-Annual Management Accounts", "Yes", "borrower", "semi_annual", 60, "", "modified_following", 5, "informational", "operational"),
    ("INFO-003", "Annual Budget / Business Plan", "Yes", "borrower", "annual", 30, "", "modified_following", 10, "informational", "operational"),
    ("INFO-004", "Compliance Certificate", "Yes", "borrower", "semi_annual", 60, "", "modified_following", 10, "potential_default", "operational"),
    ("INFO-005", "Covenant Ratio Calculations", "Yes", "borrower", "semi_annual", 60, "", "modified_following", 10, "potential_default", "operational"),
    ("INFO-006", "Insurance Certificate / Renewal", "Yes", "borrower", "annual", 30, "", "modified_following", 5, "potential_default", "operational"),
    ("INFO-007", "Valuation Report", "Yes", "borrower", "annual", 90, "", "modified_following", 10, "informational", "operational"),
    ("INFO-008", "Environmental Compliance Certificate", "No", "borrower", "annual", 90, "", "modified_following", 10, "informational", "operational"),
    ("INFO-009", "Model Update / Reforecast", "Yes", "borrower", "annual", 120, "", "modified_following", 15, "informational", "operational"),
    ("INFO-010", "Cash Sweep / Excess Cashflow Certificate", "Yes", "agent", "semi_annual", 60, "", "modified_following", 5, "potential_default", "operational"),
    ("NOTIF-001", "Change of Control Notification", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 5, "event_of_default", "all"),
    ("NOTIF-002", "Default / Potential Default Notification", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 2, "event_of_default", "all"),
    ("NOTIF-003", "Material Adverse Change Notification", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 5, "potential_default", "all"),
    ("NOTIF-004", "Litigation / Claims Notification", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 10, "informational", "all"),
    ("NOTIF-005", "Environmental Incident Notification", "No", "borrower", "event_driven", 0, "", "no_adjustment", 5, "informational", "all"),
    ("AFF-001", "Pari Passu Ranking Confirmation", "Yes", "borrower", "annual", 60, "", "modified_following", 10, "potential_default", "operational"),
    ("AFF-002", "No Default Certificate", "Yes", "borrower", "semi_annual", 60, "", "modified_following", 5, "potential_default", "operational"),
    ("AFF-003", "Authorisations in Full Force", "Yes", "borrower", "annual", 60, "", "modified_following", 10, "potential_default", "operational"),
    ("EOD-001", "Payment Default", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 0, "event_of_default", "all"),
    ("EOD-002", "Financial Covenant Breach", "Yes", "borrower", "event_driven", 0, "", "no_adjustment", 0, "event_of_default", "all"),
]

for row_idx, ob in enumerate(common_obligations, 4):
    for col_idx, val in enumerate(ob, 1):
        cell = ws_del.cell(row=row_idx, column=col_idx, value=val)
        cell.font = Font(size=10, name="Arial")
        cell.border = border
        if col_idx in (1, 2, 11, 12):
            cell.alignment = Alignment(wrap_text=True)

# Add blank rows for user to fill (up to 60 total)
for row_idx in range(4 + len(common_obligations), 64):
    for col_idx in range(1, len(headers_del) + 1):
        cell = ws_del.cell(row=row_idx, column=col_idx)
        cell.border = border
        cell.fill = input_fill

# Apply validations
add_table_rows(ws_del, 4, 60, len(headers_del), {
    3: dv_yn,
    4: dv_resp,
    5: dv_freq_del,
    8: dv_bdc,
    10: dv_sev_del,
    11: dv_phase_del,
})

# Column widths
col_widths_del = [12, 30, 8, 15, 12, 14, 14, 18, 12, 16, 12, 18, 25]
for i, w in enumerate(col_widths_del, 1):
    ws_del.column_dimensions[get_column_letter(i)].width = w

# Freeze header
ws_del.freeze_panes = "A4"

# Update Validation tab
ws13 = wb["Validation"]
next_row = 17
ws13.cell(row=next_row, column=1, value="21. Obligations & Deliverables").font = label_font
ws13.cell(row=next_row, column=1).border = border
ws13.cell(row=next_row, column=2).border = border
ws13.cell(row=next_row, column=2).fill = input_fill
ws13.cell(row=next_row, column=3, value="Record each obligation from finance docs. Pre-populated with 20 common items. Drives the deliverables calendar.").font = note_font
ws13.cell(row=next_row, column=3).border = border


# ═══════════════════════════════════════════════════════════════════
# TAB 22: Distribution Conditions (lock-up regime)
# ═══════════════════════════════════════════════════════════════════
ws_dc = wb.create_sheet("22. Distribution Conditions")
ws_dc.merge_cells("A1:P1")
ws_dc["A1"] = "DISTRIBUTION CONDITIONS \u2014 Record every condition that must be satisfied before cash can be distributed to equity. One row per condition. Use condition_category and consequence_tier enums."
ws_dc["A1"].font = version_font
ws_dc["A1"].alignment = Alignment(wrap_text=True)
ws_dc.row_dimensions[1].height = 40

headers_dc = [
    "Condition ID", "Condition Name", "Category", "Consequence Tier",
    "Ratio Name", "Direction", "Threshold Value", "Threshold Variant",
    "Lookback Period", "Test Frequency", "Remedy Available",
    "Remedy Mechanism", "Sweep %", "Sweep Step Schedule",
    "Source Clause", "Notes"
]
for i, h in enumerate(headers_dc, 1):
    cell = ws_dc.cell(row=2, column=i, value=h)
    cell.font = hdr_font
    cell.fill = hdr_fill
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")

notes_dc = [
    "DC-001, DC-002, etc.",
    "Short name from facility agreement",
    "ratio, reserve, compliance, timing, structural, behavioural, cash_sweep, credit_support, rating, liquidity, regulatory, capex_funding, incurrence, revolving_facility",
    "distribution_condition, trigger_event, cash_trap, remedial_plan, incurrence_test, event_of_default, sweep_mechanic",
    "seniorDscr, llcr, ltv, icr, netDebtEbitda, debtYield, seniorRar, seniorIcr. Null for non-ratio",
    "min or max. Null for non-ratio",
    "Decimal threshold (e.g. 1.35, 0.70). Null for non-ratio",
    "If threshold varies: pre_completion, post_completion, year_1, etc.",
    "historic_12m, projected_12m, projected_24m, spot, average",
    "semi_annual, quarterly, annual, each_distribution, event_driven",
    "Yes/No",
    "Cure mechanism: equity injection, reserve top-up, certificate, etc.",
    "For cash_sweep only: 0-100",
    "For stepped sweeps: Y1:25, Y2:50, Y3:75, Y4:100",
    "e.g. CTA 18.5(a)(iv), SFA Cl. 9.4",
    "Free text"
]
for i, n in enumerate(notes_dc, 1):
    cell = ws_dc.cell(row=3, column=i, value=n)
    cell.font = note_font
    cell.border = border
    cell.alignment = Alignment(wrap_text=True, vertical="top")
ws_dc.row_dimensions[3].height = 55

dv_dc_cat = DataValidation(type="list", formula1='"ratio,reserve,compliance,timing,structural,behavioural,cash_sweep,credit_support,rating,liquidity,regulatory,capex_funding,incurrence,revolving_facility"')
dv_dc_tier = DataValidation(type="list", formula1='"distribution_condition,trigger_event,cash_trap,remedial_plan,incurrence_test,event_of_default,sweep_mechanic"')
dv_dc_dir = DataValidation(type="list", formula1='"min,max"')
dv_dc_look = DataValidation(type="list", formula1='"historic_12m,projected_12m,projected_24m,spot,average"')
dv_dc_freq = DataValidation(type="list", formula1='"semi_annual,quarterly,annual,each_distribution,event_driven"')
dv_dc_yn = DataValidation(type="list", formula1='"Yes,No"')

# 30 blank rows with validations
for row_idx in range(4, 34):
    for col_idx in range(1, len(headers_dc) + 1):
        cell = ws_dc.cell(row=row_idx, column=col_idx)
        cell.border = border
        cell.fill = input_fill

add_table_rows(ws_dc, 4, 30, len(headers_dc), {
    3: dv_dc_cat,
    4: dv_dc_tier,
    6: dv_dc_dir,
    9: dv_dc_look,
    10: dv_dc_freq,
    11: dv_dc_yn,
})

col_widths_dc = [12, 35, 22, 25, 20, 8, 15, 25, 15, 18, 8, 30, 10, 35, 20, 50]
for i, w in enumerate(col_widths_dc, 1):
    ws_dc.column_dimensions[get_column_letter(i)].width = w
ws_dc.freeze_panes = "A4"

# Update Validation tab
ws13 = wb["Validation"]
next_row = 18
ws13.cell(row=next_row, column=1, value="22. Distribution Conditions").font = label_font
ws13.cell(row=next_row, column=1).border = border
ws13.cell(row=next_row, column=2).border = border
ws13.cell(row=next_row, column=2).fill = input_fill
ws13.cell(row=next_row, column=3, value="At least 1 condition required. Ratio conditions must match Tab 8 thresholds.").font = note_font
ws13.cell(row=next_row, column=3).border = border


# Save
import os
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "topsheet-data-template-v9.xlsx")
wb.save(out)
print(f"Saved to {out}")
