"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Treemap,
} from "recharts";
import type { Deal } from "./jps-filter-grid";

/* ── Colours ─────────────────────────────────────────────────────── */

const C = {
  good: "#2f8b72",
  warning: "#c97f1f",
  critical: "#d65454",
  accent: "#1f6fa5",
  neutral: "#45617a",
  muted: "#8fa3b8",
};

const GRADE_COLORS: Record<string, string> = {
  good: C.good,
  neutral: "#4a90c4",
  warning: C.warning,
  critical: C.critical,
};

/* ── Credit Rating Scale (Moody's numeric mapping) ───────────────── */

// Unified scale: maps S&P, Moody's, Fitch, and internal ratings to numeric values
// Lower number = better credit quality
const RATING_TO_NUMERIC: Record<string, number> = {
  // S&P / Fitch scale
  "AAA": 1, "AA+": 2, "AA": 3, "AA-": 4, "A+": 5, "A": 6, "A-": 7,
  "BBB+": 8, "BBB": 9, "BBB-": 10, "BB+": 11, "BB": 12, "BB-": 13,
  "B+": 14, "B": 15, "B-": 16, "CCC+": 17, "CCC": 18, "CCC-": 19,
  "CC": 20, "C": 21, "D": 22,
  // Moody's scale
  "Aaa": 1, "Aa1": 2, "Aa2": 3, "Aa3": 4, "A1": 5, "A2": 6, "A3": 7,
  "Baa1": 8, "Baa2": 9, "Baa3": 10, "Ba1": 11, "Ba2": 12, "Ba3": 13,
  "B1": 14, "B2": 15, "B3": 16, "Caa1": 17, "Caa2": 18, "Caa3": 19,
  "Ca": 20, "C_moody": 21,
};

// Reverse: numeric back to Moody's display scale
const NUMERIC_TO_MOODYS: Record<number, string> = {
  1: "Aaa", 2: "Aa1", 3: "Aa2", 4: "Aa3", 5: "A1", 6: "A2", 7: "A3",
  8: "Baa1", 9: "Baa2", 10: "Baa3", 11: "Ba1", 12: "Ba2", 13: "Ba3",
  14: "B1", 15: "B2", 16: "B3", 17: "Caa1", 18: "Caa2", 19: "Caa3",
  20: "Ca", 21: "C", 22: "D",
};

/** Get the assigned numeric rating for a deal:
 *  - If 3 external ratings: use the middle (median)
 *  - If 2 external ratings: use the lower (higher numeric = worse)
 *  - If 1 external rating: use it
 *  - If 0 external ratings: use internal credit score from IC memo
 */
function assignedRatingNumeric(deal: Deal): number | null {
  const externals: number[] = [];
  if (deal.moodysRating && RATING_TO_NUMERIC[deal.moodysRating] != null) externals.push(RATING_TO_NUMERIC[deal.moodysRating]);
  if (deal.spRating && RATING_TO_NUMERIC[deal.spRating] != null) externals.push(RATING_TO_NUMERIC[deal.spRating]);
  if (deal.fitchRating && RATING_TO_NUMERIC[deal.fitchRating] != null) externals.push(RATING_TO_NUMERIC[deal.fitchRating]);

  if (externals.length >= 3) {
    externals.sort((a, b) => a - b);
    return externals[1]; // middle of three
  }
  if (externals.length === 2) {
    return Math.max(externals[0], externals[1]); // lower of two (higher number = worse)
  }
  if (externals.length === 1) {
    return externals[0];
  }
  // Fall back to internal credit score
  if (deal.internalCreditScore && RATING_TO_NUMERIC[deal.internalCreditScore] != null) {
    return RATING_TO_NUMERIC[deal.internalCreditScore];
  }
  return null;
}

function gradeTone(grade: string) {
  if (grade.startsWith("1")) return "good";
  if (grade.startsWith("2")) return "neutral";
  if (grade.startsWith("3")) return "warning";
  return "critical";
}

const TREND_COLORS: Record<string, string> = {
  improving: C.good,
  flat: C.accent,
  new: C.neutral,
  deteriorating: C.warning,
  deteriorating_rapidly: C.critical,
};

const COVENANT_COLORS: Record<string, string> = {
  performing: C.good,
  distribution_lockup: C.warning,
  trigger_event: C.critical,
  event_of_default: "#a03030",
};

/* ── Formatters ──────────────────────────────────────────────────── */

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  }).format(n);
}

