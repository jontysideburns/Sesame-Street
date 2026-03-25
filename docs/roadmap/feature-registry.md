# Feature Registry

Purpose: track the broader platform feature map, dependencies, and phase assignments.
Audience: roadmap and architecture planning.
Status: planning

Private Markets Debt Monitoring Platform — Feature Decomposition

Every buildable feature, its dependencies, complexity, and phase assignment. This is the single source of truth for roadmap planning.

---

## Feature Categories

Features are grouped into six build layers. Each layer builds on the one below it.

| Layer | Name | Description |
|-------|------|-------------|
| F | Foundation | Infrastructure, data model, auth, storage — no business logic |
| I | Intake | Document receipt, AI extraction, approval workflow |
| E | Engines | Deterministic analytics (covenant, variance, grading, etc.) |
| S | Screens | UI screens that consume engine outputs |
| A | Advanced | Richer analytics, AI query, configuration tools |
| P | Platform | Cross-client intelligence, reporting, benchmarking |

---

## Feature Table

| ID | Feature | Layer | Phase | Complexity | Capability | Depends On | Entities | Screens Powered | Description |
|----|---------|-------|-------|-----------|------------|------------|----------|----------------|-------------|
| **FOUNDATION** | | | | | | | | | |
| F-01 | Database schema & migrations | F | MVP | M | — | — | All core entities | — | PostgreSQL schema for Investment, Obligation, Fulfilment, FinancialPeriod, CovenantTest, Assessment, Document, ProposedFact, Event, Note. Row-level security policies. |
| F-02 | Event store | F | MVP | S | — | F-01 | Event | — | Append-only event table. ~43 event types. CDC to message bus. |
| F-03 | Document storage (Bronze) | F | MVP | S | — | — | Document | — | Azure Blob / ADLS Gen2. Immutable storage, SHA-256 checksums, virus scanning, 7-year retention. |
| F-04 | Authentication & entitlements | F | MVP | M | — | F-01 | PlatformClient, Organisation, Account | — | JWT auth. Row-level security. Client/org/account scoping on every query. |
| F-05 | API framework | F | MVP | S | — | F-01, F-04 | — | — | FastAPI or NestJS. Cursor pagination, UTC timestamps, versioned paths, error handling. |
| F-06 | Message bus | F | MVP | S | — | F-02 | Event | — | Azure Service Bus or Kafka. Event-driven async processing. |
| F-07 | Client/portfolio hierarchy | F | MVP | M | — | F-01 | PlatformClient, Organisation, Account, Holding | — | Multi-tenant hierarchy. Holdings link accounts to investments. Access boundary enforcement. |
| F-08 | Deal setup / onboarding | F | MVP | L | 12. Deal Onboarding | F-01, F-03, I-01 | Investment, Obligation, all config entities | — | Ingest finance docs + IC memo. AI maps obligations to Master Register. PM confirms (Tier 3). Phase assignment. |
| | | | | | | | | | |
| **INTAKE** | | | | | | | | | |
| I-01 | AI classification agent | I | MVP | L | 8. Document Intelligence | F-03 | Document, ProposedFact | H.1.6 Review Queue | Classify document type, match to investment, identify period. Confidence scoring. Below threshold = exception. |
| I-02 | AI extraction agent | I | MVP | L | 8. Document Intelligence | I-01 | ProposedFact, Note | H.1.6 Review Queue | Extract numeric fields with page/table/cell/bbox citations. Narrative notes. Sector KPIs. Confidence per field. |
| I-03 | Deterministic validation | I | MVP | M | 8. Document Intelligence | I-02 | ProposedFact | H.1.6 Review Queue | Format, reasonableness (>30% move), completeness, cross-checks (EBITDA ~ CFADS). Tier routing. |
| I-04 | Tier 1 auto-commit | I | MVP | S | 8. Document Intelligence | I-03, F-02 | FinancialPeriod, Fulfilment | — | High confidence + validations pass = commit to Gold. Emit events. Notify HAM. |
| I-05 | Tier 2 review workflow | I | MVP | M | 8. Document Intelligence | I-03 | ProposedFact, FinancialPeriod | H.1.6 Review Queue | Split-pane: PDF + proposed values. Approve/adjust/reject per field. Keyboard shortcuts. |
| I-06 | Tier 3 human decision | I | MVP | S | 8. Document Intelligence | I-05 | FinancialPeriod | — | Route judgement-required items (ratings, risk, grade override). System provides analysis, human decides. |
| I-07 | Obligation matching | I | MVP | M | 1. Compliance Monitoring | I-01, E-01 | Fulfilment | H.1.5 Calendar | Match incoming document to expected obligations. Create Fulfilment record with timeliness. |
| I-08 | Source supersession | I | V1 | S | 8. Document Intelligence | I-04 | Document, FinancialPeriod | — | Audited supersedes unaudited. Retain prior version. Recompute downstream. Source hierarchy enforcement. |
| | | | | | | | | | |
| **ENGINES** | | | | | | | | | |
| E-01 | Obligation scheduling engine | E | MVP | M | 1. Compliance Monitoring | F-01 | Obligation, Fulfilment | H.1.5 Calendar | Generate due dates from frequency/anchor/grace rules. Phase transitions. Linked deadlines. Auto-approve. |
| E-02 | Covenant testing engine | E | MVP | L | 2. Covenant Testing | I-04, I-05 | CovenantTest, FinancialPeriod | H.1.2 TopSheet | Compute ratios. Threshold assessment (3 tiers). Headroom calc. Step-down schedules. Composition tags. |
| E-03 | Variance engine | E | MVP | M | 4. Variance Analysis | I-04, I-05 | VarianceRecord, FinancialPeriod | H.1.2 TopSheet | Reported vs IC memo baseline. Direction-aware. Materiality: notable/material/critical. |
| E-04 | Grading engine | E | MVP | M | 6. Performance Grading | E-02, E-03, E-01 | Assessment | H.1.2 TopSheet | 4-component weighted score (covenant 40%, variance 20%, trend 20%, compliance 20%). Grade 1-4 mapping. |
| E-05 | Alerting engine | E | MVP | M | 11. Alerting & Escalation | E-02, E-03, E-04, E-01 | — | H.1.9 Alerts | Rule-based triggers (12+ types). Priority/channel routing. Escalation ladder. Deduplication. In-app + email. |
| E-06 | TopSheet snapshot engine | E | MVP | M | — | E-02, E-03, E-04 | TopSheetSnapshot | H.1.2 TopSheet | Versioned, immutable projection. Created within 10s of state change. Evidence links. |
| E-07 | Portfolio aggregation (basic) | E | MVP | S | 9. Portfolio Analytics | E-06 | — | H.1.1 Dashboard | Basic KPIs: AUM, deal count, weighted avg DSCR, headroom, overdue count, grade distribution. |
| E-08 | Trend detection engine | E | V1 | M | 5. Trend Detection | E-02, E-03 | TrendRecord | H.1.8 Risk & Trends | Consecutive-period deterioration. 2=watch, 3=concern, 4+=alert. Magnitude upgrade. Seasonal adjustment. |
| E-09 | Consecutive escalation engine | E | V1 | M | 2. Covenant Testing | E-02 | TriggerEvent | H.1.3 Covenant Detail | Lock-up streaks. Trigger event duration tracking (0-12mo enhanced, 12+ remedial). |
| E-10 | Distribution condition engine | E | V1 | M | 3. Distribution Assessment | E-02, E-01 | DistributionCondition, DistributionAssessment | H.1.2 TopSheet | Test all 10 sub-conditions. ALL pass = permitted, ANY fail = locked. 3 consecutive = excess cashflow sweep. |
| E-11 | Ratio reconciliation | E | V1 | S | 2. Covenant Testing | E-02 | Exception | — | Platform-computed vs borrower-reported. >2% = exception for HAM (Tier 3). |
| E-12 | Equity cure tracking | E | V1 | S | 2. Covenant Testing | E-02 | TriggerEvent | — | 30-day countdown. Annual limit. Max cures total. Application method tracking. Revised cert receipt. |
| E-13 | Portfolio aggregation (full) | E | V1 | L | 9. Portfolio Analytics | E-06, E-08, E-10 | — | H.1.1 Dashboard | Full rollups by sector, geography, revenue risk, maturity profile. Time-travel. |
| | | | | | | | | | |
| **SCREENS** | | | | | | | | | |
| S-01 | Portfolio Dashboard | S | MVP | L | 9. Portfolio Analytics | E-07, E-06 | — | H.1.1 | KPI bar, grade distribution chart, covenant heatmap, headroom histogram, maturity profile. |
| S-02 | Deal TopSheet | S | MVP | L | Multiple | E-06, E-02, E-03, E-04 | — | H.1.2 | Grade badge, covenant summary, financial snapshot, variance arrows, distribution status, obligation timeline, time-travel. |
| S-03 | Review Queue | S | MVP | L | 8. Document Intelligence | I-05 | — | H.1.6 | Split-pane PDF + proposed values. Confidence indicators. Prior period comparison. Keyboard shortcuts. PDF.js rendering. |
| S-04 | Obligations Calendar | S | MVP | M | 1. Compliance Monitoring | E-01 | — | H.1.5 | Month calendar with colour-coded dots. SLA queue. Fulfilment rate KPI. |
| S-05 | Alerts Centre | S | MVP | M | 11. Alerting & Escalation | E-05 | — | H.1.9 | Alert feed (filterable). Acknowledgement controls. Escalation history. Subscription management. |
| S-06 | Covenant Detail | S | V1 | M | 2. Covenant Testing | E-02, E-09 | — | H.1.3 | Threshold ladder visual. History table. Component breakdown with citations. Headroom time series. Step-down schedule. |
| S-07 | Financials / Period View | S | V1 | M | 4. Variance Analysis | E-03, I-02 | — | H.1.4 | P&L (expected/reported/variance). Variance bridge waterfall. Ratio computation panel. Source document side panel. |
| S-08 | Exceptions & Cases | S | V1 | M | 11. Alerting & Escalation | E-05 | — | H.1.7 | Queue with type/severity/deal/age/SLA. Detail view. Action history. Linked documents. |
| S-09 | Risk Register & Trends | S | V1 | L | 7. Risk Assessment | E-08 | RiskAssessment | H.1.8 | Risk heatmap. Concentration table. Revenue risk profile. Portfolio risk score trend. |
| S-10 | Consent/Waiver Tracker | S | V1 | M | 10. Consent & Voting | — | ConsentRequest, ConsentStructure | H.1.10 | Active requests with countdown. Snooze-you-lose. Voting record. History. |
| | | | | | | | | | |
| **ADVANCED** | | | | | | | | | |
| A-01 | AI TopSheet Query | A | V1 | L | 8. Document Intelligence | E-06, F-04 | — | Chat panel | RAG interface. Entitlement-scoped retrieval. Citations. Guardrails (no assertions, no recommendations). pgvector. |
| A-02 | Excel rule authoring | A | V1 | M | — | E-02, E-03, E-08 | — | Config tool | Import covenant thresholds, materiality, trend rules, grading weights, alert subscriptions, test cases from Excel. JSON export with versioning. |
| A-03 | Grade override workflow | A | V1 | S | 6. Performance Grading | E-04 | Assessment | H.1.2 TopSheet | HAM override with rationale. Expiry date. Flagged in UI. Audit trail. |
| A-04 | EBITDA adjustment capture | A | V1 | M | 4. Variance Analysis | I-02 | FinancialPeriod | H.1.4 Financials | Extract and store 13 adjustment types. Risk rating per type. >20% of EBITDA = alert. |
| A-05 | Risk assessment workflow | A | V1 | M | 7. Risk Assessment | F-01 | RiskAssessment | H.1.8 Risk | 7-category taxonomy. Likelihood x severity. Annual review cycle. System pre-populates. |
| A-06 | Consent voting workflow | A | V1 | M | 10. Consent & Voting | S-10 | ConsentRequest, ConsentStructure | H.1.10 | Cover note generation. Vote recording. Snooze-you-lose protection. Amendment impact summary. |
| | | | | | | | | | |
| **PLATFORM** | | | | | | | | | |
| P-01 | Anonymised export pipeline | P | Future | L | 9. Portfolio Analytics | E-13, F-04 | — | — | One-way export to Market Intelligence plane. Feature schema validation. Min 10 deals per slice. Opt-in contractual. |
| P-02 | Market intelligence dashboards | P | Future | L | 9. Portfolio Analytics | P-01 | — | New screens | Median leverage by sector. Covenant headroom distribution. Delivery timeliness index. Amendment frequency index. |
| P-03 | Client reporting automation | P | Future | M | 9. Portfolio Analytics | E-13, E-06 | — | Export tool | Quarterly deck generation with citations. Filtered by organisation/account. Template-driven. |
| P-04 | Expanded register coverage | P | Future | L | 1. Compliance Monitoring | E-01 | Obligation | — | Validate against real estate, USPP, direct lending documentation. Extend Master Register items. |
| P-05 | Full benchmarking analytics | P | Future | L | 9. Portfolio Analytics | P-01, P-02 | — | New screens | Cross-market peer comparison. Spread-vs-risk. Early warning signals from behavioural features. |

