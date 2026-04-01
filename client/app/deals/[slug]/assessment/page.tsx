import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerformanceAssessment } from "../../../../api/performance";
import { getDeal } from "../../../../api/deals";

/* ── Helpers ─────────────────────────────────────────────────────── */

const GRADE_TONES: Record<number, string> = {
  1: "good",
  2: "neutral",
  3: "warning",
  4: "critical",
};

const TREND_TONES: Record<string, string> = {
  improving: "good",
  flat: "neutral",
  deteriorating: "warning",
  deteriorating_rapidly: "critical",
  new: "neutral",
};

const TREND_ARROWS: Record<string, string> = {
  improving: "↑",
  flat: "→",
  deteriorating: "↓",
  deteriorating_rapidly: "↓↓",
  new: "★",
};

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtAbs(n: number | null, dp = 2): string {
  if (n == null) return "—";
  return n.toFixed(dp);
}

function fmtRatio(n: number | null): string {
  if (n == null) return "—";
  return `${n.toFixed(2)}x`;
}

function erosionTone(pct: number | null, threshold: number): string {
  if (pct == null) return "neutral";
  if (pct < -threshold) return "good";
  if (pct > threshold) return "warning";
  return "neutral";
}

/* ── Headroom bar ────────────────────────────────────────────────── */

function HeadroomBar({
  actual,
  management,
  lockup,
  defaultLevel,
  direction,
}: {
  actual: number | null;
  management: number | null;
  lockup: number | null;
  defaultLevel: number | null;
  direction: string;
}) {
  if (actual == null || management == null || defaultLevel == null) return null;

  // Normalize all values to a 0-100 scale for display
  const isHigherBetter = direction === "higher_is_better";
  const min = isHigherBetter
    ? Math.min(actual, management, defaultLevel, lockup ?? defaultLevel) * 0.9
    : Math.min(actual, management, defaultLevel) * 0.9;
  const max = isHigherBetter
    ? Math.max(actual, management, lockup ?? defaultLevel) * 1.1
    : Math.max(actual, management, defaultLevel, lockup ?? defaultLevel) * 1.1;
  const range = max - min || 1;

  const pos = (v: number) => ((v - min) / range) * 100;

  const defaultPos = pos(defaultLevel);
  const lockupPos = lockup != null ? pos(lockup) : null;
  const mgmtPos = pos(management);
  const actualPos = pos(actual);

  const actualInBreach = isHigherBetter
    ? actual <= defaultLevel
    : actual >= defaultLevel;

  return (
    <div style={{ position: "relative", height: 32, background: "var(--panel-strong)", borderRadius: 8, overflow: "hidden", margin: "8px 0" }}>
      {/* Default zone */}
      <div
        style={{
          position: "absolute",
          left: isHigherBetter ? 0 : `${defaultPos}%`,
          width: isHigherBetter ? `${defaultPos}%` : `${100 - defaultPos}%`,
          top: 0, bottom: 0,
          background: "color-mix(in srgb, var(--red) 15%, transparent)",
        }}
      />
      {/* Lockup marker */}
      {lockupPos != null && (
        <div
          style={{
            position: "absolute", left: `${lockupPos}%`, top: 0, bottom: 0,
            width: 2, background: "var(--amber)",
          }}
          title={`Lock-up: ${lockup!.toFixed(2)}`}
        />
      )}
      {/* Default marker */}
      <div
        style={{
          position: "absolute", left: `${defaultPos}%`, top: 0, bottom: 0,
          width: 2, background: "var(--red)",
        }}
        title={`Default: ${defaultLevel.toFixed(2)}`}
      />
      {/* Management case marker */}
      <div
        style={{
          position: "absolute", left: `${mgmtPos}%`, top: 2, bottom: 2,
          width: 2, background: "var(--accent)", opacity: 0.6,
          borderRadius: 1,
        }}
        title={`Management Case: ${management.toFixed(2)}`}
      />
      {/* Actual marker */}
      <div
        style={{
          position: "absolute",
          left: `calc(${actualPos}% - 6px)`,
          top: 4, width: 12, height: 24,
          borderRadius: 6,
          background: actualInBreach ? "var(--red)" : "var(--accent)",
          border: "2px solid var(--panel)",
        }}
        title={`Actual: ${actual.toFixed(2)}`}
      />
    </div>
  );
}

/* ── Erosion sparkline ───────────────────────────────────────────── */

