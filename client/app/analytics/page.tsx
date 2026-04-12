"use client";

import { useState } from "react";

/* ── Analytics Rule Definitions ──────────────────────────────────── */

type AnalyticsRule = {
  id: string;
  name: string;
  category: string;
  summary: string;
  detail: string;
};

const RULES: AnalyticsRule[] = [
  // ── Performance & Grading ──
  {
    id: "performance-grade",
    name: "Performance Grade",
    category: "Performance & Grading",
    summary: "1-4 grade based on DSCR and collateral headroom erosion vs management case expectations.",
    detail: `The performance grade measures how far actual covenant ratios have deviated from the management case.

**Components:** Two ratios are assessed independently — DSCR (debt service coverage) and a collateral metric (typically Net Debt / EBITDA).

**Headroom calculation:**
- Expected headroom = Management case value − Default threshold
- Actual headroom = Actual value − Default threshold
- Erosion % = (Expected headroom − Actual headroom) / Expected headroom

**Grade assignment (per component):**
- **Grade 1 (Outperforming):** Erosion % < −threshold (actual better than expected by more than threshold)
- **Grade 2 (In Line):** Erosion % within ±threshold of zero
- **Grade 3 (Below Expectation):** Erosion % > +threshold but not breaching default/lockup
- **Grade 4 (Below Lock-Up/Default):** Actual value breaches the default or lockup level

**Overall grade** = worst of the two component grades (max of DSCR grade and collateral grade).

**Default thresholds:** DSCR = 10%, Collateral = 5%. These are configurable per deal.`,
  },
  {
    id: "performance-trend",
    name: "Performance Trend",
    category: "Performance & Grading",
    summary: "Direction of travel based on 3 consecutive periods of headroom erosion change.",
    detail: `Trend is computed from 3 consecutive reporting periods of headroom erosion percentages (E1, E2, E3 = T-2, T-1, T-0).

**Delta calculation:**
- Delta 1 = E2 − E1 (period-on-period change)
- Delta 2 = E3 − E2 (latest period-on-period change)

**Delta classification** (each delta independently):
- "large_positive": delta > large_threshold (5pp for DSCR, 2.5pp for collateral)
- "moderate_positive": small_threshold < delta ≤ large_threshold
- "negative": delta < −small_threshold (improvement)
- "small": within ±small_threshold (2.5pp)

**Persistent drift flag:** TRUE if E1 > 0 AND E2 > E1 AND E3 > E2 (three consecutive periods of worsening).

**Classification matrix (based on Delta 2 primarily):**
- Delta 2 = "negative" → **Improving** (unless recovery from large positive)
- Delta 2 = "small" → **Flat** (or Improving if Delta 1 was negative; Deteriorating if persistent drift)
- Delta 2 = "moderate_positive" → **Deteriorating** (or Flat if recovering from negative)
- Delta 2 = "large_positive" → **Deteriorating Rapidly** (or Deteriorating if recovering from negative)

**Combined trend:** Takes worst of DSCR trend and collateral trend.
Ranking: deteriorating_rapidly > deteriorating > flat > improving.`,
  },
  {
    id: "trend-detection-engine",
    name: "Plan Variance Trend Engine (v5)",
    category: "Performance & Grading",
    summary: "Computes headroom erosion / improvement vs the management case for two credit ratios per deal (one cash cover + one collateral), then classifies direction using 7-band symmetric deltas with persistent drift detection.",
    detail: `The Plan Variance Trend Engine replaces the earlier time-series trend engine. It no longer tracks absolute metric movements; instead it computes the gap between actual and expected headroom for each monitored credit ratio, period by period, and classifies the direction and speed of change.

The engine runs on every deal via \`POST /api/deals/{slug}/analytics/detect-trends\` and can be invoked with custom parameters in the request body.

---

**Data source**
Reads from the legacy \`actual_periods.actual_metrics\` JSONB column. Deals ingested through the new normalised line-item pipeline (\`period_financial_items\`) are backfilled into \`actual_periods\` using a standard aggregation: the line keys \`total_revenue\`, \`total_operating_costs\`, \`ebitda\`, \`cfads\`, \`capital_expenditure\`, \`senior_debt_service\`, \`senior_dscr\`, \`llcr\`, \`net_debt_ebitda\` map to the metric keys \`revenue\`, \`opex\`, \`ebitda\`, \`cfads\`, \`capex\`, \`debt_service\`, \`dscr\`, \`llcr\`, \`net_debt_ebitda\`.

---

**Tracked metrics**
By default: \`dscr\`, \`llcr\`, \`plcr\`, \`revenue\`, \`ebitda\`, \`cfads\`, \`opex\`, \`capex\`, \`debt_service\`, \`net_income\`, \`net_debt_ebitda\`. Additional metrics can be requested via the \`metrics\` body parameter.

---

**Direction preference map (new)**
Each metric is tagged as either **higher-is-better** or **lower-is-better**. This is critical: a 48% increase in EBITDA is good news, but a 48% increase in opex is bad news. The engine uses the preference map to classify the direction correctly.

- **higher-is-better:** dscr, llcr, plcr, icr, revenue, ebitda, cfads, net_income, ebitda_margin
- **lower-is-better:** opex, capex, debt_service, net_debt_ebitda, leverage, ltv

**Classification logic:**
1. Split the value series into first half and second half
2. Compute the mean of each half
3. Determine the **raw move**: up (second_half > first_half × 1.03), down (second_half < first_half × 0.97), or flat
4. Map the raw move to a **direction** using the preference:
   - preference = higher, move up → improving; move down → deteriorating
   - preference = lower, move up → deteriorating; move down → improving
   - move flat → stable

**Severity bands** (only applied when direction = deteriorating):
- total_change > 20% → critical
- 10–20% → high
- 5–10% → moderate
- < 5% → low

---

**Covenant-aware breach and recovery detection (new)**
For metrics that carry contractual default/lockup thresholds, the engine layers a second signal on top of the directional classification. This handles the case where a metric breached a covenant and then recovered (e.g. DSCR dropped below 1.0x during Covid then climbed back above 2.0x). The directional trend alone would mark this "improving" and lose the signal that the deal went through a breach.

**Thresholds registered (configurable per deal in future):**

| Metric | Default | Lockup | Preference |
|---|---|---|---|
| dscr | 1.00 | 1.20 | higher |
| llcr | 1.10 | 1.20 | higher |
| icr | 1.50 | 2.00 | higher |
| net_debt_ebitda | 8.00 | 6.00 | lower |

**State classification (newest to oldest priority):**
- **currently_breached** — latest value is below default (or above for lower-is-better). Severity promoted to **critical** regardless of directional move.
- **currently_lockup** — latest value is between lockup and default.
- **breached_and_recovered** — at least one historical value was below default, but the latest value is above default. Severity promoted to **moderate** if the directional severity was "none".
- **lockup_and_recovered** — same but for lockup threshold.
- **always_compliant** — no period ever touched a threshold.

**Breach info object returned per metric:**
\`\`\`json
{
  "state": "breached_and_recovered",
  "defaultLevel": 1.00,
  "lockupLevel": 1.20,
  "everBreachedDefault": true,
  "everBreachedLockup": true,
  "periodsInBreach": 1,
  "worstValue": 0.96,
  "worstPeriod": "FY 2021",
  "currentValue": 3.29,
  "distanceToDefault": 2.29
}
\`\`\`

---

**Trend type**
Separately from direction, each series is classified as:
- **monotonic** — the series never reverses direction period-on-period (strictly rising or strictly falling)
- **volatile** — the series has at least one reversal

A monotonic deteriorating trend is a stronger signal than a volatile one because there is no evidence of any improvement step. A breach-and-recovered metric will always be classified volatile (by definition), which the breach info object discloses independently.

---

**Worked example: Getlink FY2019-FY2024 DSCR series**

Raw values: 2.18, 1.37, **0.96**, 1.99, 3.06, 3.29

Before the fix:
- Directional: second half avg (2.78) > first half avg (1.50) × 1.03 → **improving**, severity none
- No breach signal

After the fix:
- Directional: still improving (+50.9% total change)
- Breach detection: \`currentValue = 3.29\` > default 1.00 so not currently breached; \`worstValue = 0.96\` < 1.00, so \`everBreachedDefault = true\`
- **State: breached_and_recovered**
- **Severity promoted from none → moderate**
- The full Covid-era breach is now visible in the response, and a reviewer can see both "the deal is improving" and "the deal briefly failed its DSCR covenant" at the same time.

**Worked example: Getlink FY2019-FY2024 opex series**

Raw values: €525m, €488m, €481m, €720m, €850m, €781m

Before the fix:
- Directional: second half avg (€784m) > first half avg (€498m) × 1.03 → **improving**
- Incorrect: opex growing by 48% is bad news.

After the fix:
- Direction preference: opex = lower-is-better
- Raw move: up (+48% total change)
- Preference + move: lower-is-better + up → **deteriorating**
- Severity: critical (total change > 20%)

---

**Persistence**
Deteriorating trends are written to the \`trend_records\` table with the latest financial period ID, so the grading engine and score computations can consume them. Improving and stable trends are returned in the API response but not persisted.

---

**Known limitations**
- Thresholds are currently hardcoded in \`_BREACH_THRESHOLDS\`. A future enhancement should load per-deal thresholds from the \`covenants\` table.
**Two ratios per deal:**
- **Cash cover ratio:** Always Senior DSCR. If DSCR is unavailable, falls back to PMICR or ICR.
- **Primary collateral ratio:** Selected per deal at ingestion (LLCR, Net Debt:EBITDA, LTV, RAR, etc.). Changeable by admin only.

**Headroom change calculation:**
For higher-is-better ratios: headroom = value - default threshold.
For lower-is-better ratios: headroom = default threshold - value.
Headroom change % = (actual headroom - expected headroom) / |expected headroom| x 100.
Positive = Headroom Improvement (deal above plan). Negative = Headroom Erosion (deal below plan). Zero = Flat.

Where no DSCR default is specified (common in US deals), the engine assumes 1.0x.

**7-band symmetric delta classification:**
- Large improvement (delta > +large_threshold)
- Moderate improvement (+small < delta <= +large)
- Small improvement (+1% < delta <= +small)
- Flat (-1% <= delta <= +1%)
- Small erosion (-small <= delta < -1%)
- Moderate erosion (-large <= delta < -small)
- Large erosion (delta < -large)

Default thresholds: small = 2.5pp, large = 5.0pp, flat tolerance = 1.0pp (separate configs for cash cover vs collateral).

**Period requirements:**
- 2 periods: single delta, drift detection only
- 3+ periods: two deltas (delta1 + delta2), persistent drift detection

**Persistent erosion drift:**
TRUE if three consecutive periods show worsening headroom erosion (each period more negative than the last). Catches compounding small movements.

**Direction classification matrix (12 rows):**
Based on delta2 band, delta1 band, and persistent drift flag. Produces 5 distinct directions:
- **Improving rapidly** (large improvement in delta2)
- **Improving** (moderate or small improvement in delta2)
- **Flat** (delta2 flat without persistent drift; or small/moderate erosion reversed by improvement in delta1)
- **Deteriorating** (flat with persistent drift; moderate erosion; large erosion after improvement)
- **Deteriorating rapidly** (large erosion without prior improvement)

**Overall deal trend** = worst of the two ratio directions.

**Severity mapping:**
- Deteriorating rapidly = high severity
- Deteriorating = moderate severity
- All others = none

Persistent drift flags for analyst attention but does NOT auto-trigger watchlist.`,
  },
  {
    id: "score",
    name: "Score",
    category: "Performance & Grading",
    summary: "0-100 composite score from covenant, variance, trend, and compliance components.",
    detail: `The overall deal score is a weighted composite of four component scores, each on a 0-100 scale.

**Component weights:**
- Covenant: **40%** — based on recent covenant test tier results
- Variance: **20%** — based on forecast variance materiality
- Trend: **20%** — based on performance trend direction
- Compliance: **20%** — based on obligation delivery timeliness

**Covenant component score** (from last 10 covenant tests):
- Performing = 25 points per test
- Distribution lockup = 15 points
- Trigger event = 5 points
- Event of default = 0 points
- Score = average of test scores, scaled to 0-100

**Variance component score:**
Starts at 100, deducts average penalty from variance materiality:
- Critical variance: −35 points
- Material variance: −22 points
- Notable variance: −10 points
- Minor variance: −3 points

**Score → Grade mapping:**
- ≥ 85 → Grade 1 (Outperforming)
- 60–84 → Grade 2 (In Line)
- 40–59 → Grade 3 (Underperforming)
- < 40 → Grade 4 (Watchlist)

**Score → Monitoring posture:**
- ≥ 70 → Standard monitoring
- 45–69 → Enhanced monitoring (HAM escalation)
- < 45 → Watchlist (PM escalation)`,
  },
  {
    id: "auto-watchlist",
    name: "Auto-Watchlist",
    category: "Performance & Grading",
    summary: "Automatic watchlist flagging when grade or trend deteriorates beyond thresholds.",
    detail: `A deal is automatically placed on the watchlist when either condition is met:

1. **Performance grade ≥ 3** (Underperforming or Watchlist)
2. **Performance trend** is "deteriorating" or "deteriorating_rapidly"

The watchlist flag is set on the deals table: \`deals.watchlist = TRUE\`.

When the grade improves below 3 AND the trend improves to "flat" or "improving", the watchlist flag is automatically cleared.

**Alerts generated:**
- Grade downgrade → "high" severity activity event
- Grade upgrade → "info" severity
- Deteriorating rapidly → "high" severity
- Deteriorating → "medium" severity`,
  },
  // ── Covenant & Ratio Analysis ──
  {
    id: "covenant-testing-engine",
    name: "Covenant Testing Engine",
    category: "Covenant & Ratio Analysis",
    summary: "Runs every configured covenant threshold against the latest actual period and writes tiered test results to the database.",
    detail: `The Covenant Testing Engine is the workhorse of period-end compliance. It runs via \`POST /api/deals/{slug}/analytics/run-covenant-tests\` and:

1. **Resolves an actual period.** By default the latest. Callers can pass \`{"periodFlag": "2026Q1"}\` to test a specific period.

2. **Loads all configured thresholds** from \`covenant_thresholds\` for the deal. Each threshold has: covenant_name, ratio_name, composition_tag, direction (\`min\` or \`max\`), and up to three threshold levels: lockup, trigger, default.

3. **Resolves the ratio value** from the actual period. The engine looks in three sources in priority order:
   - \`actual_periods.platform_computed_ratios\` (ratios the platform recalculated from raw metrics — preferred)
   - \`actual_periods.borrower_reported_ratios\` (borrower's own compliance certificate)
   - \`actual_periods.actual_metrics\` (raw metric values)

   First match wins. Any mismatch between platform and borrower numbers is surfaced separately by the Ratio Reconciliation Engine.

4. **Assigns a tier** for each covenant:
   - For \`min\` direction (e.g. DSCR ≥ 1.20x): performing if value ≥ lockup, distribution_lockup if between trigger and lockup, trigger_event if between default and trigger, event_of_default if below default
   - For \`max\` direction (e.g. Net Debt / EBITDA ≤ 6.00x): comparisons reversed

5. **Computes headroom** to each threshold. Sign-aware: for \`max\` direction covenants the headroom is inverted so that positive always means "more cushion".

6. **Persists one row per threshold** to \`covenant_tests\` with: actual_period_id, threshold_id, ratio value, borrower value (if different), all three headrooms, tier status, and source citation.

7. **Updates deal-level overall status.** The deal's \`overall_covenant_status\` is set to the worst tier across all covenants (rank: performing < distribution_lockup < trigger_event < event_of_default).

8. **Tracks consecutive lockup periods.** If the overall status is lockup or worse, \`consecutive_lockup_periods\` is incremented; otherwise reset to 0. This feeds the cash sweep / distribution assessment logic.

**Inputs:** \`actual_periods\`, \`covenant_thresholds\`
**Outputs:** \`covenant_tests\` rows, \`deals.overall_covenant_status\`, \`deals.consecutive_lockup_periods\`
**Downstream consumers:** Performance Grade engine, Distribution Assessment engine, the Covenant Status and Headroom analytics on this page.`,
  },
  {
    id: "covenant-status",
    name: "Covenant Status",
    category: "Covenant & Ratio Analysis",
    summary: "Four-tier classification of covenant compliance: Performing, Lock-Up, Trigger, Default.",
    detail: `Each covenant ratio is tested against three threshold levels:

**Tier determination (for "min" direction covenants like DSCR):**
- **Performing:** Actual value ≥ lockup level
- **Distribution Lock-Up:** Actual value < lockup level but ≥ trigger level
- **Trigger Event:** Actual value < trigger level but ≥ default level
- **Event of Default:** Actual value < default level

For "max" direction covenants (like Net Debt / EBITDA), the comparisons are reversed.

**Headroom percentage:** ((Actual − Lockup) / Lockup) × 100
A positive headroom means the deal is above the lockup threshold.`,
  },
  {
    id: "headroom",
    name: "Headroom",
    category: "Covenant & Ratio Analysis",
    summary: "Percentage distance between actual ratio and the lockup covenant threshold.",
    detail: `**Formula:** ((Actual Value − Lockup Threshold) / Lockup Threshold) × 100

**Example:** If DSCR actual = 1.32x and lockup = 1.20x:
Headroom = ((1.32 − 1.20) / 1.20) × 100 = 10.0%

**Interpretation:**
- Positive headroom = ratio is above the lockup threshold (performing)
- Zero = exactly at the lockup threshold (lock-up imminent)
- Negative = ratio has breached the lockup threshold

The portfolio-level "Avg Headroom" KPI is an exposure-weighted average of deal-level headroom percentages.`,
  },
  {
    id: "variance-materiality",
    name: "Variance Materiality",
    category: "Covenant & Ratio Analysis",
    summary: "Classification of how material the difference between actual and expected values is.",
    detail: `Variance materiality is classified by metric type:

**DSCR metric (absolute variance):**
- Critical: |variance| ≥ 0.10x
- Material: |variance| ≥ 0.05x
- Notable: |variance| ≥ 0.02x
- Minor: |variance| < 0.02x

**Percentage metrics (e.g. leased capacity, completion %):**
- Critical: |variance| ≥ 6 percentage points
- Material: |variance| ≥ 3 pp
- Notable: |variance| ≥ 1 pp
- Minor: |variance| < 1 pp

**Other metrics (percentage-based variance):**
- Critical: |variance %| ≥ 10%
- Material: |variance %| ≥ 5%
- Notable: |variance %| ≥ 2%
- Minor: |variance %| < 2%`,
  },
  {
    id: "variance-engine",
    name: "Variance Engine (actuals vs management case)",
    category: "Covenant & Ratio Analysis",
    summary: "Compares each reported actual metric against the management case forecast for the same period, classifies direction and materiality, and persists the result.",
    detail: `The Variance Engine answers the fundamental question "is the deal tracking plan?". It runs via \`POST /api/deals/{slug}/analytics/run-variance\` and is the primary source of the variance numbers shown on deal pages and the portfolio dashboard.

**Step-by-step:**

1. **Resolve the actual period** (latest by default, or \`{"periodFlag": "2026Q1"}\`).

2. **Find the matching forecast period** from the active management case:
   - Primary lookup: \`forecast_case_periods\` joined to \`forecast_case_versions\` with \`is_active = TRUE\` and \`case_type = 'management_case'\`
   - Fallback 1: any forecast case with \`drives_monitoring = TRUE\`
   - Fallback 2: \`financial_periods.expected_metrics\` for legacy deals

3. **For every metric in the actual period that has a matching forecast value**, compute:
   - \`variance_value\` = actual − forecast
   - \`variance_pct\` = (variance_value / forecast) × 100
   - \`direction\` = favourable (variance ≥ 0) or adverse (variance < 0)

4. **Classify materiality:**
   - ≥ 10% absolute: material
   - 5–10%: notable
   - < 5%: immaterial

5. **Persist** to \`financial_variances\` (one row per metric) if the period has a matching \`financial_periods\` row. Old variances for the same period are deleted first.

**Note on direction semantics:** The engine treats "variance ≥ 0" as favourable across all metrics, which means it shares the same limitation as the old Trend Detection engine did: a positive variance on opex (costs above plan) is technically "favourable" under this rule but is actually bad news. The upcoming enhancement will apply the same direction preference map used by the Trend Detection Engine.

**Output:** per-metric variance list with \`actualValue\`, \`forecastValue\`, \`varianceValue\`, \`variancePct\`, \`direction\`, \`materiality\`, plus counts of total metrics and material variances.

**Downstream consumers:** Performance Grade engine (feeds variance score), the Score rule (20% weight), the Variance Materiality analytic displayed on the portfolio summary.`,
  },
  {
    id: "three-case-comparison-engine",
    name: "Three-Case Comparison Engine",
    category: "Covenant & Ratio Analysis",
    summary: "Compares actuals simultaneously against management case, credit case, and combined downside — escalates when actuals breach the floor.",
    detail: `Where the Variance Engine compares actuals to only the management case, the Three-Case Comparison Engine runs the same comparison against all three tiers of forecast simultaneously and classifies the overall signal based on which tier (if any) has been breached. It runs via \`POST /api/deals/{slug}/analytics/three-case-comparison\`.

**The three cases:**

| Case | Role | Used for |
|---|---|---|
| \`management_case\` (priority 1) | primary | Drives grade and monitoring actions |
| \`credit_case\` (priority 2) | secondary | Lender/borrower comparator — informational only |
| \`combined_downside\` (priority 3) | floor | Breach triggers alarm escalation |

All three cases must be populated in \`forecast_cases\` with matching \`forecast_case_versions\` and period entries in \`forecast_case_periods\` for the actual period's \`period_flag\`.

**Per-case processing:**
For each case, every metric present in both the actuals and the forecast is compared. The engine computes variance value, variance percentage, direction (favourable / adverse), and materiality (material / notable / immaterial — same thresholds as the Variance Engine). Results are sorted by absolute variance percentage descending.

**Downside breach tracking:**
Any metric that is both adverse AND at least notable material in the combined downside case is captured as a "downside breach" — these are the cases where actuals have fallen below the stressed floor lenders modelled. Each breach records the actual value, the floor value, the shortfall, and the shortfall percentage.

**Overall signal classification (first match wins):**

1. **alarm** — any downside breach exists. Message: "Actuals have breached the combined downside on N metric(s) — escalation recommended."
2. **warning** — no downside breach but management case has material adverse variances. Message: "Management case shows N material adverse variance(s) — grade impact likely."
3. **monitor** — only minor adverse variances vs management case. Message: "Minor adverse variances vs management case — continue monitoring."
4. **clear** — actuals tracking at or above all forecast cases. Message: "Actuals are tracking at or above all forecast cases."

**Output:** \`overallSignal\`, \`signalSummary\`, \`downsideBreaches[]\`, and one \`cases[]\` entry per forecast case containing its role, signal note, variance list, and counts.

**Why this engine exists in addition to the Variance Engine:** the Variance Engine focuses on plan vs actual for monitoring purposes. The Three-Case Comparison Engine focuses on *structural underwriting integrity* — "are we still within the risk envelope we underwrote to?" A deal can be adverse to management case but still well above the combined downside, in which case no IC action is needed. Conversely, a deal that breaches the combined downside demands an escalation meeting regardless of how the management case comparison looks.`,
  },
  {
    id: "ratio-reconciliation-engine",
    name: "Ratio Reconciliation Engine",
    category: "Covenant & Ratio Analysis",
    summary: "Compares the borrower's reported covenant ratios against the platform's independently computed ratios from the same raw metrics.",
    detail: `When a borrower submits a compliance certificate they provide **both** the raw metric values and the calculated ratios. The Ratio Reconciliation Engine recomputes those ratios from the raw metrics using the platform's own formulas and compares the results.

**Purpose:** to catch cases where the borrower has mis-calculated a covenant (whether deliberately or by accident). A borrower reporting DSCR as 1.35x when the underlying metrics imply 1.18x is a red flag that requires immediate follow-up.

**Data model:**
- \`actual_periods.borrower_reported_ratios\` JSONB — what the borrower said
- \`actual_periods.platform_computed_ratios\` JSONB — what the platform calculates
- \`actual_periods.ratio_reconciliation_detail\` JSONB — per-ratio diff
- \`actual_periods.ratio_reconciliation_status\` — overall status: \`matched\`, \`discrepancy\`, \`unreconciled\`

**The engine itself** runs as part of the ingestion pipeline (not a standalone API endpoint). When an actual period is ingested:
1. The platform parses raw metrics from the compliance certificate or financial statements
2. It runs the platform covenant formulas to compute each ratio independently
3. It compares each platform-computed ratio against the borrower-reported version
4. Differences beyond a tolerance are flagged in \`ratio_reconciliation_detail\`

**Tolerance:** a ratio match is considered valid if the difference is less than the smaller of 0.01 (one hundredth) or 1% of the larger value. Anything outside tolerance gets a \`discrepancy\` flag.

**Retrieval:** \`GET /api/topsheet/{slug}/reconciliation/{period_flag}\` returns the reconciliation detail for a specific period. The Covenant Testing Engine uses the platform-computed ratio when available, falling back to the borrower-reported value only when the platform cannot recompute independently.

**Why this matters:** covenant testing is often a dispute flashpoint. Having an independent platform calculation that matches (or doesn't match) the borrower's number gives the portfolio manager an objective basis for negotiation. If the borrower is right, the match is obvious. If the borrower is wrong, the discrepancy is documented with the underlying raw metrics as evidence.`,
  },
  // ── Portfolio Aggregations ──
  {
    id: "wa-rating",
    name: "Weighted Average Credit Rating",
    category: "Portfolio Aggregations",
    summary: "Exposure-weighted average credit rating across the portfolio, displayed on the Moody's scale.",
    detail: `**All ratings are converted to the Moody's scale** for consistency. S&P and Fitch ratings are mapped to their Moody's equivalents (e.g. BBB- = Baa3, A+ = A1). The Credit Rating chart on the portfolio summary also displays all ratings on the Moody's scale.

**Step 1 — Assign numeric value per deal:**

Each rating maps to a number on a unified scale (lower = better):
Aaa = 1, Aa1 = 2, Aa2 = 3, Aa3 = 4, A1 = 5, A2 = 6, A3 = 7,
Baa1 = 8, Baa2 = 9, Baa3 = 10, Ba1 = 11, Ba2 = 12, Ba3 = 13, ...

S&P/Fitch equivalents: AAA = Aaa (1), AA+ = Aa1 (2), BBB = Baa2 (9), BBB- = Baa3 (10), etc.

**Step 2 — Select the assigned rating for each deal:**
- If rated by **3 agencies** (Moody's, S&P, Fitch): use the **middle** rating (median)
- If rated by **2 agencies**: use the **lower** of the two (more conservative)
- If rated by **1 agency**: use that rating
- If **not externally rated**: use the **internal credit score** from the IC memo (updatable by the HAM)

**Step 3 — Compute the portfolio weighted average:**
WA Rating (numeric) = ROUND(SUM(Exposure x Assigned Rating Numeric) / SUM(Exposure))

**Step 4 — Convert back to Moody's scale:**
The rounded numeric result is mapped back: 9 = Baa2, 10 = Baa3, etc.

**Example:** A portfolio with 60% BBB/Baa2 (9) and 40% BBB+/Baa1 (8) gives WA = 8.6, rounded to 9 = Baa2.`,
  },
  {
    id: "wa-dscr",
    name: "Weighted Average DSCR",
    category: "Portfolio Aggregations",
    summary: "Exposure-weighted average of deal-level reported DSCRs across the filtered portfolio.",
    detail: `**Formula:** SUM(Exposure × Reported DSCR) / SUM(Exposure)

Only deals with a non-null reported DSCR are included in the calculation. If all deals have null DSCR, the result is shown as "—".

The weighting by exposure means larger deals have proportionally more influence on the portfolio average.`,
  },
  {
    id: "wa-spread",
    name: "Weighted Average Spread",
    category: "Portfolio Aggregations",
    summary: "Exposure-weighted average margin (bps) from capital structure instruments across the portfolio.",
    detail: `**Per-deal calculation:** WA Spread = ROUND(SUM(Drawn Amount × Margin BPS) / SUM(Drawn Amount))
Computed from active capital structure instruments where drawn amount > 0 and margin is not null.

**Portfolio-level:** SUM(Deal Exposure × Deal WA Spread) / SUM(Deal Exposure)

This gives the blended cost of debt across the portfolio, weighted by how much exposure we have in each deal.`,
  },
  {
    id: "wa-life",
    name: "Weighted Average Life",
    category: "Portfolio Aggregations",
    summary: "Exposure-weighted average remaining life (years) of investments in the portfolio.",
    detail: `**Formula:** SUM(Exposure × WAL Years) / SUM(Exposure)

WAL (Weighted Average Life) for each deal is stored on the deals table and represents the weighted average time to receipt of principal repayments.

Only deals with a populated WAL value are included.`,
  },
  // ── Risk Assessment ──
  {
    id: "risk-score",
    name: "Risk Score",
    category: "Risk Assessment",
    summary: "Normalised 0-100 score aggregating all assessed risks with mitigation discounts.",
    detail: `Each risk in the deal risk register has a score = Likelihood (1-5) × Severity (1-6), max 30.

**Risk level weights** (applied to the raw score):
- Negligible: ×1, Low: ×2, Moderate: ×3, High: ×5, Critical: ×8, Fatal: ×13

**Mitigation discounts** (multiplicative):
- Party mitigation: M1 (none) = 1.0, M2 (reputational) = 0.95, M3 (contractual) = 0.80, M4 (insured) = 0.60, M5 (guaranteed) = 0.40
- Capital mitigation: C1 (none) = 1.0, C2 (comfort) = 0.95, C3 (reserve) = 0.75, C4 (funded) = 0.55, C5 (overcollateralised) = 0.35

**Per-risk net score:** risk_score × party_discount × capital_discount

**Normalised score:** (SUM of net scores / max possible) × 100

**Risk grade:**
- A: 0–15 (minimal risk)
- B: 15–30 (low risk)
- C: 30–50 (moderate risk)
- D: 50–70 (elevated risk)
- E: 70+ (high risk)`,
  },
  {
    id: "risk-narrative-generator",
    name: "Risk Narrative Generator",
    category: "Risk Assessment",
    summary: "Template-driven deterministic synthesis of risk register narratives from the structured fields (likelihood, severity, trend, KPI, mitigant, owner).",
    detail: `Historically the narrative shown on the Risk Register card of the deal page was a free-text \`summary\` field stored alongside the structured risk data. This was fine for demo purposes but created three problems:

1. **No guarantee the narrative matched the structured fields.** A risk could be tagged likelihood 4, severity 5, trend deteriorating but have a narrative saying "low risk, stable". Nothing enforced consistency.
2. **Not auditable.** Different deals had narratives written in different styles, at different times, by different people (or AI assistants).
3. **No update on change.** If the likelihood score was revised upwards, the narrative text did not automatically reflect that.

The Risk Narrative Generator replaces free-text with a **template-driven, deterministic** narrative synthesiser implemented in \`server/main.py\` as \`generate_risk_narrative()\`. It assembles up to six sentences from the structured risk register fields using fixed phrase dictionaries. The output is returned as \`generatedNarrative\` on every risk entry from the deal API and displayed on the Risk Register card in place of (or alongside) the free-text summary.

**Sentence templates:**

**Sentence 1 — classification (always present if title exists):**
\`{title} is a {category_phrase} risk currently scored {band} ({score}/30).\`

Category phrase mapping for the nine risk categories is hardcoded (e.g. \`Market & Macro\` → "market and macroeconomic"). Band is derived from the score: 1–4 low, 5–9 medium, 10–14 high, 15–19 very high, 20–30 critical.

**Sentence 2 — likelihood and severity (present if both fields populated):**
\`The probability of occurrence {likelihood_phrase} ({L}/5) with {severity_phrase} if it crystallises ({S}/6).\`

Likelihood phrase mapping: 1 is remote, 2 is unlikely, 3 is possible, 4 is likely, 5 is almost certain. Severity phrase mapping: 1–6 maps to negligible / low / moderate / high / critical / fatal capital impact.

**Sentence 3 — trend (present if trend field populated):**
Maps \`improving\`, \`stable\`, \`deteriorating\`, \`deteriorating_rapidly\`, \`new\` to a corresponding "The risk has been {…} over recent reviews." sentence.

**Sentence 4 — monitoring KPI (present if monitoring_kpi set):**
\`Monitored via the "{monitoring_kpi}" indicator.\`

**Sentence 5 — mitigant (present if mitigant is populated and not "none", "n/a", or empty):**
\`Mitigant in place: {mitigant}.\`

**Sentence 6 — ownership (present if owner_name set):**
\`Owned by {owner_name}; next review scheduled for {next_review_date}.\`

**Properties:**
- **Deterministic:** same inputs always produce the same output. Pure template substitution.
- **Auditable:** every sentence maps back to a specific structured field. You can trace any word in the narrative to its source column.
- **Fails gracefully:** any missing field simply omits its sentence; the narrative always renders something useful as long as there is a title.
- **No external dependencies:** pure Python string templates, no LLM calls, no per-deal cost, no rate limits, no hallucinations.
- **Update-on-change:** because it is computed at API query time, editing a likelihood score or trend field automatically updates the narrative on the next fetch.

**Example output for M6 Toll RISK-MK-001:**

> "Traffic Volume Decline (HS2 disruption) is a market and macroeconomic risk currently scored very high (16/30). The probability of occurrence is likely (4/5) with high capital impact if it crystallises (4/6). The risk has been deteriorating over recent reviews. Monitored via the 'Annual Traffic' indicator. Mitigant in place: See risk detail. Owned by Portfolio Manager; next review scheduled for 2026-10-09."

**Location:**
- Server: \`server/main.py\` function \`generate_risk_narrative(row)\`
- Phrase dictionaries: \`_LIKELIHOOD_PHRASE\`, \`_SEVERITY_PHRASE\`, \`_TREND_PHRASE\`, \`_CATEGORY_PHRASE\`
- Band helper: \`_score_band(score)\`
- Injected into API response via \`serialize_risk_entry()\` as the \`generatedNarrative\` field
- Client: Risk Register card on the deal page prefers \`entry.generatedNarrative\` over \`entry.summary\``,
  },
  {
    id: "deviation-to-stress",
    name: "KPI Deviation to Stress",
    category: "Risk Assessment",
    summary: "Measures how far an actual KPI has drifted from base case toward the IC memo stress case.",
    detail: `**Formula:** (Base Case Target − Observed Value) / (Base Case Target − Stress Case Target) × 100

**Interpretation:**
- **0%** = performing exactly at the base case (no deviation)
- **50%** = halfway between base case and stress case
- **100%** = at the stress case threshold
- **>100%** = worse than the stress case

**For "lower is better" metrics** (e.g. PUE), the formula adjusts so that a higher observed value (worse) produces a positive deviation.

**Status thresholds:**
- on_track: deviation < 25%
- watch: 25% ≤ deviation < 60%
- approaching_stress: 60% ≤ deviation < 100%
- breached_stress: deviation ≥ 100%`,
  },
  {
    id: "revenue-risk-taxonomy",
    name: "Revenue Risk Classification (P-V-D)",
    category: "Risk Assessment",
    summary: "Three-axis taxonomy classifying how revenue is earned: Pricing mechanism, Volume mechanism, and Duration match to debt.",
    detail: `Every deal is classified on three independent axes that together describe the nature of its revenue stream. The composite code (e.g. "P3-V5-D5") is a shorthand for the underlying risk profile, and lower numbers always mean lower risk.

**Axis 1 — Pricing mechanism (P1 to P6):** How is the price per unit of output determined?
- **P1 — Fixed by contract (lowest risk):** Unit price is locked in for the life of the deal by a long-term offtake or availability contract. Examples: PPP unitary charge, availability-based contracts, long-dated PPAs with fixed price.
- **P2 — Indexed / escalating by formula:** Price is set by a contractual formula, typically linked to CPI, RPI or a commodity index. Cashflow is predictable in real terms but carries formula risk.
- **P3 — Regulated / administered:** Price is set within a regulatory or concession framework. The operator has some discretion but cannot price freely; political and regulatory considerations constrain increases. Examples: regulated utilities (RAB), concession-governed toll roads.
- **P4 — Negotiated / re-contracted periodically:** Price resets at contract renewal points (every 3–10 years). Market conditions determine renewal economics. Examples: commercial real estate rent reviews, PPA renewals.
- **P5 — Market / merchant pricing (highest risk):** Price fluctuates day-to-day with market conditions. No contractual protection. Examples: merchant power, spot container handling, commodity sales.
- **P6 — Hybrid / layered pricing:** Multiple pricing mechanisms coexist (e.g. partial contracted + merchant tail). Scored based on the weighted mix.

**Axis 2 — Volume mechanism (V1 to V6):** How are the volumes of output determined, and who bears the demand risk?
- **V1 — Guaranteed / take-or-pay (lowest risk):** Offtaker commits to pay for minimum volumes regardless of usage. True take-or-pay structures or availability payments. Lender has no volume risk.
- **V2 — Contracted with performance conditions:** Volumes committed subject to performance KPIs (availability, quality). Performance failure reduces payment but offtaker commitment remains.
- **V3 — Partially contracted:** A portion of capacity is contracted (often 50–80%); the remainder is merchant. Typical mixed-model infrastructure such as ports with anchor tenant contracts plus spot business.
- **V4 — Demand-driven, essential / inelastic:** No contracted volumes but demand is essential or highly inelastic (e.g. water, regulated electricity distribution, essential transport). Drivers cannot easily substitute.
- **V5 — Demand-driven, elastic / discretionary:** No contracted volumes and demand is discretionary with viable substitutes. Competitive alternatives exist. Examples: toll roads with free parallel routes, discretionary consumer leisure assets, merchant generation.
- **V6 — Speculative / project-dependent (highest risk):** Demand depends on development outcomes, new customer acquisition, or unproven markets. Pre-operational assets, greenfield with no demand track record.

**Axis 3 — Duration match (D1 to D5):** What proportion of the debt tenor is covered by contracted revenue streams?
- **D1 — Fully matched or over-hedged:** Contracted revenue extends through debt maturity. No refinancing risk at merchant prices.
- **D2 — Substantially matched (>80% coverage):** Contracted revenue covers more than 80% of the debt tenor. Modest tail risk.
- **D3 — Partially matched (50–80% coverage):** Half or more of debt tenor covered by contracted revenue, with a merchant tail.
- **D4 — Under-matched (<50% coverage):** Less than half of debt tenor covered by contracted revenue. Significant merchant tail risk.
- **D5 — No contracted revenue / fully merchant (highest risk):** Zero contracted revenue. The entire debt is repaid from merchant cashflows. Duration match is not measured in concession life but in contracted revenue life.

**Key interpretive principle — Duration axis:**
Duration is a measure of **contracted revenue coverage of debt**, not concession life or asset life. A 53-year concession on a merchant toll road is still D5 if the underlying revenue is 100% merchant. The concession framework provides legal certainty but no cashflow certainty.

**Common profiles:**
- **P1-V1-D1:** PFI/PPP availability-based social infrastructure. The safest profile.
- **P2-V1-D1:** Long-dated wind farm with CfD/PPA at formula-indexed price covering debt.
- **P2-V3-D3:** Port with anchor container tenant take-or-pay for part of capacity, spot business on top.
- **P3-V4-D1:** Regulated water or power distribution. Essential service, regulated price, coverage to maturity.
- **P3-V5-D5:** Merchant toll road under a concession framework. Regulated pricing, elastic demand with free alternatives, fully merchant revenue. **(M6 Toll profile)**
- **P5-V6-D5:** Speculative merchant generator with no PPA. Highest-risk profile.

**How P-V-D flows into other analytics:**
- Drives the deal-level \`revenue_risk_level\` (low/medium/high)
- Informs contracted_revenue_pct and merchant_revenue_pct for the TopSheet
- Feeds the portfolio-level revenue risk distribution chart on JPS
- Used in the performance grade engine as an input to collateral stress scaling`,
  },
  {
    id: "tail-construct",
    name: "Tail (Debt Maturity vs Revenue Anchor)",
    category: "Risk Assessment",
    summary: "The gap between the end of contracted / concessional revenue and the latest debt maturity. Positive, matched, or negative (merchant tail).",
    detail: `The "tail" measures the time gap between the latest debt maturity and the end of the deal's contracted or concessional revenue stream. It is a critical refinancing and recovery-risk metric.

**Formula:**
\`tail_years = tail_anchor_date − latest_debt_maturity_date\`

The latest debt maturity is taken from \`capital_structure_instruments.maturity_date\` across all tranches. The anchor date depends on the deal type (see below).

**Anchor types:**

**1. Concession anchor (concession infrastructure — PPPs, toll roads, airports)**
- Anchor = Concession expiry date
- Typical tail = 0 to 2 years (hard cliff)
- Residual value at concession end = zero (asset handed back to government for no consideration)
- Debt must be fully repaid before concession expiry; there is no value beyond the concession life
- A negative tail here would be fatal: the concession cannot support debt service past its expiry
- **Examples:** UK PFI projects (unitary charge + hand-back); M6 Toll (53-year concession to 2054, external debt 2042-2050, ~3 year positive tail); Spanish toll road concessions
- **Key principle:** Lenders treat the concession end as a hard brick wall. The tail is simply a cushion for refinancing friction, unforeseen delays, or final cash sweep clean-up.

**2. Primary contract anchor (renewables, PPP operations)**
- Anchor = End of primary revenue contract (PPA, CfD, unitary charge, lease)
- Tail can be positive OR negative
- Residual value = retained asset (project continues post-contract, potentially earning merchant revenue)
- **Negative tail = "merchant tail":** debt extends beyond contracted revenue, so the back-end of the debt is repaid from uncontracted cashflows
- Common in UK offshore wind (15-year CfD, 20-25 year debt), solar (10-15 year PPA, longer debt)
- **Examples:** Wigmore Solar (PPA anchor, potential merchant tail); North Sea OWF (15-year CfD with merchant tail in later years)
- **Key principle:** A negative tail is acceptable if lenders believe in the merchant price curve. Stress cases typically apply a ~50% haircut to merchant revenue in the tail period.

**3. Asset life anchor (corporate infrastructure, data centres, real estate)**
- Anchor = End of economic useful life, or WAULT of underlying customer contracts
- Tail measurement is more judgemental — no single contract defines the anchor
- Residual value = retained asset; refinanceable
- **Examples:** Hyperscale data centres (customer leases 10-20yrs, asset life 25-30yrs); commercial real estate (WAULT of tenants)

**Classification bands:**
| Band | tail_years | Interpretation |
|---|---|---|
| Positive tail | > +0.25 years | Contracted revenue / concession outlives debt. Lender-friendly. |
| Matched | within ±0.25 years | Perfectly sized debt. Zero cushion. |
| Negative tail (merchant) | < −0.25 years | Debt extends beyond contracted cashflow. Refinancing / merchant risk. |

**Residual value treatments:**
| Treatment | Meaning |
|---|---|
| zero_residual | Asset handed back at zero value (concession structures) |
| nominal_residual | Minimal residual cash (clean-up costs roughly offset scrap value) |
| retained_asset | Asset retained; refinancing or sale is possible post-anchor |

**How the tail construct flows through the platform:**
- Stored as \`tail_anchor_type\`, \`tail_anchor_date\`, \`tail_anchor_label\`, \`tail_residual_value_treatment\`, \`tail_notes\` on the \`deals\` table
- Computed \`tail_years\` and \`classification\` returned from \`/api/deals/{slug}/topsheet\` alongside the deal row
- Displayed on the TopSheet page Deal Identity section with a colour-coded badge (green = positive, grey = matched, red = negative)
- Feeds refinancing risk and collateral coverage assessment
- Drives the selection of which stress cases apply to the deal (merchant tail stress, concession hand-back stress)

**Relationship to Revenue Risk (P-V-D):**
The tail concept is the dynamic counterpart to the static D (Duration) classification in P-V-D:
- **D1-D2 (>80% coverage)** typically corresponds to positive or matched tail
- **D3-D4 (partial coverage)** typically corresponds to negative tail / merchant tail
- **D5 (fully merchant)** means tail is either measured against concession life (if applicable) or is undefined

For the M6 Toll: D5 (fully merchant revenue) but **positive 3-year concession tail** — the concession framework provides the anchor even though no revenue is contractually guaranteed within it.`,
  },
  {
    id: "renewal-profile",
    name: "Contract & Concession Renewal Profile",
    category: "Risk Assessment",
    summary: "Five-profile classification of how a deal renews its primary revenue source, combined with a 2-D matrix against the tail construct to flag structural weaknesses.",
    detail: `Contract and concession renewal is one of the most consistently under-priced risks in infrastructure debt. A borrower stating "we'll get an extension" is not a structural feature that lenders should underwrite against. This analytic codifies renewal risk into a structured framework with automated flagging.

**The core principle:**
**Borrowers should never rely on concession renewal to provide sufficient revenue to repay their debts.** A rational government will charge fair value for any concession extension on a valuable asset. Lenders underwriting on the assumption of free extension are taking uncompensated risk.

---

**The five renewal profiles**

Every deal is classified on exactly one renewal profile:

**1. \`deep_market_repricing\` — Low risk**
- Asset re-contracts at prevailing market prices into a liquid, observable market
- Market depth provides strong refinanceability even without contractual certainty
- Historical repricing outcomes provide an objective evidence base
- **Examples:** Hub airport airline contracts, hyperscale data centre customer leases, commercial real estate rent reviews in prime locations
- **Lender comfort:** Moderate reliance on post-contract cashflows (up to ~50%) is typically acceptable

**2. \`bilateral_negotiation\` — Medium risk**
- Renewal depends on negotiation with a specific counterparty
- Counterparty bargaining power is a key risk driver
- Regulatory backstops may provide fallback pricing
- **Examples:** Renewable PPAs with utility offtakers, corporate property leases with key tenant, concession extensions with grantor
- **Lender comfort:** Limited reliance (up to ~25-30%) acceptable, stress testing required

**3a. \`competitive_tender_asset_retained\` — Medium-high risk**
- Renewal requires winning a competitive tender against new bidders, BUT the incumbent retains material asset ownership across the retender
- Incumbent has a durable economic advantage (equipment, rolling stock, owned infrastructure, trained workforce)
- The incumbent can bid more aggressively because retained asset value reduces the capital the new entrant saves by not buying in
- **Examples:** Rail franchise where rolling stock is separately owned, port concession with privately-owned cranes, airport retail concessions with retained fit-out
- **Lender comfort:** Limited reliance (~10-25%) acceptable, explicit stress case required

**3b. \`competitive_tender_clean_sheet\` — Deterministic zero (treat as hand-back)**
- Renewal requires winning a competitive tender with NO durable incumbent advantage
- All economically valuable assets revert to the grantor before the retender (pure concession)
- A new entrant with zero legacy debt starts on equal footing with the incumbent
- **The incumbent legacy debt disadvantage:** An incumbent carrying £100M of legacy debt cannot economically out-bid a clean-sheet competitor. The clean-sheet bidder can always bid more aggressively because they don't have to service legacy debt. Any economically rational bid will defeat the incumbent.
- **Examples:** Full PFI hand-back with competitive re-tender, pure toll road concession re-tender
- **Lender comfort:** **Zero reliance permitted.** Any positive \`debt_repayment_from_renewal_pct\` is a HARD FAIL — the incumbent cannot realistically win the retender while carrying legacy debt

**4. \`hand_back_zero_value\` — Deterministic zero**
- No renewal possible. Asset returns to the grantor at the end of the concession for nil consideration.
- Debt MUST be fully repaid before hand-back; there is no residual value to support any residual debt
- **Examples:** UK PFI projects, toll road concessions (M6 Toll), most traditional project finance concession structures
- **Lender comfort:** **Zero reliance permitted.** Any positive \`debt_repayment_from_renewal_pct\` is a structural flaw

**5. \`no_anchor_contract\` — N/A**
- Fully merchant asset with no anchor contract to renew
- Risk is captured in the revenue risk (P-V-D) classification, not here
- **Examples:** Merchant power generators with no PPA, toll roads without concession frameworks

---

**Debt reliance on renewal — the critical metric**

\`debt_repayment_from_renewal_pct\` answers: *"What proportion of debt principal is scheduled to be repaid from post-renewal cashflows?"*

This is distinct from the tail construct, which measures *time* between debt maturity and the revenue anchor. Two deals with the same tail can have very different debt reliance — it depends on the amortisation profile and the cash sweep structure.

| Reliance % | Interpretation |
|---|---|
| **0%** | Debt fully amortised within primary contract / concession. Lender-friendly. |
| **1–25%** | Small merchant tail or renewal tail. Acceptable with stress testing. |
| **25–50%** | Material reliance on renewal. Explicit stress case required. |
| **50–75%** | High reliance. Amber flag. Requires overwhelming confidence in market depth. |
| **>75%** | Extreme reliance. Red flag. Borrower is effectively asking lenders to underwrite the extension. |

---

**The 2-D matrix: Renewal Profile × Tail Classification**

The flag level is computed from the combination of the renewal profile and the tail classification (from the Tail construct):

| | Positive tail | Matched | Negative tail |
|---|---|---|---|
| **deep_market_repricing** | OK | OK | Monitor (amber if >60% reliance) |
| **bilateral_negotiation** | OK | Monitor | Amber (flag if >50% reliance) |
| **competitive_tender_asset_retained** | Monitor | Amber | **Red** |
| **competitive_tender_clean_sheet** | OK (0% reliance only) | **Amber** (0% only) | **HARD FAIL** |
| **hand_back_zero_value** | OK (0% reliance only) | **Amber** (zero cushion) | **HARD FAIL** |
| **no_anchor_contract** | n/a | n/a | n/a |

**The two bottom rows (\`competitive_tender_clean_sheet\` and \`hand_back_zero_value\`) behave identically for hard-fail logic because the economic outcome is the same: the incumbent cannot realistically continue operating the asset beyond the anchor date, either because the asset has been handed back or because they cannot win the clean-sheet retender while carrying legacy debt.**

**Flag levels:**
- **OK (green):** Profile within acceptable bounds
- **Monitor:** No action required, but watch periodic changes
- **Amber:** Requires explicit stress case and lender committee attention
- **Red:** Material structural weakness, watchlist candidate
- **HARD FAIL:** Structurally unsound deal; cannot be justified

---

**Automated flag rules (implemented in the server API)**

The platform computes \`flagLevel\` for every deal on each TopSheet request:

1. \`hand_back_zero_value\` + reliance > 0% → **HARD FAIL** (cashflow after concession = zero)
2. \`hand_back_zero_value\` + negative tail → **HARD FAIL**
3. \`hand_back_zero_value\` + matched tail → **Amber** (no cushion)
4. \`competitive_tender_clean_sheet\` + reliance > 0% → **HARD FAIL** (incumbent legacy debt disadvantage)
5. \`competitive_tender_clean_sheet\` + negative tail → **HARD FAIL**
6. \`competitive_tender_clean_sheet\` + matched tail → **Amber** (no cushion)
7. \`competitive_tender_asset_retained\` + reliance > 25% → **Amber**
8. \`competitive_tender_asset_retained\` + negative tail → **Red**
9. \`bilateral_negotiation\` + reliance > 50% → **Amber**
10. \`bilateral_negotiation\` + negative tail + reliance > 25% → **Amber**
11. \`deep_market_repricing\` + reliance > 60% → **Amber**

**Risk taxonomy entry RISK-REN-007 — Incumbent legacy debt disadvantage**
The risk taxonomy includes a specific entry codifying this principle. Any deal classified as \`competitive_tender_clean_sheet\` should attach RISK-REN-007 to its risk register. The platform does not auto-attach, but the analyst should do so explicitly as part of the IC memo process.

The flag is returned in the \`renewalAnalysis\` object from \`/api/deals/{slug}/topsheet\` and displayed on the TopSheet page alongside the reasons.

---

**Relationship to the existing taxonomy**

The legacy taxonomy had 9 fragmented renewal-adjacent risks scattered across sector categories (RA, RL, EW, RE, OP, ET). These have been consolidated into a new cross-cutting sub-category:

**Category \`REN\` — Contract & Concession Renewal** (under Credit & Financial Risk)
- RISK-REN-001: Contract / concession expiry without renewal
- RISK-REN-002: Renewal into deep liquid market
- RISK-REN-003: Renewal by bilateral negotiation
- RISK-REN-004: Concession auction / competitive tender
- RISK-REN-005: Hand-back at zero consideration
- RISK-REN-006: Reliance on extension assumption

Legacy sector-specific risks are aliased but not deleted — historical assessments remain queryable.

---

**Worked examples**

**M6 Toll (Midland Expressway Limited)**
- \`renewal_profile\`: hand_back_zero_value
- \`debt_repayment_from_renewal_pct\`: 0%
- Tail: +3.07 years positive
- **Flag: OK** — Hand-back with zero reliance and positive tail is the textbook correct structure for a concession asset

**Hypothetical: Concession X with merchant tail**
- Same profile as M6 Toll (hand_back_zero_value)
- \`debt_repayment_from_renewal_pct\`: 40%
- **Flag: HARD FAIL** — 40% of debt has no cashflow source because the asset has been handed back

**Hub airport (hypothetical)**
- \`renewal_profile\`: deep_market_repricing
- \`debt_repayment_from_renewal_pct\`: 45%
- Tail: asset_life anchor, positive
- **Flag: OK** — Deep market for airline slots supports repricing at market; 45% reliance is within the 60% threshold

**Rail franchise with retained rolling stock (hypothetical)**
- \`renewal_profile\`: competitive_tender_asset_retained
- \`debt_repayment_from_renewal_pct\`: 30%
- Tail: negative (debt extends beyond franchise end)
- **Flag: Red** — Competitive tender with negative tail and >25% reliance

**Pure toll road concession retender (hypothetical)**
- \`renewal_profile\`: competitive_tender_clean_sheet
- \`debt_repayment_from_renewal_pct\`: 25%
- Tail: positive (debt amortises within concession, refinancing at expiry)
- **Flag: HARD FAIL** — Incumbent legacy debt disadvantage. A new entrant with zero legacy debt would outbid the incumbent on any economically rational basis, so reliance on winning the retender is structurally unsound.

**Wigmore Solar**
- \`renewal_profile\`: bilateral_negotiation
- \`debt_repayment_from_renewal_pct\`: 20%
- Tail: primary_contract anchor
- **Flag: OK** — 20% reliance is within 50% threshold; bilateral PPA renewal is acceptable

---

**Data model**

The following fields are stored on the \`deals\` table:
\`\`\`
renewal_profile                    TEXT   -- the 5-profile classification
debt_repayment_from_renewal_pct    NUMERIC(5,2)
renewal_notes                      TEXT   -- free-text rationale
\`\`\`

The computed fields (\`profileLabel\`, \`flagLevel\`, \`flagReasons\`) are returned by the API; they are not stored.`,
  },
  {
    id: "onboarding-snapshot",
    name: "Onboarding Snapshot (Frozen at Investment)",
    category: "Risk Assessment",
    summary: "Write-once, immutable capture of the deal position at the moment of investment. Enables performance attribution, IC audit trail, and retrospective diligence.",
    detail: `The TopSheet is primarily a **living record** — fields reflect current state, updated as new data arrives. But for diligence, retrospective review, and performance attribution, you need a **frozen snapshot** of what the deal looked like at the moment of investment.

The onboarding snapshot answers two distinct questions:
1. **Performance attribution:** "How much of today's situation was known at origination, and how much has developed since?"
2. **IC audit trail:** "What exactly did the IC sign off on, and are we still within those bounds?"

---

**Refresh semantics — write-once with supersession**

Onboarding snapshots are **immutable once created**. The database enforces this via a trigger:
- Content fields on a current snapshot cannot be updated
- A snapshot can only transition from \`is_current = TRUE\` → \`is_current = FALSE\` (supersession)
- A superseded snapshot cannot be edited at all
- Any edit attempt raises a PostgreSQL exception

**When the deal is genuinely re-underwritten** (restructuring, covenant reset, refinancing, change of control), a new snapshot row is created:
- \`snapshot_number\` increments (2, 3, 4...)
- \`snapshot_reason\` records the trigger: \`origination\` | \`restructuring\` | \`re_underwriting\` | \`covenant_reset\`
- The previous snapshot is marked \`is_current = FALSE\` with \`superseded_at\` and \`superseded_reason\`
- Both rows remain in the database for historical queries

The result is a complete audit trail: at any point in the deal's life you can ask "what did onboarding look like before the restructuring?" and get a deterministic answer.

---

**Data model: \`deal_onboarding_snapshots\`**

Each row is a snapshot. The API returns the current snapshot on \`/api/deals/{slug}/topsheet\` as \`onboardingSnapshot\`, plus the full history as \`onboardingHistory\`.

**Supersession fields**
- \`id\` — UUID primary key
- \`deal_id\` — FK to deals (multiple rows per deal)
- \`snapshot_number\` — sequential (1, 2, 3...)
- \`snapshot_reason\` — origination / restructuring / re_underwriting / covenant_reset
- \`snapshot_date\` — effective date of the snapshot
- \`is_current\` — exactly one TRUE per deal (enforced by partial unique index)
- \`superseded_by_snapshot_id\` — FK to the snapshot that replaced this one
- \`superseded_at\`, \`superseded_reason\` — populated on transition
- \`captured_by\`, \`captured_at\` — provenance

---

**Content groups captured**

**Group A — Structural position at onboarding**
The dynamic "shape" of the deal frozen at entry. Fields drift over time as debt amortises and concessions shorten; the snapshot lets you measure that drift.
- \`tail_years_at_onboarding\`
- \`tail_classification_at_onboarding\`
- \`renewal_profile_at_onboarding\`
- \`debt_repayment_from_renewal_pct_at_onboarding\`
- \`revenue_risk_code_at_onboarding\` (P-V-D code)
- \`concession_years_remaining_at_onboarding\`

**Group B — Financial metrics at onboarding**
Origination ratios that tell you how aggressive the underwriting was.
- \`entry_leverage\` (Net Debt / EBITDA at purchase)
- \`entry_dscr_year_1\` (Year-1 mgmt case DSCR)
- \`entry_dscr_min_life\` (min DSCR across life under mgmt case)
- \`entry_llcr\` (Loan Life Coverage Ratio at Year 1)
- \`entry_loan_life_years\`, \`entry_wal_years\`

**Group C — Lender case / stress at onboarding**
The defensive underwriting work. When a deal is heading towards lender case numbers in real life, you need the original lender case to know how close you are.
- \`lender_case_dscr_min\`
- \`lender_case_leverage_peak\`
- \`stress_break_even_pct\` (% revenue decline that breaks DSCR 1.0x)
- \`stress_cases_tested\` (free-text description)

**Group D — IC governance**
Audit trail of the approval itself.
- \`ic_memo_date\`, \`ic_memo_reference\`
- \`ic_approved_by\` (committee / delegate)
- \`ic_approval_conditions\` (any conditions imposed)
- \`ic_vote_margin\` (unanimous / majority / dissented)

**Group E — Origination economics**
What the investment was trying to deliver.
- \`entry_all_in_margin_bps\`
- \`entry_upfront_fees_bps\`
- \`entry_secondary_purchase_price_pct\` (for secondary purchases)
- \`entry_yield_to_maturity\`
- \`expected_hold_period_years\`
- \`exit_strategy\` (hold to maturity / sell / refinance)

**Group F — Market context at onboarding**
Enables decomposition of performance into market movement vs deal-specific drift.
- \`entry_risk_free_rate_bps\` (10yr gilt / Treasury at entry)
- \`entry_credit_spread_bps\` (spread to risk-free)
- \`entry_relative_value_notes\` (free-text rationale)

**Group G — Initial risk assessment**
- \`initial_risk_score\` (risk register score at origination)
- \`initial_grade\`
- \`critical_risks_at_onboarding\` (top 3 risks summary)

---

**Worked example: M6 Toll onboarding snapshot (2018-01-01)**

| Field | Value |
|---|---|
| snapshot_number | 1 |
| snapshot_reason | origination |
| Tail at onboarding | +5.07 years (concession anchor) |
| Renewal profile | hand_back_zero_value |
| Revenue risk | P3-V5-D5 |
| **Entry leverage** | **17.7x** — very high |
| **Entry Year-1 DSCR** | **1.03x** — very tight |
| Min DSCR life | 1.03x |
| Entry LLCR | 1.33x |
| Lender case min DSCR | 0.85x |
| Stress break-even | 15% revenue decline |
| IC memo date | 2017-12-14 |
| IC conditions | Quarterly traffic reporting, 6-month DSRA, distribution lockup |
| IC vote margin | majority |
| Entry all-in margin | 900 bps |
| Entry YTM | 9.20% |
| Expected hold period | 10 years |
| Entry risk-free rate | 130 bps (10yr gilt) |
| Entry credit spread | 770 bps |
| Initial risk score | 62 |
| Initial grade | 2 - In Line |

**What this tells us retrospectively:**
1. The entry Year-1 DSCR of 1.03x was warning sign — there was effectively **zero margin for error** at origination
2. The stress case break-even was a 15% revenue decline, but Covid delivered a 43% decline in 2020 (far worse than stress case)
3. The 900 bps all-in margin priced significant risk, which is consistent with the structural weakness
4. The IC memo conditions (quarterly traffic reporting, distribution lockup) were appropriate given the tight DSCR and acknowledged the fragility

**What this tells us for performance attribution:**
- Current (FY2024) DSCR of 1.60x vs entry 1.03x shows **material improvement** — but vs the original management case trajectory of 1.35x for FY2024, the deal is outperforming by 18% on coverage despite 19% underperformance on traffic. Price rises and cost control have carried the day.
- Without the onboarding snapshot, we couldn't make this attribution cleanly.

---

**How the snapshot flows through the platform**

- Stored in the \`deal_onboarding_snapshots\` table
- Returned by \`/api/deals/{slug}/topsheet\` as \`onboardingSnapshot\` (current) and \`onboardingHistory\` (all rows)
- Displayed on the TopSheet page in a new "Onboarding Snapshot (Frozen at Investment)" section (F.1B), immediately after Deal Identity
- All 7 groups displayed with frozen values
- Provenance banner indicates snapshot number, reason, and date
- Write-once enforcement happens at the database level — the UI has no way to edit these fields

---

**Relationship to other analytics**

- **Performance Grade** — uses current covenant values vs management case; the onboarding snapshot preserves the original management case values for long-range attribution
- **Tail construct** — current tail is computed live; \`tail_years_at_onboarding\` lets you measure tail drift
- **Renewal analysis** — \`renewal_profile_at_onboarding\` preserves the original classification even if the deal is subsequently restructured
- **Score component** — the onboarding score baseline enables variance decomposition in the score history

---

**Write-once enforcement — the trigger**

The database enforces immutability via \`enforce_onboarding_snapshot_immutability()\`:
- If \`OLD.is_current = FALSE\`, any UPDATE raises an exception ("superseded and immutable")
- If \`OLD.is_current = TRUE\`, the trigger checks that only \`is_current\`, \`superseded_by_snapshot_id\`, \`superseded_at\`, \`superseded_reason\` and audit fields can change
- Any attempted edit to a content field raises: *"Onboarding snapshot fields are write-once. Create a new snapshot (snapshot_number = N+1) instead."*

This guarantees the snapshot can never be tampered with at the database level, regardless of how it was accessed.`,
  },
  // ── Distribution & Compliance ──
  {
    id: "distribution-assessment",
    name: "Distribution Assessment",
    category: "Distribution & Compliance",
    summary: "Determines whether equity distributions are currently permitted or blocked.",
    detail: `The distribution assessment checks four blocker conditions:

1. **Covenant status ≠ performing** — any covenant in lockup, trigger, or default blocks distributions
2. **Consecutive lockup periods ≥ 2** — sustained lockup triggers a cash sweep
3. **Reserve accounts underfunded** — any reserve not fully funded or in surplus blocks distributions
4. **Overdue obligations** — any compliance obligation with days overdue > 0 blocks distributions

**Result:**
- **Permitted:** No blockers → distributions can proceed
- **Blocked:** One or more blockers → distributions are restricted

Each failed condition is recorded with its code, label, and detail for audit.`,
  },
  {
    id: "reserves-status",
    name: "Reserve Account Status",
    category: "Distribution & Compliance",
    summary: "Tracks whether each reserve account meets its required balance, with underfunding period count.",
    detail: `Each reserve account (DSRA, MRA, Capex Reserve, etc.) has:
- **Required balance:** The target amount per the facility agreement
- **Current balance:** What is actually funded
- **Funded status:** fully_funded, partially_funded, unfunded, surplus

**Shortfall** = Required − Current (when current < required)

**Periods underfunded** = count of consecutive reporting periods where current balance < required balance.

The funding is broken down by source:
- Cash (held in account)
- Letter of Credit (LC backed)
- Parent Company Guarantee (PCG)
- Surety Bond

**Portfolio column:** Shows "Yes" (green) if all reserves are fully funded, or "No (N)" (red) where N is the maximum periods any reserve has been underfunded.`,
  },
];