---

## Phase Summary

| Phase | Features | Build Layers | Timeline (from requirements) |
|-------|----------|-------------|------------------------------|
| MVP | 27 features (F-01 to S-05) | Foundation + Intake + Engines (core) + Screens (4) | Weeks 1-16 |
| V1 | 18 features (E-08 to A-06) | Engines (advanced) + Screens (5) + Advanced (6) | Weeks 17-32 |
| Future | 5 features (P-01 to P-05) | Platform | Post-V1 |

## Complexity Distribution

| Complexity | MVP | V1 | Future | Total |
|-----------|-----|-----|--------|-------|
| S (Small) | 6 | 5 | 0 | 11 |
| M (Medium) | 13 | 10 | 1 | 24 |
| L (Large) | 8 | 3 | 4 | 15 |
| **Total** | **27** | **18** | **5** | **50** |

---

## Critical Path

The longest dependency chain determines the minimum build sequence:

```
F-01 (schema) → F-03 (Bronze) → I-01 (classify) → I-02 (extract) → I-03 (validate)
  → I-04 (auto-commit) → E-02 (covenant testing) → E-04 (grading) → E-06 (TopSheet)
  → S-02 (Deal TopSheet screen)
```

This 10-step chain is the core monitoring loop: data in → analytics computed → humans informed.

Parallel paths branch off at each step:
- After I-01: obligation matching (I-07) → calendar (S-04)
- After I-04: variance (E-03) feeds into grading (E-04)
- After E-02: alerting (E-05) → alerts centre (S-05)
- After E-06: portfolio aggregation (E-07) → dashboard (S-01)