function ErosionSparkline({
  series,
  periods,
  threshold,
}: {
  series: number[] | null;
  periods: string[] | null;
  threshold: number;
}) {
  if (!series || series.length < 3 || !periods) return null;

  const w = 200;
  const h = 60;
  const pad = 8;

  const vals = series.map((v) => v);
  const yMin = Math.min(...vals, -threshold * 100, 0) - 2;
  const yMax = Math.max(...vals, threshold * 100) + 2;
  const yRange = yMax - yMin || 1;

  const xStep = (w - pad * 2) / (vals.length - 1);
  const toY = (v: number) => pad + ((yMax - v) / yRange) * (h - pad * 2);
  const toX = (i: number) => pad + i * xStep;

  const zeroY = toY(0);
  const threshY = toY(threshold * 100);
  const negThreshY = toY(-threshold * 100);

  const points = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {/* Zero line */}
        <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="var(--line-strong)" strokeWidth={1} />
        {/* Threshold bands */}
        <line x1={pad} y1={threshY} x2={w - pad} y2={threshY} stroke="var(--amber)" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        <line x1={pad} y1={negThreshY} x2={w - pad} y2={negThreshY} stroke="var(--green)" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        {/* Line */}
        <polyline fill="none" stroke="var(--accent)" strokeWidth={2} points={points} />
        {/* Dots */}
        {vals.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={4}
            fill={v > threshold * 100 ? "var(--amber)" : v < -threshold * 100 ? "var(--green)" : "var(--accent)"}
            stroke="var(--panel)"
            strokeWidth={2}
          />
        ))}
      </svg>
      <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
        {periods.map((p, i) => (
          <div key={p}>
            <strong>{p}:</strong> {vals[i].toFixed(1)}%
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default async function DealAssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let deal: any;
  let perf: any;

  try {
    [deal, perf] = await Promise.all([
      getDeal(slug),
      getPerformanceAssessment(slug),
    ]);
  } catch {
    notFound();
  }

  const gradeTone = GRADE_TONES[perf.performanceGrade] ?? "neutral";
  const trendKey = perf.performanceTrend ?? "new";
  const trendTone = TREND_TONES[trendKey] ?? "neutral";
  const trendArrow = TREND_ARROWS[trendKey] ?? "";

  const effectiveGrade = perf.overrideActive && perf.overrideGrade != null
    ? perf.overrideGrade
    : perf.performanceGrade;
  const effectiveLabel = perf.overrideActive && perf.overrideGrade != null
    ? `${perf.overrideGrade} (override)`
    : `${perf.performanceGrade} - ${perf.gradeLabel}`;

  return (
    <main className="shell">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero">
        <div>
          <p className="eyebrow">Performance Assessment</p>
          <h1>{deal.name}</h1>
          <p className="hero-copy">
            Headroom-based performance grade and three-period trending analysis
            for {perf.assessmentPeriod}.
          </p>
          <div className="tag-row">
            <span className={`badge ${gradeTone}`} style={{ fontSize: "1rem", padding: "6px 14px" }}>
              Grade {effectiveGrade}
            </span>
            <span className={`badge ${trendTone}`} style={{ fontSize: "1rem", padding: "6px 14px" }}>
              {trendArrow} {trendKey.replace(/_/g, " ")}
            </span>
            <span className="badge neutral">{perf.assessmentPeriod}</span>
            {perf.gradeChanged && (
              <span className={`badge ${perf.gradeDirection === "upgrade" ? "good" : "critical"}`}>
                {perf.gradeDirection === "upgrade" ? "↑ Upgraded" : "↓ Downgraded"} from {perf.priorGrade}
              </span>
            )}
          </div>
          <div className="hero-actions">
            <Link className="button primary" href={`/deals/${slug}`}>
              Back to deal
            </Link>
            <Link className="button secondary" href={`/deals/${slug}/forecasts`}>
              Forecasts
            </Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Grade</span>
              <strong>{effectiveLabel}</strong>
            </div>
            <div className="summary-stat">
              <span>Trend</span>
              <strong>{trendArrow} {trendKey.replace(/_/g, " ")}</strong>
            </div>
            <div className="summary-stat">
              <span>Determinative</span>
              <strong>{perf.determinativeRatio === "dscr" ? "DSCR" : "Collateral"}</strong>
            </div>
            <div className="summary-stat">
              <span>Period</span>
              <strong>{perf.assessmentPeriod}</strong>
            </div>
          </div>
        </aside>
      </section>

      {/* ── Metric grid ─────────────────────────────────────────── */}
      <section className="metric-grid">
        <article className="metric-card">
          <span>DSCR Grade</span>
          <strong className={GRADE_TONES[perf.dscrComponentGrade ?? 2]}>
            {perf.dscrComponentGrade ?? "—"}
          </strong>
        </article>
        <article className="metric-card">
          <span>DSCR Erosion</span>
          <strong className={erosionTone(perf.dscrErosionPct, perf.dscrThresholdPct)}>
            {fmtPct(perf.dscrErosionPct)}
          </strong>
        </article>
        <article className="metric-card">
          <span>Collateral Grade</span>
          <strong className={GRADE_TONES[perf.collComponentGrade ?? 2]}>
            {perf.collComponentGrade ?? "—"}
          </strong>
        </article>
        <article className="metric-card">
          <span>Collateral Erosion</span>
          <strong className={erosionTone(perf.collErosionPct, perf.collThresholdPct)}>
            {fmtPct(perf.collErosionPct)}
          </strong>
        </article>
        <article className="metric-card">
          <span>DSCR Trend</span>
          <strong>{perf.dscrTrend ? TREND_ARROWS[perf.dscrTrend] ?? "" : "—"} {(perf.dscrTrend ?? "").replace(/_/g, " ")}</strong>
        </article>
        <article className="metric-card">
          <span>Collateral Trend</span>
          <strong>{perf.collTrend ? TREND_ARROWS[perf.collTrend] ?? "" : "—"} {(perf.collTrend ?? "").replace(/_/g, " ")}</strong>
        </article>
      </section>

      {/* ── Two-column: DSCR + Collateral ───────────────────────── */}
      <section className="content-grid">
        {/* DSCR Assessment */}
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DSCR assessment</p>
              <h2>Debt Service Coverage</h2>
            </div>
            <span className={`badge ${GRADE_TONES[perf.dscrComponentGrade ?? 2]}`}>
              Grade {perf.dscrComponentGrade}
            </span>
          </div>

          <HeadroomBar
            actual={perf.dscrActual}
            management={perf.dscrManagementCase}
            lockup={perf.dscrLockupLevel}
            defaultLevel={perf.dscrDefaultLevel}
            direction="higher_is_better"
          />

          <div className="summary-grid">
            <div><span>Metric</span><strong>{perf.dscrMetric}</strong></div>
            <div><span>Actual</span><strong>{fmtRatio(perf.dscrActual)}</strong></div>
            <div><span>Mgmt Case</span><strong>{fmtRatio(perf.dscrManagementCase)}</strong></div>
            <div><span>Lock-up</span><strong>{fmtRatio(perf.dscrLockupLevel)}</strong></div>
            <div><span>Default</span><strong>{fmtRatio(perf.dscrDefaultLevel)}</strong></div>
            <div><span>Expected Headroom</span><strong>{fmtAbs(perf.dscrExpectedHeadroom)}</strong></div>
            <div><span>Actual Headroom</span><strong>{fmtAbs(perf.dscrActualHeadroom)}</strong></div>
            <div><span>Erosion</span><strong>{fmtAbs(perf.dscrErosionAbs)}</strong></div>
            <div>
              <span>Erosion %</span>
              <strong className={erosionTone(perf.dscrErosionPct, perf.dscrThresholdPct)}>
                {fmtPct(perf.dscrErosionPct)}
              </strong>
            </div>
            <div><span>Threshold</span><strong>{fmtPct(perf.dscrThresholdPct)}</strong></div>
          </div>
        </article>

        {/* Collateral Assessment */}
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collateral assessment</p>
              <h2>Net Debt / EBITDA</h2>
            </div>
            <span className={`badge ${GRADE_TONES[perf.collComponentGrade ?? 2]}`}>
              Grade {perf.collComponentGrade}
            </span>
          </div>

          <HeadroomBar
            actual={perf.collActual}
            management={perf.collManagementCase}
            lockup={perf.collLockupLevel}
            defaultLevel={perf.collDefaultLevel}
            direction={perf.collDirection}
          />

          <div className="summary-grid">
            <div><span>Metric</span><strong>{perf.collMetric}</strong></div>
            <div><span>Actual</span><strong>{fmtAbs(perf.collActual)}x</strong></div>
            <div><span>Mgmt Case</span><strong>{fmtAbs(perf.collManagementCase)}x</strong></div>
            <div><span>Lock-up</span><strong>{fmtAbs(perf.collLockupLevel)}x</strong></div>
            <div><span>Default</span><strong>{fmtAbs(perf.collDefaultLevel)}x</strong></div>
            <div><span>Expected Headroom</span><strong>{fmtAbs(perf.collExpectedHeadroom)}</strong></div>
            <div><span>Actual Headroom</span><strong>{fmtAbs(perf.collActualHeadroom)}</strong></div>
            <div><span>Erosion</span><strong>{fmtAbs(perf.collErosionAbs)}</strong></div>
            <div>
              <span>Erosion %</span>
              <strong className={erosionTone(perf.collErosionPct, perf.collThresholdPct)}>
                {fmtPct(perf.collErosionPct)}
              </strong>
            </div>
            <div><span>Threshold</span><strong>{fmtPct(perf.collThresholdPct)}</strong></div>
          </div>
        </article>
      </section>

      {/* ── Trending ─────────────────────────────────────────────── */}
      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DSCR trending</p>
              <h2>3-period erosion trajectory</h2>
            </div>
            {perf.dscrTrend && (
              <span className={`badge ${TREND_TONES[perf.dscrTrend] ?? "neutral"}`}>
                {TREND_ARROWS[perf.dscrTrend] ?? ""} {perf.dscrTrend.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {perf.dscrErosionSeries ? (
            <>
              <ErosionSparkline
                series={perf.dscrErosionSeries}
                periods={perf.trendPeriods}
                threshold={perf.dscrThresholdPct}
              />
              <div className="summary-grid" style={{ marginTop: 12 }}>
                <div><span>Delta 1</span><strong>{perf.dscrDelta1 != null ? `${perf.dscrDelta1.toFixed(1)}pp` : "—"}</strong></div>
                <div><span>Delta 2</span><strong>{perf.dscrDelta2 != null ? `${perf.dscrDelta2.toFixed(1)}pp` : "—"}</strong></div>
                <div><span>Persistent drift</span><strong>{perf.dscrPersistentDrift ? "Yes" : "No"}</strong></div>
              </div>
            </>
          ) : (
            <p className="detail-copy">Insufficient periods for DSCR trending — requires 3 consecutive periods.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Collateral trending</p>
              <h2>3-period erosion trajectory</h2>
            </div>
            {perf.collTrend && (
              <span className={`badge ${TREND_TONES[perf.collTrend] ?? "neutral"}`}>
                {TREND_ARROWS[perf.collTrend] ?? ""} {perf.collTrend.replace(/_/g, " ")}
              </span>
            )}
          </div>

          {perf.collErosionSeries ? (
            <>
              <ErosionSparkline
                series={perf.collErosionSeries}
                periods={perf.trendPeriods}
                threshold={perf.collThresholdPct}
              />
              <div className="summary-grid" style={{ marginTop: 12 }}>
                <div><span>Delta 1</span><strong>{perf.collDelta1 != null ? `${perf.collDelta1.toFixed(1)}pp` : "—"}</strong></div>
                <div><span>Delta 2</span><strong>{perf.collDelta2 != null ? `${perf.collDelta2.toFixed(1)}pp` : "—"}</strong></div>
                <div><span>Persistent drift</span><strong>{perf.collPersistentDrift ? "Yes" : "No"}</strong></div>
              </div>
            </>
          ) : (
            <p className="detail-copy">Insufficient periods for collateral trending — requires 3 consecutive periods.</p>
          )}
        </article>
      </section>

      {/* ── Grade explanation + Override ──────────────────────────── */}
      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Grade scale</p>
              <h2>Performance grades (1-4)</h2>
            </div>
          </div>
          <div className="stack compact-stack">
            {[
              { g: 1, label: "Outperforming", desc: "Actual headroom exceeds expected headroom by more than the threshold." },
              { g: 2, label: "In Line", desc: "Actual headroom is within ± threshold of expected headroom." },
              { g: 3, label: "Below Expectation", desc: "Headroom has eroded by more than the threshold, but actual is still above default." },
              { g: 4, label: "Below Lock-Up / Default", desc: "Actual value has breached the lock-up or default level." },
            ].map((item) => (
              <div
                key={item.g}
                className="document-card"
                style={{
                  borderLeft: `4px solid var(--${item.g === 1 ? "green" : item.g === 2 ? "accent" : item.g === 3 ? "amber" : "red"})`,
                  opacity: item.g === perf.performanceGrade ? 1 : 0.5,
                }}
              >
                <div className="status-row">
                  <strong>Grade {item.g} — {item.label}</strong>
                  {item.g === perf.performanceGrade && (
                    <span className={`badge ${GRADE_TONES[item.g]}`}>Current</span>
                  )}
                </div>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Override status</p>
              <h2>HAM grade override</h2>
            </div>
          </div>
          {perf.overrideActive ? (
            <div className="document-card">
              <div className="status-row">
                <strong>Active override</strong>
                <span className="badge warning">Grade {perf.overrideGrade}</span>
              </div>
              <p>{perf.overrideRationale}</p>
              <p className="meta-note">
                Overridden by {perf.overrideBy} ·
                expires {perf.overrideExpiry ? new Date(perf.overrideExpiry).toLocaleDateString() : "—"}
              </p>
            </div>
          ) : (
            <p className="detail-copy">
              No grade override is active. The HAM may override the computed grade
              by up to one level with a written rationale and mandatory expiry date
              (maximum 6 months).
            </p>
          )}

          {perf.flags && perf.flags.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Flags</p>
              {perf.flags.map((flag: string, i: number) => (
                <div key={i} className="document-card" style={{ borderLeft: "3px solid var(--amber)" }}>
                  <p>{flag}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
