"""Seed the obligation_taxonomy table with all 230+ items from Part A."""
import subprocess

# All items from Part A, organized by category
ITEMS = [
    # ── CATEGORY 1A: Financial Statements & Reports ──
    ("INFO-001", 1, "Financial Information Deliverables", "1A", "Audited Annual Financial Statements", "Consolidated. Balance sheet, P&L, cash flow, notes. Audited by approved firm.", "annual", "90-180 days after FY end", "event_of_default", "all", "all"),
    ("INFO-002", 1, "Financial Information Deliverables", "1A", "Unaudited Annual Financial Statements", "Placeholder before audited available.", "annual", "Shorter deadline than audited", "potential_default", "all", "all"),
    ("INFO-003", 1, "Financial Information Deliverables", "1A", "Semi-Annual Financial Statements", "Unaudited, consolidated. Certified by director or CFO.", "semi_annual", "60-90 days after half-year end", "potential_default", "all", "all"),
    ("INFO-004", 1, "Financial Information Deliverables", "1A", "Quarterly Management Accounts", "Unaudited. P&L, balance sheet, sometimes cash flow.", "quarterly", "45-60 days after quarter end", "informational", "all", "all"),
    ("INFO-005", 1, "Financial Information Deliverables", "1A", "Monthly Management Accounts", "Common in infrastructure, project finance, and distressed situations.", "monthly", "20-30 days after month end", "informational", "all", "infrastructure"),
    ("INFO-006", 1, "Financial Information Deliverables", "1A", "Annual Budget / Business Plan", "Forward-looking projections. Key comparison baseline for actuals.", "annual", "Before or shortly after FY start", "informational", "all", "all"),
    ("INFO-007", 1, "Financial Information Deliverables", "1A", "Updated Financial Model (Base Case)", "Critical in project finance. Updated model with revised assumptions.", "annual", "Per agreement", "informational", "all", "infrastructure"),
    ("INFO-008", 1, "Financial Information Deliverables", "1A", "Capital Expenditure Report", "Actual capex vs. budgeted.", "quarterly", "With management accounts", "informational", "all", "all"),
    ("INFO-009", 1, "Financial Information Deliverables", "1A", "Cash Flow Forecast / Liquidity Report", "Forward-looking cash position.", "quarterly", "With management accounts", "informational", "all", "all"),
    ("INFO-015", 1, "Financial Information Deliverables", "1A", "Regulatory Accounts", "Specific to regulated utilities. Separate from statutory accounts.", "annual", "120 days after regulatory year end", "potential_default", "operational", "wbs"),
    ("INFO-016", 1, "Financial Information Deliverables", "1A", "Projected Excess Cashflow Calculation", "Forward-looking cash projection for distribution calculations.", "annual", "Before start of financial year", "informational", "operational", "wbs"),
    ("INFO-017", 1, "Financial Information Deliverables", "1A", "Investor Report", "Public document for bondholders. Ratios, narrative, hedging, restricted payments.", "semi_annual", "With financial statements", "potential_default", "operational", "wbs"),
    ("INFO-018", 1, "Financial Information Deliverables", "1A", "Annual Management Presentation", "Senior management presentation to lenders. Not a document — track occurrence.", "annual", "Per agreement", "informational", "all", "all"),
    # ── CATEGORY 1B: Compliance Certificates ──
    ("INFO-010", 1, "Financial Information Deliverables", "1B", "Compliance Certificate", "Signed by authorised officer. Certifies covenant calculations, no Default.", "semi_annual", "With financial statements", "event_of_default", "all", "all"),
    ("INFO-011", 1, "Financial Information Deliverables", "1B", "Officers / Directors Certificate", "Certifies financials are true and fair. May confirm no MAC.", "semi_annual", "With financial statements", "potential_default", "all", "all"),
    ("INFO-012", 1, "Financial Information Deliverables", "1B", "No Default Certificate", "Standalone confirmation of no Default/Trigger Event.", "annual", "With financials or on request", "potential_default", "all", "all"),
    ("INFO-013", 1, "Financial Information Deliverables", "1B", "Borrowing Base Certificate", "Asset-backed and revolving facilities.", "quarterly", "15-30 days after period end", "potential_default", "all", "all"),
    ("INFO-014", 1, "Financial Information Deliverables", "1B", "Covenant Cure Notice", "Notice of equity cure exercise.", "event_driven", "Within specified period after breach", "event_of_default", "all", "all"),
    # ── CATEGORY 1C: PF/Infrastructure Specific ──
    ("INFO-020", 1, "Financial Information Deliverables", "1C", "Technical Assumptions Notice", "First step of Base Case update chain.", "annual", "30-45 BD before Calculation Date", "informational", "operational", "infrastructure"),
    ("INFO-021", 1, "Financial Information Deliverables", "1C", "Economic Assumptions Notice", "Agents proposed economic assumptions.", "annual", "5 BD after Technical Assumptions", "informational", "operational", "infrastructure"),
    ("INFO-022", 1, "Financial Information Deliverables", "1C", "Projected Available Cash Flow Statement", "Largely actual with last 7 days estimated.", "semi_annual", "5 days before Calculation Date", "potential_default", "operational", "infrastructure"),
    ("INFO-023", 1, "Financial Information Deliverables", "1C", "Confirmed Available Cash Flow Statement", "Fully actual. Director-certified.", "semi_annual", "30 days after Calculation Date", "potential_default", "operational", "infrastructure"),
    ("INFO-024", 1, "Financial Information Deliverables", "1C", "Cover Ratio Statement", "DSCR calculation with all constituent elements. Director-signed.", "semi_annual", "After Cash Flow Statement agreed", "potential_default", "operational", "infrastructure"),
    ("INFO-025", 1, "Financial Information Deliverables", "1C", "Forecast Assumptions Notice + Certificate", "Forecast assumptions for financial model update.", "semi_annual", "Per agreement", "informational", "operational", "pfi"),
    # ── CATEGORY 2A: Cash Flow Cover Ratios ──
    ("FIN-002", 2, "Financial Covenants", "2A", "Interest Coverage Ratio (ICR)", "EBITDA / Interest Expense. May be Fixed Charge Coverage.", "quarterly", None, "event_of_default", "all", "all"),
    ("FIN-003", 2, "Financial Covenants", "2A", "Debt Service Coverage Ratio (DSCR)", "CFADS / total debt service. Standard in PF and infrastructure.", "semi_annual", None, "event_of_default", "all", "all"),
    ("FIN-008", 2, "Financial Covenants", "2A", "Minimum Revenue / EBITDA", "Absolute floor. Less common.", "quarterly", None, "event_of_default", "all", "all"),
    ("FIN-009", 2, "Financial Covenants", "2A", "Cash Sweep / Excess Cash Flow", "Percentage of excess cash flow applied to prepay debt.", "annual", None, "informational", "operational", "all"),
    ("FIN-014", 2, "Financial Covenants", "2A", "Rental Coverage / Income Cover", "Rental income / debt service. Real estate specific.", "quarterly", None, "event_of_default", "all", "real_estate"),
    ("FIN-015", 2, "Financial Covenants", "2A", "Forecast DSCR", "Forward-looking DSCR from Base Case. Breach can itself be EoD.", "semi_annual", None, "event_of_default", "all", "infrastructure"),
    ("FIN-018", 2, "Financial Covenants", "2A", "Post-Maintenance ICR (PMICR)", "CF minus regulatory depreciation / senior interest. UK regulated WBS.", "semi_annual", None, "event_of_default", "operational", "wbs"),
    # ── CATEGORY 2B: Collateral / Value Ratios ──
    ("FIN-001", 2, "Financial Covenants", "2B", "Leverage Ratio (Net Debt / EBITDA)", "Most common corporate covenant. Rolling 12-month.", "quarterly", None, "event_of_default", "all", "all"),
    ("FIN-004", 2, "Financial Covenants", "2B", "Loan-to-Value (LTV)", "Loan balance / appraised value. Real estate and asset-backed.", "semi_annual", None, "event_of_default", "all", "real_estate"),
    ("FIN-005", 2, "Financial Covenants", "2B", "Minimum Net Worth / Equity", "Absolute floor on net worth/equity. Standard in USPP.", "quarterly", None, "event_of_default", "all", "uspp"),
    ("FIN-006", 2, "Financial Covenants", "2B", "Minimum Liquidity / Cash Balance", "Minimum cash or available headroom.", "quarterly", None, "potential_default", "all", "all"),
    ("FIN-012", 2, "Financial Covenants", "2B", "Loan Life Coverage Ratio (LLCR)", "NPV of projected CFs to final repayment / outstanding debt.", "semi_annual", None, "event_of_default", "all", "infrastructure"),
    ("FIN-013", 2, "Financial Covenants", "2B", "Project Life Coverage Ratio (PLCR)", "NPV of projected CFs over project life / outstanding debt.", "semi_annual", None, "event_of_default", "all", "infrastructure"),
    ("FIN-016", 2, "Financial Covenants", "2B", "Asset Cover Ratio (ACR)", "Net Debt / RAB. WBS/regulated. Lower is better.", "semi_annual", None, "event_of_default", "operational", "wbs"),
    # ── CATEGORY 2C: Incurrence / Distribution Tests ──
    ("FIN-007", 2, "Financial Covenants", "2C", "Maximum Capital Expenditure", "Cap on capex. Tested against budget.", "annual", None, "potential_default", "all", "all"),
    ("FIN-010", 2, "Financial Covenants", "2C", "Debt Incurrence Test", "Pro forma test before additional debt.", "event_driven", None, "potential_default", "all", "all"),
    ("FIN-011", 2, "Financial Covenants", "2C", "Restricted Payments / Distribution Test", "Pro forma test before dividends. Locked up on Trigger Event in WBS.", "event_driven", None, "potential_default", "all", "all"),
    # ── CATEGORY 3: Notification Obligations ──
    ("NOTIF-001", 3, "Notification Obligations", None, "Default / Event of Default notification", "Steps being taken to remedy. Covers Trigger Events and EoDs.", "event_driven", "Upon occurrence", "event_of_default", "all", "all"),
    ("NOTIF-002", 3, "Notification Obligations", None, "Material Adverse Change", "Sometimes separate, sometimes in compliance certificate.", "event_driven", "Upon occurrence", "potential_default", "all", "all"),
    ("NOTIF-003", 3, "Notification Obligations", None, "Litigation / Proceedings", "Thresholds vary: >50K (PFI), >100K (PF), MAE only (WBS/corporate).", "event_driven", "Upon institution or threat", "informational", "all", "all"),
    ("NOTIF-004", 3, "Notification Obligations", None, "Change of Control", "May be EoD or mandatory prepayment trigger.", "event_driven", "Upon occurrence", "event_of_default", "all", "all"),
    ("NOTIF-005", 3, "Notification Obligations", None, "Material notices under Project Documents", "All material notices from counterparties.", "event_driven", "Upon receipt", "informational", "all", "infrastructure"),
    ("NOTIF-006", 3, "Notification Obligations", None, "Change of Auditors", "Consent may be required.", "event_driven", "Promptly", "informational", "all", "all"),
    ("NOTIF-007", 3, "Notification Obligations", None, "Change of Accounting Policy", "Material changes to basis of preparation.", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-008", 3, "Notification Obligations", None, "Loss / Damage to Assets", "Thresholds vary: >50K (PFI), >250K (PF).", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-009", 3, "Notification Obligations", None, "Environmental Claim / Incident", "Claims, inspections, non-compliance, hazardous substance.", "event_driven", "Upon becoming aware", "informational", "all", "all"),
    ("NOTIF-010", 3, "Notification Obligations", None, "Insurance Events", "Claims, policy changes, damage exceeding threshold.", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-011", 3, "Notification Obligations", None, "Authorisation Changes", "Loss, suspension, or modification of licences/permits.", "event_driven", "Upon occurrence", "potential_default", "all", "all"),
    ("NOTIF-012", 3, "Notification Obligations", None, "Compensation / Insurance Proceeds receipt", "Notification of amounts received.", "event_driven", "Upon receipt", "informational", "all", "all"),
    ("NOTIF-013", 3, "Notification Obligations", None, "Tax Status Change", "Change in tax residence, status, or material liability.", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-014", 3, "Notification Obligations", None, "Pension Events", "Financial support direction or contribution notice. UK-specific.", "event_driven", "Promptly", "informational", "all", "all"),
    ("NOTIF-015", 3, "Notification Obligations", None, "Regulatory Year-End Change", "2-3 months advance notice. Regulated utilities.", "event_driven", "2-3 months advance", "informational", "all", "wbs"),
    ("NOTIF-016", 3, "Notification Obligations", None, "Website Unavailability", "5+ Business Days. WBS/bond structures.", "event_driven", "5+ BD", "informational", "all", "wbs"),
    ("NOTIF-017", 3, "Notification Obligations", None, "Emergency", "Any emergency event affecting project or business.", "event_driven", "Upon becoming aware", "informational", "all", "all"),
    ("NOTIF-018", 3, "Notification Obligations", None, "Project Suspension / Delay / Abandonment", "Any proposal to suspend, delay, or abandon.", "event_driven", "Upon becoming aware", "potential_default", "all", "infrastructure"),
    ("NOTIF-019", 3, "Notification Obligations", None, "Project Document Breach / Termination Risk", "Loss of force, material breach, counterparty termination right.", "event_driven", "Upon becoming aware", "potential_default", "all", "infrastructure"),
    ("NOTIF-020", 3, "Notification Obligations", None, "Warning Notices from Authority", "PFI: Warning Notices. WBS: enforcement orders.", "event_driven", "Upon receipt", "potential_default", "all", "infrastructure"),
    ("NOTIF-021", 3, "Notification Obligations", None, "Performance Threshold Breach", "PFI-specific: Performance Points exceeding thresholds.", "event_driven", "Upon occurrence", "potential_default", "all", "pfi"),
    ("NOTIF-022", 3, "Notification Obligations", None, "Drawstop Notification", "Multi-tranche: drawstop condition triggered.", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-023", 3, "Notification Obligations", None, "Anchor Counterparty Dispute", "Disputes with key revenue counterparties.", "event_driven", "Upon becoming aware", "informational", "all", "all"),
    ("NOTIF-024", 3, "Notification Obligations", None, "Share Capital / Ownership Changes", "Issuance, redemption, transfer of shares.", "event_driven", "Upon occurrence", "informational", "all", "all"),
    ("NOTIF-025", 3, "Notification Obligations", None, "Force Majeure Events", "Under project documents or operational contracts.", "event_driven", "Upon occurrence", "informational", "all", "infrastructure"),
    ("NOTIF-026", 3, "Notification Obligations", None, "Credit rating obtained or changed", "Any credit rating obtained and subsequent changes.", "event_driven", "Promptly", "informational", "all", "all"),
    ("NOTIF-027", 3, "Notification Obligations", None, "Licence change or Government notice", "Proposed change to operating licence or government notice.", "event_driven", "Promptly", "potential_default", "all", "wbs"),
    ("NOTIF-028", 3, "Notification Obligations", None, "Circumstances that might have MAE", "Including government investigations, proceedings.", "event_driven", "Promptly", "informational", "all", "all"),
    # ── CATEGORY 4: Periodic Non-Financial Deliverables ──
    ("PERI-001", 4, "Periodic Non-Financial Deliverables", None, "Insurance Certificate / Brokers Report", "Confirms adequacy of insurance programme.", "annual", "30 days pre-renewal", "potential_default", "all", "all"),
    ("PERI-002", 4, "Periodic Non-Financial Deliverables", None, "Insurance Policy Copies / Summary", "Copies of material policies or broker summary.", "annual", "Upon change", "informational", "all", "all"),
    ("PERI-003", 4, "Periodic Non-Financial Deliverables", None, "Property Valuation", "Independent valuation. Real estate and asset-backed.", "annual", "Per agreement", "informational", "all", "real_estate"),
    ("PERI-004", 4, "Periodic Non-Financial Deliverables", None, "KYC / AML Refresh", "Updated know-your-customer information.", "annual", "Per agreement", "informational", "all", "all"),
    ("PERI-005", 4, "Periodic Non-Financial Deliverables", None, "ESG / Sustainability Report", "Increasingly common. Standalone or part of annual report.", "annual", "With annual report", "informational", "all", "all"),
    ("PERI-006", 4, "Periodic Non-Financial Deliverables", None, "Shareholder Structure / Ownership Chart", "Updated organisational chart.", "annual", "Per agreement", "informational", "all", "all"),
    ("PERI-007", 4, "Periodic Non-Financial Deliverables", None, "Board Composition / Director Changes", "Notification of changes to board or senior management.", "event_driven", "Upon change", "informational", "all", "all"),
    ("PERI-008", 4, "Periodic Non-Financial Deliverables", None, "Material Contract Summary", "Summary of material contracts entered or amended.", "annual", "Per agreement", "informational", "all", "all"),
    ("PERI-009", 4, "Periodic Non-Financial Deliverables", None, "Hedging Report", "MTM, notional, counterparty exposure, compliance.", "quarterly", "Per agreement", "informational", "all", "all"),
    ("PERI-010", 4, "Periodic Non-Financial Deliverables", None, "Accounts / Reserve Account Statements", "DSRA, MRA, and other required account balances.", "quarterly", "Per agreement", "informational", "all", "infrastructure"),
    # ── CATEGORY 5: Affirmative Covenants ──
    ("AFF-001", 5, "Affirmative Covenants", None, "Comply with laws", "Material respects / MAE threshold.", None, None, "event_of_default", "all", "all"),
    ("AFF-002", 5, "Affirmative Covenants", None, "Obtain and maintain authorisations", "All licences, permits, consents needed for business.", None, None, "event_of_default", "all", "all"),
    ("AFF-003", 5, "Affirmative Covenants", None, "Maintain insurance", "Per insurance requirements schedule.", None, None, "event_of_default", "all", "all"),
    ("AFF-004", 5, "Affirmative Covenants", None, "Pay taxes", "Within permitted time, with good-faith contestation carve-out.", None, None, "event_of_default", "all", "all"),
    ("AFF-005", 5, "Affirmative Covenants", None, "Maintain accounting systems", "Adequate to produce required reports.", None, None, "potential_default", "all", "all"),
    ("AFF-006", 5, "Affirmative Covenants", None, "Pari passu ranking", "Unsecured claims rank at least pari passu.", None, None, "event_of_default", "all", "all"),
    ("AFF-007", 5, "Affirmative Covenants", None, "Environmental compliance", "MAE threshold.", None, None, "event_of_default", "all", "all"),
    ("AFF-008", 5, "Affirmative Covenants", None, "Maintain and perfect security", "Execute further assurance documents as required.", None, None, "event_of_default", "all", "all"),
    ("AFF-009", 5, "Affirmative Covenants", None, "Comply with constitutional documents", "Operate in accordance with memorandum and articles.", None, None, "potential_default", "all", "all"),
    ("AFF-010", 5, "Affirmative Covenants", None, "Comply with hedging policy", "Maintain hedging programme per agreed policy.", None, None, "potential_default", "all", "infrastructure"),
    ("AFF-011", 5, "Affirmative Covenants", None, "Comply with cash management", "Maintain accounts per cash waterfall / accounts agreement.", None, None, "potential_default", "all", "infrastructure"),
    ("AFF-012", 5, "Affirmative Covenants", None, "Maintain separate bank accounts", "Separate from non-group entities.", None, None, "potential_default", "all", "all"),
    ("AFF-013", 5, "Affirmative Covenants", None, "Maintain intellectual property", "Use reasonable endeavours to protect IP rights.", None, None, "informational", "all", "all"),
    ("AFF-014", 5, "Affirmative Covenants", None, "Retain reputable auditors", "Consent may be required for changes.", None, None, "potential_default", "all", "all"),
    ("AFF-015", 5, "Affirmative Covenants", None, "Comply with pension obligations", "Including monitoring of DB scheme risks. UK-specific.", None, None, "potential_default", "all", "all"),
    ("AFF-016", 5, "Affirmative Covenants", None, "Maintain centre of main interests", "In specified jurisdiction (typically UK).", None, None, "event_of_default", "all", "all"),
    ("AFF-017", 5, "Affirmative Covenants", None, "Arms length transactions", "All dealings on arms length terms, with carve-outs.", None, None, "potential_default", "all", "all"),
    ("AFF-018", 5, "Affirmative Covenants", None, "Maintain credit ratings", "Use reasonable endeavours; cooperate with agencies. WBS.", None, None, "informational", "all", "wbs"),
    ("AFF-019", 5, "Affirmative Covenants", None, "Public procurement compliance", "For regulated utilities and public sector projects.", None, None, "potential_default", "all", "infrastructure"),
    ("AFF-020", 5, "Affirmative Covenants", None, "Project implementation", "Design, construct, operate, maintain per Good Industry Practice.", None, None, "event_of_default", "all", "infrastructure"),
    ("AFF-021", 5, "Affirmative Covenants", None, "Maintain sufficient personnel", "Qualified staff to perform obligations.", None, None, "informational", "all", "all"),
    ("AFF-022", 5, "Affirmative Covenants", None, "Accuracy of information", "All information delivered must be true, complete, and accurate.", None, None, "event_of_default", "all", "all"),
    # ── CATEGORY 6: Negative Covenants ──
    ("NEG-001", 6, "Negative Covenants", None, "Negative pledge", "No security interest other than Permitted Security Interests.", None, None, "event_of_default", "all", "all"),
    ("NEG-002", 6, "Negative Covenants", None, "No disposals", "Other than Permitted Disposals.", None, None, "event_of_default", "all", "all"),
    ("NEG-003", 6, "Negative Covenants", None, "No additional Financial Indebtedness", "Other than Permitted FI. May include debt maturity concentration limits.", None, None, "event_of_default", "all", "all"),
    ("NEG-004", 6, "Negative Covenants", None, "No loans or credit support", "Limits on lending to or guaranteeing third parties.", None, None, "event_of_default", "all", "all"),
    ("NEG-005", 6, "Negative Covenants", None, "No other business", "Restricted to Permitted Business.", None, None, "event_of_default", "all", "all"),
    ("NEG-006", 6, "Negative Covenants", None, "No restricted payments / distributions", "Unless Restricted Payment Condition satisfied.", None, None, "event_of_default", "all", "all"),
    ("NEG-007", 6, "Negative Covenants", None, "No acquisitions / investments", "Other than Permitted Acquisitions.", None, None, "event_of_default", "all", "all"),
    ("NEG-008", 6, "Negative Covenants", None, "No joint ventures", "Unless obligor or Permitted JV.", None, None, "event_of_default", "all", "all"),
    ("NEG-009", 6, "Negative Covenants", None, "No mergers / consolidations", "Without consent.", None, None, "event_of_default", "all", "all"),
    ("NEG-010", 6, "Negative Covenants", None, "No amendment to constitutional documents", "Without consent, unless no MAE.", None, None, "potential_default", "all", "all"),
    ("NEG-011", 6, "Negative Covenants", None, "No amendment to Project Documents", "Without Intercreditor Agent consent.", None, None, "event_of_default", "all", "infrastructure"),
    ("NEG-012", 6, "Negative Covenants", None, "Share capital restrictions", "No redemption, no redeemable/convertible issuance.", None, None, "event_of_default", "all", "all"),
    ("NEG-013", 6, "Negative Covenants", None, "No hedging other than permitted", "Hedging only per agreed policy and approved counterparties.", None, None, "potential_default", "all", "infrastructure"),
    ("NEG-014", 6, "Negative Covenants", None, "Expenditure limited to Approved Budget", "All expenditure within approved line items.", None, None, "potential_default", "all", "infrastructure"),
    ("NEG-015", 6, "Negative Covenants", None, "No suspension or abandonment of Project", "PFI/project finance.", None, None, "event_of_default", "all", "infrastructure"),
    ("NEG-016", 6, "Negative Covenants", None, "No new material contracts without consent", "Agent approval for material new contracts.", None, None, "potential_default", "all", "all"),
    # ── CATEGORY 7: Events of Default ──
    ("EOD-001", 7, "Events of Default", None, "Non-payment", "Grace 3-7 BD for admin/technical error only.", None, "3-7 Business Days", "event_of_default", "all", "all"),
    ("EOD-002", 7, "Events of Default", None, "Financial covenant breach", "Some structures allow equity cure (max 1/year).", None, "None to 30 days", "event_of_default", "all", "all"),
    ("EOD-003", 7, "Events of Default", None, "Breach of information undertakings", "Failure to deliver financials, compliance certificates.", None, "10-30 days if remediable", "event_of_default", "all", "all"),
    ("EOD-004", 7, "Events of Default", None, "Breach of other obligations", "May not apply to negative pledge, disposals (immediate).", None, "10-30 days if remediable", "event_of_default", "all", "all"),
    ("EOD-005", 7, "Events of Default", None, "Misrepresentation", "Representation incorrect or misleading.", None, "10-60 days if remediable", "event_of_default", "all", "all"),
    ("EOD-006", 7, "Events of Default", None, "Cross-default", "Threshold amounts vary (50K to 0.5% of total assets).", None, "None", "event_of_default", "all", "all"),
    ("EOD-007", 7, "Events of Default", None, "Major Project Party breach", "Breach by contractor, operator, or material counterparty.", None, "20 days (PFI); MAE (WBS)", "event_of_default", "all", "infrastructure"),
    ("EOD-008", 7, "Events of Default", None, "Insolvency", "Unable to pay debts, value of assets less than liabilities.", None, "None", "event_of_default", "all", "all"),
    ("EOD-009", 7, "Events of Default", None, "Insolvency proceedings", "Carve-outs for frivolous proceedings and solvent reorgs.", None, "7-15 BD to discharge", "event_of_default", "all", "all"),
    ("EOD-010", 7, "Events of Default", None, "Creditors process", "Expropriation, attachment, sequestration, execution.", None, "15 BD to discharge", "event_of_default", "all", "all"),
    ("EOD-011", 7, "Events of Default", None, "Unlawfulness", "Illegal to perform obligations.", None, "None", "event_of_default", "all", "all"),
    ("EOD-012", 7, "Events of Default", None, "Unenforceability", "Finance Document not effective.", None, "None", "event_of_default", "all", "all"),
    ("EOD-013", 7, "Events of Default", None, "Security impairment", "Security ceases to be in force.", None, "None", "event_of_default", "all", "all"),
    ("EOD-014", 7, "Events of Default", None, "Repudiation", "Obligor repudiates a Relevant Document.", None, "None", "event_of_default", "all", "all"),
    ("EOD-015", 7, "Events of Default", None, "Cessation of business", "Borrower, anchor counterparty, or major project party.", None, "70 days to replace", "event_of_default", "all", "all"),
    ("EOD-016", 7, "Events of Default", None, "Change of control", "May include change of anchor counterparty status.", None, "None", "event_of_default", "all", "all"),
    ("EOD-017", 7, "Events of Default", None, "Loss of material licence / authorisation", "Regulated businesses and concessions.", None, "None (if MAE)", "event_of_default", "all", "all"),
    ("EOD-018", 7, "Events of Default", None, "Failure to comply with court judgment", "Final judgment not complied with or paid.", None, "None (MAE)", "event_of_default", "all", "all"),
    ("EOD-019", 7, "Events of Default", None, "Expropriation / nationalisation", "Government taking of material assets.", None, "None", "event_of_default", "all", "all"),
    ("EOD-020", 7, "Events of Default", None, "Completion longstop date", "Project not completed by backstop date.", None, "None", "event_of_default", "construction", "infrastructure"),
    ("EOD-021", 7, "Events of Default", None, "Project Document impairment", "Material project document ineffective or abandoned.", None, "30 days to procure substitute", "event_of_default", "all", "infrastructure"),
    ("EOD-022", 7, "Events of Default", None, "Force majeure (prolonged)", "Prolonged FM likely to terminate a project document.", None, "None", "event_of_default", "all", "infrastructure"),
    ("EOD-023", 7, "Events of Default", None, "Defects in title", "Borrower lacks good title to project site / key assets.", None, "None", "event_of_default", "all", "infrastructure"),
    ("EOD-024", 7, "Events of Default", None, "Excessive Warning Notices", "PFI-specific: cumulative thresholds over rolling periods.", None, "None", "event_of_default", "all", "pfi"),
    ("EOD-025", 7, "Events of Default", None, "Excessive Performance Points", "PFI-specific: points exceed threshold in rolling period.", None, "None", "event_of_default", "all", "pfi"),
    ("EOD-026", 7, "Events of Default", None, "Failure to exercise termination right", "PFI: failure to terminate concession when required.", None, "None", "event_of_default", "all", "pfi"),
    ("EOD-027", 7, "Events of Default", None, "Judicial review / adverse litigation", "Proceedings that could restrain project performance.", None, "None (MAE)", "event_of_default", "all", "infrastructure"),
    ("EOD-028", 7, "Events of Default", None, "Audit qualification", "Qualified audit on going concern or adverse to creditors.", None, "None (MAE)", "event_of_default", "all", "all"),
    ("EOD-029", 7, "Events of Default", None, "Public sector funding breach", "Government/development agency fails to provide committed funding.", None, "None", "event_of_default", "all", "infrastructure"),
    ("EOD-030", 7, "Events of Default", None, "Licence termination / suspension / modification", "Operating licence terminated, suspended, or adversely modified.", None, "None (MAE)", "event_of_default", "operational", "wbs"),
    ("EOD-031", 7, "Events of Default", None, "Government intervention", "Government displaces management or expropriates >20% of assets.", None, "None", "event_of_default", "all", "all"),
    ("EOD-032", 7, "Events of Default", None, "Intercreditor / Shareholders Agreement breach", "Party to ICA fails to comply; SHA amended adversely.", None, "None (MAE)", "event_of_default", "all", "all"),
    # ── CATEGORY 8: Trigger Events ──
    ("TE-001", 8, "Trigger Events", None, "Financial ratio breach (Trigger Level)", "ACR or DSCR/ICR breaches trigger level.", "semi_annual", None, "potential_default", "all", "wbs"),
    ("TE-002", 8, "Trigger Events", None, "Credit rating downgrade", "Relative (2+ notches) or absolute (below IG).", "event_driven", None, "potential_default", "all", "wbs"),
    ("TE-003", 8, "Trigger Events", None, "Capex Funding Trigger", "Unspent budgeted capex exceeds available funding.", "semi_annual", None, "potential_default", "all", "wbs"),
    ("TE-004", 8, "Trigger Events", None, "Debt Service Funding Trigger", "Estimated DS exceeds available liquidity.", "semi_annual", None, "potential_default", "all", "wbs"),
    ("TE-005", 8, "Trigger Events", None, "Drawdown on Liquidity Facility", "Drawing on standby liquidity.", "event_driven", None, "informational", "all", "wbs"),
    ("TE-006", 8, "Trigger Events", None, "Enforcement Order by Regulator", "Compliance or enforcement order with MAE.", "event_driven", None, "potential_default", "all", "wbs"),
    ("TE-007", 8, "Trigger Events", None, "Notice of licence termination / modification", "Regulator notice with MAE.", "event_driven", None, "potential_default", "all", "wbs"),
    ("TE-008", 8, "Trigger Events", None, "Adverse Government Legislation", "Draft legislation reaching final reading with MAE.", "event_driven", None, "potential_default", "all", "wbs"),
    ("TE-009", 8, "Trigger Events", None, "Inflation-linked hedging exceeds threshold", "Accretions exceed percentage of RAB.", "semi_annual", None, "potential_default", "all", "wbs"),
    ("TE-010", 8, "Trigger Events", None, "Audit qualification", "Qualified audit with MAE.", "event_driven", None, "potential_default", "all", "wbs"),
    # ── CATEGORY 9A: Real Estate ──
    ("RE-001", 9, "Sector-Specific Deliverables", "9A", "Rent Roll", "Detailed tenant schedule with lease terms, rents, expiry dates.", "quarterly", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-002", 9, "Sector-Specific Deliverables", "9A", "Vacancy / Occupancy Report", "Current and forecast occupancy rates.", "quarterly", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-003", 9, "Sector-Specific Deliverables", "9A", "Lease Expiry Schedule", "Forward-looking schedule of lease maturities.", "semi_annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-004", 9, "Sector-Specific Deliverables", "9A", "Tenant Financial Information", "Accounts of material tenants.", "annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-005", 9, "Sector-Specific Deliverables", "9A", "Building Condition Survey", "Independent survey of physical condition.", "annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-006", 9, "Sector-Specific Deliverables", "9A", "Environmental Site Assessment", "Phase I/II environmental assessment.", "event_driven", "Upon acquisition", "informational", "all", "real_estate"),
    ("RE-007", 9, "Sector-Specific Deliverables", "9A", "Planning / Zoning Compliance", "Confirmation of planning permission compliance.", "annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-008", 9, "Sector-Specific Deliverables", "9A", "Service Charge Budget & Accounts", "Budget and reconciliation for multi-tenant properties.", "annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-009", 9, "Sector-Specific Deliverables", "9A", "Head Lease Compliance Certificate", "If property held under a head lease.", "annual", "Per agreement", "informational", "operational", "real_estate"),
    ("RE-010", 9, "Sector-Specific Deliverables", "9A", "Development Monitoring Report", "Progress, costs, timeline vs. plan.", "monthly", "During development", "informational", "construction", "real_estate"),
    # ── CATEGORY 9B: Infrastructure / Project Finance ──
    ("INF-001", 9, "Sector-Specific Deliverables", "9B", "Technical Adviser Report", "Independent technical review of project performance.", "annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-002", 9, "Sector-Specific Deliverables", "9B", "Construction Progress Report", "Cost, schedule, milestones, change orders.", "monthly", "During construction", "informational", "construction", "infrastructure"),
    ("INF-003", 9, "Sector-Specific Deliverables", "9B", "Completion Certificate", "Confirmation of completion / COD.", "one_time", "Upon completion", "informational", "construction", "infrastructure"),
    ("INF-004", 9, "Sector-Specific Deliverables", "9B", "Independent Engineers Certificate", "Certification of physical condition and performance.", "semi_annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-005", 9, "Sector-Specific Deliverables", "9B", "Operating Report", "Operational KPIs, maintenance, defects, marketing.", "quarterly", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-006", 9, "Sector-Specific Deliverables", "9B", "Reserve Account Statement", "DSRA, MRA, and other required account balances.", "quarterly", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-007", 9, "Sector-Specific Deliverables", "9B", "Cash Waterfall / Distribution Calculation", "Detailed cash application per waterfall provisions.", "semi_annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-008", 9, "Sector-Specific Deliverables", "9B", "Concession / Offtake Compliance", "Compliance with concession or offtake terms.", "annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-009", 9, "Sector-Specific Deliverables", "9B", "Lifecycle / Major Maintenance Plan", "Updated long-term maintenance plan.", "annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-010", 9, "Sector-Specific Deliverables", "9B", "Insurance Technical Report", "Insurance adviser report on programme adequacy.", "annual", "30 days pre-renewal", "informational", "all", "infrastructure"),
    ("INF-011", 9, "Sector-Specific Deliverables", "9B", "Demand Study Update", "Traffic, throughput, passenger, or volume forecast.", "annual", "Upon material change", "informational", "operational", "infrastructure"),
    ("INF-012", 9, "Sector-Specific Deliverables", "9B", "Regulatory Compliance Certificate", "Sector-specific regulation compliance.", "annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-013", 9, "Sector-Specific Deliverables", "9B", "Construction Budget", "With revision/approval workflow.", "event_driven", "Per agreement", "informational", "construction", "infrastructure"),
    ("INF-014", 9, "Sector-Specific Deliverables", "9B", "Operating Budget", "With approval workflow. May have auto-approve rules.", "semi_annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-015", 9, "Sector-Specific Deliverables", "9B", "Lifecycle Budget", "Long-term maintenance expenditure plan.", "annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-016", 9, "Sector-Specific Deliverables", "9B", "Asset Management Forward Plan", "Draft + final versions. PFI-specific.", "annual", "Per agreement", "informational", "operational", "pfi"),
    ("INF-017", 9, "Sector-Specific Deliverables", "9B", "Senior Lenders Technical Advisers Report", "Independent adviser report.", "semi_annual", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-018", 9, "Sector-Specific Deliverables", "9B", "Remedial Plan", "Required when performance metrics breach thresholds.", "event_driven", "Upon breach", "potential_default", "operational", "infrastructure"),
    ("INF-019", 9, "Sector-Specific Deliverables", "9B", "Cost Report (Budget vs Actual)", "Detailed breakdown during construction.", "quarterly", "During construction", "informational", "construction", "infrastructure"),
    ("INF-020", 9, "Sector-Specific Deliverables", "9B", "Revenue / Sales Report", "Seat sales, ticket revenue, passenger numbers, traffic volumes.", "monthly", "Per agreement", "informational", "operational", "infrastructure"),
    ("INF-021", 9, "Sector-Specific Deliverables", "9B", "Safety Certification", "Facility-specific safety certification.", "event_driven", "Upon milestone", "informational", "all", "infrastructure"),
    # ── CATEGORY 9C: USPP / Private Placement ──
    ("USPP-001", 9, "Sector-Specific Deliverables", "9C", "Officers Certificate with Covenant Calculations", "Signed by responsible officer with detailed calculations.", "semi_annual", "With financial statements", "potential_default", "all", "uspp"),
    ("USPP-002", 9, "Sector-Specific Deliverables", "9C", "Annual Audited Accounts + Auditors Report", "90-120 days.", "annual", "90-120 days", "event_of_default", "all", "uspp"),
    ("USPP-003", 9, "Sector-Specific Deliverables", "9C", "Quarterly Unaudited Financials", "45-60 days.", "quarterly", "45-60 days", "potential_default", "all", "uspp"),
    ("USPP-004", 9, "Sector-Specific Deliverables", "9C", "Most Favoured Lender Certificate", "If another facility includes more restrictive covenant.", "event_driven", "Upon occurrence", "informational", "all", "uspp"),
    ("USPP-005", 9, "Sector-Specific Deliverables", "9C", "Information Requests", "Noteholder right to request additional information.", "event_driven", "Upon request", "informational", "all", "uspp"),
    ("USPP-006", 9, "Sector-Specific Deliverables", "9C", "Guarantor Accession Documents", "Subsidiary guarantor matching.", "event_driven", "Upon occurrence", "potential_default", "all", "uspp"),
    ("USPP-007", 9, "Sector-Specific Deliverables", "9C", "Amendments / Waivers to Other Facilities", "Notification of material amendments.", "event_driven", "Upon occurrence", "informational", "all", "uspp"),
    ("USPP-008", 9, "Sector-Specific Deliverables", "9C", "Notice of Prepayment", "Minimum 30 days notice with make-whole calculation.", "event_driven", "30 days advance", "informational", "all", "uspp"),
    # ── CATEGORY 10: Agent / Administrative ──
    ("AGT-001", 10, "Agent / Administrative", None, "Lender Commitment Confirmations", "Upon transfer/assignment.", "event_driven", "Upon transfer", "informational", "all", "all"),
    ("AGT-002", 10, "Agent / Administrative", None, "Transfer Certificate / Assignment Agreement", "Secondary trading documentation.", "event_driven", "Upon transfer", "informational", "all", "all"),
    ("AGT-003", 10, "Agent / Administrative", None, "Interest Rate Fixing Notice", "Applicable interest rate notification.", "per_interest_period", "Per interest period", "informational", "all", "all"),
    ("AGT-004", 10, "Agent / Administrative", None, "Utilisation Request", "Drawdown request.", "event_driven", "Upon drawdown", "informational", "all", "all"),
    ("AGT-005", 10, "Agent / Administrative", None, "Prepayment Notice", "Voluntary or mandatory prepayment.", "event_driven", "Per agreement", "informational", "all", "all"),
    ("AGT-006", 10, "Agent / Administrative", None, "Waiver / Amendment Request", "Formal request for waiver or amendment.", "event_driven", "Upon request", "informational", "all", "all"),
    ("AGT-007", 10, "Agent / Administrative", None, "Waiver / Amendment Confirmation", "Confirmation of approval.", "event_driven", "Upon approval", "informational", "all", "all"),
    ("AGT-008", 10, "Agent / Administrative", None, "Lender Voting / Consent Solicitation", "Request for lender consent.", "event_driven", "Upon request", "informational", "all", "all"),
    # ── CATEGORY 11: Distribution Conditions ──
    ("DIST-001", 11, "Distribution Conditions", None, "No Default continuing", "No Event of Default or Potential Event of Default.", "event_driven", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-002", 11, "Distribution Conditions", None, "All Finance Document payments satisfied", "All amounts due have been paid.", "event_driven", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-003", 11, "Distribution Conditions", None, "Revolving facility repaid and undrawn", "Working capital / revolving facilities fully repaid.", "event_driven", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-004", 11, "Distribution Conditions", None, "Reserve accounts fully funded", "DSRA, MRA, and other required reserves at required levels.", "event_driven", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-005", 11, "Distribution Conditions", None, "Financial ratio(s) above distribution threshold", "e.g. DSCR >= 1.35:1. Deal-specific ratio and threshold.", "semi_annual", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-006", 11, "Distribution Conditions", None, "Leverage ratio at or below step-down", "e.g. Net Debt / EBITDA <= schedule.", "semi_annual", "Each distribution date", "potential_default", "operational", "all"),
    ("DIST-007", 11, "Distribution Conditions", None, "No Trigger Event continuing", "WBS: distributions automatically blocked during Trigger Event.", "event_driven", "Each distribution date", "potential_default", "operational", "wbs"),
    ("DIST-008", 11, "Distribution Conditions", None, "Directors / officers certificate delivered", "Certificate confirming all conditions met.", "event_driven", "Each distribution date", "informational", "operational", "all"),
    ("DIST-009", 11, "Distribution Conditions", None, "Distribution within permitted window", "e.g. within 90 days of Calculation Date.", "event_driven", "Each distribution date", "informational", "operational", "all"),
    ("DIST-010", 11, "Distribution Conditions", None, "Other deal-specific conditions", "Catch-all for non-standard conditions.", "event_driven", "Each distribution date", "informational", "operational", "all"),
    # ── CATEGORY 12: Consents & Voting ──
    ("CONS-001", 12, "Consents & Voting Mechanics", "12A", "Majority consent threshold", "Typically 66 2/3% by commitments.", None, None, "informational", "all", "all"),
    ("CONS-002", 12, "Consents & Voting Mechanics", "12A", "All-lender consent matters", "Matters requiring unanimous consent: security, ranking, waterfall, etc.", None, None, "informational", "all", "all"),
    ("CONS-003", 12, "Consents & Voting Mechanics", "12A", "Supermajority threshold", "Sometimes 75% or 90% for specific matters.", None, None, "informational", "all", "all"),
    ("CONS-004", 12, "Consents & Voting Mechanics", "12A", "Voting basis", "By commitment, by number, or by block.", None, None, "informational", "all", "all"),
    ("CONS-005", 12, "Consents & Voting Mechanics", "12A", "Snooze-you-lose provision", "Non-response deemed consent or excluded from denominator.", None, None, "informational", "all", "all"),
    ("CONS-006", 12, "Consents & Voting Mechanics", "12A", "Yank clause", "Borrower can replace non-consenting lender.", None, None, "informational", "all", "all"),
    ("CONS-007", 12, "Consents & Voting Mechanics", "12A", "Standard consent period", "Timeframe for lenders to respond (15-30 BD).", None, None, "informational", "all", "all"),
    ("CONS-008", 12, "Consents & Voting Mechanics", "12A", "Disenfranchisement provisions", "Conditions where lender loses voting rights.", None, None, "informational", "all", "all"),
    # ── CATEGORY 13: Invitations & Engagement ──
    ("INV-001", 13, "Invitations & Engagement", None, "Site visit invitation", "Invitation to visit project site or facility.", "event_driven", None, "informational", "all", "all"),
    ("INV-002", 13, "Invitations & Engagement", None, "Management presentation", "Invitation to borrower management presentation.", "annual", None, "informational", "all", "all"),
    ("INV-003", 13, "Invitations & Engagement", None, "Board observer session", "Where lender has board observer rights.", "event_driven", None, "informational", "all", "all"),
    ("INV-004", 13, "Invitations & Engagement", None, "Social / hospitality event", "Compliance flag if costs exceed threshold.", "event_driven", None, "informational", "all", "all"),
    ("INV-005", 13, "Invitations & Engagement", None, "Bespoke invitation", "Any other engagement invitation.", "event_driven", None, "informational", "all", "all"),
]

# Build SQL
values = []
for i, item in enumerate(ITEMS):
    item_id, cat_num, cat_name, sub_cat, title, desc, freq, deadline, severity, phase, sector = item
    # Escape single quotes
    title = title.replace("'", "''")
    desc = (desc or "").replace("'", "''")
    cat_name = cat_name.replace("'", "''")
    sub_cat_sql = f"'{sub_cat}'" if sub_cat else "NULL"
    freq_sql = f"'{freq}'" if freq else "NULL"
    deadline_sql = f"'{deadline}'" if deadline else "NULL"
    severity_sql = f"'{severity}'" if severity else "NULL"
    phase_sql = f"'{phase}'" if phase else "'all'"
    sector_sql = f"'{sector}'" if sector else "'all'"

    values.append(
        f"('{item_id}', {cat_num}, '{cat_name}', {sub_cat_sql}, '{title}', '{desc}', {freq_sql}, {deadline_sql}, {severity_sql}, {phase_sql}, {sector_sql}, {i+1})"
    )

sql = "INSERT INTO obligation_taxonomy (item_id, category_number, category_name, sub_category, title, description, typical_frequency, typical_deadline, typical_severity, typical_phase, sector_applicability, sort_order) VALUES\n"
sql += ",\n".join(values)
sql += "\nON CONFLICT (item_id) DO NOTHING;"

result = subprocess.run(
    ["docker", "exec", "-i", "docker-postgres-1", "psql", "-U", "sesame", "-d", "sesamestreet"],
    input=sql, capture_output=True, text=True, timeout=30
)
print(result.stdout.strip() if result.stdout else "no output")
if result.stderr:
    err = result.stderr.strip()
    if err and "NOTICE" not in err:
        print("STDERR:", err[-500:])
print(f"\nSeeded {len(ITEMS)} obligation taxonomy items")
