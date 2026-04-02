# Moody's Financial Ratio Definitions for Infrastructure & Project Finance

This document defines the financial ratios used in Moody's infrastructure and project finance rating methodologies, with formulas expressed in terms of line items our system can compute.

---

## 1. Core Building Blocks

These are the intermediate cashflow measures from which all ratios are derived.

### FFO — Funds From Operations
Moody's defines FFO as **Cash Flow from Operations (CFO) excluding working capital movements**. It represents the recurring cash-generating ability of the business before investment and financing decisions.

```
FFO = Net Income
    + Depreciation & Amortisation
    + Deferred Tax Movement
    + Other Non-Cash Charges (provisions, impairments, share-based comp)
    - Gains on Asset Sales
    + Losses on Asset Sales
    - Changes in Provisions (from 2024 onwards, excluded from FFO)
```

**Simplified from cashflow statement:**
```
FFO = EBITDA
    - Cash Tax Paid
    - Cash Interest Paid
    + Interest Received
    (i.e. CFO before working capital movements)
```

**Our system mapping:**
```
FFO = ebitda - tax_paid - senior_interest - junior_interest
      - shareholder_loan_interest + interest_on_cash
```

### RCF — Retained Cash Flow
FFO after dividend payments. Measures cash retained in the business to fund capex and repay debt.

```
RCF = FFO - Dividends Paid
```

**Our system mapping:**
```
RCF = FFO - distributions
```

### CFADS — Cash Flow Available for Debt Service
The project finance equivalent of FFO. Defined as cash flow from operations before interest, minus maintenance capex, plus/minus reserve account movements. Moody's explicitly **excludes** DSRA movements from CFADS.

```
CFADS = Operating Cash Flow (before interest)
      - Maintenance Capital Expenditure
      +/- Transfers from/to timing reserves (excluding DSRA)
```

**Our system mapping:**
```
CFADS = ebitda
      - capital_expenditure
      +/- working_capital_movement
      +/- reserve_account_movements (excluding DSRA)
      - tax_paid
      + interest_on_cash
      + grant_income
```
*Note: This is already computed as line_key `cfads` in our cashflow model.*

### Net Debt
```
Net Debt = Total Debt - Cash & Cash Equivalents
```

**Our system mapping:**
```
Net Debt = (drawn amounts from capital_structure_instruments where status = 'active')
         - cash_cf (closing cash balance)
```

### Senior Debt Service
```
Senior DS = Senior Interest + Senior Scheduled Principal
```
*Excludes cash sweeps per Moody's convention.*

**Our system mapping:**
```
Senior DS = senior_interest + senior_principal
```
*Note: `senior_principal_sweep` is excluded.*

---

## 2. Coverage Ratios

### DSCR — Debt Service Coverage Ratio
**Used for:** All project finance, PPP/PFI, infrastructure concessions.

```
DSCR = CFADS / Scheduled Debt Service
```

Denominator is scheduled interest + principal **excluding** cash sweeps.

**Our system mapping:**
```
DSCR = cfads / (senior_interest + senior_principal)
```

| Variant | Formula | Use Case |
|---------|---------|----------|
| **Senior Quarterly DSCR** | Quarterly CFADS / Quarterly Senior DS | Period-by-period monitoring |
| **Senior Annual DSCR** | Rolling 12m CFADS / Rolling 12m Senior DS | Smoothed annual view |
| **Total DSCR** | CFADS / (Senior DS + Junior DS) | Where mezzanine exists |
| **Minimum DSCR** | Lowest future periodic DSCR | Forward-looking stress point |
| **Average DSCR** | Average of all future periodic DSCRs | Through-life capacity |

### ADSCR Break-Even Ratio (PPP/PFI specific)
The percentage by which **all** operating, maintenance and lifecycle costs can increase before DSCR falls to 1.0x.

```
ADSCR Break-Even = (CFADS - Debt Service) / Total Operating & Lifecycle Costs × 100
```

**Our system mapping:**
```
ADSCR Break-Even = (cfads - senior_debt_service) / total_operating_costs × 100
```

### ICR — Interest Coverage Ratio
**Used for:** Corporate-financed infrastructure, ports.

```
ICR = EBITDA / Total Interest Expense
```

**Our system mapping:**
```
ICR = ebitda / (senior_interest + junior_interest + shareholder_loan_interest)
```

