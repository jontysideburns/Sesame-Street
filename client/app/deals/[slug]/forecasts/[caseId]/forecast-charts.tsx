"use client";

import React, { useState } from "react";

/* ── Types ───────────────────────────────────────────────────────────── */

type PeriodRow = {
  periodKey: string;
  periodLabel: string;
  forecast: Record<string, number> | null;
  actuals: Record<string, number> | null;
};

type Props = {
  periodSeries: PeriodRow[];
  caseName: string;
  caseType: string;
  hasActuals: boolean;
};

/* ── Metric groups ───────────────────────────────────────────────────── */

type MetricDef = { key: string; label: string; format: "currency" | "pct" | "multiple" };

const CASHFLOW_METRICS: MetricDef[] = [
  { key: "revenue", label: "Revenue", format: "currency" },
  { key: "ebitda", label: "EBITDA", format: "currency" },
  { key: "cfads", label: "CFADS", format: "currency" },
  { key: "debtService", label: "Debt Service", format: "currency" },
];

const BALANCE_METRICS: MetricDef[] = [
  { key: "leasedCapacityPct", label: "Leased Capacity", format: "pct" },
  { key: "constructionCompletionPct", label: "Construction Completion", format: "pct" },
];

const RATIO_METRICS: MetricDef[] = [
  { key: "seniorDscr", label: "Senior DSCR", format: "multiple" },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

function fmtVal(value: number, format: "currency" | "pct" | "multiple") {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
    }).format(value);
  }
  if (format === "pct") return `${value.toFixed(0)}%`;
  return `${value.toFixed(2)}x`;
}

function getAvailableMetrics(series: PeriodRow[], defs: MetricDef[]): MetricDef[] {
  return defs.filter((m) =>
    series.some((p) =>
      (p.forecast && p.forecast[m.key] != null) || (p.actuals && p.actuals[m.key] != null)
    )
  );
}

/* ── Bar Chart Component ─────────────────────────────────────────────── */

