"use client";

import { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────── */

export type TemplateRow = {
  dealSlug: string;
  dealName: string;
  sectorTemplate: string;
  categories: { label: string; key: string; lines: string[] }[];
  totalLines: number;
};

type CashflowRow = {
  n?: number | null;
  row?: string;
  key?: string;
  desc?: string;
  type?: string;
  sub?: string;        // key into template categories
  subLabel?: string;   // human-readable label for the subcategory sheet
  sectors?: string;    // which sectors use this ratio
  divider?: boolean;
  section?: string;
};

/* ── Cashflow model definition ──────────────────────────────────────── */

const CASHFLOW_MODEL: CashflowRow[] = [
  // ── OPERATING CASH FLOW ──
  { section: "Operating Cash Flow" },
  { n: 1, row: "Total Revenue", key: "total_revenue", desc: "Total operating revenue", type: "Computed", sub: "revenue_line_labels", subLabel: "Revenue" },
  { n: 2, row: "Amortisation of Deferred Income", key: "amort_deferred_income", desc: "Amortisation of deferred / pre-paid income", type: "Currency" },
  { n: 3, row: "Total Operating Costs", key: "total_operating_costs", desc: "Total operating costs (negative)", type: "Computed", sub: "cost_line_labels", subLabel: "Operating Costs" },
  { n: 4, row: "Disallowed Costs", key: "disallowed_costs", desc: "Disallowed / corporate costs (WBS structures)", type: "Currency" },
  { n: 5, row: "Exceptional Items", key: "exceptional_items", desc: "Pension contributions, separation costs, etc.", type: "Currency" },
  { n: 6, row: "EBITDA", key: "ebitda", desc: "Revenue + Deferred Income \u2212 Opex \u2212 Disallowed \u2212 Exceptional", type: "Computed" },

  // ── CAPEX ──
  { section: "Capital Expenditure" },
  { n: 7, row: "Capital Expenditure", key: "capital_expenditure", desc: "Total capex (negative)", type: "Computed", sub: "capex_line_labels", subLabel: "Capital Expenditure" },
  { n: 8, row: "Charger / Equipment Replacement", key: "charger_replacement_costs", desc: "Replacement capex for equipment lifecycle", type: "Currency" },

  // ── WORKING CAPITAL & RESERVES ──
  { section: "Working Capital, Reserves & Tax" },
  { n: 9, row: "Working Capital Movement", key: "working_capital_movement", desc: "Change in working capital (receivables, payables, inventory)", type: "Currency" },
  { n: 10, row: "Reserve Account Movements", key: "reserve_account_movements", desc: "DSRA, MRA, TRA, capex reserves, lock-up, escrow, liquidity reserves", type: "Currency" },
  { n: 11, row: "Pre-Finance, Pre-Tax Cash Flow", key: "pre_finance_pre_tax_cf", desc: "EBITDA \u2212 Capex \u00b1 Working Capital \u00b1 Reserves", type: "Computed" },
  { n: 12, row: "Tax Paid", key: "tax_paid", desc: "Corporation tax paid (negative)", type: "Currency" },
  { n: 13, row: "Pre-Finance, Post-Tax Cash Flow", key: "pre_finance_post_tax_cf", desc: "Pre-finance cash flow after tax", type: "Computed" },

  // ── ADDITIONAL SOURCES ──
  { section: "Additional Sources / Income" },
  { n: 14, row: "Interest on Cash Balances", key: "interest_on_cash", desc: "Interest earned on cash balances", type: "Currency" },
  { n: 15, row: "Customer Pre-Payments", key: "customer_prepayment", desc: "Customer pre-payments received", type: "Currency" },
  { n: 16, row: "Grant / Subsidy Income", key: "grant_income", desc: "Government grants or subsidy income", type: "Currency" },

  // ── FUNDING SOURCES ──
  { section: "Funding Sources" },
  { n: 17, row: "Senior Debt Drawdown", key: "senior_debt_drawdown", desc: "Senior debt drawn", type: "Currency" },
  { n: 18, row: "Capex Facility Drawdown", key: "capex_facility_drawdown", desc: "Capex facility drawn (airport / WBS specific)", type: "Currency" },
  { n: 19, row: "Junior / Mezzanine Debt Drawdown", key: "junior_debt_drawdown", desc: "Junior or mezzanine debt drawn", type: "Currency" },
  { n: 20, row: "Shareholder Loan Drawdown", key: "shareholder_loan_drawdown", desc: "Shareholder loan drawn", type: "Currency" },
  { n: 21, row: "Equity Drawdown", key: "equity_drawdown", desc: "Equity injected", type: "Currency" },
  { n: 22, row: "Total Funding", key: "total_funding", desc: "Sum of all funding sources", type: "Computed", sub: "funding_line_labels", subLabel: "Funding / Debt" },

  // ── CFADS ──
  { section: "Cash Available for Debt Service" },
  { n: 23, row: "CFADS", key: "cfads", desc: "Post-tax CF + Additional Sources + Funding", type: "Computed" },

  // ── SENIOR DEBT SERVICE ──
  { section: "Senior Debt Service" },
  { n: 24, row: "Senior Interest", key: "senior_interest", desc: "Senior interest + commitment fees", type: "Currency" },
  { n: 25, row: "Senior Principal (Scheduled)", key: "senior_principal", desc: "Senior principal repayment (scheduled amortisation)", type: "Currency" },
  { n: 26, row: "Senior Principal (Cash Sweep)", key: "senior_principal_sweep", desc: "Cash sweep repayment (excess cash)", type: "Currency" },
  { n: 27, row: "Total Senior Debt Service", key: "senior_debt_service", desc: "Sum of senior interest + principal + sweep", type: "Computed" },
  { n: 28, row: "CF After Senior Debt Service", key: "cf_after_senior_ds", desc: "CFADS \u2212 Senior Debt Service", type: "Computed" },

  // ── JUNIOR DEBT SERVICE ──
  { section: "Junior Debt Service" },
  { n: 29, row: "Junior Interest", key: "junior_interest", desc: "Junior / mezzanine interest", type: "Currency" },
  { n: 30, row: "Junior Principal", key: "junior_principal", desc: "Junior principal repayment", type: "Currency" },
  { n: 31, row: "Total Junior Debt Service", key: "junior_debt_service", desc: "Sum of junior interest + principal", type: "Computed" },

  // ── SHAREHOLDER / INTERCOMPANY ──
  { section: "Shareholder & Intercompany" },
  { n: 32, row: "Shareholder Loan Interest", key: "shareholder_loan_interest", desc: "SHL interest (may capitalise)", type: "Currency" },
  { n: 33, row: "Shareholder Loan Repayment", key: "shareholder_loan_repayment", desc: "SHL principal repayment", type: "Currency" },
  { n: 34, row: "Intercompany Interest (Net)", key: "intercompany_interest_net", desc: "Net intercompany interest income / (expense)", type: "Currency" },

  // ── OTHER FEES ──
  { section: "Other Fees & Costs" },
  { n: 35, row: "Ticking / Commitment Fees", key: "ticking_commitment_fees", desc: "Ticking fees, commitment fees (separate from interest)", type: "Currency" },
  { n: 36, row: "Debt Arrangement Fees", key: "debt_arrangement_fees", desc: "Arrangement / issuance fees", type: "Currency" },
  { n: 37, row: "Liquidity Facility Drawdown", key: "liquidity_facility_drawdown", desc: "Drawdown from liquidity reserves / facilities", type: "Currency" },

  // ── NET CF & CLOSING ──
  { section: "Net Cashflow & Closing" },
  { n: 38, row: "Net Cashflow", key: "net_cashflow", desc: "CF after all debt service, fees and intercompany", type: "Computed" },
  { n: 39, row: "Opening Cash Balance", key: "cash_bf", desc: "Cash balance brought forward", type: "Currency" },
  { n: 40, row: "Distributions", key: "distributions", desc: "Dividends to equity (negative)", type: "Currency", sub: "equity_line_labels", subLabel: "Equity Returns" },
  { n: 41, row: "Share Capital Redemption", key: "share_capital_redemption", desc: "Share capital / preference share redemption", type: "Currency" },
  { n: 42, row: "Closing Cash Balance", key: "cash_cf", desc: "Opening + Net CF \u2212 Distributions \u2212 Redemptions", type: "Computed" },

  // ── COVENANT RATIOS — CORE (all sectors) ──
  { section: "Core Covenant Ratios (all sectors)" },
  { n: 43, row: "Senior DSCR", key: "senior_dscr", desc: "CFADS / Senior Debt Service", type: "Ratio", sectors: "All" },
  { n: 44, row: "Senior Annual DSCR", key: "senior_annual_dscr", desc: "Annualised CFADS / Senior Debt Service", type: "Ratio", sectors: "All" },
  { n: 45, row: "Net Debt / EBITDA", key: "net_debt_ebitda", desc: "Senior Net Debt / EBITDA", type: "Ratio", sectors: "All" },
  { n: 46, row: "Interest Coverage Ratio (ICR)", key: "icr", desc: "EBITDA / Interest Expense", type: "Ratio", sectors: "All" },
  { n: 47, row: "Fixed Charge Coverage Ratio", key: "fccr", desc: "EBITDA / (Interest + Scheduled Principal + Lease Payments)", type: "Ratio", sectors: "All" },

  // ── COVENANT RATIOS — PROJECT FINANCE ──
  { section: "Project Finance Ratios (ports, wind, toll roads, clean tech)" },
  { n: 48, row: "Loan Life Coverage Ratio (LLCR)", key: "llcr", desc: "NPV of projected cash flows to final repayment / Outstanding debt", type: "Ratio", sectors: "Port, Wind, Toll Road, Clean Tech" },
  { n: 49, row: "Project Life Coverage Ratio (PLCR)", key: "plcr", desc: "NPV of projected cash flows over project life / Outstanding debt", type: "Ratio", sectors: "Port, Wind, Toll Road" },

  // ── COVENANT RATIOS — REAL ESTATE ──
  { section: "Real Estate Ratios" },
  { n: 50, row: "Loan-to-Value (LTV)", key: "ltv", desc: "Loan Balance / Appraised Property Value", type: "Ratio", sectors: "Real Estate" },
  { n: 51, row: "Rental Coverage Ratio", key: "rental_coverage", desc: "Net Rental Income / Debt Service", type: "Ratio", sectors: "Real Estate" },
  { n: 52, row: "Debt Yield", key: "debt_yield", desc: "Net Operating Income / Loan Balance", type: "Ratio", sectors: "Real Estate" },

  // ── COVENANT RATIOS — REGULATED UTILITY / WBS ──
  { section: "Regulated Utility / WBS Ratios (airports, utilities)" },
  { n: 53, row: "Net Debt / RAB", key: "net_debt_rab", desc: "Net Senior Debt / Regulated Asset Base (lower is better)", type: "Ratio", sectors: "Airport, Utility" },
  { n: 54, row: "Asset Cover Ratio (ACR)", key: "acr", desc: "Net Debt / RAB trigger & default tiers (WBS structures)", type: "Ratio", sectors: "Airport WBS" },
  { n: 55, row: "Post-Maintenance ICR (PMICR)", key: "pmicr", desc: "(CFADS \u2212 Regulatory Depreciation) / Senior Interest", type: "Ratio", sectors: "Airport, Utility" },
  { n: 56, row: "Senior ICR (Regulatory Dep.)", key: "senior_icr_reg_dep", desc: "EBITDA after regulatory depreciation / Senior interest", type: "Ratio", sectors: "Airport WBS" },
  { n: 57, row: "Senior ICR (2% RAB)", key: "senior_icr_2pct_rab", desc: "EBITDA after 2% synthetic RAB depreciation / Senior interest", type: "Ratio", sectors: "Airport WBS" },
  { n: 58, row: "Class A Net Debt / RAB", key: "class_a_debt_rab", desc: "Class A senior secured debt / RAB", type: "Ratio", sectors: "Airport WBS" },
  { n: 59, row: "Total Debt / RAB", key: "total_debt_rab", desc: "Total (all classes) debt / RAB", type: "Ratio", sectors: "Airport, Utility" },
  { n: 60, row: "Solvency Ratio", key: "solvency_ratio", desc: "Total assets / total liabilities (hard & soft default tiers)", type: "Ratio", sectors: "Airport WBS" },

  // ── COVENANT RATIOS — SOCIAL INFRA / PPP ──
  { section: "Social Infrastructure / PPP Ratios" },
  { n: 61, row: "Annual DSCR (Lock-Up)", key: "annual_dscr_lockup", desc: "Annual CFADS / DS with lock-up tier (typically 1.10x\u20131.20x)", type: "Ratio", sectors: "Social Infra, PPP" },
  { n: 62, row: "Lifecycle Reserve Cover", key: "lifecycle_reserve_cover", desc: "Lifecycle reserve balance / Next 5-year projected lifecycle costs", type: "Ratio", sectors: "Social Infra, PPP" },
  { n: 63, row: "Maintenance Reserve Cover", key: "mra_cover", desc: "MRA balance / Required MRA target", type: "Ratio", sectors: "Social Infra, PPP, Port" },

  // ── SECTOR-SPECIFIC CLASS / RAB RATIOS ──
  { sub: "class_ratio_labels", subLabel: "Class Ratios", divider: true, section: "Additional class-based ratio rows populated from sector template" },
  { sub: "rab_leverage_labels", subLabel: "RAB / Leverage", divider: true, section: "Additional RAB / leverage rows populated from sector template" },

  // ── SECTOR KPIs ──
  { section: "Sector KPIs" },
  { n: null, row: "Sector KPIs", key: "sector_kpis", desc: "Non-financial operating metrics specific to the sector", type: "KPI", sub: "sector_kpi_labels", subLabel: "Sector KPIs" },

  // ── SUPPLEMENTARY P&L ITEMS (non-cash) ──
  { section: "Supplementary P&L Items (non-cash)" },
  { n: 64, row: "EBITDA Margin (%)", key: "ebitda_margin", desc: "EBITDA / Revenue", type: "Ratio" },
  { n: 65, row: "Depreciation", key: "depreciation", desc: "Accounting depreciation (non-cash, P&L only)", type: "Currency" },
  { n: 66, row: "Regulatory Depreciation", key: "regulatory_depreciation", desc: "Regulatory depreciation (RAB-based, WBS specific, non-cash)", type: "Currency" },
  { n: 67, row: "EBIT", key: "ebit", desc: "EBITDA \u2212 Depreciation (P&L measure, not in cashflow)", type: "Computed" },
];

/* ── Reference sector templates ─────────────────────────────────────── */
// These define the standard line items for each sector, shown even when
// no deals of that sector type exist in the portfolio yet.

type RefSectorTemplate = {
  sectorTemplate: string;
  categories: Record<string, string[]>;
};

const REFERENCE_SECTORS: RefSectorTemplate[] = [
  {
    sectorTemplate: "data_centre",
    categories: {
      revenue_line_labels: ["GPU/Compute Revenue", "Colocation Revenue", "Power Recharge", "Connectivity Revenue", "Managed Services", "Storage Revenue", "Edge Services", "Other Revenue"],
      cost_line_labels: ["Power Cost", "Cooling Cost", "Network/Connectivity", "Managed Infrastructure Platform (MIP)", "Facilities Management", "Security & Access", "Insurance", "Land Lease / Rent", "Management Fee", "Marketing & Sales", "General & Admin", "Other Opex"],
      capex_line_labels: ["IT Infrastructure", "Power & Cooling Plant", "Building & Civil Works", "Network Equipment", "Other Capex"],
      funding_line_labels: ["Senior Term Loan Drawdown", "RCF Drawdown"],
      ds_line_labels: ["Senior Interest", "Senior Principal", "Commitment Fee", "Hedge Settlements"],
      equity_line_labels: ["Distributions to Shareholders", "Share Capital Redemption"],
      sector_kpi_labels: ["Contracted Capacity (MW)", "Leased Capacity (%)", "PUE (Power Usage Effectiveness)", "Weighted Average Lease Term (yrs)", "Blended $/kW/month", "GPU Utilisation (%)", "Customer Concentration (top 3 %)", "Availability (% uptime)", "Carbon Intensity (tCO2e/MW)", "Capex per MW Installed"],
    },
  },
  {
    sectorTemplate: "wind_farm",
    categories: {
      revenue_line_labels: ["PPA Revenue (Contracted)", "Merchant Revenue (Spot)", "ROC / CfD Subsidy Income", "Capacity Market Revenue", "Ancillary Services Revenue", "Curtailment Compensation", "Other Revenue"],
      cost_line_labels: ["O&M Contract (Turbine Maintenance)", "Balance of Plant Maintenance", "Power Cost", "Land Lease / Rent", "Insurance (Property & BI)", "Grid Connection Charges", "Management Fee", "General & Admin", "Environmental / Community Obligations", "Other Opex"],
      capex_line_labels: ["Major Component Replacement (Gearbox / Blade)", "Substation & Grid Upgrade", "Access Roads & Foundations", "Other Capex"],
      funding_line_labels: ["Senior Project Finance Drawdown", "Mezzanine Drawdown", "Equity Bridge Loan"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Sculpted)", "Mezzanine Interest", "Hedge Settlements"],
      equity_line_labels: ["Distributions to Equity", "Subordinated Loan Repayment"],
      sector_kpi_labels: ["Installed Capacity (MW)", "P50 Energy Yield (GWh)", "P90 Energy Yield (GWh)", "Capacity Factor (%)", "Availability (%)", "Wind Speed (m/s, hub height)", "Wake Loss (%)", "Curtailment (%)", "PPA Price ($/MWh)", "Remaining Useful Life (yrs)"],
    },
  },
  {
    sectorTemplate: "port",
    categories: {
      revenue_line_labels: ["Container Handling Revenue (TEU)", "Bulk Cargo Revenue", "Vessel Berthing & Pilotage Fees", "Storage & Warehousing Revenue", "Concession Fee Income", "Ancillary / Logistics Revenue", "Other Revenue"],
      cost_line_labels: ["Labour & Stevedoring", "Equipment Maintenance", "Dredging & Marine Maintenance", "Power Cost", "Fuel & Energy", "Insurance", "Concession Fee Payable", "Security & Compliance", "Land Lease / Rent", "Management Fee", "General & Admin", "Other Opex"],
      capex_line_labels: ["Quay & Berth Extension", "Crane & Equipment Acquisition", "Yard & Pavement Works", "IT / Automation Systems", "Environmental / Remediation"],
      funding_line_labels: ["Senior Term Loan Drawdown", "ECA / DFI Facility Drawdown", "Working Capital Facility"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Amortising)", "ECA Interest & Principal", "Commitment Fee"],
      equity_line_labels: ["Distributions to Shareholders", "Concession Equity Return"],
      sector_kpi_labels: ["TEU Capacity", "TEU Volume Actual", "Capacity Utilisation (%)", "Revenue per TEU", "Volume Growth Rate (YoY %)", "Average Vessel Size (TEU)", "Berth Occupancy (%)", "Concession Remaining (yrs)"],
    },
  },
  {
    sectorTemplate: "airport",
    categories: {
      revenue_line_labels: ["Aeronautical Revenue (Tariff per PAX)", "Retail / Commercial Revenue", "Car Parking Revenue", "Property / Real Estate Income", "Cargo Handling Revenue", "Other Non-Aero Revenue", "Other Revenue"],
      cost_line_labels: ["Staff Costs", "Security & Policing", "Maintenance & Facilities", "Utilities (Power, Water)", "Insurance", "Rates & Property Tax", "Management Fee", "Marketing & Route Development", "IT & Systems", "General & Admin", "Other Opex"],
      capex_line_labels: ["Terminal Expansion / Refurbishment", "Runway & Airfield Works", "Retail & Commercial Fit-Out", "IT & Security Systems", "Regulatory / Safety Compliance"],
      funding_line_labels: ["Class A Bond Drawdown", "Class B Bond Drawdown", "Capex Facility Drawdown", "Working Capital Facility"],
      ds_line_labels: ["Class A Interest", "Class A Principal (Scheduled)", "Class B Interest", "Class B Principal", "Capex Facility Interest"],
      equity_line_labels: ["Distributions to Shareholders", "Preference Share Redemption"],
      sector_kpi_labels: ["Traffic (MPPA)", "Traffic Growth Rate (YoY %)", "Tariff per PAX (real)", "Retail Revenue per PAX", "RAB Opening", "RAB Closing", "Allowed vs Actual Capex Variance", "Cost of Capital (Regulatory WACC %)", "X-Factor (RPI +/- X)", "Service Quality Rebate (% of max)"],
      class_ratio_labels: ["Class A DSCR", "Class B DSCR", "Senior ICR (Reg Dep Basis)", "Total ICR"],
      rab_leverage_labels: ["Net Class A Debt / RAB", "Net Senior Debt / RAB", "Total Debt / RAB", "Gross RAB"],
    },
  },
  {
    sectorTemplate: "toll_road",
    categories: {
      revenue_line_labels: ["Toll Revenue (Light Vehicles)", "Toll Revenue (Heavy Vehicles)", "Shadow Toll / Availability Payment", "Ancillary Revenue (Service Areas)", "Congestion / Dynamic Pricing Uplift", "Other Revenue"],
      cost_line_labels: ["Road Maintenance (Routine)", "Major Periodic Maintenance", "Toll Collection & ITS Operations", "Power Cost", "Insurance", "Policing & Incident Response", "Land Lease / Concession Fee", "Management Fee", "General & Admin", "Other Opex"],
      capex_line_labels: ["Pavement Rehabilitation", "Bridge & Structure Works", "Toll System / ITS Upgrade", "Safety & Barrier Works", "Expansion / Lane Addition"],
      funding_line_labels: ["Senior Term Loan Drawdown", "Subordinated Loan Drawdown", "EIB / DFI Facility"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Sculpted)", "Subordinated Interest", "Commitment Fee"],
      equity_line_labels: ["Distributions to Equity", "Concession Equity Return"],
      sector_kpi_labels: ["AADT (Average Annual Daily Traffic)", "Traffic Growth Rate (YoY %)", "Average Toll Rate", "Heavy Vehicle Mix (%)", "Concession Remaining (yrs)", "Road Condition Index", "Lane Availability (%)"],
    },
  },
  {
    sectorTemplate: "social_infrastructure",
    categories: {
      revenue_line_labels: ["Unitary Charge / Availability Payment", "Facilities Management Revenue", "Third Party Revenue", "Energy / Utility Recharge", "Insurance Recovery Income", "Other Revenue"],
      cost_line_labels: ["Hard FM (Building Maintenance)", "Soft FM (Cleaning, Catering, Security)", "Lifecycle / Planned Maintenance", "Power Cost", "Insurance", "SPV Management Fee", "Helpdesk & IT Systems", "General & Admin", "Other Opex"],
      capex_line_labels: ["Lifecycle Replacement (Major Components)", "Enhancement / Variation Works", "Handback Condition Works"],
      funding_line_labels: ["Senior Bond / Loan Drawdown", "EIB Tranche Drawdown", "Subordinated Loan Drawdown"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Amortising)", "EIB Interest & Principal", "Subordinated Interest"],
      equity_line_labels: ["Distributions to Equity", "Subordinated Loan Repayment"],
      sector_kpi_labels: ["Availability (%)", "Deduction Points (Period)", "Payment Mechanism Score", "Service Failure Events", "Lifecycle Fund Balance vs Target", "Contract Remaining (yrs)", "Benchmarking / Market Test Due"],
    },
  },
  {
    sectorTemplate: "real_estate",
    categories: {
      revenue_line_labels: ["Gross Rental Income", "Service Charge Income", "Car Parking Income", "Turnover Rent / Overage", "Surrender Premium / Dilapidations", "Other Property Income", "Other Revenue"],
      cost_line_labels: ["Property Management Fee", "Service Charge Shortfall", "Void Costs / Empty Rates", "Power Cost", "Insurance", "Ground Rent", "Letting & Marketing Costs", "Legal & Professional Fees", "General & Admin", "Other Opex"],
      capex_line_labels: ["Tenant Fit-Out / Incentives", "Building Refurbishment", "Plant & Equipment Replacement", "Sustainability / EPC Upgrade"],
      funding_line_labels: ["Senior Loan Drawdown", "Mezzanine Drawdown", "Development Facility"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Bullet / Amortising)", "Mezzanine Interest", "Hedge Settlements"],
      equity_line_labels: ["Distributions to Shareholders", "Equity Redemption"],
      sector_kpi_labels: ["Occupancy (%)", "WAULT (Weighted Average Unexpired Lease Term)", "ERV (Estimated Rental Value)", "Passing Rent vs ERV (%)", "Cap Rate / Yield (%)", "Valuation", "Lease Expiry Profile (1/3/5 yr)", "Tenant Covenant Strength"],
    },
  },
  {
    sectorTemplate: "clean_tech_hub",
    categories: {
      revenue_line_labels: ["EV Charging Revenue", "Battery Storage Revenue (Arbitrage)", "Grid Services / Frequency Response", "Solar PV Generation Revenue", "Advertising / Retail Revenue", "Fleet Charging Contracts", "Other Revenue"],
      cost_line_labels: ["Electricity Purchase Cost", "Network / Grid Charges", "Equipment Maintenance (Chargers)", "Battery Degradation / Replacement Reserve", "Site Lease / Rent", "Insurance", "Platform & Software Costs", "General & Admin", "Other Opex"],
      capex_line_labels: ["EV Charger Installation", "Battery Storage System", "Solar PV Array", "Grid Connection Upgrade", "Civil & Electrical Works"],
      funding_line_labels: ["Senior Green Loan Drawdown", "Equipment Finance Facility", "Innovation Grant Drawdown"],
      ds_line_labels: ["Senior Interest", "Senior Principal (Sculpted)", "Equipment Finance Repayment", "Commitment Fee"],
      equity_line_labels: ["Distributions to Equity", "Share Capital Redemption"],
      sector_kpi_labels: ["Charging Bay Count", "Battery Capacity (kWh)", "Energy Cost per kWh", "Charger Utilisation (%)", "Charger Replacement Cycle (yrs)", "Grid Connection Capacity (kVA)", "Revenue per Charge Session", "Carbon Offset (tCO2e)"],
    },
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Collect all sector data for a given sub key — merges live deal templates with reference sectors */
function getSectorDataForSub(templates: TemplateRow[], subKey: string) {
  const result: { sectorTemplate: string; deals: string[]; lines: string[]; isReference: boolean }[] = [];
  const seen = new Set<string>();

  // First: live deal templates (grouped by sector)
  const bySector: Record<string, { deals: string[]; lines: string[] }> = {};
  for (const tmpl of templates) {
    const cat = tmpl.categories.find((c) => c.key === subKey);
    if (!cat || cat.lines.length === 0) continue;
    const key = tmpl.sectorTemplate;
    if (!bySector[key]) {
      bySector[key] = { deals: [], lines: cat.lines };
    }
    bySector[key].deals.push(tmpl.dealName);
  }
  for (const [key, val] of Object.entries(bySector)) {
    result.push({ sectorTemplate: key, deals: val.deals, lines: val.lines, isReference: false });
    seen.add(key);
  }

  // Then: reference sectors that aren't already represented by live deals
  for (const ref of REFERENCE_SECTORS) {
    if (seen.has(ref.sectorTemplate)) continue;
    const lines = ref.categories[subKey];
    if (!lines || lines.length === 0) continue;
    result.push({ sectorTemplate: ref.sectorTemplate, deals: [], lines, isReference: true });
  }

  return result;
}

/** Check if any template (live or reference) has data for a given sub key */
function hasSectorData(templates: TemplateRow[], subKey: string): boolean {
  if (templates.some((t) => t.categories.some((c) => c.key === subKey && c.lines.length > 0))) return true;
  return REFERENCE_SECTORS.some((ref) => (ref.categories[subKey]?.length ?? 0) > 0);
}

/* ── Sub-template detail view ────────────────────────────────────────── */

function SubTemplateSheet({
  subKey,
  subLabel,
  parentRow,
  templates,
  onBack,
}: {
  subKey: string;
  subLabel: string;
  parentRow: string;
  templates: TemplateRow[];
  onBack: () => void;
}) {
  const sectorData = getSectorDataForSub(templates, subKey);

  return (
    <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--line)", overflow: "hidden" }}>
      {/* Header with back button */}
      <div
        style={{
          padding: "16px 20px",
          background: "var(--accent-soft)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={onBack}
          className="mini-button subtle"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--line-strong)",
            background: "var(--panel)",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>&larr;</span> Back to cashflow
        </button>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: "1rem" }}>{subLabel} sub-templates</strong>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 2 }}>
            Sector-specific line items that populate <strong>{parentRow}</strong> in the generic cashflow model
          </div>
        </div>
      </div>

      {/* Sector template cards */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        {sectorData.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", color: "var(--ink-soft)", fontSize: "0.88rem" }}>
            No sector templates have been configured for <strong>{subLabel.toLowerCase()}</strong> subcategories yet.
          </div>
        ) : (
          sectorData.map((sector) => (
            <div
              key={sector.sectorTemplate}
              style={{
                borderRadius: 12,
                border: "1px solid var(--line)",
                overflow: "hidden",
              }}
            >
              {/* Sector header */}
              <div
                style={{
                  padding: "12px 16px",
                  background: sector.isReference ? "var(--ink-soft)" : "var(--accent)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ fontSize: "0.9rem", textTransform: "capitalize" }}>
                  {sector.sectorTemplate.replace(/_/g, " ")}
                </strong>
                <span
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  {sector.lines.length} line{sector.lines.length !== 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    marginLeft: "auto",
                    opacity: 0.8,
                  }}
                >
                  {sector.isReference
                    ? "Reference template (no deals in portfolio)"
                    : `Used by: ${sector.deals.join(", ")}`}
                </span>
              </div>

              {/* Line items */}
              <div style={{ padding: "8px 0" }}>
                <div className="jps-table-wrap">
                  <table className="jps-table" style={{ marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: "3rem" }}>#</th>
                        <th>Line item</th>
                        <th style={{ width: "7rem" }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sector.lines.map((line, li) => (
                        <tr key={li}>
                          <td
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.8rem",
                              color: "var(--ink-soft)",
                            }}
                          >
                            {li + 1}
                          </td>
                          <td>{line}</td>
                          <td>
                            <span
                              className={`badge neutral badge-sm`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {subKey === "sector_kpi_labels" ? "KPI" : subKey === "class_ratio_labels" || subKey === "rab_leverage_labels" ? "Ratio" : "Currency"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom back button */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--accent-soft)" }}>
        <button
          onClick={onBack}
          className="mini-button subtle"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--line-strong)",
            background: "var(--panel)",
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>&larr;</span> Back to cashflow
        </button>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export default function FinancialTemplatePreview({ templates }: { templates: TemplateRow[] }) {
  // null = show generic cashflow, string = show sub-template detail for that key
  const [activeSheet, setActiveSheet] = useState<{ subKey: string; subLabel: string; parentRow: string } | null>(null);

  if (activeSheet) {
    return (
      <SubTemplateSheet
        subKey={activeSheet.subKey}
        subLabel={activeSheet.subLabel}
        parentRow={activeSheet.parentRow}
        templates={templates}
        onBack={() => setActiveSheet(null)}
      />
    );
  }

  return (
    <div style={{ borderRadius: "var(--radius-card)", border: "1px solid var(--line)", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", background: "var(--accent-soft)", borderBottom: "1px solid var(--line)" }}>
        <strong style={{ fontSize: "1rem" }}>Generic cashflow model (F.5.2)</strong>
        <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: 2 }}>
          67 standard rows: 42 cashflow lines, 21 covenant ratios across all sectors, and 4 supplementary P&L items.
          Click on rows with <span style={{ color: "var(--accent)", fontWeight: 600 }}>sector subcategories</span> to view the sector-specific line items.
        </div>
      </div>
      <div style={{ padding: "12px 20px" }}>
        <div className="jps-table-wrap">
          <table className="jps-table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Row</th>
                <th>Description</th>
                <th style={{ width: "7rem" }}>Type</th>
                <th style={{ width: "10rem" }}>Sectors</th>
                <th style={{ width: "10rem" }}>Subcategories</th>
              </tr>
            </thead>
            <tbody>
              {CASHFLOW_MODEL.map((item, i) => {
                // Divider rows — only show if they DON'T have a clickable sub, or if they do, only show if data exists
                if (item.divider && !item.sub) {
                  return (
                    <tr key={i} style={{ background: "var(--accent-soft)" }}>
                      <td colSpan={6} style={{ padding: "3px 8px", fontSize: "0.75rem", color: "var(--ink-soft)", fontStyle: "italic" }}>
                        {item.section}
                      </td>
                    </tr>
                  );
                }

                // Divider rows that are also clickable sub-template links (e.g. class_ratio_labels)
                if (item.divider && item.sub) {
                  const hasData = hasSectorData(templates, item.sub);
                  return (
                    <tr
                      key={i}
                      style={{
                        background: "var(--accent-soft)",
                        cursor: hasData ? "pointer" : "default",
                      }}
                      onClick={hasData ? () => setActiveSheet({ subKey: item.sub!, subLabel: item.subLabel!, parentRow: item.section ?? item.subLabel! }) : undefined}
                      onMouseEnter={hasData ? (e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--line)"; } : undefined}
                      onMouseLeave={hasData ? (e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--accent-soft)"; } : undefined}
                    >
                      <td colSpan={6} style={{ padding: "3px 8px", fontSize: "0.75rem", color: hasData ? "var(--accent)" : "var(--ink-soft)", fontStyle: "italic", fontWeight: hasData ? 600 : 400 }}>
                        {hasData ? (
                          <>
                            {item.section} <span style={{ fontSize: "0.85em" }}>&rarr;</span>
                          </>
                        ) : (
                          item.section
                        )}
                      </td>
                    </tr>
                  );
                }

                // Section headers
                if (!item.row) {
                  return (
                    <tr key={i} style={{ background: "var(--accent)", color: "white" }}>
                      <td colSpan={6} style={{ padding: "6px 8px", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {item.section}
                      </td>
                    </tr>
                  );
                }

                // Regular rows — check if clickable
                const isClickable = item.sub && hasSectorData(templates, item.sub);

                return (
                  <tr
                    key={i}
                    style={{ cursor: isClickable ? "pointer" : "default" }}
                    onClick={isClickable ? () => setActiveSheet({ subKey: item.sub!, subLabel: item.subLabel!, parentRow: item.row! }) : undefined}
                    onMouseEnter={isClickable ? (e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--accent-soft)"; } : undefined}
                    onMouseLeave={isClickable ? (e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; } : undefined}
                  >
                    <td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--ink-soft)", textAlign: "center" }}>{item.n ?? ""}</td>
                    <td>
                      <strong style={{ color: isClickable ? "var(--accent)" : undefined }}>
                        {item.row}
                      </strong>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>{item.desc}</td>
                    <td>
                      <span className={`badge ${item.type === "Computed" ? "neutral" : item.type === "Ratio" ? "good" : "neutral"} badge-sm`}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                      {item.sectors ?? ""}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>
                      {item.sub ? (
                        <span
                          style={{
                            color: isClickable ? "var(--accent)" : "var(--ink-soft)",
                            fontWeight: isClickable ? 600 : 400,
                          }}
                        >
                          {isClickable ? (
                            <>View sectors &rarr;</>
                          ) : (
                            <>&rarr; {item.sub.replace(/_/g, " ").replace("labels", "").trim()}</>
                          )}
                        </span>
                      ) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