function fmtPct(n: number | null) {
  if (n == null) return "\u2014";
  return `${n.toFixed(1)}%`;
}

/* ── Custom Tooltip ──────────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; payload?: { fill?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--panel-strong)", border: "1px solid var(--line)",
      borderRadius: 12, padding: "8px 12px", fontSize: "0.82rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.payload?.fill ?? C.accent, display: "inline-block" }} />
          <span>{p.name}: <strong>{typeof p.value === "number" ? fmtCompact(p.value) : p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

/* ── Treemap Content ─────────────────────────────────────────────── */

function TreemapContent(props: {
  x: number; y: number; width: number; height: number;
  name: string; value: number; fill: string;
}) {
  const { x, y, width, height, name, value, fill } = props;
  if (width < 50 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6}
        style={{ fill, stroke: "rgba(255,255,255,0.4)", strokeWidth: 1 }} />
      <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle"
        style={{ fontSize: width < 80 ? 10 : 12, fill: "#fff", fontWeight: 700 }}>
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
        style={{ fontSize: width < 80 ? 9 : 11, fill: "rgba(255,255,255,0.8)" }}>
        {fmtCompact(value)}
      </text>
    </g>
  );
}

/* ── Donut Centre Label ──────────────────────────────────────────── */

function DonutCentreLabel({ viewBox, value }: { viewBox?: { cx: number; cy: number }; value: string }) {
  if (!viewBox) return null;
  return (
    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 22, fontWeight: 800, fill: "var(--ink)" }}>
      {value}
    </text>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */

