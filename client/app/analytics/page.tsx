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
- < 40 → Grade 4 (Stressed)

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

1. **Performance grade ≥ 3** (Underperforming or Stressed)
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
  // ── Portfolio Aggregations ──
  {
    id: "wa-rating",
    name: "Weighted Average Credit Rating",
    category: "Portfolio Aggregations",
    summary: "Exposure-weighted average credit rating across the portfolio, displayed on the Moody's scale.",
    detail: `**Step 1 — Assign numeric value per deal:**

Each rating agency grade maps to a number (lower = better):
AAA/Aaa = 1, AA+/Aa1 = 2, AA/Aa2 = 3, AA-/Aa3 = 4, A+/A1 = 5, A/A2 = 6, A-/A3 = 7,
BBB+/Baa1 = 8, BBB/Baa2 = 9, BBB-/Baa3 = 10, BB+/Ba1 = 11, BB/Ba2 = 12, ...

**Step 2 — Select the assigned rating for each deal:**
- If rated by **3 agencies** (Moody's, S&P, Fitch): use the **middle** rating (median)
- If rated by **2 agencies**: use the **lower** of the two (more conservative)
- If rated by **1 agency**: use that rating
- If **not externally rated**: use the **internal credit score** from the IC memo (updatable by the HAM)

**Step 3 — Compute the portfolio weighted average:**
WA Rating (numeric) = ROUND(SUM(Exposure × Assigned Rating Numeric) / SUM(Exposure))

**Step 4 — Convert back to Moody's scale:**
The rounded numeric result is mapped back: 9 → Baa2, 10 → Baa3, etc.

**Example:** A portfolio with 60% BBB (9) and 40% BBB+ (8) gives WA = 8.6, rounded to 9 = Baa2.`,
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
