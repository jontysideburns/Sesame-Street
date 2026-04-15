"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = { slug: string };

type ScenarioPoint = { period_flag: string; period_label: string; period_ordinal: number; value: number };
type StressCase = {
  forecast_case_id: number;
  case_key: string;
  case_name: string;
  scenario_kind: string;        // 'combined_downside' | 'single_variant_stress' | ...
  stress_label: string | null;
  driving_risk_id: string | null;
  driving_risk_code: string | null;
  driving_risk_commentary: string | null;
  series: ScenarioPoint[];
};
type KpiScenario = {
  kpi_key: string;
  kpi_label: string;
  management_case: { series: ScenarioPoint[] } | null;
  stress_cases: StressCase[];
};
type MergedPoint = {
  year: string;
  actual?: number;
  mgmt?: number;
  downside?: number;
  stressBand?: [number, number];
  [singleVariantKey: string]: any; // keys like "stress_<case_key>"
};
type KpiDisplay = {
  lineKey: string;
  label: string;
  unit: string;
  suffix: string;
  digits: number;
  data: MergedPoint[];
  singleVariantStresses: { dataKey: string; label: string; riskCode: string | null; riskTitle: string | null }[];
  hasBand: boolean;
  firstYear: string;
  lastYear: string;
  firstValue: number | null;
  lastValue: number | null;
};

/* Unit detection — labels include hints like "%", "millions", "per PAX", "ratio". */
function detectUnit(label: string): { unit: string; suffix: string; digits: number } {
  const l = label.toLowerCase();
  if (l.includes("%") || l.includes("margin") || l.includes("rate")) return { unit: "%", suffix: "%", digits: 1 };
  if (l.includes("million")) return { unit: "m", suffix: "m", digits: 1 };
  if (l.includes("icr") || l.includes("ratio") || l.includes("dscr") || l.includes("llcr")) return { unit: "x", suffix: "x", digits: 2 };
  if (l.includes("rar") || l.includes("ltv")) return { unit: "", suffix: "", digits: 2 };
  if (l.includes("per pax") || l.includes("per passenger") || l.includes("gbp") || l.includes("usd") || l.includes("eur") || l.includes("£") || l.includes("$")) {
    return { unit: "£", suffix: "", digits: 2 };
  }
  return { unit: "", suffix: "", digits: 2 };
}

const ACTUAL_COLOR = "#1f6fa5";
const ACTUAL_DOT_FILL = "#9bb8d4";
const MGMT_COLOR = "#9bb8d4";
const DOWNSIDE_COLOR = "#d65454";
const BAND_FILL = "#d65454";
const STRESS_PALETTE = ["#c97f1f", "#a03e98", "#518b6e", "#5a72a5"];

function yearFromPeriodFlag(flag: string) {
  return (flag ?? "").replace(/H\d$/, "").replace(/Q\d$/, "");
}

/* ── Tooltip ────────────────────────────────────────────────────── */

function makeTooltip(
  suffix: string,
  digits: number,
  singleVariants: { dataKey: string; label: string; riskCode: string | null; riskTitle: string | null }[],
) {
  function Inner({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as MergedPoint;
    if (!row) return null;

    const fmt = (v: number | undefined) =>
      typeof v === "number" ? `${v.toFixed(digits)}${suffix}` : "—";

    return (
      <div
        style={{
          background: "var(--panel-strong)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: "0.72rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          minWidth: 140,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 3 }}>{label}</div>
        {row.actual !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: ACTUAL_COLOR }}>● Actual</span>
            <strong>{fmt(row.actual)}</strong>
          </div>
        )}
        {row.mgmt !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: MGMT_COLOR }}>- - Mgmt case</span>
            <strong>{fmt(row.mgmt)}</strong>
          </div>
        )}
        {row.downside !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ color: DOWNSIDE_COLOR }}>- - Combined downside</span>
            <strong>{fmt(row.downside)}</strong>
          </div>
        )}
        {singleVariants.map((sv, idx) => {
          const v = row[sv.dataKey];
          if (v === undefined || v === null) return null;
          return (
            <div key={sv.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 2 }}>
              <span style={{ color: STRESS_PALETTE[idx % STRESS_PALETTE.length], maxWidth: 180 }}>
                - - {sv.label}
                {sv.riskCode ? ` (${sv.riskCode})` : ""}
              </span>
              <strong>{fmt(v as number)}</strong>
            </div>
          );
        })}
      </div>
    );
  }
  return Inner;
}

