# Private Markets Debt Monitoring Platform

## Integrated Reference Document

**Version:** 1.9

**Last Updated:** March 2026

**Status:** Living Document — update as analysis and build progress

**Change Log:**

> • v1.9 — Added rating-based lock-up and trigger events with absolute
> threshold support (e.g. downgrade below IG); completed outlook and
> watch/review fields for all three rating agencies (S&P, Fitch now have
> full outlook/watch alongside Moody's). Added F.2.4 Change of Control
> Regime with permitted transfer whitelist, criteria-based exemptions,
> and CoC consequence types. Expanded F.11 Risk Register to two-layer
> model: Layer 1 standard template plus Layer 2 investment-specific
> risks with sensitivity linkage from IC analysis (stresss parameters,
> ratio impacts under stress, ongoing monitoring against stressed case).
> Added no-hard-covenant proxy: where documentation lacks explicit
> DSCR/ICR event of default (common in US), system records proxy 1.0x
> threshold flagged as payment default proxy.
>
> • v1.8 — Terminology changes: PAM renamed to PM (Portfolio Manager)
> throughout; RAR renamed to ACR (Asset Cover Ratio); all proper nouns
> anonymised (deal names, project names, investor names replaced with
> generic identifiers); EV charging references changed to clean tech.
> Source hierarchy reordered (certificate now ranks above management
> accounts). Added approved auditors field, equity cure regime fields,
> reserve accounts section, invitations record, bespoke catch-all
> categories. Expanded consent/amendment workflow. Added agentic
> workflow evolution note. Performance grading now requires HAM
> approval. Narrative notes require HAM read-and-agree. Anonymised
> aggregation section noted for partner discussion. Lock-up sweep
> parameters added to TopSheet.
>
> • v1.7 — Added Part G: Analytics Overlay (deterministic engines for
> covenant testing, variance, trend detection, grading, portfolio
> aggregation, alerting; covenant categories and test types; ratio
> definitions with composition tags; source hierarchy and
> reconciliation; evidence chain model; Excel-driven rule authoring);
> Added Part H: Web UI & AI Query Interface (10 screen specifications
> with evidence-first UX, AI RAG query interface with guardrails and
> worked examples, REST API schemas, non-functional requirements, phased
> implementation plan, technology recommendations)
>
> • v1.6 — Added D.11 Document Intake Pipeline (end-to-end workflow from
> email receipt through TopSheet update); expanded D.5 with tiered
> automation model (Tier 1 auto-commit, Tier 2 review-then-commit, Tier
> 3 human-led) with tier assignment rules and escalation logic; added
> Narrative Notes data model for borrower commentary attached to data
> points; updated FinancialPeriod entity with approval_tier and
> narrative_notes fields
>
> • v1.5 — Added Part F: TopSheet Data Schema; canonical field
> specification validated against four real financial models (data
> centre, port concession, clean tech, airport WBS); capital structure
> model with enforcement classes, cashflow waterfall, and ratio
> aggregation; sector-specific KPI templates; stress/scenario
> configuration
>
> • v1.4 — Added D.10 Client, Entity & Ownership Model; portfolio
> construction hierarchy (PlatformClient → Organisation → Account →
> Holding → Investment); deal identification and identifiers; portfolio
> view types; data isolation and entitlements
>
> • v1.3 — Added Part E: Risk Register & Assessment Framework; expanded
> deal container with IC workflow, ratings history, internal approvals;
> added Distribution Conditions (Cat 11), Consents & Voting (Cat 12);
> DSCR composition tag; PMICR; CFADS rename; stripped test document
> references
>
> • v1.2 — Added Part D: Data Architecture & Building Blocks (canonical
> model, event taxonomy, anonymised aggregation layer, network effects
> design)
>
> • v1.1 — Added Airport Acquisition Finance (4th deal type), financial
> definitions taxonomy, multi-tier covenant framework
> (lock-up/trigger/default), pro-forma EBITDA adjustments taxonomy

## ABOUT THIS DOCUMENT

This document is the single reference point for our private markets debt
monitoring platform. It serves two audiences:

**For prospective clients and partners:** It shows how we think about
the problem — comprehensively, from first principles, and validated
against real documentation across multiple deal types. The master
deliverables register demonstrates the breadth of our coverage; the
design insights show the depth of our understanding. The data
architecture shows how we build for enterprise-grade robustness while
creating cross-market intelligence that benefits every participant.

**For our technology team:** It provides the taxonomy, data model
implications, and workflow patterns needed to build the system. Every
item in the register maps to a database entity, every workflow pattern
to an event, every design insight to an architecture decision. Part D is
the engineering-facing specification.

The document has eight parts:

> **1. Part A: Master Deliverables & Covenants Register** — the
> comprehensive taxonomy of everything a lender might need to monitor,
> updated with items discovered through real document analysis
>
> **2. Part B: Financial Covenant Framework** — how financial covenants
> work across deal types, and how the system should categorise and
> compare them
>
> **3. Part C: Design Insights from Real Document Analysis** — what we
> learned from analysing real finance agreements across four deal types
> and what it means for the platform build
>
> **4. Part D: Data Architecture & Building Blocks** — the canonical
> data model, event taxonomy, processing layers, anonymised aggregation
> design, deal container structure, and network effects strategy
>
> **5. Part E: Risk Register & Assessment Framework** — standardised
> risk taxonomy for investment analysis, ongoing monitoring, and
> portfolio-level risk aggregation
>
> **6. Part F: TopSheet Data Schema** — the canonical field
> specification for each investment, validated against four real
> financial models, covering capital structure, financial time series,
> ratios, sector KPIs, scenarios, and monitoring status
>
> **7. Part G: Analytics Overlay** — deterministic engines for covenant
> testing, variance analysis, trend detection, grading, portfolio
> aggregation, and alerting, with precise ratio definitions, composition
> tags, and Excel-driven rule authoring
>
> **8. Part H: Web UI, AI Query Interface & Implementation** — screen
> specifications for all platform interfaces, AI-powered TopSheet query
> with RAG and guardrails, REST API contracts, non-functional
> requirements, and phased implementation plan

# PART A: MASTER DELIVERABLES & COVENANTS REGISTER

*This is the master reference list of all potential deliverables,
information undertakings, covenants, and monitoring items that may
appear in private debt documentation (loans, private placements, 144As,
bonds, project finance, WBS). Each deal will have its own subset
selected from this master list.*

## HOW TO USE THIS REGISTER

When a new deal is onboarded, the system's extraction agent reads the
finance documents and maps each obligation to an item in this register.
The assigned portfolio manager reviews and confirms the mapping. The
confirmed subset becomes the deal's **compliance schedule** — the live
list of what's expected, when, and from whom.

Each item is configured per deal with:

| **Attribute** | **Description** |
|---------------|-----------------|

| **Item ID**                  | Unique reference code (e.g. INFO-001)                                 |
|------------------------------|-----------------------------------------------------------------------|
| **Category**                 | Which section of the register this belongs to                         |
| **Applicable (Y/N)**         | Whether this item applies to this specific deal                       |
| **Deliverable / Obligation** | What must be delivered or complied with                               |
| **Responsible Party**        | Who must deliver it (borrower, auditor, agent, adviser, etc.)         |
| **Frequency**                | How often (annual, semi-annual, quarterly, monthly, event-driven)     |
| **Deadline Rule**            | When it is due (e.g. "90 days after fiscal year end")                 |
| **Source Clause**            | Clause reference in the deal's finance documents                      |
| **Grace Period**             | Any cure period before late delivery becomes a default                |
| **Severity if Missed**       | Informational / Potential Default / Event of Default                  |
| **Phase**                    | All / Construction only / Operational only                            |
| **Covenant Tier**            | Normal / Trigger Event / Event of Default (for multi-tier structures) |
| **Depends On**               | If this item's deadline depends on another item's completion          |
| **Auto-Approve Rule**        | If applicable (e.g. "deemed approved if no response within 15 days")  |

## CATEGORY 1: FINANCIAL INFORMATION DELIVERABLES

### 1A: Periodic Financial Statements & Reports

| **ID**   | **Deliverable**                                                                  | **Typical Frequency**                          | **Typical Deadline**                   | **Notes**                                                                                                                                                                                                            |
|----------|----------------------------------------------------------------------------------|------------------------------------------------|----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| INFO-001 | **Audited Annual Financial Statements** (consolidated, if applicable)            | Annual                                         | 90–180 days after FY end               | Must include balance sheet, P&L, cash flow statement, notes. Audited by approved firm. Deadlines observed in practice: 90 days (corporate/USPP), 120 days (WBS/regulated), 180 days (PFI with multiple entities).    |
| INFO-002 | **Unaudited Annual Financial Statements** (placeholder before audited available) | Annual                                         | Shorter deadline than audited          | Sometimes required as interim deliverable.                                                                                                                                                                           |
| INFO-003 | **Semi-Annual / Half-Year Financial Statements** (unaudited, consolidated)       | Semi-annual                                    | 60–90 days after half-year end         | Certified by director or CFO. May include management commentary.                                                                                                                                                     |
| INFO-004 | **Quarterly Management Accounts**                                                | Quarterly                                      | 45–60 days after quarter end           | Unaudited. P&L, balance sheet, sometimes cash flow.                                                                                                                                                                  |
| INFO-005 | **Monthly Management Accounts**                                                  | Monthly                                        | 20–30 days after month end             | Common in infrastructure, project finance, and distressed situations. May be construction-phase only in some PFI deals.                                                                                              |
| INFO-006 | **Annual Budget / Business Plan**                                                | Annual                                         | Before or shortly after FY start       | Forward-looking projections. Key comparison baseline for actuals.                                                                                                                                                    |
| INFO-007 | **Updated Financial Model (Base Case)**                                          | Annual or event-driven                         | Per agreement                          | Critical in project finance. Updated model with revised assumptions and projections. May involve multi-step negotiation between borrower and agent (see Workflow Patterns in Part C).                                |
| INFO-008 | **Capital Expenditure Report / Budget**                                          | Quarterly or annual                            | With management accounts               | Actual capex vs. budgeted. In PFI/infrastructure, may be a standalone deliverable with its own approval workflow.                                                                                                    |
| INFO-009 | **Cash Flow Forecast / Liquidity Report**                                        | Monthly, quarterly, or event-driven            | With management accounts or standalone | Forward-looking cash position.                                                                                                                                                                                       |
| INFO-015 | **Regulatory Accounts**                                                          | Annual                                         | 120 days after regulatory year end     | Specific to regulated utilities (airports, water, energy). Separate from statutory accounts; may have different year-end.                                                                                            |
| INFO-016 | **Projected Excess Cashflow Calculation**                                        | Annual                                         | Before start of financial year         | Forward-looking cash projection. Common in WBS structures for distribution calculations.                                                                                                                             |
| INFO-017 | **Investor Report**                                                              | Semi-annual or quarterly                       | With financial statements              | Public document for bondholders in WBS/bond structures. Includes ratio calculations, narrative update, hedging position, restricted payments. Distinct from Compliance Certificate. Published on designated website. |
| INFO-018 | **Annual Management Presentation**                                               | Annual (or more frequent if Default suspected) | Per agreement                          | Senior management presentation to lenders covering business performance, financial condition, and lender requests. Not a document — track occurrence and log notes.                                                  |

### 1B: Compliance Certificates & Officer's Certificates

| **ID**   | **Deliverable**                        | **Typical Frequency**                                                                        | **Typical Deadline**                  | **Notes**                                                                                                                                                                                                                                                                                                                                                                                                 |
|----------|----------------------------------------|----------------------------------------------------------------------------------------------|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| INFO-010 | **Compliance Certificate**             | With each set of financial statements (semi-annual minimum; quarterly if distributions made) | Delivered with financial statements   | Signed by authorised officer. Certifies: covenant calculations, no Default/Event of Default (or details if continuing), representations remain true. Complexity varies hugely by deal type — from a simple one-page certificate (corporate) to a multi-page document with actual and forecast ratios, recalculation mechanisms, hedging compliance, and restricted payment tracking (WBS/infrastructure). |
| INFO-011 | **Officer's / Director's Certificate** | With each set of financial statements                                                        | With financial statements             | Certifies financials are true and fair. May confirm no material adverse change.                                                                                                                                                                                                                                                                                                                           |
| INFO-012 | **No Default Certificate**             | Annual, semi-annual, or on request                                                           | With financials or upon agent request | Standalone confirmation. In multi-tier structures, must cover both Trigger Events and Events of Default.                                                                                                                                                                                                                                                                                                  |
| INFO-013 | **Borrowing Base Certificate**         | Monthly, quarterly, or upon utilisation                                                      | 15–30 days after period end           | Asset-backed and revolving facilities.                                                                                                                                                                                                                                                                                                                                                                    |
| INFO-014 | **Covenant Cure Notice**               | Event-driven                                                                                 | Within specified period after breach  | Notice of equity cure exercise. Some structures limit cures (e.g. once per financial year).                                                                                                                                                                                                                                                                                                               |

### 1C: Project Finance / Infrastructure Specific Financial Deliverables

| **ID**   | **Deliverable**                               | **Typical Frequency**               | **Typical Deadline**                                | **Notes**                                                                                                                                     |
|----------|-----------------------------------------------|-------------------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| INFO-020 | **Technical Assumptions Notice**              | Annual (each Calculation Date)      | 30–45 Business Days before Calculation Date         | First step of Base Case update chain. Borrower proposes technical assumptions (costs, volumes, timing). Agent reviews with Lenders' Engineer. |
| INFO-021 | **Economic Assumptions Notice**               | Annual (response from Agent)        | 5 Business Days after Technical Assumptions Notice  | Agent's proposed economic assumptions (inflation, interest rates, FX). Borrower reviews.                                                      |
| INFO-022 | **Projected Available Cash Flow Statement**   | Semi-annual (each Calculation Date) | 5 days before Calculation Date                      | Largely actual with last 7 days estimated. Director-certified.                                                                                |
| INFO-023 | **Confirmed Available Cash Flow Statement**   | Semi-annual                         | 30 days after Calculation Date                      | Fully actual. Director-certified. Agent has review/dispute rights.                                                                            |
| INFO-024 | **Cover Ratio Statement**                     | Semi-annual                         | Promptly after Available Cash Flow Statement agreed | Contains DSCR calculation with all constituent elements. Director-signed. Agent has 5 BD dispute period.                                      |
| INFO-025 | **Forecast Assumptions Notice + Certificate** | Per Calculation Date                | Per agreement                                       | Common in PFI. Forecast assumptions for financial model update.                                                                               |

## CATEGORY 2: FINANCIAL COVENANTS (TESTED METRICS)

*These are the metrics extracted from compliance certificates and
financial statements that the system must track, compare, and grade. See
Part B for the analytical framework.*

### 2A: Cash Flow Cover Ratios

*These test whether the borrower can service its debt from
current/projected cash flows.*

| **ID**  | **Covenant / Metric**                                   | **Typical Frequency**       | **Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|---------|---------------------------------------------------------|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| FIN-002 | **Interest Coverage Ratio** (EBITDA / Interest Expense) | Quarterly or semi-annually  | May be "Fixed Charge Coverage" including all fixed charges. In WBS structures, called "Senior ICR".                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| FIN-003 | **Debt Service Coverage Ratio (DSCR)**                  | Semi-annually               | Cashflow Available for Debt Service (CFADS) / total debt service. Standard in project finance and infrastructure. May have both actual and forecast versions tested. **Important:** the system must tag whether the denominator includes scheduled principal repayment (interest_plus_principal — true DSCR for amortising debt) or interest only (interest_only — effectively an ICR, even when labelled "DSCR"). Bullet loan DSCRs with interest-only denominators flatter the borrower by producing the appearance of greater headroom. |
| FIN-008 | **Minimum Revenue / EBITDA**                            | Quarterly or annually       | Absolute floor. Less common but seen in smaller deals.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| FIN-009 | **Cash Sweep / Excess Cash Flow**                       | Annual                      | Percentage of excess cash flow applied to prepay debt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| FIN-014 | **Rental Coverage / Income Cover**                      | Quarterly or upon valuation | Rental income / debt service. Real estate specific.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| FIN-015 | **Forecast DSCR**                                       | Semi-annually               | Forward-looking DSCR from Base Case projections. Breach of forecast ratio can itself be an Event of Default.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| FIN-018 | **Post-Maintenance ICR (PMICR)**                        | Semi-annually               | Cash flow minus regulatory depreciation (typically 2% of RAB/RAV) divided by senior interest. Common in UK regulated utility WBS structures (water, airports). Tests whether the business can service debt AND maintain the regulated asset base.                                                                                                                                                                                                                                                                                          |

### 2B: Collateral / Value Ratios

*These test whether total asset value (or NPV of cash flows) provides
sufficient headroom over debt.*

| **ID**  | **Covenant / Metric**                        | **Typical Frequency**                       | **Notes**                                                                                                                                                                                                               |
|---------|----------------------------------------------|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| FIN-001 | **Leverage Ratio** (Total Net Debt / EBITDA) | Quarterly or semi-annually                  | Most common corporate covenant. Tested on rolling 12-month basis. Variants: Total, Senior, Secured, Net. Answers "how many years of cash generation does it take to repay all the debt?" — a collateral/value question. |
| FIN-004 | **Loan-to-Value (LTV)**                      | Quarterly, semi-annually, or upon valuation | Real estate and asset-backed. Loan balance / appraised value.                                                                                                                                                           |
| FIN-005 | **Minimum Net Worth / Equity**               | Quarterly or annually                       | Absolute floor on net worth/equity. Standard in USPP.                                                                                                                                                                   |
| FIN-006 | **Minimum Liquidity / Cash Balance**         | Monthly or quarterly                        | Minimum cash or available headroom.                                                                                                                                                                                     |
| FIN-012 | **Loan Life Coverage Ratio (LLCR)**          | Semi-annually or annually                   | NPV of projected cash flows to final repayment ÷ outstanding debt. Project finance specific.                                                                                                                            |
| FIN-013 | **Project Life Coverage Ratio (PLCR)**       | Semi-annually or annually                   | NPV of projected cash flows over project life ÷ outstanding debt.                                                                                                                                                       |
| FIN-016 | **Asset Cover Ratio (ACR)**                  | Semi-annually                               | Net Debt ÷ Regulated Asset Base (RAB). WBS/regulated utility specific. Expressed as a ratio where LOWER is better (unlike coverage ratios).                                                                             |
| FIN-017 | **Asset Cover Ratio (ACR)**                  | Semi-annually or upon valuation             | *Placeholder — definition and detailed structure to be added following further document analysis.*                                                                                                                      |

### 2C: Incurrence / Distribution Tests

| **ID**  | **Covenant / Metric**                       | **Typical Frequency** | **Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|---------|---------------------------------------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| FIN-007 | **Maximum Capital Expenditure**             | Annual                | Cap on capex. Tested against budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| FIN-010 | **Debt Incurrence Test**                    | Event-driven          | Pro forma test before additional debt. May require ACR below threshold or DSCR above threshold.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| FIN-011 | **Restricted Payments / Distribution Test** | Event-driven          | Pro forma test before dividends. In WBS structures, distributions are automatically locked up on Trigger Event. Note: "Restricted Payments" is a broader concept than "lock-up" — it covers dividends, management fees, advisory fees, intercompany payments, and any other cash leaving the ring-fenced group. Lock-up is specifically the covenant-driven restriction. In many structures they are equivalent; in leveraged finance, restricted payments may include additional categories. Also sometimes referred to as "no misleading information" when combined with the accuracy representation. |

## CATEGORY 3: NOTIFICATION OBLIGATIONS (EVENT-DRIVEN)

| **ID**    | **Notification**                                      | **Trigger**                                     | **Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|-----------|-------------------------------------------------------|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| NOTIF-001 | **Default / Event of Default notification**           | Upon occurrence or becoming aware               | Steps being taken to remedy. In multi-tier structures, covers both Trigger Events and Events of Default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NOTIF-002 | **Material Adverse Change**                           | Upon occurrence or becoming aware               | Sometimes a separate notification, sometimes embedded in compliance certificate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| NOTIF-003 | **Litigation / Proceedings**                          | Upon institution or threat (material threshold) | Thresholds vary: \>£50K (PFI), \>£100K (project finance), MAE only (WBS/corporate). Includes arbitration and administrative proceedings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NOTIF-004 | **Change of Control**                                 | Upon occurrence or contemplation                | May itself be an Event of Default or a mandatory prepayment trigger. Most documentation includes a change of control regime with: (a) definition of "control" (typically \>50% voting rights, or ability to direct affairs), (b) consequence of change of control (mandatory prepayment offer, event of default, or consent requirement), (c) permitted transfers — a whitelist of approved investors or a set of criteria (e.g. regulated institutional investor, minimum AUM, investment grade credit quality) where an incoming investor meeting these criteria can acquire without triggering the change of control provisions. The system records the full regime including the whitelist/criteria in F.2 deal terms. |
| NOTIF-005 | **Material notices under Project Documents**          | Upon receipt or giving                          | All material notices, including termination notices, warning notices, default notices from counterparties.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NOTIF-006 | **Change of Auditors**                                | Promptly                                        | Consent may be required if not a firm of international standing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| NOTIF-007 | **Change of Accounting Policy**                       | Upon occurrence                                 | Material changes to basis of preparation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| NOTIF-008 | **Loss / Damage to Assets**                           | Upon occurrence (threshold)                     | Thresholds vary: \>£50K (PFI), \>£250K (project finance).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| NOTIF-009 | **Environmental Claim / Incident**                    | Upon becoming aware (MAE threshold)             | Includes claims, inspections, non-compliance, hazardous substance discovery.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| NOTIF-010 | **Insurance Events**                                  | Upon occurrence                                 | Claims, policy changes, damage exceeding threshold, failure to maintain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NOTIF-011 | **Authorisation Changes**                             | Upon occurrence                                 | Loss, suspension, or material modification of licences, permits, consents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NOTIF-012 | **Compensation / Insurance Proceeds receipt**         | Upon receipt                                    | Notification of amounts received.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| NOTIF-013 | **Tax Status Change**                                 | Upon occurrence                                 | Change in tax residence, status, or material tax liability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| NOTIF-014 | **Pension Events**                                    | Promptly upon becoming aware                    | Financial support direction or contribution notice from Pensions Regulator. UK-specific.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| NOTIF-015 | **Regulatory Year-End / FY-End Change**               | 2–3 months advance notice                       | Specific to regulated utilities with separate regulatory and financial years.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| NOTIF-016 | **Website Unavailability**                            | 5+ Business Days                                | Structures using designated website for public disclosure (WBS/bond structures).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| NOTIF-017 | **Emergency**                                         | Upon becoming aware                             | Any emergency event affecting the project or business.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| NOTIF-018 | **Project Suspension / Delay / Abandonment Proposal** | Upon becoming aware                             | Any proposal to suspend, delay, or abandon the project.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| NOTIF-019 | **Project Document Breach / Termination Risk**        | Upon becoming aware                             | Circumstances leading to loss of force, material breach, or counterparty termination right.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| NOTIF-020 | **Warning Notices from Authority / Regulator**        | Upon receipt                                    | In PFI: Warning Notices from concession authority. In WBS: enforcement orders, licence modifications.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| NOTIF-021 | **Performance Threshold Breach**                      | Upon occurrence                                 | PFI-specific: Performance Points exceeding defined thresholds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| NOTIF-022 | **Drawstop Notification**                             | Upon occurrence                                 | Between facilities in multi-tranche structures: notification that a drawstop condition has been triggered.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NOTIF-023 | **Anchor Counterparty Dispute**                       | Upon becoming aware                             | Disputes with key revenue counterparties (e.g. anchor tenants, offtakers, concession grantors).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| NOTIF-024 | **Share Capital / Ownership Changes**                 | Upon occurrence                                 | Issuance, redemption, transfer of shares in obligor group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| NOTIF-025 | **Force Majeure Events**                              | Upon occurrence                                 | Under project documents or operational contracts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| NOTIF-026 | **Credit rating obtained or changed**                 | Promptly                                        | Any credit rating obtained by borrower/parent and any subsequent changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| NOTIF-027 | **Licence change or Government notice**               | Promptly                                        | Any proposed change to operating licence or notice from government authority regarding the licence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| NOTIF-028 | **Circumstances that might have MAE**                 | Promptly                                        | Including government investigations, proceedings, or any circumstance that might have Material Adverse Effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## CATEGORY 4: PERIODIC NON-FINANCIAL DELIVERABLES

| **ID**   | **Deliverable**                             | **Typical Frequency**                  | **Notes**                                                                                |
|----------|---------------------------------------------|----------------------------------------|------------------------------------------------------------------------------------------|
| PERI-001 | **Insurance Certificate / Broker's Report** | Annual (typically 30 days pre-renewal) | Confirms adequacy of insurance programme. May be prepared by Insurance Adviser.          |
| PERI-002 | **Insurance Policy Copies / Summary**       | Annual or upon change                  | Copies of material policies or broker summary of coverage.                               |
| PERI-003 | **Property Valuation**                      | Annual, triennial, or upon request     | Independent valuation. Real estate and asset-backed.                                     |
| PERI-004 | **KYC / AML Refresh**                       | Annual or event-driven                 | Updated know-your-customer information.                                                  |
| PERI-005 | **ESG / Sustainability Report**             | Annual                                 | Increasingly common. May be standalone or part of annual report.                         |
| PERI-006 | **Shareholder Structure / Ownership Chart** | Annual or event-driven                 | Updated organisational chart showing ownership structure.                                |
| PERI-007 | **Board Composition / Director Changes**    | Event-driven                           | Notification of changes to board or senior management.                                   |
| PERI-008 | **Material Contract Summary**               | Annual or event-driven                 | Summary of material contracts entered into or amended.                                   |
| PERI-009 | **Hedging Report**                          | Quarterly or semi-annually             | Mark-to-market, notional amounts, counterparty exposure, compliance with hedging policy. |
| PERI-010 | **Accounts / Reserve Account Statements**   | Quarterly or semi-annually             | Balances in debt service reserve, maintenance reserve, and other required accounts.      |

## CATEGORY 5: AFFIRMATIVE COVENANTS

| **ID**  | **Covenant**                             | **Notes**                                                                             |
|---------|------------------------------------------|---------------------------------------------------------------------------------------|
| AFF-001 | **Comply with laws**                     | Material respects / MAE threshold.                                                    |
| AFF-002 | **Obtain and maintain authorisations**   | All licences, permits, consents needed for business.                                  |
| AFF-003 | **Maintain insurance**                   | Per insurance requirements schedule.                                                  |
| AFF-004 | **Pay taxes**                            | Within permitted time, with good-faith contestation carve-out.                        |
| AFF-005 | **Maintain accounting systems**          | Adequate to produce required reports within required timeframes.                      |
| AFF-006 | **Pari passu ranking**                   | Unsecured claims of creditors rank at least pari passu.                               |
| AFF-007 | **Environmental compliance**             | MAE threshold.                                                                        |
| AFF-008 | **Maintain and perfect security**        | Execute further assurance documents as required.                                      |
| AFF-009 | **Comply with constitutional documents** | Operate in accordance with memorandum and articles.                                   |
| AFF-010 | **Comply with hedging policy**           | Maintain hedging programme per agreed policy. WBS and project finance.                |
| AFF-011 | **Comply with cash management**          | Maintain accounts per cash waterfall / accounts agreement.                            |
| AFF-012 | **Maintain separate bank accounts**      | Separate from non-group entities.                                                     |
| AFF-013 | **Maintain intellectual property**       | Use reasonable endeavours to protect IP rights.                                       |
| AFF-014 | **Retain reputable auditors**            | Consent may be required for changes.                                                  |
| AFF-015 | **Comply with pension obligations**      | Including monitoring of defined benefit scheme risks. UK-specific.                    |
| AFF-016 | **Maintain centre of main interests**    | In specified jurisdiction (typically UK).                                             |
| AFF-017 | **Arm's length transactions**            | All dealings on arm's length terms, with specified carve-outs.                        |
| AFF-018 | **Maintain credit ratings**              | Use reasonable endeavours; cooperate with rating agencies. WBS.                       |
| AFF-019 | **Public procurement compliance**        | For regulated utilities and public sector projects.                                   |
| AFF-020 | **Project implementation**               | Design, construct, operate, maintain per Good Industry Practice. PFI/project finance. |
| AFF-021 | **Maintain sufficient personnel**        | Qualified staff to perform obligations.                                               |
| AFF-022 | **Accuracy of information**              | All information delivered must be true, complete, and accurate.                       |

## CATEGORY 6: NEGATIVE COVENANTS

| **ID**  | **Covenant**                                  | **Notes**                                                                                                   |
|---------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| NEG-001 | **Negative pledge**                           | No security interest other than Permitted Security Interests.                                               |
| NEG-002 | **No disposals**                              | Other than Permitted Disposals.                                                                             |
| NEG-003 | **No additional Financial Indebtedness**      | Other than Permitted FI. May include debt maturity concentration limits (e.g. max 30% of RAB in 24 months). |
| NEG-004 | **No loans or credit support**                | Limits on lending to or guaranteeing third parties.                                                         |
| NEG-005 | **No other business**                         | Restricted to Permitted Business.                                                                           |
| NEG-006 | **No restricted payments / distributions**    | Unless Restricted Payment Condition satisfied. Automatically blocked on Trigger Event in WBS structures.    |
| NEG-007 | **No acquisitions / investments**             | Other than Permitted Acquisitions.                                                                          |
| NEG-008 | **No joint ventures**                         | Unless obligor or Permitted JV.                                                                             |
| NEG-009 | **No mergers / consolidations**               | Without consent.                                                                                            |
| NEG-010 | **No amendment to constitutional documents**  | Without consent, unless no MAE.                                                                             |
| NEG-011 | **No amendment to Project Documents**         | Without Intercreditor Agent consent. PFI/project finance.                                                   |
| NEG-012 | **Share capital restrictions**                | No redemption, no redeemable/convertible issuance.                                                          |
| NEG-013 | **No hedging other than permitted**           | Hedging only per agreed policy and with approved counterparties.                                            |
| NEG-014 | **Expenditure limited to Approved Budget**    | All expenditure within approved line items and amounts.                                                     |
| NEG-015 | **No suspension or abandonment of Project**   | PFI/project finance.                                                                                        |
| NEG-016 | **No new material contracts without consent** | Agent approval for material new contracts.                                                                  |

## CATEGORY 7: EVENTS OF DEFAULT

| **ID**  | **Event of Default**                                | **Typical Grace / Cure**                       | **Notes**                                                                                                  |
|---------|-----------------------------------------------------|------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| EOD-001 | **Non-payment**                                     | 3–7 Business Days (admin/technical error only) | Grace period typically limited to processing errors, not inability to pay.                                 |
| EOD-002 | **Financial covenant breach**                       | Varies: none, 30 days, or equity cure          | Some structures allow equity cure (parent injects equity within 30 days, max 1/year).                      |
| EOD-003 | **Breach of information undertakings**              | 10–30 days (if capable of remedy)              | Failure to deliver financials, compliance certificates, etc.                                               |
| EOD-004 | **Breach of other obligations**                     | 10–30 days (if capable of remedy)              | May not apply to negative pledge, disposals, FI covenants (immediate default).                             |
| EOD-005 | **Misrepresentation**                               | 10–60 days (if capable of remedy)              | Representation incorrect or misleading when made or deemed repeated.                                       |
| EOD-006 | **Cross-default**                                   | None                                           | Threshold amounts vary by deal (£50K to 0.5% of total assets). May be cross-default or cross-acceleration. |
| EOD-007 | **Major Project Party breach**                      | 20 days (PFI); none (MAE threshold)            | Breach by contractor, operator, or other material counterparty.                                            |
| EOD-008 | **Insolvency**                                      | None                                           | Unable to pay debts, value of assets less than liabilities.                                                |
| EOD-009 | **Insolvency proceedings**                          | 7–15 Business Days to discharge                | Carve-outs for frivolous/vexatious proceedings and solvent reorganisations.                                |
| EOD-010 | **Creditors' process**                              | 15 Business Days to discharge                  | Expropriation, attachment, sequestration, execution. Threshold amounts.                                    |
| EOD-011 | **Unlawfulness**                                    | None                                           | Illegal to perform obligations.                                                                            |
| EOD-012 | **Unenforceability**                                | None                                           | Finance Document not effective or alleged ineffective.                                                     |
| EOD-013 | **Security impairment**                             | None                                           | Security ceases to be in force.                                                                            |
| EOD-014 | **Repudiation**                                     | None                                           | Obligor repudiates a Relevant Document.                                                                    |
| EOD-015 | **Cessation of business**                           | 70 days (to replace Major Project Party)       | Borrower, anchor counterparty, or major project party.                                                     |
| EOD-016 | **Change of control**                               | None                                           | May include change of anchor counterparty status (e.g. loss of regulatory recognition).                    |
| EOD-017 | **Loss of material licence / authorisation**        | None (if not replaced or replacement has MAE)  | Regulated businesses and concessions.                                                                      |
| EOD-018 | **Failure to comply with court judgment**           | None (MAE threshold)                           | Final judgment not complied with or paid.                                                                  |
| EOD-019 | **Expropriation / nationalisation**                 | None                                           | Government taking of material assets.                                                                      |
| EOD-020 | **Completion longstop date**                        | None                                           | Project finance: project not completed by backstop date.                                                   |
| EOD-021 | **Project Document impairment**                     | 30 days (to procure substitute)                | Material project document ineffective or abandoned.                                                        |
| EOD-022 | **Force majeure (prolonged)**                       | None                                           | Prolonged force majeure likely to terminate a project document.                                            |
| EOD-023 | **Defects in title**                                | None                                           | Borrower lacks good title to project site / key assets.                                                    |
| EOD-024 | **Excessive Warning Notices**                       | None                                           | PFI-specific: cumulative thresholds over rolling periods.                                                  |
| EOD-025 | **Excessive Performance Points**                    | None                                           | PFI-specific: points exceed threshold in rolling period.                                                   |
| EOD-026 | **Failure to exercise termination right**           | None                                           | PFI-specific: failure to terminate a concession agreement when required.                                   |
| EOD-027 | **Judicial review / adverse litigation**            | None (MAE)                                     | Proceedings that could restrain project performance.                                                       |
| EOD-028 | **Audit qualification**                             | None (MAE)                                     | Qualified audit on going concern, inadequate information, or adverse to creditor interests.                |
| EOD-029 | **Public sector funding breach**                    | None                                           | Government/development agency fails to provide committed funding.                                          |
| EOD-030 | **Licence termination / suspension / modification** | None (MAE)                                     | Operating licence terminated, suspended, or adversely modified.                                            |
| EOD-031 | **Government intervention**                         | None                                           | Government displaces management, curtails authority, or expropriates \>20% of assets/revenues.             |
| EOD-032 | **Intercreditor / Shareholders' Agreement breach**  | None (MAE)                                     | Party to intercreditor agreement fails to comply; shareholders' agreement amended adversely.               |

## CATEGORY 8: TRIGGER EVENTS (MID-TIER COVENANT LEVEL)

*Trigger Events are an intermediate monitoring tier used in WBS and some
infrastructure structures. They sit between "performing" and "default" —
the deal continues, but with consequences.*

| **ID** | **Trigger Event**                                | **Type**     | **Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|--------|--------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| TE-001 | **Financial ratio breach (Trigger Level)**       | Tested       | ACR or DSCR/ICR breaches trigger level (less severe than default level).                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| TE-002 | **Credit rating downgrade**                      | Event-driven | May be defined as: (a) relative — 2+ notches below initial rating by 2+ agencies, or (b) absolute — downgrade below a specified threshold (e.g. below investment grade, below BBB-/Baa3). An absolute threshold (e.g. downgrade below IG) may cause a distribution lock-up, trigger event, or event of default depending on documentation. The system records the configured trigger type and threshold in the TopSheet (F.3.1 rating_trigger\_\* fields) and tests against it whenever an external rating changes. |
| TE-003 | **Capex Funding Trigger**                        | Tested       | Unspent budgeted capex exceeds available funding sources.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| TE-004 | **Debt Service Funding Trigger**                 | Tested       | Estimated debt service exceeds available liquidity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| TE-005 | **Drawdown on Liquidity Facility**               | Event-driven | Drawing on standby liquidity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| TE-006 | **Enforcement Order by Regulator**               | Event-driven | Compliance or enforcement order with MAE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| TE-007 | **Notice of licence termination / modification** | Event-driven | Regulator notice with MAE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| TE-008 | **Adverse Government Legislation**               | Event-driven | Draft legislation reaching final reading with MAE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| TE-009 | **Inflation-linked hedging exceeds threshold**   | Tested       | Accretions exceed percentage of regulated asset base.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| TE-010 | **Audit qualification**                          | Event-driven | Qualified audit with MAE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Trigger Event Consequences (escalating with duration):**

| **Duration**    | **Consequences**                                                                                                                                                     |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Immediate**   | Distributions locked up. No restricted payments.                                                                                                                     |
| **0–12 months** | Additional information on request. Enhanced Investor Report content (additional forecast periods).                                                                   |
| **12+ months**  | Remedial plan required. Independent Review commissioned (at borrower's cost). Security Trustee entitled to consult with regulator. Additional reporting obligations. |

**Trigger Event Remedies:** Each trigger event has specific cure
conditions (e.g. financial ratios come back within limits at next
Calculation Date). Borrower must certify remedy with director's
certificate.

## CATEGORY 9: SECTOR-SPECIFIC DELIVERABLES

### 9A: Real Estate

| **ID** | **Deliverable**                       | **Frequency**                    | **Notes**                                                                      |
|--------|---------------------------------------|----------------------------------|--------------------------------------------------------------------------------|
| RE-001 | **Rent Roll**                         | Quarterly                        | Detailed tenant schedule with lease terms, rents, expiry dates, break options. |
| RE-002 | **Vacancy / Occupancy Report**        | Quarterly                        | Current and forecast occupancy rates.                                          |
| RE-003 | **Lease Expiry Schedule**             | Semi-annually or annually        | Forward-looking schedule of lease maturities.                                  |
| RE-004 | **Tenant Financial Information**      | Annual                           | Accounts of material tenants (if available).                                   |
| RE-005 | **Building Condition Survey**         | Annual or triennial              | Independent survey of physical condition.                                      |
| RE-006 | **Environmental Site Assessment**     | Upon acquisition or event-driven | Phase I/II environmental assessment.                                           |
| RE-007 | **Planning / Zoning Compliance**      | Annual or event-driven           | Confirmation of planning permission compliance.                                |
| RE-008 | **Service Charge Budget & Accounts**  | Annual                           | Budget and reconciliation for multi-tenant properties.                         |
| RE-009 | **Head Lease Compliance Certificate** | Annual                           | If property held under a head lease.                                           |
| RE-010 | **Development Monitoring Report**     | Monthly (during development)     | Progress, costs, timeline vs. plan.                                            |

### 9B: Infrastructure / Project Finance

| **ID**  | **Deliverable**                                | **Frequency**                               | **Notes**                                                                                                                                        |
|---------|------------------------------------------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| INF-001 | **Technical Adviser Report**                   | Annual or semi-annual                       | Independent technical review of project performance, condition, maintenance.                                                                     |
| INF-002 | **Construction Progress Report**               | Monthly (during construction)               | Cost, schedule, milestones, change orders, force majeure, insurance claims, forecast completion date.                                            |
| INF-003 | **Completion Certificate**                     | One-time                                    | Confirmation of completion / commercial operation date.                                                                                          |
| INF-004 | **Independent Engineer's Certificate**         | Semi-annual or annual                       | Certification of physical condition and performance.                                                                                             |
| INF-005 | **Operating Report**                           | Monthly, quarterly, or semi-annual          | Operational KPIs, maintenance, defects, marketing, account balances, disputes, insurance claims. Frequency may be at agent's discretion.         |
| INF-006 | **Reserve Account Statement**                  | Quarterly or semi-annually                  | DSRA, maintenance reserve, and other required account balances.                                                                                  |
| INF-007 | **Cash Waterfall / Distribution Calculation**  | Semi-annually or annually                   | Detailed cash application per waterfall provisions.                                                                                              |
| INF-008 | **Concession / Offtake Compliance**            | Annual                                      | Compliance with concession or offtake terms.                                                                                                     |
| INF-009 | **Lifecycle / Major Maintenance Plan**         | Annual                                      | Updated long-term maintenance plan with cost projections.                                                                                        |
| INF-010 | **Insurance Technical Report**                 | Annual (30 days pre-renewal) + event-driven | Insurance adviser report on adequacy of programme.                                                                                               |
| INF-011 | **Demand Study Update**                        | Annual or upon material change              | Traffic, throughput, passenger, or volume forecast.                                                                                              |
| INF-012 | **Regulatory Compliance Certificate**          | Annual                                      | Sector-specific regulation compliance.                                                                                                           |
| INF-013 | **Construction Budget**                        | Per agreement                               | With revision/approval workflow. May require Intercreditor Agent review.                                                                         |
| INF-014 | **Operating Budget**                           | Semi-annual or annual                       | With approval workflow. May have auto-approve rules (e.g. deemed approved on non-response within 15 days, or if within 95–100% of prior period). |
| INF-015 | **Lifecycle Budget**                           | Annual                                      | Long-term maintenance expenditure plan. Revision workflow similar to operating budget.                                                           |
| INF-016 | **Asset Management Forward Plan**              | Annual                                      | Draft + final versions. Delivered within specified days of submission to Authority. PFI-specific.                                                |
| INF-017 | **Senior Lenders' Technical Adviser's Report** | Semi-annual or annual                       | Independent adviser report. Deadline may depend on borrower's operating report (linked deadline).                                                |
| INF-018 | **Remedial Plan**                              | Event-driven (performance threshold breach) | Required when operational performance metrics exceed defined thresholds.                                                                         |
| INF-019 | **Cost Report (Budget vs Actual)**             | Quarterly (construction phase)              | Detailed breakdown of costs incurred vs. approved budget, with forecast to completion.                                                           |
| INF-020 | **Revenue / Sales Report**                     | Monthly                                     | Seat sales, ticket revenue, passenger numbers, traffic volumes — deal-specific KPI tracking.                                                     |
| INF-021 | **Safety Certification**                       | Event-driven / milestone                    | Facility-specific (e.g. stadium safety certification, operational readiness).                                                                    |

### 9C: Private Placement / USPP Specific

| **ID**   | **Deliverable**                                      | **Frequency**                         | **Notes**                                                       |
|----------|------------------------------------------------------|---------------------------------------|-----------------------------------------------------------------|
| USPP-001 | **Officer's Certificate with Covenant Calculations** | With each set of financial statements | Signed by responsible officer with detailed calculations.       |
| USPP-002 | **Annual Audited Accounts + Auditor's Report**       | Annual                                | 90–120 days.                                                    |
| USPP-003 | **Quarterly Unaudited Financials**                   | Quarterly                             | 45–60 days.                                                     |
| USPP-004 | **Most Favoured Lender Certificate**                 | Event-driven                          | If another facility includes more restrictive covenant.         |
| USPP-005 | **Information Requests**                             | Upon request                          | Noteholder right to request additional information.             |
| USPP-006 | **Guarantor Accession Documents**                    | Event-driven                          | Subsidiary guarantor matching.                                  |
| USPP-007 | **Amendments / Waivers to Other Facilities**         | Event-driven                          | Notification of material amendments to other credit facilities. |
| USPP-008 | **Notice of Prepayment**                             | Event-driven                          | Minimum 30 days notice with make-whole calculation.             |

## CATEGORY 10: AGENT / ADMINISTRATIVE

| **ID**  | **Deliverable**                                 | **Frequency**       | **Notes**                               |
|---------|-------------------------------------------------|---------------------|-----------------------------------------|
| AGT-001 | **Lender Commitment Confirmations**             | Event-driven        | Upon transfer/assignment.               |
| AGT-002 | **Transfer Certificate / Assignment Agreement** | Event-driven        | Secondary trading documentation.        |
| AGT-003 | **Interest Rate Fixing Notice**                 | Per interest period | Applicable interest rate notification.  |
| AGT-004 | **Utilisation Request**                         | Event-driven        | Drawdown request.                       |
| AGT-005 | **Prepayment Notice**                           | Event-driven        | Voluntary or mandatory prepayment.      |
| AGT-006 | **Waiver / Amendment Request**                  | Event-driven        | Formal request for waiver or amendment. |
| AGT-007 | **Waiver / Amendment Confirmation**             | Event-driven        | Confirmation of approval.               |
| AGT-008 | **Lender Voting / Consent Solicitation**        | Event-driven        | Request for lender consent.             |

## CATEGORY 11: DISTRIBUTION CONDITIONS (LOCK-UP FRAMEWORK)

*Distribution conditions (also called Restricted Payment conditions or
Permitted Payment conditions) are the composite set of tests that must
ALL be satisfied before a borrower can make distributions to
shareholders. If any condition fails, cash is trapped in the business
("Lock-up"). These are distinct from financial covenants — breaching a
distribution condition does not trigger default, but it does prevent
equity returns.*

**Per-deal, the system should capture each sub-condition:**

| **ID**   | **Condition**                                       | **Type** | **Notes**                                                                                                     |
|----------|-----------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------------|
| DIST-001 | **No Default continuing**                           | Binary   | No Event of Default or Potential Event of Default.                                                            |
| DIST-002 | **All Finance Document payments satisfied**         | Binary   | All amounts due and payable have been paid.                                                                   |
| DIST-003 | **Revolving facility repaid and undrawn**           | Binary   | Working capital / revolving facilities fully repaid and available.                                            |
| DIST-004 | **Reserve accounts fully funded**                   | Binary   | Debt Service Reserve Account, Maintenance Reserve, and any other required reserves at required levels.        |
| DIST-005 | **Financial ratio(s) above distribution threshold** | Tested   | e.g. DSCR ≥ 1.35:1 (higher than the hard covenant level). The specific ratio and threshold are deal-specific. |
| DIST-006 | **Leverage ratio at or below step-down**            | Tested   | e.g. Net Debt / EBITDA ≤ schedule (common in leveraged loans). Step-down schedule stored per deal.            |
| DIST-007 | **No Trigger Event continuing**                     | Binary   | In WBS structures, distributions are automatically blocked while a Trigger Event is outstanding.              |
| DIST-008 | **Director's / officer's certificate delivered**    | Binary   | Certificate confirming all conditions are met, signed by required number of directors.                        |
| DIST-009 | **Distribution within permitted window**            | Binary   | e.g. within 90 days of Calculation Date.                                                                      |
| DIST-010 | **Other deal-specific conditions**                  | Varies   | Catch-all for non-standard conditions (e.g. regulatory approvals, insurance compliance, pension funding).     |

**System behaviour:**

> • Each sub-condition is evaluated at each potential distribution date
>
> • Overall status: permitted (all pass) or locked_up (any fail, with
> failing condition(s) identified)
>
> • If Lock-up persists for consecutive periods, escalation may apply
> (e.g. Excess Cashflow sweep after 3 consecutive Lock-up periods)
>
> • The system tracks consecutive Lock-up periods and triggers
> additional obligations when duration thresholds are crossed

## CATEGORY 12: CONSENTS & VOTING MECHANICS

*When a borrower requests an amendment, waiver, or consent, the investor
must understand the voting mechanics, respond within the required
timeframe, and protect their rights. This category captures both the
structural provisions (extracted from documentation at deal setup) and
the workflow for processing individual consent requests.*

### 12A: Structural Provisions (Per-Deal, Extracted from Documentation)

| **ID**   | **Provision**                                       | **Notes**                                                                                                                                                                                                                                                                                                                                                     |
|----------|-----------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| CONS-001 | **Majority consent threshold**                      | Typically 66⅔% by commitments. May be simple majority in some structures.                                                                                                                                                                                                                                                                                     |
| CONS-002 | **All-lender consent matters**                      | Matters requiring unanimous consent: typically changes to security, ranking, payment waterfall, interest rate, repayment schedule, tenor, currency. List varies by deal. Particularly important for matching adjustment insurers.                                                                                                                             |
| CONS-003 | **Supermajority threshold (if applicable)**         | Sometimes 75% or 90% for specific matters between majority and all-lender.                                                                                                                                                                                                                                                                                    |
| CONS-004 | **Voting basis**                                    | By commitment amount, by number of lenders, or by block (in multi-tranche / WBS structures where all bonds in a class vote as one block based on majority within that class).                                                                                                                                                                                 |
| CONS-005 | **Snooze-you-lose provision**                       | If a lender does not respond within the consent period, their commitment is either (a) deemed to consent, or (b) excluded from the denominator. **Critical:** where a snooze provision applies, the system must default to issuing a "no" vote instruction if no instructions are received from the HAM, to ensure the capital's voting rights are preserved. |
| CONS-006 | **Yank clause (non-consenting lender replacement)** | Whether the borrower can replace a non-consenting lender. If yes, the system should flag the repayment basis (par, make-whole, market value, other).                                                                                                                                                                                                          |
| CONS-007 | **Standard consent period**                         | The timeframe allowed in the documentation for lenders to respond (e.g. 15, 20, 30 Business Days).                                                                                                                                                                                                                                                            |
| CONS-008 | **Disenfranchisement provisions**                   | Conditions under which a lender loses voting rights (e.g. defaulting lender, affiliate of borrower).                                                                                                                                                                                                                                                          |

### 12B: Consent Request Processing Workflow

When a consent request is received, the system should:

> **1. Log receipt** — classify as consent/amendment/waiver request,
> link to deal
>
> **2. Generate cover note to HAM** containing:

\- Summary of what is being requested (amendment, waiver, security
release, new facility, etc.)

\- Response deadline stated in the request

\- Contractual consent period from documentation (CONS-007) — **flag if
the request provides less time than the documentation allows**

\- Vote type required (majority / all-lender / supermajority) based on
CONS-001 to CONS-003 and the nature of the request

\- Whether snooze-you-lose applies (CONS-005) — if yes, prominently flag
with recommended protective action

\- Whether yank clause applies (CONS-006) — if yes, flag repayment basis

> **3. Track response** — record vote cast, date, and any conditions
>
> **4. Escalate if approaching deadline** — T-5 and T-1 Business Day
> reminders
>
> **5. If snooze provision is active and no instruction received** —
> system generates automatic protective "no" vote instruction for HAM
> approval before deadline

### 12C: Consent History (Per-Deal)

The system should maintain a log of all consent requests per deal:

| **Field**          | **Type**                                                                |                                                                  |
|--------------------|-------------------------------------------------------------------------|------------------------------------------------------------------|
| Request date       | Date                                                                    |                                                                  |
| Request type       | Enum: amendment, waiver, consent, security_release, new_facility, other |                                                                  |
| Description        | Text                                                                    |                                                                  |
| Vote type required | Enum: majority, all_lender, supermajority                               |                                                                  |
| Response deadline  | Date                                                                    |                                                                  |
| Vote cast          | Enum: yes, no, abstain, no_instruction_given                            |                                                                  |
| Outcome            | Enum: approved, rejected, withdrawn, lapsed                             |                                                                  |
| Approved_by        | String                                                                  | Internal approver (HAM/PM/other)                                 |
| Borrower_outcome   | Enum: approved, rejected, withdrawn                                     | Whether the borrower group ultimately approved the consent       |
| Amendment_impact   | Text                                                                    | Summary of documentation changes imposed                         |
| Revised_docs_id    | FK → Document                                                           | Link to consolidated revised documentation if amendment approved |

Where a consent results in an amendment of documentation, a consolidated
"current" state of documentation should be delivered as "revised
documentation" that is saved in the deal container (D.9). Any changes
imposed by the amendment should be recorded in the relevant section of
this register (Part A) and reflected in the TopSheet if data fields are
affected. Changes to Part A items and TopSheet fields following an
amendment should be summarised by the system for the HAM to approve
before being committed.

This data feeds the Market Intelligence Plane as amendment/waiver
frequency — a key behavioural indicator of credit quality trends.

### Category 13: Invitations & Engagement

Records invitations received from borrowers, agents, or other deal
parties. This covers site visits, management presentations, board
observer sessions, and social events.

| **ID**  | **Item**                       | **Frequency**      | **Notes**                                                                                                                                                                                                                                                                                                                                                                 |
|---------|--------------------------------|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| INV-001 | **Site visit invitation**      | Ad hoc             | Invitation to visit project site or operational facility. Record date, location, attendees, outcomes/observations.                                                                                                                                                                                                                                                        |
| INV-002 | **Management presentation**    | Annual or ad hoc   | Invitation to borrower management presentation, results briefing, or strategy update.                                                                                                                                                                                                                                                                                     |
| INV-003 | **Board observer session**     | Per board schedule | Where the lender has board observer rights. Record attendance and key takeaways.                                                                                                                                                                                                                                                                                          |
| INV-004 | **Social / hospitality event** | Ad hoc             | Invitation to sporting events, dinners, conferences, or other hospitality. **Compliance flag:** where costs exceed the organisation's hospitality threshold (configurable per client, e.g. £100), the system flags that the recipient should complete their organisation's compliance workflow. The system can draft a compliance notification for the HAM or PM to send. |
| INV-005 | **Bespoke invitation**         | Ad hoc             | Any other engagement invitation not covered above.                                                                                                                                                                                                                                                                                                                        |

## SUMMARY STATISTICS

| **Category**                            | **Count**                             |
|-----------------------------------------|---------------------------------------|
| 1A: Financial Statements & Reports      | 13                                    |
| 1B: Compliance Certificates             | 5                                     |
| 1C: PF/Infra Financial Deliverables     | 6                                     |
| 2: Financial Covenants (tested metrics) | 20                                    |
| 3: Notification Obligations             | 28                                    |
| 4: Periodic Non-Financial Deliverables  | 10                                    |
| 5: Affirmative Covenants                | 22                                    |
| 6: Negative Covenants                   | 16                                    |
| 7: Events of Default                    | 32                                    |
| 8: Trigger Events (mid-tier)            | 10                                    |
| 9A: Real Estate Specific                | 10                                    |
| 9B: Infrastructure / Project Finance    | 21                                    |
| 9C: USPP / Private Placement            | 8                                     |
| 10: Agent / Administrative              | 8                                     |
| 11: Distribution Conditions             | 10                                    |
| 12: Consents & Voting Mechanics         | 8 structural provisions + workflow    |
| 13: Invitations & Engagement            | Events, meetings, compliance flagging |
| **TOTAL ITEMS**                         | **230+ unique items**                 |

Additionally, Part B defines:

| **Taxonomy**                                   | **Count** |
|------------------------------------------------|-----------|
| Financial Definition Building Blocks (DEF-xxx) | 26        |
| Pro-Forma EBITDA Adjustments (ADJ-xxx)         | 13        |

*Note: A typical leveraged loan will use 50–70 items from the register.
A complex PFI or WBS structure might use 100+. Every deal will use a
selection of the financial definition building blocks depending on how
its covenants are defined.*

*Design note: Each category in the register should be treated as
extensible. Where a deal has an asset-specific or sector-specific
deliverable, covenant, or obligation that does not fit any of the
standard items, it should be recorded as a "bespoke" item within the
relevant category (e.g. FIN-019 Bespoke Financial Covenant, INF-011
Bespoke Infrastructure Deliverable). The system will flag and monitor
bespoke items but does not need a pre-defined processing template for
each one — bespoke items are tracked at the obligation level and
escalated to the HAM for manual assessment.*

# PART B: FINANCIAL COVENANT FRAMEWORK

## The Two Categories of Financial Ratios

Every debt instrument, regardless of deal type, tests headroom through
two fundamental questions:

### Question 1: "Can I pay my debt service as it falls due?"

This is tested by **cash flow cover ratios** — they compare the cash the
business generates in a period against the debt payments due in that
period. If the ratio falls below a threshold, there is insufficient cash
flow to cover debt service.

| **Deal Type**            | **Typical Ratio**                                                                                                                                   | **What It Measures**                                                                                              |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| Corporate leveraged loan | Interest Cover (EBITDA / Interest) or Fixed Charge Cover                                                                                            | Operating profit vs. interest cost                                                                                |
| Project finance          | DSCR (Available Cash Flow / Debt Service)                                                                                                           | Project cash flow vs. interest + principal                                                                        |
| WBS / regulated utility  | Senior ICR (Cash Flow / Senior Interest). May also include PMICR (cash flow minus regulatory depreciation of 2% of RAB, divided by senior interest) | Business cash flow vs. senior interest; PMICR tests whether debt can be serviced while maintaining the asset base |
| Real estate              | Rental Cover (Net Rental Income / Debt Service)                                                                                                     | Rental income vs. debt payments                                                                                   |

### Question 2: "Is the total value of future cash flows (or assets) sufficient to repay all the debt?"

This is tested by **collateral / value ratios** — they compare the total
value of the asset (or NPV of all future cash flows) against the total
outstanding debt. If the ratio breaches, the asset is worth less than
the debt.

| **Deal Type**            | **Typical Ratio**                                  | **What It Measures**                                |
|--------------------------|----------------------------------------------------|-----------------------------------------------------|
| Corporate leveraged loan | Net Leverage (Net Debt / EBITDA)                   | Debt as multiple of annual cash generation          |
| Project finance          | LLCR (NPV of future cash flows / Outstanding Debt) | Present value of all future cash flows vs. all debt |
| WBS / regulated utility  | Senior ACR (Senior Debt / Regulated Asset Base)    | Debt vs. regulated asset value                      |
| Real estate              | LTV (Loan / Appraised Value)                       | Debt vs. property value                             |

### Why This Matters for the Platform

Every financial covenant in the system should be tagged:

> covenant_category: "cash_flow_cover" \| "collateral_value" \|
> "incurrence_test"

This enables:

> • **Portfolio-level dashboards** that show headroom by category across
> all deals, even when the specific ratio names differ
>
> • **Cross-deal comparison** — an airport's ICR and a stadium's DSCR
> are both cash flow cover ratios and can be compared on a headroom
> basis
>
> • **Pattern recognition** — deteriorating cash flow cover across
> multiple deals in the same sector is visible even if the arithmetic
> differs

### Multi-Tier Thresholds

Some structures (particularly WBS) have multiple threshold levels for
the same ratio:

| **Level**                 | **Example (Airport WBS)**    | **System Grade** | **Consequence**                            |
|---------------------------|------------------------------|------------------|--------------------------------------------|
| Comfortable               | ACR \< 0.65, ICR \> 1.60     | Grade 1–2        | Normal monitoring                          |
| Approaching Trigger       | ACR 0.65–0.70, ICR 1.50–1.60 | Grade 2–3        | Amber alert                                |
| **Trigger Event**         | ACR \> 0.70, ICR \< 1.50     | Grade 3          | Distributions locked, additional reporting |
| Between Trigger & Default | ACR 0.70–0.85, ICR 1.10–1.50 | Grade 3–4        | Serious concern                            |
| **Event of Default**      | ACR \> 0.85, ICR \< 1.10     | Grade 4          | Enforcement, equity cure available         |

The system must support **multiple threshold levels per covenant per
deal** — not just pass/fail.

## Multi-Tier Covenant Framework: Lock-Up, Trigger, and Default

Financial covenants don't just have a single pass/fail threshold. In
practice, there are up to three tiers of consequence when a ratio
deteriorates, and the system must track all of them.

### The Three Tiers

| **Tier**                         | **Name**                             | **What Happens**                                                                                                                                                  | **Cure**                                                                                                                       | **Example**                                                                                             |
|----------------------------------|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Tier 1: Distribution Lock-Up** | Lock-Up / Distribution Condition     | Borrower cannot make distributions (dividends, payments to shareholders, subordinated debt service). Cash is trapped in the business.                             | Ratio must recover above lock-up threshold at next test date.                                                                  | Airport Acquisition: DSCR \< 1.35:1 or Net Debt/EBITDA above step-down schedule → no Permitted Payments |
| **Tier 2: Trigger Event**        | Trigger Event / Cash Trap / Remedial | Distributions locked (as Tier 1) PLUS additional obligations: enhanced reporting, remedial plan, potential independent review, potential regulatory consultation. | Specific cure conditions per trigger (e.g. ratio recovers, rating restored). Consequences escalate with duration (12+ months). | Airport WBS: ACR \> 0.70 or ICR \< 1.50 → Trigger Event with escalating consequences                    |
| **Tier 3: Event of Default**     | Event of Default / Hard Default      | Lenders can accelerate the debt, enforce security, appoint receivers. The most severe level.                                                                      | May have equity cure (e.g. parent injects cash within 30 days, max 1/year). Otherwise, requires waiver from lenders.           | Airport WBS: ACR \> 0.85 or ICR \< 1.10 → Loan Event of Default                                         |

### How This Maps Across Deal Types

|                     | **Road PFI**        | **Airport WBS**                                              | **Stadium PF**                                    | **Airport Acquisition**                                                                                  |
|---------------------|---------------------|--------------------------------------------------------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| **Tier 1: Lock-Up** | Not primary feature | Automatic on Trigger Event (no Restricted Payments)          | Not documented in CTA                             | DSCR \< 1.35 AND Net Debt/EBITDA above step-down schedule → no Permitted Payments                        |
| **Tier 2: Trigger** | N/A                 | ACR \> 0.70, ICR \< 1.50 (12 items, escalating consequences) | N/A                                               | DSCR \< 1.25 → Remedial Plan (consult with Agent; if still breached at T+12 months → independent expert) |
| **Tier 3: Default** | Single tier EOD     | ACR \> 0.85, ICR \< 1.10 (equity cure: 30 days, 1/year)      | DSCR \< 1.10, Forecast DSCR \< 1.10, LLCR \< 1.20 | DSCR \< 1.10 → Event of Default                                                                          |

### Airport Acquisition Finance — A Worked Example of the Three-Tier Framework

For example, a €1.135 billion leveraged acquisition of a regulated
airport illustrates the three-tier framework clearly:

**Tier 1 — Distribution Lock-Up (Permitted Payments conditions):**

Distributions to shareholders are only permitted if ALL of the following
are satisfied:

> • All amounts due under Finance Documents have been paid
>
> • No Default continuing
>
> • Revolving facility fully repaid and undrawn
>
> • Debt Service Reserve Account and BSS Reserve Account fully funded
>
> • DSCR ≥ 1.35:1 for the most recent Calculation Period
>
> • Net Debt / Consolidated EBITDA ≤ step-down schedule (9.50x declining
> to 7.50x over 2005–2011)

If ANY condition fails, the borrower is in "Lock-up" — unable to make
Permitted Payments within 90 days of the Calculation Date. If Lock-up
persists for 3 consecutive Calculation Dates, Excess Cashflow is swept
to prepay debt.

**Tier 2 — Remedial Plan (Cl. 22.4):**

If DSCR falls below 1.25:1, the borrower and agent must consult in good
faith to agree a remedial plan. If still below 1.25:1 at the next
Calculation Date (12 months later) and they cannot agree, an independent
expert devises the plan and the borrower must comply.

**Tier 3 — Event of Default (Cl. 22.2):**

If DSCR falls below 1.10:1, it is a hard Event of Default.

**The system must therefore track THREE thresholds for DSCR on this
deal:**

> • ≥ 1.35:1 → Performing, distributions permitted
>
> • \< 1.35:1 but ≥ 1.25:1 → Lock-up (Tier 1)
>
> • \< 1.25:1 but ≥ 1.10:1 → Remedial Plan (Tier 2)
>
> • \< 1.10:1 → Event of Default (Tier 3)

AND a step-down leverage test for distributions:

> • Net Debt / EBITDA ≤ 9.50x (2005), stepping down to 7.50x (2011+)

### System Design: Per-Covenant Threshold Configuration

Each financial covenant in the compliance schedule should store:

> covenant_id: "FIN-003"
>
> covenant_name: "Senior Debt Service Cover Ratio"
>
> covenant_category: "cash_flow_cover"
>
> test_frequency: "semi_annual"
>
> thresholds:
>
> \- tier: "distribution_lockup"
>
> level: 1.35
>
> direction: "minimum" \# breach if BELOW this level
>
> consequence: "No Permitted Payments"
>
> \- tier: "remedial"
>
> level: 1.25
>
> direction: "minimum"
>
> consequence: "Remedial Plan required"
>
> \- tier: "event_of_default"
>
> level: 1.10
>
> direction: "minimum"
>
> consequence: "Hard default, acceleration rights"
>
> step_down_schedule: \# optional, for leverage covenants
>
> \- period: "H1 2005"
>
> level: 9.50
>
> \- period: "H2 2005"
>
> level: 9.50
>
> \- period: "H1 2006"
>
> level: 9.00
>
> \# ... etc

## Financial Definitions Taxonomy

Before you can test a covenant ratio, you need to extract all the
components that feed into it. This is Agent 4's core problem. Below is
the taxonomy of financial building blocks that combine to form covenant
ratios.

### Level 1: Income Statement Building Blocks

| **ID**  | **Definition**                                          | **Typical Source**        | **Notes**                                                                                                                                                  |
|---------|---------------------------------------------------------|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| DEF-001 | **Revenue / Turnover**                                  | P&L, line 1               | Consolidated or entity-level depending on deal.                                                                                                            |
| DEF-002 | **Consolidated EBIT**                                   | P&L (derived)             | Profit from ordinary activities before interest and taxation. Typically excludes exceptionals and extraordinary items.                                     |
| DEF-003 | **Consolidated EBITDA**                                 | P&L (derived)             | EBIT before deducting depreciation and amortisation. **This is the most contested and adjusted definition** — see Pro-Forma Adjustments below.             |
| DEF-004 | **Depreciation & Amortisation**                         | P&L / Cash flow statement | Tangible asset depreciation + intangible asset amortisation.                                                                                               |
| DEF-005 | **Interest Expense / Consolidated Net Finance Charges** | P&L + notes               | Accrued interest, commission, recurring fees, discounts, prepayment penalties. May include/exclude hedging costs. Definition varies significantly by deal. |
| DEF-006 | **Tax Charge / Tax Paid**                               | P&L / Cash flow           | May use accrued (P&L) or cash paid (cash flow statement) depending on definition.                                                                          |
| DEF-007 | **Exceptional / Extraordinary Items**                   | P&L notes                 | Typically excluded from EBIT/EBITDA. Definition of what qualifies varies by deal.                                                                          |

### Level 2: Balance Sheet Building Blocks

| **ID**  | **Definition**                 | **Typical Source**          | **Notes**                                                                                                                                                  |
|---------|--------------------------------|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| DEF-010 | **Total Debt / Borrowings**    | Balance sheet + notes       | All Financial Indebtedness. May include/exclude hedging mark-to-market, lease liabilities, pension deficit.                                                |
| DEF-011 | **Senior Debt**                | Balance sheet + notes       | Debt ranking senior. Excludes subordinated and mezzanine. Definition is deal-specific.                                                                     |
| DEF-012 | **Net Debt**                   | Derived (Debt minus Cash)   | Total Debt less unrestricted cash and cash equivalents. "Cash" definition varies (may exclude restricted accounts, trapped cash in subsidiaries, etc.).    |
| DEF-013 | **Cash and Cash Equivalents**  | Balance sheet               | May exclude restricted cash, amounts in controlled accounts, cash held by non-group entities, amounts above thresholds in subsidiary accounts.             |
| DEF-014 | **Current Assets**             | Balance sheet               | Inventory, trade receivables, sundry debtors. Typically excludes: tax receivables, exceptional items, insurance claims, accrued interest.                  |
| DEF-015 | **Current Liabilities**        | Balance sheet               | Trade creditors, accruals, provisions. Typically excludes: borrowings, finance charges, tax liabilities, exceptional items, declared but unpaid dividends. |
| DEF-016 | **Working Capital**            | Derived                     | Current Assets less Current Liabilities (using the adjusted definitions above).                                                                            |
| DEF-017 | **Net Worth / Equity**         | Balance sheet               | Total equity attributable to shareholders. May deduct intangibles, goodwill, or minority interests.                                                        |
| DEF-018 | **Regulated Asset Base (RAB)** | Regulatory accounts / model | For regulated utilities only. Asset value determined by regulator.                                                                                         |

### Level 3: Cash Flow Building Blocks

| **ID**  | **Definition**                                  | **Typical Source**           | **Notes**                                                                                                                                                                                                                                                                                                                                                                                           |
|---------|-------------------------------------------------|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| DEF-020 | **Cashflow Available for Debt Service (CFADS)** | Derived                      | The cash available to service debt after operating costs. Definition varies significantly by deal. For example, in an acquisition finance structure: EBITDA ± working capital movements ± non-cash items + interest income + dividends from non-consolidated subs − 30% of capex − taxes − pension contributions − DSRA movements. Also referred to as "Available Cash Flow" in some documentation. |
| DEF-021 | **Debt Service**                                | Schedule / model             | Interest + scheduled principal repayments for the relevant period. May include or exclude hedging payments.                                                                                                                                                                                                                                                                                         |
| DEF-022 | **Interest Service Obligations**                | Schedule / model             | Interest and finance charges on Senior Debt only (excluding principal). Used in DSCR where the ratio is Available Cash Flow / Interest Service Obligations.                                                                                                                                                                                                                                         |
| DEF-023 | **Capital Expenditure**                         | Cash flow statement / budget | May be gross or net of grants/receipts. May include or exclude acquisitions. Definition of what counts as capex vs. opex varies.                                                                                                                                                                                                                                                                    |
| DEF-024 | **Excess Cash Flow**                            | Derived                      | Cash remaining after all required payments (debt service, opex, capex, reserve account funding, taxes). May trigger mandatory prepayment or cash sweep.                                                                                                                                                                                                                                             |
| DEF-025 | **Projected / Forecast Available Cash Flow**    | Financial model              | Forward-looking version of Available Cash Flow from the Base Case or financial projections. Used in Forecast DSCR and LLCR calculations.                                                                                                                                                                                                                                                            |
| DEF-026 | **NPV of Projected Cash Flows**                 | Financial model              | Discounted cash flows from Calculation Date to Final Repayment Date (LLCR) or end of project life (PLCR). Discount rate is typically the cost of senior debt.                                                                                                                                                                                                                                       |

### Level 4: How Definitions Combine Into Ratios

| **Ratio**          | **Numerator**                                             | **Denominator**                                       | **Category**     |
|--------------------|-----------------------------------------------------------|-------------------------------------------------------|------------------|
| **Leverage**       | DEF-012 (Net Debt)                                        | DEF-003 (EBITDA)                                      | Collateral/Value |
| **Interest Cover** | DEF-003 (EBITDA)                                          | DEF-005 (Interest Expense)                            | Cash Flow Cover  |
| **DSCR**           | DEF-020 (CFADS)                                           | DEF-021 or DEF-022 (Debt Service or Interest Service) | Cash Flow Cover  |
| **Forecast DSCR**  | DEF-025 (Forecast CFADS)                                  | DEF-021 (Forecast Debt Service)                       | Cash Flow Cover  |
| **LLCR**           | DEF-026 (NPV of Projected Cash Flows to Final Repayment)  | DEF-011 (Outstanding Senior Debt)                     | Collateral/Value |
| **PLCR**           | DEF-026 (NPV of Projected Cash Flows to Project Life End) | DEF-011 (Outstanding Senior Debt)                     | Collateral/Value |
| **LTV**            | DEF-011 (Loan Balance)                                    | Appraised Asset Value                                 | Collateral/Value |
| **Senior ACR**     | DEF-011 (Senior Debt)                                     | DEF-018 (RAB)                                         | Collateral/Value |
| **Senior ICR**     | Available Cash Flow (deal-specific)                       | Senior Interest                                       | Cash Flow Cover  |

### System Design: Store the Components, Not Just the Ratio

When Agent 4 extracts financial data from a compliance certificate, it
should extract **all the component definitions**, not just the final
ratio. This enables:

> • **Reconciliation:** if the borrower says DSCR is 1.45x but the
> components don't reconcile, the system flags it
>
> • **Trend analysis:** understanding whether DSCR improved because
> revenue grew or because capex was deferred
>
> • **Cross-deal comparison:** even if deals define EBITDA differently,
> the underlying components can be compared
>
> • **Audit trail:** every number on the topsheet can be traced back to
> its source

The topsheet JSONB structure for financial data should store:

> {
>
> "period": "H1 2025",
>
> "source_document_id": "DOC-12345",
>
> "extraction_confidence": 0.95,
>
> "components": {
>
> "revenue": 450000000,
>
> "ebitda": 180000000,
>
> "ebitda_adjustments": { ... }, // see Pro-Forma section below
>
> "depreciation": 35000000,
>
> "interest_expense": 42000000,
>
> "tax_paid": 28000000,
>
> "capex": 55000000,
>
> "working_capital_movement": -3000000,
>
> "available_cash_flow": 115000000,
>
> "debt_service": 78000000,
>
> "net_debt": 920000000,
>
> "senior_debt": 750000000,
>
> "cash": 45000000
>
> },
>
> "ratios": {
>
> "dscr": { "value": 1.47, "tier_status": "performing" },
>
> "leverage": { "value": 5.11, "tier_status": "performing" },
>
> "llcr": { "value": 1.35, "tier_status": "performing" }
>
> },
>
> "tier_assessment": {
>
> "distribution_permitted": true,
>
> "trigger_event_active": false,
>
> "default_active": false
>
> }
>
> }

## Pro-Forma EBITDA Adjustments Taxonomy

In leveraged loan documentation, EBITDA is often defined as
"Consolidated EBITDA" subject to a long list of adjustments. These
adjustments can materially change the number and therefore the covenant
headroom. While individual adjustments are not themselves monitored as
covenants, they should be **captured and stored** so they can be
analysed to understand whether the borrower is relying on aggressive
adjustments to meet covenants.

### Common EBITDA Adjustments (Add-Backs)

| **ID**  | **Adjustment**                           | **Description**                                                                                                                                                               | **Risk Level**                                                    |
|---------|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| ADJ-001 | **Exceptional / non-recurring items**    | Items classified as exceptional or non-recurring. The most common and most contested add-back.                                                                                | High — definition of "non-recurring" is subjective                |
| ADJ-002 | **Acquisition costs**                    | Transaction fees, advisor fees, integration costs related to permitted acquisitions.                                                                                          | Medium — usually time-limited                                     |
| ADJ-003 | **Restructuring costs**                  | Redundancy, site closure, reorganisation costs.                                                                                                                               | Medium — should be non-recurring but sometimes become recurring   |
| ADJ-004 | **Non-cash charges**                     | Share-based compensation, impairments, write-downs, provisions.                                                                                                               | Low — these are real economic costs even if non-cash              |
| ADJ-005 | **Pro-forma run-rate adjustments**       | Full-year effect of acquisitions or disposals made part-way through the period, as if they had occurred at the start.                                                         | High — based on projections, not actuals                          |
| ADJ-006 | **Cost savings / synergies (projected)** | Anticipated cost savings from acquisitions or restructuring, not yet realised. Often capped (e.g. max 20% of EBITDA) and time-limited (must be realised within 12–24 months). | Very High — pure projection                                       |
| ADJ-007 | **Sponsor management fees**              | Add back of management/advisory fees paid to financial sponsor.                                                                                                               | Low — straightforward                                             |
| ADJ-008 | **One-off advisory / consulting fees**   | Legal, consulting, advisory fees related to specific transactions.                                                                                                            | Low                                                               |
| ADJ-009 | **Insurance proceeds**                   | Insurance receipts for business interruption or other losses.                                                                                                                 | Medium — depends on whether the underlying loss was also excluded |
| ADJ-010 | **Foreign exchange gains/losses**        | Unrealised FX gains or losses.                                                                                                                                                | Low — standard                                                    |
| ADJ-011 | **Pension adjustments**                  | Difference between cash pension contributions and P&L pension charge.                                                                                                         | Medium                                                            |
| ADJ-012 | **Start-up / pre-opening costs**         | Costs related to new facilities, markets, or products not yet generating revenue.                                                                                             | Medium                                                            |
| ADJ-013 | **Permitted add-back cap**               | Many deals cap the total of certain add-backs as a percentage of EBITDA (e.g. max 15–25% of EBITDA).                                                                          | —                                                                 |

### System Design: Capture Adjustments for Analysis

When Agent 4 extracts EBITDA from a compliance certificate that shows
adjustments, it should store:

> "ebitda_adjustments": {
>
> "reported_ebitda": 180000000,
>
> "adjustments": \[
>
> { "id": "ADJ-001", "description": "Non-recurring restructuring",
> "amount": 12000000 },
>
> { "id": "ADJ-005", "description": "Pro-forma for Widget acquisition (4
> months)", "amount": 8000000 },
>
> { "id": "ADJ-006", "description": "Projected synergies", "amount":
> 5000000, "cap_applies": true }
>
> \],
>
> "total_adjustments": 25000000,
>
> "adjusted_ebitda": 205000000,
>
> "adjustments_as_pct_of_ebitda": 13.9,
>
> "cap_limit_pct": 20.0,
>
> "cap_headroom_pct": 6.1
>
> }

This data is not used for covenant testing (the adjusted EBITDA is) but
it enables:

> • **Adjustment trend analysis:** Is the borrower increasingly reliant
> on add-backs to meet covenants?
>
> • **Cross-deal comparison:** Which portfolio companies have the most
> aggressive EBITDA definitions?
>
> • **Early warning:** A deal where adjustments represent \>20% of
> EBITDA and are growing deserves closer attention, even if covenants
> are technically passing
>
> • **Cap monitoring:** If adjustments are approaching the permitted
> cap, the borrower is running out of room

**V2 Feature — Accounting EBITDA vs Adjusted EBITDA Reconciliation:**

When audited accounts are received and processed (in addition to the
compliance certificate), the system should extract the
statutory/accounting EBITDA from the accounts and automatically
reconcile it against the adjusted EBITDA from the compliance
certificate. The bridge between them — each individual add-back — is
where the most important analytical information lives. The system should
flag: (a) if total adjustments as a percentage of accounting EBITDA are
above a configurable threshold, (b) if the gap between accounting and
adjusted EBITDA is widening period-on-period, and (c) if specific
adjustment categories (e.g. synergies, pro-forma) are growing while
underlying accounting EBITDA is flat or declining.

# PART C: DESIGN INSIGHTS FROM REAL DOCUMENT ANALYSIS

*These insights are derived from analysis of real finance agreements
across different deal types. They directly inform the platform's
architecture and build priorities.*

## Cross-Deal Comparison

*The following comparison illustrates how the same fundamental
monitoring requirements manifest differently across four deal structures
commonly encountered in private credit portfolios.*

|                            | **Road PFI**                                           | **Airport WBS**                                                                   | **Stadium PF**                                                                         | **Airport Acquisition**                                                                                                   |
|----------------------------|--------------------------------------------------------|-----------------------------------------------------------------------------------|----------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| **Structure**              | PFI concession                                         | Whole business securitisation                                                     | Project finance (design, build, operate)                                               | Leveraged acquisition finance                                                                                             |
| **Borrower**               | Single-purpose SPV                                     | Operating company (regulated utility)                                             | Single-purpose SPV                                                                     | Operating company (regulated airport)                                                                                     |
| **Lenders**                | Development bank + commercial syndicate                | Bondholders + revolving bank facility                                             | Senior bank syndicate + subordinated senior                                            | Mandated lead arrangers + syndicate                                                                                       |
| **Phases**                 | Construction + Operational                             | Single ongoing                                                                    | Construction + Operational                                                             | Single ongoing (post-acquisition)                                                                                         |
| **Cash flow ratio**        | DSCR                                                   | Senior ICR                                                                        | DSCR + Forecast DSCR                                                                   | Senior DSCR (CFADS / Interest Service Obligations)                                                                        |
| **Collateral ratio**       | LLCR                                                   | Senior ACR                                                                        | LLCR                                                                                   | Net Debt / Consolidated EBITDA (leveraged loan style)                                                                     |
| **Covenant tiers**         | Single (EOD)                                           | Two (Trigger Event + EOD)                                                         | Single (EOD)                                                                           | Three (Lock-Up + Remedial + EOD)                                                                                          |
| **DSCR/ICR default**       | Per CTA                                                | ICR \< 1.10                                                                       | DSCR \< 1.10                                                                           | DSCR \< 1.10                                                                                                              |
| **Lock-up level**          | —                                                      | Automatic on Trigger Event                                                        | —                                                                                      | DSCR \< 1.35 AND leverage above step-down                                                                                 |
| **Remedial level**         | —                                                      | Trigger: ICR \< 1.50                                                              | —                                                                                      | DSCR \< 1.25                                                                                                              |
| **Equity cure**            | No                                                     | Yes (30 days, 1/year)                                                             | No                                                                                     | No                                                                                                                        |
| **Audited accounts**       | 180 days                                               | 120 days                                                                          | 90 days                                                                                | 180 days                                                                                                                  |
| **Management accounts**    | Monthly (construction)                                 | Semi-annual                                                                       | Monthly (all phases)                                                                   | Semi-annual + unaudited annual at 90 days                                                                                 |
| **Budget / business plan** | Multi-step interactive                                 | Capex budget only                                                                 | Multi-step interactive                                                                 | Annual business plan within 60 days of FY end                                                                             |
| **Compliance certificate** | No Default cert                                        | Detailed (actual + forecast ratios, hedging, restricted payments)                 | Director-signed Cover Ratio Statement                                                  | Semi-annual, signed by 2 directors; annual version reported on by Auditors                                                |
| **Leverage covenant**      | N/A                                                    | N/A                                                                               | N/A                                                                                    | Net Debt / EBITDA step-down (distribution condition, not hard covenant)                                                   |
| **Excess cash flow sweep** | N/A                                                    | N/A                                                                               | N/A                                                                                    | Yes: after Excess Cashflow Event or 3 consecutive Lock-up periods                                                         |
| **Annual presentation**    | Not specified                                          | Not specified                                                                     | Not specified                                                                          | Yes: annual management presentation to lenders                                                                            |
| **Unique features**        | Performance Points, Warning Notices, phase transitions | Distribution lock-up on Trigger Event, rating agency tracking, regulatory overlay | Seat sales monitoring, safety certification, completion longstop, anchor tenant status | Lock-up → remedial → default three-tier, leverage step-down, excess cashflow sweep, sponsor structure, Licence monitoring |

### What Leveraged Acquisition Finance Adds

The leveraged acquisition structure is the most common deal type in a
typical private credit portfolio. Key observations:

**1. Leverage Ratio as Distribution Condition (Not Hard Covenant)**

The Net Debt / Consolidated EBITDA test is not a financial covenant that
triggers default if breached. Instead, it is a **condition for
distributions** — the borrower cannot pay dividends unless leverage is
at or below a step-down schedule. This is a common leveraged loan
pattern. The system must distinguish between ratios that are hard
covenants (breach = default) and ratios that are distribution conditions
(breach = lock-up only).

**2. EBITDA Definitions Matter**

Consolidated EBITDA is defined as Consolidated EBIT plus depreciation
and amortisation, where EBIT excludes exceptionals and extraordinary
items and deducts minority interests. Available Cashflow is then derived
from EBITDA with 10 specific adjustments (working capital, non-cash
items, dividends from non-consolidated subs, 30% of capex, taxes,
pension contributions, DSRA movements, etc.). Every deal defines this
differently — hence the financial definitions taxonomy in Part B.

**3. Excess Cashflow Sweep Triggered by Lock-Up Duration**

If the borrower is in Lock-up for 3 consecutive Calculation Dates,
Excess Cashflow must be swept to prepay debt. This is a
duration-dependent escalation mechanism similar to the Airport WBS
Trigger Event escalation. The system must track consecutive Lock-up
periods.

**4. Remedial Plan as Intermediate Tier**

DSCR between 1.10 and 1.25 triggers a good-faith consultation with the
Agent to agree a remedial plan. If still below 1.25 at the next annual
test (12 months later), an independent expert devises the plan and the
borrower must comply. This is a structured middle tier between lock-up
and default.

**5. Annual Management Presentation**

The borrower's senior management must give an annual presentation to
lenders covering business performance, financial condition, and any
matters lenders request. More frequent presentations required if the
Agent suspects a Default. This is a qualitative monitoring touchpoint
not captured in the original register.

**6. Litigation Threshold in EUR**

Material litigation threshold is €5,000,000. The system must store
threshold amounts in the deal's currency, not assume GBP.

**7. Belgian Government as Shareholder and Regulator**

The Belgian Government is both a shareholder and the Licence grantor.
Changes to the Licence or notices from the Government are notification
obligations. Licence termination, suspension, or adverse modification is
an Event of Default. Government intervention (management displacement,
expropriation) is a separate EOD.

## Insight 1: Phase-Dependent Monitoring

PFI and project finance deals have fundamentally different monitoring
requirements during construction vs. operations. Monthly construction
reports stop at the Actual Completion Date. Operating reports start from
the Effective Date. Some financial covenants only begin testing after
completion.

**System requirement:** Every item in the compliance schedule needs a
phase attribute (all / construction / operational). The system must
detect phase milestones (Completion Date achieved) and automatically
switch the active deliverable set — deactivating construction-phase
items and activating operational-phase items.

## Insight 2: Multi-Entity Tracking

Real deals involve multiple obligor entities (Borrower + HoldCo +
IntermediateCo in the Road PFI; Borrower + Issuer + Security Parent in
the Airport WBS). Different entities have different reporting
obligations (e.g. audited accounts for Material Project Parties may have
a 270-day deadline vs. 180 days for the Borrower).

**System requirement:** The compliance schedule must track which entity
is responsible for each deliverable. The document classification agent
must match incoming documents to both the deal AND the correct entity
within the deal.

## Insight 3: Linked / Dependent Deadlines

Many deliverables have deadlines that depend on other deliverables.
Examples:

> • Technical Adviser's Report due 5 Business Days after Borrower's
> Operating Report (Road PFI)
>
> • Cover Ratio Statement due promptly after Available Cash Flow
> Statement is agreed (Stadium PF)
>
> • Base Case due 5 Business Days after Technical and Economic
> Assumptions are agreed (Stadium PF)

If the upstream deliverable is late, the downstream deadline shifts.

**System requirement:** The compliance schedule needs a depends_on
field. The deadline calculation engine must handle cascading
dependencies.

## Insight 4: Interactive Approval Workflows

Budget approvals, Base Case updates, and certain consents involve
multi-step workflows between borrower and agent:

**Typical Pattern:**

> **1.** Borrower delivers draft → Agent has 15–20 days to review
>
> **2.** If Agent objects → 5–15 days negotiation
>
> **3.** If still unresolved → Expert determination
>
> **4.** Borrower delivers final version incorporating agreed/determined
> changes

**Auto-Approve Rules observed:**

> • Non-response within 15 days = deemed approved (Stadium PF budget)
>
> • Operating budget within 95–100% of prior period = auto-approved
> (Road PFI)

**Simplified Platform Workflow:**

> **1.** Document arrives → system classifies, files, logs receipt
>
> **2.** System creates task assigned to portfolio manager with deadline
>
> **3. T-5 business days:** Reminder
>
> **4.** Portfolio manager responds (emails borrower with system CC'd) →
> system logs response
>
> **5. T-1 business day (no response):** Urgent escalation
>
> **6. Deadline passes (no response):** Flag overdue, notify senior
> management

## Insight 5: The Trigger Event Layer

WBS structures introduce a mid-tier monitoring level between
"performing" and "defaulted." Trigger Events have escalating
consequences based on duration (immediate distribution lock-up →
12-month enhanced reporting → independent review).

**System requirement:** The system needs to track Trigger Event duration
and activate additional monitoring requirements when time thresholds are
crossed. The topsheet should prominently display whether a Trigger Event
is active and how long it has been continuing.

## Insight 6: Threshold-Based Triggers

Some Events of Default are triggered by cumulative thresholds over
rolling periods (e.g. Warning Notices exceeding limits over 3–4 year
rolling periods, Performance Points exceeding limits in 12-month rolling
periods).

**System requirement:** Running counters with configurable thresholds
and alert when approaching limits (e.g. 80% of threshold).

## Insight 7: Forward-Looking Ratios as Covenants

In project finance and WBS, forecast ratios can themselves breach
covenants. If the updated Base Case projects a Forecast DSCR below 1.1:1
or an LLCR below 1.2:1, that is an Event of Default even though the
actual ratio may still be above the threshold.

**System requirement:** The extraction agent must capture both actual
and forecast ratios from compliance certificates and Base Cases. The
monitoring agent must test both against the relevant thresholds.

## Insight 8: Equity Cure Tracking

Some structures allow the borrower's parent to inject equity within a
specified period (typically 30 days) to cure a financial covenant
breach. But cures are often limited (e.g. once per financial year). The
revised compliance certificate with recalculated ratios must be
delivered.

**System requirement:** When a financial covenant default occurs, the
system should: (a) start a cure countdown, (b) check whether a cure has
already been used in the current financial year, (c) track receipt of
the revised compliance certificate, and (d) if the cure is successful,
update the covenant status accordingly.

## Insight 9: Distinguish Hard Covenants from Distribution Conditions

The Airport Acquisition deal teaches a critical lesson: not every ratio
test is a financial covenant. The leverage ratio (Net Debt / EBITDA) is
tested only as a condition for distributions — breaching it locks up
cash but does not trigger default. The DSCR, by contrast, has both a
distribution condition level (1.35x) and a hard default level (1.10x).

**System requirement:** Each ratio test needs a test_type attribute:
hard_covenant (breach = default) vs. distribution_condition (breach =
lock-up). Dashboard reporting must clearly distinguish between the two —
a deal in lock-up is very different from a deal in default.

## Insight 10: Consecutive Period Tracking for Escalation

Both the Airport WBS (Trigger Event duration) and the Airport
Acquisition (3 consecutive Lock-up periods triggering Excess Cashflow
sweep) use duration or consecutive-period thresholds to escalate
consequences.

**System requirement:** The system must maintain a running count of
consecutive periods in each adverse state (Lock-up, Trigger Event) and
automatically trigger additional obligations when duration thresholds
are crossed.

## Insight 11: Currency-Specific Thresholds

The Airport Acquisition uses EUR thresholds (litigation: €5M,
cross-default: €2M, creditors' process: €2M). The UK deals use GBP. The
system must store threshold amounts in the deal's base currency and
display them accordingly. For multi-currency portfolios, currency
conversion may be needed for portfolio-level comparison.

## Insight 12: Annual Management Presentations

The Airport Acquisition requires annual management presentations to
lenders (more frequent if default suspected). This is a qualitative
monitoring touchpoint — there's no document to extract data from, but
the system should track that it occurred and log any notes.

**System requirement:** The compliance schedule must support
non-document deliverables (meetings, presentations, site visits) that
need to be tracked for occurrence but don't have associated data
extraction.

# PART D: DATA ARCHITECTURE & BUILDING BLOCKS

*This section describes how the platform stores, processes, and
aggregates data. It is designed to be enterprise-grade from day one —
with full audit trails, immutable source records, deterministic state
management, and a clear separation between what AI does and what the
platform does. Critically, it is designed so that anonymised,
standardised data can be aggregated across clients to create
cross-market intelligence — the foundation of the platform's network
effect.*

## D.1 Design Principles

> **1. Single source of truth.** Every number on the dashboard traces
> back through a deterministic chain to an immutable source document. No
> silent overwrites.
>
> **2. AI proposes, the platform disposes.** Agents classify documents,
> extract data, and draft narratives. They never write to canonical
> state directly. All agent outputs are proposals that pass through
> validation rules and, where required, human approval before being
> committed.
>
> **3. Deterministic logic owns grading and compliance.** Obligation due
> dates, variance calculations, covenant tier assessments, and grading
> are computed by deterministic rules engines — auditable, testable, and
> explainable. LLMs assist with extraction and narrative; they do not
> decide covenant status.
>
> **4. Event-driven state.** Every meaningful change in the system is an
> event. Events are immutable. Current state is a projection
> (materialised view) over the event history. This enables time-travel:
> reconstruct any deal's topsheet as at any prior date.
>
> **5. Built for aggregation from day one.** The canonical data model
> uses standardised definitions and taxonomies so that data can be
> anonymised and compared across deals, clients, sectors, and time
> periods without requiring retroactive normalisation.
>
> **6. Security and isolation are structural, not bolted on.** Every
> object is tagged with portfolio/client/strategy scope. The retrieval
> layer enforces row-level access. Agents cannot see across client
> boundaries.

## D.2 Processing Layers

The platform uses a four-layer data architecture. Each layer has a
distinct purpose, and data flows strictly downward (with proposals
flowing back up through approval).

### Layer 1: Raw / Immutable Store ("Bronze")

**Purpose:** Store every inbound document in its original form. Nothing
is parsed, interpreted, or modified.

**What lives here:**

> • Original PDF, Word, Excel, email (.eml/.msg) files
>
> • Custodian statements, administrator packs, broker confirms
>
> • Finance documents, IC memos, compliance certificates
>
> • Any file received via email, portal, SFTP, or manual upload

**Metadata attached on landing:**

> • Received timestamp
>
> • Source (email sender, portal, SFTP path)
>
> • Checksum (SHA-256)
>
> • Initial deal guess (if determinable from email/filename)
>
> • Virus scan result
>
> • Extraction run ID (when processed)

**Rules:**

> • Immutable. Original bytes never modified or deleted.
>
> • Retained permanently (regulatory/contractual requirements may
> specify minimum 7 years, but the platform retains all raw documents
> indefinitely as the ultimate evidence trail).
>
> • This is the ultimate evidence trail — if any downstream number is
> questioned, it traces back here.

### Layer 2: Extracted / Structured ("Silver")

**Purpose:** Structured data extracted from raw documents. This is the
output of AI-assisted extraction — tables, metrics, dates, text fields —
but it is NOT yet canonical. It represents "what we think the document
says."

**What lives here:**

> • Parsed tables from compliance certificates (JSON)
>
> • Extracted financial metrics with units, periods, and page/cell
> citations
>
> • Classified document type and deal assignment (with confidence score)
>
> • Obligation details extracted from finance documents
>
> • IC memo expected performance figures

**Rules:**

> • Every extraction record links back to the raw document ID and
> specific location (page, table, cell).
>
> • Extraction outputs are tagged as proposed until validated.
>
> • Multiple extraction versions may exist for the same document (if
> re-processed with improved models).

### Layer 3: Canonical / Authoritative ("Gold")

**Purpose:** The single source of truth for the platform. Clean, typed,
validated data that the dashboard reads from. This layer is small,
strict, and boring by design.

**What lives here (the canonical entities — see D.3):**

> • Investments (deals)
>
> • Obligations and their rules
>
> • Fulfilments (received deliverables linked to obligations)
>
> • Reported financial performance (actuals from compliance certificates
> / accounts)
>
> • Expected financial performance (baseline from IC memo)
>
> • Assessments (variance, grade, tier status)
>
> • Exceptions and cases
>
> • Approval and override records
>
> • Event log (immutable journal of all state changes)

**Rules:**

> • Data enters this layer ONLY through validated, approved proposals.
>
> • Every record has: created_at, created_by, source_event_id, version.
>
> • No direct writes from AI agents.
>
> • Deterministic rules engine operates here.

### Layer 4: Projections & Analytics ("Marts")

**Purpose:** Materialised views, aggregations, and computed outputs that
serve the dashboard, reporting packs, and the anonymised intelligence
layer.

**What lives here:**

> • TopSheet projections (current state of each deal, computed from
> canonical entities)
>
> • Portfolio and sub-portfolio aggregations
>
> • Historical snapshots (versioned topsheets for time-travel)
>
> • Financial definitions and ratio calculations (per Part B taxonomy)
>
> • Covenant headroom calculations
>
> • Performance trend analyses
>
> • Anonymised feature exports (for the Market Intelligence Plane — see
> D.6)

## D.3 Canonical Entity Model

These are the core database entities. Every item in the Master Register
(Part A) maps to one or more of these entities.

### Investment

The central entity. One record per deal.

| **Field**       | **Type**           | **Notes**                                                          |
|-----------------|--------------------|--------------------------------------------------------------------|
| investment_id   | UUID               | Primary key                                                        |
| investment_name | String             | Redactable for anonymisation                                       |
| borrower_id     | FK → Entity        |                                                                    |
| structure_type  | Enum               | leveraged_loan, project_finance, pfi, wbs, real_estate, uspp, bond |
| sector          | Enum               | Standardised taxonomy                                              |
| region          | Enum               |                                                                    |
| currency        | Enum               | Base currency for thresholds                                       |
| close_date      | Date               |                                                                    |
| maturity_date   | Date               |                                                                    |
| facility_amount | Decimal            |                                                                    |
| current_phase   | Enum               | construction, operational, closed                                  |
| assigned_ham    | FK → User          | Human Asset Manager                                                |
| assigned_pam    | FK → User          | Portfolio Asset Manager                                            |
| portfolio_ids   | FK\[\] → Portfolio | May belong to multiple portfolios/accounts                         |
| client_id       | FK → Client        | Tenant boundary for access control                                 |
| status          | Enum               | active, watchlist, underperforming, distressed, closed             |

### Obligation

One record per deliverable or compliance requirement extracted from the
finance documents. Maps to items in Part A.

| **Field**                | **Type**        | **Notes**                                                       |
|--------------------------|-----------------|-----------------------------------------------------------------|
| obligation_id            | UUID            |                                                                 |
| investment_id            | FK → Investment |                                                                 |
| register_item_id         | String          | Maps to master register (e.g. INFO-001, NOTIF-003)              |
| description              | String          | e.g. "Audited Annual Financial Statements"                      |
| responsible_party        | String          | Borrower, Agent, Adviser, etc.                                  |
| frequency                | Enum            | annual, semi_annual, quarterly, monthly, event_driven, one_time |
| deadline_rule            | String          | e.g. "90 days after fiscal year end"                            |
| deadline_rule_structured | JSONB           | Machine-readable: {"days": 90, "after": "fiscal_year_end"}      |
| grace_period_days        | Integer         |                                                                 |
| severity_if_missed       | Enum            | informational, potential_default, event_of_default              |
| phase                    | Enum            | all, construction, operational                                  |
| depends_on               | FK → Obligation | For linked/cascading deadlines                                  |
| auto_approve_rule        | JSONB           | e.g. {"deemed_approved_after_days": 15}                         |
| source_clause            | String          | e.g. "Cl 21.1(a)"                                               |
| is_active                | Boolean         | Deactivated on phase transition or deal closure                 |

### Fulfilment

One record each time a deliverable is received and linked to an
obligation.

| **Field**     | **Type**        | **Notes**                                |
|---------------|-----------------|------------------------------------------|
| fulfilment_id | UUID            |                                          |
| obligation_id | FK → Obligation |                                          |
| document_id   | FK → Document   | Link to the received document            |
| received_date | Date            |                                          |
| due_date      | Date            | Computed from obligation rules           |
| days_late     | Integer         | Computed (negative = early)              |
| status        | Enum            | on_time, late, late_within_grace, missed |
| approved_by   | FK → User       | Who confirmed the link                   |
| approved_at   | Timestamp       |                                          |

### FinancialPeriod

One record per reporting period per investment, containing all reported
and expected metrics.

| **Field**             | **Type**        | **Notes**                                                                                                                       |
|-----------------------|-----------------|---------------------------------------------------------------------------------------------------------------------------------|
| period_id             | UUID            |                                                                                                                                 |
| investment_id         | FK → Investment |                                                                                                                                 |
| period_label          | String          | e.g. "H1 2025", "FY 2024"                                                                                                       |
| period_start          | Date            |                                                                                                                                 |
| period_end            | Date            |                                                                                                                                 |
| source_document_id    | FK → Document   | Compliance certificate or accounts                                                                                              |
| extraction_confidence | Float           | 0–1                                                                                                                             |
| approval_tier         | Enum            | auto_approved, ham_reviewed, manual_entry — per D.5 tiered automation model                                                     |
| reported_metrics      | JSONB           | All extracted components per Part B taxonomy (DEF-001 to DEF-026)                                                               |
| expected_metrics      | JSONB           | IC memo baseline for this period                                                                                                |
| ebitda_adjustments    | JSONB           | Pro-forma add-backs per ADJ taxonomy                                                                                            |
| ratios                | JSONB           | Computed ratios with tier status                                                                                                |
| narrative_notes       | FK\[\] → Note   | Borrower-provided commentary and agent observations attached to this period's data points (see D.11 Narrative Notes Data Model) |

**Example \`reported_metrics\` JSONB:**

> {
>
> "revenue": 450000000,
>
> "ebitda": 180000000,
>
> "ebitda_reported": 155000000,
>
> "depreciation": 35000000,
>
> "interest_expense": 42000000,
>
> "tax_paid": 28000000,
>
> "capex": 55000000,
>
> "working_capital_movement": -3000000,
>
> "available_cash_flow": 115000000,
>
> "debt_service": 78000000,
>
> "net_debt": 920000000,
>
> "senior_debt": 750000000,
>
> "cash": 45000000
>
> }

### CovenantTest

One record per covenant test per period. Stores the ratio, its
components, threshold assessment, and tier status.

| **Field**                   | **Type**             | **Notes**                                                                      |                                                                                                                                                                                                                  |
|-----------------------------|----------------------|--------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| test_id                     | UUID                 |                                                                                |                                                                                                                                                                                                                  |
| investment_id               | FK → Investment      |                                                                                |                                                                                                                                                                                                                  |
| period_id                   | FK → FinancialPeriod |                                                                                |                                                                                                                                                                                                                  |
| covenant_id                 | String               | Maps to FIN-xxx in register                                                    |                                                                                                                                                                                                                  |
| covenant_name               | String               | e.g. "Senior DSCR"                                                             |                                                                                                                                                                                                                  |
| covenant_category           | Enum                 | cash_flow_cover, collateral_value, incurrence_test                             |                                                                                                                                                                                                                  |
| test_type                   | Enum                 | hard_covenant, distribution_condition                                          |                                                                                                                                                                                                                  |
| debt_service_composition    | Enum                 | interest_only, interest_plus_scheduled_principal, interest_plus_full_repayment | For cash flow cover ratios: distinguishes true DSCRs (amortising debt) from ratios labelled "DSCR" where the denominator is interest-only (effectively an ICR). Interest-only denominators flatter the borrower. |
| value                       | Decimal              | The computed ratio                                                             |                                                                                                                                                                                                                  |
| numerator                   | Decimal              |                                                                                |                                                                                                                                                                                                                  |
| denominator                 | Decimal              |                                                                                |                                                                                                                                                                                                                  |
| thresholds                  | JSONB                | All tier thresholds for this covenant on this deal                             |                                                                                                                                                                                                                  |
| tier_status                 | Enum                 | performing, lock_up, trigger_event, remedial, event_of_default                 |                                                                                                                                                                                                                  |
| headroom_pct                | Decimal              | Distance to next adverse threshold                                             |                                                                                                                                                                                                                  |
| consecutive_adverse_periods | Integer              | For escalation tracking                                                        |                                                                                                                                                                                                                  |

### Assessment

The overall deal-level assessment for a period, combining all covenant
tests and compliance status.

| **Field**            | **Type**             | **Notes**                                                    |
|----------------------|----------------------|--------------------------------------------------------------|
| assessment_id        | UUID                 |                                                              |
| investment_id        | FK → Investment      |                                                              |
| period_id            | FK → FinancialPeriod |                                                              |
| grade                | Enum                 | 1_outperforming, 2_in_line, 3_underperforming, 4_distressed  |
| prior_grade          | Enum                 | For trend detection                                          |
| grade_rationale      | Text                 | Deterministic summary of why this grade was assigned         |
| covenant_tier_status | Enum                 | Worst tier status across all covenants                       |
| compliance_status    | Enum                 | fully_compliant, deliverables_outstanding, breach_continuing |
| narrative_draft      | Text                 | AI-generated commentary (clearly labelled as draft)          |
| narrative_approved   | Text                 | Human-approved version                                       |
| approved_by          | FK → User            |                                                              |
| approved_at          | Timestamp            |                                                              |

### Exception

Open issues requiring human attention.

| **Field**      | **Type**          | **Notes**                                                                                                        |
|----------------|-------------------|------------------------------------------------------------------------------------------------------------------|
| exception_id   | UUID              |                                                                                                                  |
| investment_id  | FK → Investment   |                                                                                                                  |
| exception_type | Enum              | missed_deliverable, extraction_uncertainty, covenant_breach, variance_alert, grade_change, document_unclassified |
| severity       | Enum              | low, medium, high, critical                                                                                      |
| description    | Text              |                                                                                                                  |
| evidence_ids   | FK\[\] → Document | Supporting documents                                                                                             |
| assigned_to    | FK → User         |                                                                                                                  |
| status         | Enum              | open, in_review, resolved, escalated                                                                             |
| resolution     | Text              |                                                                                                                  |
| resolved_by    | FK → User         |                                                                                                                  |
| resolved_at    | Timestamp         |                                                                                                                  |

### Document

Metadata record for every document in the system. Links to the raw file
in Layer 1.

| **Field**                 | **Type**        | **Notes**                                                                   |
|---------------------------|-----------------|-----------------------------------------------------------------------------|
| document_id               | UUID            |                                                                             |
| raw_storage_path          | String          | Path to immutable original in object store                                  |
| checksum                  | String          | SHA-256                                                                     |
| file_type                 | String          | pdf, docx, xlsx, eml, etc.                                                  |
| received_at               | Timestamp       |                                                                             |
| source                    | String          | Email address, portal, SFTP, manual upload                                  |
| investment_id             | FK → Investment | Assigned deal (may be null initially)                                       |
| document_type             | Enum            | Maps to deliverable types (compliance_cert, audited_accounts, notice, etc.) |
| classification_confidence | Float           | 0–1                                                                         |
| classification_method     | Enum            | ai_auto, ai_assisted, manual                                                |
| extraction_status         | Enum            | pending, completed, failed, requires_review                                 |

### DistributionCondition

One record per sub-condition per deal. Maps to Category 11 (DIST-xxx).
Evaluated at each potential distribution date.

| **Field**        | **Type**        | **Notes**                                               |
|------------------|-----------------|---------------------------------------------------------|
| condition_id     | UUID            |                                                         |
| investment_id    | FK → Investment |                                                         |
| register_item_id | String          | Maps to DIST-001 through DIST-010                       |
| description      | String          | e.g. "DSRA fully funded"                                |
| condition_type   | Enum            | binary, tested                                          |
| threshold        | JSONB           | For tested conditions: ratio, level, step-down schedule |
| source_clause    | String          |                                                         |

### DistributionAssessment

One record per distribution assessment date per deal. Evaluates all
sub-conditions and determines overall lock-up status.

| **Field**                  | **Type**        | **Notes**                                            |
|----------------------------|-----------------|------------------------------------------------------|
| assessment_id              | UUID            |                                                      |
| investment_id              | FK → Investment |                                                      |
| assessment_date            | Date            |                                                      |
| overall_status             | Enum            | permitted, locked_up                                 |
| failing_conditions         | JSONB           | Array of condition_ids that failed, with details     |
| consecutive_lockup_periods | Integer         | For escalation tracking (e.g. excess cashflow sweep) |

### ConsentStructure

One record per deal, capturing the structural voting provisions from the
documentation. Maps to Category 12A (CONS-xxx).

| **Field**                    | **Type**        | **Notes**                                                      |
|------------------------------|-----------------|----------------------------------------------------------------|
| structure_id                 | UUID            |                                                                |
| investment_id                | FK → Investment |                                                                |
| majority_threshold_pct       | Decimal         | e.g. 66.67                                                     |
| all_lender_matters           | Text\[\]        | List of matters requiring 100% consent                         |
| supermajority_threshold_pct  | Decimal         | If applicable (e.g. 75, 90, 95)                                |
| voting_basis                 | Enum            | by_commitment, by_lender_count, by_block                       |
| snooze_you_lose              | Boolean         | If true, non-response counts as consent or excludes from count |
| snooze_mechanism             | Enum            | deemed_consent, excluded_from_count                            |
| yank_clause                  | Boolean         | Can non-consenters be replaced?                                |
| yank_repayment_basis         | Enum            | par, make_whole, market_value, other                           |
| standard_consent_period_days | Integer         | From documentation                                             |
| source_clause                | String          |                                                                |

### ConsentRequest

One record per consent/amendment/waiver request received.

| **Field**                         | **Type**        | **Notes**                                                         |
|-----------------------------------|-----------------|-------------------------------------------------------------------|
| request_id                        | UUID            |                                                                   |
| investment_id                     | FK → Investment |                                                                   |
| document_id                       | FK → Document   | The incoming request document                                     |
| request_date                      | Date            |                                                                   |
| request_type                      | Enum            | amendment, waiver, consent, security_release, new_facility, other |
| description                       | Text            |                                                                   |
| response_deadline                 | Date            | From the request                                                  |
| contractual_consent_period_days   | Integer         | From ConsentStructure                                             |
| deadline_shorter_than_contractual | Boolean         | Flag if request gives less time than documentation allows         |
| vote_type_required                | Enum            | majority, all_lender, supermajority                               |
| snooze_applies                    | Boolean         |                                                                   |
| yank_applies                      | Boolean         |                                                                   |
| assigned_to                       | FK → User       | HAM                                                               |
| vote_cast                         | Enum            | yes, no, abstain, no_instruction_given, pending                   |
| vote_date                         | Date            |                                                                   |
| outcome                           | Enum            | approved, rejected, withdrawn, lapsed, pending                    |

### RatingRecord

One record per rating action (internal or external). Provides a complete
time-series of credit assessments.

| **Field**          | **Type**        | **Notes**                                                                                                                           |
|--------------------|-----------------|-------------------------------------------------------------------------------------------------------------------------------------|
| rating_id          | UUID            |                                                                                                                                     |
| investment_id      | FK → Investment |                                                                                                                                     |
| rating_source      | Enum            | internal, moodys, sp, fitch, other_external                                                                                         |
| rating_date        | Date            |                                                                                                                                     |
| rating_value       | String          | The rating (e.g. "BB+", "3", "Baa2" — format depends on source)                                                                     |
| prior_rating_value | String          | Previous rating (null if first rating)                                                                                              |
| direction          | Enum            | upgrade, downgrade, affirmed, initial, withdrawn                                                                                    |
| outlook            | Enum            | stable, positive, negative, developing, not_applicable                                                                              |
| watch_status       | Enum            | not_on_watch, positive_watch, negative_watch, developing_watch                                                                      |
| trigger            | Enum            | initial_close, annual_review, quarterly_review, post_amendment, post_waiver, covenant_breach, external_event, restructuring, ad_hoc |
| methodology        | String          | Rating methodology or scorecard used                                                                                                |
| analyst            | String          | Internal analyst or external agency                                                                                                 |
| rationale_summary  | Text            | Brief rationale for the action                                                                                                      |
| document_path      | String          | Path to full rationale document in deal container                                                                                   |
| approved_by        | String          | Who approved the rating (for internal ratings)                                                                                      |

**System behaviour:** Every rating change triggers a RatingChanged
event, which updates the topsheet, may trigger an exception (if
downgraded), and feeds the anonymised intelligence plane (grade
distribution, transition matrices).

### TopSheetSnapshot

A point-in-time frozen copy of the complete computed TopSheet for a
deal. Every time any canonical data changes — a new financial period is
committed, a covenant test runs, a grade is assigned, an obligation is
fulfilled — a new snapshot is created. The snapshot captures all
computed fields: ratios, covenant status, headroom, grade, distribution
lock-up status, trend indicators, risk register scores, and every other
field the TopSheet screen displays. This enables time-travel: "show me
this deal as it looked on 30 June 2025" retrieves the most recent
snapshot before that date and renders the entire TopSheet from its data,
without needing to recompute anything. Snapshots are immutable and
retained indefinitely, forming the audit trail of how the deal's
monitored state evolved over time.

| **Field**        | **Type**           | **Notes**                                                                                                                                                                                                        |
|------------------|--------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| snapshot_id      | UUID               |                                                                                                                                                                                                                  |
| investment_id    | FK → Investment    |                                                                                                                                                                                                                  |
| snapshot_date    | Timestamp          |                                                                                                                                                                                                                  |
| trigger_event_id | FK → Event         | What caused this snapshot                                                                                                                                                                                        |
| data             | JSONB              | Complete topsheet state: obligations status, financial metrics, covenant tests, grade, exceptions, key dates, reserve account status, distribution condition evaluation, trend indicators, risk register summary |
| portfolio_ids    | FK\[\] → Portfolio |                                                                                                                                                                                                                  |

## D.4 Event Taxonomy

Every meaningful change in the system is recorded as an immutable event.
Events drive workflow, update state, and form the audit trail.

### Document Lifecycle Events

| **Event**           | **Trigger**                                  | **System Response**                                        |
|---------------------|----------------------------------------------|------------------------------------------------------------|
| DocumentReceived    | File ingested from any source                | Raw stored, metadata created, virus scan initiated         |
| DocumentClassified  | AI assigns deal + document type              | Routed to extraction workflow; exception if low confidence |
| ExtractionCompleted | Structured data extracted                    | ProposedFacts created with citations                       |
| ExtractionFailed    | Parsing error or empty extraction            | Exception created, assigned to HAM                         |
| FactsApproved       | Human approves proposed extraction           | Canonical state updated; topsheet recalculated             |
| FactsRejected       | Human rejects proposed extraction            | Exception escalated; manual entry option                   |
| FactsAutoApproved   | High-confidence extraction passes validation | Canonical state updated (audit-logged as auto-approved)    |

### Obligation Monitoring Events

| **Event**           | **Trigger**                                        | **System Response**                                    |
|---------------------|----------------------------------------------------|--------------------------------------------------------|
| ObligationCreated   | Parsed from finance documents                      | Stored in canonical with deadline rules                |
| ObligationDue       | Scheduler detects approaching deadline             | Alert to HAM (T-5 business days)                       |
| ObligationFulfilled | Deliverable linked to obligation                   | Status updated; days-late calculated                   |
| ObligationMissed    | Due date + grace period expired without fulfilment | Exception created; severity depends on obligation type |
| ObligationCured     | Late deliverable eventually received               | Status updated; late-delivery logged in audit trail    |

### Financial Performance Events

| **Event**                   | **Trigger**                                        | **System Response**                              |
|-----------------------------|----------------------------------------------------|--------------------------------------------------|
| ReportedPerformanceRecorded | Financials approved into canonical                 | Metrics stored in FinancialPeriod                |
| VarianceCalculated          | Deterministic engine compares reported vs expected | Variance record created                          |
| ThresholdBreached           | Variance exceeds configured limit                  | Alert; exception if material                     |
| TrendDetected               | Consecutive-period deterioration rule triggered    | Alert to HAM and PM                              |
| CovenantTested              | Ratio calculated and assessed against thresholds   | CovenantTest record created                      |
| TierStatusChanged           | Covenant test moves to different tier              | Topsheet updated; escalation if adverse          |
| GradeAssigned               | Rules engine computes overall deal grade           | Assessment record created                        |
| GradeChanged                | New grade differs from prior                       | Escalation to HAM and PM; exception if downgrade |

### Human Workflow Events

| **Event**          | **Trigger**                               | **System Response**                 |
|--------------------|-------------------------------------------|-------------------------------------|
| ExceptionOpened    | Any issue detected by system              | Case created, assigned to HAM       |
| ExceptionAssigned  | HAM allocated (auto or manual)            | Visible in review queue             |
| ExceptionResolved  | HAM takes action                          | Closed with resolution record       |
| ExceptionEscalated | Unresolved beyond SLA or severity upgrade | Elevated to PM or senior management |
| OverrideApplied    | Human modifies grade, metric, or status   | Immutable audit record with reason  |
| CommentaryDrafted  | AI generates narrative for period         | Stored as draft, flagged for review |
| CommentaryApproved | Human approves narrative                  | Released for reporting              |

### Rating & Scoring Events

| **Event**                 | **Trigger**                                            | **System Response**                                                                                                 |
|---------------------------|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| InternalRatingAssigned    | Analyst submits internal rating                        | RatingRecord created; topsheet updated                                                                              |
| InternalRatingChanged     | New internal rating differs from prior                 | Exception if downgrade; escalation to PM; topsheet updated                                                          |
| ExternalRatingReceived    | External agency rating action received                 | RatingRecord created; topsheet updated                                                                              |
| ExternalRatingChanged     | External rating upgrade/downgrade/outlook change       | Alert to HAM and PM; may trigger covenant implications (in WBS structures, rating downgrade can be a Trigger Event) |
| RatingReviewDue           | Scheduled review date approaching (e.g. annual review) | Reminder to HAM to prepare updated rating                                                                           |
| AmendmentApprovalRecorded | Internal approval for amendment/waiver documented      | Linked to ConsentRequest; rating review may be triggered                                                            |

### Portfolio & Snapshot Events

| **Event**                 | **Trigger**                        | **System Response**                             |
|---------------------------|------------------------------------|-------------------------------------------------|
| TopSheetSnapshotCreated   | After any canonical state change   | Versioned snapshot stored                       |
| PortfolioAggregated       | Triggered by deal-level changes    | Portfolio-level metrics recalculated            |
| ReportingPackGenerated    | Scheduled (quarterly) or on demand | Versioned output with citations                 |
| AnonymisedExportGenerated | Scheduled or on deal event         | Sanitised features pushed to intelligence plane |

### Distribution & Lock-Up Events

| **Event**                       | **Trigger**                                              | **System Response**                                          |
|---------------------------------|----------------------------------------------------------|--------------------------------------------------------------|
| DistributionConditionsEvaluated | After financial data committed or reserve account update | All sub-conditions tested; overall status determined         |
| LockUpTriggered                 | Any sub-condition fails                                  | Status changed to locked_up; consecutive counter incremented |
| LockUpLifted                    | All sub-conditions pass                                  | Status changed to permitted; counter reset                   |
| ExcessCashflowSweepTriggered    | Consecutive lock-up periods exceed threshold             | Mandatory prepayment obligation created                      |

### Consent & Voting Events

| **Event**                  | **Trigger**                                 | **System Response**                                                   |
|----------------------------|---------------------------------------------|-----------------------------------------------------------------------|
| ConsentRequestReceived     | Consent/amendment/waiver request classified | Logged; cover note generated for HAM                                  |
| ConsentDeadlineApproaching | T-5 Business Days before response deadline  | Reminder to HAM                                                       |
| ConsentDeadlineUrgent      | T-1 Business Day before response deadline   | Escalation reminder; if snooze applies, protective "no" vote prepared |
| ConsentVoteCast            | HAM records vote                            | Vote logged; status updated                                           |
| ConsentOutcomeRecorded     | Overall consent result known                | Outcome stored; amendment/waiver logged in deal history               |

## D.5 What AI Does vs What the Platform Does

This separation is fundamental. Getting it wrong means audit failures
and unreliable state.

### AI Agents Own:

> • **Document classification:** Identify which deal a document belongs
> to and what type it is
>
> • **Data extraction:** Parse tables, metrics, dates, text from PDFs
> and other unstructured documents
>
> • **Narrative capture:** Extract borrower commentary and management
> explanations, tagging them as notes to data points
>
> • **Entity resolution suggestions:** Propose borrower/issuer matches
> when names are ambiguous
>
> • **Narrative drafting:** Generate variance explanations, period
> commentaries, client-friendly summaries
>
> • **Exception resolution suggestions:** Propose likely fixes for
> common issues

### The Platform (Deterministic) Owns:

> • **State management:** All canonical entities, versioning, and event
> log
>
> • **Obligation scheduling:** Due dates, grace periods, recurrence,
> phase transitions
>
> • **Variance calculation:** Reported vs expected using deterministic
> arithmetic
>
> • **Grading logic:** Threshold comparisons, tier assessments, trend
> rules
>
> • **Aggregation:** Portfolio rollups, topsheet projections, snapshot
> creation
>
> • **Access control:** Row-level security by portfolio/client/strategy
>
> • **Approval workflow:** Proposal → validation → tiered review →
> commit

### The Rule: Agents Submit Proposals. The Platform Commits State.

The platform applies a **tiered automation model** that determines how
much human involvement is required before extracted data is committed to
canonical state. The tier is determined by a combination of document
complexity, extraction confidence, and the nature of the data being
committed.

**Tier 1 — Fully Automated (simple, high-confidence extractions)**

Compliance certificates with standardised formats containing a small
number of clearly labelled numeric fields (DSCR, ICR, leverage ratio,
cash balances). When the agent extracts data with high confidence and
the extracted values pass format validation and reasonableness checks
(e.g. DSCR is positive, ratios are within plausible ranges, period
matches the expected reporting cycle), the extraction is auto-approved
and committed directly to canonical state with a full audit trail.

The human is informed but not asked to approve. The topsheet updates,
covenant tests run, and alerts fire automatically. This is the
steady-state for routine monitoring — the system handles the volume
while humans focus on exceptions and judgement calls.

> Agent: "Compliance Certificate received for Deal X, H1 2025.
>
> Extracted: DSCR = 1.47x, ICR = 2.31x, Net Debt = £920m.
>
> Source: Table 1, page 2. Confidence: 0.96.
>
> Borrower note: 'Revenue ahead of budget due to early contract win.'
>
> All values pass validation. Period matches expected."
>
> Platform: Auto-approves. Commits to FinancialPeriod.
>
> Tags borrower note to DSCR and revenue data points.
>
> → Runs CovenantTest (all ratios pass).
>
> → Runs Assessment (no variance trigger).
>
> → Creates TopSheetSnapshot.
>
> → Emits events. HAM notified via dashboard.

**Tier 2 — Automated with Review (moderate complexity, requires
checking)**

Financial statements, operating reports, and documents with larger data
sets or more complex structures. The agent extracts and proposes, the
platform validates format and reasonableness, but a human reviews the
extraction before commitment. The human's role is to *check what the
agent has done* — not to do the work. The agent presents its extraction
with source citations (page, table, cell references) so the reviewer can
verify quickly.

This tier also applies when Tier 1 extractions fail a reasonableness
check (e.g. DSCR has moved by more than 30% period-on-period) or when
the extraction confidence falls below the auto-approval threshold.

> Agent: "Annual accounts received for Deal Y, FY 2025.
>
> Extracted 47 fields across P&L, balance sheet, and cashflow.
>
> 3 fields flagged: revenue recognition change noted on page 14,
>
> EBITDA adjustment for one-off restructuring cost (£2.1m),
>
> working capital swing larger than prior periods.
>
> Confidence: 0.88. Recommend HAM review."
>
> Platform: Creates ProposedFacts with citations.
>
> Flags 3 items for attention.
>
> → Queued in HAM review dashboard.
>
> → HAM reviews, adjusts one figure, approves.
>
> → Committed to canonical. Downstream cascade runs.

**Tier 3 — Human-Led (subjective judgement required)**

Any decision that requires qualitative assessment, subjective judgement,
or interpretation. This includes: internal credit rating assignment,
risk register scoring, performance grade changes, waiver and consent
recommendations, narrative commentary for client reports, and any
override of system-calculated outputs. The system provides the data and
analysis; the human makes the call.

> Agent: "Covenant test shows DSCR has fallen from 1.47x to 1.12x.
>
> Lock-up threshold is 1.10x. Headroom is 0.02x (2 basis points).
>
> Borrower's narrative cites temporary construction disruption.
>
> Revenue forecast for H2 suggests recovery to 1.35x.
>
> Draft commentary prepared. Recommend watchlist consideration."
>
> Platform: Presents analysis to HAM.
>
> → HAM decides: keep on standard monitoring (agrees with
>
> borrower's explanation) or escalate to enhanced/watchlist.
>
> → HAM's decision committed with rationale.
>
> → If watchlist → PM notified.

### Tier Assignment Rules

*Forward-looking design note: As the system evolves, each event type
will develop its own dedicated agentic workflow that progressively
automates processing and reduces the need for human involvement. The
compliance monitoring workflow — has the borrower delivered what it
should, and if not, flag it as a breach, check documentation for cure
periods, and notify the HAM with deadlines — is the first major workflow
to be fully automated. Over time, additional workflows will follow:
consent processing, invitation management (including compliance flagging
for hospitality events), amendment tracking, and remediation monitoring.
Each workflow will be designed as a configurable pipeline with clear
escalation rules, maintaining the principle that subjective judgement
always requires a human.*

| **Document Type**                        | **Typical Tier**                              | **Rationale**                                                                                                                                                                                               |
|------------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Compliance certificate (standard format) | Tier 1                                        | Few fields, structured format, numeric data only                                                                                                                                                            |
| Compliance certificate (with narrative)  | Tier 1 for numbers, Tier 3 for interpretation | Numbers auto-committed; narrative tagged as notes and HAM must read and agree (acknowledged via dashboard); interpretation of narrative (e.g. management excuse for deterioration) requires human judgement |
| Quarterly/annual financial statements    | Tier 2                                        | Larger data set, may require judgement on classification of line items                                                                                                                                      |
| Operating reports with KPIs              | Tier 2                                        | Sector-specific data, may have new KPI formats                                                                                                                                                              |
| Budget/forecast submissions              | Tier 2                                        | Updates expected metrics; material impact on variance analysis                                                                                                                                              |
| Valuation reports                        | Tier 2/3                                      | Quantitative extraction is Tier 2; assessment of assumptions is Tier 3                                                                                                                                      |
| Consent/waiver requests                  | Tier 3                                        | Inherently requires judgement                                                                                                                                                                               |
| Internal rating review                   | Tier 3                                        | Subjective assessment                                                                                                                                                                                       |
| Risk register update                     | Tier 3                                        | Qualitative scoring                                                                                                                                                                                         |
| Amendment documentation                  | Tier 3                                        | Legal interpretation, commercial judgement                                                                                                                                                                  |

### Escalation Between Tiers

Extractions can escalate upward but never downward within a single
processing run:

> • Tier 1 extraction that fails a reasonableness check → escalates to
> Tier 2
>
> • Tier 1 extraction where agent confidence is below threshold →
> escalates to Tier 2
>
> • Tier 2 extraction where reviewer identifies a judgement call →
> escalates to Tier 3
>
> • Any extraction where the system cannot match the document to an
> investment → escalates to Tier 2 (classification review)
>
> • Any data point that triggers a covenant breach or tier change → the
> data commits at its assigned tier, but the *response* to the breach is
> always Tier 3

## D.6 Anonymised Aggregation & Network Effects

### The Strategic Objective

*Note: The anonymised aggregation and network effects strategy described
in this section is to be discussed with partners before implementation.*

As the platform processes more deals across more clients, the anonymised
aggregate data becomes increasingly valuable. This creates a network
effect: the more clients use the platform, the better the market
intelligence, the stickier the product.

### Two Separate Data Planes

The system maintains strict separation between confidential client data
and aggregated market intelligence.

**Plane 1 — Client Operational Plane (Isolated)**

Each client's data lives in its own logical boundary (and, for
enterprise clients, its own physical boundary). Raw documents, canonical
state, obligations, performance metrics, topsheets, exceptions, and
audit logs never leave this boundary in identifiable form.

**Plane 2 — Market Intelligence Plane (Aggregated & Sanitised)**

A completely separate environment that stores only standardised,
anonymised feature vectors. No client identifiers, borrower names, deal
names, or raw documents. Only schema-aligned numeric and categorical
features.

### How Data Flows Safely Between Planes

Inside each client's environment, a controlled export job:

> **1. Extracts** standardised features from canonical state (using the
> taxonomies defined in Parts A and B)
>
> **2. Strips** all identifying fields: client ID, borrower name, deal
> name, direct deal identifiers, document references
>
> **3. Validates** against the Market Intelligence Feature Schema (see
> below)
>
> **4. Pushes** only the sanitised payload to the intelligence plane

No raw data is ever copied to the intelligence plane. No cross-client
joins exist anywhere.

### Market Intelligence Feature Schema

Each deal contributes an anonymised feature record per period.

**Structural Features (set at close, updated on amendment):**

| **Field**             | **Type** | **Description**                                                   |
|-----------------------|----------|-------------------------------------------------------------------|
| structure_type        | Enum     | Unitranche, TLB, Senior Secured, Mezzanine, Project Finance, etc. |
| sector                | Enum     | Standardised sector taxonomy                                      |
| region                | Enum     | UK, EU, US, APAC                                                  |
| close_year            | Integer  | Year of investment (not exact date)                               |
| facility_size_bucket  | Enum     | \<50M, 50-100M, 100-250M, 250-500M, 500M+                         |
| leverage_at_close     | Float    | Net Debt / EBITDA at close                                        |
| margin_bps            | Integer  | Interest margin in basis points                                   |
| covenant_package_type | Enum     | cov_lite, single_maintenance, full_maintenance, project_finance   |

**Performance Features (updated each period):**

| **Field**             | **Type** | **Description**                       |
|-----------------------|----------|---------------------------------------|
| period                | String   | e.g. "2025-H1"                        |
| revenue_variance_pct  | Float    | vs IC memo expectation                |
| ebitda_variance_pct   | Float    | vs IC memo expectation                |
| dscr_or_equivalent    | Float    | Cash flow cover ratio (normalised)    |
| leverage_current      | Float    | Current Net Debt / EBITDA             |
| covenant_headroom_pct | Float    | Distance to nearest adverse threshold |
| grade                 | Enum     | 1–4                                   |
| grade_trend           | Enum     | improving, stable, deteriorating      |

**Behavioural Features (updated each period):**

| **Field**                 | **Type** | **Description**         |
|---------------------------|----------|-------------------------|
| financials_days_late      | Integer  | Delivery timeliness     |
| compliance_cert_days_late | Integer  |                         |
| amendments_last_12m       | Integer  | Amendment frequency     |
| waivers_last_12m          | Integer  | Waiver frequency        |
| exceptions_open           | Integer  | Current open exceptions |

**EBITDA Quality Features (where applicable):**

| **Field**                | **Type** | **Description**                           |
|--------------------------|----------|-------------------------------------------|
| ebitda_adjustments_pct   | Float    | Total adjustments as % of reported EBITDA |
| has_synergy_addbacks     | Boolean  |                                           |
| has_proforma_adjustments | Boolean  |                                           |
| adjustment_trend         | Enum     | increasing, stable, decreasing            |

### Minimum Aggregation Safeguards

> • No statistics computed where fewer than 10 deals in the slice
> (sector + region + structure type)
>
> • No single-deal views in the intelligence plane
>
> • No time-series that could identify individual deals
>
> • All clients must opt in contractually

### What the Intelligence Plane Enables

Once sufficient volume exists, the platform can compute and publish:

> • **Median leverage by sector** (rolling 4-quarter)
>
> • **Covenant headroom distribution** by deal type
>
> • **Delivery timeliness index** — are borrowers across the market
> getting slower at providing information?
>
> • **Amendment and waiver frequency index** — is the market loosening?
>
> • **EBITDA adjustment reliance index** — are borrowers increasingly
> relying on add-backs?
>
> • **Performance grade distribution** — what percentage of the market
> is in each grade bucket?
>
> • **Early warning signals** — do behavioural features (late
> deliveries, amendment frequency) predict future downgrades?
>
> • **Spread vs risk analysis** — is the market being adequately
> compensated for the risk it's taking?

### Why This Creates a Moat

The defensible competitive advantage is not the agents, the dashboard,
or the cloud infrastructure. It is:

> **1. The canonical ontology** — standardised definitions that make
> private credit data comparable across deals and clients (Parts A, B,
> and the Feature Schema above)
>
> **2. The longitudinal dataset** — historical performance data
> accumulating over time, impossible to replicate without the platform
>
> **3. The anonymised market structure index** — aggregate intelligence
> that no single client can produce alone

More deals → better benchmarks → better grading context → better client
value → more clients → stronger benchmarks. This is the compounding data
advantage.

## D.7 Security, Entitlements & Audit

### Access Control

Every object in the system is tagged with:

> • client_id — tenant boundary (absolute)
>
> • portfolio_id — sub-boundary within a client
>
> • strategy_id — optional further segmentation
>
> • confidentiality_level — for documents that require elevated access

The retrieval layer (both structured queries and document search)
enforces row-level access. An agent operating on behalf of a HAM can
only see investments, documents, and metrics within their assigned
portfolio scope. Cross-client data access is architecturally impossible
without explicit anonymisation.

### Audit Trail

Every state change is recorded immutably:

> • **Who** made the change (user ID or system service ID)
>
> • **What** changed (entity, field, old value, new value)
>
> • **When** (timestamp)
>
> • **Why** (source event ID, linked to the triggering document or rule)
>
> • **How** (manual, agent-proposed + auto-approved, agent-proposed +
> human-approved, override)

For AI-assisted actions, the audit trail additionally records:

> • Prompt/model version used
>
> • Tool calls made
>
> • Context documents retrieved
>
> • Confidence scores
>
> • Whether the output was auto-approved or human-reviewed

### Evidence Links

Every number on the dashboard links to:

> **1.** The canonical record that produced it
>
> **2.** The source document from which it was extracted
>
> **3.** The specific location within that document (page, table, cell)

This "click-through" capability — from dashboard number → canonical
record → source PDF page — is non-negotiable for enterprise adoption.

## D.8 TopSheet as a Projection

The TopSheet is not a file. It is not a spreadsheet. It is a
**materialised view** — a computed projection over canonical state that
is recalculated whenever the underlying data changes.

The complete field-level schema for the TopSheet — every field, type,
and constraint, validated against four real financial models — is
specified in **Part F: TopSheet Data Schema**. This section describes
the conceptual design; Part F provides the implementation specification.

The TopSheet for a deal synthesises:

> • Investment metadata (structure, parties, dates, facilities)
>
> • Current obligation status (what's been received, what's overdue,
> what's upcoming)
>
> • Latest financial metrics (reported and expected, with variance)
>
> • Covenant test results (all ratios, all tier statuses, headroom)
>
> • Current assessment (grade, trend, rationale)
>
> • Open exceptions
>
> • Key dates (next deliverable due, next covenant test, maturity)

TopSheet snapshots are stored at every state change. To see a deal "as
at" any historical date, the system retrieves the most recent snapshot
before that date.

Portfolio and sub-portfolio views are aggregations of TopSheets — they
roll up grades, flag concentration, summarise compliance status, and
highlight the deals that need attention.

## D.9 Deal Container: Standard Directory Structure

Every investment has a structured file container in the object store.
The same top-level structure is used regardless of deal type — not every
folder will be populated for every deal, but the structure is always the
same, so agents and people always know where to look.

Documents are grouped by lifecycle stage and purpose, not by file type.
Everything received before close goes into the origination tree.
Everything received after close goes into the monitoring tree, organised
by year and period.

> /{investment_id}/
>
> │
>
> ├── 00_deal_metadata/
>
> │ ├── deal_card.json \# Core deal attributes
>
> │ ├── obligation_schedule.json \# Extracted obligations with deadline
> rules
>
> │ ├── covenant_configuration.json \# Thresholds, tiers, step-downs
>
> │ ├── distribution_conditions.json \# Lock-up sub-conditions
>
> │ ├── consent_structure.json \# Voting mechanics, snooze, yank
>
> │ ├── expected_performance.json \# IC memo base case metrics per
> period
>
> │ ├── initial_ratings.json \# Internal + external ratings at close
> (baseline)
>
> │ └── risk_register.json \# Current risk register (see Part E)
>
> │
>
> ├── 01_origination/
>
> │ ├── 01_mandate_and_nda/
>
> │ │ ├── nda/
>
> │ │ ├── mandate_letter/
>
> │ │ └── fee_letters/
>
> │ │
>
> │ ├── 02_marketing_materials/
>
> │ │ ├── information_memorandum/
>
> │ │ ├── management_presentation/
>
> │ │ ├── term_sheet/
>
> │ │ └── investor_q_and_a/
>
> │ │
>
> │ ├── 03_due_diligence/
>
> │ │ ├── financial_dd/
>
> │ │ ├── commercial_dd/
>
> │ │ ├── technical_dd/ \# Infrastructure, real estate
>
> │ │ ├── insurance_dd/
>
> │ │ ├── environmental_dd/
>
> │ │ ├── tax_dd/
>
> │ │ ├── legal_dd/
>
> │ │ ├── model_audit/
>
> │ │ └── other_dd/ \# Sector-specific (traffic study, demand study,
> regulatory)
>
> │ │
>
> │ ├── 04_financial_model/
>
> │ │ ├── base_case/
>
> │ │ ├── downside_cases/
>
> │ │ └── model_assumptions/
>
> │ │
>
> │ ├── 05_valuations/
>
> │ │ ├── initial_valuation/ \# Real estate, infrastructure
>
> │ │ └── fairness_opinion/
>
> │ │
>
> │ ├── 06_credit_approval/
>
> │ │ ├── deal_summary/ \# Initial deal summary / screening paper
>
> │ │ ├── preliminary_ic_memo/ \# Preliminary IC memorandum (pre-DD,
> seeking approval to proceed)
>
> │ │ ├── final_ic_memo/ \# Final IC memorandum (post-DD, seeking
> approval to invest)
>
> │ │ ├── ic_minutes/ \# IC meeting minutes / formal approval record
>
> │ │ ├── conditions_precedent_tracker/ \# CP checklist and sign-off
>
> │ │ ├── risk_assessment/ \# See Part E: Risk Register
>
> │ │ │ ├── initial_risk_register.json \# Risk register as at close
> (baseline)
>
> │ │ │ └── initial_risk_narrative.pdf \# Supporting analysis from IC
> process
>
> │ │ ├── internal_credit_rating/ \# Internal credit rating/scoring at
> close
>
> │ │ │ ├── rating_scorecard.json \# Structured: rating, score,
> methodology, analyst, date
>
> │ │ │ └── rating_rationale.pdf \# Supporting narrative / analysis
>
> │ │ └── external_credit_rating/ \# External ratings at close (if
> rated)
>
> │ │ ├── agency_rating.json \# Structured: agency, rating, outlook,
> date
>
> │ │ └── rating_report.pdf \# Agency report
>
> │ │
>
> │ ├── 07_finance_documents/
>
> │ │ ├── facility_agreement/ \# Senior Facilities Agreement / Loan
> Agreement
>
> │ │ ├── note_purchase_agreement/ \# NPA (USPP / private placement)
>
> │ │ ├── common_terms_agreement/ \# CTA (project finance / WBS)
>
> │ │ ├── intercreditor_agreement/
>
> │ │ ├── security_documents/ \# Debenture, charge, pledge, mortgage
>
> │ │ ├── guarantee/
>
> │ │ ├── hedging_agreements/ \# ISDA, hedging letter, CSA
>
> │ │ ├── account_bank_agreements/ \# Waterfall, account mandates
>
> │ │ ├── agency_agreement/
>
> │ │ └── subordination_agreements/
>
> │ │
>
> │ ├── 08_project_documents/ \# Project finance / PFI / infrastructure
> only
>
> │ │ ├── concession_agreement/
>
> │ │ ├── construction_contract/ \# EPC / D&B
>
> │ │ ├── operations_contract/ \# O&M / FM
>
> │ │ ├── offtake_agreement/ \# PPA, anchor lease, revenue contract
>
> │ │ ├── supply_agreements/
>
> │ │ ├── land_agreements/
>
> │ │ ├── government_support/
>
> │ │ └── permits_and_licences/
>
> │ │
>
> │ ├── 09_legal_opinions/
>
> │ │ ├── capacity_opinion/
>
> │ │ ├── enforceability_opinion/
>
> │ │ ├── security_opinion/
>
> │ │ ├── tax_opinion/
>
> │ │ └── regulatory_opinion/
>
> │ │
>
> │ └── 10_closing/
>
> │ ├── conditions_precedent/
>
> │ ├── closing_certificates/
>
> │ ├── funds_flow/
>
> │ └── closing_memorandum/
>
> │
>
> ├── 02_monitoring/
>
> │ ├── financial_statements/
>
> │ │ └── {YYYY}/
>
> │ │ ├── annual_audited/
>
> │ │ ├── annual_unaudited/
>
> │ │ ├── h1_interim/
>
> │ │ ├── q1/ q2/ q3/ q4/ \# If quarterly reporting
>
> │ │ └── management_accounts/ \# If monthly
>
> │ │
>
> │ ├── compliance_certificates/
>
> │ │ └── {YYYY}/
>
> │ │ └── {period_label}/ \# e.g. "H1_2025", "FY_2024"
>
> │ │ ├── certificate.pdf
>
> │ │ ├── cover_ratio_statement.pdf
>
> │ │ └── extraction.json \# Agent-extracted structured data
>
> │ │
>
> │ ├── budgets_and_forecasts/
>
> │ │ └── {YYYY}/
>
> │ │ ├── operating_budget/
>
> │ │ ├── capex_budget/
>
> │ │ ├── business_plan/
>
> │ │ └── base_case_update/ \# Updated financial model (PF/WBS)
>
> │ │
>
> │ ├── investor_reports/
>
> │ │ └── {YYYY}/{period_label}/
>
> │ │
>
> │ ├── valuations/
>
> │ │ └── {YYYY}/
>
> │ │ ├── annual_valuation/
>
> │ │ └── interim_valuation/
>
> │ │
>
> │ ├── insurance/
>
> │ │ └── {YYYY}/
>
> │ │
>
> │ ├── construction_monitoring/ \# Construction phase only
>
> │ │ └── {YYYY_MM}/
>
> │ │ ├── monthly_construction_report/
>
> │ │ ├── technical_adviser_report/
>
> │ │ └── drawdown_requests/
>
> │ │
>
> │ ├── adviser_reports/
>
> │ │ └── {YYYY}/
>
> │ │ ├── technical_adviser/
>
> │ │ ├── environmental_adviser/
>
> │ │ └── insurance_adviser/
>
> │ │
>
> │ └── presentations/
>
> │ └── {YYYY}/
>
> │
>
> ├── 03_notices_and_correspondence/
>
> │ ├── notices_from_borrower/
>
> │ │ ├── default_notices/
>
> │ │ ├── notification_obligations/ \# All NOTIF-xxx items
>
> │ │ ├── utilisation_requests/
>
> │ │ ├── prepayment_notices/
>
> │ │ └── general_correspondence/
>
> │ ├── notices_from_agent/
>
> │ │ ├── interest_rate_notices/
>
> │ │ ├── distribution_notices/
>
> │ │ └── general_agent_notices/
>
> │ └── notices_from_us/ \# Our outbound correspondence
>
> │ ├── consent_responses/
>
> │ ├── queries_to_borrower/
>
> │ └── general_outbound/
>
> │
>
> ├── 04_amendments_waivers_consents/
>
> │ └── {YYYY}/
>
> │ └── {sequence}\_{description}/ \# e.g. "001_margin_reset"
>
> │ ├── incoming/
>
> │ │ ├── consent_request.pdf
>
> │ │ └── supporting_materials/ \# Any docs borrower provides to justify
> request
>
> │ ├── internal_approval/
>
> │ │ ├── ham_recommendation.pdf \# HAM's analysis and recommendation
>
> │ │ ├── pam_sign_off.pdf \# PM approval (if delegated authority)
>
> │ │ ├── ic_paper.pdf \# IC paper (if material / exceeds delegated
> authority)
>
> │ │ ├── ic_minutes.pdf \# IC approval record
>
> │ │ └── approval_record.json \# Structured: approver, date,
> conditions, delegated_authority_used
>
> │ ├── executed/
>
> │ │ ├── amendment_agreement.pdf
>
> │ │ ├── waiver_letter.pdf
>
> │ │ └── our_response.pdf \# Our formal consent / objection
>
> │ ├── ratings_impact/
>
> │ │ ├── revised_internal_rating.json \# Updated internal rating if
> changed
>
> │ │ └── revised_external_rating.json \# Updated external rating if
> changed
>
> │ └── consent_tracking.json \# Links to ConsentRequest entity
>
> │
>
> ├── 05_events_and_workouts/ \# Only populated if problems arise
>
> │ ├── covenant_breaches/
>
> │ │ └── {YYYY_MM_description}/
>
> │ ├── restructuring/
>
> │ ├── enforcement/
>
> │ └── workout_correspondence/
>
> │
>
> ├── 06_exit/
>
> │ ├── repayment_confirmation/
>
> │ ├── security_release/
>
> │ ├── secondary_sale/
>
> │ └── post_exit_administration/
>
> │
>
> └── 07_internal/ \# Our internal working papers only
>
> ├── credit_assessments/
>
> │ └── {YYYY}/
>
> │ ├── annual_review/ \# Annual credit review paper
>
> │ ├── quarterly_commentary/ \# HAM's quarterly commentary / topsheet
> narrative
>
> │ └── ad_hoc_notes/ \# Event-driven analysis, site visit notes
>
> │
>
> ├── ratings_and_scoring/
>
> │ ├── internal/
>
> │ │ └── {YYYY_MM_DD}\_{event}/ \# e.g. "2025_06_30_annual_review",
> "2025_09_15_post_amendment"
>
> │ │ ├── rating_scorecard.json \# Structured: rating, score,
> prior_rating, methodology, analyst, date, trigger
>
> │ │ └── rating_rationale.pdf \# Supporting narrative
>
> │ ├── external/
>
> │ │ └── {YYYY_MM_DD}\_{agency}/ \# e.g. "2025_03_01_moodys"
>
> │ │ ├── agency_rating.json \# Structured: agency, rating,
> prior_rating, outlook, watch_status, date
>
> │ │ └── rating_report.pdf
>
> │ └── ratings_history.json \# Consolidated time-series of all
> internal + external ratings
>
> │
>
> ├── risk_assessments/ \# See Part E: Risk Register
>
> │ └── {YYYY}/
>
> │ └── {YYYY_MM_DD}\_{trigger}/ \# e.g. "2025_06_30_annual_review"
>
> │ ├── risk_register.json \# Full register at this assessment date
>
> │ └── risk_commentary.pdf \# Supporting narrative / changes
>
> │
>
> ├── internal_approvals/ \# IC / delegated authority approvals during
> monitoring
>
> │ └── {YYYY}/
>
> │ └── {sequence}\_{description}/ \# e.g. "001_waiver_approval",
> "002_watchlist_escalation"
>
> │ ├── approval_paper.pdf \# IC or delegated authority paper
>
> │ ├── approval_minutes.pdf \# If IC-level
>
> │ └── approval_record.json \# Structured: type, approver, date,
> outcome
>
> │
>
> ├── topsheet_snapshots/
>
> ├── client_reporting/
>
> │ └── {YYYY_QN}/
>
> └── correspondence_log/ \# Log of calls, meetings, site visits
>
> └── {YYYY}/
>
> └── {YYYY_MM_DD}\_{type}/ \# e.g. "2025_03_15_site_visit",
> "2025_06_01_management_call"
>
> ├── notes.md
>
> └── attendees.json

### Which Folders Are Populated by Deal Type

Not every deal uses every folder. The origination tree varies:

| **Folder**              | **Leveraged Loan**    | **Project Finance / PFI** | **WBS**               | **Real Estate**                      | **USPP**  |
|-------------------------|-----------------------|---------------------------|-----------------------|--------------------------------------|-----------|
| 03_due_diligence        | Financial, commercial | All types incl. technical | Financial, regulatory | Financial, commercial, environmental | Financial |
| 04_financial_model      | ✓                     | ✓                         | ✓                     | Sometimes                            | Rarely    |
| 05_valuations           | Sometimes             | Rarely                    | Rarely                | Always                               | Rarely    |
| 07_finance_documents    | FA, ICA, security     | CTA, ICA, security        | CTA / bond docs       | FA, security                         | NPA       |
| 08_project_documents    | —                     | ✓                         | Sometimes             | —                                    | —         |
| construction_monitoring | —                     | ✓ (construction phase)    | —                     | Sometimes (development)              | —         |

### How the Container Connects to the Platform

**Agent 1 (Classification & Filing):** When a document arrives, it
determines the investment, document type, and period, then files it in
the correct location within this structure.

**Agent 4 (Financial Extraction):** Knows to look in
02_monitoring/compliance_certificates/ for covenant data,
02_monitoring/financial_statements/ for detailed financials, and
01_origination/06_credit_approval/ic_memo/ for the expected performance
baseline.

**Deal Setup:** When a new investment is onboarded, the origination tree
is populated and 00_deal_metadata/ is created with the structured JSON
configuration files that drive the monitoring engine.

**Evidence Links:** Every number on the dashboard traces through the
canonical database to a raw_storage_path within this structure, enabling
click-through to the source document.

**Azure Implementation:** Each {investment_id} maps to a virtual
directory in Azure Blob Storage (ADLS Gen2), within the client's storage
account. The folder structure is a logical convention enforced by the
application. Immutability policies are applied at the container level
where WORM compliance is required.

## D.10 Client, Entity & Ownership Model

### The Problem

The same deal can appear in multiple portfolio views depending on who is
looking at it. A £200m infrastructure loan might be originated by Asset
Manager X, with £80m allocated to Pension Fund A's segregated mandate,
£50m to Insurance Company B's fund, £40m to a commingled fund (Fund
III), and £30m retained on Asset Manager X's balance sheet. Each
stakeholder needs a different portfolio view, but the underlying deal
data — the risk register, covenants, financial statements, monitoring
alerts — is shared. The data architecture must support this cleanly from
day one.

### Who Uses the System

The platform serves three types of client, each with different portfolio
construction needs:

**1. Asset owners managing directly.** A pension fund or insurer that
originates or purchases private debt investments and manages them
in-house. They are both the asset owner and the asset manager. Their
portfolio is their own book. This is the simplest case.

**2. Asset managers managing on behalf of clients.** A fund manager that
originates deals and allocates participations across multiple funds,
segregated mandates, and managed accounts. The asset manager needs a
consolidated view across all clients, but each underlying client (the
pension fund, the insurer, the sovereign wealth fund) needs a view that
shows only their own exposure. The same deal may appear in multiple
client portfolios at different sizes.

**3. Asset owners with external managers.** A pension fund that has
appointed one or more external asset managers to run private debt
mandates on their behalf. The asset owner needs a consolidated view
across all managers and mandates, plus the ability to drill into
individual manager portfolios. They may also have some directly managed
assets alongside the externally managed ones.

In practice, combinations are common: a large insurer might directly
manage some investments, have two external managers running segregated
mandates, and hold units in a third manager's commingled fund.

### Entity Hierarchy

The data model requires a clear hierarchy of entities that separates the
deal from the ownership:

> Platform Client (who pays for and logs into the system)
>
> └── Organisation (the legal entity or group)
>
> └── Portfolio Owner (the beneficial owner of the assets)
>
> └── Account / Fund / Mandate (the vehicle through which assets are
> held)
>
> └── Holding (the specific participation in a specific deal)
>
> └── Investment (the deal itself — shared across holders)

### Core Entities

**PlatformClient**

The entity that contracts with the platform. This might be an asset
manager, an asset owner, or a consultant acting on behalf of multiple
asset owners.

| **Field**         | **Type** | **Notes**                                      |
|-------------------|----------|------------------------------------------------|
| client_id         | UUID     |                                                |
| client_name       | String   | e.g. "Acme Capital Management"                 |
| client_type       | Enum     | asset_manager, asset_owner, consultant, hybrid |
| domicile          | String   | Jurisdiction of incorporation                  |
| regulatory_status | String   | e.g. "FCA regulated", "SEC registered"         |
| onboarded_date    | Date     |                                                |

**Organisation**

A legal entity that owns assets. For an asset manager client, this is
each of their underlying clients. For an asset owner client, this is
themselves.

| **Field**            | **Type**            | **Notes**                                                                                                                            |
|----------------------|---------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| organisation_id      | UUID                |                                                                                                                                      |
| client_id            | FK → PlatformClient | Which platform client this organisation belongs to                                                                                   |
| organisation_name    | String              | e.g. "County Pension Fund"                                                                                                           |
| organisation_type    | Enum                | pension_fund, insurer, sovereign_wealth_fund, endowment, family_office, corporate_treasury, bank, asset_manager_balance_sheet, other |
| LEI                  | String              | Legal Entity Identifier (ISO 17442), if available                                                                                    |
| domicile             | String              |                                                                                                                                      |
| regulatory_framework | String              | e.g. "Solvency II", "LGPS", "ERISA" — drives reporting requirements                                                                  |
| reporting_currency   | String              | e.g. "GBP", "EUR", "USD"                                                                                                             |

**Account**

The vehicle or mandate through which an organisation holds investments.
An organisation may have multiple accounts (e.g. a segregated mandate, a
fund allocation, a co-investment sleeve).

| **Field**             | **Type**          | **Notes**                                                                            |
|-----------------------|-------------------|--------------------------------------------------------------------------------------|
| account_id            | UUID              |                                                                                      |
| organisation_id       | FK → Organisation |                                                                                      |
| account_name          | String            | e.g. "Infrastructure Debt Mandate 2023", "Fund IV", "Co-Investment Sleeve"           |
| account_type          | Enum              | segregated_mandate, commingled_fund, co_investment, direct, sma, fund_of_one         |
| account_reference     | String            | Client's own internal reference for this account                                     |
| inception_date        | Date              |                                                                                      |
| target_size           | Decimal           | Target allocation to this account                                                    |
| target_currency       | String            |                                                                                      |
| benchmark             | String            | e.g. "Gilts + 200bps", "SONIA + 250bps", "Absolute return 6%"                        |
| investment_guidelines | Text              | Summary of mandate restrictions (sector limits, rating floors, concentration limits) |
| status                | Enum              | active, in_runoff, closed                                                            |

**Holding**

The specific participation that an Account has in a specific Investment.
This is the join table that enables the many-to-many relationship
between accounts and investments. It records how much of each deal
belongs to each account.

| **Field**          | **Type**        | **Notes**                                                                                  |
|--------------------|-----------------|--------------------------------------------------------------------------------------------|
| holding_id         | UUID            |                                                                                            |
| account_id         | FK → Account    | Which account holds this participation                                                     |
| investment_id      | FK → Investment | Which deal this is a participation in                                                      |
| holding_amount     | Decimal         | Par/notional amount held by this account                                                   |
| holding_currency   | String          | Currency of the holding (may differ from deal currency if hedged)                          |
| acquisition_date   | Date            | Date this account acquired the holding                                                     |
| acquisition_price  | Decimal         | Price paid (percentage of par, e.g. 100.00, 98.50)                                         |
| acquisition_method | Enum            | primary_origination, primary_syndication, secondary_purchase, transfer_in, fund_allocation |
| current_amount     | Decimal         | Current outstanding par (may differ from original if amortising or partially sold)         |
| hedged             | Boolean         | Whether FX or interest rate hedged at account level                                        |
| hedge_details      | Text            | Summary of account-level hedging if applicable                                             |
| status             | Enum            | active, repaid, sold, defaulted, written_off                                               |
| disposal_date      | Date            | If sold, repaid, or written off                                                            |
| disposal_price     | Decimal         | If sold — percentage of par                                                                |

### Investment Identity and Identifiers

The Investment entity (defined in D.3) is expanded with comprehensive
deal identification fields. These identifiers are critical for
reconciliation, reporting, regulatory filing, and cross-referencing with
external data sources.

**Deal Identification Fields (added to Investment entity)**

| **Field**             | **Type** | **Notes**                                                                                                                                                                                                                             |
|-----------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| investment_name       | String   | Short deal name used on topsheet and portfolio views                                                                                                                                                                                  |
| borrower_legal_name   | String   | Full legal name of the borrowing entity                                                                                                                                                                                               |
| borrower_LEI          | String   | Legal Entity Identifier of the borrower                                                                                                                                                                                               |
| borrower_jurisdiction | String   | Jurisdiction of incorporation                                                                                                                                                                                                         |
| borrower_industry     | String   | Industry classification (NACE, SIC, GICS, or TICCS where infrastructure)                                                                                                                                                              |
| parent_group          | String   | Ultimate parent company or sponsor, if applicable                                                                                                                                                                                     |
| sponsor_name          | String   | Financial sponsor (PE firm, infrastructure fund), if applicable                                                                                                                                                                       |
| ISIN                  | String   | International Securities Identification Number, if issued                                                                                                                                                                             |
| CUSIP                 | String   | CUSIP identifier, if issued (primarily US/Canada)                                                                                                                                                                                     |
| SEDOL                 | String   | SEDOL identifier, if issued (primarily UK)                                                                                                                                                                                            |
| bloomberg_id          | String   | Bloomberg identifier, if available                                                                                                                                                                                                    |
| loan_xid              | String   | Markit/LoanX identifier for syndicated loans                                                                                                                                                                                          |
| internal_deal_id      | String   | Client's own internal deal reference                                                                                                                                                                                                  |
| facility_agent        | String   | Name of the facility agent (for syndicated deals)                                                                                                                                                                                     |
| security_trustee      | String   | Name of the security trustee                                                                                                                                                                                                          |
| deal_currency         | String   | Currency of the facility                                                                                                                                                                                                              |
| total_facility_size   | Decimal  | Total committed facility size (all lenders)                                                                                                                                                                                           |
| total_drawn           | Decimal  | Current drawn amount across all lenders                                                                                                                                                                                               |
| our_commitment        | Decimal  | Our total committed amount across all accounts                                                                                                                                                                                        |
| our_drawn             | Decimal  | Our total drawn amount across all accounts                                                                                                                                                                                            |
| deal_type             | Enum     | term_loan, revolving_credit, delayed_draw, capex_facility, mezzanine, unitranche, senior_secured, second_lien, holdco, payment_in_kind, private_placement, project_finance, WBS, infrastructure_debt, real_estate_debt, bridge, other |
| seniority             | Enum     | super_senior, senior_secured, senior_unsecured, second_lien, mezzanine, subordinated, payment_in_kind, equity_like                                                                                                                    |
| security_type         | Enum     | first_lien_all_assets, first_lien_specific, second_lien, unsecured, negative_pledge, project_finance_security_package, real_estate_mortgage, WBS_charge                                                                               |
| origination_date      | Date     | Date the facility was signed/closed                                                                                                                                                                                                   |
| maturity_date         | Date     | Contractual maturity                                                                                                                                                                                                                  |
| pricing_type          | Enum     | floating, fixed, index_linked, hybrid                                                                                                                                                                                                 |
| pricing_margin        | Decimal  | Margin over reference rate (bps) or fixed coupon (%)                                                                                                                                                                                  |
| reference_rate        | String   | e.g. "SONIA", "SOFR", "EURIBOR 3M", "Fixed", "RPI"                                                                                                                                                                                    |
| floor_rate            | Decimal  | Interest rate floor, if applicable                                                                                                                                                                                                    |
| amortisation_profile  | Enum     | bullet, amortising_scheduled, amortising_sculpted, cash_sweep, hybrid                                                                                                                                                                 |
| call_protection       | String   | Description of call protection / prepayment provisions                                                                                                                                                                                |
| governing_law         | String   | e.g. "English law", "New York law"                                                                                                                                                                                                    |
| syndicated            | Boolean  | Whether the deal is syndicated                                                                                                                                                                                                        |
| number_of_lenders     | Integer  | Total number of lenders in the syndicate                                                                                                                                                                                              |
| club_deal             | Boolean  | Whether this is a club deal (small syndicate, relationship-driven)                                                                                                                                                                    |
| bilateral             | Boolean  | Whether this is a bilateral (single lender) deal                                                                                                                                                                                      |

### How Portfolio Views Are Constructed

The entity hierarchy enables multiple portfolio views from the same
underlying data. The key principle is that deal-level data (covenants,
financials, risk register, documents) is stored once at the Investment
level, but portfolio views are constructed by filtering and aggregating
through the Holding → Account → Organisation → PlatformClient chain.

**View Types (flagged for detailed specification)**

The platform will support various portfolio views, including but not
limited to:

> • **Client portfolio view** — all holdings for a single Organisation,
> across all their Accounts. This is what the pension fund trustee or
> insurer CIO sees: their total private debt exposure, regardless of
> which mandate or fund it sits in.
>
> • **Account / mandate view** — holdings within a single Account. This
> is the mandate-level view that matches a specific investment
> management agreement, with performance measured against that mandate's
> benchmark.
>
> • **Fund view** — all holdings within a commingled fund, across all
> participating investors. The fund manager sees the full fund;
> individual LPs see only their share.
>
> • **Asset manager consolidated view** — all holdings across all
> Organisations and Accounts managed by the PlatformClient. This is the
> firm-wide view that the asset manager's CIO, risk team, and compliance
> function need.
>
> • **Sector / strategy view** — holdings filtered by sector, deal type,
> geography, risk classification, or revenue risk profile, cutting
> across accounts and organisations.
>
> • **Watchlist / exception view** — holdings where monitoring has
> flagged issues: covenant breaches, rating downgrades, deteriorating
> risk trends, overdue deliverables.
>
> • **Maturity / cash flow view** — holdings organised by maturity date,
> expected cash flows, or refinancing timeline.
>
> • **Regulatory reporting view** — holdings formatted for specific
> regulatory requirements (Solvency II SCR calculations, LGPS reporting,
> TCFD/climate disclosures) filtered by the Organisation's regulatory
> framework.
>
> • **Aggregated / anonymised market view** — cross-portfolio analytics
> available to all platform participants, with deal-specific identifiers
> stripped (see D.6 Anonymised Aggregation).

These views are parameterised queries against the same underlying data,
not separate data stores. The entitlements model (D.7) ensures each user
sees only what they are authorised to see.

### Entitlements and Data Isolation

The multi-client, multi-account structure creates strict data isolation
requirements:

> • **Investment-level data is shared.** The borrower's financial
> statements, covenant test results, and risk register exist once. All
> holders of that deal see the same underlying data. This is fundamental
> — you don't want different holders maintaining different covenant
> calculations for the same deal.
>
> • **Holding-level data is private.** Each account's commitment size,
> acquisition price, hedging arrangements, and allocation decisions are
> visible only to the account's Organisation and their authorised
> PlatformClient.
>
> • **Organisation-level data is isolated.** Pension Fund A cannot see
> that Insurance Company B also holds the same deal, or what their
> commitment size is. The asset manager can see both, but each
> underlying client sees only their own holdings.
>
> • **Portfolio views respect the hierarchy.** A user authenticated as
> belonging to Organisation X, Account Y, can only query holdings where
> account_id = Y or organisation_id = X (depending on their role). The
> asset manager's users can query across all organisations they manage.

This maps directly to the row-level security model described in D.7,
with the Holding entity as the access control boundary.

### Worked Example

Asset Manager "Acme Capital" manages infrastructure debt. They use the
platform for three clients plus their own balance sheet:

> PlatformClient: Acme Capital Management (asset_manager)
>
> │
>
> ├── Organisation: County Pension Fund (pension_fund, LGPS)
>
> │ └── Account: "Infrastructure Debt Mandate 2023" (segregated_mandate)
>
> │ ├── Holding: £80m in Project A (wind farm PF)
>
> │ ├── Holding: £45m in Project B (toll road)
>
> │ └── Holding: £30m in Corporate Gamma (data centre LBO)
>
> │
>
> ├── Organisation: National Life Insurance (insurer, Solvency II)
>
> │ └── Account: "Infra Fixed Income SMA" (sma)
>
> │ ├── Holding: £50m in Project A (wind farm PF)
>
> │ └── Holding: £60m in Project D (water utility WBS)
>
> │
>
> ├── Organisation: Acme Fund III LP (commingled fund)
>
> │ └── Account: "Acme Infrastructure Debt Fund III" (commingled_fund)
>
> │ ├── Holding: £40m in Project A (wind farm PF)
>
> │ ├── Holding: £35m in Project B (toll road)
>
> │ ├── Holding: £25m in Corporate Gamma (data centre LBO)
>
> │ └── Holding: £70m in Project E (airport concession)
>
> │
>
> └── Organisation: Acme Capital (GP balance sheet)
> (asset_manager_balance_sheet)
>
> └── Account: "GP Co-Investment" (co_investment)
>
> └── Holding: £30m in Project A (wind farm PF)

In this example:

> • **Project A** (total facility £400m, Acme total £200m) appears in
> four accounts. The Investment entity stores the deal data once. Four
> Holding records link it to four accounts. Acme's total commitment
> (£200m) is the sum of all holdings. The remaining £200m is held by
> other lenders not on the platform.
>
> • **County Pension Fund** sees only their three holdings totalling
> £155m. They cannot see that National Life also holds Project A, or
> what Acme's total take is.
>
> • **Acme's CIO** sees the consolidated view: 8 holdings across 5
> investments, £465m total exposure. They can drill into any
> investment's full monitoring data, filter by client, account, or
> sector.
>
> • **Acme's risk team** can run portfolio-level analytics across all
> £465m — concentration analysis, sector exposure, revenue risk
> distribution, maturity profile — while respecting the data isolation
> between underlying clients for any client-facing reporting.
>
> • **Fund III's LP reporting** shows Fund III's four holdings totalling
> £170m, with performance measured against Fund III's benchmark.
> Individual LP allocations within Fund III are a further level of
> detail that could be modelled as sub-accounts if needed.

### Revenue Risk and Risk Register at Portfolio Level

The revenue risk classification (Part E) and the risk register are
maintained at the Investment level — they describe the deal, not the
holder. But portfolio views aggregate them through holdings:

> • County Pension Fund's portfolio revenue risk profile: £80m P1-V2-D2
> (wind farm with CfD), £45m P2-V5-D1 (toll road), £30m P5-V5-D5 (data
> centre LBO) → 52% contracted, 29% hybrid, 19% merchant.
>
> • Acme's consolidated portfolio: £200m in P1-V2-D2, £80m in P2-V5-D1,
> £55m in P5-V5-D5, £60m in P3-V4-D1, £70m in P4-V5-D2 → different risk
> profile from any single client's view.

The same principle applies to risk heatmaps, covenant status summaries,
and watchlist construction — all are projections from Investment-level
data through the Holding → Account → Organisation chain.

## D.11 Document Intake Pipeline

### The Source of Data

The primary source of ongoing monitoring data is the periodic
information submitted by borrowers under the information covenants in
their finance documentation (see Part A, Categories 1 and 9). These
deliverables — compliance certificates, financial statements, operating
reports, budgets, and ad hoc notifications — arrive by email as
individual PDF attachments. Each document is a separate file; borrowers
do not bundle multiple document types into a single PDF.

The information covenants define what must be delivered, how often, and
in what timeframe. The platform's obligation scheduling engine (D.4)
tracks these deadlines. When a document arrives, the pipeline processes
it through a series of stages, ultimately populating the TopSheet (Part
F) with the extracted data and triggering the downstream cascade of
covenant tests, variance analysis, and alerting.

### Pipeline Stages

The end-to-end flow from email receipt to TopSheet update follows seven
stages. Each stage is logged as an event (D.4) and produces an immutable
audit record.

**Stage 1: Receipt and Security**

An email arrives at the platform's monitored mailbox (or document is
uploaded via portal). The system:

> • Extracts the PDF attachment and stores the original bytes in the
> Bronze layer (D.2, Layer 1) — immutable, never modified
>
> • Runs virus and malware scanning
>
> • Records metadata: sender, timestamp, subject line, filename, file
> size, SHA-256 checksum
>
> • If the virus scan fails, the document is quarantined and an alert is
> raised. Processing stops.

**Stage 2: Classification**

The AI classification agent examines the document and determines:

> • **What type of document is this?** Compliance certificate, financial
> statements, operating report, valuation report, consent request,
> notification, etc. The document type maps to the controlled list in
> Part A.
>
> • **Which investment does it belong to?** Matched by borrower name,
> deal reference, project name, or other identifying features against
> the portfolio. The agent uses the Investment entity fields (D.3) and
> deal identifiers (D.10) for matching.
>
> • **Which reporting period does it cover?** The period label, dates,
> and frequency are extracted and matched against the obligation
> schedule.

The classification is assigned a confidence score. If above threshold,
processing continues. If below — for example, a document from an
unfamiliar sender or with ambiguous deal references — an exception is
created and the document is queued for human classification (Tier 2 per
D.5).

**Stage 3: Obligation Matching**

The platform's deterministic engine matches the classified document
against the expected obligations for that investment and period:

> • Is there an outstanding obligation that this document fulfils?
>
> • Is the document on time, late, or within the grace period?
>
> • A Fulfilment record (D.3) is created linking the document to the
> obligation.

If the document arrives for a period where no obligation exists (e.g. an
unsolicited report), it is still processed but flagged for the HAM to
confirm whether it represents a new reporting pattern or one-off
submission.

**Stage 4: Data Extraction**

The AI extraction agent parses the document and proposes structured
data:

> • **Numeric fields** are extracted with their values, units, source
> locations (page number, table number, cell reference), and confidence
> scores. For a compliance certificate, this typically means a small
> number of covenant ratios and their components. For financial
> statements, this means the full P&L, balance sheet, and cashflow.
>
> • **Narrative notes** are extracted when the borrower has included
> commentary or explanations alongside the numbers. These are tagged as
> notes attached to the relevant data points — for example, if the
> compliance certificate includes a management note explaining why DSCR
> has declined, that note is stored against the DSCR value, not
> discarded. Narrative notes are visible on the TopSheet alongside the
> metric they relate to.
>
> • **Sector-specific KPIs** are extracted where present — passenger
> numbers, TEU volumes, charger utilisation, GPU counts, or whatever
> metrics the borrower reports for that sector (Part F, Section 7).

The extraction output is a set of ProposedFacts: structured records with
values, citations, confidence scores, and any associated narrative.
These are stored in the Silver layer (D.2, Layer 2) as proposals, not
yet committed.

**Stage 5: Validation and Reasonableness**

The platform's deterministic validation engine checks the proposed
extraction:

> • **Format validation:** Are the extracted values the right type?
> (Ratios are numeric, dates parse correctly, currencies match the
> deal.)
>
> • **Reasonableness checks:** Has a ratio moved by more than a
> configured percentage from the prior period? Is revenue negative? Is
> DSCR implausibly high or low?
>
> • **Completeness checks:** Were all expected fields extracted? For a
> compliance certificate that should contain DSCR, ICR, and leverage,
> were all three found?
>
> • **Cross-checks:** Do extracted components reconcile? (Does EBITDA
> minus interest minus tax minus capex approximately equal CFADS?)

Validation failures don't reject the extraction — they escalate the
tier. A Tier 1 extraction with a reasonableness failure becomes Tier 2
(requires human review).

**Stage 6: Approval and Commitment**

The tiered automation model (D.5) determines what happens next:

> • **Tier 1 (auto-commit):** Validation passed, confidence high,
> document type is simple. The platform commits the proposed facts to
> the Gold layer (D.2, Layer 3) — creating or updating the
> FinancialPeriod, populating the TopSheet fields (Part F), and logging
> the auto-approval with full audit trail. The HAM is notified via the
> dashboard but does not need to act.
>
> • **Tier 2 (review-then-commit):** The extraction is queued in the
> HAM's review dashboard. The HAM sees the proposed values alongside the
> source document with citations highlighted. The HAM can approve all,
> adjust individual values, or reject. On approval, the data commits to
> the Gold layer.
>
> • **Tier 3 (human-led):** For items requiring subjective judgement —
> e.g. interpreting a borrower's explanation for performance
> deterioration, deciding whether a technical covenant breach is
> material, updating the risk register — the system provides the
> analysis and the human decides.

**Stage 7: Downstream Cascade**

Once data is committed to the Gold layer, the platform's deterministic
engines fire automatically:

> • **Covenant testing:** Every committed financial period triggers
> ratio calculation against all configured covenant thresholds (Part F,
> Section 6). Tier status (lock-up, trigger, default) is assessed per
> Part B's framework.
>
> • **Variance analysis:** Reported figures are compared against
> expected performance (IC memo baseline). Material variances generate
> alerts.
>
> • **Distribution condition evaluation:** If the deal has distribution
> conditions (Part A, Category 11), all sub-conditions are retested.
>
> • **TopSheet snapshot:** A new versioned TopSheet snapshot is created
> (Part F, Section 17), capturing the complete deal state at this point
> in time.
>
> • **Portfolio aggregation:** Portfolio-level metrics are recalculated,
> updating the views described in D.10.
>
> • **Alerting:** If any covenant is breached, any tier status changes,
> or any configured threshold is crossed, alerts are generated for the
> HAM and, where configured, the PM.

### Narrative Notes Data Model

Borrower-provided narrative is preserved as structured notes attached to
data points. This ensures that context travels with the number — when a
HAM reviews a declining DSCR on the TopSheet, they see not just the
number but the borrower's explanation alongside it.

| **Field**             | **Type**             | **Notes**                                                                    |
|-----------------------|----------------------|------------------------------------------------------------------------------|
| note_id               | UUID                 |                                                                              |
| investment_id         | FK → Investment      |                                                                              |
| period_id             | FK → FinancialPeriod |                                                                              |
| data_field            | String               | Which field this note relates to (e.g. senior_quarterly_dscr, total_revenue) |
| note_source           | Enum                 | borrower_narrative, agent_observation, ham_commentary, pm_commentary         |
| note_text             | Text                 | The narrative content                                                        |
| source_document_id    | FK → Document        | Where the narrative was extracted from                                       |
| source_location       | String               | Page/section reference in the source document                                |
| extracted_at          | Timestamp            |                                                                              |
| extraction_confidence | Float                | For agent-extracted notes                                                    |

Notes with note_source = borrower_narrative are auto-committed (Tier 1)
— they are factual records of what the borrower said, not
interpretations. Notes with note_source = agent_observation (where the
agent flags something it noticed, e.g. "revenue recognition policy
appears to have changed") are committed but flagged for HAM attention.
Notes with note_source = ham_commentary or pm_commentary are Tier 3 —
human-authored.

### Pipeline Monitoring

The pipeline itself is monitored for operational health:

> • **Processing time SLA:** Document received to TopSheet updated
> within 4 hours for Tier 1, 24 hours for Tier 2 (including human review
> time)
>
> • **Extraction accuracy:** Tracked by comparing auto-approved
> extractions against subsequent human spot-checks. Target: \>98%
> field-level accuracy for Tier 1
>
> • **Queue depth:** Number of documents awaiting Tier 2 review, with
> ageing alerts
>
> • **Obligation coverage:** Percentage of expected deliverables
> received on time vs overdue, by deal and across the portfolio
>
> • **Classification accuracy:** Tracked by monitoring how often human
> reviewers override the agent's classification

# PART E: RISK REGISTER & ASSESSMENT FRAMEWORK

## Purpose

This document serves two distinct but complementary purposes.

### Purpose 1: A Thinking Tool for the Investment Team

Every private debt investment carries risks. The information memorandum
will usually identify some of them, but rarely all — and it will present
them from the borrower's perspective, not the lender's. The investment
team's own analysis is where the real risk assessment happens,
documented in the IC memorandum and defended in the investment
committee.

The risk register is designed to support that analytical process. It
provides a structured way of thinking about risk that ensures rigour,
consistency, and completeness — so that the team asks the right
questions before committing capital.

At its core, this is a checklist: a comprehensive catalogue of the
things that can go wrong in a private debt investment, organised by
category and sector. When analysing a new deal, the team works through
the register systematically. Not every risk will be relevant to every
deal — a leveraged loan to a software company has a very different risk
profile from a project finance facility for an offshore wind farm — but
every category should be considered and either assessed or consciously
marked as not applicable. The discipline of working through the full
register, rather than relying on the risks that happen to be salient or
that the borrower has highlighted, is what prevents blind spots.

The revenue risk classification framework extends this analytical
function. Before diving into the 226 individual risks, the team first
classifies the deal's revenue profile — how is the price set, what
drives volume, and how long does the revenue arrangement last relative
to the debt? This meta-classification provides the lens through which
the individual risks are interpreted: it tells you which risks matter
most for this particular deal, and where to focus analytical effort.

The register also provides the language for the IC memorandum and the
internal credit assessment. Rather than each analyst inventing their own
framework, the standardised taxonomy gives the team a common vocabulary
for describing and scoring risks. This makes IC papers more consistent,
more comparable, and easier to challenge.

### Purpose 2: A Portfolio-Level Mapping and Aggregation Framework

The second purpose is fundamentally different. Once every deal in the
portfolio has been assessed using the same taxonomy, the same scoring
methodology, and the same revenue risk classification, the platform can
aggregate and compare across the entire book.

This is where the framework moves from being an analytical tool for the
individual investment team to being a portfolio management and risk
oversight tool for the PM, the CIO, the risk function, and the client.
Specifically, it enables:

> • **Portfolio-wide risk heatmaps.** Which risks appear most frequently
> at High or Critical levels across the portfolio? Is refinancing risk
> (RISK-CF-015) concentrated in a particular vintage? Is counterparty
> credit risk (RISK-OP-007) elevated across the renewables book because
> a single offtaker appears in multiple deals?
>
> • **Revenue risk profiling.** What proportion of the portfolio's
> revenue is contracted (P1/P2) vs merchant (P5)? How much exposure is
> there to deals with duration coverage below 80% (D3/D4/D5)? Are
> contract expiries concentrated in a particular year? As legacy CfDs
> and PPAs expire across the renewables portfolio, is the aggregate
> merchant exposure drifting upward — and is the team aware of this?
>
> • **Trend analysis.** Are risks across the portfolio generally
> improving, stable, or deteriorating? If the number of deteriorating
> risks has increased from 8% to 15% over three quarters, that is a
> signal — even if no single deal has breached a covenant.
>
> • **Sector risk patterns.** Do certain sectors consistently carry
> specific risk concentrations? For example, if every data centre deal
> scores High on power availability (RISK-DC-001) and customer
> concentration (RISK-DC-003), that is a sector characteristic the team
> should be aware of when sizing allocations.
>
> • **Concentration analysis.** Is the portfolio over-exposed to a
> single risk factor, counterparty, regulatory regime, or revenue
> structure? The consistent taxonomy makes this visible in a way that
> deal-by-deal analysis cannot.
>
> • **Client and regulatory reporting.** Institutional clients (pension
> funds, insurers) increasingly require portfolio-level risk reporting.
> A standardised framework that can produce consistent, auditable risk
> metrics across a diverse private debt portfolio is a significant
> operational advantage — and for Solvency II insurers, the alignment
> with qualifying infrastructure criteria (which themselves focus on
> revenue predictability and contractual protections) is directly
> relevant.
>
> • **Anonymised market intelligence.** With sufficient portfolio
> volume, the aggregated risk data — stripped of deal-specific
> identifiers — can be published as market-level intelligence: what are
> the most common risk factors in European infrastructure debt? How do
> risk profiles differ between project finance and leveraged loans? What
> is the typical revenue risk classification for a UK wind farm financed
> in 2024? This feeds the platform's intelligence plane and positions it
> as a source of insight for the broader market.

### How the Two Purposes Reinforce Each Other

These two purposes are not independent — they create a virtuous cycle.
The analytical discipline of Purpose 1 (thorough, consistent risk
assessment at the deal level) produces the high-quality, standardised
data that Purpose 2 (portfolio aggregation and intelligence) requires.
Conversely, the portfolio-level patterns revealed by Purpose 2 feed back
into Purpose 1: if the aggregated data shows that a particular risk
factor is consistently under-assessed at origination but frequently
materialises during monitoring, the framework can be updated to
emphasise that risk and the team can be trained accordingly.

The rating agency research reviewed in developing this framework —
Moody's project finance default studies, Scope's 23-factor methodology,
Fitch's sector-specific criteria, and EDHEC's TICCS classification — all
support this dual approach. The agencies use standardised risk
taxonomies both to assess individual credits and to produce the
cross-sector default and recovery statistics that inform portfolio-level
decisions. This framework brings the same discipline to the private debt
investment manager's own book.

## Assessment Methodology

### Scoring Dimensions

Each identified risk is assessed on two dimensions:

| **Dimension**  | **Score**          | **Description**                                                                                                              |
|----------------|--------------------|------------------------------------------------------------------------------------------------------------------------------|
| **Likelihood** | 1 — Remote         | Highly unlikely to occur during the life of the investment                                                                   |
|                | 2 — Unlikely       | Could occur but not expected in the base case                                                                                |
|                | 3 — Possible       | Reasonable possibility; may have occurred in comparable situations                                                           |
|                | 4 — Likely         | More likely than not to occur at some point during the investment                                                            |
|                | 5 — Almost Certain | Expected to occur; may already be emerging                                                                                   |
| **Severity**   | 1 — Negligible     | Minimal impact on debt service or recovery                                                                                   |
|                | 2 — Minor          | Some impact on performance but covenants comfortably met; no loss expected                                                   |
|                | 3 — Moderate       | Could cause covenant pressure, lock-up, or require amendment/waiver; potential for reduced margin but full recovery expected |
|                | 4 — Major          | Likely to cause covenant breach or trigger event; potential for principal impairment                                         |
|                | 5 — Critical       | Could cause event of default, enforcement, or material loss of principal                                                     |

### Risk Score

Risk Score = Likelihood × Severity (range: 1–25)

| **Score Range** | **Risk Level** | **Topsheet Colour** | **Action**                                                     |
|-----------------|----------------|---------------------|----------------------------------------------------------------|
| 1–4             | Low            | Green               | Monitor at standard frequency                                  |
| 5–9             | Moderate       | Amber               | Enhanced monitoring; note in quarterly commentary              |
| 10–15           | High           | Orange              | Active management; discuss with PM; consider mitigant adequacy |
| 16–25           | Critical       | Red                 | Immediate escalation; remedial plan; potential rating action   |

### Trend Indicator

In addition to the absolute score, each risk carries a trend indicator
updated at each review:

| **Trend**     | **Symbol** | **Meaning**                                   |
|---------------|------------|-----------------------------------------------|
| Improving     | ↑          | Risk reducing since last assessment           |
| Stable        | →          | No material change                            |
| Deteriorating | ↓          | Risk increasing since last assessment         |
| New           | ★          | Newly identified risk not in prior assessment |

## Risk Taxonomy

### Category 1: Credit & Financial Risk

*Risks related to the borrower's ability to generate cash flow and
service the debt.*

| **ID**      | **Risk**                                 | **Description**                                                                                     | **Typical Relevance**          | **Key Indicators**                                                        |
|-------------|------------------------------------------|-----------------------------------------------------------------------------------------------------|--------------------------------|---------------------------------------------------------------------------|
| RISK-CF-001 | **Revenue concentration**                | Dependence on a small number of customers, contracts, or revenue streams                            | All sectors                    | Top 5 customer concentration %; single contract reliance                  |
| RISK-CF-002 | **Revenue cyclicality / volatility**     | Exposure to economic cycles, seasonal patterns, or demand variability                               | Corporate, real estate         | Revenue volatility (CoV); correlation with GDP/sector indices             |
| RISK-CF-003 | **Revenue visibility**                   | Certainty of future revenues — contracted vs speculative                                            | All sectors                    | % contracted revenue; weighted average contract life (WACL)               |
| RISK-CF-004 | **Cost structure rigidity**              | Proportion of fixed vs variable costs; ability to flex costs in a downturn                          | Corporate, infrastructure      | Operating leverage; fixed cost as % of revenue                            |
| RISK-CF-005 | **Margin compression**                   | Risk of declining margins from competition, input costs, or pricing pressure                        | Corporate, real estate         | Gross margin trend; EBITDA margin trend; input cost exposure              |
| RISK-CF-006 | **Working capital volatility**           | Risk of cash absorption from working capital movements                                              | Corporate                      | Days sales outstanding; inventory days; cash conversion cycle             |
| RISK-CF-007 | **Capital expenditure requirements**     | Mandatory or expected capex to maintain competitive position or asset condition                     | All sectors                    | Capex / revenue; capex / depreciation; deferred maintenance               |
| RISK-CF-008 | **EBITDA quality / adjustment reliance** | Extent to which covenant EBITDA depends on pro-forma adjustments, add-backs, or non-recurring items | Corporate (leveraged)          | Adjustments as % of EBITDA; synergy add-back reliance; trend              |
| RISK-CF-009 | **Cash flow timing mismatch**            | Mismatch between when cash is received and when debt service is due                                 | Project finance, PFI           | Seasonal cash flow profile vs debt service schedule                       |
| RISK-CF-010 | **Leverage trajectory**                  | Risk that leverage increases rather than de-levers over time                                        | Corporate, acquisition finance | Net Debt / EBITDA trend; amortisation schedule; cash sweep effectiveness  |
| RISK-CF-011 | **Interest rate exposure**               | Sensitivity of debt service to interest rate movements                                              | All sectors (floating rate)    | % hedged; hedge tenor vs debt tenor; base rate sensitivity on DSCR        |
| RISK-CF-012 | **Currency exposure**                    | Mismatch between revenue currency and debt currency                                                 | Cross-border deals             | % natural hedge; derivative cover; translation vs transaction risk        |
| RISK-CF-013 | **Pension / deferred obligations**       | Risk from defined benefit pension deficit or other long-term obligations                            | Corporate (especially UK)      | Pension deficit as % of EBITDA; funding schedule; regulatory risk         |
| RISK-CF-014 | **Tax risk**                             | Changes to tax regime, transfer pricing challenges, or deferred tax crystallisation                 | All sectors                    | Effective tax rate trend; jurisdictional risk; BEPS / Pillar Two exposure |
| RISK-CF-015 | **Refinancing risk**                     | Risk that the borrower cannot refinance at maturity                                                 | All sectors                    | Maturity wall; estimated refinancing leverage; market conditions          |

### Category 2: Structural & Documentation Risk

*Risks arising from the legal structure, documentation terms, and
creditor protections.*

| **ID**      | **Risk**                                     | **Description**                                                                            | **Typical Relevance**          | **Key Indicators**                                                                   |
|-------------|----------------------------------------------|--------------------------------------------------------------------------------------------|--------------------------------|--------------------------------------------------------------------------------------|
| RISK-ST-001 | **Covenant adequacy**                        | Whether financial covenants provide adequate early warning of distress                     | All sectors                    | Covenant headroom at close; number of financial covenants; maintenance vs incurrence |
| RISK-ST-002 | **Covenant leakage / EBITDA definition**     | Risk that covenant definitions allow the borrower to present a flattering picture          | Corporate (leveraged)          | Breadth of permitted add-backs; pro-forma provisions; cap levels                     |
| RISK-ST-003 | **Restricted payment controls**              | Adequacy of controls preventing value leakage to equity holders                            | All sectors                    | Lock-up thresholds; distribution conditions; restricted payment baskets              |
| RISK-ST-004 | **Permitted debt / incremental facilities**  | Risk that the borrower can incur additional senior or pari passu debt                      | Corporate (leveraged)          | Incremental facility capacity; permitted debt baskets; ratio-based incurrence tests  |
| RISK-ST-005 | **Security package**                         | Quality and enforceability of security over assets, shares, and accounts                   | All sectors                    | Assets covered; jurisdiction of security; priority; perfection status                |
| RISK-ST-006 | **Intercreditor complexity**                 | Risk from multiple creditor classes with competing interests                               | Multi-tranche                  | Number of creditor classes; intercreditor agreement terms; turnover provisions       |
| RISK-ST-007 | **Amendment / waiver risk**                  | Risk that majority lenders agree changes that disadvantage minority holders                | All sectors                    | Majority threshold; all-lender matters; snooze provisions; yank clause               |
| RISK-ST-008 | **Subordination / structural subordination** | Risk of effective subordination through holding company structure or guarantees            | Corporate, acquisition finance | Borrower vs holdco cash flows; guarantee structure; restricted group perimeter       |
| RISK-ST-009 | **Change of control provisions**             | Adequacy of protections if ownership changes                                               | All sectors                    | Change of control trigger; put option; consent requirements                          |
| RISK-ST-010 | **Governing law / enforcement jurisdiction** | Risk that the governing law or jurisdiction makes enforcement difficult                    | Cross-border                   | Jurisdiction; choice of law; recognition of judgments; local law opinions            |
| RISK-ST-011 | **Matching adjustment eligibility**          | Risk that structural features or amendments could jeopardise matching adjustment treatment | UK insurers                    | Cash flow predictability; subordination; permitted amendments                        |

### Category 3: Business & Operational Risk

*Risks related to the borrower's business operations and competitive
position.*

| **ID**      | **Risk**                                       | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **Typical Relevance**                | **Key Indicators**                                                                                                                                                                                             |
|-------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-OP-001 | **Management quality / key person**            | Dependence on specific individuals; management depth and track record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | All sectors                          | Key person provisions; management tenure; succession planning                                                                                                                                                  |
| RISK-OP-002 | **Competitive position**                       | Sustainability of the borrower's market position and competitive advantages                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Corporate                            | Market share; barriers to entry; brand strength; switching costs                                                                                                                                               |
| RISK-OP-003 | **Technology / disruption risk**               | Risk that technology change undermines the business model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Corporate, infrastructure            | Industry disruption history; digital substitution risk; capex on innovation                                                                                                                                    |
| RISK-OP-004 | **Supply chain risk**                          | Dependence on critical suppliers; supply chain fragility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Corporate, project finance           | Single source suppliers; geographic concentration; inventory buffers                                                                                                                                           |
| RISK-OP-005 | **Operational concentration**                  | Dependence on single site, facility, or geographic location                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | All sectors                          | Number of operating sites; revenue by geography; single asset exposure                                                                                                                                         |
| RISK-OP-006 | **Labour / workforce risk**                    | Risk from labour shortages, strikes, or wage inflation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | All sectors                          | Unionisation; labour market tightness; staff turnover                                                                                                                                                          |
| RISK-OP-007 | **Counterparty credit risk**                   | Risk that a critical counterparty (offtaker, anchor tenant, concession grantor, O&M contractor) defaults, terminates, or fails to perform. The severity of this risk depends not just on the counterparty's credit quality but on the replaceability of the contract and its pricing. In a liquid market with diverse demand, a counterparty paying market rates going bust is manageable — a replacement can be found at similar terms. But if the counterparty is paying above-market rates (e.g. an above-market PPA, an above-market lease, a legacy tolling agreement), the borrower's business case depends on continuing to receive those high rates, and finding a replacement at equivalent terms may be impossible. The assessment must therefore consider: (1) counterparty credit quality, (2) is the contract at, above, or below market rates, (3) how liquid is the replacement market, and (4) what is the cost and time to replace | All sectors with contracted revenue  | Counterparty credit rating; contract price vs current market; market liquidity for replacement; notice period; step-in rights; performance bond/guarantee                                                      |
| RISK-OP-008 | **Contract renewal / re-pricing risk**         | Risk that when a key revenue contract expires, it cannot be renewed on equivalent terms — or at all. This is one of the most important structural risks in private debt, affecting any deal where the financing term extends beyond the initial contract term. Examples: a PFI concession nearing expiry; a PPA that expires 5 years before debt maturity; a lease expiring mid-financing; an O&M contract coming up for renewal with potential cost increases. The "merchant tail" — the period after contracted revenue expires — represents a fundamental shift from contracted to market risk. Assessment should consider: remaining contract term vs remaining debt term, likelihood and terms of renewal, fallback revenue if not renewed, and whether the financial model's base case relies on post-contract revenue                                                                                                                        | All sectors with contracted revenue  | Contract expiry date vs debt maturity; renewal options and conditions; merchant tail duration; post-contract revenue assumptions in model; comparable renewal experience; market conditions for re-contracting |
| RISK-OP-009 | **Equipment lifecycle / major component risk** | Risk that critical equipment requires replacement earlier than planned, at higher cost than reserved, or that replacement components are unavailable. Applies across all asset-heavy sectors: turbine gearboxes and blades (wind), inverters and panels (solar), rolling stock bogies and traction motors (rail), building services plant (real estate), road pavement (highways), process equipment (thermal generation). The financial model's lifecycle reserve assumptions are a key area of scrutiny — are failure rates realistic, are cost escalation assumptions adequate, and is there contingency for supply chain delays?                                                                                                                                                                                                                                                                                                                | All asset-intensive sectors          | Lifecycle reserve model; independent technical assessment; historical failure rates; component lead times; manufacturer warranty coverage; reserve adequacy vs independent estimate                            |
| RISK-OP-010 | **Decommissioning / end-of-life cost risk**    | Risk that the cost of decommissioning, dismantling, or restoring an asset at end of life exceeds provisions, or that the obligation crystallises earlier than expected. Relevant for: wind and solar farms (blade and panel disposal, site restoration), offshore infrastructure (platform removal), pipelines (purging, removal, remediation), thermal plants (demolition, contamination), PFI (hand-back condition). Regulatory requirements for decommissioning are tightening, and costs for some materials (e.g. composite wind turbine blades) have no established recycling route                                                                                                                                                                                                                                                                                                                                                            | All infrastructure sectors           | Decommissioning bond or provision; regulatory requirements; cost estimate quality; environmental liability; recyclability of materials; site restoration obligations                                           |
| RISK-OP-011 | **Health, safety & environmental**             | Operational HSE incidents; environmental liability; remediation costs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Infrastructure, corporate            | Incident history; environmental permits; remediation provisions                                                                                                                                                |
| RISK-OP-012 | **Cyber / IT risk**                            | Risk of cyber attack, data breach, or IT system failure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | All sectors                          | IT infrastructure maturity; incident history; insurance coverage                                                                                                                                               |
| RISK-OP-013 | **Insurance adequacy**                         | Risk that insurance coverage is insufficient for material loss events                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | All sectors                          | Coverage vs replacement value; exclusions; deductibles; insurer quality                                                                                                                                        |
| RISK-OP-014 | **Construction / completion risk**             | Risk that a project is not completed on time, on budget, or to specification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Project finance, PFI                 | Construction progress; contractor credit; delay/cost overrun exposure; liquidated damages                                                                                                                      |
| RISK-OP-015 | **Performance / availability risk**            | Risk that the asset or project underperforms once operational                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Project finance, PFI, infrastructure | Performance track record; performance bond; penalty regime                                                                                                                                                     |

### Category 4: Market & Macroeconomic Risk

*Risks arising from the external economic, market, and geopolitical
environment. Market and competitive risks should be assessed at three
levels: the total addressable market (is overall demand growing or
shrinking?), inter-modal or inter-product competition (are alternative
solutions competing for the same demand?), and intra-modal competition
(how many competitors are offering the same solution?).*

| **ID**      | **Risk**                                      | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Typical Relevance**                                     | **Key Indicators**                                                                                                                                                                                          |
|-------------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-MK-001 | **Economic cycle exposure**                   | Sensitivity of the business to GDP, consumer spending, or investment cycles                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Corporate, real estate                                    | Revenue beta to GDP; cyclical vs defensive classification                                                                                                                                                   |
| RISK-MK-002 | **Inflation exposure**                        | Impact of inflation on costs, revenues, and real returns. Critically, assess differential inflation risk — the mismatch between how revenues and costs are indexed. For example: revenues may be indexed to CPI, but operating costs are driven by wage inflation (which may exceed CPI), energy costs (which are volatile and follow commodity markets), or materials costs (which follow construction indices). If revenue indexation lags behind cost inflation, margins erode even in a nominally "inflation-protected" structure. Assess: what index drives revenue, what drives each major cost category, and what is the historical basis risk between them                                                                                                                                                                                                                                    | All sectors                                               | Inflation pass-through ability; revenue index vs cost index mismatch; index-linked revenue as % of total; real vs nominal debt service; wage inflation vs CPI gap; materials cost escalation                |
| RISK-MK-003 | **Interest rate environment**                 | Impact of rate environment on borrower viability and asset values. Assessment must go beyond simple floating rate exposure to consider the form, duration, and adequacy of any interest rate hedging — and how this interacts with leverage. Key questions: what is the hedge tenor relative to debt maturity? What happens when the hedge rolls off — can the borrower afford the unhedged rate at current leverage? What is the mark-to-market exposure on the hedge (a deeply out-of-money swap is a contingent liability on refinancing)? This risk was starkly demonstrated in 2022–23 UK real estate, where high leverage had been coupled with short-dated hedging — when rates rose sharply, borrowers simultaneously faced higher debt service costs and declining asset values (cap rate expansion), creating a double squeeze that triggered widespread covenant breaches and forced sales | All sectors                                               | Hedge tenor vs debt maturity; hedge mark-to-market; unhedged rate sensitivity at current leverage; floating rate exposure; base rate sensitivity on DSCR; refinancing rate assumptions; break cost exposure |
| RISK-MK-004 | **Real estate market / valuation risk**       | Risk of asset devaluation due to market movements, including interest rate-driven cap rate expansion. Rising interest rates directly compress property values through higher discount rates, wider cap rates, and reduced buyer leverage capacity. This interacts with loan covenants — LTV tests can breach even if rental income is stable, purely from valuation decline. Assessment should consider both income-driven value change (occupancy, rental growth) and yield-driven value change (cap rate movement from rate environment, market sentiment, capital flows)                                                                                                                                                                                                                                                                                                                           | Real estate, asset-backed                                 | Current LTV; cap rate sensitivity to rate movements; vacancy trends; comparable transactions; rental growth vs cap rate expansion; valuation methodology; WAULT impact on value                             |
| RISK-MK-005 | **Commodity / input price exposure**          | Dependence on specific commodity or input prices that the borrower must purchase — fuel, feedstock, raw materials, energy. Assess whether input costs are fixed by contract, hedged, or exposed to spot markets, and for how long                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Corporate, infrastructure                                 | Key commodity exposures; hedging programme; pass-through mechanisms; contract vs spot procurement; hedge tenor                                                                                              |
| RISK-MK-006 | **Output price / revenue price risk**         | Risk that the prices the borrower receives for its product or service decline. Distinct from input price risk — this is about the selling side. Key question: are output prices fixed by long-term contract, or determined by the market at the time of sale? Assessment must consider where the borrower sits on the cost curve. A lowest-cost producer (e.g. a well-sited onshore wind farm in a merchant market) will always be dispatched and can survive low prices. A high-cost producer (e.g. a diesel peaker or a high-cost mine) only operates when market prices are high enough, and is first to be shut out when prices fall. For any merchant exposure: what is the price floor at which the business remains viable, and what is the probability of prices falling to that level?                                                                                                       | All sectors with merchant revenue                         | Contracted vs merchant revenue split; contract tenor; cost curve position (quartile); breakeven price; historical price volatility; forward price vs breakeven; hedging programme                           |
| RISK-MK-007 | **Total addressable market (TAM) risk**       | Risk that the overall market for the product or service shrinks due to structural change, demographic shifts, or behavioural change. For example, total demand for London–Edinburgh travel, total electricity demand in a grid zone, or total demand for office space in a city                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | All sectors                                               | Market growth trend; structural demand drivers; substitution risk; demographic projections                                                                                                                  |
| RISK-MK-008 | **Inter-modal / inter-product competition**   | Risk from competition between fundamentally different solutions serving the same underlying demand. For example: rail vs air vs road for London–Edinburgh travel; gas generation vs solar vs wind vs nuclear for electricity supply; on-premise vs cloud vs colocation for computing capacity. A new mode or product can capture share from incumbents even if total demand is stable                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Transport, energy, technology, telecoms                   | Market share by mode/product; relative cost trajectory; switching costs between modes; policy or regulatory bias towards specific modes                                                                     |
| RISK-MK-009 | **Intra-modal / within-market competition**   | Risk from competition within the same product or service category. For example: EasyJet vs BA on the same route; two solar farms bidding into the same grid zone; multiple data centre operators in the same metro market. This is about market share, pricing power, and differentiation within an established category                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | All sectors                                               | Market concentration (HHI); number of competitors; pricing trends; differentiation; customer loyalty; capacity utilisation                                                                                  |
| RISK-MK-010 | **Market position / incumbent vs challenger** | Whether the borrower is an established incumbent with scale advantages (brand, customer base, network effects, regulatory relationships) or a new entrant/challenger trying to disrupt with new technology, lower cost, or better service. Incumbents face disruption risk; challengers face execution and adoption risk. For example: an established telco with legacy infrastructure vs a fibre-only challenger; a legacy airline vs a low-cost carrier; an established utility vs a renewable energy-only supplier                                                                                                                                                                                                                                                                                                                                                                                 | Corporate, telecoms, energy, transport                    | Market share; years in market; customer acquisition cost; churn rate; brand awareness; technology advantage/disadvantage; network effects                                                                   |
| RISK-MK-011 | **Disruptive technology / new entrant risk**  | Risk that a new technology, business model, or entrant fundamentally changes the competitive landscape. Distinct from RISK-OP-003 (which covers technology risk within the business) — this is about external disruption to the market. For example: autonomous vehicles disrupting traditional transport; AI disrupting professional services; distributed solar disrupting centralised generation; satellite internet disrupting fixed-line broadband                                                                                                                                                                                                                                                                                                                                                                                                                                               | All sectors                                               | Technology maturity curve; rate of adoption; cost parity timeline; regulatory barriers to entry; patent/IP landscape                                                                                        |
| RISK-MK-012 | **Power / electricity price risk**            | Risk from wholesale electricity price volatility, basis risk between contracted and market prices, or structural decline in power prices due to renewables penetration (cannibalisation). Critical for any asset with merchant power exposure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Renewable energy, energy transition, power infrastructure | Contracted vs merchant revenue split; PPA tenor; capture price vs baseload price; cannibalisation modelling; capacity market revenue                                                                        |
| RISK-MK-013 | **Geopolitical / country risk**               | Exposure to political instability, sanctions, or sovereign risk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Cross-border                                              | Country risk ratings; sanction exposure; expropriation history; political stability                                                                                                                         |
| RISK-MK-014 | **Liquidity / secondary market risk**         | Risk that the investment cannot be sold or transferred at fair value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | All sectors (illiquid)                                    | Transferability provisions; market depth; historical secondary pricing                                                                                                                                      |
| RISK-MK-015 | **Contagion / sector sentiment**              | Risk that problems elsewhere in the sector affect market perception or funding availability                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | All sectors                                               | Sector concentration in portfolio; sector stress events; lender appetite                                                                                                                                    |
| RISK-MK-016 | **Supply chain / equipment market risk**      | Risk that equipment or materials cannot be procured at acceptable cost or timeline due to global supply constraints, trade restrictions, or manufacturing bottlenecks. For example: solar panel supply chains, wind turbine lead times, transformer and switchgear availability, semiconductor supply for data centres                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Renewable energy, infrastructure, data centres            | Equipment lead times; supplier concentration; trade restriction exposure; commodity input costs; order book visibility                                                                                      |

### Category 5: Regulatory & Legal Risk

*Risks arising from the legal, regulatory, and political environment.*

| **ID**      | **Risk**                            | **Description**                                                                                      | **Typical Relevance**                              | **Key Indicators**                                                   |
|-------------|-------------------------------------|------------------------------------------------------------------------------------------------------|----------------------------------------------------|----------------------------------------------------------------------|
| RISK-RL-001 | **Regulatory regime change**        | Risk that changes to the regulatory framework adversely affect the business                          | Regulated sectors (utilities, transport, telecoms) | Regulatory review dates; political environment; precedent decisions  |
| RISK-RL-002 | **Licence / concession risk**       | Risk of licence revocation, non-renewal, or adverse modification                                     | PFI, WBS, infrastructure                           | Licence term; renewal conditions; regulatory track record            |
| RISK-RL-003 | **Environmental regulation**        | Risk from tightening environmental standards, carbon pricing, or net zero requirements               | All sectors                                        | Carbon intensity; environmental compliance history; transition risk  |
| RISK-RL-004 | **Tax law changes**                 | Risk that tax changes reduce cash flow or increase effective tax rate                                | All sectors                                        | Jurisdiction stability; current incentives at risk; BEPS exposure    |
| RISK-RL-005 | **Employment / labour law changes** | Risk from minimum wage increases, labour regulation changes                                          | Corporate, PFI                                     | Labour cost as % of revenue; jurisdiction; regulatory pipeline       |
| RISK-RL-006 | **Planning / permitting risk**      | Risk that planning permissions, building permits, or environmental permits are challenged or revoked | Real estate, infrastructure                        | Planning status; judicial review exposure; community opposition      |
| RISK-RL-007 | **Litigation / claims exposure**    | Risk of material litigation, arbitration, or regulatory enforcement                                  | All sectors                                        | Current proceedings; contingent liabilities; class action exposure   |
| RISK-RL-008 | **Sanctions / AML / KYC risk**      | Risk that parties to the transaction are or become subject to sanctions                              | Cross-border                                       | Jurisdiction exposure; beneficial ownership clarity; PEP involvement |
| RISK-RL-009 | **Data protection / privacy**       | Risk from GDPR, data breach liability, or privacy regulation                                         | Corporate (especially tech, healthcare)            | Data processing activities; compliance maturity; breach history      |

### Category 6: ESG & Climate Risk

*Environmental, social, and governance risks that may affect
creditworthiness or investment eligibility.*

| **ID**       | **Risk**                                 | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | **Typical Relevance**                                | **Key Indicators**                                                                                                                                                                                                                         |
|--------------|------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-ESG-001 | **Physical climate risk**                | Risk from extreme weather events, flooding, sea level rise, temperature extremes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | All sectors (especially real estate, infrastructure) | Location exposure; insurance coverage; climate adaptation measures                                                                                                                                                                         |
| RISK-ESG-002 | **Transition risk**                      | Risk from the transition to a low-carbon economy — stranded assets, carbon pricing, demand shifts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | All sectors                                          | Carbon intensity; decarbonisation pathway; exposure to fossil fuel dependency                                                                                                                                                              |
| RISK-ESG-003 | **Biodiversity / natural capital**       | Risk from biodiversity loss, water scarcity, or natural resource depletion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Infrastructure, agriculture, extractive              | Environmental impact assessments; proximity to protected areas; water stress                                                                                                                                                               |
| RISK-ESG-004 | **Social licence / community relations** | Risk of community opposition, reputational damage, or loss of social licence to operate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Infrastructure, real estate, PFI                     | Community engagement history; public perception; protest history                                                                                                                                                                           |
| RISK-ESG-005 | **Labour practices / human rights**      | Risk from supply chain labour standards, modern slavery exposure, or human rights violations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Corporate                                            | Supply chain transparency; modern slavery statement quality; controversy history                                                                                                                                                           |
| RISK-ESG-006 | **Corporate governance**                 | Quality of board, management oversight, reporting transparency, and internal controls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | All sectors                                          | Board independence; audit quality; related party transactions; reporting timeliness                                                                                                                                                        |
| RISK-ESG-007 | **Sponsor / shareholder governance**     | Risk from financial sponsor behaviour that prioritises equity returns over credit quality. Focus on low-probability but high-impact aggressive actions: dividend recapitalisations that re-lever the business; asset stripping or sale of crown-jewel assets; loading additional debt through permitted baskets; weakening covenants through serial amendments; related-party transactions at non-arm's-length terms; aggressive use of EBITDA add-backs to flatter headroom; short-termism in maintenance or capex decisions that degrades long-term asset value. Assessment should consider the sponsor's track record across their portfolio, not just statements of intent | Sponsored deals                                      | Sponsor track record across portfolio; distribution history vs covenant headroom; leverage trajectory post-acquisition; frequency of amendment requests; EBITDA adjustment trends; capex vs depreciation; related-party transaction volume |
| RISK-ESG-008 | **Greenwashing / taxonomy alignment**    | Risk that sustainability claims do not withstand scrutiny; EU Taxonomy alignment risk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | All sectors (where ESG-labelled)                     | Taxonomy eligibility; verification; use of proceeds tracking                                                                                                                                                                               |

### Category 7: Sector-Specific Risk

*Risks that are specific to particular sectors. Not all will apply to
any given deal — the investment team selects those relevant to the
sector. Organised into sub-categories by sector group.*

**7A: Renewable Energy — Solar**

| **ID**      | **Risk**                             | **Description**                                                                                                                                                                                                                                                      | **Key Indicators**                                                                                                                                          |
|-------------|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RE-001 | **Solar resource / irradiance risk** | Risk that actual solar irradiance is lower than modelled, due to measurement error in the resource assessment, climate variability, or long-term irradiance trends. P50 vs P90 yield gap is a key structural risk                                                    | Independent resource assessment quality; measurement period length; P50/P75/P90 yield estimates; actual vs modelled yield history; inter-annual variability |
| RISK-RE-002 | **Panel degradation**                | Risk that solar panel output degrades faster than warranted. Typical manufacturer warranty: 0.4–0.5% per year linear degradation, but actual degradation can vary by technology (mono vs poly, bifacial), climate (hot/humid accelerates), and manufacturing quality | Technology type; manufacturer tier; degradation warranty terms; independent degradation testing; fleet performance data                                     |
| RISK-RE-003 | **Inverter failure / availability**  | Inverters are the most failure-prone component in a solar plant. String inverters have shorter lives (10–15 years) than central inverters but are easier to replace. Inverter failure causes disproportionate energy loss                                            | Inverter type (string vs central); manufacturer track record; warranty terms; spare parts strategy; replacement reserve adequacy                            |
| RISK-RE-004 | **Soiling and shading**              | Risk that panel output is reduced by dust, pollen, bird droppings, snow, or vegetation growth causing shading. Cleaning costs and schedule affect O&M budget                                                                                                         | Site location (arid = high soiling); cleaning frequency; tracker vs fixed tilt; vegetation management plan                                                  |
| RISK-RE-005 | **Solar technology obsolescence**    | Risk that the economic value of existing panels is undermined by new technology (e.g. perovskite, tandem cells) that produces significantly cheaper or more efficient generation, compressing merchant power prices or making repowering uneconomic                  | Technology generation; efficiency relative to current best; repowering optionality; land lease terms                                                        |

**7B: Renewable Energy — Wind**

| **ID**      | **Risk**                               | **Description**                                                                                                                                                                                                                                                     | **Key Indicators**                                                                                                                                                                             |
|-------------|----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RE-011 | **Wind resource risk**                 | Risk that actual wind speeds are lower than modelled. Wind resource assessment is inherently uncertain — a small error in mean wind speed produces a larger error in energy output (cubic relationship). Offshore generally more reliable but measurement is harder | Measurement campaign duration (ideally 2+ years on-site); correlation methodology; P50/P75/P90 yield estimates; wake loss modelling; long-term wind speed trends                               |
| RISK-RE-012 | **Turbine availability / reliability** | Risk that turbines achieve lower availability than warranted due to mechanical failure, gearbox issues, blade damage, or control system faults. Availability warranties typically 95–97% but may exclude force majeure or grid curtailment                          | Turbine manufacturer track record; technology maturity (proven platform vs new model); warranty terms and duration; independent technical adviser assessment; fleet data from comparable sites |
| RISK-RE-013 | **Blade erosion and fatigue**          | Leading edge erosion from rain, hail, and particulates reduces aerodynamic efficiency and can require costly blade repair or replacement. Blade fatigue is a long-term structural risk, particularly for larger modern turbines                                     | Blade length (longer = more exposure); site conditions (coastal = salt spray); manufacturer blade warranty; inspection regime; repair cost provisions                                          |
| RISK-RE-014 | **Gearbox and drivetrain failure**     | Gearbox failure is among the most expensive single-component failures in wind. Direct-drive turbines eliminate gearbox risk but have different failure modes (generator bearing). Replacement cost can be £200k–£500k+ per turbine plus crane mobilisation          | Drivetrain type (geared vs direct-drive); manufacturer warranty period; gearbox endoscopy schedule; crane access logistics; major component reserve                                            |
| RISK-RE-015 | **Wake effects and array losses**      | In multi-turbine arrays, upstream turbines reduce wind speed for downstream turbines. Wake losses can be 5–15% and are affected by turbine spacing, prevailing wind direction, and atmospheric stability. Risk increases if adjacent wind farms are built           | Array layout; turbine spacing; prevailing wind direction; planned neighbouring developments; CFD wake modelling quality                                                                        |
| RISK-RE-016 | **Foundation and structural risk**     | For offshore wind: monopile, jacket, or floating foundation integrity. Scour, corrosion, and fatigue are long-term risks. For onshore: tower foundation settlement or cracking                                                                                      | Foundation type; seabed conditions; corrosion protection system; structural monitoring; J-tube and cable protection                                                                            |

**7C: Renewable Energy — Common (Solar and Wind)**

| **ID**      | **Risk**                                   | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **Key Indicators**                                                                                                                                                                                                    |
|-------------|--------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RE-021 | **Grid connection / curtailment risk**     | Risk that the project cannot export all available energy due to grid constraints, curtailment instructions from the system operator, or connection capacity limitations. Curtailment can be compensated or uncompensated depending on market rules                                                                                                                                                                                                                                                                                                                                                 | Grid connection agreement terms; curtailment compensation mechanism; grid reinforcement plans; system operator curtailment history; constraint payment regime                                                         |
| RISK-RE-022 | **PPA / offtake risk**                     | Risk related to the power purchase agreement: counterparty credit, contract tenor, price escalation mechanism, volume commitment, and basis risk between PPA reference price and actual capture price                                                                                                                                                                                                                                                                                                                                                                                              | PPA counterparty credit quality; PPA tenor vs debt tenor; price escalation (fixed, CPI-linked, market-referenced); volume (pay-as-produced vs baseload); basis risk                                                   |
| RISK-RE-023 | **Merchant exposure / contract tail risk** | Risk from uncontracted revenue after PPA expiry or for the merchant tail of the project — the period where financing extends beyond the contracted revenue period. Merchant revenue depends on future wholesale power prices, which are subject to cannibalisation (more renewables = lower capture prices). For example, a plant financed against a 20-year PPA where the debt runs 25 years faces 5 years of merchant tail risk. What if merchant prices 20 years out are lower than forecast? See also RISK-OP-008 (Contract renewal / re-pricing risk) in Category 3 for the general framework | % merchant revenue; PPA expiry relative to debt maturity; merchant tail duration; power price forecast methodology; cannibalisation assumptions; capacity market eligibility; cost curve position for merchant period |
| RISK-RE-024 | **O&M contractor performance**             | Risk that the operations and maintenance contractor underperforms, fails to meet availability guarantees, or becomes insolvent. O&M contract handover from manufacturer warranty to third-party is a key transition point                                                                                                                                                                                                                                                                                                                                                                          | O&M contractor track record; contract terms (availability guarantee, response times, liquidated damages); contractor financial strength; step-in rights; spare parts inventory                                        |
| RISK-RE-025 | **Major component reserve adequacy**       | Risk that reserves set aside for major component replacement (inverters, gearboxes, blades, transformers) are insufficient. Reserve models depend on assumed failure rates and replacement costs that may prove optimistic                                                                                                                                                                                                                                                                                                                                                                         | Reserve model assumptions; independent technical review of reserve; actual vs modelled component failure rates; inflation adjustment; procurement strategy                                                            |
| RISK-RE-026 | **Land lease / site tenure risk**          | Risk that the land lease is terminated, not renewed, or subject to adverse rent review. Solar and wind assets have 25–40 year lives but land leases may be shorter                                                                                                                                                                                                                                                                                                                                                                                                                                 | Lease term vs project life; renewal options; rent review mechanism; landlord credit and motivation; alternative use value                                                                                             |
| RISK-RE-027 | **Decommissioning cost and obligation**    | Risk that end-of-life decommissioning costs exceed provisions, or that the obligation crystallises earlier than expected                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Decommissioning bond or provision; cost estimate quality; regulatory requirements; recyclability of materials; site restoration obligations                                                                           |
| RISK-RE-028 | **Repowering optionality**                 | Whether the site can be repowered with newer, more efficient equipment at end of life. Repowering can extend asset life but requires planning consent, grid connection, and land lease alignment                                                                                                                                                                                                                                                                                                                                                                                                   | Planning consent for repowering; grid connection capacity; land lease alignment; technology evolution; economic viability                                                                                             |
| RISK-RE-029 | **Climate change impact on resource**      | Risk that long-term climate change alters wind patterns or solar irradiance at the site. Evidence is emerging that some regions are experiencing declining wind speeds or changing seasonal patterns                                                                                                                                                                                                                                                                                                                                                                                               | Climate modelling for site location; long-term weather trend data; resource assessment sensitivity to climate scenarios                                                                                               |

**7D: Energy Storage / Battery**

| **ID**      | **Risk**                             | **Description**                                                                                                                                                                                                                                                                | **Key Indicators**                                                                                                                                              |
|-------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-ES-001 | **Battery degradation / cycle life** | Lithium-ion batteries degrade with each charge/discharge cycle and with calendar age. Actual degradation depends on depth of discharge, temperature management, charge rate, and chemistry. Capacity may fall below commercially useful levels before the end of the debt term | Chemistry type (LFP vs NMC); manufacturer warranty (cycles and calendar); thermal management system; cycling regime; augmentation strategy and budget           |
| RISK-ES-002 | **Revenue model uncertainty**        | Battery storage revenue comes from stacking multiple services (frequency response, capacity market, wholesale arbitrage, balancing mechanism). Revenue streams evolve as market rules change and as more storage enters the market, compressing spreads                        | Revenue stack composition; contracted vs merchant split; sensitivity to individual revenue stream loss; market saturation modelling; regulatory change pipeline |
| RISK-ES-003 | **Technology obsolescence**          | Risk that a fundamentally better or cheaper storage technology (e.g. solid-state, iron-air, flow batteries, compressed air) makes existing lithium-ion assets uncompetitive. New storage technologies could offer lower cost per MWh of throughput                             | Technology maturity curve for alternatives; cost trajectory comparison; asset flexibility to accommodate new chemistry; contract protection                     |
| RISK-ES-004 | **Fire and safety risk**             | Lithium-ion battery facilities carry fire risk from thermal runaway. A battery fire can destroy the entire facility and may have environmental and reputational consequences. Insurance market for battery storage is evolving                                                 | Fire suppression system; thermal monitoring; cell-level isolation; site layout (spacing between units); insurance terms and exclusions; regulatory compliance   |
| RISK-ES-005 | **Augmentation cost and timing**     | As batteries degrade, capacity must be augmented (new modules added) to maintain contracted performance. The cost and availability of replacement modules in future years is uncertain                                                                                         | Augmentation schedule in financial model; assumed cost trajectory for replacement cells; space and grid capacity for augmentation; manufacturer commitment      |
| RISK-ES-006 | **Grid services market evolution**   | Risk that the grid services markets that battery storage relies on are restructured, saturated, or replaced by alternative technologies (e.g. demand-side response, vehicle-to-grid, hydrogen electrolysis as flexible load)                                                   | Market participation volumes; new entrant pipeline; regulatory reform programme; alternative flexibility sources                                                |

**7E: Energy Transition — Hydrogen, CCUS, and Emerging**

| **ID**      | **Risk**                                    | **Description**                                                                                                                                                                                              | **Key Indicators**                                                                                                                        |
|-------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-ET-001 | **Green hydrogen production cost**          | Risk that electrolysis-based hydrogen production costs do not fall as projected, or that competing production methods (blue hydrogen with CCUS, or grey hydrogen from cheap gas) undermine the business case | Electrolyser cost trajectory; electricity input cost; capacity factor; comparison with blue/grey hydrogen; policy support                 |
| RISK-ET-002 | **Electrolyser performance and durability** | Risk that electrolyser stacks degrade faster than warranted, require more frequent replacement, or achieve lower efficiency than modelled. PEM and alkaline technologies have different risk profiles        | Technology type; manufacturer track record; stack lifetime warranty; efficiency guarantee; replacement stack cost and lead time           |
| RISK-ET-003 | **Hydrogen offtake / demand risk**          | Risk that hydrogen demand does not materialise at the volume or price needed. Many projected hydrogen use cases (heating, transport, industrial process) face competition from electrification               | Offtake agreement quality; counterparty credit; volume commitment; take-or-pay terms; alternative demand scenarios                        |
| RISK-ET-004 | **CCUS storage permanence**                 | For carbon capture and storage: risk that stored CO₂ leaks or that the geological storage site does not perform as modelled. Regulatory liability for long-term storage is evolving                          | Geological assessment quality; storage permit terms; monitoring regime; long-term liability transfer mechanism; insurance                 |
| RISK-ET-005 | **CCUS capture rate risk**                  | Risk that the carbon capture equipment achieves lower capture rates than designed, particularly under varying operating conditions                                                                           | Technology maturity; capture rate guarantee; performance under partial load; solvent or sorbent degradation; energy penalty               |
| RISK-ET-006 | **Emerging technology scale-up risk**       | Risk inherent in first-of-a-kind or early-commercial-stage technology. Construction, commissioning, and operational performance risks are amplified when there is limited operational history                | Technology readiness level; reference installations; performance guarantee quality; EPC contractor experience; contingency provisions     |
| RISK-ET-007 | **Policy / subsidy dependency**             | Risk that the project's economic viability depends on policy support (contracts for difference, hydrogen production subsidies, carbon price floors) that may change or be withdrawn                          | Support mechanism type and duration; government commitment strength; sunset provisions; bipartisan support; precedent for policy reversal |

**7F: Data Centres**

| **ID**      | **Risk**                                            | **Description**                                                                                                                                                                                                                                                          | **Key Indicators**                                                                                                                                                          |
|-------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-DC-001 | **Power availability and cost**                     | Data centres consume enormous amounts of electricity. Risk that sufficient power supply cannot be secured, that grid connection is delayed, or that power costs escalate. In some markets, grid capacity is the binding constraint on data centre development            | Contracted power capacity (MW); grid connection agreement status; power cost structure (fixed, indexed, market); backup generation capacity; proximity to substation        |
| RISK-DC-002 | **Cooling infrastructure risk**                     | Cooling is a critical system — failure causes equipment shutdown. Risk from cooling system failure, inadequacy for increasing heat densities (AI/GPU workloads generate significantly more heat than traditional compute), or water scarcity for water-cooled facilities | Cooling technology (air, liquid, immersion); PUE (Power Usage Effectiveness); water consumption; redundancy (N+1, 2N); capacity for high-density racks                      |
| RISK-DC-003 | **Customer concentration / hyperscaler dependency** | Many data centres are built for or anchored by a single hyperscaler (AWS, Microsoft, Google) or a small number of large enterprise tenants. Tenant loss or failure to renew is catastrophic                                                                              | Top tenant as % of revenue; lease term vs debt term; renewal options; tenant credit quality; fit-out specificity (can it be re-let?)                                        |
| RISK-DC-004 | **Technology density and obsolescence**             | Risk that the physical infrastructure (power density per rack, cooling capacity, floor loading) becomes insufficient for next-generation computing requirements. AI/ML workloads are driving rapid increases in power density per rack (from 5–10kW to 40–100kW+)        | Current power density capacity; upgrade pathway; structural loading limits; fibre connectivity; ability to accommodate liquid cooling retrofit                              |
| RISK-DC-005 | **Location and connectivity risk**                  | Data centre value depends on location — proximity to users (latency), connectivity (fibre, IX peering), and power. Risk that location advantages erode due to new submarine cable routes, edge computing, or competitor facilities                                       | Fibre connectivity (number of carriers); distance to internet exchanges; latency to target markets; competing facilities in the same metro; land availability for expansion |
| RISK-DC-006 | **Regulatory and planning risk**                    | Increasing regulatory scrutiny of data centre power consumption, water usage, and environmental impact. Some jurisdictions are imposing moratoriums or restrictions on new data centre development                                                                       | Local planning restrictions; water usage permits; energy efficiency regulations; moratorium risk; community opposition                                                      |
| RISK-DC-007 | **Supply chain — critical equipment**               | Long lead times for transformers, switchgear, generators, and cooling systems can delay construction and increase costs. Global competition for this equipment is intense                                                                                                | Transformer lead time (can be 18–36 months); generator availability; switchgear procurement; pre-orders and deposits; alternative suppliers                                 |
| RISK-DC-008 | **Demand sustainability / AI cycle risk**           | Risk that current demand for data centre capacity (driven heavily by AI training and inference) does not sustain, or that AI workload requirements shift in ways that reduce demand for current facility specifications                                                  | AI demand drivers; training vs inference mix; customer capex commitments; hyperscaler capacity plans; risk of AI winter or demand correction                                |
| RISK-DC-009 | **Uptime and SLA risk**                             | Data centres commit to high availability (typically 99.99%+ uptime). Failure to meet SLA triggers financial penalties and reputational damage. Causes include power failure, cooling failure, fire, human error, or natural disaster                                     | Tier classification; redundancy architecture (N+1, 2N, 2N+1); historical uptime; incident history; disaster recovery provisions                                             |

**7G: Telecommunications**

| **ID**      | **Risk**                                   | **Description**                                                                                                                                                                                                                  | **Key Indicators**                                                                                                         |
|-------------|--------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| RISK-TC-001 | **Network technology obsolescence**        | Risk that the network technology becomes obsolete (e.g. copper replaced by fibre, 4G displaced by 5G, fixed-line disrupted by satellite). Particularly relevant for leveraged buyouts of legacy telco infrastructure             | Technology generation; upgrade pathway; competitive technology timeline; stranded asset exposure                           |
| RISK-TC-002 | **Overbuild / competitive infrastructure** | Risk that a competitor builds parallel infrastructure in the same geography, splitting the addressable market. Critical for fibre-to-the-premises (FTTP) where multiple networks in the same area may not be economically viable | Competitor build plans; regulatory stance on overbuild; population density; take-up rates required for viability           |
| RISK-TC-003 | **Take-up and penetration rate**           | Risk that customer adoption is slower or lower than projected. Particularly relevant for greenfield fibre or mobile network builds                                                                                               | Current vs projected take-up; comparable market data; marketing effectiveness; pricing competitiveness; switching barriers |
| RISK-TC-004 | **Churn and ARPU pressure**                | Risk that customers leave (churn) or that average revenue per user declines due to competition or regulatory intervention                                                                                                        | Monthly churn rate; ARPU trend; customer lifetime value; pricing regulation; competitive intensity                         |

**7H: Rail — Franchised, Concession, and Open Access**

| **ID**      | **Risk**                                  | **Description**                                                                                                                                                                                           | **Key Indicators**                                                                                                                          |
|-------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RA-001 | **Franchise / concession reversion risk** | Risk that the franchise or concession is not renewed, terminated early, or taken into public ownership. In many markets, the trend is towards government-operated services (e.g. UK rail nationalisation) | Concession term; renewal conditions; political direction on public ownership; termination compensation provisions                           |
| RISK-RA-002 | **Farebox / revenue risk**                | Risk that passenger numbers or fare revenues fall below projections due to economic downturn, competition from other modes, or behavioural change (e.g. remote working reducing commuter volumes)         | Passenger volume trend; revenue per passenger km; season ticket vs leisure mix; elasticity to GDP; remote working impact on commuter routes |
| RISK-RA-003 | **Track access charges**                  | Risk that the infrastructure manager (e.g. Network Rail) increases track access charges above the level assumed in the business case                                                                      | Track access charge regime; regulatory review cycle; fixed vs variable charge split; volume-based risk sharing                              |
| RISK-RA-004 | **Subsidy dependency**                    | Risk that government subsidy or support payments are reduced. Many rail operations are loss-making at the farebox and depend on public subsidy                                                            | Farebox recovery ratio; subsidy as % of total revenue; political commitment to subsidy; competitive tendering dynamics                      |
| RISK-RA-005 | **Timetable and capacity allocation**     | Risk that the operator cannot secure sufficient timetable paths, or that infrastructure constraints (signalling, capacity) limit service frequency                                                        | Path allocation process; infrastructure enhancement plans; competing operators on the same routes                                           |
| RISK-RA-006 | **Performance regime / penalties**        | Risk of financial penalties for poor punctuality, cancellations, or service quality metrics. Performance regimes can be punitive, particularly in concession models                                       | Performance metric thresholds; penalty regime severity; historical performance; infrastructure reliability (much delay is network-caused)   |

**7I: Rolling Stock Leasing**

| **ID**      | **Risk**                                | **Description**                                                                                                                                                                                                                                                                  | **Key Indicators**                                                                                                                                                 |
|-------------|-----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RS-001 | **Residual value / re-leasing risk**    | Risk that at lease expiry the rolling stock cannot be re-leased or sold at the value assumed. The fundamental credit question for a ROSCO or rolling stock lease. Highly dependent on fleet standardisation vs bespoke design                                                    | Fleet versatility (can it operate on multiple routes/networks?); gauge compatibility; platform commonality; number of potential operators; secondhand market depth |
| RISK-RS-002 | **Single fleet / single operator risk** | Where the entire fleet is leased to a single operator on a single route (e.g. a bespoke train built for HS2 or a specific metro system). If the operator fails or the concession ends, the fleet may have no alternative use. This is the extreme version of residual value risk | Number of operators capable of using the fleet; route specificity; re-deployment cost; alternative use scenarios; government guarantee or underwrite               |
| RISK-RS-003 | **Technological obsolescence**          | Risk that the rolling stock technology becomes obsolete before the end of the asset's economic life. Diesel rolling stock faces particular risk from electrification mandates; battery and hydrogen trains may displace conventional fleets                                      | Traction type (diesel, electric, bi-mode, battery, hydrogen); electrification programme timeline; emission standards; mid-life refurbishment optionality           |
| RISK-RS-004 | **Heavy maintenance cost escalation**   | Rolling stock requires periodic heavy maintenance (overhaul, mid-life refurbishment) at significant cost. Risk that these costs exceed the reserves or that specialist maintenance capability is not available                                                                   | Maintenance plan; OEM support agreement; independent maintenance capability; component obsolescence; reserve adequacy                                              |
| RISK-RS-005 | **Availability guarantee**              | In availability-based leases, the lessor or maintainer guarantees fleet availability (e.g. 85–95% of fleet available for service daily). Failure to meet availability triggers financial penalties                                                                               | Availability target; historical achievement; penalty regime; spare fleet ratio; component supply chain                                                             |
| RISK-RS-006 | **Regulatory / safety compliance**      | Risk that new safety regulations require costly modifications to the fleet. Examples: installation of ETCS/ERTMS signalling, disability access upgrades, fire safety standards, crashworthiness requirements                                                                     | Regulatory change pipeline; cost of known upcoming modifications; fleet age vs regulatory expectations; compliance deadline                                        |

**7J: Ports — Landlord and Operating**

| **ID**      | **Risk**                                         | **Description**                                                                                                                                                                                                         | **Key Indicators**                                                                                                                 |
|-------------|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| RISK-PT-001 | **Cargo volume / throughput risk**               | Risk that cargo volumes (TEUs for container, tonnes for bulk) fall below projections due to trade patterns, supply chain restructuring, near-shoring, or economic downturn                                              | Volume trend by cargo type; trade route dependency; hinterland GDP; market share vs competing ports                                |
| RISK-PT-002 | **Competition from neighbouring ports**          | Risk that cargo shifts to competing ports offering better facilities, lower costs, shorter transit times, or better hinterland connections                                                                              | Competitive port capacity; relative cost position; hinterland connectivity (road, rail, barge); draught and vessel size capability |
| RISK-PT-003 | **Shipping line concentration**                  | Risk that the port is dependent on a small number of shipping lines or alliances. Shipping line consolidation has increased concentration. Loss of a major calling could significantly reduce volumes                   | Top 3 shipping lines as % of volume; alliance structure; contract term; alternative port options for those lines                   |
| RISK-PT-004 | **Vessel size / infrastructure adequacy**        | Risk that the port cannot accommodate increasingly large vessels (container ships now exceed 24,000 TEU). Channel depth, quay length, crane reach, and berth capacity may become constraints                            | Maximum vessel size accommodated; channel depth and maintenance dredging; crane specifications; planned infrastructure investment  |
| RISK-PT-005 | **Landlord port — tenant credit and lease risk** | For landlord ports that lease land and quays to terminal operators: risk that tenants default, fail to develop, or do not renew. Similar to real estate landlord risk but with specialised assets                       | Tenant credit quality; lease term; development conditions; alternative operator market; minimum throughput commitments             |
| RISK-PT-006 | **Dredging and maritime access**                 | Risk that channel depth is reduced by sedimentation, requiring increased dredging expenditure, or that maritime access is constrained by tidal windows, bridge clearances, or navigational restrictions                 | Dredging cost and frequency; sedimentation rate; capital dredging requirements; environmental permits for dredging                 |
| RISK-PT-007 | **Environmental and decarbonisation**            | Ports face pressure to reduce emissions (shore power for vessels, electrification of equipment, zero-emission zones). Environmental restrictions on dredge disposal, habitat protection, and air quality are tightening | Shore power investment; equipment electrification plan; emission zone regulations; environmental permits; carbon cost exposure     |

**7K: Airports**

| **ID**      | **Risk**                                              | **Description**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **Key Indicators**                                                                                                                                                                                                                                                      |
|-------------|-------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-AP-001 | **Passenger volume risk**                             | Risk that passenger numbers fall below projections. Airports are highly exposed to economic cycles, pandemics, and competition from other airports and modes. Recovery from COVID demonstrated the vulnerability of the revenue model                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Passenger volume trend; domestic vs international mix; leisure vs business mix; airline route network diversity; catchment area demographics                                                                                                                            |
| RISK-AP-002 | **Airline concentration and carrier dependency**      | Risk that the airport is dependent on a small number of airlines. If a dominant airline fails, reduces capacity, or moves to a competitor airport, volumes can collapse rapidly. Particular risk exists with low-cost carrier (LCC) dependency: many regional airports have built their traffic base by attracting an LCC with low landing charges and incentives. Once the LCC has driven volume growth, the airport attempts to increase aeronautical charges — at which point the LCC threatens to reduce or withdraw services, knowing the airport has no alternative source of equivalent volume. This creates a structural imbalance of negotiating power. Airports with diversified airline bases across multiple carriers and both LCC and full-service segments are significantly more resilient | Largest airline as % of passengers; LCC vs full-service mix; number of airlines operating; base airline commitment and contract term; history of carrier disputes; route diversity; alternative carrier options; airport's pricing power relative to competing airports |
| RISK-AP-003 | **Aeronautical vs commercial revenue mix**            | Airports earn from both aeronautical charges (landing fees, passenger charges) and commercial activities (retail, car parking, property). Aeronautical charges may be regulated; commercial revenue is discretionary and volume-dependent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Commercial revenue as % of total; revenue per passenger; retail spend per passenger trend; car parking yield; regulatory treatment of aeronautical charges                                                                                                              |
| RISK-AP-004 | **Capacity constraint / expansion risk**              | Risk that the airport cannot grow due to runway, terminal, or airspace constraints, or that a major expansion programme runs over budget and timeline                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Current capacity utilisation; expansion plan status; planning consent; capital programme cost and timeline; financing of expansion                                                                                                                                      |
| RISK-AP-005 | **Competition from other airports**                   | Risk that a competing airport captures market share through lower charges, better connectivity, expansion, or airline incentives. Particularly relevant where catchment areas overlap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Competing airports within catchment; relative charges; surface access quality; airline incentive programmes                                                                                                                                                             |
| RISK-AP-006 | **Noise, environment, and night flight restrictions** | Risk that environmental restrictions limit airport operations: night flight bans, noise quotas, emission caps, or expansion constraints. Community opposition and judicial review are common                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Current noise restrictions; night flight regime; emission caps; community engagement; judicial review history; political environment                                                                                                                                    |
| RISK-AP-007 | **Ground transport access**                           | Risk that poor surface access (road congestion, inadequate public transport) limits the airport's catchment area or competitiveness                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Rail link availability; road access capacity; public transport mode share; planned transport investment                                                                                                                                                                 |

**7L: Roads — Availability and Toll**

| **ID**      | **Risk**                             | **Description**                                                                                                                                                                                                                                                                            | **Key Indicators**                                                                                                                                             |
|-------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RD-001 | **Traffic volume risk (toll roads)** | For toll roads: risk that traffic volumes fall below projections. Traffic risk is the principal credit risk and has historically been the most common cause of project finance distress in the roads sector. Forecasting errors of 20–40% are not uncommon in the first years of operation | Independent traffic study quality; ramp-up assumptions; competition from free alternatives; toll elasticity; GDP sensitivity; truck vs car mix                 |
| RISK-RD-002 | **Toll rate / escalation risk**      | Risk that the concessionaire cannot increase toll rates as planned, due to political intervention, regulatory cap, or public resistance. Toll roads are politically sensitive — governments have historically frozen or reduced tolls                                                      | Toll escalation mechanism (CPI, fixed, regulatory); political environment; concession agreement protection; history of government intervention in toll setting |
| RISK-RD-003 | **Availability payment mechanism**   | For availability-based roads (shadow toll or PFI): risk related to the payment mechanism. Revenue depends on the road meeting availability and quality standards rather than traffic volume. Deductions for lane closures, surface defects, or safety failures                             | Payment mechanism structure; deduction regime severity; historical deduction experience; maintenance strategy to minimise deductions                           |
| RISK-RD-004 | **Pavement lifecycle cost**          | Risk that road surface maintenance (resurfacing, reconstruction) costs exceed provisions. Pavement deterioration depends on traffic loading (especially heavy vehicles), climate, subgrade conditions, and initial construction quality                                                    | Pavement design life; heavy vehicle proportion; climate conditions; independent lifecycle cost assessment; reserve adequacy; maintenance track record          |
| RISK-RD-005 | **Competing route risk**             | Risk that a new road, bypass, or alternative route diverts traffic. Particularly relevant for toll roads where free alternatives reduce willingness to pay                                                                                                                                 | Planned infrastructure in corridor; alternative route capacity; time saving vs toll cost trade-off                                                             |
| RISK-RD-006 | **Winter maintenance / weather**     | Risk that severe weather increases maintenance costs (snow clearance, salt damage, flood repair) or reduces availability and traffic volumes                                                                                                                                               | Climate exposure; winter maintenance provisions; flood risk assessment; insurance coverage                                                                     |

**7M: Gas Utilities and Distribution**

| **ID**      | **Risk**                                | **Description**                                                                                                                                                                                                                                                  | **Key Indicators**                                                                                                                                                          |
|-------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-GU-001 | **Demand decline from electrification** | Risk that gas demand declines as heating and cooking shift to electric alternatives (heat pumps, induction). This is the existential long-term risk for gas distribution networks — a progressively stranding asset                                              | Government heat decarbonisation policy; heat pump installation rates; hydrogen conversion plans; customer disconnection trajectory; regulatory approach to managing decline |
| RISK-GU-002 | **RAB / regulatory price review risk**  | Risk that the regulator reduces allowed returns, challenges the asset base, or imposes onerous efficiency targets at price review                                                                                                                                | Regulatory framework (RIIO in UK); price review cycle; allowed return trend; totex performance; regulatory relationship                                                     |
| RISK-GU-003 | **Hydrogen conversion feasibility**     | Risk that the plan to convert gas networks to carry hydrogen proves technically unfeasible, uneconomic, or is not supported by government policy. Hydrogen may not flow at the same rate, requires different materials, and end-user appliances must be replaced | Government hydrogen strategy; conversion trial results; pipeline material compatibility; customer appliance conversion cost and logistics; blending limits                  |
| RISK-GU-004 | **Leakage and safety**                  | Risk from gas leaks, explosions, or safety incidents. Gas distribution carries inherent safety risk, and the consequences of a major incident can be severe (liability, regulatory penalty, licence risk)                                                        | Leak rate; mains replacement programme progress; incident history; HSE compliance record; iron mains vs PE mains proportion                                                 |
| RISK-GU-005 | **Decommissioning and stranding**       | If gas networks are progressively decommissioned rather than converted to hydrogen, the question is who bears the cost. Regulatory frameworks may not fully compensate shareholders for stranded assets                                                          | Regulatory approach to stranding; decommissioning cost estimates; economic interest test; remaining useful life                                                             |

**7N: Electricity Utilities — Transmission and Distribution**

| **ID**      | **Risk**                                            | **Description**                                                                                                                                                                                                                      | **Key Indicators**                                                                                                              |
|-------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| RISK-EU-001 | **RAB / regulatory price review risk**              | As per gas utilities: risk of adverse regulatory determination. Electricity networks generally have a more favourable long-term outlook than gas (electrification increases demand) but regulatory risk remains                      | Regulatory framework; price review cycle; allowed return; totex incentive performance; RAB growth                               |
| RISK-EU-002 | **Investment programme delivery**                   | Electricity networks face massive investment programmes to accommodate renewables, clean tech, heat pumps, and data centres. Risk that the network operator cannot deliver at the pace required, or that cost overruns erode returns | Capex programme size; delivery track record; supply chain capacity (transformers, cables); planning consent pipeline            |
| RISK-EU-003 | **Connection queue and grid congestion**            | Risk that the network cannot connect new generation or demand quickly enough, leading to curtailment, constraint costs, or regulatory intervention to reform the connection process                                                  | Connection queue length; average connection time; constraint cost trend; regulatory reform pipeline                             |
| RISK-EU-004 | **Weather and resilience**                          | Risk from extreme weather causing network damage — storms, flooding, ice loading, heat-related conductor sag. Climate change is increasing both the frequency and severity of weather events                                         | Storm damage history; resilience investment; flood exposure; vegetation management; insurance and self-insurance                |
| RISK-EU-005 | **Distributed generation and demand-side response** | Risk that growth of distributed solar, battery storage, and demand-side response reduces the volume of electricity flowing through the network, potentially undermining the regulatory settlement                                    | DER penetration rate; net demand trajectory; regulatory approach to DER integration; role of DSO (distribution system operator) |

**7O: Pipelines and Transmission Lines**

| **ID**      | **Risk**                                     | **Description**                                                                                                                                                                                                                                 | **Key Indicators**                                                                                                                                  |
|-------------|----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-PL-001 | **Throughput / utilisation risk**            | Risk that pipeline throughput or transmission line utilisation is lower than projected, either from supply-side decline (reservoir depletion, producer shut-in) or demand-side reduction                                                        | Contracted capacity; take-or-pay provisions; shipper/producer credit quality; reserve life of supply source; competing pipeline capacity            |
| RISK-PL-002 | **Tariff / regulated return risk**           | For regulated pipelines and transmission: risk that the regulator reduces allowed tariffs or returns. For contracted pipelines: risk that contracts are not renewed at economic rates                                                           | Regulatory framework; tariff structure (cost-of-service, negotiated, market); contract term and renewal provisions                                  |
| RISK-PL-003 | **Integrity and corrosion**                  | Risk of pipeline failure from corrosion (internal and external), stress corrosion cracking, material fatigue, or third-party damage. A pipeline rupture can cause explosion (gas), environmental contamination (oil), and significant liability | In-line inspection (ILI/pigging) results; corrosion protection system; anomaly management; age and material; cathodic protection; leak detection    |
| RISK-PL-004 | **Environmental and permitting**             | Risk from environmental regulation, including restrictions on new pipeline construction, enhanced monitoring requirements, or liability for historic contamination along the right-of-way                                                       | Environmental permits; right-of-way security; crossing permits (waterways, highways); indigenous rights; environmental liability history            |
| RISK-PL-005 | **Stranding risk (hydrocarbon pipelines)**   | Risk that a pipeline carrying oil or gas becomes stranded as production declines or as the energy transition reduces demand for the commodity. A pipeline without throughput has negative value (decommissioning cost)                          | Remaining reserve life of connected fields; transition risk for the commodity; alternative use (CO₂ transport, hydrogen); decommissioning provision |
| RISK-PL-006 | **Transmission line — right of way and EMF** | For electricity transmission lines: risk from right-of-way disputes, electromagnetic field (EMF) concerns, visual impact opposition, and undergrounding requirements                                                                            | Right-of-way security; EMF regulation; visual impact assessments; community opposition; undergrounding cost exposure                                |

**7P: Oil and Gas Storage**

| **ID**      | **Risk**                           | **Description**                                                                                                                                                                                                                                         | **Key Indicators**                                                                                                                                |
|-------------|------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-ST-101 | **Storage demand and utilisation** | Risk that demand for storage capacity declines due to changes in supply/demand patterns, reduced seasonal spreads (which drive commercial storage demand), or structural decline in the commodity                                                       | Utilisation rate; contracted capacity; contract tenor; seasonal spread history; strategic vs commercial storage split                             |
| RISK-ST-102 | **Contango / spread risk**         | Commercial storage profitability depends on the forward curve — specifically the spread between near-month and far-month prices (contango). If the curve flattens or moves into backwardation, the economics of storing and selling forward deteriorate | Historical contango duration and depth; hedging strategy; contracted vs merchant storage; injection/withdrawal optionality value                  |
| RISK-ST-103 | **Cavern / tank integrity**        | Risk of containment failure from corrosion, structural failure, or geological instability (for salt cavern storage). Releases can cause fire, explosion, or environmental contamination                                                                 | Inspection regime; tank/cavern age; material condition; geological monitoring (caverns); secondary containment; environmental liability insurance |
| RISK-ST-104 | **Strategic storage mandate risk** | Some storage capacity is mandated by government (strategic petroleum reserves, gas security of supply obligations). Changes to the mandate or the payment mechanism affect revenue certainty                                                            | Regulatory mandate; payment mechanism; government commitment; history of mandate changes                                                          |
| RISK-ST-105 | **Transition risk**                | Risk that oil storage becomes a stranding asset as oil demand declines. Gas storage may benefit from transition (balancing intermittent renewables) but faces competition from battery storage and demand response                                      | Commodity long-term demand outlook; alternative use potential; decommissioning liability; gas storage role in energy security                     |

**7Q: Thermal Generation (Gas, Biomass, Waste-to-Energy)**

| **ID**      | **Risk**                                         | **Description**                                                                                                                                                                                                                                                         | **Key Indicators**                                                                                                                                      |
|-------------|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-TG-001 | **Dispatch / merit order risk**                  | Risk that the plant is dispatched less frequently as it moves down the merit order due to increasing renewable capacity. Gas peakers are increasingly marginal; baseload gas is being displaced by renewables in many markets                                           | Merit order position; historical load factor trend; renewable penetration in the grid zone; capacity market revenue as backstop                         |
| RISK-TG-002 | **Spark / dark / clean spread risk**             | Revenue depends on the spread between electricity price and fuel cost (spark spread for gas, dark spread for coal, clean spread including carbon cost). Spread compression reduces profitability                                                                        | Historical spread volatility; fuel procurement strategy; hedging programme; carbon price exposure                                                       |
| RISK-TG-003 | **Carbon price and emission regulation**         | Risk that rising carbon prices or emission standards make the plant uneconomic or require costly retrofitting (CCUS). This is the primary transition risk for thermal generation                                                                                        | Carbon price trajectory; emission standard compliance; CCUS retrofit feasibility and cost; remaining emission allowances; phase-out dates               |
| RISK-TG-004 | **Fuel supply risk**                             | Risk that the fuel cannot be procured at the assumed cost or volume. For gas: pipeline vs LNG; price indexation. For biomass: sustainable sourcing; supply chain logistics; feedstock competition. For waste: gate fee competition; waste volume decline from recycling | Fuel supply contract terms; alternative fuel sources; biomass sustainability certification; waste catchment area; recycling policy impact               |
| RISK-TG-005 | **Plant availability and efficiency**            | Risk that the plant achieves lower availability or thermal efficiency than modelled due to equipment degradation, unplanned outages, or maintenance complications                                                                                                       | Plant age; technology type; historical availability and efficiency; O&M contract quality; major overhaul schedule; spare parts availability             |
| RISK-TG-006 | **Capacity market revenue risk**                 | Many thermal plants depend on capacity market revenue to be viable. Risk that capacity market rules change, clearing prices decline, or the plant fails to secure a capacity agreement                                                                                  | Capacity market framework; historical clearing prices; qualification requirements; de-rating factors; competing technologies (battery, interconnectors) |
| RISK-TG-007 | **Biomass sustainability and reputational risk** | For biomass plants: risk that the sustainability credentials of the fuel source are challenged, affecting subsidy eligibility or social licence. Woody biomass sustainability is increasingly contested                                                                 | Fuel source and certification; supply chain transparency; regulatory definition of sustainable biomass; public and NGO scrutiny                         |

**7R: Geothermal Generation**

| **ID**      | **Risk**                                    | **Description**                                                                                                                                                                                              | **Key Indicators**                                                                                                             |
|-------------|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| RISK-GE-001 | **Reservoir / resource risk**               | Risk that the geothermal reservoir delivers lower temperature, flow rate, or longevity than modelled. Reservoir characterisation is inherently uncertain before drilling, and resource can decline over time | Exploration well data; reservoir modelling; P50/P90 resource estimates; comparable field performance; reinjection strategy     |
| RISK-GE-002 | **Drilling risk**                           | Risk that exploration or production wells fail, encounter unexpected geological conditions, or cost significantly more than budgeted. Geothermal drilling is specialised and can be unpredictable            | Number of wells required; drilling cost contingency; rig availability; geological uncertainty; well success rate in the region |
| RISK-GE-003 | **Scaling, corrosion, and fluid chemistry** | Geothermal fluids can be corrosive, cause mineral scaling in wells and surface equipment, or contain non-condensable gases (H₂S, CO₂) that affect plant performance and create environmental/safety issues   | Fluid chemistry analysis; scaling mitigation strategy; materials selection; H₂S management; environmental permits              |
| RISK-GE-004 | **Induced seismicity**                      | Risk that injection of fluids into the reservoir causes seismic events. This has caused project shutdowns and is a significant public acceptance issue                                                       | Seismic monitoring regime; traffic light protocol; historical seismicity; regulatory position; community relations             |
| RISK-GE-005 | **Plant performance and heat rate**         | Risk that the surface plant (binary cycle, flash, or dry steam) achieves lower conversion efficiency than modelled, particularly as resource temperature or flow declines over time                          | Plant type; design efficiency; off-design performance modelling; ambient temperature sensitivity; parasitic load               |

**7S: Power Grids and Transmission**

| **ID**      | **Risk**                                           | **Description**                                                                                                                                                                                                                                 | **Key Indicators**                                                                                                                                           |
|-------------|----------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-PG-001 | **Regulatory and revenue risk**                    | Risk from the regulatory framework governing the grid: allowed return, incentive regime, output delivery, and totex allowance. Grid operators are natural monopolies — their revenue is entirely determined by the regulator                    | Regulatory framework and jurisdiction; price review cycle; allowed return (WACC); totex performance; incentive mechanism                                     |
| RISK-PG-002 | **System operation complexity**                    | As grids accommodate more intermittent renewables, distributed generation, and bi-directional flows, system operation becomes more complex. Balancing costs increase and the grid operator may face new performance obligations                 | Renewable penetration in system; balancing cost trend; frequency management; storage integration; system operator duties                                     |
| RISK-PG-003 | **Major project delivery (HVDC, interconnectors)** | Large grid projects (HVDC links, subsea interconnectors, major upgrades) carry construction risk including marine installation, cable laying, converter station commissioning, and technology performance                                       | Project budget and contingency; construction contractor experience; marine risk; cable route complexity; commissioning schedule                              |
| RISK-PG-004 | **Interconnector merchant risk**                   | For merchant interconnectors: revenue depends on electricity price differentials between connected markets. If prices converge (e.g. through market coupling or increased renewables in both markets), the interconnector becomes less valuable | Historical price differential; price convergence risk; capacity allocation mechanism; cap and floor regime (if regulated); competing interconnector capacity |
| RISK-PG-005 | **Cyber and physical security**                    | Power grids are critical national infrastructure and high-value targets for cyber attack and physical sabotage. A successful attack can cause widespread outages and systemic damage                                                            | Cyber security investment and maturity; physical security measures; incident history; regulatory security standards; government support/coordination         |

**7T: Real Estate — Sector-Specific**

| **ID**      | **Risk**                                            | **Description**                                                                                                                                                                                                                                        | **Key Indicators**                                                                                                                                             |
|-------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-RE-101 | **Office — remote working structural shift**        | Risk that office demand has permanently reduced due to remote and hybrid working. Affects both occupancy and rental growth. CBD vs suburban; Grade A vs Grade B; flex-ready vs traditional layouts all matter                                          | Occupancy rate trend; pre-let vs speculative; tenant industry mix (tech more flexible than finance); quality and amenity provision; flexible space provision   |
| RISK-RE-102 | **Retail — e-commerce displacement**                | Risk that physical retail demand continues to decline as e-commerce takes share. Grocery-anchored, convenience, and experiential retail are more resilient than pure comparison goods                                                                  | Online penetration by retail category; footfall trend; anchor tenant stability; convenience vs comparison mix; click-and-collect functionality                 |
| RISK-RE-103 | **Logistics / industrial — supply chain reshoring** | Risk that nearshoring or reshoring trends, while supporting some logistics demand, could reduce demand for large distribution hubs if supply chains shorten. Also risk of overbuilding — significant speculative logistics development in many markets | Speculative development pipeline; vacancy rate trend; rent-to-revenue ratio for tenants; last-mile vs big-box; temperature-controlled demand                   |
| RISK-RE-104 | **Residential — affordability and regulation**      | Risk from rent regulation (rent caps, freezes), social housing requirements, and affordability constraints on rental growth. Also risk from interest rate impact on residential investment values                                                      | Rent regulation framework; affordability ratio; mortgage rate sensitivity; planning policy; social housing obligations; build-to-rent vs buy-to-let dynamics   |
| RISK-RE-105 | **Student accommodation — demographic and policy**  | Risk from declining domestic student numbers (demographics), changes to international student visa policy, or university financial distress. Universities may also build their own competing accommodation                                             | University ranking and financial health; international student dependency; domestic demographics; nomination agreement terms; university-owned supply pipeline |
| RISK-RE-106 | **Healthcare real estate — operator risk**          | For care homes, hospitals, clinics: risk is often more about the operator's financial health than the property itself. Operator failure can leave the property with no income and limited alternative use                                              | Operator rent cover; operator financial health; care quality ratings; regulatory compliance; alternative operator market; reimbursement framework              |
| RISK-RE-107 | **Hotels — cyclicality and brand**                  | Risk from economic cyclicality (RevPAR collapses in recession), competition from Airbnb/short-let, and brand/management contract dependency. Operating leverage is high                                                                                | RevPAR trend; occupancy rate; ADR; management contract terms; brand strength; OTA dependency; Airbnb penetration in market                                     |
| RISK-RE-108 | **Self-storage — maturity and saturation**          | Self-storage is a growth sector in many European markets but risks include market saturation, planning restrictions, and customer sensitivity to price. Occupancy takes time to stabilise in new facilities                                            | Market penetration (sq ft per capita); stabilised occupancy; ramp-up assumptions; competitive supply within catchment; pricing power                           |
| RISK-RE-109 | **Mixed-use — complexity and cross-default**        | Mixed-use developments combine multiple uses (residential, commercial, retail, leisure) with different risk profiles. Cross-subsidisation between uses and complex lease structures create additional risk                                             | Revenue mix; dominant use; cross-default provisions; phasing risk; planning complexity; management structure                                                   |
| RISK-RE-110 | **Build quality / defects (new build)**             | Risk of construction defects in new-build properties, including cladding issues (post-Grenfell), structural defects, water ingress, and fire safety compliance. Remediation can be extremely costly                                                    | Building safety compliance; cladding type; contractor warranty; collateral warranty chain; building safety case; EWS1 form status                              |

**7U: Social Infrastructure**

| **ID**      | **Risk**                             | **Description**                                                                                                                                                                                                      | **Key Indicators**                                                                                                                            |
|-------------|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-SI-001 | **PFI / PPP availability regime**    | Risk that the availability payment mechanism produces unpredictable or insufficient revenue due to the deduction regime, benchmarking, or authority disputes                                                         | Payment mechanism complexity; deduction history; hand-back conditions; benchmarking and market testing provisions                             |
| RISK-SI-002 | **Authority / public sector credit** | Risk that the public sector counterparty defaults or that government changes the framework for PFI/PPP contracts. In some jurisdictions, political hostility to PFI has led to contract renegotiation or termination | Sovereign credit rating; political environment; history of contract renegotiation; constitutional framework; termination compensation         |
| RISK-SI-003 | **Lifecycle cost escalation**        | Risk that long-term maintenance and lifecycle replacement costs exceed the provisions in the financial model. Lifecycle risk is often the largest cost risk in a PFI project over 25–30 years                        | Independent lifecycle cost report; reserve adequacy; inflation assumptions; scope creep from changing standards; technology replacement cycle |
| RISK-SI-004 | **Hand-back conditions**             | Risk that the cost of restoring the asset to the required condition at the end of the concession exceeds provisions. Hand-back conditions are specified in the project agreement but interpretation can be contested | Hand-back condition specification; condition survey regime; reserve for hand-back; dispute resolution mechanism                               |
| RISK-SI-005 | **Demand risk (social housing)**     | For social housing investments: risk from void rates, tenant arrears, benefit dependency, and local authority or housing association financial health                                                                | Void rate; arrears rate; housing benefit dependency; local authority financial health; housing demand in area; housing association governance |

**7V: Other Sectors**

| **ID**      | **Risk**                                            | **Description**                                                                                    | **Key Indicators**                             |
|-------------|-----------------------------------------------------|----------------------------------------------------------------------------------------------------|------------------------------------------------|
| RISK-OT-001 | **Resource / reserve risk**                         | Risk that estimated reserves or resources prove insufficient                                       | Mining, energy, natural resources              |
| RISK-OT-002 | **Healthcare reimbursement risk**                   | Risk of changes to healthcare reimbursement rates or pricing regulations                           | Healthcare                                     |
| RISK-OT-003 | **Network / platform risk**                         | Risk of losing network effects or platform relevance                                               | Technology, telecommunications                 |
| RISK-OT-004 | **Product liability / recall risk**                 | Risk of material product liability claims or product recalls                                       | Manufacturing, consumer goods, pharmaceuticals |
| RISK-OT-005 | **Education — regulatory and fee risk**             | Risk from regulatory changes to fee structures, student number caps, or accreditation requirements | Higher education, schools                      |
| RISK-OT-006 | **Leisure and entertainment — discretionary spend** | Risk that revenue is highly sensitive to consumer confidence and discretionary spending            | Theme parks, stadiums, cinemas, leisure        |

**7W: Energy from Waste**

| **ID**      | **Risk**                                   | **Description**                                                                                                                                                                                                                                                                                                                                                              | **Key Indicators**                                                                                                                                                                            |
|-------------|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-EW-001 | **Gate fee risk**                          | Risk that gate fees (the price charged to accept waste) decline due to competition from other EfW facilities, landfill price changes, or overcapacity. Gate fees are the primary revenue driver for most EfW plants — a new competing facility in the catchment area can compress fees significantly                                                                         | Gate fee level vs market; contracted vs spot gate fee split; contract tenor; competing facilities planned or under construction; catchment area waste volumes                                 |
| RISK-EW-002 | **Waste volume / feedstock risk**          | Risk that insufficient waste is available to operate the plant at capacity. Driven by: waste reduction policies, increased recycling rates, competition from other EfW facilities, and changes in commercial waste patterns. A plant operating below design capacity has materially worse economics                                                                          | Contracted waste tonnage as % of capacity; contract tenor; waste catchment area analysis; local authority waste strategy; recycling rate trend; commercial vs municipal waste split           |
| RISK-EW-003 | **Calorific value variability**            | Risk that the calorific value (energy content) of the waste feedstock varies from design assumptions, affecting power output and efficiency. Higher recycling removes high-CV materials (plastics, paper), potentially reducing the CV of residual waste over time                                                                                                           | Design CV vs actual CV; CV trend as recycling increases; fuel blending capability; impact on power generation per tonne; contractual CV specifications                                        |
| RISK-EW-004 | **Power / heat revenue**                   | EfW plants typically sell electricity (and sometimes heat to district heating networks). Revenue depends on power prices (if merchant), or on a PPA/CfD/ROC regime. Heat offtake depends on having a reliable heat customer — a district heating network that doesn't materialise leaves heat revenue stranded                                                               | Power offtake arrangement; contracted vs merchant power revenue; heat offtake agreement; district heating network status; CfD/ROC/subsidy regime                                              |
| RISK-EW-005 | **Emissions and environmental regulation** | EfW plants face stringent emissions regulation (Industrial Emissions Directive / Best Available Techniques). Risk that standards tighten, requiring costly upgrades (e.g. SCR for NOx, activated carbon for dioxins). Also risk from the evolving classification of EfW as "recovery" vs "disposal" under the waste hierarchy, and whether EfW qualifies as renewable energy | Current emissions compliance; BAT reference document requirements; upcoming regulatory changes; carbon accounting treatment; renewable energy classification; environmental permit conditions |
| RISK-EW-006 | **Residue disposal cost**                  | EfW produces bottom ash (which can be recycled as aggregate) and fly ash / air pollution control residues (which are hazardous waste requiring specialist disposal). Risk that disposal costs for hazardous residues increase or that disposal routes become unavailable                                                                                                     | Bottom ash recycling rate; APC residue disposal route; disposal contract tenor; hazardous waste regulation; alternative disposal options; residue volume per tonne of waste                   |
| RISK-EW-007 | **Technology / availability risk**         | EfW plants are complex industrial facilities with moving grate, boiler, flue gas treatment, and turbine systems. Risk of lower-than-designed availability due to corrosion (particularly in the boiler from aggressive waste combustion gases), mechanical failures, or unplanned outages. Annual shutdowns for maintenance are typically 4–6 weeks                          | Plant availability target and track record; boiler corrosion management; O&M contract terms; major overhaul schedule; technology maturity; comparable plant performance                       |
| RISK-EW-008 | **Contract renewal / merchant tail**       | As with other infrastructure, financing may extend beyond initial waste supply contracts. Risk that when long-term waste contracts expire (typically 15–25 years), renewal terms are worse — lower gate fees, shorter terms, or volume uncertainty. See also RISK-OP-008 in Category 3                                                                                       | Contract expiry profile vs debt maturity; renewal options; market conditions for re-contracting; alternative waste sources; catchment area competition at renewal date                        |

**7X: EV Charging Infrastructure**

| **ID**      | **Risk**                                       | **Description**                                                                                                                                                                                                                                                                                                                               | **Key Indicators**                                                                                                                                                                                |
|-------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| RISK-EV-001 | **Utilisation / throughput risk**              | The fundamental business risk: are enough vehicles charging at the location to generate sufficient revenue? Utilisation depends on EV adoption rates, location quality, competing chargers, and driver behaviour. Many charging locations operate at low utilisation in early years, requiring the financial model to absorb a ramp-up period | Current utilisation rate; EV penetration in catchment area; utilisation ramp-up assumptions; comparable site data; breakeven utilisation level                                                    |
| RISK-EV-002 | **Electricity procurement and demand charges** | Charger operators buy power wholesale (or under a supply contract) and sell at a premium. Risk from: wholesale price volatility, demand charges (which are based on peak power draw and can be disproportionately large for fast chargers), and inability to pass through cost increases to drivers who are price-sensitive                   | Power supply contract terms; demand charge exposure; tariff structure (fixed vs variable); wholesale price hedging; retail price elasticity; competitive pricing pressure                         |
| RISK-EV-003 | **Competition and pricing pressure**           | Risk from competing charging networks, destination charging (hotels, supermarkets offering free or cheap charging as an amenity), workplace charging, and home charging (which serves 80%+ of charging needs for drivers with off-street parking). The addressable market for public charging may be smaller than projected                   | Competing charger density in catchment; home charging capability of target users; destination charging availability; pricing vs competitors; brand loyalty in charging                            |
| RISK-EV-004 | **Technology obsolescence / charging speed**   | Risk that charging technology evolves rapidly, making current installations obsolete. Charging speeds are increasing (from 50kW to 150kW to 350kW+), and vehicles with longer range reduce the frequency of en-route charging stops. A network of 50kW chargers may not attract drivers when 350kW alternatives exist                         | Current charging speed vs industry trend; upgrade pathway; equipment modularity; vehicle battery technology evolution; range improvement trajectory                                               |
| RISK-EV-005 | **Grid connection and power capacity**         | Fast charging hubs require substantial grid connections (multiple MW). Risk that grid connection is delayed, undersized for future expansion, or subject to increasing grid reinforcement costs. In many areas, grid capacity is the binding constraint                                                                                       | Grid connection capacity (MW); connection agreement status; upgrade pathway for higher capacity; grid reinforcement costs; battery buffer storage (which can reduce grid connection requirements) |
| RISK-EV-006 | **Site location and lease risk**               | Charging value is highly location-dependent — motorway service areas, urban hubs, and destination locations command premium utilisation. Risk that the site lease is not renewed, that the landlord grants a competing operator access, or that traffic patterns change                                                                       | Lease term; exclusivity provisions; landlord relationship; traffic flow data; proximity to major routes; alternative site availability                                                            |
| RISK-EV-007 | **Regulatory and subsidy risk**                | Risk from changes to EV policy: purchase subsidies that drive adoption, charging infrastructure grants, mandated charging provision, and electricity tariff regulation. Also risk from potential regulation of charging prices (price caps)                                                                                                   | Government EV policy; infrastructure subsidy; purchase incentive trajectory; price regulation risk; mandate requirements; local authority planning policy                                         |

## Revenue Risk Classification Framework

### Why Revenue Risk is the Primary Credit Differentiator

Every credit rating agency — Moody's, Fitch, S&P, and Scope — converges
on the same fundamental insight: the nature of the revenue arrangement
is the single most important determinant of credit risk. EDHEC's TICCS
classification makes it the first pillar of their entire infrastructure
taxonomy, distinguishing between contracted, merchant, and regulated
business models as the primary organising principle.

This is because the revenue arrangement determines what can go wrong. A
fully contracted, availability-based PFI project has a fundamentally
different risk profile from a merchant power plant, even if they sit in
the same sector and geography. The PFI project's risks are operational
(can it maintain availability?) and counterparty-based (will the
authority pay?). The merchant plant's risks are market-driven (what will
power prices be?) and competitive (will it be dispatched?). The risk
register in Category 7 identifies the sector-specific risks, but the
revenue classification tells you which of those risks actually matter
for a given deal.

This framework should be applied to every deal at origination as a
meta-classification that sits above the individual risk assessments. It
provides the lens through which the investment team interprets the risk
register.

### Classification Dimensions

Revenue risk is classified across three dimensions: pricing mechanism,
volume mechanism, and revenue duration. Every deal is tagged on all
three.

### Dimension 1: Pricing Mechanism

How is the price the borrower receives determined?

| **Code** | **Pricing Type**                            | **Description**                                                                                                                                                                                                                                                                     | **Typical Sectors**                                                                                                                                                                                                                                                | **Risk Implication**                                                                                                                                                                                |
|----------|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P1       | **Fixed by contract**                       | The price per unit (or total payment) is specified in a long-term contract. No exposure to market price movements during the contract term. May be a fixed nominal amount or a fixed real amount                                                                                    | Availability-based PFI/PPP; fixed-price PPA; long-lease real estate; fixed gate fee EfW; take-or-pay pipeline tariffs; fixed-price O&M (from operator perspective)                                                                                                 | Lowest pricing risk. Key risk shifts to counterparty credit and contract enforceability                                                                                                             |
| P2       | **Indexed / escalating by formula**         | The price adjusts by a defined formula linked to a published index (CPI, RPI, wage index, commodity index). The adjustment is mechanical and not subject to negotiation or regulatory discretion. Introduces differential inflation risk if cost base follows a different index     | Index-linked PFI unitary charges; RPI-linked regulated tariffs; CPI-escalated lease rentals; index-linked PPA prices; inflation-linked bonds                                                                                                                       | Low pricing risk, but exposed to basis risk between revenue index and cost index (see RISK-MK-002). Also exposed to index reform risk (e.g. RPI to CPIH transition)                                 |
| P3       | **Regulated / administered**                | The price is set by a regulator or government authority through a periodic review process. The borrower participates through submissions but ultimately the regulator determines the outcome. The regulatory framework creates both a floor and a ceiling on returns                | RAB-based utility tariffs (Ofgem, Ofwat); regulated airport charges (single/dual till); regulated pipeline tariffs; water tariffs; network charges                                                                                                                 | Moderate pricing risk. Regulatory risk is the key concern — adverse determinations can compress margins. But the framework also provides downside protection through the regulatory compact         |
| P4       | **Negotiated / re-contracted periodically** | The price is set by commercial negotiation at intervals. Between negotiations, it may be fixed or indexed, but at each renewal point there is genuine uncertainty about the outcome. The borrower's negotiating power depends on market conditions, competition, and replaceability | Lease renewals; PPA renewals; O&M contract renewals; franchise rebids; shipping line contracts at ports; rolling stock lease renewals; airport airline agreements                                                                                                  | Moderate to high pricing risk at renewal points. Assessment depends on: contract expiry timing vs debt maturity, market conditions at renewal, borrower's competitive position, and switching costs |
| P5       | **Market / merchant**                       | The price is determined by supply and demand in a competitive market at the time of sale. The borrower is a price-taker with no contractual protection. Revenue can be highly volatile                                                                                              | Wholesale electricity (merchant generators); commodity prices (mining, oil & gas); hotel room rates (RevPAR); self-storage rates; commercial rents in weak markets; clean tech tariffs                                                                             | Highest pricing risk. Assessment focuses on cost curve position (see RISK-MK-006), competitive dynamics, hedging programme, and breakeven price relative to forward curve                           |
| P6       | **Hybrid / layered**                        | A combination of pricing mechanisms where different revenue streams follow different pricing types. Common in practice — most assets have a blended pricing profile                                                                                                                 | Capacity market (P1) + energy market (P5) for power generators; regulated aeronautical charges (P3) + commercial revenue (P5) for airports; base rent (P1/P2) + turnover rent (P5) for retail landlords; contracted capacity (P1) + spot throughput (P5) for ports | Risk depends on the blend. Assessment must decompose revenue into its component streams and classify each separately. The proportion of P1/P2 revenue vs P4/P5 revenue is a key credit metric       |

### Dimension 2: Volume / Demand Mechanism

What drives the quantity of goods sold, services delivered, or capacity
utilised?

| **Code** | **Volume Type**                            | **Description**                                                                                                                                                                                                                                                                                   | **Typical Sectors**                                                                                                                                                                                                           | **Risk Implication**                                                                                                                                                                                                                                                                           |
|----------|--------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| V1       | **Guaranteed / take-or-pay**               | The counterparty must pay regardless of whether they use the capacity or take the product. Volume risk is entirely transferred to the counterparty. Payment may be subject to availability tests (which shifts risk to operational performance)                                                   | Take-or-pay gas contracts; ship-or-pay pipeline commitments; availability-based PFI (deductions aside); fully let single-tenant long-lease real estate; tolling agreements (counterparty takes volume risk)                   | Lowest volume risk. Credit risk shifts to counterparty (see RISK-OP-007). The key question becomes: is the counterparty creditworthy and will they honour the commitment?                                                                                                                      |
| V2       | **Contracted with performance conditions** | A contract exists, but payment depends on the asset's actual output, availability, or performance meeting specified standards. If the asset underperforms, revenue falls. The contract provides the customer but not the guarantee of payment                                                     | PPAs where the generator bears resource risk (wind/solar variability); O&M contracts with availability guarantees; rolling stock availability leases; PFI with performance deductions; hospitals with activity-based payments | Volume risk is transformed into operational/performance risk. Assessment focuses on the gap between design performance and actual achievable performance (P50 vs P90 for renewables, availability targets for rolling stock/PFI)                                                               |
| V3       | **Partially contracted**                   | A proportion of capacity or output is committed under contract, with the remainder sold on a spot or short-term basis. Common structure in many infrastructure sectors                                                                                                                            | Power plant with 70% PPA + 30% merchant; port with minimum throughput commitment + spot cargo; airline with mix of contracted and transient passengers; data centre with some anchor tenants + speculative capacity           | Risk depends on the contracted proportion and the quality of the uncontracted market. Assessment must stress the uncontracted portion independently. The "coverage ratio" of contracted revenue to debt service is a key metric                                                                |
| V4       | **Demand-driven, essential / inelastic**   | No contractual volume commitment, but demand is driven by essential need and is relatively price-inelastic. The service is a necessity with limited substitutes. Volume may still fluctuate with demographics, economic activity, and policy but within a narrower band than discretionary demand | Regulated water utility; electricity distribution; commuter rail; urban road tolls (limited alternatives); district heating (where connected); social housing                                                                 | Low to moderate volume risk. Demand is structurally supported but can still decline from demographic change, efficiency improvements (water metering, energy efficiency), or policy shifts (remote working reducing commuter demand). Long-term structural trends matter more than cyclicality |
| V5       | **Demand-driven, elastic / discretionary** | Volume depends on consumer or business choice and is meaningfully sensitive to price, competition, economic conditions, and behavioural change. Customers can choose not to use the service or can switch to alternatives                                                                         | Airport passengers (especially leisure); discretionary retail; hotel leisure guests; self-storage customers; clean tech; toll roads with free alternatives; gyms; cinemas                                                     | High volume risk. Demand is cyclical and competitive. Assessment requires traffic/demand studies, elasticity analysis, catchment area demographics, competitive intensity, and sensitivity to economic downturn. Historical demand variability is the best predictor                           |
| V6       | **Speculative / project-dependent**        | Volume is highly uncertain, dependent on specific project outcomes, exploration success, development activity, or market creation. No established demand pattern to extrapolate                                                                                                                   | Greenfield infrastructure in ramp-up phase; new-build speculative logistics; exploration-stage mining; early-stage clean tech network; hydrogen offtake (market does not yet exist at scale); first-of-a-kind technology      | Highest volume risk. Assessment must model multiple scenarios including failure to achieve target volumes. Financial structure must accommodate a ramp-up period with sub-economic utilisation                                                                                                 |

### Dimension 3: Revenue Duration

How long does the current revenue arrangement last relative to the debt
maturity?

| **Code** | **Duration Category**                      | **Description**                                                                                                                                                                         | **Risk Implication**                                                                                                                                                                                                                                                                                                  |
|----------|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| D1       | **Fully matched or over-hedged**           | The revenue arrangement (contract, concession, PPA, lease) extends to or beyond debt maturity. There is no period of uncontracted revenue during the debt term                          | Lowest duration risk. No merchant tail. Refinancing risk may still exist if the debt matures before the contract but the revenue supports refinancing                                                                                                                                                                 |
| D2       | **Substantially matched (\>80% coverage)** | The primary revenue arrangement covers more than 80% of the debt term. A short merchant tail exists but is a relatively small proportion of total debt service                          | Low duration risk. The merchant tail should be stress-tested but is unlikely to be the primary credit concern. Assessment should check whether the tail period coincides with bullet repayment                                                                                                                        |
| D3       | **Partially matched (50–80% coverage)**    | The revenue arrangement covers 50–80% of the debt term. A significant merchant tail exists. The financial model's base case includes meaningful assumptions about post-contract revenue | Moderate duration risk. The merchant tail is a material credit factor. Assessment must independently stress post-contract pricing and volume. The deal's credit quality increasingly depends on the borrower's competitive position in the uncontracted period                                                        |
| D4       | **Under-matched (\<50% coverage)**         | The revenue arrangement covers less than 50% of the debt term. The majority of the debt will be repaid from uncontracted or re-contracted revenue                                       | High duration risk. This is effectively a merchant credit for the majority of the debt term. The initial contract provides comfort for the early years but the long-term credit story depends on the asset's intrinsic competitiveness and market position                                                            |
| D5       | **No contracted revenue / fully merchant** | There is no long-term revenue arrangement. All revenue is earned on a merchant, spot, or short-term basis throughout the debt term                                                      | Highest duration risk. Revenue is entirely market-dependent from day one. Assessment is fully focused on market position, cost curve, competitive dynamics, and hedging programme. This is rare in traditional infrastructure project finance but common in leveraged corporate, real estate, and some energy sectors |

### Applying the Classification

Every deal receives a three-part revenue risk code at origination.
Examples:

| **Deal Type**                                       | **Example**                                                                                          | **Pricing**                              | **Volume**                           | **Duration**                              | **Code**    | **Revenue Risk Profile**                                                                                                                                                                                                                                         |
|-----------------------------------------------------|------------------------------------------------------------------------------------------------------|------------------------------------------|--------------------------------------|-------------------------------------------|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Availability-based PFI hospital                     | 25-year concession, unitary charge, single public authority counterparty                             | P2 (indexed)                             | V1 (guaranteed/availability)         | D1 (fully matched)                        | P2-V1-D1    | Very low revenue risk. Risks are operational (availability) and counterparty (authority credit)                                                                                                                                                                  |
| Onshore wind farm with 15-year CfD, 20-year debt    | Fixed-price CfD for 15 years, then 5-year merchant tail                                              | P1 (fixed) → P5 (merchant)               | V2 (performance-conditional)         | D3 (partially matched, 75%)               | P1/P5-V2-D3 | Low-moderate. Contracted period is very secure but resource risk exists throughout, and 25% merchant tail introduces price uncertainty                                                                                                                           |
| Toll road concession                                | 30-year concession, real tolls, traffic volume risk                                                  | P2 (indexed toll rate)                   | V5 (elastic demand)                  | D1 (fully matched)                        | P2-V5-D1    | Moderate. Toll rate is indexed and secure, but traffic volume is the principal risk — sensitive to economic cycle, competition from free alternatives, and behavioural change                                                                                    |
| Leveraged buyout of corporate                       | Diversified customer base, no long-term contracts, competitive market                                | P5 (market)                              | V5 (elastic)                         | D5 (no contracted revenue)                | P5-V5-D5    | High revenue risk. Revenue is entirely dependent on the company's competitive position, market demand, and pricing power. Credit analysis focuses on business fundamentals                                                                                       |
| Regulated water utility (WBS)                       | RAB-based tariff, 5-year regulatory price review, perpetual operation                                | P3 (regulated)                           | V4 (essential/inelastic)             | D1 (perpetual — effectively matched)      | P3-V4-D1    | Low revenue risk. Regulatory framework provides stability, but adverse price review is the key tail risk. Demand is essential and inelastic                                                                                                                      |
| Data centre with single hyperscaler tenant          | 15-year lease to AWS/Azure/Google, 12-year debt                                                      | P2 (indexed lease)                       | V1 (guaranteed by lease)             | D1 (fully matched)                        | P2-V1-D1    | Low revenue risk during contract. But extreme counterparty concentration risk (RISK-DC-003) — if the hyperscaler fails or terminates, the specialist facility may be difficult to re-let. Re-pricing risk at lease renewal is also material                      |
| Merchant gas peaker                                 | No PPA, capacity market revenue + spot energy sales                                                  | P6 (hybrid: P1 capacity + P5 energy)     | V5 (demand-driven, elastic dispatch) | D5 (no long-term contract)                | P6-V5-D5    | High revenue risk. Capacity market provides a floor but energy revenue is volatile. Merit order position determines dispatch. Transition risk from renewables and storage is existential                                                                         |
| Multi-let office building                           | Mix of 3–10 year leases, 60% occupied, 40% vacant/expiring within 2 years                            | P4 (negotiated at renewal)               | V5 (elastic — tenants can leave)     | D4 (under-matched — WAULT \< 50% of debt) | P4-V5-D4    | High revenue risk. Revenue depends on leasing market, tenant retention, and rental growth. Remote working structural shift adds sector-specific uncertainty                                                                                                      |
| Rolling stock lease — single fleet, single operator | Bespoke fleet leased to a single train operator on a specific franchise, 12-year lease, 25-year debt | P2 (indexed lease)                       | V1 (guaranteed during lease)         | D4 (under-matched — 48% coverage)         | P2-V1-D4    | Low during the initial lease, very high thereafter. After 12 years, the fleet must be re-leased — but if it's bespoke to a single route, there may be no alternative operator. Residual value / re-leasing risk (RISK-RS-001/002) is the dominant credit concern |
| clean tech network — early stage                    | Buy wholesale electricity, sell at retail premium, utilisation ramping up                            | P5 (market — competitive retail pricing) | V6 (speculative — ramp-up phase)     | D5 (no contracted revenue)                | P5-V6-D5    | Very high revenue risk. Unproven utilisation, competitive market, technology change risk. Financial structure must accommodate extended ramp-up with potential for sub-economic returns                                                                          |

### Integration with the Risk Register

The revenue risk classification does not replace the risk register — it
complements it by providing context for interpretation. Specifically:

> • **Deals classified P1/P2 + V1 + D1** (contracted, guaranteed, fully
> matched): The investment team should focus assessment effort on
> Categories 2 (structural/documentation — is the contract
> well-drafted?), 3 (operational — counterparty credit, RISK-OP-007;
> equipment lifecycle, RISK-OP-009), and 6 (ESG — is the contract
> sustainable?). Market risks (Category 4) are largely mitigated by the
> contract.
>
> • **Deals classified P3 + V4** (regulated, essential demand): Focus on
> regulatory risk (RISK-RL-001, RISK-RL-002), the regulatory compact's
> durability, and long-term structural demand trends (electrification,
> population, climate). The regulatory framework is both the primary
> protection and the primary risk.
>
> • **Deals classified P4/P5 + V5 + D4/D5** (negotiated/merchant,
> elastic, under-matched): These are primarily market-risk deals.
> Category 4 (market, competitive dynamics, output price risk) and
> Category 1 (credit and financial — leverage, cash flow, refinancing)
> are the dominant risk areas. The competitive dynamics framework
> (RISK-MK-007 through RISK-MK-011) becomes critical.
>
> • **Deals with hybrid revenue (P6)**: The assessment must decompose
> revenue into its component streams and classify each separately. The
> proportion of contracted vs merchant revenue — and which portion
> supports debt service — is a key underwriting metric. A deal with 80%
> P1 revenue and 20% P5 revenue is fundamentally different from one with
> 40% P1 and 60% P5, even if total revenue is the same.
>
> • **Deals with duration mismatch (D3/D4)**: Contract renewal risk
> (RISK-OP-008) and merchant tail risk become critical. The financial
> model's assumptions about post-contract revenue must be independently
> stressed. The re-contracting market conditions 10–20 years from now
> are inherently uncertain.

### Revenue Risk on the TopSheet

The revenue risk classification appears on the topsheet summary:

> Revenue Risk Profile:
>
> Classification: P2-V1-D1 (Indexed / Guaranteed / Fully Matched)
>
> Profile: CONTRACTED — Very Low Revenue Risk
>
> Revenue Decomposition:
>
> Availability payment (indexed): £12.4m (92%) \[P2-V1, expires 2042\]
>
> Insurance proceeds / other: £1.1m (8%) \[variable\]
>
> Contract Coverage:
>
> Primary contract expiry: 2042
>
> Debt maturity: 2039
>
> Duration coverage: 108% (over-matched)
>
> WACL (weighted avg contract life): 17.2 years
>
> Revenue Risk Trend: Stable →
>
> Last classified: 2025-06-30 (Annual Review)

### Revenue Risk in the Data Model

Add to the deal_card.json in 00_deal_metadata/:

> {
>
> "revenue_risk_classification": {
>
> "pricing_mechanism": "P2",
>
> "pricing_description": "Indexed / escalating by formula",
>
> "volume_mechanism": "V1",
>
> "volume_description": "Guaranteed / take-or-pay",
>
> "duration_category": "D1",
>
> "duration_description": "Fully matched or over-hedged",
>
> "composite_code": "P2-V1-D1",
>
> "revenue_risk_level": "very_low",
>
> "revenue_streams": \[
>
> {
>
> "stream_name": "Availability payment",
>
> "annual_amount": 12400000,
>
> "percentage_of_total": 92,
>
> "pricing_type": "P2",
>
> "volume_type": "V1",
>
> "contract_counterparty": "NHS Trust",
>
> "contract_expiry": "2042-03-31",
>
> "indexation": "RPI"
>
> },
>
> {
>
> "stream_name": "Insurance and other",
>
> "annual_amount": 1100000,
>
> "percentage_of_total": 8,
>
> "pricing_type": "P5",
>
> "volume_type": "V5",
>
> "contract_counterparty": null,
>
> "contract_expiry": null,
>
> "indexation": null
>
> }
>
> \],
>
> "primary_contract_expiry": "2042-03-31",
>
> "debt_maturity": "2039-09-30",
>
> "duration_coverage_pct": 108,
>
> "weighted_average_contract_life_years": 17.2,
>
> "contracted_revenue_pct": 92,
>
> "merchant_revenue_pct": 8,
>
> "classified_by": "analyst_id",
>
> "classified_date": "2025-06-30",
>
> "review_trigger": "annual_review"
>
> }
>
> }

Add a RevenueRiskClassification entity to the canonical data model:

| **Field**                  | **Type**                       | **Notes**                                                        |
|----------------------------|--------------------------------|------------------------------------------------------------------|
| classification_id          | UUID                           |                                                                  |
| investment_id              | FK → Investment                |                                                                  |
| pricing_mechanism          | Enum                           | P1, P2, P3, P4, P5, P6                                           |
| volume_mechanism           | Enum                           | V1, V2, V3, V4, V5, V6                                           |
| duration_category          | Enum                           | D1, D2, D3, D4, D5                                               |
| composite_code             | String                         | e.g. P2-V1-D1                                                    |
| revenue_risk_level         | Enum                           | very_low, low, moderate, high, very_high                         |
| contracted_revenue_pct     | Decimal                        | Percentage of total revenue that is contracted                   |
| merchant_revenue_pct       | Decimal                        | Percentage of total revenue that is merchant/uncontracted        |
| primary_contract_expiry    | Date                           | Expiry of the largest revenue contract                           |
| debt_maturity              | Date                           | For duration coverage calculation                                |
| duration_coverage_pct      | Decimal                        | Contract life as % of debt term                                  |
| weighted_avg_contract_life | Decimal                        | In years                                                         |
| number_of_revenue_streams  | Integer                        | How many distinct revenue sources                                |
| classified_by              | FK → User                      |                                                                  |
| classified_date            | Date                           |                                                                  |
| review_trigger             | Enum                           | initial_close, annual_review, post_amendment, post_event, ad_hoc |
| prior_classification_id    | FK → RevenueRiskClassification | For tracking changes over time                                   |
| commentary                 | Text                           | Analyst's narrative on revenue risk assessment                   |

Add events to the event taxonomy:

> • **RevenueRiskClassified** — initial classification at close or
> updated classification at review
>
> • **RevenueRiskChanged** — composite code changes (e.g. contract
> expires, moving from D2 to D4); generates alert to PM
>
> • **ContractExpiryApproaching** — scheduled alert when a major revenue
> contract is within 3 years of expiry relative to remaining debt term

### Portfolio-Level Revenue Risk Aggregation

The consistent classification enables portfolio-level analysis:

> • **Revenue risk heatmap**: Distribution of portfolio by composite
> code — how much exposure to P5/V5/D5 (fully merchant) vs P1/V1/D1
> (fully contracted)?
>
> • **Contract expiry concentration**: Are multiple deals' primary
> contracts expiring in the same period?
>
> • **Duration coverage distribution**: What proportion of the portfolio
> has duration coverage below 80%?
>
> • **Merchant revenue exposure**: Aggregate merchant revenue as % of
> total portfolio revenue — and trend over time as contracts expire
>
> • **Sector × revenue risk cross-tabulation**: Are certain sectors
> systematically higher revenue risk? (Expected: yes — renewables
> trending from P1 to P5 as legacy CfDs expire; leveraged corporates
> inherently P5-V5-D5)

## Using the Register

### At Origination (IC Process)

The investment team works through all seven categories, marking each
risk as:

> • **Assessed** — with likelihood, severity, score, and commentary
>
> • **Not applicable** — with brief rationale (e.g. "no construction
> phase" for RISK-OP-011)
>
> • **Not yet assessed** — flagged for further diligence

The completed register is stored in 01_origination/06_credit_approval/
alongside the IC memorandum. The aggregate risk profile (number of
High/Critical risks, top 5 risks by score) feeds into the IC paper.

### During Monitoring (Annual Review and Event-Driven)

At each annual review, the HAM revisits the register:

> • Re-scores each risk based on current information
>
> • Updates the trend indicator (improving / stable / deteriorating)
>
> • Adds any newly identified risks (marked with ★)
>
> • Removes risks that have been permanently retired (e.g. construction
> completion for an operational project)

Event-driven updates occur after material events: covenant breaches,
amendments, external shocks, rating changes, or macroeconomic shifts.

### On the TopSheet

The topsheet displays a risk summary:

> Risk Profile:
>
> Critical (16-25): 1 \[RISK-CF-015 Refinancing risk: L4 × S4 = 16 ↓\]
>
> High (10-15): 3
>
> Moderate (5-9): 8
>
> Low (1-4): 12
>
> N/A: 41
>
> Top 3 Risks:
>
> 1\. RISK-CF-015 Refinancing risk 16 ↓ Deteriorating
>
> 2\. RISK-CF-010 Leverage trajectory 12 → Stable
>
> 3\. RISK-OP-007 Counterparty risk 10 ↑ Improving
>
> Trend: Overall risk profile STABLE (1 deteriorating, 2 improving since
> last review)
>
> Last assessed: 2025-06-30 (Annual Review)

### Portfolio Aggregation

Because the risk taxonomy is consistent across all deals, the system can
compute:

> • **Risk heatmap:** Likelihood vs severity matrix across the entire
> portfolio
>
> • **Most common High/Critical risks:** Which risk categories appear
> most frequently at elevated levels
>
> • **Sector risk patterns:** Whether certain sectors consistently carry
> specific risk profiles
>
> • **Trend analysis:** Whether risks across the portfolio are generally
> improving or deteriorating
>
> • **Concentration analysis:** Whether the portfolio is concentrated in
> deals with similar risk profiles

This feeds the anonymised intelligence plane — with sufficient volume,
the platform can publish market-wide risk distribution data.

## Data Model: RiskAssessment Entity

Each risk assessment for each deal is stored as a canonical record:

| **Field**             | **Type**            | **Notes**                                                                                                                      |
|-----------------------|---------------------|--------------------------------------------------------------------------------------------------------------------------------|
| assessment_id         | UUID                |                                                                                                                                |
| investment_id         | FK → Investment     |                                                                                                                                |
| risk_id               | String              | e.g. RISK-CF-001, RISK-ST-003                                                                                                  |
| risk_category         | Enum                | credit_financial, structural_documentation, business_operational, market_macro, regulatory_legal, esg_climate, sector_specific |
| risk_name             | String              | e.g. "Revenue concentration"                                                                                                   |
| status                | Enum                | assessed, not_applicable, not_yet_assessed                                                                                     |
| likelihood            | Integer             | 1–5                                                                                                                            |
| severity              | Integer             | 1–5                                                                                                                            |
| risk_score            | Integer             | Computed: likelihood × severity                                                                                                |
| risk_level            | Enum                | low, moderate, high, critical                                                                                                  |
| trend                 | Enum                | improving, stable, deteriorating, new                                                                                          |
| commentary            | Text                | Analyst's assessment narrative                                                                                                 |
| mitigants             | Text                | What protections exist (contractual, structural, market)                                                                       |
| monitoring_indicators | Text\[\]            | What to watch — metrics, events, or data points that would signal a change                                                     |
| assessed_by           | FK → User           |                                                                                                                                |
| assessed_date         | Date                |                                                                                                                                |
| review_trigger        | Enum                | initial_close, annual_review, quarterly_review, post_event, ad_hoc                                                             |
| prior_assessment_id   | FK → RiskAssessment | Links to previous assessment for trend tracking                                                                                |

### Events

| **Event**         | **Trigger**                                | **System Response**                                        |
|-------------------|--------------------------------------------|------------------------------------------------------------|
| RiskAssessed      | Analyst submits or updates risk assessment | Record created/updated; topsheet risk profile recalculated |
| RiskEscalated     | Risk score moves to High or Critical       | Alert to PM; exception created                             |
| RiskDeteriorating | Trend changes to deteriorating             | Flagged in topsheet; HAM notified                          |
| RiskReviewDue     | Scheduled review approaching (e.g. annual) | Reminder to HAM with current register pre-populated        |

## Deal Container Location

The risk register is stored in the deal container:

> /{investment_id}/
>
> ├── 00_deal_metadata/
>
> │ └── risk_register.json \# Current risk register (structured,
> machine-readable)
>
> │
>
> ├── 01_origination/
>
> │ └── 06_credit_approval/
>
> │ └── risk_assessment/
>
> │ ├── initial_risk_register.json \# Risk register as at close
> (baseline)
>
> │ └── initial_risk_narrative.pdf \# Supporting analysis from IC
> process
>
> │
>
> └── 07_internal/
>
> └── risk_assessments/
>
> └── {YYYY}/
>
> └── {YYYY_MM_DD}\_{trigger}/ \# e.g. "2025_06_30_annual_review"
>
> ├── risk_register.json \# Full register at this assessment date
>
> └── risk_commentary.pdf \# Supporting narrative / changes

The 00_deal_metadata/risk_register.json always reflects the current
assessment. Historical versions are preserved in
07_internal/risk_assessments/ for trend analysis and audit.

# PART F: TOPSHEET DATA SCHEMA

## Purpose and Scope

The TopSheet is the canonical data structure for each investment on the
platform. It is a materialised view — a computed projection over
canonical state that is recalculated whenever the underlying data
changes (see D.8). This Part specifies every field in that projection:
the complete schema from which the deal-level dashboard, portfolio
views, and reporting are derived.

The schema has been validated against four real financial models
spanning different deal types, reporting frequencies, and structural
complexity:

> **1. Data centre project finance** — quarterly cashflows, GPU-based
> KPIs, single-asset SPV. The simplest capital structure: one senior
> facility plus equity.
>
> **2. Spanish port concession** — annual periods, multi-subsidiary
> (subsidiary ports), leverage grids, cash sweeps, concession-specific
> terms. Multi-facility senior with pari passu ranking.
>
> **3. Clean tech hub** — monthly periods, phased charger rollout,
> battery storage, real estate exit methodology. Senior plus shareholder
> loan with dual ratio classes.
>
> **4. UK airport acquisition** — quinquennial regulatory periods,
> RAB-based leverage, Class A/B bond tranching, multi-entity corporate
> structure (OpCo through TopCo), index-linked hedging, solvency ratios.
> The most complex structure: six entities, four enforcement classes,
> fourteen scenarios.

The schema accommodates monthly through annual reporting; single-asset
through multi-subsidiary structures; project finance, WBS, concession,
and leveraged acquisition deal types; and debt instruments from term
loans through index-linked bonds.

### Relationship to Other Parts

This schema does not exist in isolation. It connects directly to the
frameworks defined elsewhere in this document:

> • **Part B (Financial Covenant Framework)** defines the conceptual
> framework for how covenants work — the two questions (can I pay? is
> there enough?), the three-tier structure (lock-up, trigger, default),
> and the financial definitions taxonomy. Sections F.6 (Ratios &
> Covenant Thresholds) and F.2A.6 (Ratio Aggregation Framework)
> implement Part B's concepts as concrete data structures, specifying
> exactly how each ratio is computed for each enforcement class.
>
> • **Part D (Data Architecture)** defines the canonical entity model,
> event taxonomy, and processing layers. The TopSheet schema is the
> principal consumer of the canonical model — it draws from the
> Investment, Obligation, CovenantTest, Assessment, and FinancialPeriod
> entities defined in D.3. The Holding → Account → Organisation
> hierarchy defined in D.10 determines how TopSheet data is filtered and
> aggregated into portfolio views.
>
> • **Part E (Risk Register & Assessment Framework)** defines the risk
> taxonomy and the revenue risk classification framework. Section F.11
> carries the risk register summary and revenue risk classification onto
> the TopSheet, enabling portfolio-level risk aggregation. The revenue
> risk composite code (P/V/D classification from Part E) appears as a
> first-class field.
>
> • **Part A (Master Deliverables & Covenants Register)** provides the
> comprehensive taxonomy of what must be monitored. Section F.12
> (Covenant Deliverables & Compliance) captures the current status of
> those obligations on each deal.

### Schema Conventions

> • **Type** indicates the storage type: String, Integer, Decimal,
> Boolean, Date, Timestamp, Enum (controlled list), UUID, Text
> (long-form), JSONB (structured JSON), JSONB\[\] (array of JSON
> objects).
>
> • **Req** indicates whether the field is required (Y) or optional (N)
> at the deal level. Not all fields apply to all deal types.
>
> • Fields marked *v2 NEW* were added in version 2.0 based on model
> validation.
>
> • JSONB fields include their expected structure in the Description
> column. This is the logical schema; physical storage may normalise
> arrays into child tables where query patterns require it.

## F.1 DEAL IDENTITY & STATIC DATA

Core identifying information. Set at origination, updated on material
events.

### F.1.1 Borrower & Deal Identification

| **Field**                  | **Type**   | **Req** | **Description / Notes**                                                                                    |
|----------------------------|------------|---------|------------------------------------------------------------------------------------------------------------|
| investment_id              | UUID       | Y       | Primary key. System-generated, immutable.                                                                  |
| investment_name            | String     | Y       | Short deal name (e.g. 'Port Concession Senior Secured', 'Clean Tech Hub', 'Airport Acquisition Facility'). |
| borrower_legal_name        | String     | Y       | Full legal name of the borrowing entity.                                                                   |
| borrower_trading_name      | String     | N       | Trading name if different.                                                                                 |
| borrower_lei               | String(20) | N       | Legal Entity Identifier (ISO 17442).                                                                       |
| borrower_jurisdiction      | String     | Y       | Country of incorporation (ISO 3166-1 alpha-2).                                                             |
| borrower_registered_number | String     | N       | Company registration number.                                                                               |
| borrower_address           | Text       | N       | Registered address.                                                                                        |
| project_codename           | String     | N       | Internal codename. For cross-referencing.                                                                  |
| approved_auditors          | String\[\] | N       | List of approved audit firms from the finance documentation. Change of auditor may require lender consent. |

### F.1.2 Sector Classification

SIC 2007 primary. TICCS for infrastructure. GICS/NAICS cross-references.

| **Field**                 | **Type**  | **Req** | **Description / Notes**                       |
|---------------------------|-----------|---------|-----------------------------------------------|
| sic_code                  | String(5) | Y       | UK SIC 2007 (e.g. '35110', '52220', '51101'). |
| sic_section               | Char(1)   | Y       | SIC Section letter.                           |
| sic_division              | String(2) | Y       | SIC Division.                                 |
| sector_label              | String    | Y       | Human sector label (controlled list).         |
| sub_sector_label          | String    | Y       | Human sub-sector label (controlled list).     |
| ticcs_business_risk       | Enum      | N       | TICCS: contracted, merchant, regulated.       |
| ticcs_industrial_activity | String    | N       | TICCS Industrial Activity code.               |
| naics_code                | String(6) | N       | NAICS code.                                   |
| gics_code                 | String(8) | N       | GICS code.                                    |

### F.1.3 Ownership & Controlling Parties

| **Field**             | **Type**   | **Req** | **Description / Notes**                                                                                                                     |
|-----------------------|------------|---------|---------------------------------------------------------------------------------------------------------------------------------------------|
| sponsor_name          | String     | N       | Financial sponsor / PE firm.                                                                                                                |
| sponsor_fund          | String     | N       | Specific fund vehicle.                                                                                                                      |
| parent_group          | String     | N       | Ultimate parent group.                                                                                                                      |
| parent_lei            | String(20) | N       | LEI of ultimate parent.                                                                                                                     |
| parent_jurisdiction   | String     | N       | Country of ultimate parent.                                                                                                                 |
| beneficial_owner_name | String     | N       | Ultimate beneficial owner.                                                                                                                  |
| beneficial_owner_type | Enum       | N       | pe_sponsor, sovereign, family_office, public_company, government, infrastructure_fund, consortium, other.                                   |
| consortium_members    | JSONB\[\]  | N       | For consortium deals: \[{name, ownership_pct, entity_type}\]. Airport WBS: \[Investor A\] 84.4%, \[Investor B\] 10.4%, \[Investor C\] 5.2%. |
| ownership_chain       | JSONB      | N       | Intermediate entities: \[{name, jurisdiction, ownership_pct}\].                                                                             |
| government_related    | Boolean    | Y       | Government entity has material ownership or guarantee role.                                                                                 |
| government_entity     | String     | N       | Government entity name if applicable.                                                                                                       |

### F.1.4 Geography & Currency

| **Field**            | **Type**   | **Req** | **Description / Notes**                                                           |
|----------------------|------------|---------|-----------------------------------------------------------------------------------|
| country              | String     | Y       | Primary country (ISO 3166-1 alpha-2).                                             |
| country_name         | String     | Y       | Full country name.                                                                |
| region               | Enum       | Y       | uk, europe_ex_uk, north_america, latam, asia_pacific, middle_east_africa, global. |
| additional_countries | String\[\] | N       | Other countries with material operations.                                         |
| deal_currency        | String(3)  | Y       | ISO 4217 currency (e.g. 'GBP', 'EUR', 'USD').                                     |
| reporting_currency   | String(3)  | N       | Currency of financial statements if different.                                    |
| fx_reporting_rate    | Decimal    | N       | FX rate for reporting currency conversion.                                        |

## F.2 DEAL STRUCTURE & TERMS

Commercial terms. Updated on amendments, waivers, or restructurings.

### F.2.1 Structure & Origination

| **Field**              | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                       |
|------------------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| structure_type         | Enum      | Y       | leveraged_loan, project_finance, pfi, wbs, real_estate, uspp, bond, direct_lending, unitranche, infrastructure_debt, concession, ev_infrastructure, regulated_utility, airport_acquisition, other.                                                            |
| deal_type              | Enum      | Y       | term_loan, revolving_credit, delayed_draw, capex_facility, mezzanine, unitranche, senior_secured, second_lien, holdco, pik, private_placement, bond, notes_144a, shareholder_loan, lease_finance, class_a_bond, class_b_bond, index_linked_bond, other.       |
| origination_type       | Enum      | Y       | primary_origination, primary_syndication, secondary_purchase, club_deal, bilateral, other.                                                                                                                                                                    |
| seniority              | Enum      | Y       | super_senior, senior_secured, senior_unsecured, second_lien, mezzanine, subordinated, pik, equity_like.                                                                                                                                                       |
| security_type          | Enum      | Y       | first_lien_all_assets, first_lien_specific, second_lien, unsecured, negative_pledge, pf_security_package, real_estate_mortgage, wbs_charge, concession_assignment, other.                                                                                     |
| security_summary       | Text      | N       | Narrative on security package.                                                                                                                                                                                                                                |
| ranking_lien_narrative | Text      | N       | Ranking and lien position narrative.                                                                                                                                                                                                                          |
| multi_subsidiary       | Boolean   | N       | Whether multiple operating subsidiaries exist.                                                                                                                                                                                                                |
| subsidiary_entities    | JSONB\[\] | N       | \[{name, jurisdiction, activity, revenue_contribution_pct}\].                                                                                                                                                                                                 |
| corporate_structure    | JSONB\[\] | N       | Full corporate chain with intercompany loans: \[{entity_name, entity_type (opco/bidco/holdco/topco/eurobondco/bufferco), parent, intercompany_loan_to, intercompany_loan_amount}\]. Airport WBS: OpCo-\>BidCo-\>JuniorHoldCo-\>BufferCo-\>EurobondCo-\>TopCo. |

### F.2.2 Key Dates

| **Field**                 | **Type** | **Req** | **Description / Notes**                                           |
|---------------------------|----------|---------|-------------------------------------------------------------------|
| origination_date          | Date     | Y       | Facility signed / closed.                                         |
| commitment_date           | Date     | N       | IC commitment date.                                               |
| first_drawdown_date       | Date     | N       | First utilisation date.                                           |
| cod_date                  | Date     | N       | Commercial Operation Date.                                        |
| cod_months                | Integer  | N       | Months from model start to COD.                                   |
| maturity_date             | Date     | Y       | Contractual final maturity.                                       |
| weighted_average_life     | Decimal  | N       | WAL in years.                                                     |
| contract_length_months    | Integer  | N       | Primary revenue contract length.                                  |
| next_call_date            | Date     | N       | First optional prepayment date.                                   |
| next_reset_date           | Date     | N       | Next rate reset / margin ratchet date.                            |
| fiscal_year_end_month     | Integer  | Y       | Month (1-12) of FY end.                                           |
| current_phase             | Enum     | Y       | pre_close, construction, ramp_up, operational, runoff, closed.    |
| concession_expiry_date    | Date     | N       | Concession / licence end date.                                    |
| concession_grantor        | String   | N       | Concession-granting authority.                                    |
| concession_expiry_dates   | JSONB    | N       | Per-asset: \[{asset_name, expiry_date}\].                         |
| operational_term_years    | Integer  | N       | Operational term from COD.                                        |
| last_repayment_date       | Date     | N       | Date all debt must be repaid.                                     |
| exit_date                 | Date     | N       | Assumed exit / hold period end. Airport WBS: 2039.                |
| hold_period_years         | Decimal  | N       | Hold period in years. Airport WBS: 29.8.                          |
| regulatory_period_current | String   | N       | Current regulatory period label (e.g. 'Q5', 'Q6'). WBS/regulated. |
| regulatory_period_end     | Date     | N       | End of current regulatory period.                                 |

### F.2.3 Facility Economics

| **Field**            | **Type** | **Req** | **Description / Notes**                                                                                                                            |
|----------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| total_facility_size  | Decimal  | Y       | Total committed facility size.                                                                                                                     |
| total_drawn          | Decimal  | N       | Current total drawn.                                                                                                                               |
| our_commitment       | Decimal  | Y       | Our committed amount.                                                                                                                              |
| our_drawn            | Decimal  | N       | Our current drawn.                                                                                                                                 |
| our_holding_pct      | Decimal  | N       | Our share as % of total.                                                                                                                           |
| pricing_type         | Enum     | Y       | floating, fixed, index_linked, hybrid.                                                                                                             |
| pricing_margin_bps   | Integer  | N       | Margin over reference rate (bps).                                                                                                                  |
| coupon_rate          | Decimal  | N       | Fixed coupon / all-in rate (%).                                                                                                                    |
| reference_rate       | String   | N       | SONIA, SOFR, EURIBOR_3M, LIBOR, RPI, CPI, fixed, other.                                                                                            |
| floor_rate           | Decimal  | N       | Rate floor (%).                                                                                                                                    |
| current_price        | Decimal  | N       | Secondary market price (% par).                                                                                                                    |
| amortisation_profile | Enum     | Y       | bullet, amortising_scheduled, amortising_sculpted, cash_sweep, annuity, hybrid.                                                                    |
| call_protection      | Text     | N       | Call / make-whole / prepayment terms.                                                                                                              |
| governing_law        | String   | N       | Governing law.                                                                                                                                     |
| syndicated           | Boolean  | N       | Whether syndicated.                                                                                                                                |
| number_of_lenders    | Integer  | N       | Total lenders.                                                                                                                                     |
| facility_agent       | String   | N       | Facility agent.                                                                                                                                    |
| security_trustee     | String   | N       | Security trustee.                                                                                                                                  |
| margin_ratchet       | JSONB    | N       | Leverage grid: \[{leverage_min, leverage_max, margin_bps}\].                                                                                       |
| cash_sweep_schedule  | JSONB    | N       | Sweep by year: \[{year, sweep_pct}\].                                                                                                              |
| hedge_requirements   | JSONB    | N       | {min_hedged_pct, max_hedged_pct, instrument_type}.                                                                                                 |
| hedging_portfolio    | JSONB    | N       | Hedges in place: \[{type (floating_to_fixed/index_linked/fixed_to_floating), notional, pct_of_debt, tenor, rate}\]. Airport WBS: 50% FtoF, 40% IL. |

### F.2.4 Change of Control Regime

Records the documentation's provisions governing transfers of ownership,
shareholder changes, and the conditions under which these require lender
consent or trigger mandatory prepayment.

| **Field**                    | **Type** | **Req** | **Description / Notes**                                                                                                                                                                                                                                                                                                                                                                |
|------------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| coc_regime_exists            | Boolean  | Y       | Whether the documentation includes a change of control provision.                                                                                                                                                                                                                                                                                                                      |
| coc_definition               | Text     | N       | How "control" is defined (e.g. \>50% voting rights, ability to direct affairs, beneficial ownership of \>30%).                                                                                                                                                                                                                                                                         |
| coc_consequence              | Enum     | N       | mandatory_prepayment_offer, event_of_default, consent_required, mandatory_prepayment_at_par, mandatory_prepayment_at_make_whole, put_right. What happens if a change of control occurs.                                                                                                                                                                                                |
| coc_prepayment_basis         | Enum     | N       | par, make_whole, market_value, par_plus_premium, other. Repayment basis if CoC triggers mandatory prepayment.                                                                                                                                                                                                                                                                          |
| coc_permitted_transfers      | JSONB    | N       | Transfers that do not trigger the change of control provisions: {whitelist: \[{entity_name, entity_type}\], criteria: \[{criterion_name, criterion_description}\]}. Common criteria include: regulated institutional investor, minimum AUM (e.g. \>£500m), investment grade credit quality, existing co-investor, affiliate of existing investor, sovereign wealth fund, pension fund. |
| coc_consent_threshold        | Enum     | N       | majority, all_lender, supermajority. Consent required for non-permitted transfers.                                                                                                                                                                                                                                                                                                     |
| coc_notification_period_days | Integer  | N       | Number of days' advance notice required for contemplated change of control.                                                                                                                                                                                                                                                                                                            |
| coc_drag_along               | Boolean  | N       | Whether majority shareholders can force sale of minority positions.                                                                                                                                                                                                                                                                                                                    |
| coc_tag_along                | Boolean  | N       | Whether minority shareholders can participate in majority sale.                                                                                                                                                                                                                                                                                                                        |

## F.2A CAPITAL STRUCTURE MODEL

This section replaces the flatdebt_facilitiesarray from v1 with a
comprehensive capital structure model that handles the full spectrum of
private debt arrangements: from simple senior-plus-equity deals through
multi-tranche leveraged financings with structural and contractual
subordination,holdcolayers, and class-based waterfall mechanics.

The design is driven by three principles: (1) every instrument in the
capital stack gets its own record with an explicit ranking position, (2)
instruments are grouped into enforcement classes that determine recovery
priority, and (3) ratios can be computed at any aggregation level (e.g.
Class A leverage, total senior leverage, group leverage including
shareholder loans).

### F.2A.1 Design Overview

The capital structure is modelled as three related tables:

capital_structure_instruments— One row per debt or equity instrument in
the stack. Each has awaterfall_priority(integer, 1 = most senior) that
determines payment order. Instruments at the same priority are pari
passu.

capital_structure_classes— Groups of instruments that share enforcement
rights and covenant measurement. E.g. 'Class A' includes all Class A
bonds + the acquisition term loan in Airport WBS. 'Senior Secured'
includes Facility A-D in Port Concession. Ratios are computed per class.

capital_structure_entities— For multi-entity structures, maps each
instrument to its borrowing entity. Airport WBS has 6 entities
(OpCothroughTopCo). Most deals have 1.

### F.2A.2 Instruments Table (capital_structure_instruments)

One row per instrument. This is the atomic unit of the capital
structure.

**F.2A.2.1 Instrument Identity**

| **Field**             | **Type** | **Req** | **Description / Notes**                                                                                 |
|-----------------------|----------|---------|---------------------------------------------------------------------------------------------------------|
| instrument_id         | UUID     | Y       | Primary key.                                                                                            |
| investment_id         | UUID     | Y       | FK to deal.                                                                                             |
| instrument_name       | String   | Y       | Display name (e.g. 'Facility A', 'Class A Tranche 1', 'Shareholder Loan', 'Nil-Par Preference Shares'). |
| instrument_short_code | String   | N       | Compact code (e.g. 'A-1', 'B-2', 'SHL', 'NPPS', 'Mezz').                                                |
| instrument_type       | Enum     | Y       | See enum below.                                                                                         |
| instrument_sub_type   | String   | N       | Free text refinement (e.g. 'Index-Linked', 'PIK Toggle', 'Cash Pay').                                   |

*instrument_type enum: senior_term_loan, senior_revolving,
capex_facility, working_capital_facility, acquisition_facility,
refinancing_facility, class_a_bond, class_b_bond, index_linked_bond,
fixed_rate_bond, floating_rate_note, mezzanine, second_lien,
unitranche_first_out, unitranche_last_out, holdco_notes,
shareholder_loan, pik_note, vendor_loan, lease_finance,
nil_par_preference_shares, ordinary_equity, share_premium,
revaluation_reserve, retained_earnings, other_debt, other_equity*

**F.2A.2.2 Ranking & Subordination**

| **Field**            | **Type** | **Req** | **Description / Notes**                                                                                                                                                                                           |
|----------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| waterfall_priority   | Integer  | Y       | Payment priority in the cashflow waterfall. 1 = paid first. Same number = pari passu. E.g. super senior RCF = 1, Class A = 2, Class B = 3, Mezz = 4, SHL = 5, Equity = 99.                                        |
| enforcement_class_id | UUID     | N       | FK to capital_structure_classes. Groups instruments for enforcement and ratio calculation.                                                                                                                        |
| subordination_type   | Enum     | Y       | contractual (same entity, different ranking by contract), structural (different entity, subordinated by position in corporate chain), pari_passu (equal ranking with others at same priority), equity (not debt). |
| borrowing_entity_id  | UUID     | N       | FK to capital_structure_entities. Which entity is the borrower.                                                                                                                                                   |
| guarantor_entity_ids | UUID\[\] | N       | Entities providing guarantees for this instrument.                                                                                                                                                                |
| is_secured           | Boolean  | Y       | Whether the instrument has security.                                                                                                                                                                              |
| security_package     | String   | N       | Description of security (e.g. 'First-ranking charge over all assets of OpCo', 'Second lien over receivables').                                                                                                    |
| security_sharing     | String   | N       | Whether security is shared pari passu with other instruments and which ones.                                                                                                                                      |

**F.2A.2.3 Commercial Terms**

| **Field**            | **Type**  | **Req** | **Description / Notes**                                                          |
|----------------------|-----------|---------|----------------------------------------------------------------------------------|
| committed_amount     | Decimal   | Y       | Total committed / issuance amount.                                               |
| drawn_amount         | Decimal   | N       | Current drawn / outstanding.                                                     |
| currency             | String(3) | Y       | ISO 4217.                                                                        |
| signing_date         | Date      | N       | Date signed.                                                                     |
| availability_start   | Date      | N       | Availability period start.                                                       |
| availability_end     | Date      | N       | Availability period end.                                                         |
| maturity_date        | Date      | Y       | Contractual maturity.                                                            |
| tenor_years          | Decimal   | N       | Original tenor.                                                                  |
| pricing_type         | Enum      | Y       | floating, fixed, index_linked, hybrid, pik, nil_coupon.                          |
| margin_bps           | Integer   | N       | Margin (bps). May be initial margin before ratchet.                              |
| margin_ratchet       | JSONB     | N       | \[{trigger_metric, trigger_value, margin_bps}\].                                 |
| base_rate            | String    | N       | Reference rate (SONIA, SOFR, LIBOR, RPI, etc).                                   |
| base_rate_tenor      | String    | N       | Tenor of reference rate (3M, 6M, etc).                                           |
| all_in_rate          | Decimal   | N       | Current all-in cost (%).                                                         |
| floor_rate           | Decimal   | N       | Rate floor.                                                                      |
| issuance_format      | Enum      | N       | For bonds: fixed, index_linked.                                                  |
| pik_toggle           | Boolean   | N       | Whether PIK toggle applies.                                                      |
| pik_rate             | Decimal   | N       | PIK rate if different from cash pay.                                             |
| capitalised_interest | Boolean   | N       | Whether interest capitalises (SHL in Airport WBS, Port Concession intercompany). |

**F.2A.2.4 Repayment Mechanics**

| **Field**                   | **Type**   | **Req** | **Description / Notes**                                                                                                    |
|-----------------------------|------------|---------|----------------------------------------------------------------------------------------------------------------------------|
| repayment_type              | Enum       | Y       | bullet, scheduled_amortising, sculpted, cash_sweep, annuity, mandatory_prepayment, bond_takeout, revolving, none (equity). |
| amortisation_schedule       | JSONB      | N       | \[{period, principal_amount}\] for scheduled.                                                                              |
| cash_sweep_pct              | JSONB      | N       | \[{year, sweep_pct}\]. Port Concession: 25/25/50/75/100.                                                                   |
| cash_sweep_trigger          | String     | N       | What triggers sweep (e.g. leverage, excess cash).                                                                          |
| mandatory_prepayment_events | String\[\] | N       | Events triggering mandatory prepay (change of control, asset disposal, insurance proceeds, excess cash).                   |
| bond_takeout_schedule       | JSONB      | N       | \[{takeout_date, proportion, replacement_instrument}\]. Airport WBS: 18m first takeout, full at maturity.                  |
| partial_refinancing         | JSONB      | N       | {refinance_date, amount_repaid, replacement_instrument}.                                                                   |
| call_protection             | Text       | N       | Prepayment penalties, make-whole, non-call periods.                                                                        |
| extension_fees              | JSONB      | N       | \[{payable_at_year, fee_pct, margin_stepup_bps, conditions}\]. Airport WBS: 3 extension fees.                              |

**F.2A.2.5 Fees & Costs**

| **Field**              | **Type** | **Req** | **Description / Notes**                   |
|------------------------|----------|---------|-------------------------------------------|
| arrangement_fee_pct    | Decimal  | N       | Upfront arrangement fee (%).              |
| arrangement_fee_amount | Decimal  | N       | Upfront fee (absolute).                   |
| commitment_fee_pct     | Decimal  | N       | Commitment fee as % of margin on undrawn. |
| ticking_fee_pct        | Decimal  | N       | Ticking fee as % of margin pre-drawdown.  |
| annual_admin_fee       | Decimal  | N       | Annual administration/agency fee.         |

**F.2A.2.6 Reserve Accounts & Liquidity Facilities**

Each reserve account and liquidity facility is recorded separately for
individual monitoring. The TopSheet shows which reserves are present,
their documented required balances, and whether they are fully funded.

| **Field**                 | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|---------------------------|-----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| reserve_accounts          | JSONB\[\] | N       | Array of individual reserve accounts: \[{reserve_id, reserve_name, reserve_type (enum: dsra/maintenance/capex/tax/escrow/lock_up/insurance/environmental/decommissioning/bespoke), sizing_basis (months_of_ds/fixed_amount/pct_of_facility/pct_of_rab), documented_required_balance, current_balance, funded_status (enum: fully_funded/partially_funded/unfunded/in_drawdown), funding_method (cash/letter_of_credit/committed_facility/surety_bond), linked_instrument_ids\[\], last_verified_date, shortfall_amount}\]. |
| dsra_months               | Decimal   | N       | DSRA sizing in months of debt service. Airport WBS: 12 months. Port Concession: 6 months.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| liquidity_facilities      | JSONB\[\] | N       | Liquidity and working capital facilities: \[{facility_name, facility_type (enum: working_capital/liquidity/super_senior_liquidity/overdraft/bespoke), committed_amount, drawn_amount, available_amount, provider, maturity_date, ranking (super_senior/senior/pari_passu), linked_instrument_ids\[\]}\].                                                                                                                                                                                                                   |
| reserve_compliance_status | Enum      | N       | Overall reserve compliance: all_funded, partially_funded, shortfall. Shortfall may be a distribution condition failure.                                                                                                                                                                                                                                                                                                                                                                                                    |

**F.2A.2.7 Instrument Status**

| **Field**       | **Type** | **Req** | **Description / Notes**                                                              |
|-----------------|----------|---------|--------------------------------------------------------------------------------------|
| status          | Enum     | Y       | committed, drawn, partially_drawn, repaid, refinanced, cancelled, available_undrawn. |
| drawdown_pct    | Decimal  | N       | % of commitment drawn.                                                               |
| our_holding     | Decimal  | N       | Our participation in this instrument.                                                |
| our_holding_pct | Decimal  | N       | Our % of this instrument.                                                            |

### F.2A.3 Enforcement Classes (capital_structure_classes)

Groups instruments that share enforcement rights and covenant
measurement. Ratios are computed at the class level.

| **Field**                    | **Type**  | **Req** | **Description / Notes**                                                                                                                                      |
|------------------------------|-----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| class_id                     | UUID      | Y       | Primary key.                                                                                                                                                 |
| investment_id                | UUID      | Y       | FK to deal.                                                                                                                                                  |
| class_name                   | String    | Y       | Display name (e.g. 'Class A Senior Secured', 'Senior Secured', 'Total Funded Debt', 'Group Including SHL').                                                  |
| class_short_code             | String    | N       | Code (e.g. 'A', 'B', 'Senior', 'Total', 'Group').                                                                                                            |
| class_priority               | Integer   | Y       | Enforcement priority. 1 = most senior class. Used for ordering in reports.                                                                                   |
| included_instrument_ids      | UUID\[\]  | Y       | Which instruments belong to this class.                                                                                                                      |
| ratio_definitions            | JSONB     | N       | Which ratios are computed for this class: \[{ratio_name, numerator_formula, denominator_formula}\]. E.g. Class A ICR = (EBITDA - RegDep) / Class A Interest. |
| covenant_thresholds          | JSONB\[\] | N       | Covenants specific to this class: \[{covenant_name, test_type, direction, tiers}\].                                                                          |
| distribution_conditions      | JSONB\[\] | N       | Distribution lock-up conditions at this class level.                                                                                                         |
| additional_indebtedness_test | JSONB     | N       | {max_leverage, max_debt_rab, other_conditions}. Incurrence test for issuing more debt in this class.                                                         |

*Example — Airport WBS: Class A includes (Acq Term Loan Tranche A-1,
A-2, all Class A bonds, Capex Facility). Ratios: Class A ICR (Reg Dep),
Class A ICR (2% RAB), Class A Debt/RAB. Covenants: Trigger at Debt/RAB
0.50, ICR(2%RAB) 1.65. Class B (if issued) would include Class B bonds,
with separate covenants.*

*Example — Port Concession: Senior Secured includes Facility A, B, C, D.
Ratios: DSCR, LLCR, Net Debt/EBITDA. Lock-up: DSCR/LLCR/Leverage with
year-by-year step-down.*

*Example — Data Centre: Single class 'Senior' includes the one senior
facility. Ratios: QDSCR, ADSCR, LTV, Net Debt/EBITDA.*

*Example — Clean Tech Hub: 'Senior' class (senior debt only), 'Total
Including SHL' class (senior + shareholder loan). DSCR computed at
senior level.*

### F.2A.4 Entity Map (capital_structure_entities)

For multi-entity structures. Maps the corporate chain and identifies
where each instrument sits.

| **Field**             | **Type**  | **Req** | **Description / Notes**                                                                                   |
|-----------------------|-----------|---------|-----------------------------------------------------------------------------------------------------------|
| entity_id             | UUID      | Y       | Primary key.                                                                                              |
| investment_id         | UUID      | Y       | FK to deal.                                                                                               |
| entity_name           | String    | Y       | Legal name or role name (e.g. 'OpCo', 'BidCo', 'EurobondCo').                                             |
| entity_type           | Enum      | Y       | opco, bidco, holdco, junior_holdco, buffer_co, eurobond_co, topco, spv, issuer, guarantor, parent, other. |
| parent_entity_id      | UUID      | N       | FK to parent in the corporate chain. Null for topmost entity.                                             |
| chain_position        | Integer   | Y       | Position from top. 1 = TopCo, 2 = next down, etc. Higher number = closer to operating assets.             |
| jurisdiction          | String    | N       | Entity jurisdiction.                                                                                      |
| has_external_debt     | Boolean   | Y       | Whether this entity has third-party debt.                                                                 |
| has_intercompany_debt | Boolean   | N       | Whether this entity has intercompany loans.                                                               |
| intercompany_loans    | JSONB\[\] | N       | \[{counterparty_entity_id, direction (receivable/payable), amount, interest_rate, capitalised}\].         |
| consolidation_level   | Enum      | Y       | ring_fenced (WBS/securitisation boundary), consolidated, unconsolidated.                                  |

*Example — Airport WBS: TopCo (pos 1) -\> EurobondCo (pos 2, holds SHL)
-\> BufferCo (pos 3) -\> JuniorHoldCo (pos 4) -\> BidCo (pos 5) -\> OpCo
(pos 6, has external debt, ring-fenced). The securitisation boundary
sits at OpCo. Intercompany loans cascade down: TopCo lends to EurobondCo
lends to BufferCo lends to JuniorHoldCo lends to BidCo.*

*Example — Simple deals: Single entity 'Borrower', chain_position = 1,
ring_fenced.*

### F.2A.5 Cashflow Waterfall Configuration

Defines the order in which cashflow is allocated to debt service,
reserves, and distributions. The waterfall is an ordered list of steps,
each referencing instruments or classes.

| **Field**       | **Type**  | **Req** | **Description / Notes**                                                                            |
|-----------------|-----------|---------|----------------------------------------------------------------------------------------------------|
| waterfall_steps | JSONB\[\] | Y       | Ordered array of waterfall steps (schema below).                                                   |
| waterfall_type  | Enum      | Y       | pre_enforcement (normal operating waterfall), post_enforcement (insolvency/enforcement waterfall). |

*Each step: { step_number, step_name, step_type: Enum
(interest/principal_scheduled/principal_sweep/reserve_funding/reserve_release/fees/tax/capex/working_capital/distribution/equity_redemption/intercompany/lock_up_test/cash_trap),
instrument_ids or class_id (which instruments this step services),
conditional_on (e.g. 'lock_up_test_passed'), sweep_pct (if sweep),
description }*

This captures the full complexity we have observed:

Port Concession waterfall: EBITDA -\> tax reserve -\> tax paid -\>
operating CF -\> DSRA retention -\> admin fees -\> senior interest -\>
scheduled principal (Facility A) -\> DSRA release -\> capex reserve -\>
cash-funded capex -\> sweep 1 (Facility A, B) -\> mezzanine -\> lock-up
test -\> sweep 2 (Facility A post-lockup) -\> refinancing -\> capex
reserve release -\> distributions.

Airport WBS waterfall:OpCoEBITDA -\> working capital -\> operating CF
-\> capex -\> tax -\> exceptional items -\> CFADS -\> interest (acq+
capex) -\> drawdowns -\> fees -\> liquidity reserve -\> CF after DS -\>
distributions toBidCo(subject toOpCocovenants) -\>BidCointercompany
-\>JuniorHoldCo-\>BufferCo-\>EurobondCo(SHL interest + intercompany)
-\>TopCo(nil-parprefredemption + dividends).

Clean Tech Hub waterfall: Revenue -\>opex-\> EBITDA -\> capex -\> grant
-\> tax -\> reserve movements -\> CFADS -\> senior debt fees +
interest + principal -\> SHL interest -\> SHL repayment -\> dividends
-\> share capital redemption.

### F.2A.6 Ratio Aggregation Framework

Ratios must be computable at multiple levels of the capital structure.
The framework defines which debt is included in the
numerator/denominator for each class.

| **Field**               | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                      |
|-------------------------|-----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ratio_aggregation_rules | JSONB\[\] | N       | \[{class_id, ratio_name, debt_included (instrument_ids), interest_included (instrument_ids), denominator_basis (cfads/ebitda/ebitda_minus_reg_dep/ebitda_minus_2pct_rab/npv_cfads), leverage_basis (net_debt/rab/ebitda)}\]. |

Examples of how this works in practice:

| **Metric**             | **Airport WBS**                          | **Port Concession (Port)** | **Clean Tech Hub (EV)** | **Data Centre**          |
|------------------------|------------------------------------------|----------------------------|-------------------------|--------------------------|
| Class A ICR (Reg Dep)  | (EBITDA - Reg Dep) / Class A Interest    | n/a                        | n/a                     | n/a                      |
| Class A ICR (2% RAB)   | (EBITDA - 2%RAB) / Class A Interest      | n/a                        | n/a                     | n/a                      |
| Senior ICR (Reg Dep)   | (EBITDA - Reg Dep) / All Senior Interest | n/a                        | n/a                     | n/a                      |
| DSCR                   | n/a                                      | CFADS / Senior DS          | CFADS / Senior DS       | CFADS / Senior DS        |
| LLCR                   | n/a                                      | NPV(CFADS) / Senior Debt   | n/a                     | n/a                      |
| ICR (simple)           | n/a                                      | EBITDA / Interest          | n/a                     | n/a                      |
| Net Debt/RAB (Class A) | Class A Net Debt / RAB                   | n/a                        | n/a                     | n/a                      |
| Net Debt/RAB (Senior)  | Senior Net Debt / RAB                    | n/a                        | n/a                     | n/a                      |
| Net Debt/RAB (Group)   | (Senior + SHL) / RAB                     | n/a                        | n/a                     | n/a                      |
| Net Debt/EBITDA        | n/a                                      | Senior Net Debt / EBITDA   | n/a                     | Senior Net Debt / EBITDA |
| Solvency (1yr)         | CFADS(1yr) / DS(1yr)                     | n/a                        | n/a                     | n/a                      |
| Solvency (3yr)         | CFADS(3yr) / DS(3yr)                     | n/a                        | n/a                     | n/a                      |
| LTV                    | n/a                                      | n/a                        | n/a                     | Debt / NPV(CFADS)        |

### F.2A.7 Worked Examples

**Example 1: Simple Senior + Equity (Data Centre)**

| **Instrument** | **Type**         | **Priority** | **Class** | **Amount** |
|----------------|------------------|--------------|-----------|------------|
| Senior Debt    | senior_term_loan | 1            | Senior    | \$45.0mm   |
| Equity         | ordinary_equity  | 99           | Equity    | \$34.9mm   |

*One class ('Senior'), one entity, one waterfall. Simplest case.*

**Example 2: Multi-Facility Senior + Sweep**

| **Instrument** | **Type**             | **Priority** | **Class**      | **Amount**    |
|----------------|----------------------|--------------|----------------|---------------|
| Facility A     | acquisition_facility | 1            | Senior Secured | EUR 150mm     |
| Facility B     | capex_facility       | 1            | Senior Secured | EUR 11mm      |
| Facility C     | acquisition_facility | 1            | Senior Secured | EUR 8mm       |
| Facility D     | acquisition_facility | 1            | Senior Secured | EUR 7mm       |
| Mezzanine      | mezzanine            | 2            | Mezzanine      | EUR 0 (sized) |
| Equity         | ordinary_equity      | 99           | Equity         | varies        |

*All senior facilities pari passu (priority 1). Cash sweep mechanics
differ by facility (A gets sweep, B gets capex sweep). Leverage grid
drives margin for all. One class for ratio computation.*

**Example 3: Senior + Shareholder Loan**

| **Instrument**   | **Type**         | **Priority** | **Class**      | **Amount** |
|------------------|------------------|--------------|----------------|------------|
| Senior Debt      | senior_term_loan | 1            | Senior         | GBP 16.5mm |
| Shareholder Loan | shareholder_loan | 2            | Total Incl SHL | GBP varies |
| Share Capital    | ordinary_equity  | 99           | Equity         | GBP 18.8mm |

*Two classes: 'Senior' (DSCR computed here) and 'Total Including SHL'
(total leverage computed here). SHL interest can be capitalised or
cash-paid. SHL sits below senior in waterfall but above equity
distributions.*

**Example 4: WBS / Airport Acquisition**

| **Instrument**         | **Type**                  | **Priority** | **Entity** | **Class**   | **Amount**  |
|------------------------|---------------------------|--------------|------------|-------------|-------------|
| Acq Term Loan A-1      | acquisition_facility      | 1            | OpCo       | Class A     | GBP 359mm   |
| Acq Term Loan A-2      | acquisition_facility      | 1            | OpCo       | Class A     | GBP 359mm   |
| Capex Facility         | capex_facility            | 1            | OpCo       | Class A     | GBP 500mm   |
| Working Capital        | working_capital_facility  | 1            | OpCo       | Class A     | GBP 25mm    |
| DSR Facility           | other_debt                | 1            | OpCo       | Class A     | GBP 46mm    |
| Liquidity Facility     | other_debt                | 2            | OpCo       | Senior      | GBP sized   |
| Class A Bonds (future) | class_a_bond              | 1            | OpCo       | Class A     | per takeout |
| Class B Bonds (future) | class_b_bond              | 3            | OpCo       | Class B     | per takeout |
| Shareholder Loan       | shareholder_loan          | 4            | EurobondCo | Group       | GBP 158mm   |
| Nil-Par Pref Shares    | nil_par_preference_shares | 5            | TopCo      | Equity-like | GBP 802mm   |
| Ordinary Equity        | ordinary_equity           | 99           | TopCo      | Equity      | GBP 1mm     |

*Four enforcement classes: Class A (Debt/RAB trigger 0.50, ICR
covenants), Senior (includes Class A + liquidity, Debt/RAB 0.70), Class
B (separate ICR covenants), Group (includes SHL, Debt/RAB max 0.60). Six
entities in the corporate chain. Bond takeout replaces term loan at
maturity — new bonds enter the same class. Solvency test is a 'whole
business' test across the ring-fenced group.*

**Example 5: Lev Fin A/B/C/D/E (not yet modelled, but accommodated)**

| **Instrument**   | **Type**         | **Priority** | **Class**    | **Notes**                  |
|------------------|------------------|--------------|--------------|----------------------------|
| Super Senior RCF | senior_revolving | 1            | Super Senior | First out in enforcement   |
| Term Loan A      | senior_term_loan | 2            | First Lien   | Pro rata with TLB in amort |
| Term Loan B      | senior_term_loan | 2            | First Lien   | Bullet, higher margin      |
| Term Loan C      | senior_term_loan | 2            | First Lien   | EUR tranche                |
| Second Lien      | second_lien      | 3            | Second Lien  | Separate security package  |
| Mezzanine        | mezzanine        | 4            | Mezzanine    | Unsecured or 3rd lien      |
| HoldCo PIK       | pik_note         | 5            | HoldCo       | Structural subordination   |
| Equity           | ordinary_equity  | 99           | Equity       |                            |

*Super senior RCF ranks ahead of term loans in enforcement despite
sharing first-lien security. The AOBS (Agreement Among Lenders) defines
the first-out/last-out split within the first lien class. Second lien
has separate security and enforcement standstill. HoldCo PIK is
structurally subordinated (different entity).*

**Example 6: HoldCo / OpCo Split with Minority HoldCo Position**

| **Instrument**  | **Type**         | **Priority** | **Entity**      | **Our Position**     |
|-----------------|------------------|--------------|-----------------|----------------------|
| OpCo Senior     | senior_term_loan | 1            | OpCo            | No                   |
| OpCo Mezz       | mezzanine        | 2            | OpCo            | No                   |
| HoldCo Notes    | holdco_notes     | 3            | HoldCo          | Yes — our investment |
| Minority HoldCo | holdco_notes     | 3            | Minority HoldCo | Yes — our vehicle    |
| Sponsor Equity  | ordinary_equity  | 99           | TopCo           | No                   |

*Our position is in a minority holdco vehicle that sits alongside the
main HoldCo. Structurally subordinated to all OpCo debt. Cash
distributions must flow up through OpCo -\> HoldCo -\> Minority HoldCo.
The 'our_holding' field on the instrument identifies where we sit.*

### F.2A.8 Intercreditor & Structural Protections

Key provisions governing relationships between classes of creditors.

| **Field**               | **Type** | **Req** | **Description / Notes**                                                                                                               |
|-------------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------|
| intercreditor_agreement | JSONB    | N       | Top-level ICA terms: {governing_law, date_signed, parties}.                                                                           |
| enforcement_standstill  | JSONB    | N       | {junior_standstill_days, conditions_for_release}. Period during which junior creditors cannot enforce.                                |
| turnover_provisions     | JSONB    | N       | {applies_to_classes, trigger_conditions}. Obligation of junior creditors to turn over recoveries to senior.                           |
| permitted_payments      | JSONB    | N       | {conditions_for_junior_payments, blocked_during}. When junior debt service is permitted.                                              |
| release_conditions      | JSONB    | N       | {security_release_conditions, class_voting_requirements}.                                                                             |
| aobs_terms              | JSONB    | N       | Agreement Among Lenders for unitranche: {first_out_amount, last_out_amount, first_out_rate, last_out_rate, waterfall_allocation_pct}. |
| non_petition_clause     | Boolean  | N       | Whether junior creditors waive right to petition for insolvency.                                                                      |
| subrogation_rights      | String   | N       | Rights of junior creditors after senior payoff.                                                                                       |

### F.2A.9 Migration from v1 Schema

The v1 fieldsdebt_facilities(Section 2.4), seniority, andsecurity_typein
Section 2.1 are replaced by this capital structure model. The following
v1 fields are deprecated:

debt_facilitiesJSONB\[\] -\> replaced
bycapital_structure_instrumentstable

seniority Enum -\> replaced bywaterfall_priority+enforcement_classon
each instrument

security_typeEnum -\> replaced byis_secured+security_packageon each
instrument

corporate_structureJSONB\[\] -\> replaced
bycapital_structure_entitiestable

The following v1 fields in Section 5 (Cashflow) remain unchanged but now
referenceinstrument_idsfor
traceability:senior_interest,senior_principal,junior_interest, etc.
Thereserve_account_movementsnow link to instruments vialinked_reserveson
the instrument record.

The following v1 fields in Section 6 (Ratios) are now computed per
enforcement class rather than as flat deal-level fields.
Theratio_aggregation_ruleson each class define exactly which instruments
contribute to each ratio calculation.

### F.2.5 Sources & Uses (at Close)

| **Field**              | **Type**  | **Req** | **Description / Notes**                                                                                   |
|------------------------|-----------|---------|-----------------------------------------------------------------------------------------------------------|
| sources_and_uses       | JSONB     | N       | {sources: \[{label, amount, pct_of_total, pct_of_rab}\], uses: \[{label, amount, pct_of_total}\], total}. |
| sources_uses_snapshots | JSONB\[\] | N       | Multiple S&U at different points: \[{label, sources, uses, total}\].                                      |
| enterprise_value       | Decimal   | N       | Offer / acquisition EV. Airport WBS: £1,594mm.                                                            |
| ev_rab_multiple        | Decimal   | N       | EV as multiple of RAB. Airport WBS: 1.0x.                                                                 |
| exit_ev_rab_multiple   | Decimal   | N       | Assumed exit EV/RAB multiple.                                                                             |

## F.3 RATINGS & CREDIT ASSESSMENT

### F.3.1 External Ratings

Each external rating agency record captures the rating, outlook, and
watch/review status. For externally rated transactions, a rating
downgrade below a configured threshold may itself constitute a lock-up
event or trigger event — this is captured in the covenant configuration
(see G.2.2 rating_trigger field).

| **Field**                  | **Type** | **Req** | **Description / Notes**                                                                                   |
|----------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------|
| moodys_rating              | String   | N       | Moody's rating (e.g. 'Baa3').                                                                             |
| moodys_outlook             | Enum     | N       | positive, stable, negative, developing, withdrawn.                                                        |
| moodys_watch               | Enum     | N       | not_on_watch, review_for_upgrade, review_for_downgrade, review_direction_uncertain.                       |
| moodys_watch_date          | Date     | N       | Date placed on watch/review.                                                                              |
| sp_rating                  | String   | N       | S&P rating.                                                                                               |
| sp_outlook                 | Enum     | N       | positive, stable, negative, developing, withdrawn.                                                        |
| sp_watch                   | Enum     | N       | not_on_watch, creditwatch_positive, creditwatch_negative, creditwatch_developing.                         |
| sp_watch_date              | Date     | N       | Date placed on CreditWatch.                                                                               |
| sp_pf_score                | String   | N       | S&P PF score.                                                                                             |
| sp_corp_score              | String   | N       | S&P Corporate score.                                                                                      |
| sp_el_score                | String   | N       | S&P Expected Loss score.                                                                                  |
| sp_lgd_score               | String   | N       | S&P LGD score.                                                                                            |
| fitch_rating               | String   | N       | Fitch rating.                                                                                             |
| fitch_outlook              | Enum     | N       | positive, stable, negative, developing, withdrawn.                                                        |
| fitch_watch                | Enum     | N       | not_on_watch, rating_watch_positive, rating_watch_negative, rating_watch_evolving.                        |
| fitch_watch_date           | Date     | N       | Date placed on Rating Watch.                                                                              |
| rating_trigger_configured  | Boolean  | N       | Whether a rating downgrade triggers a lock-up or trigger event for this deal.                             |
| rating_trigger_threshold   | String   | N       | The rating level below which the trigger activates (e.g. 'BBB-', 'Baa3').                                 |
| rating_trigger_consequence | Enum     | N       | distribution_lockup, trigger_event, event_of_default. What happens when the rating falls below threshold. |
| rating_trigger_basis       | Enum     | N       | any_agency, all_agencies, specified_agency. Whether trigger requires one or all agencies to downgrade.    |

### F.3.2 Internal Ratings

| **Field**               | **Type** | **Req** | **Description / Notes**               |
|-------------------------|----------|---------|---------------------------------------|
| internal_credit_score   | String   | Y       | Current internal score (e.g. 'BBB-'). |
| assigned_score          | String   | N       | Recommended score if different.       |
| performance_grade       | Enum     | Y       | 1, 2, 3, 4.                           |
| watchlist_status        | Enum     | Y       | standard, enhanced, watchlist.        |
| ma_eligibility          | Enum     | N       | eligible, ineligible, tbc, na.        |
| last_rating_review_date | Date     | N       | Most recent review date.              |
| next_rating_review_date | Date     | N       | Scheduled next review.                |

## F.4 KEY COUNTERPARTIES & DEPENDENCIES

Material counterparties from IC paper and ongoing monitoring.

| **Field**      | **Type**  | **Req** | **Description / Notes**                                                                      |
|----------------|-----------|---------|----------------------------------------------------------------------------------------------|
| counterparties | JSONB\[\] | N       | \[{type, name, dependency_narrative, credit_rating, credit_source, lei, replacement_risk}\]. |

*Type enum: construction, operations, oem, offtaker_guarantor,
anchor_tenant, fuel_supplier, insurance, facility_agent,
security_trustee, hedging_counterparty, concession_grantor,
grid_operator, charger_oem, battery_supplier, software_platform,
regulator, other*

## F.5 FINANCIAL TIME SERIES

Core financial data as periodic time-series. Supports monthly through
annual periods. Multiple cases plus historic/forecast distinction.

### F.5.1 Period Definition

| **Field**                 | **Type** | **Req** | **Description / Notes**                                       |
|---------------------------|----------|---------|---------------------------------------------------------------|
| period_label              | String   | Y       | Human label (e.g. '2027Q2', 'FY2026', 'H1 2027', 'Jan-2026'). |
| period_year               | Integer  | Y       | Calendar year.                                                |
| period_quarter            | Integer  | N       | Quarter (1-4). Null for annual/semi/monthly.                  |
| period_month              | Integer  | N       | Month (1-12). For monthly models.                             |
| period_frequency          | Enum     | Y       | monthly, quarterly, semi_annual, annual.                      |
| period_start              | Date     | Y       | First day of period.                                          |
| period_end                | Date     | Y       | Last day of period.                                           |
| period_flag               | String   | Y       | Compact key (e.g. '2027Q2', '2026M07').                       |
| is_operating_period       | Boolean  | Y       | Project is operational.                                       |
| is_construction_period    | Boolean  | N       | Project under construction.                                   |
| case_type                 | Enum     | Y       | management, lender_base, combined_downside, actual.           |
| historic_or_forecast      | Enum     | N       | actual, forecast.                                             |
| scenario_name             | String   | N       | Named scenario (e.g. 'WestLB Case 2', 'CAD BC', 'CAA').       |
| regulatory_period         | String   | N       | Quinquennium label (e.g. 'Q5', 'Q6'). WBS/regulated.          |
| year_of_regulatory_period | Integer  | N       | Year within quinquennium (1-5). Airport WBS.                  |

### F.5.2 Cashflow Statement (per period)

All amounts in deal currency. Revenue positive, costs/outflows negative.

| **Field**                   | **Type** | **Req** | **Description / Notes**                                                                                              |
|-----------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------|
| total_revenue               | Decimal  | N       | Total operating revenue.                                                                                             |
| revenue_lines               | JSONB    | N       | \[{label, amount}\]. E.g. PAX Revenue, Cargo, Retail, Property, Non-Reg Aero, Charging, Battery, Parking, Amenities. |
| amort_deferred_income       | Decimal  | N       | Amortisation of deferred/pre-paid income.                                                                            |
| total_operating_costs       | Decimal  | N       | Total operating costs (negative).                                                                                    |
| cost_lines                  | JSONB    | N       | \[{label, amount}\].                                                                                                 |
| disallowed_costs            | Decimal  | N       | Disallowed / corporate costs (WBS). Airport WBS.                                                                     |
| exceptional_items           | JSONB    | N       | \[{label, amount}\]. Pension contributions, separation costs. Airport WBS.                                           |
| ebitda                      | Decimal  | N       | EBITDA.                                                                                                              |
| ebitda_margin               | Decimal  | N       | EBITDA / Revenue.                                                                                                    |
| depreciation                | Decimal  | N       | Accounting depreciation (non-cash).                                                                                  |
| regulatory_depreciation     | Decimal  | N       | Regulatory depreciation (RAB-based). Airport WBS: differs from accounting.                                           |
| ebit                        | Decimal  | N       | EBIT = EBITDA - depreciation.                                                                                        |
| capital_expenditure         | Decimal  | N       | Capex (negative).                                                                                                    |
| charger_replacement_costs   | Decimal  | N       | Replacement capex (EV/equipment).                                                                                    |
| working_capital_movement    | Decimal  | N       | Change in working capital.                                                                                           |
| reserve_account_movements   | JSONB    | N       | \[{account_name, opening, additions, releases, closing}\]. DSRA, MRA, TRA, capex, lock-up, escrow, liquidity.        |
| pre_finance_pre_tax_cf      | Decimal  | N       | Pre-finance, pre-tax CF.                                                                                             |
| tax_paid                    | Decimal  | N       | Tax paid (negative).                                                                                                 |
| pre_finance_post_tax_cf     | Decimal  | N       | Pre-finance, post-tax CF.                                                                                            |
| interest_on_cash            | Decimal  | N       | Interest on cash balances.                                                                                           |
| customer_prepayment         | Decimal  | N       | Customer pre-payments.                                                                                               |
| grant_income                | Decimal  | N       | Grant / subsidy income.                                                                                              |
| senior_debt_drawdown        | Decimal  | N       | Senior debt drawn.                                                                                                   |
| capex_facility_drawdown     | Decimal  | N       | Capex facility drawn. Airport WBS: separate from acq debt.                                                           |
| junior_debt_drawdown        | Decimal  | N       | Junior / mezzanine drawn.                                                                                            |
| shareholder_loan_drawdown   | Decimal  | N       | Shareholder loan drawn.                                                                                              |
| equity_drawdown             | Decimal  | N       | Equity injected.                                                                                                     |
| total_funding               | Decimal  | N       | Total funding.                                                                                                       |
| cfads                       | Decimal  | N       | Cashflow Available for Debt Service.                                                                                 |
| senior_interest             | Decimal  | N       | Senior interest + commitment fees.                                                                                   |
| senior_principal            | Decimal  | N       | Senior principal repayment (scheduled).                                                                              |
| senior_principal_sweep      | Decimal  | N       | Cash sweep repayment (separate).                                                                                     |
| senior_debt_service         | Decimal  | N       | Total senior DS.                                                                                                     |
| cf_after_senior_ds          | Decimal  | N       | CF after senior DS.                                                                                                  |
| junior_interest             | Decimal  | N       | Junior interest.                                                                                                     |
| junior_principal            | Decimal  | N       | Junior principal.                                                                                                    |
| junior_debt_service         | Decimal  | N       | Total junior DS.                                                                                                     |
| shareholder_loan_interest   | Decimal  | N       | SHL interest (may capitalise).                                                                                       |
| shareholder_loan_repayment  | Decimal  | N       | SHL repayment.                                                                                                       |
| intercompany_interest_net   | Decimal  | N       | Net intercompany interest income/(expense). Airport WBS: multi-entity.                                               |
| ticking_commitment_fees     | Decimal  | N       | Ticking / commitment fees (separate from interest). Airport WBS.                                                     |
| debt_arrangement_fees       | Decimal  | N       | Arrangement / issuance fees.                                                                                         |
| liquidity_facility_drawdown | Decimal  | N       | Drawdown from liquidity reserves/facilities. Airport WBS.                                                            |
| net_cashflow                | Decimal  | N       | Net CF after all debt service.                                                                                       |
| cash_bf                     | Decimal  | N       | Opening cash.                                                                                                        |
| distributions               | Decimal  | N       | Dividends to equity (negative).                                                                                      |
| nil_par_pref_redemption     | Decimal  | N       | Nil-par preference share redemption. Airport WBS.                                                                    |
| share_capital_redemption    | Decimal  | N       | Share capital redemption.                                                                                            |
| cash_cf                     | Decimal  | N       | Closing cash.                                                                                                        |

### F.5.3 Balance Sheet (per period)

| **Field**                | **Type** | **Req** | **Description / Notes**                              |
|--------------------------|----------|---------|------------------------------------------------------|
| total_fixed_assets       | Decimal  | N       | Fixed assets (NBV).                                  |
| land_value               | Decimal  | N       | Land at valuation.                                   |
| intangible_assets        | Decimal  | N       | Intangibles / goodwill / concession rights.          |
| transaction_goodwill     | Decimal  | N       | Acquisition goodwill. Airport WBS.                   |
| deferred_financing_fees  | Decimal  | N       | Capitalised financing fees. Airport WBS.             |
| deferred_tax_asset       | Decimal  | N       | DTA.                                                 |
| inventories              | Decimal  | N       | Inventories. Airport WBS.                            |
| trade_receivables        | Decimal  | N       | Trade receivables. Airport WBS.                      |
| current_assets           | Decimal  | N       | Total current assets (excl cash).                    |
| cash                     | Decimal  | N       | Cash and equivalents.                                |
| dsra_balance             | Decimal  | N       | DSRA balance.                                        |
| escrow_balance           | Decimal  | N       | Escrow account balance. Airport WBS.                 |
| other_reserve_balances   | JSONB    | N       | \[{name, balance}\]. Tax, capex, lock-up, liquidity. |
| total_assets             | Decimal  | N       | Total assets.                                        |
| trade_payables           | Decimal  | N       | Trade payables. Airport WBS.                         |
| capital_payables         | Decimal  | N       | Capital creditors. Airport WBS.                      |
| tax_payable              | Decimal  | N       | Tax payable. Airport WBS.                            |
| deferred_tax_liability   | Decimal  | N       | DTL.                                                 |
| senior_debt_balance      | Decimal  | N       | Senior debt outstanding.                             |
| class_a_bonds            | Decimal  | N       | Class A bonds outstanding. Airport WBS.              |
| class_b_bonds            | Decimal  | N       | Class B bonds outstanding. Airport WBS.              |
| capex_facility_balance   | Decimal  | N       | Capex facility drawn. Airport WBS.                   |
| junior_debt_balance      | Decimal  | N       | Junior / mezzanine.                                  |
| shareholder_loan_balance | Decimal  | N       | SHL outstanding.                                     |
| lease_liabilities        | Decimal  | N       | Lease obligations.                                   |
| intercompany_loans_net   | Decimal  | N       | Net intercompany position. Airport WBS.              |
| other_liabilities        | Decimal  | N       | Provisions, other.                                   |
| retained_earnings        | Decimal  | N       | Cumulative retained earnings.                        |
| share_capital            | Decimal  | N       | Share capital.                                       |
| revaluation_reserve      | Decimal  | N       | Revaluation reserve. Airport WBS.                    |
| nil_par_pref_shares      | Decimal  | N       | Nil-par preference shares. Airport WBS.              |
| equity                   | Decimal  | N       | Total equity.                                        |
| senior_net_debt          | Decimal  | N       | Senior debt minus cash.                              |
| total_net_debt           | Decimal  | N       | All debt minus cash.                                 |
| rab_closing              | Decimal  | N       | Closing RAB (regulatory). Airport WBS.               |
| rab_closing_gross        | Decimal  | N       | Closing gross RAB. Airport WBS.                      |

### F.5.4 Annualised / Rolling Metrics

| **Field**             | **Type** | **Req** | **Description / Notes**      |
|-----------------------|----------|---------|------------------------------|
| rolling_12m_ebitda    | Decimal  | N       | Trailing 12-month EBITDA.    |
| rolling_12m_cfads     | Decimal  | N       | Trailing 12-month CFADS.     |
| rolling_12m_senior_ds | Decimal  | N       | Trailing 12-month senior DS. |
| rolling_12m_total_ds  | Decimal  | N       | Trailing 12-month total DS.  |
| rolling_12m_revenue   | Decimal  | N       | Trailing 12-month revenue.   |

## F.6 FINANCIAL RATIOS & COVENANT THRESHOLDS

### F.6.1 Computed Ratios (per period, per case)

| **Field**              | **Type** | **Req** | **Description / Notes**                                                                                  |
|------------------------|----------|---------|----------------------------------------------------------------------------------------------------------|
| senior_quarterly_dscr  | Decimal  | N       | CFADS / Senior DS (period).                                                                              |
| senior_annual_dscr     | Decimal  | N       | Rolling 12m CFADS / rolling 12m senior DS.                                                               |
| total_quarterly_dscr   | Decimal  | N       | CFADS / Total DS (period).                                                                               |
| total_annual_dscr      | Decimal  | N       | Rolling 12m total.                                                                                       |
| interest_cover_ratio   | Decimal  | N       | EBITDA / Interest. Port Concession primary ratio.                                                        |
| icr_regulatory_dep     | Decimal  | N       | ICR using regulatory depreciation (EBITDA - RegDep) / Interest. Airport WBS: Class A ICR and Senior ICR. |
| icr_2pct_rab           | Decimal  | N       | ICR using 2% of RAB as synthetic depreciation. Airport WBS.                                              |
| ltv_npv                | Decimal  | N       | LTV based on NPV of future CFs.                                                                          |
| net_debt_rab           | Decimal  | N       | Net Debt / RAB. Airport WBS primary leverage. Excl SHL.                                                  |
| net_debt_rab_incl_shl  | Decimal  | N       | Net Debt / RAB including shareholder loans. Airport WBS group-level.                                     |
| class_a_debt_rab       | Decimal  | N       | Class A Net Debt / RAB. Airport WBS.                                                                     |
| class_b_debt_rab       | Decimal  | N       | Class B Net Debt / RAB. Airport WBS.                                                                     |
| llcr                   | Decimal  | N       | Loan Life Coverage Ratio.                                                                                |
| plcr                   | Decimal  | N       | Project Life Coverage Ratio.                                                                             |
| senior_net_debt_ebitda | Decimal  | N       | Senior Net Debt / EBITDA.                                                                                |
| total_net_debt_ebitda  | Decimal  | N       | Total Net Debt / EBITDA.                                                                                 |
| ebitda_margin          | Decimal  | N       | EBITDA / Revenue.                                                                                        |
| solvency_ratio_1yr     | Decimal  | N       | 1-year solvency ratio. Airport WBS.                                                                      |
| solvency_ratio_3yr     | Decimal  | N       | 3-year solvency ratio. Airport WBS.                                                                      |
| rar                    | Decimal  | N       | Regulated Asset Ratio (WBS).                                                                             |
| pmicr                  | Decimal  | N       | Post-Maintenance ICR (WBS).                                                                              |
| leverage_for_grid      | Decimal  | N       | Leverage used for margin ratchet lookup.                                                                 |

### F.6.2 Ratio Summary Statistics

| **Field**       | **Type** | **Req** | **Description / Notes**                                             |
|-----------------|----------|---------|---------------------------------------------------------------------|
| ratio_summaries | JSONB    | N       | Per ratio: {ratio_name, min, max, average, min_period, max_period}. |

### F.6.3 Covenant Threshold Configuration

Multi-tier with step-downs. Port Concession: year-by-year
DSCR/LLCR/leverage lock-up and default. Airport WBS: trigger and default
tiers for Class A ICR, Senior ICR, Debt/RAB, solvency.

| **Field**             | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                    |
|-----------------------|-----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| covenant_thresholds   | JSONB\[\] | Y       | Array of covenant definitions.                                                                                                                                                                                                             |
| no_hard_covenant_dscr | Boolean   | N       | True if the documentation has no explicit DSCR event of default level. Common in US private placements and covenant-lite structures. When true, the system creates a proxy default threshold of 1.00x DSCR (representing payment default). |
| no_hard_covenant_icr  | Boolean   | N       | True if the documentation has no explicit ICR event of default level. When true, the system creates a proxy default threshold of 1.00x ICR.                                                                                                |
| proxy_default_flag    | Boolean   | N       | System-generated flag: true when a deal is using proxy 1.0x thresholds rather than documented covenant levels. Displayed in the UI as "Payment Default Proxy — no documented covenant" to distinguish from actual contractual thresholds.  |

*Each: { covenant_id, covenant_name, test_type
(hard_covenant/distribution_condition/trigger/default/soft_default),
test_frequency, direction (min/max), tiers: \[{tier, level_or_BLANK,
consequence}\], step_down_schedule: \[{period, level}\] }*

*Airport WBS trigger example: Net Class A Debt/RAB max 0.50, Senior ICR
(Reg Dep) min 0.85, Senior ICR (2% RAB) min 1.25. Airport WBS default:
Net Senior Debt/RAB max 0.85, Solvency min hard 1.05 / soft 1.20.*

## F.7 SECTOR-SPECIFIC BUSINESS KPIs

Flexible JSONB with sector templates. Validated against four real
sectors.

### F.7.1 KPI Storage

| **Field**             | **Type** | **Req** | **Description / Notes**                   |
|-----------------------|----------|---------|-------------------------------------------|
| sector_kpis           | JSONB    | N       | {kpi_id: {value, unit, label, category}}. |
| sector_kpi_timeseries | JSONB    | N       | \[{period_flag, kpis: {kpi_id: value}}\]. |

### F.7.2 Template: Data Centre

| **Field**               | **Type** | **Req** | **Description / Notes**        |
|-------------------------|----------|---------|--------------------------------|
| gpu_type                | String   | N       | GPU hardware (e.g. 'B300 BM'). |
| gpu_hourly_charge       | Decimal  | N       | \$/GPU-hour.                   |
| gpu_count               | Integer  | N       | GPU count.                     |
| server_count            | Integer  | N       | Servers.                       |
| max_power_per_server_kw | Decimal  | N       | kW per server.                 |
| pue                     | Decimal  | N       | Power Usage Effectiveness.     |
| facility_size_mw        | Decimal  | N       | Facility MW.                   |
| utilisation_rate        | Decimal  | N       | Target utilisation.            |
| power_price_per_kwh     | Decimal  | N       | Electricity cost/kWh.          |

### F.7.3 Template: Port Concession

**v2 NEW: Validated against Port Concession (subsidiary ports).**

| **Field**                  | **Type** | **Req** | **Description / Notes**          |
|----------------------------|----------|---------|----------------------------------|
| teu_capacity               | Integer  | N       | Terminal capacity (TEU).         |
| teu_volume_actual          | Integer  | N       | Actual throughput (time-series). |
| teu_volume_by_type         | JSONB    | N       | \[{customer_type, teu}\].        |
| volume_growth_rate         | Decimal  | N       | YoY growth.                      |
| revenue_per_teu            | Decimal  | N       | Revenue/TEU.                     |
| capacity_utilisation       | Decimal  | N       | Volume/Capacity.                 |
| concession_remaining_years | Decimal  | N       | Years remaining.                 |

### F.7.4 Template: EV Charging Infrastructure

**v2 NEW: Validated against Clean Tech Hub.**

| **Field**                 | **Type** | **Req** | **Description / Notes**        |
|---------------------------|----------|---------|--------------------------------|
| charging_bay_count        | JSONB    | N       | \[{tier, count, year}\].       |
| battery_capacity_kwh      | Decimal  | N       | Storage capacity.              |
| energy_cost_per_kwh       | Decimal  | N       | Electricity cost.              |
| charger_utilisation       | Decimal  | N       | Avg utilisation.               |
| charger_replacement_cycle | Integer  | N       | Replacement frequency (years). |
| grid_connection_kva       | Decimal  | N       | Grid capacity.                 |

### F.7.5 Template: Airport / Regulated Utility

**v2 NEW: Validated against UK airport WBS acquisition.**

| **Field**               | **Type** | **Req** | **Description / Notes**                              |
|-------------------------|----------|---------|------------------------------------------------------|
| traffic_mppa            | Decimal  | N       | Passengers (millions per annum). Airport WBS: 33.2m. |
| traffic_growth_rate     | Decimal  | N       | YoY passenger growth.                                |
| tariff_per_pax_real     | Decimal  | N       | Aeronautical tariff per PAX in real terms.           |
| tariff_per_pax_nominal  | Decimal  | N       | Tariff per PAX nominal.                              |
| retail_revenue_per_pax  | Decimal  | N       | Retail + parking per PAX.                            |
| rab_opening             | Decimal  | N       | Opening Regulated Asset Base.                        |
| rab_closing             | Decimal  | N       | Closing RAB.                                         |
| allowed_capex           | Decimal  | N       | Regulator-allowed capex for the period.              |
| actual_capex            | Decimal  | N       | Actual capex.                                        |
| capex_over_under        | Decimal  | N       | Actual vs allowed capex variance.                    |
| cost_of_capital_allowed | Decimal  | N       | Regulatory WACC (e.g. 6.5%, 6.75%).                  |
| x_factor                | Decimal  | N       | RPI+X or RPI-X factor for tariff formula.            |
| sqr_rebate_pct          | Decimal  | N       | Service quality rebate as % of max.                  |
| copi_index              | Decimal  | N       | Construction Output Price Index.                     |

### F.7.6 Future Templates

*Renewables-Solar: MWp, P50/P90, degradation, PPA. Renewables-Wind: MW,
P50/P90, availability, PPA. Toll Roads: AADT, traffic growth, toll rate,
concession end. Real Estate: occupancy, WAULT, ERV, cap rate. LBO:
acquisition multiple, adjusted EBITDA. Rolling Stock: fleet size,
availability target.*

## F.8 STRESS MANAGEMENT & SCENARIO CONFIGURATION

| **Field**             | **Type**  | **Req** | **Description / Notes**                                                                                                         |
|-----------------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------|
| stress_parameters     | JSONB     | N       | \[{parameter, base_value, flex_amount, stressed_value}\].                                                                       |
| named_scenarios       | JSONB\[\] | N       | \[{scenario_name, scenario_id, parameters}\]. Airport WBS: 'CAA', 'IM', 'CAD BC' (14 scenarios).                                |
| inflation_assumptions | JSONB     | N       | \[{index_name, base_rate, escalation_rate, first_uplift_date}\]. Clean Tech Hub: 6 indices. Airport WBS: RPI actual/CAA/COPI.   |
| rpi_assumptions       | JSONB     | N       | \[{period, rpi_year_end, rpi_avg_year, rpi_yoy_growth, escalation_factor}\]. Airport WBS: critical for real/nominal conversion. |

## F.9 KEY OUTPUTS & DERIVED METRICS

| **Field**                  | **Type** | **Req** | **Description / Notes**                             |
|----------------------------|----------|---------|-----------------------------------------------------|
| unlevered_irr              | Decimal  | N       | Project IRR (post-tax).                             |
| unlevered_irr_pretax       | Decimal  | N       | Pre-tax project IRR.                                |
| levered_equity_irr         | Decimal  | N       | Equity IRR after debt service.                      |
| moic                       | Decimal  | N       | Multiple on Invested Capital.                       |
| average_cash_yield         | Decimal  | N       | Average annual cash yield.                          |
| year_1_cash_yield          | Decimal  | N       | Year 1 cash yield.                                  |
| all_in_cost_of_debt        | Decimal  | N       | Blended all-in cost of debt.                        |
| weighted_avg_interest_rate | Decimal  | N       | Weighted average rate (time-varying).               |
| hedged_base_rate           | Decimal  | N       | Blended hedged base rate. Airport WBS.              |
| tax_rate                   | Decimal  | N       | Effective tax rate.                                 |
| tax_leakage_rate           | Decimal  | N       | Tax leakage as % of pre-tax CFs.                    |
| ebitda_margin_lifetime     | Decimal  | N       | Lifetime average EBITDA margin.                     |
| min_qdscr                  | Decimal  | N       | Minimum periodic DSCR.                              |
| avg_qdscr                  | Decimal  | N       | Average periodic DSCR.                              |
| min_llcr                   | Decimal  | N       | Minimum LLCR.                                       |
| min_icr                    | Decimal  | N       | Minimum ICR (Reg Dep or 2% RAB basis). Airport WBS. |
| avg_icr                    | Decimal  | N       | Average ICR. Airport WBS.                           |
| ltv_max                    | Decimal  | N       | Maximum LTV.                                        |
| max_senior_leverage        | Decimal  | N       | Max Senior Net Debt / EBITDA.                       |
| max_net_debt_rab           | Decimal  | N       | Maximum Net Debt / RAB. Airport WBS.                |
| upfront_economics          | Decimal  | N       | Total upfront fee economics.                        |
| ongoing_management_fees    | Decimal  | N       | Ongoing management fees.                            |

### F.9.1 Real Estate Exit Methodology

**v2 NEW: Clean Tech Hub dual valuation: NPV of operational CFs +
property value.**

| **Field**              | **Type**  | **Req** | **Description / Notes**                                                                                               |
|------------------------|-----------|---------|-----------------------------------------------------------------------------------------------------------------------|
| exit_valuations        | JSONB\[\] | N       | \[{exit_year, npv_operating_cfs, npv_battery_cfs, property_value, fees, cash, exit_value, project_irr, equity_irr}\]. |
| property_value_current | Decimal   | N       | Current property valuation.                                                                                           |

### F.9.2 Debt Maturity & Refinancing Analysis

**v2 NEW: Gold tracks maturity concentration and partial take-outs.**

| **Field**                | **Type**  | **Req** | **Description / Notes**                                                                              |
|--------------------------|-----------|---------|------------------------------------------------------------------------------------------------------|
| maturity_analysis        | JSONB     | N       | {two_yr_maturity_pct_rab, five_yr_maturity_pct_rab, maturing_amounts: \[{facility, amount, date}\]}. |
| partial_takeout_schedule | JSONB\[\] | N       | \[{facility, takeout_amount, takeout_date, replacement_instrument}\].                                |
| refinancing_risk_summary | Text      | N       | Narrative on refinancing exposure.                                                                   |

## F.10 COLLATERAL ASSESSMENT

| **Field**                | **Type** | **Req** | **Description / Notes**         |
|--------------------------|----------|---------|---------------------------------|
| equity_value_at_close    | Decimal  | N       | Equity value at closing.        |
| equity_value_narrative   | Text     | N       | Narrative on equity position.   |
| enforcement_narrative    | Text     | N       | Enforcement / security summary. |
| guaranty_description     | Text     | N       | Guaranty structure.             |
| guaranty_governed_by     | String   | N       | Governing law of guaranty.      |
| arbitration_rules        | String   | N       | Arbitration provisions.         |
| sp_collateral_assessment | Text     | N       | S&P collateral assessment.      |
| lgd_pct                  | Decimal  | N       | LGD estimate (%).               |
| recovery_narrative       | Text     | N       | Expected recovery narrative.    |

## F.11 RISK REGISTER SUMMARY

The risk register operates in two layers:

**Layer 1: Standard Risk Template** — the standardised risk taxonomy
from Part E, applied consistently across all deals. Every deal is
assessed against the same categories, scored on the same scale. This
provides the portfolio-level comparability and aggregation capability.

**Layer 2: Investment-Specific Risk Assessment** — what the investment
team specifically identified as the key risks for this deal, what
sensitivities they ran at origination (in the IC analysis), and how key
financial ratios responded to those stress scenarios. This layer
connects the risk register to the original investment thesis and
provides the basis for ongoing monitoring: "we identified wind resource
as the key risk, we stressed it to P10, and DSCR fell to 1.15x — is that
playing out?"

| **Field**                 | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|---------------------------|-----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| risk_profile_summary      | JSONB     | Y       | {critical, high, moderate, low}. Standard template layer.                                                                                                                                                                                                                                                                                                                                                                                                              |
| top_risks                 | JSONB\[\] | N       | \[{risk_id, risk_name, likelihood, severity, score, trend}\]. From standard template.                                                                                                                                                                                                                                                                                                                                                                                  |
| risk_trend                | Enum      | N       | improving, stable, deteriorating.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| last_risk_assessment_date | Date      | N       | Most recent assessment date.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| investment_risks          | JSONB\[\] | N       | Layer 2: Investment-specific risks identified at origination. Array of: \[{risk_id (from Part E taxonomy or 'CUSTOM-nnn'), risk_name, risk_description, identified_at (origination/monitoring/annual_review), sensitised_at_origination (boolean), sensitivity_detail (see below), current_assessment: {likelihood, severity, score, trend}, monitoring_kpi (which metric to watch for this risk), monitoring_threshold (at what level this risk becomes material)}\]. |

### F.11.2 Sensitivity Linkage

When a risk was sensitised in the initial investment analysis (IC memo),
the stress applied and the resulting impact on key financial ratios are
recorded. This creates a direct link between the risk register and the
financial model, enabling the system to flag when actual performance
approaches the stressed scenario.

| **Field**                     | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
|-------------------------------|-----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| sensitivity_records           | JSONB\[\] | N       | Array of sensitivities run at origination: \[{sensitivity_id, linked_risk_id (FK to risk in register), sensitivity_name (e.g. 'Wind resource P10', 'Electricity price -20%', '3-month outage'), stress_description (what was changed), stress_parameters: \[{parameter, base_value, stressed_value, units}\], ratio_impacts: \[{ratio_name, composition_tag, min_value, max_value, average_value, period_of_min}\], documented_in (FK → Document, link to IC paper/model), model_scenario_name (name in the financial model)}\]. |
| sensitivity_monitoring_status | JSONB\[\] | N       | Ongoing comparison: \[{sensitivity_id, linked_risk_id, risk_materialising (boolean — is actual performance tracking toward the stressed case?), current_actual_vs_stress (e.g. 'actual DSCR 1.28x vs stressed 1.15x'), headroom_to_stress_pct (how far actual is from the stress case)}\].                                                                                                                                                                                                                                       |

*Example: A wind farm deal. At origination, the team identified wind
resource variability (RISK-MK-001) as the key risk. They sensitised the
model to P10 wind (10th percentile). Under P10, the DSCR fell from a
base case of 1.50x to a minimum of 1.15x (average 1.25x over the debt
term). This is recorded with \`sensitised_at_origination: true\`, the
stress parameters (P50 → P10 wind yield), and the ratio impacts (DSCR
min 1.15x, max 1.45x, avg 1.25x). During ongoing monitoring, when the H1
2025 compliance certificate shows DSCR of 1.31x and the borrower notes
"wind resource at 92% of P50", the system can flag that the deal is
tracking between the base case (1.50x) and the stress case (1.15x), with
0.16x headroom to the stressed minimum.*

### F.11.1 Revenue Risk Classification

| **Field**                 | **Type** | **Req** | **Description / Notes**                   |
|---------------------------|----------|---------|-------------------------------------------|
| revenue_pricing_mechanism | Enum     | Y       | P1-P6.                                    |
| revenue_volume_mechanism  | Enum     | Y       | V1-V6.                                    |
| revenue_duration_category | Enum     | Y       | D1-D5.                                    |
| revenue_risk_composite    | String   | Y       | Combined code (e.g. 'P2-V1-D1').          |
| revenue_risk_level        | Enum     | Y       | very_low, low, moderate, high, very_high. |
| contracted_revenue_pct    | Decimal  | N       | % under long-term contract.               |
| merchant_revenue_pct      | Decimal  | N       | % at spot/market.                         |

## F.12 COVENANT DELIVERABLES & COMPLIANCE

| **Field**                    | **Type**  | **Req** | **Description / Notes**                                                                 |
|------------------------------|-----------|---------|-----------------------------------------------------------------------------------------|
| obligations_summary          | JSONB     | Y       | {total, fulfilled, overdue, upcoming_30d, not_yet_due}.                                 |
| active_obligations           | JSONB\[\] | Y       | \[{obligation_id, description, frequency, next_due_date, status, severity_if_missed}\]. |
| distribution_status          | Enum      | Y       | permitted, locked_up.                                                                   |
| distribution_conditions      | JSONB\[\] | N       | \[{condition_id, description, status, failing_reason}\].                                |
| consecutive_lockup_periods   | Integer   | N       | Consecutive lock-up periods.                                                            |
| lockup_sweep_configured      | Boolean   | N       | Whether an excess cashflow sweep is triggered after consecutive lock-up periods.        |
| lockup_sweep_trigger_periods | Integer   | N       | Number of consecutive lock-up periods before sweep is triggered (e.g. 3).               |
| lockup_sweep_pct             | Decimal   | N       | Percentage of excess cashflow to be swept (if sweep triggered).                         |
| lockup_sweep_status          | Enum      | N       | not_applicable, tracking, triggered, swept.                                             |
| lock_up_test_results         | JSONB     | N       | \[{test_name, result, threshold, passed}\].                                             |
| cash_trap_status             | Boolean   | N       | Whether cash trap is active. Airport WBS: separate from lock-up.                        |

### F.12.1 Consent & Voting

| **Field**                  | **Type** | **Req** | **Description / Notes**     |
|----------------------------|----------|---------|-----------------------------|
| majority_threshold_pct     | Decimal  | N       | Required majority.          |
| all_lender_matters_summary | Text     | N       | 100% consent matters.       |
| snooze_you_lose            | Boolean  | N       | Non-response = consent.     |
| yank_clause                | Boolean  | N       | Non-consenters replaceable. |

## F.13 MONITORING STATUS & EXCEPTIONS

| **Field**                 | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                          |
|---------------------------|-----------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| overall_covenant_status   | Enum      | Y       | performing, lock_up, trigger_event, remedial, event_of_default.                                                                                                                                                                                                  |
| compliance_status         | Enum      | Y       | fully_compliant, deliverables_outstanding, breach_continuing.                                                                                                                                                                                                    |
| trigger_event_active      | Boolean   | Y       | Trigger event active.                                                                                                                                                                                                                                            |
| equity_cure_available     | Boolean   | N       | Equity cure available.                                                                                                                                                                                                                                           |
| equity_cure_regime        | JSONB     | N       | Full equity cure regime: {max_cures_per_year, max_cures_total, cure_period_days, application_method (enum: add_to_ebitda, add_to_cfads, reduce_net_debt, equity_injection), applicable_covenants\[\], cure_amount_cap, cures_exercised_to_date, last_cure_date}. |
| open_exceptions_count     | Integer   | Y       | Unresolved exceptions.                                                                                                                                                                                                                                           |
| open_exceptions           | JSONB\[\] | N       | \[{exception_id, type, severity, description, days_open}\].                                                                                                                                                                                                      |
| last_financial_data_date  | Date      | N       | Most recent reported financials.                                                                                                                                                                                                                                 |
| last_compliance_cert_date | Date      | N       | Most recent compliance cert.                                                                                                                                                                                                                                     |
| next_covenant_test_date   | Date      | N       | Next covenant test date.                                                                                                                                                                                                                                         |
| narrative_current         | Text      | N       | Current commentary.                                                                                                                                                                                                                                              |
| narrative_approved_by     | String    | N       | Approved by.                                                                                                                                                                                                                                                     |
| shortfall_equity_injected | Decimal   | N       | Equity injected for shortfalls.                                                                                                                                                                                                                                  |

## F.14 INVESTOR ALLOCATION & MANDATE TRACKING

| **Field**             | **Type**  | **Req** | **Description / Notes**                                             |
|-----------------------|-----------|---------|---------------------------------------------------------------------|
| allocations           | JSONB\[\] | N       | \[{investor_name, tranche, amount, mandate_size, pct_of_mandate}\]. |
| total_across_mandates | Decimal   | N       | Sum across mandates.                                                |

## F.15 DEVELOPMENT & PHASED CAPEX

**v2 NEW: Clean Tech Hub: phased rollout. Airport WBS: capex facility
drawdowns against allowed capex envelope. Port Concession: ongoing capex
facilities.**

| **Field**               | **Type**  | **Req** | **Description / Notes**                                                              |
|-------------------------|-----------|---------|--------------------------------------------------------------------------------------|
| development_phases      | JSONB\[\] | N       | \[{phase_name, capex_budget, start, completion, status, description}\].              |
| rollout_plan            | JSONB     | N       | \[{period, units_added, cumulative, unit_type}\].                                    |
| capex_reserve_required  | Decimal   | N       | Required capex reserve.                                                              |
| capex_allowance_expiry  | Date      | N       | Capex allowance expiry.                                                              |
| lifecycle_capex_plan    | JSONB     | N       | \[{year, description, estimated_cost}\].                                             |
| allowed_vs_actual_capex | JSONB     | N       | \[{period, allowed, actual, variance_pct}\]. Airport WBS: regulatory capex tracking. |

## F.16 HEDGING & INTEREST RATE RISK

**v2 NEW: Gold has extensive hedging: floating-to-fixed, index-linked,
and monitoring of hedge coverage. Captures both hedging policy and
current portfolio.**

| **Field**             | **Type**  | **Req** | **Description / Notes**                                                                              |
|-----------------------|-----------|---------|------------------------------------------------------------------------------------------------------|
| hedging_policy        | JSONB     | N       | {min_hedged_pct, max_hedged_pct, permitted_instruments, tenor_requirements}.                         |
| hedging_portfolio     | JSONB\[\] | N       | \[{hedge_type, notional, pct_of_term_loan, pct_of_total_debt, tenor, fixed_rate, counterparty}\].    |
| base_rate_curve       | JSONB     | N       | \[{tenor, libor, nominal_swap, real_swap, nominal_gilt, real_gilt}\]. Airport WBS: full yield curve. |
| hedged_cost_of_debt   | Decimal   | N       | Blended hedged cost. Airport WBS.                                                                    |
| unhedged_cost_of_debt | Decimal   | N       | Capex facility / unhedged portion cost. Airport WBS.                                                 |

## F.17 TOPSHEET METADATA

| **Field**         | **Type**  | **Req** | **Description / Notes**                                |
|-------------------|-----------|---------|--------------------------------------------------------|
| topsheet_version  | Integer   | Y       | Auto-incrementing version.                             |
| snapshot_date     | Timestamp | Y       | When created.                                          |
| snapshot_trigger  | String    | Y       | What caused the snapshot.                              |
| created_by        | String    | Y       | Creator user/service.                                  |
| approved_by       | String    | N       | HAM/PM approver.                                       |
| approved_at       | Timestamp | N       | Approval time.                                         |
| assigned_ham      | String    | Y       | Human Asset Manager.                                   |
| assigned_pam      | String    | N       | Portfolio Asset Manager.                               |
| client_id         | UUID      | Y       | Tenant boundary.                                       |
| portfolio_ids     | UUID\[\]  | Y       | Portfolios.                                            |
| prior_snapshot_id | UUID      | N       | Previous version link.                                 |
| model_version     | String    | N       | Source model version (e.g. 'WestLB Case 2', 'CAD BC'). |
| model_date        | Date      | N       | Source model date.                                     |

## F.18 ACTUAL RESULTS & MONITORING DATA

### F.18.0 Design Rationale

Sections F.5 through F.7 record the **expected** financial performance —
the projections from the financial model at origination or most recent
model update. As the investment moves through its life, the borrower
delivers actual results: audited annual accounts, unaudited management
accounts, quarterly or semi-annual compliance certificates, and
operational reports. These actuals must be recorded at the same
granularity as the projections so that the platform can compute
variances, identify trends, and flag deviations.

The design principle is simple: **one actual period record per reporting
delivery**. When audited accounts for FY2025 arrive, a new actual period
is created with the same field structure as the projected FY2025 period.
When a Q2 2026 compliance certificate arrives, an actual period for Q2
2026 is created. Over time, the actual time series builds alongside the
projected time series, period by period.

This means:

> • The actual data uses **exactly the same field schemas** as F.5.1
> through F.5.4, F.6.1, and F.7 — same fields, same types, same
> granularity. There is no separate "actuals schema". An actual cashflow
> statement has the same columns as a projected cashflow statement.
>
> • The **period definition** (F.5.1) already distinguishes actual from
> projected through two fields: case_type (set to actual for reported
> results) and historic_or_forecast (set to actual). Every actual period
> record carries these flags.
>
> • Each actual period record carries **provenance metadata**
> identifying the source document, extraction method, and approval
> status. This is the key addition — projections come from the financial
> model; actuals come from specific documents that must be traceable.

### F.18.1 Actual Period Record

Each delivery of actual results creates one or more actual period
records. The record uses the standard period definition fields (F.5.1)
plus the provenance fields below.

| **Field**                  | **Type** | **Req** | **Description / Notes**                                                                                                                                                                                                          |
|----------------------------|----------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id           | UUID     | Y       | Primary key for this actual period record.                                                                                                                                                                                       |
| investment_id              | UUID     | Y       | FK to deal.                                                                                                                                                                                                                      |
| period_label               | String   | Y       | Same period label as the corresponding projection (e.g. 'FY2025', '2026Q2'). Links actual to expected.                                                                                                                           |
| period_flag                | String   | Y       | Compact key matching the projected period (e.g. '2025A', '2026Q2').                                                                                                                                                              |
| period_start               | Date     | Y       | First day of the reporting period.                                                                                                                                                                                               |
| period_end                 | Date     | Y       | Last day of the reporting period.                                                                                                                                                                                                |
| period_frequency           | Enum     | Y       | monthly, quarterly, semi_annual, annual. Must match or be mappable to projection frequency.                                                                                                                                      |
| case_type                  | Enum     | Y       | Always actual for these records.                                                                                                                                                                                                 |
| historic_or_forecast       | Enum     | Y       | Always actual for these records.                                                                                                                                                                                                 |
| source_document_type       | Enum     | Y       | audited_accounts, unaudited_accounts, management_accounts, compliance_certificate, officer_certificate, quarterly_report, semi_annual_report, annual_report, operational_report, budget_vs_actual, regulatory_submission, other. |
| source_document_id         | UUID     | Y       | FK to the Document entity (D.3). Links to the specific PDF/file in the deal container.                                                                                                                                           |
| source_document_date       | Date     | Y       | Date of the source document (e.g. date accounts were signed, date compliance certificate was issued).                                                                                                                            |
| reporting_period_end       | Date     | Y       | The financial period end date reported in the document. May differ from period_end if the borrower's FY doesn't align with calendar periods.                                                                                     |
| audited                    | Boolean  | Y       | Whether the figures are from audited or unaudited accounts.                                                                                                                                                                      |
| auditor_name               | String   | N       | Name of the auditor (for audited accounts).                                                                                                                                                                                      |
| audit_opinion              | Enum     | N       | unqualified, qualified, adverse, disclaimer, emphasis_of_matter.                                                                                                                                                                 |
| audit_qualification_detail | Text     | N       | Detail of any qualification or emphasis of matter.                                                                                                                                                                               |
| extracted_by               | Enum     | Y       | ai_agent, manual, hybrid. How the data was extracted from the source document.                                                                                                                                                   |
| extraction_confidence      | Decimal  | N       | AI agent confidence score (0-1) if extracted by agent.                                                                                                                                                                           |
| reviewed_by                | String   | N       | HAM/analyst who reviewed the extraction.                                                                                                                                                                                         |
| review_date                | Date     | N       | Date of human review.                                                                                                                                                                                                            |
| approved_by                | String   | N       | Approver (HAM or PM).                                                                                                                                                                                                            |
| approved_date              | Date     | N       | Date approved and committed to the canonical store.                                                                                                                                                                              |
| status                     | Enum     | Y       | draft (extracted, not yet reviewed), reviewed (human-checked), approved (committed), superseded (replaced by corrected version).                                                                                                 |
| superseded_by              | UUID     | N       | If this record has been corrected, FK to the replacement actual_period_id.                                                                                                                                                       |
| notes                      | Text     | N       | Analyst commentary on the actual results.                                                                                                                                                                                        |

### F.18.2 Actual Cashflow Statement

Uses **exactly the same fields** as F.5.2 (Cashflow Statement per
period). Every field in the projected cashflow statement has an actual
counterpart. The actual cashflow record is linked to the actual period
record above via actual_period_id.

| **Field**                   | **Type** | **Req** | **Description / Notes**                                                                     |
|-----------------------------|----------|---------|---------------------------------------------------------------------------------------------|
| actual_period_id            | UUID     | Y       | FK to F.18.1 actual period record.                                                          |
| total_revenue               | Decimal  | N       | Actual total operating revenue.                                                             |
| revenue_lines               | JSONB    | N       | \[{label, amount}\]. Actual revenue breakdown matching projected line items where possible. |
| amort_deferred_income       | Decimal  | N       | Actual amortisation of deferred/pre-paid income.                                            |
| total_operating_costs       | Decimal  | N       | Actual total operating costs (negative).                                                    |
| cost_lines                  | JSONB    | N       | \[{label, amount}\]. Actual cost breakdown.                                                 |
| disallowed_costs            | Decimal  | N       | Actual disallowed / corporate costs (WBS).                                                  |
| exceptional_items           | JSONB    | N       | \[{label, amount}\]. Actual exceptional items.                                              |
| ebitda                      | Decimal  | N       | Actual EBITDA.                                                                              |
| ebitda_margin               | Decimal  | N       | Actual EBITDA / Revenue.                                                                    |
| depreciation                | Decimal  | N       | Actual accounting depreciation.                                                             |
| regulatory_depreciation     | Decimal  | N       | Actual regulatory depreciation (RAB-based).                                                 |
| ebit                        | Decimal  | N       | Actual EBIT.                                                                                |
| capital_expenditure         | Decimal  | N       | Actual capex (negative).                                                                    |
| charger_replacement_costs   | Decimal  | N       | Actual replacement capex (EV/equipment).                                                    |
| working_capital_movement    | Decimal  | N       | Actual change in working capital.                                                           |
| reserve_account_movements   | JSONB    | N       | \[{account_name, opening, additions, releases, closing}\]. Actual reserve movements.        |
| pre_finance_pre_tax_cf      | Decimal  | N       | Actual pre-finance, pre-tax CF.                                                             |
| tax_paid                    | Decimal  | N       | Actual tax paid (negative).                                                                 |
| pre_finance_post_tax_cf     | Decimal  | N       | Actual pre-finance, post-tax CF.                                                            |
| interest_on_cash            | Decimal  | N       | Actual interest on cash balances.                                                           |
| customer_prepayment         | Decimal  | N       | Actual customer pre-payments.                                                               |
| grant_income                | Decimal  | N       | Actual grant / subsidy income.                                                              |
| senior_debt_drawdown        | Decimal  | N       | Actual senior debt drawn.                                                                   |
| capex_facility_drawdown     | Decimal  | N       | Actual capex facility drawn.                                                                |
| junior_debt_drawdown        | Decimal  | N       | Actual junior / mezzanine drawn.                                                            |
| shareholder_loan_drawdown   | Decimal  | N       | Actual shareholder loan drawn.                                                              |
| equity_drawdown             | Decimal  | N       | Actual equity injected.                                                                     |
| total_funding               | Decimal  | N       | Actual total funding.                                                                       |
| cfads                       | Decimal  | N       | Actual Cashflow Available for Debt Service.                                                 |
| senior_interest             | Decimal  | N       | Actual senior interest + commitment fees.                                                   |
| senior_principal            | Decimal  | N       | Actual senior principal repayment (scheduled).                                              |
| senior_principal_sweep      | Decimal  | N       | Actual cash sweep repayment.                                                                |
| senior_debt_service         | Decimal  | N       | Actual total senior DS.                                                                     |
| cf_after_senior_ds          | Decimal  | N       | Actual CF after senior DS.                                                                  |
| junior_interest             | Decimal  | N       | Actual junior interest.                                                                     |
| junior_principal            | Decimal  | N       | Actual junior principal.                                                                    |
| junior_debt_service         | Decimal  | N       | Actual total junior DS.                                                                     |
| shareholder_loan_interest   | Decimal  | N       | Actual SHL interest.                                                                        |
| shareholder_loan_repayment  | Decimal  | N       | Actual SHL repayment.                                                                       |
| intercompany_interest_net   | Decimal  | N       | Actual net intercompany interest.                                                           |
| ticking_commitment_fees     | Decimal  | N       | Actual ticking / commitment fees.                                                           |
| debt_arrangement_fees       | Decimal  | N       | Actual arrangement / issuance fees.                                                         |
| liquidity_facility_drawdown | Decimal  | N       | Actual drawdown from liquidity reserves/facilities.                                         |
| net_cashflow                | Decimal  | N       | Actual net CF after all debt service.                                                       |
| cash_bf                     | Decimal  | N       | Actual opening cash.                                                                        |
| distributions               | Decimal  | N       | Actual dividends to equity (negative).                                                      |
| nil_par_pref_redemption     | Decimal  | N       | Actual nil-par preference share redemption.                                                 |
| share_capital_redemption    | Decimal  | N       | Actual share capital redemption.                                                            |
| cash_cf                     | Decimal  | N       | Actual closing cash.                                                                        |

### F.18.3 Actual Balance Sheet

Uses **exactly the same fields** as F.5.3 (Balance Sheet per period).
Linked via actual_period_id.

| **Field**                | **Type** | **Req** | **Description / Notes**                            |
|--------------------------|----------|---------|----------------------------------------------------|
| actual_period_id         | UUID     | Y       | FK to F.18.1 actual period record.                 |
| total_fixed_assets       | Decimal  | N       | Actual fixed assets (NBV).                         |
| land_value               | Decimal  | N       | Actual land at valuation.                          |
| intangible_assets        | Decimal  | N       | Actual intangibles / goodwill / concession rights. |
| transaction_goodwill     | Decimal  | N       | Actual acquisition goodwill.                       |
| deferred_financing_fees  | Decimal  | N       | Actual capitalised financing fees.                 |
| deferred_tax_asset       | Decimal  | N       | Actual DTA.                                        |
| inventories              | Decimal  | N       | Actual inventories.                                |
| trade_receivables        | Decimal  | N       | Actual trade receivables.                          |
| current_assets           | Decimal  | N       | Actual total current assets (excl cash).           |
| cash                     | Decimal  | N       | Actual cash and equivalents.                       |
| dsra_balance             | Decimal  | N       | Actual DSRA balance.                               |
| escrow_balance           | Decimal  | N       | Actual escrow account balance.                     |
| other_reserve_balances   | JSONB    | N       | \[{name, balance}\]. Actual reserve balances.      |
| total_assets             | Decimal  | N       | Actual total assets.                               |
| trade_payables           | Decimal  | N       | Actual trade payables.                             |
| capital_payables         | Decimal  | N       | Actual capital creditors.                          |
| tax_payable              | Decimal  | N       | Actual tax payable.                                |
| deferred_tax_liability   | Decimal  | N       | Actual DTL.                                        |
| senior_debt_balance      | Decimal  | N       | Actual senior debt outstanding.                    |
| class_a_bonds            | Decimal  | N       | Actual Class A bonds outstanding.                  |
| class_b_bonds            | Decimal  | N       | Actual Class B bonds outstanding.                  |
| capex_facility_balance   | Decimal  | N       | Actual capex facility drawn.                       |
| junior_debt_balance      | Decimal  | N       | Actual junior / mezzanine outstanding.             |
| shareholder_loan_balance | Decimal  | N       | Actual SHL outstanding.                            |
| lease_liabilities        | Decimal  | N       | Actual lease obligations.                          |
| intercompany_loans_net   | Decimal  | N       | Actual net intercompany position.                  |
| other_liabilities        | Decimal  | N       | Actual provisions, other.                          |
| retained_earnings        | Decimal  | N       | Actual cumulative retained earnings.               |
| share_capital            | Decimal  | N       | Actual share capital.                              |
| revaluation_reserve      | Decimal  | N       | Actual revaluation reserve.                        |
| nil_par_pref_shares      | Decimal  | N       | Actual nil-par preference shares.                  |
| equity                   | Decimal  | N       | Actual total equity.                               |
| senior_net_debt          | Decimal  | N       | Actual senior debt minus cash.                     |
| total_net_debt           | Decimal  | N       | Actual all debt minus cash.                        |
| rab_closing              | Decimal  | N       | Actual closing RAB (regulatory).                   |
| rab_closing_gross        | Decimal  | N       | Actual closing gross RAB.                          |

### F.18.4 Actual Annualised / Rolling Metrics

Uses **exactly the same fields** as F.5.4. Computed from actual period
data as it accumulates. Linked via actual_period_id.

| **Field**               | **Type** | **Req** | **Description / Notes**                                                                                                                                     |
|-------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id        | UUID     | Y       | FK to F.18.1 actual period record.                                                                                                                          |
| rolling_12m_ebitda      | Decimal  | N       | Actual trailing 12-month EBITDA. Requires 4 quarterly or 12 monthly actuals to compute; partial computation flagged.                                        |
| rolling_12m_cfads       | Decimal  | N       | Actual trailing 12-month CFADS.                                                                                                                             |
| rolling_12m_senior_ds   | Decimal  | N       | Actual trailing 12-month senior DS.                                                                                                                         |
| rolling_12m_total_ds    | Decimal  | N       | Actual trailing 12-month total DS.                                                                                                                          |
| rolling_12m_revenue     | Decimal  | N       | Actual trailing 12-month revenue.                                                                                                                           |
| rolling_period_coverage | Enum     | N       | full (12 months of actuals available), partial (less than 12 months), annualised (partial period annualised). Indicates reliability of rolling computation. |

### F.18.5 Actual Financial Ratios

Uses **exactly the same fields** as F.6.1 (Computed Ratios). Ratios are
computed from actual financial data and tested against the covenant
thresholds defined in F.6.3. This is where covenant compliance is
determined.

| **Field**                | **Type** | **Req** | **Description / Notes**                                                                                                                                                                                                                                                 |
|--------------------------|----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id         | UUID     | Y       | FK to F.18.1 actual period record.                                                                                                                                                                                                                                      |
| senior_quarterly_dscr    | Decimal  | N       | Actual CFADS / Senior DS (period).                                                                                                                                                                                                                                      |
| senior_annual_dscr       | Decimal  | N       | Actual rolling 12m CFADS / rolling 12m senior DS.                                                                                                                                                                                                                       |
| total_quarterly_dscr     | Decimal  | N       | Actual CFADS / Total DS (period).                                                                                                                                                                                                                                       |
| total_annual_dscr        | Decimal  | N       | Actual rolling 12m total.                                                                                                                                                                                                                                               |
| interest_cover_ratio     | Decimal  | N       | Actual EBITDA / Interest.                                                                                                                                                                                                                                               |
| icr_regulatory_dep       | Decimal  | N       | Actual ICR using regulatory depreciation.                                                                                                                                                                                                                               |
| icr_2pct_rab             | Decimal  | N       | Actual ICR using 2% of RAB.                                                                                                                                                                                                                                             |
| ltv_npv                  | Decimal  | N       | Actual LTV based on NPV of future CFs. Note: requires updated model/valuation, not purely from accounts.                                                                                                                                                                |
| net_debt_rab             | Decimal  | N       | Actual Net Debt / RAB.                                                                                                                                                                                                                                                  |
| net_debt_rab_incl_shl    | Decimal  | N       | Actual Net Debt / RAB including SHL.                                                                                                                                                                                                                                    |
| class_a_debt_rab         | Decimal  | N       | Actual Class A Net Debt / RAB.                                                                                                                                                                                                                                          |
| class_b_debt_rab         | Decimal  | N       | Actual Class B Net Debt / RAB.                                                                                                                                                                                                                                          |
| llcr                     | Decimal  | N       | Actual LLCR. Note: requires updated model projections from current balance, not purely from accounts.                                                                                                                                                                   |
| plcr                     | Decimal  | N       | Actual PLCR. Same caveat as LLCR.                                                                                                                                                                                                                                       |
| senior_net_debt_ebitda   | Decimal  | N       | Actual Senior Net Debt / EBITDA.                                                                                                                                                                                                                                        |
| total_net_debt_ebitda    | Decimal  | N       | Actual Total Net Debt / EBITDA.                                                                                                                                                                                                                                         |
| ebitda_margin            | Decimal  | N       | Actual EBITDA / Revenue.                                                                                                                                                                                                                                                |
| solvency_ratio_1yr       | Decimal  | N       | Actual 1-year solvency ratio.                                                                                                                                                                                                                                           |
| solvency_ratio_3yr       | Decimal  | N       | Actual 3-year solvency ratio.                                                                                                                                                                                                                                           |
| rar                      | Decimal  | N       | Actual Regulated Asset Ratio (WBS).                                                                                                                                                                                                                                     |
| pmicr                    | Decimal  | N       | Actual Post-Maintenance ICR (WBS).                                                                                                                                                                                                                                      |
| leverage_for_grid        | Decimal  | N       | Actual leverage used for margin ratchet lookup. Determines current applicable margin.                                                                                                                                                                                   |
| ratio_source             | Enum     | N       | computed_from_actuals (platform computed from actual financial data), borrower_reported (taken directly from compliance certificate), agent_reported (from facility agent calculation). Indicates whether the ratio was independently computed or accepted as reported. |
| borrower_reported_ratios | JSONB    | N       | \[{ratio_name, borrower_value}\]. The ratios as reported by the borrower on the compliance certificate. Stored separately for reconciliation even when platform computes independently.                                                                                 |

### F.18.6 Actual Covenant Test Results

For each actual period where covenant testing occurs, the platform
records the test outcome against each applicable covenant threshold.
This links F.18.5 (actual ratios) to F.6.3 (covenant thresholds) and
generates the compliance status that appears on the topsheet.

| **Field**            | **Type** | **Req** | **Description / Notes**                                                                                                                    |
|----------------------|----------|---------|--------------------------------------------------------------------------------------------------------------------------------------------|
| covenant_test_id     | UUID     | Y       | Primary key.                                                                                                                               |
| actual_period_id     | UUID     | Y       | FK to the actual period being tested.                                                                                                      |
| covenant_id          | String   | Y       | FK to the covenant definition in F.6.3 covenant_thresholds.                                                                                |
| covenant_name        | String   | Y       | Human name (e.g. 'Senior DSCR', 'Class A ICR (Reg Dep)', 'Net Debt / RAB').                                                                |
| test_type            | Enum     | Y       | hard_covenant, distribution_condition, trigger, default, soft_default. From F.6.3.                                                         |
| threshold_value      | Decimal  | Y       | The applicable threshold for this period (may vary if step-down schedule applies).                                                         |
| actual_value         | Decimal  | Y       | The actual ratio value being tested.                                                                                                       |
| headroom_absolute    | Decimal  | N       | Actual value minus threshold (for min covenants) or threshold minus actual (for max covenants). Positive = passing.                        |
| headroom_pct         | Decimal  | N       | Headroom as percentage of threshold.                                                                                                       |
| result               | Enum     | Y       | pass, fail, waived, not_tested, cured.                                                                                                     |
| breach_severity      | Enum     | N       | If result is fail: technical (minor, likely curable), material (significant headroom erosion), event_of_default (triggers EoD provisions). |
| consecutive_failures | Integer  | N       | Number of consecutive test periods this covenant has failed. Relevant for escalation triggers (see Part B: multi-tier framework).          |
| cure_details         | Text     | N       | If cured: description of cure mechanism applied (equity cure, waiver, etc.).                                                               |
| waiver_reference     | String   | N       | Reference to waiver/consent document if waived.                                                                                            |
| notes                | Text     | N       | Analyst commentary on the test result.                                                                                                     |

### F.18.7 Actual Sector-Specific KPIs

Uses **exactly the same fields** as F.7.1 (KPI Storage) and the sector
templates (F.7.2 through F.7.5). Actual KPIs are extracted from
operational reports, management accounts, or compliance certificates.

| **Field**        | **Type** | **Req** | **Description / Notes**                                                                                                                                       |
|------------------|----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id | UUID     | Y       | FK to F.18.1 actual period record.                                                                                                                            |
| sector_kpis      | JSONB    | N       | {kpi_id: {value, unit, label, category}}. Actual KPI values for the period. Uses the same KPI identifiers as the projected KPIs in F.7 for direct comparison. |

The sector templates (F.7.2–F.7.5) apply identically to actual data.
Examples:

> • **Data Centre (F.7.2):** Actual gpu_count, actual pue, actual
> utilisation_rate, actual power_price_per_kwh for the period.
>
> • **Port Concession (F.7.3):** Actual teu_volume_actual, actual
> revenue_per_teu, actual capacity_utilisation.
>
> • **EV Charging (F.7.4):** Actual charging_bay_count, actual
> charger_utilisation, actual energy_cost_per_kwh.
>
> • **Airport (F.7.5):** Actual traffic_mppa, actual
> tariff_per_pax_nominal, actual retail_revenue_per_pax, actual
> rab_closing, actual allowed_capex vs actual_capex.

### F.18.8 Actual Capital Structure Position

Records the actual debt position at each reporting date, capturing
drawdowns, repayments, and balance movements against each instrument in
the capital structure (F.2A). This is necessary because projected
amortisation schedules may differ from actual repayments due to cash
sweeps, voluntary prepayments, accordion exercises, or refinancings.

| **Field**                   | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                                                                                                                                             |
|-----------------------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id            | UUID      | Y       | FK to F.18.1 actual period record.                                                                                                                                                                                                                                                                                  |
| instrument_positions        | JSONB\[\] | Y       | \[{instrument_id, instrument_name, opening_balance, drawdowns, scheduled_repayment, sweep_repayment, voluntary_prepayment, other_movements, closing_balance, committed_undrawn, accrued_interest, applicable_margin_bps, current_reference_rate, all_in_rate}\]. One entry per instrument in the capital structure. |
| total_senior_debt           | Decimal   | N       | Sum of all senior instrument closing balances.                                                                                                                                                                                                                                                                      |
| total_junior_debt           | Decimal   | N       | Sum of all junior/mezzanine closing balances.                                                                                                                                                                                                                                                                       |
| total_shareholder_loans     | Decimal   | N       | Sum of all SHL closing balances.                                                                                                                                                                                                                                                                                    |
| total_debt                  | Decimal   | N       | Sum of all debt instrument closing balances.                                                                                                                                                                                                                                                                        |
| total_cash_and_reserves     | Decimal   | N       | Cash plus all reserve account balances.                                                                                                                                                                                                                                                                             |
| total_net_debt              | Decimal   | N       | Total debt minus cash and reserves.                                                                                                                                                                                                                                                                                 |
| margin_ratchet_level        | String    | N       | Current margin ratchet level (e.g. 'Level 2: 3.50% at leverage 4.0-4.5x'). Based on actual leverage vs grid in F.2.3.                                                                                                                                                                                               |
| reserve_account_status      | JSONB\[\] | N       | \[{account_name, required_balance, actual_balance, shortfall, status}\]. Status: fully_funded, partially_funded, in_cure_period, waived.                                                                                                                                                                            |
| distribution_lock_up_status | Enum      | N       | distributions_permitted, locked_up, partial_lock_up, cure_period. Based on actual covenant test results vs distribution conditions.                                                                                                                                                                                 |

### F.18.9 Actual Development & Capex Tracking

Records actual progress against development milestones and capex budgets
(counterpart to F.15). Particularly important for construction-phase
deals and phased rollouts.

| **Field**                   | **Type**  | **Req** | **Description / Notes**                                                                                                                                                             |
|-----------------------------|-----------|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id            | UUID      | Y       | FK to F.18.1 actual period record.                                                                                                                                                  |
| development_phase_actuals   | JSONB\[\] | N       | \[{phase_name, budgeted_capex, actual_capex_to_date, variance_pct, budgeted_completion, forecast_completion, status}\]. Status: on_track, delayed, over_budget, completed, at_risk. |
| rollout_actuals             | JSONB     | N       | \[{period, planned_units, actual_units, cumulative_actual, unit_type}\]. For phased rollouts (e.g. EV charger installation).                                                        |
| capex_vs_budget             | JSONB     | N       | {budgeted_total, actual_to_date, committed_not_spent, forecast_to_complete, variance_pct, contingency_remaining}.                                                                   |
| allowed_vs_actual_capex     | JSONB     | N       | \[{period, allowed, actual, variance_pct}\]. For regulated assets where capex is subject to regulatory allowance.                                                                   |
| construction_completion_pct | Decimal   | N       | Overall construction/development completion percentage.                                                                                                                             |
| cod_status                  | Enum      | N       | not_started, in_progress, substantially_complete, cod_achieved, delayed. Commercial Operation Date status.                                                                          |
| cod_delay_days              | Integer   | N       | Days behind original COD if delayed.                                                                                                                                                |

### F.18.10 Actual Hedging Position

Records the actual hedging portfolio at each reporting date (counterpart
to F.16). Important because hedges mature, are rolled, or restructured
over time.

| **Field**                  | **Type**  | **Req** | **Description / Notes**                                                                                                                                                                     |
|----------------------------|-----------|---------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| actual_period_id           | UUID      | Y       | FK to F.18.1 actual period record.                                                                                                                                                          |
| hedging_portfolio_actual   | JSONB\[\] | N       | \[{hedge_type, notional, pct_of_term_loan, pct_of_total_debt, maturity_date, fixed_rate, counterparty, counterparty_rating, mark_to_market}\]. Current hedge portfolio with MTM valuations. |
| hedge_coverage_pct         | Decimal   | N       | Percentage of floating-rate debt currently hedged.                                                                                                                                          |
| hedge_policy_compliant     | Boolean   | N       | Whether current hedge coverage meets the policy requirements defined in F.16 hedging_policy.                                                                                                |
| hedge_policy_breach_detail | Text      | N       | If non-compliant: what is the shortfall and remediation timeline.                                                                                                                           |
| weighted_avg_hedge_rate    | Decimal   | N       | Weighted average fixed rate across all hedges.                                                                                                                                              |
| hedge_maturity_profile     | JSONB     | N       | \[{year, notional_maturing, pct_of_debt}\]. Shows concentration of hedge maturities.                                                                                                        |

### F.18.11 How Actuals Build Over Time

The actual data accumulates incrementally. A typical annual reporting
infrastructure deal might build its actual record as follows:

**Year 1 post-close:**

> • Q1 compliance certificate arrives → F.18.1 period record created
> (source: compliance_certificate). F.18.2 cashflow may be partial
> (CFADS and DS only, from the certificate). F.18.5 ratios populated.
> F.18.6 covenant tests run against F.6.3 thresholds.
>
> • Q2, Q3 compliance certificates → same pattern. Actual time series
> grows to three periods.
>
> • Annual audited accounts arrive → F.18.1 record created (source:
> audited_accounts, audited: true). Full F.18.2 cashflow statement, full
> F.18.3 balance sheet, F.18.4 rolling metrics (may still be partial if
> less than 12 months of data). F.18.5 ratios recomputed from full
> accounts — may differ slightly from compliance certificate ratios.
>
> • F.18.8 capital structure position updated from accounts showing
> actual debt balances, reserve levels.

**Year 2 onwards:**

> • Pattern repeats. Rolling metrics become fully computable (four
> quarters of actuals). Trend analysis becomes meaningful.
>
> • Sector KPIs (F.18.7) accumulate — traffic growth, utilisation, TEU
> volumes, etc. build a picture over time.

**Key design points:**

> • Multiple actual records can exist for the same period — the audited
> accounts and the Q4 compliance certificate may both create records for
> the same annual period, with different granularity. The
> source_document_type distinguishes them. The status field manages
> which is canonical.
>
> • When audited accounts supersede previously recorded
> unaudited/management account figures, the earlier record's status is
> set to superseded and superseded_by links to the audited version.
>
> • The platform always presents the highest-quality actual for each
> period: audited \> unaudited \> management accounts \> compliance
> certificate extracts.
>
> • Where the borrower reports ratios on the compliance certificate and
> the platform independently computes them from the accounts, both
> values are stored (F.18.5 borrower_reported_ratios). Any material
> discrepancy generates an alert.

**APPENDIX: MODEL CROSS-REFERENCE**

Summary of which models validated which schema sections:

| **Section**            | **Data Centre** | **Port Concession (Port)** | **Clean Tech Hub (EV)** | **Gold (Airport)**  |
|------------------------|-----------------|----------------------------|-------------------------|---------------------|
| S1. Deal Identity      | Y               | Y                          | Y                       | Y                   |
| S2. Structure & Terms  | Y               | Y                          | Y                       | Y                   |
| S3. Ratings            | IC Paper        | —                          | —                       | —                   |
| S4. Counterparties     | IC Paper        | —                          | —                       | —                   |
| S5. Cashflow Statement | Y (quarterly)   | Y (annual)                 | Y (monthly)             | Y (annual)          |
| S5. Balance Sheet      | Y               | Y                          | Y                       | Y                   |
| S6. DSCR               | Y               | Y                          | Y                       | —                   |
| S6. ICR                | —               | Y                          | —                       | Y (primary)         |
| S6. LLCR               | —               | Y                          | —                       | —                   |
| S6. Debt/RAB           | —               | —                          | —                       | Y (primary)         |
| S6. Solvency           | —               | —                          | —                       | Y                   |
| S6. Covenant Config    | Y               | Y (step-down)              | Y                       | Y (trigger+default) |
| S7. Sector KPIs        | GPU/DC          | TEU/Port                   | EV/Battery              | PAX/RAB/Tariff      |
| S8. Scenarios          | Single case     | 2 cases                    | Single+delta            | 14 scenarios        |
| S9. IRR/Returns        | Y               | —                          | Y                       | —                   |
| S9. Exit Valuation     | —               | —                          | Y (RE method)           | Y (EV/RAB)          |
| S9. Maturity Analysis  | —               | —                          | —                       | Y                   |
| S15. Phased Capex      | Single phase    | Capex facilities           | Multi-phase             | Allowed vs actual   |
| S16. Hedging           | —               | —                          | —                       | Y (full portfolio)  |

# PART G: ANALYTICS OVERLAY — DETERMINISTIC ENGINES

## G.1 Product Objectives and Users

### Primary Personas

| **Persona**                   | **Role**                                                                                                        | **Primary Jobs to Be Done**                                                                                                                                                            |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **HAM** (Human Asset Manager) | Day-to-day deal monitoring. Owns 15–40 deals. First responder for incoming data, covenant breaches, exceptions. | Review and approve extracted data (Tier 2). Monitor covenant headroom. Chase overdue deliverables. Draft period commentary. Respond to consent requests. Maintain risk register.       |
| **PM** (Portfolio Manager)    | Portfolio-level oversight. Manages a book of 50–200 deals across multiple HAMs.                                 | Monitor portfolio risk concentrations. Review watchlist and downgraded deals. Approve internal ratings. Challenge HAM assessments. Produce client reporting. Identify systemic trends. |
| **Credit Analyst**            | Deep-dive analysis at origination and annual review. Produces IC papers and rating recommendations.             | Analyse financial models. Stress-test covenants. Compare deals against sector benchmarks. Draft rating rationale. Review revenue risk classification.                                  |
| **Client Viewer**             | Asset owner (pension fund, insurer) viewing their portfolio. Read-only access to their mandates.                | View portfolio summary. Monitor covenant compliance across their holdings. Download reporting packs. Track mandate performance against benchmark.                                      |
| **Admin**                     | System configuration and user management.                                                                       | Manage users and entitlements. Configure deal setup (obligation schedules, covenant thresholds). Maintain controlled lists (sector labels, document types). Monitor pipeline health.   |

### Analytics Objectives

The analytics overlay exists to answer five questions deterministically,
without human judgement or AI interpretation:

> **1. Is the borrower in compliance?** — Obligation scheduling,
> covenant testing, distribution condition evaluation
>
> **2. How much room is there before trouble?** — Headroom calculation
> across all tiers and thresholds
>
> **3. Is performance improving or deteriorating?** — Trend detection,
> variance analysis, consecutive-period tracking
>
> **4. What needs attention right now?** — Alerting, exception
> prioritisation, escalation
>
> **5. What does the portfolio look like in aggregate?** — Rollups by
> sector, geography, strategy, risk profile, covenant status

Every answer must be deterministic (recomputable from the event log),
auditable (who/what/when/why), and evidence-linked (traceable to source
documents).

## G.2 Domain Model — Analytical Constructs

### G.2.1 FinancialPeriod (extended for analytics)

Each FinancialPeriod record (D.3) is extended with analytics metadata:

| **Field**                   | **Type**                                                       | **Purpose**                                                                     |
|-----------------------------|----------------------------------------------------------------|---------------------------------------------------------------------------------|
| source_hierarchy            | Enum: audited, certificate, unaudited, management, model       | Controls which source takes precedence when multiple exist for the same period  |
| borrower_reported_ratios    | JSONB                                                          | Ratios as reported by the borrower in the compliance certificate                |
| platform_computed_ratios    | JSONB                                                          | Ratios recomputed by the platform from extracted components                     |
| ratio_reconciliation_status | Enum: matched, minor_variance, material_variance, unreconciled | Whether borrower-reported and platform-computed ratios agree                    |
| ratio_reconciliation_detail | JSONB                                                          | Per-ratio: {ratio_name, borrower_value, platform_value, variance, variance_pct} |

**Source precedence rule:** When multiple documents arrive for the same
investment and period (e.g. a compliance certificate followed by audited
accounts), the platform applies a strict hierarchy: audited \>
certificate \> unaudited \> management \> model. The compliance
certificate ranks above management accounts because it is certified by
directors as true, whereas management accounts are usually caveated. The
higher-ranked source replaces the lower-ranked one in canonical state.
The prior version is retained with full audit trail. If the audited
figures materially differ from the certificate figures, a reconciliation
exception is raised. Note: reconciling between audited accounts and
compliance certificates is often impractical due to pro-forma
adjustments, reclassifications, and different definitional bases — this
reconciliation is outside scope for the initial platform.

**Borrower-reported vs platform-computed ratios:** The compliance
certificate contains the borrower's own calculation of covenant ratios.
The platform independently recomputes these ratios from the extracted
component data using the deal's configured ratio definitions (Part F,
Section 2A.6). Both are stored. If they diverge beyond a configurable
tolerance (default: 2%), the system raises a
RatioReconciliationException for HAM review.

### G.2.2 Covenant Analytical Model

Each covenant is configured with its full analytical profile. This
extends the covenant_thresholds structure in Part F (Section 6.3):

> {
>
> "covenant_id": "COV-001",
>
> "investment_id": "INV-abc123",
>
> "covenant_name": "Senior Debt Service Cover Ratio",
>
> "covenant_category": "cash_flow_cover",
>
> "ratio_name": "senior_quarterly_dscr",
>
> "composition_tag": "cfads_over_interest_plus_principal",
>
> "numerator_definition": "DEF-020 (CFADS)",
>
> "denominator_definition": "DEF-021 (Debt Service = Interest +
> Scheduled Principal)",
>
> "test_frequency": "semi_annual",
>
> "direction": "minimum",
>
> "enforcement_class_id": "CLASS-senior",
>
> "thresholds": \[
>
> {
>
> "tier": "distribution_lockup",
>
> "level": 1.35,
>
> "consequence": "No Permitted Payments within 90 days of Calculation
> Date",
>
> "consecutive_escalation": {
>
> "periods": 3,
>
> "escalation": "Excess Cashflow Sweep triggered"
>
> }
>
> },
>
> {
>
> "tier": "trigger_event",
>
> "level": 1.25,
>
> "consequence": "Remedial Plan consultation required",
>
> "duration_escalation": {
>
> "months": 12,
>
> "escalation": "Independent expert if still breached"
>
> }
>
> },
>
> {
>
> "tier": "event_of_default",
>
> "level": 1.10,
>
> "consequence": "Hard default — acceleration rights",
>
> "equity_cure": {
>
> "available": true,
>
> "cure_period_days": 30,
>
> "max_cures_per_year": 1,
>
> "max_cures_total": 3,
>
> "cure_mechanism": "parent_injection"
>
> }
>
> }
>
> \],
>
> "step_down_schedule": null,
>
> "currency_specific_thresholds": null,
>
> "rating_trigger": null
>
> }

**Rating-based triggers:** For externally rated transactions, a rating
downgrade below a configured threshold can itself constitute a lock-up
event or trigger event. This is modelled as a covenant with
covenant_category: "rating" and thresholds expressed as rating notches
rather than numeric ratios. The system evaluates rating triggers
whenever an ExternalRatingReceived event fires, comparing the new rating
against the configured threshold. Rating triggers may be relative (e.g.
"2+ notches below initial") or absolute (e.g. "below BBB-/Baa3"), and
may require one agency or all agencies to have downgraded.

**No-hard-covenant proxy (1.0x DSCR/ICR):** Some transactions —
particularly US private placements and certain covenant-lite structures
— do not have an explicit event of default covenant level for DSCR or
ICR. In these cases, the system records no_hard_covenant_dscr: true and
no_hard_covenant_icr: true on the TopSheet, and creates a proxy default
threshold of 1.00x. This represents the economic reality that if DSCR
falls below 1.0x, the borrower cannot service its debt from cashflow —
which is effectively a payment default even without a documentation
trigger. The proxy is flagged distinctly in the UI (labelled "Payment
Default Proxy — no documented covenant") so users understand it is a
system-generated threshold, not a contractual one. This ensures all
deals in the portfolio have a meaningful default threshold for
comparison and headroom analysis, even where the documentation is
covenant-lite.

**Composition tags** distinguish different ratio definitions that share
the same name. DSCR can mean CFADS / (Interest + Principal) or CFADS /
Interest Only. The composition_tag is displayed on the TopSheet and in
portfolio comparisons so users never unknowingly compare
differently-constructed ratios. Standard tags include: cfads_over_ds,
cfads_over_interest_only, ebitda_over_interest,
ebitda_minus_regdep_over_interest, ebitda_minus_2pct_rab_over_interest,
npv_cfads_over_debt.

### G.2.3 Distribution Condition Model

Distribution conditions are a compound test — distributions are
permitted only if ALL sub-conditions pass simultaneously. The model
stores:

> {
>
> "distribution_evaluation_id": "UUID",
>
> "investment_id": "INV-abc123",
>
> "evaluation_date": "2025-06-30",
>
> "period_id": "PER-h1-2025",
>
> "overall_status": "locked_up",
>
> "sub_conditions": \[
>
> {"condition": "No Default continuing", "status": "pass"},
>
> {"condition": "RCF fully repaid and undrawn", "status": "pass"},
>
> {"condition": "DSRA fully funded", "status": "pass"},
>
> {"condition": "DSCR \>= 1.35x", "status": "fail", "actual": 1.28,
> "threshold": 1.35},
>
> {"condition": "Net Debt/EBITDA \<= 8.50x", "status": "pass", "actual":
> 7.90, "threshold": 8.50}
>
> \],
>
> "consecutive_lockup_periods": 2,
>
> "excess_cashflow_sweep_triggered": false
>
> }

### G.2.4 Trigger Event Duration Model

Trigger events have time-based escalation. The model tracks:

| **Field**                | **Type**                                                             | **Purpose**                                                                                                       |
|--------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| trigger_event_id         | UUID                                                                 |                                                                                                                   |
| investment_id            | FK → Investment                                                      |                                                                                                                   |
| trigger_type             | String                                                               | Which trigger condition was breached                                                                              |
| trigger_start_date       | Date                                                                 | When the trigger first activated                                                                                  |
| trigger_duration_months  | Integer                                                              | Computed: months since trigger_start_date                                                                         |
| current_escalation_level | Enum: initial, enhanced_reporting, remedial_plan, independent_review | Determined by duration thresholds                                                                                 |
| escalation_thresholds    | JSONB                                                                | \[{months: 0, level: "initial"}, {months: 6, level: "enhanced_reporting"}, {months: 12, level: "remedial_plan"}\] |
| cure_date                | Date                                                                 | When the trigger was cured (null if still active)                                                                 |
| cure_method              | String                                                               | How it was cured                                                                                                  |

### G.2.5 Variance Model

| **Field**              | **Type**                                      | **Purpose**                                                                         |
|------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------|
| variance_id            | UUID                                          |                                                                                     |
| investment_id          | FK → Investment                               |                                                                                     |
| period_id              | FK → FinancialPeriod                          |                                                                                     |
| metric_name            | String                                        | e.g. revenue, ebitda, dscr, net_debt                                                |
| expected_value         | Decimal                                       | From IC memo baseline                                                               |
| reported_value         | Decimal                                       | From approved financial data                                                        |
| absolute_variance      | Decimal                                       | reported - expected                                                                 |
| percentage_variance    | Decimal                                       | (reported - expected) / expected                                                    |
| direction              | Enum: favourable, adverse, neutral            | Based on metric type (higher revenue = favourable; higher net_debt = adverse)       |
| materiality_level      | Enum: immaterial, notable, material, critical | Per configured thresholds                                                           |
| materiality_thresholds | JSONB                                         | {notable_pct: 5, material_pct: 10, critical_pct: 20} — configurable per deal/metric |

### G.2.6 Trend Detection Model

| **Field**          | **Type**                                                                           | **Purpose**                                  |
|--------------------|------------------------------------------------------------------------------------|----------------------------------------------|
| trend_id           | UUID                                                                               |                                              |
| investment_id      | FK → Investment                                                                    |                                              |
| metric_name        | String                                                                             |                                              |
| trend_type         | Enum: consecutive_deterioration, accelerating_deterioration, level_shift, recovery |                                              |
| periods_observed   | Integer                                                                            | Number of consecutive periods in this trend  |
| values             | JSONB                                                                              | \[{period, value, pct_change}\] — the series |
| trend_start_period | String                                                                             |                                              |
| severity           | Enum: watch, concern, alert                                                        | Determined by period count and magnitude     |
| acknowledged       | Boolean                                                                            | HAM has seen and acknowledged                |

### G.2.7 Covenant Categories and Test Types

Each covenant is classified on two axes: category (what is being
measured) and test type (what happens when it is breached). This
classification drives how the analytics engines process the covenant and
how the UI presents it.

**Covenant categories:**

| **Category**          | **What It Measures**                                                                                         | **Example Ratios**                                               | **Typical Direction**                      |
|-----------------------|--------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------|--------------------------------------------|
| cash_flow_cover       | Whether the business generates enough cash to service its debt                                               | DSCR, ICR, LLCR, PLCR, Solvency Ratio                            | Minimum (breach if below)                  |
| collateral_value      | Whether the asset backing the debt maintains sufficient value                                                | LTV, Net Debt/RAB, Net Debt/EBITDA, EV/EBITDA                    | Maximum (breach if above)                  |
| incurrence            | Tested only when the borrower wants to do something (incur new debt, make an acquisition, issue a guarantee) | Incurrence leverage, pro-forma DSCR                              | Maximum for leverage, minimum for coverage |
| distribution          | Tested before cash can leave the ring-fenced group                                                           | DSCR, leverage, reserve account status, no-default certification | Varies by sub-condition                    |
| information           | Whether the borrower has delivered required information on time                                              | N/A (binary: delivered or not)                                   | Binary (fulfilled or missed)               |
| financial_maintenance | Tested periodically regardless of borrower action — the "springing" covenants of leveraged finance           | Net Debt/EBITDA, FCCR                                            | Maximum for leverage, minimum for coverage |

**Test types:**

| **Test Type**          | **Consequence of Breach**                                                                              | **System Behaviour**                                                                                  |
|------------------------|--------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| hard_covenant          | Event of Default — acceleration rights for lenders                                                     | Highest severity. Immediate alert to HAM + PM. Grade 4 unless cured.                                  |
| distribution_condition | Cash trapped — no distributions to equity. Consecutive breach may trigger excess cashflow sweep.       | Lock-up status recorded. Consecutive counter incremented. Escalation if configured.                   |
| trigger_event          | Enhanced obligations — additional reporting, remedial plan, independent review. Time-based escalation. | Trigger event opened. Duration tracking activated. Escalation level computed.                         |
| remedial               | Consultation/remedial plan required but not yet default. Intermediate severity.                        | Remedial status recorded. Duration tracked. Next-level default threshold monitored.                   |
| soft_default           | Default but with specific cure mechanisms or limited consequences                                      | Default recorded but cure clock started. Equity cure mechanics tracked if available.                  |
| information_covenant   | Breach of reporting obligation. May be a Default or may have specific consequences.                    | Obligation engine tracks fulfilment. Exception created on miss. May feed into distribution condition. |

### G.2.8 Ratio Definitions with Composition Tags

Ratios that share the same name can have different compositions
depending on the deal documentation. The platform uses composition tags
to distinguish them, ensuring that portfolio analytics never compare
differently-constructed ratios without flagging the difference.

**Debt Service Cover Ratio (DSCR)**

| **Composition Tag**                | **Numerator**                                               | **Denominator**                                  | **Typical Deal Types**              |
|------------------------------------|-------------------------------------------------------------|--------------------------------------------------|-------------------------------------|
| cfads_over_ds                      | Cash Flow Available for Debt Service (DEF-020)              | Interest + Scheduled Principal (DEF-021)         | Project finance, infrastructure     |
| cfads_over_interest_only           | CFADS (DEF-020)                                             | Interest charges only (DEF-022)                  | Some PFI/concession structures      |
| ebitda_over_ds                     | EBITDA (DEF-003)                                            | Interest + Principal                             | Some corporate/leveraged structures |
| available_cf_over_interest_service | Available Cash Flow (per specific documentation definition) | Interest Service Obligations (per documentation) | Airport acquisition finance         |

**Interest Cover Ratio (ICR)**

| **Composition Tag**                 | **Numerator**                        | **Denominator**               | **Typical Deal Types**            |
|-------------------------------------|--------------------------------------|-------------------------------|-----------------------------------|
| ebitda_over_interest                | EBITDA (DEF-003)                     | Net Finance Charges (DEF-005) | Corporate, leveraged finance      |
| ebitda_minus_regdep_over_interest   | EBITDA minus Regulatory Depreciation | Class-specific interest       | WBS/regulated (e.g. Gold airport) |
| ebitda_minus_2pct_rab_over_interest | EBITDA minus 2% of RAB               | Class-specific interest       | WBS alternative measure           |
| ebitda_minus_capex_over_interest    | EBITDA minus maintenance capex       | Interest                      | Infrastructure with high capex    |

**Loan Life Cover Ratio (LLCR)**

| **Composition Tag**               | **Numerator**                                         | **Denominator**         | **Typical Deal Types**                                                |
|-----------------------------------|-------------------------------------------------------|-------------------------|-----------------------------------------------------------------------|
| npv_cfads_over_debt               | NPV of CFADS from calculation date to final repayment | Outstanding senior debt | Project finance                                                       |
| npv_cfads_to_concession_over_debt | NPV of CFADS to concession expiry                     | Outstanding senior debt | Concession-based (shorter than debt life if concession expires first) |

**Leverage Ratios**

| **Composition Tag**          | **Numerator**                        | **Denominator**                | **Typical Deal Types**           |
|------------------------------|--------------------------------------|--------------------------------|----------------------------------|
| net_debt_over_ebitda         | Net Debt (DEF-012)                   | EBITDA (DEF-003)               | Corporate, leveraged             |
| senior_net_debt_over_ebitda  | Senior Net Debt only                 | EBITDA                         | Leveraged with multiple tranches |
| net_debt_over_rab            | Net Debt                             | Regulated Asset Base (DEF-018) | WBS/regulated                    |
| class_a_debt_over_rab        | Class A Net Debt                     | RAB                            | WBS with class structure         |
| total_debt_incl_shl_over_rab | All debt including shareholder loans | RAB                            | Group-level WBS leverage         |

**Solvency Ratios (WBS/Regulated)**

| **Composition Tag**   | **Numerator**             | **Denominator**                  | **Typical Deal Types** |
|-----------------------|---------------------------|----------------------------------|------------------------|
| cfads_1yr_over_ds_1yr | CFADS over next 12 months | Debt service over next 12 months | WBS — 1-year solvency  |
| cfads_3yr_over_ds_3yr | CFADS over next 36 months | Debt service over next 36 months | WBS — 3-year solvency  |

**Other Ratios**

| **Ratio**                 | **Composition Tag**                    | **Formula**                                      | **Typical Deal Types** |
|---------------------------|----------------------------------------|--------------------------------------------------|------------------------|
| LTV                       | debt_over_npv_cfads                    | Debt / NPV(CFADS)                                | Project finance        |
| PMICR                     | ebitda_minus_maintenance_over_interest | (EBITDA - Maintenance Capex) / Interest          | WBS                    |
| ACR (Asset Cover Ratio)   | senior_debt_over_rab                   | Senior Debt / RAB                                | WBS/regulated          |
| FCCR (Fixed Charge Cover) | ebitda_over_fixed_charges              | EBITDA / (Interest + Rent + Scheduled Principal) | Corporate/leveraged    |

**Portfolio comparison rule:** When the portfolio aggregation engine
computes cross-deal statistics (e.g. "average DSCR across infrastructure
portfolio"), it groups only by matching composition tags. If the
portfolio contains deals with cfads_over_ds and
cfads_over_interest_only, these are reported separately with a note
explaining the difference. The dashboard shows composition tags
alongside ratio values.

### G.2.9 Source Hierarchy and Reconciliation

Multiple documents may provide financial data for the same investment
and period. The platform applies a strict source hierarchy to determine
which takes precedence:

| **Rank**    | **Source Type**              | **\`source_hierarchy\` enum** | **Notes**                                                  |
|-------------|------------------------------|-------------------------------|------------------------------------------------------------|
| 1 (highest) | Audited annual accounts      | audited                       | Supersedes all other sources for the periods they cover    |
| 2           | Unaudited interim accounts   | unaudited                     | Supersedes management accounts and certificates            |
| 3           | Management accounts          | management                    | More detail than certificate, less assurance than accounts |
| 4           | Compliance certificate       | certificate                   | Often the first data received; may be superseded later     |
| 5 (lowest)  | Financial model / projection | model                         | Used as expected baseline; superseded by any actual data   |

**Supersession rules:**

When a higher-ranked source arrives for a period that already has
canonical data from a lower-ranked source:

> **1.** The existing FinancialPeriod record is versioned (prior version
> retained with superseded_by reference).
>
> **2.** New data extracted from the higher-ranked source creates a new
> FinancialPeriod version.
>
> **3.** All downstream analytics (covenant tests, variances, grades)
> are recomputed against the new data.
>
> **4.** A SourceSuperseded event is emitted.
>
> **5.** If the new data materially differs from the prior (any key
> metric changes by \>5%), a reconciliation alert is raised for the HAM.

**Borrower-reported vs platform-computed ratios:**

Compliance certificates contain the borrower's own calculation of
covenant ratios. The platform independently recomputes these from
extracted components using the deal's ratio aggregation rules (Part F,
Section 2A.6). Both values are stored:

| **Field**                   | **Purpose**                                                                               |
|-----------------------------|-------------------------------------------------------------------------------------------|
| borrower_reported_ratios    | What the borrower says the ratios are                                                     |
| platform_computed_ratios    | What the platform computes from extracted components                                      |
| ratio_reconciliation_status | matched (within tolerance), minor_variance (1-2%), material_variance (\>2%), unreconciled |
| ratio_reconciliation_detail | Per ratio: borrower value, platform value, variance, explanation if available             |

The tolerance is configurable per deal (default: 2%). Common causes of
variance include: different rounding conventions, different treatment of
hedge payments, different cash definitions, or genuine errors in the
borrower's calculation.

The platform's computed ratio is used for covenant testing (it is
independently verifiable). The borrower's reported ratio is retained for
reference and audit. If there is a material variance, the HAM reviews
both and determines the correct value for covenant purposes — this
becomes a Tier 3 decision.

### G.2.10 Evidence Chain Model

Every number on the dashboard traces through a chain:

> Dashboard Widget → TopSheet Field → CovenantTest/Variance/Assessment
> Record
>
> → FinancialPeriod Record → ProposedFact (extraction) → Document Record
>
> → Raw File (Bronze) at specific page/table/cell citation

The evidence chain is stored as linked records, not embedded data. Each
link is a foreign key with a citation object:

> {
>
> "source_document_id": "DOC-12345",
>
> "source_citation": {
>
> "page": 8,
>
> "table": 3,
>
> "cell": "C7",
>
> "text_snippet": "DSCR: 1.47x",
>
> "bounding_box": {"x1": 320, "y1": 445, "x2": 410, "y2": 460}
>
> },
>
> "extraction_confidence": 0.96,
>
> "extraction_model_version": "claude-sonnet-4-5-20250929",
>
> "extraction_timestamp": "2025-07-15T14:23:00Z",
>
> "approval_tier": "auto_approved",
>
> "approved_by": "system",
>
> "approved_at": "2025-07-15T14:23:05Z"
>
> }

The bounding box enables the UI to highlight the exact region in the
source document when the user clicks through.

## G.3 Analytics Engines — Deterministic Specifications

### G.3.1 Obligation Scheduling Engine

**(a) Purpose:** Track what the borrower owes us (information
deliverables, compliance certificates, financial statements) and whether
they've delivered it on time.

**(b) Inputs:** Obligation records (D.3) with frequency rules, grace
periods, and phase conditions. Fulfilment records linking received
documents to obligations. Current date.

**(c) Rules:**

> FOR each active Obligation where investment.current_phase matches
> obligation.applicable_phases:
>
> next_due = compute_next_due_date(obligation.frequency,
> obligation.anchor_date, last_fulfilment_date)
>
> grace_expiry = next_due + obligation.grace_period_days (business days)
>
> IF fulfilment exists for this period:
>
> status = "fulfilled"
>
> days_late = fulfilment.received_date - next_due (negative = early)
>
> ELSE IF current_date \> grace_expiry:
>
> status = "missed"
>
> ELSE IF current_date \> next_due:
>
> status = "overdue_within_grace"
>
> ELSE IF current_date \> next_due - 5 business days:
>
> status = "approaching"
>
> ELSE:
>
> status = "not_yet_due"

**(d) Outputs:** Updated Obligation status. Fulfilment record created
when document linked. Upcoming obligations list for calendar view.

**(e) Events:** ObligationDue (T-5), ObligationFulfilled,
ObligationMissed, ObligationCured.

**(f) Edge cases:** Obligations with linked deadlines (e.g. "within 15
days of receiving audited accounts"). Phase transitions (construction →
operational) that activate/deactivate obligations. Deals with
non-standard fiscal year ends. Grace periods that span year-end.

**(g) Acceptance tests:**

| **Test**          | **Input**                                                        | **Expected**                       |
|-------------------|------------------------------------------------------------------|------------------------------------|
| On-time delivery  | Due 30 June, received 28 June                                    | status = fulfilled, days_late = -2 |
| Late within grace | Due 30 June, grace 10 days, received 8 July, today 8 July        | status = fulfilled, days_late = 8  |
| Missed            | Due 30 June, grace 10 days, no fulfilment, today 15 July         | status = missed                    |
| Phase-dependent   | Obligation applies to "operational" only, deal in "construction" | Obligation not scheduled           |
| Linked deadline   | "Within 15 BD of audited accounts", accounts received 1 March    | Due date = 22 March                |

### G.3.2 Covenant Testing Engine

**(a) Purpose:** Compute covenant ratios from financial data, assess
against configured thresholds, determine tier status for each covenant
and overall deal.

**(b) Inputs:** Approved FinancialPeriod data (Gold layer). Covenant
configurations with thresholds, step-down schedules. Ratio aggregation
rules (Part F, Section 2A.6) defining which instruments contribute to
each ratio.

**(c) Rules:**

> FOR each covenant configured on this investment:
>
> 1\. COMPUTE ratio value from components:
>
> numerator = sum(components specified by
> ratio_aggregation_rules.numerator)
>
> denominator = sum(components specified by
> ratio_aggregation_rules.denominator)
>
> ratio_value = numerator / denominator
>
> 2\. DETERMINE applicable threshold:
>
> IF step_down_schedule exists:
>
> threshold = lookup(step_down_schedule, current_period)
>
> ELSE:
>
> threshold = covenant.thresholds\[tier\].level
>
> 3\. ASSESS tier status for each threshold tier:
>
> FOR tier in \[distribution_lockup, trigger_event, event_of_default\]
> (ordered most to least severe):
>
> IF covenant.direction == "minimum" AND ratio_value \< tier.level:
>
> tier_status = "breached"
>
> ELSE IF covenant.direction == "maximum" AND ratio_value \> tier.level:
>
> tier_status = "breached"
>
> ELSE:
>
> tier_status = "passing"
>
> headroom = \|ratio_value - tier.level\|
>
> headroom_pct = headroom / tier.level
>
> 4\. DETERMINE worst tier breached:
>
> overall_covenant_status = worst tier where tier_status == "breached"
>
> IF no tier breached: overall_covenant_status = "performing"
>
> 5\. STORE CovenantTest record with all components, ratio value,
>
> each tier's pass/fail, headroom, and overall status.
>
> 6\. COMPARE with borrower-reported ratio:
>
> IF \|platform_computed - borrower_reported\| \>
> reconciliation_tolerance:
>
> RAISE RatioReconciliationException

**(d) Outputs:** CovenantTest record per covenant per period. Updated
tier_assessment on TopSheet. Headroom values for each threshold.

**(e) Events:** CovenantTested, TierStatusChanged, HeadroomCritical
(when headroom \< 10% of threshold), RatioReconciliationException.

**(f) Edge cases:** Step-down schedule with interpolation between
periods. Covenants tested on different frequencies (quarterly DSCR vs
annual leverage). Forecast ratios (LLCR) that depend on model
projections rather than reported data. Currency-specific thresholds.
Equity cure mechanics (reduce severity for limited period after cure).

**(g) Acceptance tests:**

| **Test**           | **Input**                                                                 | **Expected**                                              |
|--------------------|---------------------------------------------------------------------------|-----------------------------------------------------------|
| Clean pass         | DSCR = 1.52x, lockup 1.35, trigger 1.25, default 1.10                     | performing, headroom to lockup = 0.17x (12.6%)            |
| Lockup breach only | DSCR = 1.30x                                                              | distribution_lockup breached, headroom to trigger = 0.05x |
| Trigger breach     | DSCR = 1.20x                                                              | trigger_event breached, headroom to default = 0.10x       |
| Default breach     | DSCR = 1.05x                                                              | event_of_default breached                                 |
| Step-down          | Leverage = 8.80x, schedule says max 9.00x for H1 2025                     | passing, headroom = 0.20x                                 |
| Step-down breach   | Leverage = 8.80x, schedule says max 8.50x for H2 2025                     | distribution_lockup breached                              |
| Reconciliation     | Platform computes 1.47x, borrower reports 1.52x (3.4% diff, tolerance 2%) | RatioReconciliationException raised                       |

### G.3.3 Consecutive-Period Escalation Engine

**(a) Purpose:** Track how many consecutive periods a covenant has been
in a particular tier status, and trigger escalation actions when
thresholds are reached.

**(b) Inputs:** CovenantTest results (current and historical).
Distribution condition evaluations. Escalation configuration per
covenant.

**(c) Rules:**

> FOR each covenant with consecutive_escalation configured:
>
> current_test = latest CovenantTest for this covenant
>
> IF current_test.tier_status == breached_tier:
>
> consecutive_count = count consecutive prior periods where same tier
> was breached
>
> consecutive_count += 1 (include current)
>
> IF consecutive_count \>= escalation.periods:
>
> TRIGGER escalation action (e.g. excess cashflow sweep)
>
> EMIT ConsecutiveEscalationTriggered event
>
> ELSE:
>
> consecutive_count = 0 (reset on cure)
>
> FOR each trigger_event with duration_escalation:
>
> IF trigger_event is active:
>
> duration_months = months_between(trigger_start_date, current_date)
>
> new_level = max(e.level for e in escalation_thresholds where e.months
> \<= duration_months)
>
> IF new_level != current_escalation_level:
>
> UPDATE escalation level
>
> EMIT TriggerEscalationLevelChanged event

**(d) Outputs:** Updated consecutive counters on distribution
evaluations. Updated escalation levels on trigger events. Escalation
action records.

**(e) Events:** ConsecutiveEscalationTriggered,
TriggerEscalationLevelChanged, TriggerEventCured.

**(f) Edge cases:** Covenant cure followed by immediate re-breach
(counter resets to 1, not continues). Trigger events that overlap with
defaults. Partial cure (one sub-condition cures but another fails).
Mid-period amendments that change thresholds.

**(g) Acceptance tests:**

| **Test**                 | **Input**                                                     | **Expected**                     |
|--------------------------|---------------------------------------------------------------|----------------------------------|
| First lockup             | DSCR below lockup for first time                              | consecutive = 1, no escalation   |
| Third consecutive lockup | DSCR below lockup for 3rd consecutive period, escalation at 3 | Excess cashflow sweep triggered  |
| Cure resets counter      | DSCR recovers above lockup                                    | consecutive = 0                  |
| Trigger duration         | Trigger active for 13 months, escalation at 12 months         | Level changes to "remedial_plan" |
| Trigger cure             | Ratio recovers above trigger level                            | Trigger cured, duration reset    |

### G.3.4 Variance Engine

**(a) Purpose:** Compare reported financial performance against the IC
memo baseline (expected performance) and classify variances by
materiality.

**(b) Inputs:** Approved FinancialPeriod with reported_metrics.
Expected_metrics from IC memo baseline stored at origination.
Materiality thresholds configured per deal or globally.

**(c) Rules:**

> FOR each metric in \[revenue, ebitda, cfads, dscr, leverage, net_debt,
> capex, ...\]:
>
> expected = expected_metrics\[metric\]
>
> reported = reported_metrics\[metric\]
>
> IF expected is null OR expected == 0:
>
> SKIP (no baseline for comparison)
>
> absolute_variance = reported - expected
>
> percentage_variance = absolute_variance / \|expected\|
>
> direction = CASE metric_type:
>
> revenue, ebitda, cfads, dscr, icr, llcr → higher is favourable
>
> net_debt, leverage, capex, costs → lower is favourable
>
> IF direction == favourable AND absolute_variance \> 0: direction =
> "favourable"
>
> ELSE IF direction == favourable AND absolute_variance \< 0: direction
> = "adverse"
>
> (inverse for "lower is better" metrics)
>
> materiality = CASE \|percentage_variance\|:
>
> \< notable_pct → "immaterial"
>
> \< material_pct → "notable"
>
> \< critical_pct → "material"
>
> \>= critical_pct → "critical"
>
> STORE Variance record.
>
> IF materiality IN ("material", "critical") AND direction == "adverse":
>
> EMIT ThresholdBreached event → generates alert

**(d) Outputs:** Variance records per metric per period. Material
adverse variance alerts.

**(e) Events:** VarianceCalculated, ThresholdBreached (for
material/critical adverse), BaselineUpdated (if IC memo baseline is
revised).

**(f) Edge cases:** No IC memo baseline available (new deal, or baseline
not yet entered — skip variance, flag for setup). Expected value of zero
(skip percentage calculation). Metrics where direction depends on
context (working capital: increase may be adverse for cash, favourable
for growth). Mid-period baseline changes (amendment, restructuring —
baseline should update with audit trail).

**(g) Acceptance tests:**

| **Test**           | **Input**                                                      | **Expected**                                        |
|--------------------|----------------------------------------------------------------|-----------------------------------------------------|
| Small favourable   | Revenue expected 100, reported 103 (3%), notable at 5%         | immaterial, favourable                              |
| Material adverse   | EBITDA expected 50, reported 42 (16% below), material at 10%   | material, adverse, alert                            |
| Critical adverse   | DSCR expected 1.50, reported 1.20 (20% below), critical at 20% | critical, adverse, alert                            |
| No baseline        | Expected is null                                               | No variance calculated, flagged as missing baseline |
| Leverage (inverse) | Leverage expected 5.0x, reported 5.8x (16% higher)             | material, adverse (higher leverage is worse)        |

### G.3.5 Trend Detection Engine

**(a) Purpose:** Identify persistent deterioration patterns across
consecutive periods, distinct from single-period variance.

**(b) Inputs:** Time series of reported metrics across periods (minimum
3 periods for trend detection). Trend configuration (which metrics to
monitor, sensitivity).

**(c) Rules:**

> FOR each monitored metric:
>
> series = last N periods of reported values (N = configurable, default
> 4)
>
> consecutive_deterioration_count = 0
>
> FOR i in 1..len(series)-1:
>
> change = series\[i\] - series\[i-1\]
>
> IF metric is "higher is better" AND change \< 0:
> consecutive_deterioration_count += 1
>
> ELSE IF metric is "lower is better" AND change \> 0:
> consecutive_deterioration_count += 1
>
> ELSE: BREAK (trend interrupted)
>
> IF consecutive_deterioration_count \>= 2:
>
> trend_type = "consecutive_deterioration"
>
> severity = CASE consecutive_deterioration_count:
>
> 2 → "watch"
>
> 3 → "concern"
>
> \>= 4 → "alert"
>
> magnitude = total % change from trend start to current
>
> IF magnitude \> 20%: upgrade severity by one level
>
> CREATE or UPDATE Trend record.
>
> IF severity \>= "concern": EMIT TrendDetected event

**(d) Outputs:** Trend records per metric. Trend indicators on TopSheet.

**(e) Events:** TrendDetected, TrendEscalated (severity upgrade),
TrendBroken (metric reverses).

**(f) Edge cases:** Seasonal patterns (e.g. airport revenue higher in
summer — use year-on-year not period-on-period). Metrics that only exist
for some periods (e.g. annual-only KPIs). Step changes due to known
events (acquisition, contract expiry) — should not trigger false trend
alerts.

**(g) Acceptance tests:**

| **Test**             | **Input**                                    | **Expected**                                     |
|----------------------|----------------------------------------------|--------------------------------------------------|
| Two-period decline   | DSCR: 1.50, 1.40, 1.35                       | consecutive_deterioration, severity = watch      |
| Three-period decline | DSCR: 1.50, 1.40, 1.35, 1.28                 | severity = concern, alert emitted                |
| Interrupted          | DSCR: 1.50, 1.40, 1.45, 1.38                 | No trend (recovery in period 3 breaks the chain) |
| Large magnitude      | Revenue: 100, 90, 78, 65 (35% total decline) | severity upgraded from concern to alert          |

### G.3.6 Grading Engine

**(a) Purpose:** Compute an overall deal performance grade from covenant
status, variance severity, trend indicators, and compliance status. The
grade is deterministic — a function of the inputs with no discretionary
component (though HAM can override with recorded rationale).

**(b) Inputs:** All CovenantTest results for the period. Variance
records. Trend records. Obligation compliance status. Current watchlist
status.

**(c) Rules:**

> grade_score = 0 (lower is worse)
>
> 1\. COVENANT STATUS (heaviest weight):
>
> worst_tier = worst tier status across all covenants
>
> CASE worst_tier:
>
> "performing" → grade_score += 40
>
> "distribution_lockup" → grade_score += 25
>
> "trigger_event" → grade_score += 10
>
> "event_of_default" → grade_score += 0
>
> 2\. VARIANCE SEVERITY:
>
> worst_variance = worst materiality across key metrics (DSCR, EBITDA,
> revenue)
>
> CASE worst_variance:
>
> "immaterial" or "notable" favourable → grade_score += 20
>
> "notable" adverse → grade_score += 15
>
> "material" adverse → grade_score += 5
>
> "critical" adverse → grade_score += 0
>
> 3\. TREND:
>
> worst_trend = worst trend severity across monitored metrics
>
> CASE worst_trend:
>
> no trend or improving → grade_score += 20
>
> "watch" → grade_score += 15
>
> "concern" → grade_score += 5
>
> "alert" → grade_score += 0
>
> 4\. COMPLIANCE:
>
> obligations_status = any missed obligations?
>
> CASE:
>
> all fulfilled on time → grade_score += 20
>
> some late but within grace → grade_score += 15
>
> any missed (beyond grace) → grade_score += 5
>
> multiple missed → grade_score += 0
>
> 5\. MAP score to grade:
>
> grade = CASE grade_score:
>
> \>= 80 → 1 (Performing)
>
> \>= 55 → 2 (Performing with observations)
>
> \>= 30 → 3 (Underperforming)
>
> \< 30 → 4 (Distressed / Impaired)
>
> 6\. HAM APPROVAL:
>
> IF grade != prior_grade:
>
> proposed_grade = grade
>
> grade_status = "pending_ham_approval"
>
> → Queue for HAM review with component breakdown
>
> → HAM approves, adjusts, or overrides with rationale
>
> → On approval → commit grade
>
> 7\. OVERRIDE CHECK:
>
> IF ham_override exists AND ham_override.expiry \> current_date:
>
> grade = ham_override.grade
>
> flag grade as "overridden" with rationale

**(d) Outputs:** Assessment record (D.3) with grade, prior_grade,
rationale, component scores. TopSheet updated.

**(e) Events:** GradeAssigned, GradeChanged (with direction),
GradeDowngrade (triggers escalation to PM).

**(f) Edge cases:** New deals with insufficient data (minimum 1 period
required; before that, grade = "not yet assessed"). Deals in
construction phase (obligation compliance only, no financial covenants
yet). HAM overrides that expire. Disagreement between HAM override and
system grade — logged but HAM decision stands.

**(g) Acceptance tests:**

| **Test**                  | **Input**                                                             | **Expected**                    |
|---------------------------|-----------------------------------------------------------------------|---------------------------------|
| Clean deal                | All covenants passing, immaterial variance, no trend, all delivered   | Grade 1 (score ~100)            |
| Lockup + adverse variance | Lockup breached, material adverse variance, no trend, all delivered   | Grade 3 (score ~50)             |
| Default                   | Event of default, critical variance, alert trend, missed deliverables | Grade 4 (score ~0-10)           |
| Override                  | System says Grade 3, HAM overrides to Grade 2 with rationale          | Grade 2 (flagged as overridden) |

### G.3.7 Portfolio Aggregation Engine

**(a) Purpose:** Aggregate deal-level analytics into portfolio views,
respecting the client/account hierarchy (D.10) and entitlements.

**(b) Inputs:** All TopSheet snapshots within the portfolio scope.
Holding → Account → Organisation → PlatformClient hierarchy. Portfolio
filter parameters.

**(c) Rules:**

> FOR the requested portfolio scope (account_id, organisation_id, or
> client_id):
>
> holdings = query Holdings where scope matches
>
> investments = distinct Investment records from holdings
>
> topsheets = latest TopSheetSnapshot for each investment
>
> AGGREGATE:
>
> total_commitment = SUM(holding.current_amount)
>
> grade_distribution = GROUP BY topsheet.grade → {grade: count, grade:
> total_exposure}
>
> covenant_status_distribution = GROUP BY worst_tier_status:
>
> {performing: count/exposure, lockup: count/exposure, trigger:
> count/exposure, default: count/exposure}
>
> sector_exposure = GROUP BY investment.sector_label → {sector:
> total_exposure, pct}
>
> revenue_risk_distribution = GROUP BY revenue_risk_composite:
>
> {P1-V1-D1: exposure, P5-V5-D5: exposure, ...}
>
> headroom_distribution = FOR each investment, compute
> min_headroom_to_worst_tier
>
> → histogram of headroom values
>
> overdue_obligations = COUNT WHERE obligation.status IN
> ("overdue_within_grace", "missed")
>
> watchlist_count = COUNT WHERE internal rating status IN ("enhanced",
> "watchlist")
>
> maturity_profile = GROUP BY maturity_year → {year: exposure,
> amortising_exposure}
>
> contract_expiry_concentration = GROUP BY primary_contract_expiry_year
> → {year: exposure}
>
> STORE PortfolioAggregation snapshot with timestamp.

**(d) Outputs:** PortfolioAggregation record. Dashboard data for all
portfolio views.

**(e) Events:** PortfolioAggregated.

**(f) Edge cases:** Single investment appearing in multiple accounts at
different sizes (avoid double-counting at portfolio level — aggregate by
holding amount, not deal size). Investments with no current TopSheet
(new deals not yet assessed). Currency conversion for cross-currency
portfolios.

### G.3.8 Alerting Engine

**(a) Purpose:** Deliver timely notifications to the right people when
deterministic triggers fire.

**(b) Inputs:** Events emitted by all other engines. Alert subscription
configuration per user/role. Throttling and deduplication rules.

**(c) Rules:**

| **Trigger Event**                             | **Alert Recipient** | **Channel**    | **Priority** | **Throttle**                    |
|-----------------------------------------------|---------------------|----------------|--------------|---------------------------------|
| ObligationDue (T-5)                           | HAM                 | In-app         | Normal       | 1 per obligation per cycle      |
| ObligationMissed                              | HAM + PM            | In-app + email | High         | Immediate                       |
| TierStatusChanged (adverse)                   | HAM + PM            | In-app + email | High         | Immediate                       |
| TierStatusChanged (favourable)                | HAM                 | In-app         | Normal       | Daily digest                    |
| HeadroomCritical                              | HAM                 | In-app         | High         | 1 per covenant per period       |
| ThresholdBreached (material adverse variance) | HAM                 | In-app         | Normal       | 1 per metric per period         |
| TrendDetected (concern or alert)              | HAM + PM            | In-app         | Normal       | 1 per metric until acknowledged |
| GradeDowngrade                                | HAM + PM            | In-app + email | High         | Immediate                       |
| ConsecutiveEscalationTriggered                | HAM + PM            | In-app + email | Critical     | Immediate                       |
| ConsentDeadlineApproaching (T-5)              | HAM                 | In-app + email | High         | Daily until resolved            |
| RatioReconciliationException                  | HAM                 | In-app         | Normal       | 1 per period                    |
| ExtractionFailed                              | HAM                 | In-app         | Normal       | 1 per document                  |

**Deduplication:** Same event type for same investment within 24 hours →
consolidate into single alert with count.

**Escalation ladder:** If HAM has not acknowledged a High-priority alert
within 48 hours → escalate to PM. If PM has not acknowledged within 72
hours → escalate to admin.

**Digest mode:** Normal-priority alerts are batched into a daily summary
email (configurable: daily or weekly).

**(d) Outputs:** Alert records with status (pending, acknowledged,
resolved). Email notifications. In-app notification badge counts.

**(e) Events:** AlertCreated, AlertAcknowledged, AlertEscalated,
AlertResolved.

## G.4 Excel-Driven Rule Authoring

### The Problem

Business owners (credit analysts, portfolio managers) define analytical
rules — covenant thresholds, materiality percentages, step-down
schedules, trend sensitivity — and they think in Excel. The platform
must accept Excel as the authoring tool for these rules, but Excel must
never become a runtime dependency.

### The Contract Between Excel and Code

Rules are authored in Excel workbooks with a standardised template
structure, then exported to JSON configuration that the platform
consumes.

**Excel template structure:**

| **Sheet Name**         | **Purpose**                                                  | **Exported As**                              |
|------------------------|--------------------------------------------------------------|----------------------------------------------|
| Covenant_Thresholds    | Per-deal covenant definitions with tiers, levels, step-downs | Array of covenant configuration JSON objects |
| Materiality_Thresholds | Per-deal or global variance materiality percentages          | Materiality configuration JSON               |
| Trend_Rules            | Consecutive period counts and magnitude thresholds           | Trend configuration JSON                     |
| Grading_Weights        | Component weights for grade calculation                      | Grading configuration JSON                   |
| Alert_Subscriptions    | Who gets what alerts at what priority                        | Alert routing configuration                  |
| Test_Cases             | Expected outputs for given inputs — becomes acceptance tests | Array of {input, expected_output} pairs      |

**Export process:** A configuration management tool reads the Excel
workbook, validates the structure (required columns present, types
correct, enums match controlled lists), and produces a versioned JSON
configuration file. This file is committed to the platform's
configuration store with an audit record (who uploaded, when, which
deal, previous version retained).

**Validation strategy:** The Test_Cases sheet in the Excel workbook
becomes automated unit tests. Each row specifies input values and
expected outputs. The export process generates test fixtures that are
run against the analytics engines. If any test fails, the configuration
is rejected with a clear error message.

**Example: Covenant_Thresholds sheet:**

| **deal_id** | **covenant_name** | **ratio**       | **direction** | **lockup_level** | **trigger_level** | **default_level** | **cure_available** | **cure_days** | **step_down_2025H1** | **step_down_2025H2** | **step_down_2026H1** |
|-------------|-------------------|-----------------|---------------|------------------|-------------------|-------------------|--------------------|---------------|----------------------|----------------------|----------------------|
| INV-001     | Senior DSCR       | dscr            | min           | 1.35             | 1.25              | 1.10              | Y                  | 30            |                      |                      |                      |
| INV-001     | Leverage          | net_debt_ebitda | max           | 8.50             |                   | 10.00             | N                  |               | 9.50                 | 9.00                 | 8.50                 |

**Exported JSON:**

> \[
>
> {
>
> "investment_id": "INV-001",
>
> "covenant_name": "Senior DSCR",
>
> "ratio_name": "dscr",
>
> "direction": "minimum",
>
> "thresholds": \[
>
> {"tier": "distribution_lockup", "level": 1.35},
>
> {"tier": "trigger_event", "level": 1.25},
>
> {"tier": "event_of_default", "level": 1.10, "equity_cure":
> {"available": true, "cure_period_days": 30}}
>
> \]
>
> }
>
> \]

### Runtime Independence

Excel is never read at runtime. The analytics engines consume only the
exported JSON configuration. This means:

> • Engines are testable without Excel
>
> • Configuration is version-controlled in the platform's config store
>
> • Rollback is trivial (revert to previous JSON version)
>
> • Business owners can use Excel for prototyping, but the platform is
> not coupled to it

# PART H: WEB UI, AI QUERY INTERFACE & IMPLEMENTATION

## H.1 UI/UX Specification

### Design Principles

Every screen in the platform enforces the governing axioms:

> • **Evidence-first:** Every number is clickable. Clicking a metric
> opens the canonical record, which links to the source document
> location (page, table, cell). The user should never need to ask "where
> does this number come from?"
>
> • **Deterministic transparency:** Covenant status, grades, and
> compliance are computed by rules engines with visible logic. The UI
> shows the rule that produced the result, not just the result.
>
> • **Permission-aware:** Every query is filtered by the user's
> entitlements. A pension fund client sees only their holdings. An asset
> manager sees all mandates they manage. Row-level security is
> structural, not cosmetic.
>
> • **Time-travel capable:** Every screen supports an "as at date"
> selector. The system retrieves the most recent TopSheet snapshot
> before that date and renders accordingly.

### H.1.1 Portfolio Dashboard

**Purpose:** The landing page. Answers "what needs attention across my
portfolio right now?"

**Primary user:** PM, Client Viewer

**Core widgets:**

| **Widget**                  | **Content**                                                                                                              | **Interaction**                                     |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|
| **Portfolio KPI bar**       | Total AUM, number of deals, weighted average DSCR, weighted average headroom, overdue obligations count, watchlist count | Each KPI clickable → drills to relevant detail view |
| **Grade distribution**      | Bar/donut chart: count and exposure by Grade 1/2/3/4                                                                     | Click segment → filtered deal list                  |
| **Covenant status heatmap** | Matrix: rows = deals, columns = covenants, cells coloured by tier status (green/amber/red/black)                         | Click cell → covenant detail for that deal          |
| **Headroom distribution**   | Histogram: headroom to nearest adverse threshold, bucketed (\>20%, 10-20%, 5-10%, \<5%)                                  | Click bucket → deal list                            |
| **Overdue obligations**     | Table: deal name, obligation type, due date, days overdue, assigned HAM                                                  | Click row → obligation detail                       |
| **Revenue risk profile**    | Stacked bar: portfolio exposure by P/V/D classification                                                                  | Click segment → filtered deal list                  |
| **Recent alerts**           | Feed: last 20 alerts across the portfolio, with priority badges                                                          | Click alert → source deal/event                     |
| **Maturity profile**        | Bar chart: debt maturities by year, stacked by deal                                                                      | Click bar → deal list for that year                 |

**Filters:** Sector, geography, deal type, structure type, Grade,
watchlist status, HAM assignment, account/mandate, revenue risk
classification.

**Drill-down paths:** Any widget → filtered deal list → individual deal
TopSheet.

**Evidence links:** KPI values show tooltip with "as at \[snapshot
date\], computed from \[N\] deals".

**State & loading:** Dashboard loads in \<2 seconds for portfolios up to
200 deals. Aggregations are pre-computed (G.3.7) and cached; widgets
load progressively. Stale indicator if cache is \>1 hour old.

**Permission rules:** PM sees all deals they oversee. Client Viewer sees
only their Organisation's holdings. Portfolio filter respects the
Account → Organisation → PlatformClient chain (D.10).

**Empty states:** "No deals in this portfolio" with link to deal setup.
"No alerts" with reassuring message.

**Key actions:** Export dashboard to PDF. Subscribe to weekly email
digest. Toggle between current and "as at" date.

### H.1.2 Deal TopSheet Screen

**Purpose:** The single-deal view. Everything the HAM needs to know
about one investment on one page.

**Primary user:** HAM, PM, Credit Analyst

**Core widgets:**

| **Widget**                    | **Content**                                                                                                                            |
|-------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| **Deal header**               | Investment name, borrower, sector, deal type, revenue risk classification (P/V/D code), Grade badge, watchlist status, assigned HAM/PM |
| **Covenant summary table**    | All covenants: name, latest value, threshold, headroom, tier status, trend arrow, composition tag                                      |
| **Financial snapshot**        | Key metrics for latest period: revenue, EBITDA, CFADS, net debt, with variance indicators (green/red arrows vs expected)               |
| **Period-over-period chart**  | Line chart: selected ratio over time (actual vs expected), with threshold lines overlaid                                               |
| **Distribution status**       | Lock-up status badge (permitted/locked), sub-condition checklist, consecutive lockup counter                                           |
| **Obligation timeline**       | Horizontal timeline: next 12 months of expected deliverables, coloured by status (fulfilled/due/overdue/missed)                        |
| **Top risks**                 | From risk register (Part E): top 3 risks by score, with trend arrows                                                                   |
| **Revenue risk card**         | Classification code, revenue decomposition by stream, contract coverage %, WACL                                                        |
| **Capital structure summary** | Simplified waterfall view: instrument stack with amounts and our position highlighted                                                  |
| **Narrative notes**           | Borrower commentary and HAM/PM notes for the latest period, attached to specific data points                                           |
| **Recent events**             | Last 10 events for this deal from the event log                                                                                        |

**"As at" selector:** Date picker in header. When changed, all widgets
reload from the TopSheet snapshot closest to that date. Visual
indicator: "Showing data as at \[date\] — \[N\] days ago".

**Filters:** Period selector (for financial detail). Case type (actual,
management, lender_base). Covenant selector (for period-over-period
chart).

**Drill-down paths:** Covenant row → G.1.3 Covenant Detail. Financial
metric → G.1.4 Period View. Obligation → obligation detail. Risk → risk
register entry. Event → full event record with linked documents.

**Evidence links:** Every numeric value shows: (i) source document name,
(ii) page/table/cell reference, (iii) extraction confidence, (iv)
approval tier and approver. Click opens the source document at the
relevant location.

**Permission rules:** Accessible to anyone with a Holding in this
investment. Financial data is shared (investment-level). Holding amounts
are filtered to the viewer's accounts only.

**Key actions:** Override Grade (with rationale — Tier 3). Add HAM
commentary. Flag for watchlist. Export TopSheet as PDF. Navigate to
prior/next period.

### H.1.3 Covenant Detail Screen

**Purpose:** Deep dive into a single covenant: history, components,
headroom, borrower notes.

**Primary user:** HAM, Credit Analyst

**Core widgets:**

| **Widget**               | **Content**                                                                                                                                               |
|--------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Covenant header**      | Name, category, ratio definition, composition tag, test frequency, enforcement class                                                                      |
| **Threshold ladder**     | Visual: vertical number line with threshold levels marked (lockup/trigger/default), current value positioned on the line with headroom distances labelled |
| **History table**        | All test periods: date, ratio value, each tier pass/fail, headroom, step-down level (if applicable), borrower-reported vs platform-computed               |
| **Component breakdown**  | For the selected period: numerator components, denominator components, each with source citation                                                          |
| **Headroom time series** | Chart: headroom to nearest adverse threshold over time                                                                                                    |
| **Step-down schedule**   | If applicable: table of future threshold levels by period                                                                                                 |
| **Borrower notes**       | Narrative notes from compliance certificates relevant to this covenant                                                                                    |
| **Consecutive counter**  | If in breach: number of consecutive periods, escalation status, next escalation threshold                                                                 |

**Evidence links:** Each component value → source document citation.
Each test result → CovenantTest record → source FinancialPeriod → source
Document.

### H.1.4 Financials / Period View

**Purpose:** Detailed view of a single reporting period's financial data
with variance bridge and audit trail.

**Primary user:** HAM, Credit Analyst

**Core widgets:**

| **Widget**                | **Content**                                                                                             |
|---------------------------|---------------------------------------------------------------------------------------------------------|
| **Period header**         | Period label, dates, source document, extraction confidence, approval tier, approver                    |
| **P&L summary**           | Revenue through EBITDA with line items, each with expected/reported/variance columns                    |
| **Variance bridge**       | Waterfall chart: starting from expected, showing each variance driver, arriving at reported             |
| **Balance sheet summary** | Key balance sheet items with period-on-period change                                                    |
| **Cashflow summary**      | CFADS derivation from EBITDA through to free cash flow                                                  |
| **Ratio computation**     | Each ratio: components → formula → result, side-by-side with borrower's reported value                  |
| **Source data panel**     | Side panel: the actual source document rendered with extracted values highlighted                       |
| **Narrative notes**       | All notes for this period, organised by data point                                                      |
| **Audit trail**           | Full history: when received, when classified, when extracted, confidence, who approved, any adjustments |

**Evidence links:** Click any extracted value → source document opens at
the specific page/table/cell.

### H.1.5 Obligations Calendar

**Purpose:** Calendar and list view of all deliverables due, received,
overdue, and missed across the portfolio.

**Primary user:** HAM

**Core widgets:**

| **Widget**              | **Content**                                                                                                                                                       |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Calendar view**       | Month view with obligations as coloured dots (green=fulfilled, yellow=approaching, red=overdue, black=missed)                                                     |
| **SLA queue**           | Table: overdue and approaching obligations sorted by urgency. Columns: deal, obligation type, due date, days remaining/overdue, grace period status, assigned HAM |
| **Fulfilment rate KPI** | Percentage of obligations fulfilled on time over trailing 12 months, by deal and portfolio                                                                        |
| **Deal filter**         | Filter to single deal or across portfolio                                                                                                                         |

**Key actions:** Mark as fulfilled (link document). Chase borrower
(generate email template). Snooze with rationale.

### H.1.6 Review Queue (Tier 2 Approvals)

**Purpose:** The HAM's primary workflow screen for reviewing
AI-extracted data before it is committed to canonical state.

**Primary user:** HAM

**Core widgets:**

| **Widget**                | **Content**                                                                                                                                               |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Queue list**            | All pending Tier 2 proposals: deal name, document type, period, extraction date, confidence score, number of flagged items. Sorted by age (oldest first). |
| **Split-pane review**     | Left: source document rendered with extracted values highlighted in-situ. Right: proposed values in a structured form with editable fields.               |
| **Confidence indicators** | Per-field confidence score. Fields below threshold highlighted amber. Fields with reasonableness warnings highlighted red.                                |
| **Comparison panel**      | Prior period values alongside proposed values for sanity check. Variance automatically computed.                                                          |
| **Flagged items**         | List of agent-flagged observations (e.g. "revenue recognition policy change noted on page 14").                                                           |
| **Narrative notes**       | Extracted borrower narrative shown alongside the data points they relate to.                                                                              |

**Key actions:** Approve all. Approve with adjustments (edit individual
fields, record reason). Reject (with reason — returns to re-extraction
or manual entry). Defer (assign to another HAM or escalate).

**Evidence links:** Every proposed value shows source citation. Click
opens document at that location.

**Permission rules:** Only the assigned HAM (or a PM with oversight) can
approve. Admin can reassign.

### H.1.7 Exceptions & Cases

**Purpose:** Track and resolve open issues — missed deliverables,
reconciliation exceptions, covenant breaches requiring action.

**Primary user:** HAM, PM

**Core widgets:** Queue of open exceptions with: type, severity, deal,
description, assigned to, age, SLA status. Detail view with: history of
actions, linked documents, resolution record.

**Key actions:** Assign. Add comment. Resolve (with resolution record).
Escalate. Link related documents.

### H.1.8 Risk Register & Risk Trends

**Purpose:** Portfolio-level view of the risk register (Part E) with
heatmaps and concentration analysis.

**Primary user:** PM, Credit Analyst

**Core widgets:**

| **Widget**                | **Content**                                                                                                                         |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| **Risk heatmap**          | Matrix: rows = risk categories, columns = severity (low/moderate/high/critical), cells = count of deals. Colour intensity by count. |
| **Risk concentration**    | Table: risks that appear as High or Critical across 3+ deals — systemic risk indicators                                             |
| **Revenue risk profile**  | Portfolio exposure by P/V/D classification with trend over time                                                                     |
| **Trend overlay**         | Risk scores over time for the portfolio — are risks collectively improving or deteriorating?                                        |
| **Deal-level risk table** | Per-deal: top risk, risk count by severity, trend indicator                                                                         |

**Drill-down:** Click risk category → list of deals with that risk at
that severity. Click deal → deal TopSheet risk tab.

### H.1.9 Alerts Centre

**Purpose:** Central location for managing notifications, subscriptions,
and alert history.

**Primary user:** HAM, PM

**Core widgets:** Alert feed (filterable by priority, type, deal, date).
Subscription management (which alert types, which deals/portfolios,
which channels). Acknowledgement controls. Escalation history.

### H.1.10 Consent/Waiver Tracker

**Purpose:** Track consent requests from borrowers through to
resolution, with deadline management and snooze-you-lose protection.

**Primary user:** HAM

**Core widgets:**

| **Widget**                    | **Content**                                                                                                                          |
|-------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| **Active requests**           | Table: deal, request type, description, response deadline, days remaining, status                                                    |
| **Deadline countdown**        | Visual: traffic light for each active request (green \>5 days, amber 2-5, red \<2)                                                   |
| **Snooze-you-lose indicator** | If the deal has a snooze mechanism: flag that non-response defaults to consent/rejection. Protective "no" vote auto-prepared at T-1. |
| **Voting record**             | For syndicated deals: our vote, required threshold, current vote tally                                                               |
| **History**                   | Prior consents/waivers with outcomes and any deal amendments that resulted                                                           |

**Key actions:** Record vote (consent/reject/abstain with rationale).
Request extension. Escalate to PM. Link supporting analysis.

### H.1.1a Portfolio Dashboard — Full Specification

**State & loading:** Dashboard loads in \<2 seconds for portfolios up to
200 deals. Portfolio aggregations are pre-computed by the aggregation
engine (G.3.7) and cached in Redis. Widgets load progressively — KPI bar
first (instant from cache), then charts (parallel async), then tables
(paginated). A stale indicator appears if the cache is \>1 hour old,
with a "refresh now" button.

**Permission rules:** PM sees all deals across HAMs they oversee. HAM
sees only their assigned deals. Client Viewer sees only their
Organisation's holdings per D.10. Admin sees all. Portfolio filter
dropdown only shows portfolios the user has access to.

**Empty states:** "No deals in this portfolio yet" with a link to deal
setup workflow. "No alerts — your portfolio is clean" with reassuring
green checkmark. "No overdue obligations" with next-due countdown.

**Error states:** "Unable to load portfolio data — retrying" with
automatic retry (3 attempts, exponential backoff). If aggregation is
stale beyond 4 hours: "Dashboard data may be outdated — last computed
\[timestamp\]" with manual refresh option.

### H.1.2a Deal TopSheet Screen — Full Specification

**State & loading:** TopSheet loads in \<1 second from the cached
snapshot. "As at" date selector triggers snapshot lookup — the system
retrieves the most recent TopSheetSnapshot before the selected date
(D.3) and renders all widgets from that snapshot's data. Visual
indicator: "Showing data as at \[date\]" in a banner when not viewing
current data. "Live data" badge when viewing current.

**Permission rules:** Accessible to any user with a Holding in this
investment (via their Account → Organisation → PlatformClient chain per
D.10). Investment-level data (financials, covenants, risk register) is
visible to all holders. Holding-level data (commitment size, acquisition
price) is filtered to the viewer's own accounts. Other holders'
commitment sizes are not visible.

**Empty states:** New deal not yet assessed: "Awaiting first compliance
data — no financial periods recorded yet. Obligation schedule is
active." Display only the obligation timeline and deal static data. Deal
with no covenants configured: "No covenant thresholds configured —
contact admin to set up covenant testing."

**Error states:** Snapshot not found for "as at" date: "No data
available before \[date\] — this deal was onboarded on \[date\]." Source
document unavailable: "Source document not accessible — the file may
have been moved. Contact admin."

### H.1.6a Review Queue — Full Specification

**State & loading:** Queue loads in \<1 second. Split-pane view loads
source document via PDF.js (browser-side rendering). Large PDFs (\>50
pages) load with visible page-by-page progress. Extracted values are
highlighted in the rendered PDF using the bounding box coordinates from
the evidence chain (G.2.10).

**Permission rules:** HAM sees only proposals assigned to them (or to
"unassigned" within their portfolio scope). PM can see all proposals
within their oversight scope. Admin can see all and reassign.

**Empty states:** "No pending reviews — all extractions are up to date"
with the count of auto-approved Tier 1 items in the last 24 hours.
"Great work — queue cleared."

**Error states:** PDF rendering failure: "Unable to display source
document in browser — \[download link\] to view externally. Extraction
values are still shown." Extraction timeout: "Extraction is still
processing for \[document\] — estimated completion \[time\]."

**Keyboard shortcuts:** Tab between fields. Enter to approve current
field. Shift+Enter to approve all remaining fields. Escape to defer.
Ctrl+R to reject with reason dialog.

## H.2 AI TopSheet Query Interface

### User Experience

A chat panel accessible from any screen, scoped to the user's portfolio
permissions. The user types natural language queries about their deals
and portfolio. The system retrieves relevant data from authorised
TopSheet snapshots, canonical entities, and approved narrative notes,
then returns structured answers with citations.

The chat panel is a tool for exploration and summarisation. It does not
make decisions, assert covenant status, or recommend actions. It reads
deterministic outputs and explains them.

### Retrieval Architecture

The query interface uses retrieval-augmented generation (RAG) over the
platform's canonical data:

**Retrieval scope (what the model can access):**

> • TopSheet snapshots for investments within the user's entitlement
> scope
>
> • Canonical financial periods (reported metrics, variances)
>
> • Covenant test results and headroom
>
> • Risk register entries and revenue risk classifications
>
> • Approved narrative notes (borrower and HAM/PM commentary)
>
> • Sector KPI time series

**Retrieval scope (what the model cannot access):**

> • Raw source documents (Bronze layer) — the model sees extracted data,
> not original PDFs
>
> • Other users' queries or notes outside the entitlement scope
>
> • Holding-level data for accounts the user does not have access to
>
> • Unapproved proposals (Silver layer)

### Answer Format

Every response includes:

> **1. Structured summary** — plain language answer to the question
>
> **2. Supporting data table** — key metrics in tabular form where
> applicable
>
> **3. Evidence citations** — each claim references the specific
> TopSheet field, period, and investment it comes from, formatted as
> clickable links
>
> **4. Caveats** — where the model is summarising or interpreting, it
> states this explicitly

### Guardrails

| **Rule**                                   | **Implementation**                                                                                                                                                                                                             |
|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Never assert covenant status independently | The model reads the tier_status field from CovenantTest records. It does not compute ratios or compare to thresholds itself. Response must say "according to the covenant test for \[period\]" not "the covenant is breached". |
| Never recommend actions                    | The model may summarise options ("the documentation provides for an equity cure within 30 days") but must not recommend ("you should inject equity").                                                                          |
| Always cite sources                        | Every factual claim must reference investment_id, period, and field. If no data supports the claim, the model must say so.                                                                                                     |
| Respect entitlements                       | The retrieval layer filters by the user's permissions before the model sees any data. The model cannot access data outside the user's scope even if prompted to.                                                               |
| Distinguish fact from interpretation       | Extracted numbers are presented as facts. Explanations for why a metric changed are flagged as "the borrower's commentary states..." or "based on the variance analysis...".                                                   |

### Example Queries and Response Structure

**Query:** "Tell me about all wind farms in the portfolio — range of
expected DSCRs, average variance explained by wind resource
assumptions."

**Response structure:**

> You have 4 wind farm investments in your portfolio:
>
> \| Deal \| Latest DSCR \| Expected DSCR \| Variance \| Revenue Risk \|
>
> \|------\|-------------\|---------------\|----------\|--------------\|
>
> \| Project W1 \| 1.42x \| 1.50x \| -5.3% (adverse) \| P1-V2-D2 \|
>
> \| Project W3 \| 1.55x \| 1.48x \| +4.7% (favourable) \| P1-V2-D1 \|
>
> \| Project W2 \| 1.31x \| 1.45x \| -9.7% (adverse) \| P1-V2-D3 \|
>
> \| Project W4 \| 1.47x \| 1.47x \| 0.0% \| P1-V2-D1 \|
>
> DSCR range: 1.31x to 1.55x (expected: 1.45x to 1.50x).
>
> Two deals show adverse variance:
>
> \- \*\*Project W1\*\* (H1 2025): The borrower's compliance certificate
> notes
>
> that "wind resource was 92% of P50" during the period \[evidence: Note
> N-1234,
>
> attached to DSCR for PER-h1-2025\]. This is consistent with the 5.3%
> DSCR shortfall.
>
> \- \*\*Project W2\*\* (H1 2025): The HAM commentary notes that both
> low wind
>
> resource (P50 at 88%) and a 3-week turbine outage contributed to the
>
> underperformance \[evidence: Note N-5678, PER-h1-2025\].
>
> All 4 wind farms are classified P1-V2 (contracted pricing, volume
> depends
>
> on resource performance), confirming that wind resource variability is
> the
>
> primary volume risk across this sub-portfolio.
>
> \[Citations: TopSheet snapshots TS-001 through TS-004, periods H1
> 2025\]

### H.2.1 AI TopSheet Query — Additional Examples

**Query 2:** "Which deals have less than 10% headroom to their nearest
adverse covenant threshold?"

**Response structure:**

> 3 deals currently have headroom below 10% to their nearest adverse
> threshold:
>
> \| Deal \| Covenant \| Current Value \| Nearest Threshold \| Headroom
> \| Tier \|
>
> \|------\|----------\|--------------\|-------------------\|----------\|------\|
>
> \| Project W1 \| Senior DSCR \| 1.38x \| 1.35x (lockup) \| 2.2% \|
> Performing \|
>
> \| Project W2 \| Senior DSCR \| 1.28x \| 1.25x (trigger) \| 2.4% \|
> Distribution lockup \|
>
> \| Project P1 \| Net Debt/EBITDA \| 8.25x \| 8.50x (lockup) \| 2.9% \|
> Performing \|
>
> Project W1 is closest to a tier change — if DSCR declines by
>
> 0.03x (approximately a 2% revenue shortfall), it would enter
> distribution
>
> lockup. The borrower's latest compliance certificate notes that "Q4
>
> revenue is expected to recover following the completion of
> maintenance"
>
> \[evidence: Note N-2345, PER-h2-2025\].
>
> Project W2 is already in distribution lockup (DSCR below 1.35x)
>
> and is 2.4% above the trigger event threshold of 1.25x. This is the
>
> second consecutive lockup period \[evidence: DistributionAssessment
>
> DA-789, consecutive_lockup_periods = 2\]. If lockup persists for one
>
> more period, an excess cashflow sweep will be triggered per the
>
> documentation.
>
> \[Citations: TopSheet snapshots TS-012, TS-015, TS-023; CovenantTests
>
> CT-456, CT-789, CT-012; periods H2 2025\]

**Query 3:** "Summarise all consent requests that are due in the next 30
days."

**Response structure:**

> You have 2 active consent requests with deadlines in the next 30 days:
>
> 1\. \*\*Project Port Concession — Amendment to Capex Facility\*\* (due
> 15 April 2026)
>
> \- Request type: Amendment
>
> \- Requires: Majority lender consent (66.67%)
>
> \- Snooze-you-lose: Yes (deemed consent if no response)
>
> \- Days remaining: 12
>
> \- Status: Pending — no vote cast yet
>
> \- HAM assigned: \[name\]
>
> \- The request asks to extend the capex facility availability period
>
> by 12 months and increase the commitment by EUR 3mm.
>
> \[evidence: ConsentRequest CR-345\]
>
> 2\. \*\*Gold Airport — Waiver of Information Covenant\*\* (due 22
> April 2026)
>
> \- Request type: Waiver
>
> \- Requires: Majority lender consent (66.67%)
>
> \- Snooze-you-lose: No
>
> \- Days remaining: 19
>
> \- Status: Pending — no vote cast yet
>
> \- HAM assigned: \[name\]
>
> \- The borrower requests a 30-day extension to deliver the Q6
>
> regulatory period forecast model.
>
> \[evidence: ConsentRequest CR-367\]
>
> Note: Project Port Concession has a snooze-you-lose mechanism — if you
> do not
>
> respond by 15 April, your position will be deemed to consent. A
>
> protective "no" vote has been auto-prepared at T-1 per platform
> policy.
>
> \[Citations: ConsentRequests CR-345, CR-367; ConsentStructures CS-101,
> CS-104\]

**Query 4:** "Compare the revenue risk profile of our infrastructure
portfolio with the data centre sub-portfolio."

**Response structure:**

> Infrastructure portfolio (32 deals, £2.1bn):
>
> \| Revenue Risk \| Exposure \| % \|
>
> \|-------------\|----------\|---\|
>
> \| Contracted (P1-P2) \| £1,180m \| 56% \|
>
> \| Hybrid (P3-P4) \| £580m \| 28% \|
>
> \| Merchant (P5-P6) \| £340m \| 16% \|
>
> Data centre sub-portfolio (6 deals, £420m):
>
> \| Revenue Risk \| Exposure \| % \|
>
> \|-------------\|----------\|---\|
>
> \| Contracted (P1-P2) \| £85m \| 20% \|
>
> \| Hybrid (P3-P4) \| £155m \| 37% \|
>
> \| Merchant (P5-P6) \| £180m \| 43% \|
>
> The data centre sub-portfolio has significantly higher merchant
> exposure
>
> (43% vs 16% for the broader infrastructure book). This is driven by
>
> 3 deals with short-term GPU-as-a-service contracts (1-3 year terms)
>
> classified as P5-V5-D4 or P5-V5-D5.
>
> The contracted portion of the data centre book is concentrated in
>
> 2 deals with long-term hyperscaler contracts (10+ year terms,
>
> P1-V1-D1), which provide stable cashflow anchors.
>
> Average DSCR across the data centre sub-portfolio is 1.38x
>
> (composition: cfads_over_ds) compared to 1.52x for the broader
>
> infrastructure book. However, note that 4 of the 6 data centre
>
> deals use cfads_over_ds while 2 use ebitda_over_ds — these
>
> composition tags are not directly comparable.
>
> \[Citations: Portfolio aggregation PA-2025Q4; TopSheets for 6 data
>
> centre investments; revenue risk classifications from Part E
> assessments\]

## H.3 APIs and Data Contracts

### API Design Principles

> • RESTful JSON APIs. GraphQL considered but deferred — the query
> patterns are well-defined enough for REST with structured filter
> parameters.
>
> • All endpoints require authentication (JWT bearer token) and enforce
> row-level entitlements.
>
> • Pagination: cursor-based for large collections (deals, obligations,
> events). Default page size: 50, max: 200.
>
> • Filtering: query parameters for common filters, JSONB filter object
> for complex queries.
>
> • Versioning: URL path versioning (/api/v1/...).
>
> • All timestamps in UTC ISO 8601.

### Core Endpoints

**Portfolio Aggregates**

GET /api/v1/portfolio/aggregates

Query: ?account_id=...&organisation_id=...&as_at=2025-06-30

Response:

> {
>
> "as_at": "2025-06-30T00:00:00Z",
>
> "total_aum": 465000000,
>
> "deal_count": 8,
>
> "grade_distribution": {"1": {"count": 5, "exposure": 310000000}, "2":
> {"count": 2, "exposure": 120000000}, "3": {"count": 1, "exposure":
> 35000000}},
>
> "covenant_status_distribution": {"performing": 6,
> "distribution_lockup": 1, "trigger_event": 1},
>
> "overdue_obligations": 2,
>
> "watchlist_count": 1,
>
> "revenue_risk_profile": {"contracted": 0.52, "hybrid": 0.29,
> "merchant": 0.19}
>
> }

**Deal TopSheet Projection**

GET /api/v1/investments/{investment_id}/topsheet

Query: ?as_at=2025-06-30

Response: Full TopSheet JSON as per Part F schema, with computed fields
from analytics engines.

**Covenant Results Time Series**

GET /api/v1/investments/{investment_id}/covenants/{covenant_id}/history

Query: ?from_period=2023H1&to_period=2025H1

Response:

> {
>
> "covenant_id": "COV-001",
>
> "covenant_name": "Senior DSCR",
>
> "composition_tag": "cfads_over_ds",
>
> "history": \[
>
> {
>
> "period": "2025H1",
>
> "ratio_value": 1.47,
>
> "borrower_reported": 1.49,
>
> "tier_status": "performing",
>
> "headroom": {"distribution_lockup": 0.12, "trigger_event": 0.22,
> "event_of_default": 0.37},
>
> "components": {"cfads": 115000000, "debt_service": 78000000},
>
> "source_document_id": "DOC-12345",
>
> "source_citation": "Table 3, page 8"
>
> }
>
> \]
>
> }

**Obligations Status**

GET /api/v1/investments/{investment_id}/obligations

Query: ?status=overdue,approaching&page_cursor=...

Response: Array of obligation records with status, due date, fulfilment
details.

**Review Queue**

GET /api/v1/review-queue

Query: ?assigned_to=me&status=pending

Response: Array of ProposedFacts with: document metadata, proposed
values with confidence scores, flagged items, source citations.

POST /api/v1/review-queue/{proposal_id}/approve

Body: {"adjustments": \[{"field": "ebitda", "original": 180000000,
"adjusted": 178500000, "reason": "Exclude one-off insurance
recovery"}\]}

**Events / Audit Trail**

GET /api/v1/investments/{investment_id}/events

Query:
?event_type=CovenantTested,TierStatusChanged&from=2025-01-01&page_cursor=...

Response: Array of immutable event records with full payload.

**Alerts**

GET /api/v1/alerts

Query: ?priority=high,critical&status=pending

POST /api/v1/alerts/{alert_id}/acknowledge

**AI Query**

POST /api/v1/ai/query

Body: {"query": "Tell me about all wind farms...", "scope":
{"organisation_id": "ORG-123"}}

Response:

> {
>
> "answer": "You have 4 wind farm investments...",
>
> "data_table": \[...\],
>
> "citations": \[{"investment_id": "INV-001", "period": "H1 2025",
> "field": "senior_quarterly_dscr", "snapshot_id": "TS-001"}\],
>
> "model_version": "claude-sonnet-4-5-20250929",
>
> "retrieval_count": 12,
>
> "entitlement_scope": "ORG-123"
>
> }

### H.3.1 Additional API Endpoint Schemas

**Portfolio Headroom Distribution**

GET /api/v1/portfolio/headroom-distribution

Query: ?organisation_id=ORG-123&bucket_size=5

Response:

> {
>
> "as_at": "2025-12-31T00:00:00Z",
>
> "scope": {"organisation_id": "ORG-123"},
>
> "total_deals": 24,
>
> "distribution": \[
>
> {"bucket": "\<5%", "count": 3, "exposure": 85000000, "deals":
> \["INV-001", "INV-015", "INV-023"\]},
>
> {"bucket": "5-10%", "count": 4, "exposure": 120000000, "deals":
> \["INV-003", "INV-007", "INV-019", "INV-022"\]},
>
> {"bucket": "10-20%", "count": 8, "exposure": 310000000},
>
> {"bucket": "\>20%", "count": 9, "exposure": 485000000}
>
> \],
>
> "deals_with_no_covenants": 0,
>
> "deals_not_yet_tested": 2
>
> }

**Variance Summary (Portfolio-Level)**

GET /api/v1/portfolio/variance-summary

Query: ?organisation_id=ORG-123&metric=dscr&period=H2_2025

Response:

> {
>
> "metric": "dscr",
>
> "period": "H2 2025",
>
> "scope": {"organisation_id": "ORG-123"},
>
> "summary": {
>
> "count": 22,
>
> "average_variance_pct": -3.2,
>
> "median_variance_pct": -1.8,
>
> "favourable_count": 8,
>
> "adverse_count": 14,
>
> "material_adverse_count": 3,
>
> "critical_adverse_count": 1
>
> },
>
> "worst_variances": \[
>
> {"investment_id": "INV-015", "investment_name": "Project W2",
> "expected": 1.45, "reported": 1.31, "variance_pct": -9.7,
> "materiality": "material"},
>
> {"investment_id": "INV-023", "investment_name": "Project D",
> "expected": 1.60, "reported": 1.38, "variance_pct": -13.8,
> "materiality": "critical"}
>
> \]
>
> }

**Trend Alerts**

GET /api/v1/portfolio/trends

Query: ?severity=concern,alert&acknowledged=false

Response:

> {
>
> "trends": \[
>
> {
>
> "trend_id": "TRD-001",
>
> "investment_id": "INV-015",
>
> "investment_name": "Project W2",
>
> "metric": "senior_quarterly_dscr",
>
> "composition_tag": "cfads_over_ds",
>
> "trend_type": "consecutive_deterioration",
>
> "periods_observed": 3,
>
> "severity": "concern",
>
> "values": \[
>
> {"period": "H1 2024", "value": 1.52, "pct_change": null},
>
> {"period": "H2 2024", "value": 1.45, "pct_change": -4.6},
>
> {"period": "H1 2025", "value": 1.38, "pct_change": -4.8},
>
> {"period": "H2 2025", "value": 1.31, "pct_change": -5.1}
>
> \],
>
> "acknowledged": false,
>
> "created_at": "2025-12-31T10:00:00Z"
>
> }
>
> \]
>
> }

**Document Evidence Lookup**

GET /api/v1/evidence/{document_id}/citation

Query: ?page=8&table=3&cell=C7

Response:

> {
>
> "document_id": "DOC-12345",
>
> "document_name": "Project W1 H1 2025 Compliance Certificate.pdf",
>
> "document_url": "/api/v1/documents/DOC-12345/render",
>
> "citation": {
>
> "page": 8,
>
> "table": 3,
>
> "cell": "C7",
>
> "text_snippet": "DSCR: 1.47x",
>
> "bounding_box": {"x1": 320, "y1": 445, "x2": 410, "y2": 460}
>
> },
>
> "linked_records": \[
>
> {"type": "FinancialPeriod", "id": "PER-h1-2025", "field":
> "senior_quarterly_dscr"},
>
> {"type": "CovenantTest", "id": "CT-456", "field": "ratio_value"}
>
> \]
>
> }

## H.4 Non-Functional Requirements

### Auditability

> • Every state change logged as an immutable event with: who, what,
> when, why, source_event_id.
>
> • AI actions additionally log: model version, prompt (or prompt
> template + parameters), retrieval references, confidence score.
>
> • Audit trail queryable per investment, per user, per time range.
>
> • Deterministic recomputation: given the event log, any TopSheet
> snapshot can be recomputed from scratch and must produce identical
> results.

### Deterministic Reproducibility

> • All analytics engines are pure functions of their inputs (canonical
> state + configuration).
>
> • Snapshot consistency: TopSheet snapshot created after each state
> change captures the complete computed state at that moment.
>
> • Recomputation test: a nightly job picks random TopSheet snapshots
> and recomputes them from source events. Any divergence triggers an
> integrity alert.

### Security and Tenant Isolation

> • Row-level security enforced at the data layer (not application
> layer). Every query includes the user's entitlement scope as a
> mandatory filter.
>
> • Client data is logically isolated. No cross-client data leakage is
> possible through any API endpoint, including the AI query interface.
>
> • The AI query retrieval layer applies entitlement filters before any
> data reaches the model context.
>
> • All API calls authenticated via JWT with claims for client_id,
> organisation_ids, account_ids, and role.

### Performance Targets

| **Metric**                 | **Target**                                |
|----------------------------|-------------------------------------------|
| Portfolio dashboard load   | \<2 seconds for 200 deals                 |
| Deal TopSheet load         | \<1 second                                |
| Covenant history chart     | \<500ms                                   |
| Review queue load          | \<1 second                                |
| AI query response          | \<10 seconds (including retrieval)        |
| Alert delivery (email)     | \<5 minutes from trigger event            |
| Alert delivery (in-app)    | \<30 seconds from trigger event           |
| TopSheet snapshot creation | \<10 seconds after canonical state change |

**Caching strategy:** Portfolio aggregations are pre-computed and cached
(invalidated on any constituent deal change). Deal TopSheet projections
are cached per snapshot version. Covenant time series are cached per
period.

### Availability and Monitoring

> • Target: 99.5% availability during business hours (Monday-Friday
> 07:00-19:00 UK time).
>
> • Pipeline health dashboard: document processing queue depth,
> extraction success rate, review queue age, alert delivery latency.
>
> • Automated alert if: pipeline queue exceeds 50 documents, any Tier 2
> review pending \>48 hours, alert delivery failure.

### Data Retention

> • Bronze layer (raw documents): retained per regulatory/contractual
> requirements, minimum 7 years. Immutable — never modified or deleted.
>
> • Silver layer (extraction proposals): retained 2 years after
> superseded.
>
> • Gold layer (canonical state): retained indefinitely. All versions
> retained.
>
> • TopSheet snapshots: retained indefinitely.
>
> • Event log: retained indefinitely. Immutable.
>
> • AI query logs (prompts + responses): retained 2 years for audit and
> model improvement.

## H.5 Implementation Plan

### MVP (Weeks 1–16)

**Scope:** Core monitoring loop — data in, analytics computed, humans
informed.

| **Component**                    | **Detail**                                                                                                            |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Document intake pipeline**     | Email monitoring, virus scan, Bronze storage, AI classification + extraction, Tier 1 auto-commit, Tier 2 review queue |
| **Obligation scheduling engine** | Due/approaching/overdue/missed status, grace periods                                                                  |
| **Covenant testing engine**      | Ratio computation, threshold assessment, tier status, headroom                                                        |
| **Variance engine**              | Reported vs expected, materiality classification                                                                      |
| **Grading engine**               | Deterministic grade computation                                                                                       |
| **Alerting engine**              | Core alerts: covenant breach, overdue obligation, grade change. In-app + email.                                       |
| **Deal TopSheet screen**         | Full TopSheet projection with evidence links                                                                          |
| **Portfolio dashboard**          | KPIs, grade distribution, covenant heatmap, overdue obligations                                                       |
| **Review queue**                 | Tier 2 approval workflow with split-pane document/extraction view                                                     |
| **Obligations calendar**         | Calendar + SLA queue                                                                                                  |
| **APIs**                         | All core endpoints                                                                                                    |

**Not in MVP:** Trend detection, risk register UI, AI query interface,
consent tracker, anonymised benchmarking, portfolio aggregation beyond
basic KPIs.

### V1 (Weeks 17–32)

**Scope:** Richer analytics, portfolio intelligence, AI-powered
exploration.

| **Component**                            | **Detail**                                                                |
|------------------------------------------|---------------------------------------------------------------------------|
| **Trend detection engine**               | Consecutive deterioration, severity escalation                            |
| **Consecutive-period escalation engine** | Lock-up streaks, trigger duration tracking                                |
| **Distribution condition evaluation**    | Compound condition testing, lock-up status                                |
| **Risk register UI**                     | Portfolio heatmaps, risk concentration analysis, revenue risk profiling   |
| **AI TopSheet Query**                    | RAG interface with entitlement-scoped retrieval and citations             |
| **Consent/waiver tracker**               | Deadline management, snooze-you-lose, voting record                       |
| **Covenant detail screen**               | Threshold ladder, component breakdown, history                            |
| **Financials period view**               | Variance bridge, source document side panel                               |
| **Exceptions & cases**                   | Full case management workflow                                             |
| **Excel rule authoring**                 | Configuration import from Excel templates with test case validation       |
| **Portfolio aggregation**                | Full rollups by sector, geography, revenue risk, maturity profile         |
| **Anonymised benchmark hooks**           | Data export pipeline to intelligence plane (D.6) — display deferred to V2 |

### Technology Recommendations

| **Component**           | **Recommendation**                                   | **Rationale**                                                                                                                                                              |
|-------------------------|------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Frontend framework**  | React + TypeScript                                   | Industry standard for complex dashboard applications; strong component ecosystem; TypeScript enforces schema contracts with API                                            |
| **Charting**            | Recharts or Apache ECharts                           | Recharts for simpler charts (integrates natively with React); ECharts for more complex visualisations (heatmaps, waterfall charts)                                         |
| **Backend API**         | Python (FastAPI) or TypeScript (NestJS)              | FastAPI recommended — strong typing, async, excellent for data-heavy APIs. Python aligns with data/ML team skills for AI query interface.                                  |
| **Database**            | PostgreSQL with JSONB                                | Handles both relational (entity model) and semi-structured (TopSheet, metrics) data. Row-level security built in. Mature, auditable.                                       |
| **Event store**         | PostgreSQL append-only table with CDC to message bus | Simpler than dedicated event store (EventStoreDB). PostgreSQL handles the volume. CDC (Change Data Capture) via Debezium pushes events to message bus for async consumers. |
| **Message bus**         | Azure Service Bus (or Kafka if self-hosted)          | Event-driven architecture. Service Bus for managed; Kafka if team prefers self-managed.                                                                                    |
| **Document storage**    | Azure Blob Storage (ADLS Gen2)                       | Immutable storage for Bronze layer. Per D.9 deal container structure.                                                                                                      |
| **AI/LLM**              | Anthropic Claude (via API)                           | For document extraction, narrative drafting, and AI query interface. Model version logged per D.5 audit requirements.                                                      |
| **Search (for AI RAG)** | PostgreSQL pgvector or Azure AI Search               | pgvector if keeping the stack simple; Azure AI Search if retrieval complexity grows. Start with pgvector.                                                                  |
| **Caching**             | Redis                                                | Pre-computed aggregations, session state, alert deduplication.                                                                                                             |
| **PDF rendering**       | PDF.js (browser-side)                                | For the split-pane review queue — renders source document with highlighted extraction regions.                                                                             |

## NEXT STEPS

### Immediate (Architecture Freeze)

> **1. Finalise canonical schema** — review Part D.3 entities against
> pilot deal documents; confirm field completeness
>
> **2. Finalise event taxonomy** — review Part D.4 events; confirm all
> workflows are covered
>
> **3. Confirm AI vs deterministic boundary** — validate Part D.5
> separation against each agent workflow
>
> **4. Confirm Market Intelligence Feature Schema** — review Part D.6
> features; agree which fields are v1 exports

### MVP Build (Weeks 1–16)

> **5. Infrastructure baseline** — VNet, object store, operational
> database, event bus, CI/CD
>
> **6. Deal setup workflow** — ingest finance docs + IC memo → extract
> obligations + expected metrics
>
> **7. Document intake pipeline** — email/upload → classify → extract →
> propose → approve → commit
>
> **8. Compliance monitoring engine** — obligation scheduling,
> due/missed/cured workflow, HAM alerts
>
> **9. Performance monitoring engine** — financial extraction, variance
> calculation, grading, tier assessment
>
> **10. TopSheet projection + dashboard** — real-time deal view,
> portfolio rollup, evidence links, time-travel

### Post-MVP (V1)

> **11. Multi-tier covenant tracking** — lock-up, trigger, remedial,
> default with consecutive-period escalation
>
> **12. EBITDA adjustment capture** — extract and store pro-forma
> add-backs for trend analysis
>
> **13. Anonymised export pipeline** — controlled feature extraction →
> intelligence plane
>
> **14. Market intelligence dashboards** — aggregate analytics across
> the anonymised dataset
>
> **15. Client reporting automation** — quarterly deck generation with
> citations
>
> **16. Expand register coverage** — validate against real estate, USPP,
> and direct lending documents

*This is a living document. It will be updated as the platform is built
and as additional deal types and documentation are analysed.*