### FFO Interest Coverage
**Used for:** Regulated networks.

```
FFO Interest Coverage = (FFO + Interest Expense) / Interest Expense
```

**Our system mapping:**
```
FFO Interest Coverage = (FFO + senior_interest + junior_interest)
                      / (senior_interest + junior_interest)
```

### AICR — Adjusted Interest Coverage Ratio
**Used for:** Regulated networks with building-block regulatory framework.

```
AICR = FFO + (Interest Expense - Non-Cash Accretion) - Capital Charges
     / Interest Expense
```

Where Capital Charges = Regulatory Depreciation (as a proxy for the return of capital element).

**Our system mapping:**
```
AICR = (FFO + senior_interest - regulatory_depreciation) / senior_interest
```

### PMICR — Post-Maintenance Interest Coverage Ratio
**Used for:** Airport WBS, regulated utilities.

```
PMICR = (CFADS - Regulatory Depreciation) / Senior Interest
```

**Our system mapping:**
```
PMICR = (cfads - regulatory_depreciation) / senior_interest
```

### Cash Interest Coverage
**Used for:** Ports (corporate-financed).

```
Cash Interest Coverage = Total Cash Yield / Cash Interest Paid
```

Where Total Cash Yield = Portfolio yield + management fees + other operating income.

**Our system mapping:**
```
Cash Interest Coverage = (total_revenue - total_operating_costs) / senior_interest
```

---

## 3. Leverage Ratios

### FFO / Net Debt
**Used for:** Regulated networks, corporate infrastructure.

```
FFO / Net Debt = FFO / (Total Debt - Cash)
```

**Our system mapping:**
```
FFO / Net Debt = FFO / Net Debt
```

Higher is better. Key thresholds: Baa ~10-18%, A ~18-25%, Aa ~25-30%.

### FFO / Debt
**Used for:** Ports, toll roads (corporate-financed).

```
FFO / Debt = FFO / Total Debt
```

### RCF / Net Debt
**Used for:** Regulated networks.

```
RCF / Net Debt = (FFO - Dividends) / (Total Debt - Cash)
```

**Our system mapping:**
```
RCF / Net Debt = (FFO - distributions) / Net Debt
```

### Net Debt / EBITDA
**Used for:** All sectors.

```
Net Debt / EBITDA = (Total Debt - Cash) / EBITDA
```

**Our system mapping:**
```
Net Debt / EBITDA = Net Debt / ebitda
```

Lower is better.

### Net Debt / RAB
**Used for:** Regulated utilities, airports.

```
Net Debt / RAB = Net Senior Debt / Regulatory Asset Base (closing)
```

**Our system mapping:**
```
Net Debt / RAB = Net Debt / rab_closing
```

Lower is better. Direction = max (ceiling).

---

## 4. Concession / Project Life Ratios

### LLCR — Loan Life Coverage Ratio
**Used for:** Project finance (ports, toll roads, wind farms, clean tech).

```
LLCR = NPV(projected CFADS from now to final debt maturity) / Outstanding Debt
```

The discount rate is typically the weighted average cost of debt.

### PLCR — Project Life Coverage Ratio
**Used for:** Project finance.

```
PLCR = NPV(projected CFADS over entire project/concession life) / Outstanding Debt
```

### CLCR — Concession Life Coverage Ratio
**Used for:** Concession-based projects (ports, toll roads).

```
CLCR = NPV(projected CFADS over concession life) / Outstanding Debt
```

*Note: LLCR, PLCR and CLCR require forward cashflow projections and cannot be computed from a single period's actuals. They are computed from the financial model's forecast case.*

---

## 5. Asset-Based Ratios

### LTV — Loan to Value
**Used for:** Real estate, asset-backed.

```
LTV = Loan Balance / Appraised Property Value
```

Lower is better. Direction = max (ceiling).

### ACR — Asset Cover Ratio
**Used for:** Airport WBS structures.

```
ACR = Net Debt / RAB
```

*Same as Net Debt / RAB but with specific trigger/default tiers in WBS documentation.*

### Solvency Ratio
**Used for:** Airport WBS.

```
Solvency Ratio = Total Assets / Total Liabilities
```

Higher is better. Hard default typically 1.05x, soft default 1.20x.

---

## 6. Moody's Standard Adjustments

When computing these ratios, Moody's applies standard adjustments to the reported financial statements:

| Adjustment | Effect on Debt | Effect on FFO/EBITDA |
|-----------|---------------|---------------------|
| **Operating leases** | Add capitalised lease obligation to debt | Reclassify lease expense: portion to depreciation + interest |
| **Defined benefit pensions** | Add underfunded pension obligation to debt (net of equity credit) | Add pension service cost to operating costs |
| **Hybrid securities** | 50% equity / 50% debt for IG issuers | Reclassify 50% of coupon from interest to dividends |
| **Securitisations** | Add securitised receivables back to debt if recourse exists | |
| **Capitalised interest** | | Reclassify to interest expense |
| **Non-recurring items** | | Exclude from FFO |
| **Provisions (from 2024)** | | Exclude changes in provisions from FFO |

---

## 7. Mapping to Our Line Item Definitions

| Moody's Metric | Our Line Keys | Section |
|----------------|--------------|---------|
| Revenue | total_revenue | operating_cashflow |
| Operating Costs | total_operating_costs | operating_cashflow |
| EBITDA | ebitda | operating_cashflow |
| Depreciation | depreciation | pnl |
| Regulatory Depreciation | regulatory_depreciation | pnl |
| EBIT | ebit | pnl |
| Capex | capital_expenditure | capex |
| Working Capital | working_capital_movement | working_capital |
| Reserve Movements | reserve_account_movements | working_capital |
| Tax | tax_paid | working_capital |
| Interest Income | interest_on_cash | additional_sources |
| CFADS | cfads | cfads |
| Senior Interest | senior_interest | senior_ds |
| Senior Principal | senior_principal | senior_ds |
| Senior DS (total) | senior_debt_service | senior_ds |
| Junior Interest | junior_interest | junior_ds |
| Junior DS (total) | junior_debt_service | junior_ds |
| SHL Interest | shareholder_loan_interest | shareholder_interco |
| Distributions | distributions | net_cashflow |
| Closing Cash | cash_cf | net_cashflow |
| DSRA Balance | dsra_actual | balance_sheet |
| MRA Balance | mra_actual | balance_sheet |
| Total Reserves | total_reserves_actual | balance_sheet |
| Senior DSCR | senior_dscr | covenant_core |
| ICR | icr | covenant_core |
| Net Debt/EBITDA | net_debt_ebitda | covenant_core |
| LLCR | llcr | covenant_project_finance |
| LTV | ltv | covenant_real_estate |
| Net Debt/RAB | net_debt_rab | covenant_regulated |
| ACR | acr | covenant_regulated |
| PMICR | pmicr | covenant_regulated |

---

## 8. Ratios Not Yet in Our System

The following Moody's ratios are referenced in their methodologies but are **not yet defined** as line items:

| Ratio | Formula | Action Needed |
|-------|---------|---------------|
| **FFO** | EBITDA - tax - interest + interest_received | Add as computed line item |
| **RCF** | FFO - distributions | Add as computed line item |
| **FFO / Net Debt** | FFO / Net Debt | Add as computed ratio |
| **RCF / Net Debt** | RCF / Net Debt | Add as computed ratio |
| **FFO Interest Coverage** | (FFO + interest) / interest | Add as computed ratio |
| **AICR** | (FFO + interest - reg_dep) / interest | Add as computed ratio |
| **ADSCR Break-Even** | (CFADS - DS) / opex × 100 | Add as computed ratio |
| **Total DSCR** | CFADS / (senior DS + junior DS) | Add as computed ratio |
| **CLCR** | NPV-based (requires forecast) | Already have LLCR/PLCR slots |

---

## Sources

- [Moody's Regulated Electric and Gas Networks Methodology (April 2022)](https://ratings.moodys.com/api/rmc-documents/386754)
- [Moody's Operational PPP/PFI Methodology (March 2023)](https://ratings.moodys.com/api/rmc-documents/400755)
- [Moody's Privately Managed Ports Methodology (April 2023)](https://ratings.moodys.com/api/rmc-documents/401274)
- [Moody's Privately Managed Toll Roads Methodology (December 2022)](https://ratings.moodys.com/api/rmc-documents/396217)
- [Moody's Standard Adjustments Methodology](https://ratings.moodys.com/api/rmc-documents/69913)
- [Moody's Financial Metrics Platform](https://moodysfm.moodys.com/)

*Note: The full proprietary methodology documents with exact scorecard thresholds are available to Moody's subscribers.*