export default function PortfolioSummary({ deals }: { deals: Deal[] }) {
  const stats = useMemo(() => {
    const totalExposure = deals.reduce((s, d) => s + d.exposure, 0);
    const dealCount = deals.length;

    // Weighted avg DSCR
    let dscrNum = 0, dscrDen = 0;
    for (const d of deals) {
      if (d.reportedDscr != null) { dscrNum += d.exposure * d.reportedDscr; dscrDen += d.exposure; }
    }
    const weightedDscr = dscrDen > 0 ? dscrNum / dscrDen : null;

    // Weighted avg headroom
    let hdrNum = 0, hdrDen = 0;
    for (const d of deals) {
      if (d.headroomPct != null) { hdrNum += d.exposure * d.headroomPct; hdrDen += d.exposure; }
    }
    const avgHeadroom = hdrDen > 0 ? hdrNum / hdrDen : null;

    // Weighted avg spread (exposure-weighted)
    let spreadNum = 0, spreadDen = 0;
    for (const d of deals) {
      if (d.spreadBps != null) { spreadNum += d.exposure * d.spreadBps; spreadDen += d.exposure; }
    }
    const waSpread = spreadDen > 0 ? Math.round(spreadNum / spreadDen) : null;

    // Weighted average life (exposure-weighted)
    let walNum = 0, walDen = 0;
    for (const d of deals) {
      if (d.walYears != null) { walNum += d.exposure * d.walYears; walDen += d.exposure; }
    }
    const waLife = walDen > 0 ? walNum / walDen : null;

    // Weighted average credit rating (exposure-weighted, Moody's scale)
    let ratingNum = 0, ratingDen = 0;
    for (const d of deals) {
      const n = assignedRatingNumeric(d);
      if (n != null) { ratingNum += d.exposure * n; ratingDen += d.exposure; }
    }
    const waRatingNumeric = ratingDen > 0 ? Math.round(ratingNum / ratingDen) : null;
    const waRatingLabel = waRatingNumeric != null ? (NUMERIC_TO_MOODYS[waRatingNumeric] ?? `~${waRatingNumeric}`) : null;

    const watchlistCount = deals.filter((d) => d.watchlist).length;
    const overdueCount = deals.reduce((s, d) => s + (d.overdueObligations ?? 0), 0);

    // Grade distribution — always show all 4 grades + Watchlist
    const GRADE_SLOTS: { grade: string; tone: string }[] = [
      { grade: "1 - Outperforming", tone: "good" },
      { grade: "2 - In Line", tone: "neutral" },
      { grade: "3 - Underperforming", tone: "warning" },
      { grade: "4 - Watchlist", tone: "critical" },
    ];
    const gradeMap: Record<string, { grade: string; count: number; exposure: number }> = {};
    for (const slot of GRADE_SLOTS) {
      gradeMap[slot.grade] = { grade: slot.grade, count: 0, exposure: 0 };
    }
    for (const d of deals) {
      if (gradeMap[d.grade]) {
        gradeMap[d.grade].count++;
        gradeMap[d.grade].exposure += d.exposure;
      }
    }
    const gradeData = GRADE_SLOTS
      .map((slot) => ({ ...gradeMap[slot.grade], fill: GRADE_COLORS[slot.tone] ?? C.neutral }));

    // Sector concentration
    const sectorMap: Record<string, { name: string; value: number; count: number }> = {};
    for (const d of deals) {
      if (!sectorMap[d.sector]) sectorMap[d.sector] = { name: d.sector, value: 0, count: 0 };
      sectorMap[d.sector].value += d.exposure;
      sectorMap[d.sector].count++;
    }
    const sectorData = Object.values(sectorMap)
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, fill: `hsl(205, 55%, ${35 + i * 8}%)` }));

    // Trend distribution
    const trendMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      const t = d.performanceTrend ?? "unknown";
      if (!trendMap[t]) trendMap[t] = { name: t.replace(/_/g, " "), value: 0 };
      trendMap[t].value++;
    }
    const trendData = Object.entries(trendMap).map(([key, val]) => ({
      ...val,
      fill: TREND_COLORS[key] ?? C.muted,
    }));

    // Covenant status
    const covMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      const s = d.covenantStatus;
      if (!covMap[s]) covMap[s] = { name: s.replace(/_/g, " "), value: 0 };
      covMap[s].value++;
    }
    const covenantData = Object.entries(covMap).map(([key, val]) => ({
      ...val,
      fill: COVENANT_COLORS[key] ?? C.muted,
    }));

    // Country breakdown (exposure-weighted from jurisdiction splits)
    const countryMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      if (d.jurisdictionSplits && d.jurisdictionSplits.length > 0) {
        for (const s of d.jurisdictionSplits) {
          if (!countryMap[s.countryCode]) countryMap[s.countryCode] = { name: s.countryName, value: 0 };
          countryMap[s.countryCode].value += d.exposure * (s.activityPct / 100);
        }
      } else if (d.primaryCountryName) {
        if (!countryMap[d.primaryCountry ?? "XX"]) countryMap[d.primaryCountry ?? "XX"] = { name: d.primaryCountryName, value: 0 };
        countryMap[d.primaryCountry ?? "XX"].value += d.exposure;
      }
    }
    const COUNTRY_PALETTE = [
      "#1f6fa5", "#2f8b72", "#c97f1f", "#d65454", "#6a5acd",
      "#20b2aa", "#cd853f", "#708090", "#b22222", "#4682b4",
    ];
    const countryData = Object.values(countryMap)
      .sort((a, b) => b.value - a.value)
      .map((c, i) => ({ ...c, fill: COUNTRY_PALETTE[i % COUNTRY_PALETTE.length] }));

    // Security ranking breakdown
    const rankMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      const r = d.securityRanking ?? "Unknown";
      if (!rankMap[r]) rankMap[r] = { name: r, value: 0 };
      rankMap[r].value += d.exposure;
    }
    const securityData = Object.values(rankMap)
      .sort((a, b) => b.value - a.value)
      .map((s, i) => ({ ...s, fill: i === 0 ? C.accent : `hsl(205, 45%, ${45 + i * 12}%)` }));

    // Instrument format breakdown
    const FORMAT_LABELS: Record<string, string> = {
      loan: "Loan", bond: "Bond", note: "Note", frn: "FRN",
      il_bond: "IL Bond", private_placement: "Private Placement",
      convertible: "Convertible", other: "Other",
    };
    const formatMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      const f = d.instrumentFormat ?? "unknown";
      if (!formatMap[f]) formatMap[f] = { name: FORMAT_LABELS[f] ?? f, value: 0 };
      formatMap[f].value += d.exposure;
    }
    const formatData = Object.values(formatMap)
      .sort((a, b) => b.value - a.value)
      .map((f, i) => ({ ...f, fill: `hsl(205, 50%, ${32 + i * 12}%)` }));

    // Credit rating breakdown — all converted to Moody's scale
    const ratingMap: Record<string, { name: string; value: number; numericSort: number }> = {};
    for (const d of deals) {
      const numRating = assignedRatingNumeric(d);
      const moodysLabel = numRating != null ? (NUMERIC_TO_MOODYS[numRating] ?? "Unrated") : "Unrated";
      if (!ratingMap[moodysLabel]) ratingMap[moodysLabel] = { name: moodysLabel, value: 0, numericSort: numRating ?? 99 };
      ratingMap[moodysLabel].value += d.exposure;
    }
    const ratingData = Object.values(ratingMap)
      .sort((a, b) => a.numericSort - b.numericSort)
      .map((r, i) => ({ name: r.name, value: r.value, fill: `hsl(205, 50%, ${30 + i * 10}%)` }));

    // Ratio status breakdown
    const ratioMap: Record<string, { name: string; value: number }> = {};
    for (const d of deals) {
      const s = d.ratioStatus ?? "unknown";
      if (!ratioMap[s]) ratioMap[s] = { name: s.replace(/_/g, " "), value: 0 };
      ratioMap[s].value++;
    }
    const ratioStatusData = Object.entries(ratioMap).map(([key, val]) => ({
      ...val,
      fill: COVENANT_COLORS[key] ?? C.muted,
    }));

    // Attention lists
    const watchlistDeals = deals.filter((d) => d.watchlist).slice(0, 5);
    const deterioratingDeals = deals
      .filter((d) => d.performanceTrend === "deteriorating" || d.performanceTrend === "deteriorating_rapidly")
      .slice(0, 5);
    const breachedDeals = deals
      .filter((d) => d.covenantStatus === "trigger_event" || d.covenantStatus === "event_of_default")
      .slice(0, 5);

    return {
      totalExposure, dealCount, waSpread, waLife, waRatingLabel, weightedDscr, avgHeadroom,
      watchlistCount, overdueCount,
      sectorData, countryData, securityData, formatData,
      ratingData, gradeData, trendData, covenantData, ratioStatusData,
      watchlistDeals, deterioratingDeals, breachedDeals,
      totalWatchlist: deals.filter((d) => d.watchlist).length,
      totalDeteriorating: deals.filter((d) => d.performanceTrend === "deteriorating" || d.performanceTrend === "deteriorating_rapidly").length,
      totalBreached: deals.filter((d) => d.covenantStatus === "trigger_event" || d.covenantStatus === "event_of_default").length,
    };
  }, [deals]);

  if (deals.length === 0) return null;

  return (
    <div className="jps-summary-grid" style={{ marginBottom: 14 }}>

      {/* ── Row 1: KPI Cards (flex row for 7 items) ──────────── */}
      <div style={{ gridColumn: "span 12", display: "flex", gap: 10 }}>
        <KpiCard label="Exposure" value={fmtCompact(stats.totalExposure)} />
        <KpiCard label="Deals" value={String(stats.dealCount)} />
        <KpiCard
          label="WA Rating"
          value={stats.waRatingLabel ?? "\u2014"}
        />
        <KpiCard
          label="WA Spread"
          value={stats.waSpread != null ? `${stats.waSpread}bp` : "\u2014"}
        />
        <KpiCard
          label="WA Life"
          value={stats.waLife != null ? `${stats.waLife.toFixed(1)}yr` : "\u2014"}
        />
        <KpiCard
          label="Wtd DSCR"
          value={stats.weightedDscr != null ? `${stats.weightedDscr.toFixed(2)}x` : "\u2014"}
          tone={stats.weightedDscr != null ? (stats.weightedDscr < 1.0 ? "critical" : stats.weightedDscr < 1.2 ? "warning" : "good") : undefined}
        />
        <KpiCard
          label="Headroom"
          value={fmtPct(stats.avgHeadroom)}
          tone={stats.avgHeadroom != null ? (stats.avgHeadroom < 30 ? "critical" : stats.avgHeadroom < 70 ? "warning" : "good") : undefined}
        />
        <KpiCard
          label="Watchlist"
          value={String(stats.watchlistCount)}
          tone={stats.watchlistCount > 0 ? "warning" : "good"}
        />
      </div>

      {/* ── Row 2: Composition (Sector, Country, Security, Format) ── */}
      <ChartPanel title="Sector">
        <ResponsiveContainer width="100%" height={140}>
          <Treemap data={stats.sectorData} dataKey="value" stroke="none"
            content={<TreemapContent x={0} y={0} width={0} height={0} name="" value={0} fill="" />} />
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Country">
        <DonutWithLegend data={stats.countryData} />
      </ChartPanel>

      <ChartPanel title="Security Ranking">
        <DonutWithLegend data={stats.securityData} />
      </ChartPanel>

      <ChartPanel title="Format">
        <DonutWithLegend data={stats.formatData} />
      </ChartPanel>

      {/* ── Row 3: Performance (Rating, Grade, Trend, Covenant) ── */}
      <ChartPanel title="Credit Rating">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={stats.ratingData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 9 }} width={42} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Exposure" radius={[4, 4, 0, 0]}>
              {stats.ratingData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Performance Grade">
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={stats.gradeData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey="grade" tick={false} />
            <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 9 }} width={42} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="exposure" name="Exposure" radius={[4, 4, 0, 0]}>
              {stats.gradeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {stats.gradeData.map((g) => {
            const parts = g.grade.split(" - ");
            return (
              <div key={g.grade} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: g.fill, display: "inline-block" }} />
                <span style={{ fontSize: "0.60rem", fontWeight: 700, color: "var(--ink)" }}>{parts[0]}</span>
                <span style={{ fontSize: "0.55rem", color: "var(--ink-soft)", lineHeight: 1.1, textAlign: "center", maxWidth: 55 }}>{parts[1]}</span>
              </div>
            );
          })}
        </div>
      </ChartPanel>

      <ChartPanel title="Trend">
        <DonutWithLegend data={stats.trendData} />
      </ChartPanel>

      <ChartPanel title="Covenant Status">
        <DonutWithLegend data={stats.covenantData} />
      </ChartPanel>

      {/* ── Row 4: Attention Lists ──────────────────────────────── */}
      <AttentionPanel
        title="Watchlist Deals"
        tone="warning"
        count={stats.totalWatchlist}
        items={stats.watchlistDeals}
        badgeKey="grade"
      />
      <AttentionPanel
        title="Deteriorating Trends"
        tone="warning"
        count={stats.totalDeteriorating}
        items={stats.deterioratingDeals}
        badgeKey="trend"
      />
      <AttentionPanel
        title="Covenant Breaches"
        tone="critical"
        count={stats.totalBreached}
        items={stats.breachedDeals}
        badgeKey="covenant"
      />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function DonutWithLegend({ data, height = 130 }: { data: { name: string; value: number; fill: string }[]; height?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, height }}>
      {/* Legend on left */}
      <div style={{ flex: "0 0 auto", minWidth: 0, maxWidth: "50%", overflow: "hidden" }}>
        {data.map((entry, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, fontSize: "0.62rem", lineHeight: 1.2 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: entry.fill, flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.name} <strong style={{ color: "var(--ink)" }}>({entry.value >= 1000 ? fmtCompact(entry.value) : entry.value})</strong>
            </span>
          </div>
        ))}
      </div>
      {/* Donut on right */}
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={2} label={false}>
              {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="jps-chart-panel" style={{ borderRadius: 14, border: "1px solid var(--line)", background: "var(--panel)", padding: "8px 10px" }}>
      <h3 style={{ fontSize: "0.65rem", fontWeight: 700, marginBottom: 4, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const color = tone === "critical" ? C.critical : tone === "warning" ? C.warning : tone === "good" ? C.good : undefined;
  return (
    <div style={{
      flex: 1, borderRadius: 14, border: "1px solid var(--line)",
      background: "var(--panel)", padding: "8px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: "0.62rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: color ?? "var(--ink)", fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

function AttentionPanel({ title, tone, count, items, badgeKey }: {
  title: string;
  tone: "warning" | "critical";
  count: number;
  items: Deal[];
  badgeKey: "grade" | "trend" | "covenant";
}) {
  return (
    <div className="jps-attention-panel" style={{
      borderRadius: 14, border: "1px solid var(--line)",
      background: "var(--panel)", padding: "8px 12px", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <h3 style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--ink-soft)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </h3>
        <span className={`badge ${tone} badge-sm`}>{count}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontStyle: "italic" }}>None</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map((d) => (
            <div key={d.dealSlug} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: "0.73rem" }}>
              <Link href={`/deals/${d.dealSlug}`} style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {d.dealName}
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {badgeKey === "grade" && <span className={`badge ${gradeTone(d.grade)} badge-sm`}>{d.grade}</span>}
                {badgeKey === "trend" && <span className={`badge ${d.performanceTrend === "deteriorating_rapidly" ? "critical" : "warning"} badge-sm`}>{(d.performanceTrend ?? "").replace(/_/g, " ")}</span>}
                {badgeKey === "covenant" && <span className={`badge critical badge-sm`}>{d.covenantStatus.replace(/_/g, " ")}</span>}
                <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontFamily: "monospace" }}>{fmtCompact(d.exposure)}</span>
              </div>
            </div>
          ))}
          {count > 5 && (
            <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)", fontStyle: "italic" }}>
              and {count - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