/* ── Main component ────────────────────────────────────────────── */

export default function KpiChart({ slug }: Props) {
  const [kpis, setKpis] = useState<KpiDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/proxy/deals/${slug}/topsheet`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const ts = await res.json();

        const periods = (ts.reportingPeriods ?? []).slice().sort(
          (a: any, b: any) => a.period_ordinal - b.period_ordinal,
        );
        const periodIdToYear = new Map<number, string>();
        for (const p of periods) {
          periodIdToYear.set(p.id, yearFromPeriodFlag(p.period_flag));
        }

        const labels: Record<string, string> = ts.dealLineLabels ?? {};
        const scenarios: KpiScenario[] = ts.kpiScenarios ?? [];

        // Actuals: bucket per KPI → year → value
        const actualsMap = new Map<string, Map<string, number>>();
        for (const ai of ts.actualItems ?? []) {
          const key: string = ai.line_key ?? "";
          if (!key.startsWith("sector_kpi_")) continue;
          const year = periodIdToYear.get(ai.reporting_period_id);
          if (!year) continue;
          const v = ai.approved_value ?? ai.reported_value;
          if (v == null) continue;
          if (!actualsMap.has(key)) actualsMap.set(key, new Map());
          actualsMap.get(key)!.set(year, Number(v));
        }

        // Merge actuals + scenarios → one MergedPoint per year per KPI
        const displays: KpiDisplay[] = [];
        const kpiKeys = new Set<string>([
          ...actualsMap.keys(),
          ...scenarios.map((s) => s.kpi_key),
        ]);

        for (const kpiKey of Array.from(kpiKeys).sort((a, b) => {
          const na = Number((a.match(/sector_kpi_(\d+)/) ?? [, "0"])[1]);
          const nb = Number((b.match(/sector_kpi_(\d+)/) ?? [, "0"])[1]);
          return na - nb;
        })) {
          const sc = scenarios.find((s) => s.kpi_key === kpiKey);
          const actualByYear = actualsMap.get(kpiKey) ?? new Map();
          const mgmtByYear = new Map<string, number>();
          const downsideByYear = new Map<string, number>();
          const singleByYear: Record<string, Map<string, number>> = {};
          const singleVariants: KpiDisplay["singleVariantStresses"] = [];

          if (sc) {
            for (const p of sc.management_case?.series ?? []) {
              mgmtByYear.set(yearFromPeriodFlag(p.period_flag), Number(p.value));
            }
            for (const stress of sc.stress_cases ?? []) {
              if (stress.scenario_kind === "combined_downside") {
                for (const p of stress.series ?? []) {
                  downsideByYear.set(yearFromPeriodFlag(p.period_flag), Number(p.value));
                }
              } else {
                const dk = `stress_${stress.case_key.replace(/[^a-zA-Z0-9_]/g, "_")}`;
                singleVariants.push({
                  dataKey: dk,
                  label: stress.stress_label || stress.case_name || stress.case_key,
                  riskCode: stress.driving_risk_code ?? null,
                  riskTitle: stress.driving_risk_commentary ?? null,
                });
                const m = new Map<string, number>();
                for (const p of stress.series ?? []) {
                  m.set(yearFromPeriodFlag(p.period_flag), Number(p.value));
                }
                singleByYear[dk] = m;
              }
            }
          }

          // Union of all years across actuals + scenarios
          const allYears = new Set<string>([
            ...actualByYear.keys(),
            ...mgmtByYear.keys(),
            ...downsideByYear.keys(),
            ...Object.values(singleByYear).flatMap((m) => Array.from(m.keys())),
          ]);
          const years = Array.from(allYears).sort();
          if (years.length < 2) continue;

          const label = labels[kpiKey] ?? kpiKey;
          const { unit, suffix, digits } = detectUnit(label);

          const data: MergedPoint[] = years.map((year) => {
            const mp: MergedPoint = { year };
            const a = actualByYear.get(year);
            if (a !== undefined) mp.actual = a;
            const m = mgmtByYear.get(year);
            if (m !== undefined) mp.mgmt = m;
            const d = downsideByYear.get(year);
            if (d !== undefined) mp.downside = d;
            if (m !== undefined && d !== undefined) {
              mp.stressBand = [Math.min(m, d), Math.max(m, d)];
            }
            for (const sv of singleVariants) {
              const pv = singleByYear[sv.dataKey].get(year);
              if (pv !== undefined) mp[sv.dataKey] = pv;
            }
            return mp;
          });

          // Determine first/last for header delta — prefer actuals
          let firstValue: number | null = null;
          let lastValue: number | null = null;
          let firstYear = "";
          let lastYear = "";
          for (const p of data) {
            if (p.actual !== undefined) {
              if (firstValue === null) {
                firstValue = p.actual;
                firstYear = p.year;
              }
              lastValue = p.actual;
              lastYear = p.year;
            }
          }
          // Fall back to mgmt case if no actuals
          if (firstValue === null) {
            for (const p of data) {
              if (p.mgmt !== undefined) {
                if (firstValue === null) {
                  firstValue = p.mgmt;
                  firstYear = p.year;
                }
                lastValue = p.mgmt;
                lastYear = p.year;
              }
            }
          }

          displays.push({
            lineKey: kpiKey,
            label,
            unit,
            suffix,
            digits,
            data,
            singleVariantStresses: singleVariants,
            hasBand: mgmtByYear.size > 0 && downsideByYear.size > 0,
            firstYear,
            lastYear,
            firstValue,
            lastValue,
          });
        }

        setKpis(displays);
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: 20, color: "var(--ink-soft)", fontSize: "0.82rem" }}>
        Loading KPIs…
      </div>
    );
  }
  if (kpis.length === 0) {
    return (
      <p style={{ color: "var(--ink-soft)", fontSize: "0.82rem", margin: "6px 0 0 0" }}>
        No sector KPI observations or scenarios recorded for this deal yet.
      </p>
    );
  }

  // Any KPI has any scenarios? Show a legend-style footer if so.
  const anyScenarios = kpis.some((k) => k.data.some((p) => p.mgmt !== undefined || p.downside !== undefined));
  const anySingle = kpis.some((k) => k.singleVariantStresses.length > 0);

  return (
    <article className="topsheet-card" style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--accent)",
          marginBottom: 4,
        }}
      >
        Sector KPIs
      </div>
      <p className="topsheet-meta-note" style={{ marginBottom: 10 }}>
        Actuals reported annually, overlaid with IC-memo management case (dashed) and combined-downside stress band.
        {anySingle ? " Single-variant stress scenarios linked to IC-identified risks shown as thin dashed lines." : ""}
      </p>

      {anyScenarios && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            fontSize: "0.68rem",
            color: "var(--ink-soft)",
            marginBottom: 12,
          }}
        >
          <span><span style={{ display: "inline-block", width: 14, height: 2, background: ACTUAL_COLOR, marginRight: 4, verticalAlign: "middle" }} />Actual</span>
          <span><span style={{ display: "inline-block", width: 14, borderTop: `2px dashed ${MGMT_COLOR}`, marginRight: 4, verticalAlign: "middle" }} />Management case (IC baseline)</span>
          <span><span style={{ display: "inline-block", width: 14, borderTop: `2px dashed ${DOWNSIDE_COLOR}`, marginRight: 4, verticalAlign: "middle" }} />Combined downside</span>
          <span><span style={{ display: "inline-block", width: 14, height: 8, background: BAND_FILL, opacity: 0.12, marginRight: 4, verticalAlign: "middle" }} />Stress band</span>
          {anySingle && (
            <span><span style={{ display: "inline-block", width: 14, borderTop: `1.5px dashed ${STRESS_PALETTE[0]}`, marginRight: 4, verticalAlign: "middle" }} />Single-variant stress (risk-linked)</span>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {kpis.map((k) => {
          const { suffix, digits } = k;
          const delta =
            k.firstValue !== null && k.lastValue !== null ? k.lastValue - k.firstValue : 0;
          const pctDelta =
            k.firstValue && k.firstValue !== 0 ? (delta / Math.abs(k.firstValue)) * 100 : 0;
          const deltaColor = delta >= 0 ? "#2f8b72" : "#d65454";
          const tooltip = makeTooltip(suffix, digits, k.singleVariantStresses);

          return (
            <div
              key={k.lineKey}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "10px 12px 6px",
                background: "var(--panel)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--ink)" }}>{k.label}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--ink-soft)" }}>
                  {k.firstYear}{k.firstYear !== k.lastYear ? `–${k.lastYear}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "2px 0 4px 0" }}>
                <span style={{ fontFamily: "monospace", fontSize: "1.05rem", fontWeight: 800, color: "var(--ink)" }}>
                  {k.lastValue !== null ? `${k.lastValue.toFixed(digits)}${suffix}` : "—"}
                </span>
                {k.firstValue !== null && k.lastValue !== null && (
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: deltaColor, fontFamily: "monospace" }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(pctDelta).toFixed(1)}%
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height={110}>
                <ComposedChart data={k.data} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                  <XAxis dataKey="year" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 8 }}
                    width={32}
                    tickFormatter={(v: number) =>
                      `${v.toFixed(digits === 0 ? 0 : 1)}${suffix}`
                    }
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={tooltip as any} />

                  {/* Stress band between management case and combined downside */}
                  {k.hasBand && (
                    <Area
                      type="monotone"
                      dataKey="stressBand"
                      stroke="none"
                      fill={BAND_FILL}
                      fillOpacity={0.12}
                      isAnimationActive={false}
                      connectNulls
                    />
                  )}

                  {/* Management case — dashed soft blue */}
                  <Line
                    type="monotone"
                    dataKey="mgmt"
                    stroke={MGMT_COLOR}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />

                  {/* Combined downside — dashed red */}
                  <Line
                    type="monotone"
                    dataKey="downside"
                    stroke={DOWNSIDE_COLOR}
                    strokeWidth={1.3}
                    strokeDasharray="5 3"
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />

                  {/* Single-variant stresses — thin dashed */}
                  {k.singleVariantStresses.map((sv, idx) => (
                    <Line
                      key={sv.dataKey}
                      type="monotone"
                      dataKey={sv.dataKey}
                      stroke={STRESS_PALETTE[idx % STRESS_PALETTE.length]}
                      strokeWidth={1.1}
                      strokeDasharray="2 3"
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                  ))}

                  {/* Actuals — solid bold (rendered last so it sits on top) */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke={ACTUAL_COLOR}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: ACTUAL_DOT_FILL, stroke: ACTUAL_COLOR, strokeWidth: 1 }}
                    isAnimationActive={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Per-card risk attribution footer if any single-variant stresses */}
              {k.singleVariantStresses.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: "0.64rem",
                    color: "var(--ink-soft)",
                    lineHeight: 1.3,
                  }}
                >
                  {k.singleVariantStresses.map((sv, idx) => (
                    <div key={sv.dataKey}>
                      <span
                        style={{
                          display: "inline-block",
                          width: 10,
                          borderTop: `1.5px dashed ${STRESS_PALETTE[idx % STRESS_PALETTE.length]}`,
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      />
                      {sv.label}
                      {sv.riskCode ? ` · ${sv.riskCode}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