function BarChart({
  series,
  metric,
  showActuals,
}: {
  series: PeriodRow[];
  metric: MetricDef;
  showActuals: boolean;
}) {
  const values: number[] = [];
  series.forEach((p) => {
    if (p.forecast?.[metric.key] != null) values.push(p.forecast[metric.key]);
    if (showActuals && p.actuals?.[metric.key] != null) values.push(p.actuals[metric.key]);
  });

  if (values.length === 0) return null;
  const maxVal = Math.max(...values, 1);

  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
        {metric.label}
      </h4>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140 }}>
        {series.map((p) => {
          const fVal = p.forecast?.[metric.key];
          const aVal = showActuals ? p.actuals?.[metric.key] : null;
          const fH = fVal != null ? (fVal / maxVal) * 120 : 0;
          const aH = aVal != null ? (aVal / maxVal) * 120 : 0;

          return (
            <div
              key={p.periodKey}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              {/* Bars */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, width: "100%" }}>
                {fVal != null && (
                  <div
                    title={`Forecast: ${fmtVal(fVal, metric.format)}`}
                    style={{
                      flex: 1,
                      height: fH,
                      background: "var(--accent)",
                      borderRadius: "4px 4px 0 0",
                      minWidth: 0,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: -16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "0.62rem",
                        color: "var(--ink-soft)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtVal(fVal, metric.format)}
                    </span>
                  </div>
                )}
                {aVal != null && (
                  <div
                    title={`Actual: ${fmtVal(aVal, metric.format)}`}
                    style={{
                      flex: 1,
                      height: aH,
                      background: "var(--good)",
                      borderRadius: "4px 4px 0 0",
                      minWidth: 0,
                      opacity: 0.75,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: -16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: "0.62rem",
                        color: "var(--good)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmtVal(aVal, metric.format)}
                    </span>
                  </div>
                )}
              </div>
              {/* Period label */}
              <span
                style={{
                  fontSize: "0.6rem",
                  color: "var(--ink-soft)",
                  marginTop: 4,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {p.periodLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Line Chart Component (for ratios) ───────────────────────────────── */

function LineChart({
  series,
  metric,
  showActuals,
}: {
  series: PeriodRow[];
  metric: MetricDef;
  showActuals: boolean;
}) {
  const values: number[] = [];
  series.forEach((p) => {
    if (p.forecast?.[metric.key] != null) values.push(p.forecast[metric.key]);
    if (showActuals && p.actuals?.[metric.key] != null) values.push(p.actuals[metric.key]);
  });

  if (values.length === 0) return null;

  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1;
  const range = maxVal - minVal || 1;
  const h = 120;
  const w = series.length * 60;

  function y(v: number) {
    return h - ((v - minVal) / range) * h;
  }

  const forecastPoints = series
    .map((p, i) => {
      const v = p.forecast?.[metric.key];
      if (v == null) return null;
      return { x: i * 60 + 30, y: y(v), v };
    })
    .filter((p): p is { x: number; y: number; v: number } => p != null);

  const actualPoints = showActuals
    ? series
        .map((p, i) => {
          const v = p.actuals?.[metric.key];
          if (v == null) return null;
          return { x: i * 60 + 30, y: y(v), v };
        })
        .filter((p): p is { x: number; y: number; v: number } => p != null)
    : [];

  function pathD(pts: { x: number; y: number }[]) {
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h4 style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 8, color: "var(--ink)" }}>
        {metric.label}
      </h4>
      <div style={{ overflowX: "auto" }}>
        <svg width={Math.max(w, 200)} height={h + 30} style={{ display: "block" }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const yPos = h - pct * h;
            const val = minVal + pct * range;
            return (
              <g key={pct}>
                <line x1={0} y1={yPos} x2={w} y2={yPos} stroke="var(--line)" strokeWidth={1} />
                <text x={0} y={yPos - 3} fill="var(--ink-soft)" fontSize={9}>
                  {fmtVal(val, metric.format)}
                </text>
              </g>
            );
          })}

          {/* Forecast line */}
          {forecastPoints.length > 1 && (
            <path d={pathD(forecastPoints)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          )}
          {forecastPoints.map((p, i) => (
            <circle key={`f-${i}`} cx={p.x} cy={p.y} r={4} fill="var(--accent)" />
          ))}

          {/* Actual line */}
          {actualPoints.length > 1 && (
            <path d={pathD(actualPoints)} fill="none" stroke="var(--good)" strokeWidth={2.5} strokeDasharray="6 3" />
          )}
          {actualPoints.map((p, i) => (
            <circle key={`a-${i}`} cx={p.x} cy={p.y} r={4} fill="var(--good)" />
          ))}

          {/* Period labels */}
          {series.map((p, i) => (
            <text
              key={p.periodKey}
              x={i * 60 + 30}
              y={h + 16}
              textAnchor="middle"
              fill="var(--ink-soft)"
              fontSize={9}
            >
              {p.periodLabel}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ── Section Component ───────────────────────────────────────────────── */

function ChartSection({
  title,
  metrics,
  series,
  showActuals,
  chartType,
}: {
  title: string;
  metrics: MetricDef[];
  series: PeriodRow[];
  showActuals: boolean;
  chartType: "bar" | "line";
}) {
  const available = getAvailableMetrics(series, metrics);
  if (available.length === 0) return null;

  const Chart = chartType === "line" ? LineChart : BarChart;

  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: "0.88rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--accent)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "2px solid var(--line)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: available.length > 2 ? "1fr 1fr" : "1fr",
          gap: 24,
        }}
      >
        {available.map((m) => (
          <Chart key={m.key} series={series} metric={m} showActuals={showActuals} />
        ))}
      </div>
    </div>
  );
}

/* ── Summary Table ───────────────────────────────────────────────────── */

function SummaryTable({ series, showActuals }: { series: PeriodRow[]; showActuals: boolean }) {
  const allMetricKeys = new Map<string, MetricDef>();
  [...CASHFLOW_METRICS, ...BALANCE_METRICS, ...RATIO_METRICS].forEach((m) => {
    if (series.some((p) => p.forecast?.[m.key] != null || p.actuals?.[m.key] != null)) {
      allMetricKeys.set(m.key, m);
    }
  });

  const metrics = Array.from(allMetricKeys.values());

  return (
    <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--line)", marginBottom: 32 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
        <thead>
          <tr style={{ background: "var(--accent-soft)" }}>
            <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", borderBottom: "2px solid var(--line)" }}>
              Metric
            </th>
            {series.map((p) => (
              <th
                key={p.periodKey}
                colSpan={showActuals && p.actuals ? 2 : 1}
                style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, fontSize: "0.70rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)", borderBottom: "2px solid var(--line)" }}
              >
                {p.periodLabel}
              </th>
            ))}
          </tr>
          {showActuals && (
            <tr style={{ background: "var(--accent-soft)" }}>
              <th style={{ padding: "2px 10px", borderBottom: "1px solid var(--line)" }} />
              {series.map((p) => (
                p.actuals ? (
                  <React.Fragment key={p.periodKey}>
                    <th style={{ padding: "2px 8px", textAlign: "right", fontSize: "0.65rem", color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>Fcst</th>
                    <th style={{ padding: "2px 8px", textAlign: "right", fontSize: "0.65rem", color: "var(--good)", borderBottom: "1px solid var(--line)" }}>Act</th>
                  </React.Fragment>
                ) : (
                  <th key={p.periodKey} style={{ padding: "2px 8px", textAlign: "right", fontSize: "0.65rem", color: "var(--accent)", borderBottom: "1px solid var(--line)" }}>Fcst</th>
                )
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key}>
              <td style={{ padding: "4px 10px", fontWeight: 600, borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>
                {m.label}
              </td>
              {series.map((p) => {
                const fVal = p.forecast?.[m.key];
                const aVal = p.actuals?.[m.key];
                if (showActuals && p.actuals) {
                  return (
                    <React.Fragment key={p.periodKey}>
                      <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: "1px solid var(--line)", fontFamily: "monospace" }}>
                        {fVal != null ? fmtVal(fVal, m.format) : "—"}
                      </td>
                      <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: "1px solid var(--line)", fontFamily: "monospace", color: "var(--good)" }}>
                        {aVal != null ? fmtVal(aVal, m.format) : "—"}
                      </td>
                    </React.Fragment>
                  );
                }
                return (
                  <td key={p.periodKey} style={{ padding: "4px 8px", textAlign: "right", borderBottom: "1px solid var(--line)", fontFamily: "monospace" }}>
                    {fVal != null ? fmtVal(fVal, m.format) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function ForecastCharts({ periodSeries, caseName, caseType, hasActuals }: Props) {
  const [showActuals, setShowActuals] = useState(false);

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`badge ${caseType === "management_case" ? "good" : caseType === "lender_case" ? "neutral" : "warning"}`}>
            {caseType.replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            {periodSeries.length} period{periodSeries.length !== 1 ? "s" : ""}
          </span>
        </div>

        {hasActuals && (
          <button
            onClick={() => setShowActuals((v) => !v)}
            className={`mini-button ${showActuals ? "primary" : "subtle"}`}
            style={{ marginLeft: "auto" }}
          >
            {showActuals ? "Hide actuals" : "Show actuals overlay"}
          </button>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, fontSize: "0.75rem" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 10, borderRadius: 2, background: "var(--accent)", display: "inline-block" }} />
          Forecast
        </span>
        {showActuals && (
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 10, borderRadius: 2, background: "var(--good)", opacity: 0.75, display: "inline-block" }} />
            Actuals
          </span>
        )}
      </div>

      {/* Chart sections */}
      <ChartSection
        title="Headline Cashflows"
        metrics={CASHFLOW_METRICS}
        series={periodSeries}
        showActuals={showActuals}
        chartType="bar"
      />

      <ChartSection
        title="Balance Sheet & Coverage"
        metrics={BALANCE_METRICS}
        series={periodSeries}
        showActuals={showActuals}
        chartType="bar"
      />

      <ChartSection
        title="Key Ratios"
        metrics={RATIO_METRICS}
        series={periodSeries}
        showActuals={showActuals}
        chartType="line"
      />

      {/* Summary data table */}
      <h3
        style={{
          fontSize: "0.88rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--accent)",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "2px solid var(--line)",
        }}
      >
        Data Summary
      </h3>
      <SummaryTable series={periodSeries} showActuals={showActuals} />
    </div>
  );
}