/* ── Categories ──────────────────────────────────────────────────── */

const CATEGORIES = [...new Set(RULES.map((r) => r.category))];

/* ── Component ───────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Reference</p>
          <h1 className="hero-title" style={{ whiteSpace: "nowrap" }}>Analytics Rules</h1>
          <p className="hero-sub">
            How every analytical metric, score, and threshold in the platform is calculated.
          </p>
        </div>
      </section>

      {CATEGORIES.map((cat) => (
        <section key={cat} className="panel section-panel">
          <header className="panel-heading">
            <h2 className="panel-title">{cat}</h2>
          </header>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {RULES.filter((r) => r.category === cat).map((rule) => {
              const isExpanded = expandedId === rule.id;
              return (
                <div
                  key={rule.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--accent-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                  >
                    <span style={{
                      fontSize: "0.9rem",
                      color: "var(--accent)",
                      fontWeight: 700,
                      flexShrink: 0,
                      width: 16,
                      textAlign: "center",
                      marginTop: 1,
                    }}>
                      {isExpanded ? "\u25BC" : "\u25B6"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2 }}>
                        {rule.name}
                      </div>
                      <div style={{ fontSize: "0.80rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                        {rule.summary}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{
                      padding: "0 16px 16px 44px",
                      fontSize: "0.80rem",
                      lineHeight: 1.7,
                      color: "var(--ink)",
                    }}>
                      {rule.detail.split("\n\n").map((para, i) => {
                        // Handle markdown-style bold and code
                        const formatted = para
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`(.*?)`/g, '<code style="background:var(--surface);padding:1px 4px;border-radius:3px;font-size:0.78rem">$1</code>');
                        if (para.startsWith("- ") || para.startsWith("1. ")) {
                          return (
                            <div key={i} style={{ marginBottom: 8 }}>
                              {para.split("\n").map((line, j) => (
                                <div key={j} style={{ paddingLeft: line.startsWith("- ") || line.match(/^\d+\./) ? 12 : 0, marginBottom: 2 }}
                                  dangerouslySetInnerHTML={{ __html: formatted.split("\n")[j] || line }} />
                              ))}
                            </div>
                          );
                        }
                        return <p key={i} style={{ marginBottom: 8 }} dangerouslySetInnerHTML={{ __html: formatted }} />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
