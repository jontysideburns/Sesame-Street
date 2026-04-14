"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "\u00A3", USD: "$", EUR: "\u20AC",
};

type Props = {
  slug: string;
  currency?: string;
  lockupLevel?: number;
  defaultLevel?: number;
};

type PeriodData = {
  label: string;
  // Management case (forecast)
  f_revenue?: number;
  f_opex?: number;
  f_cfads?: number;
  f_ds?: number;
  f_dscr?: number;
  f_leverage?: number;
  // Actuals
  a_revenue?: number;
  a_opex?: number;
  a_cfads?: number;
  a_ds?: number;
  a_dscr?: number;
  a_leverage?: number;
};

const MGMT_COLORS = {
  revenue: "#9bb8d4",
  opex: "#c4a882",
  cfads: "#8bb89b",
  ds: "#c49090",
  dscr: "#9bb8d4",
  leverage: "#c4a882",
};

const ACTUAL_COLORS = {
  revenue: "#1f6fa5",
  opex: "#c97f1f",
  cfads: "#2f8b72",
  ds: "#d65454",
  dscr: "#1f6fa5",
  leverage: "#c97f1f",
};

function fmtM(v: number) {
  const m = v / 1_000_000;
  const abs = Math.abs(m);
  const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(abs);
  if (m < -0.05) return `(${formatted})m`;
  return `${formatted}m`;
}

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--panel-strong)", border: "1px solid var(--line)",
      borderRadius: 10, padding: "8px 12px", fontSize: "0.75rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 3, background: p.color, display: "inline-block", borderRadius: 1 }} />
          <span>{p.name}: <strong>{typeof p.value === "number" ? (Math.abs(p.value) > 100 ? fmtM(p.value) : p.value.toFixed(2) + "x") : p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

type Horizon = "5" | "10" | "max";

export default function DealCharts({ slug, currency, lockupLevel, defaultLevel }: Props) {
  const [data, setData] = useState<PeriodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<Horizon>("10");

  const sym = CURRENCY_SYMBOLS[currency ?? "USD"] ?? "$";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/proxy/deals/${slug}/topsheet`);
        if (!res.ok) {
          // Try direct API
          const res2 = await fetch(`http://localhost:4000/api/deals/${slug}/topsheet`);
          if (!res2.ok) { setLoading(false); return; }
          const ts = await res2.json();
          processData(ts);
        } else {
          const ts = await res.json();
          processData(ts);
        }
      } catch {
        // Try direct
        try {
          const res = await fetch(`http://localhost:4000/api/deals/${slug}/topsheet`);
          if (res.ok) processData(await res.json());
        } catch { /* ignore */ }
      }
      setLoading(false);
    }

    function processData(ts: any) {
      const periods = (ts.reportingPeriods ?? []).sort((a: any, b: any) => a.period_ordinal - b.period_ordinal);
      const fv = ts.forecastVersions ?? {};
      const mgmtVersionId = fv.management_case?.versionId;

      // Build period lookup
      const periodMap = new Map<number, string>();
      for (const p of periods) {
        // Annualise: extract year
        const year = p.period_flag.replace(/H\d$/, "").replace(/Q\d$/, "");
        periodMap.set(p.id, year);
      }

      // Aggregate forecast by year
      const yearData = new Map<string, PeriodData>();

      // Management case forecasts
      for (const fi of (ts.forecastItems ?? [])) {
        if (mgmtVersionId && fi.forecast_case_version_id !== mgmtVersionId) continue;
        const year = periodMap.get(fi.reporting_period_id);
        if (!year) continue;
        if (!yearData.has(year)) yearData.set(year, { label: year });
        const yd = yearData.get(year)!;
        const v = fi.value;
        if (v == null) continue;

        switch (fi.line_key) {
          case "total_revenue": yd.f_revenue = (yd.f_revenue ?? 0) + v; break;
          case "total_operating_costs": yd.f_opex = (yd.f_opex ?? 0) + v; break;
          case "cfads": yd.f_cfads = (yd.f_cfads ?? 0) + v; break;
          case "senior_debt_service": yd.f_ds = (yd.f_ds ?? 0) + v; break;
          case "senior_dscr": yd.f_dscr = v; break; // Take last period's value
          case "net_debt_ebitda": yd.f_leverage = v; break;
        }
      }

      // Actuals
      for (const ai of (ts.actualItems ?? [])) {
        const year = periodMap.get(ai.reporting_period_id);
        if (!year) continue;
        if (!yearData.has(year)) yearData.set(year, { label: year });
        const yd = yearData.get(year)!;
        const v = ai.approved_value ?? ai.reported_value;
        if (v == null) continue;

        switch (ai.line_key) {
          case "total_revenue": yd.a_revenue = (yd.a_revenue ?? 0) + v; break;
          case "total_operating_costs": yd.a_opex = (yd.a_opex ?? 0) + v; break;
          case "cfads": yd.a_cfads = (yd.a_cfads ?? 0) + v; break;
          case "senior_debt_service": yd.a_ds = (yd.a_ds ?? 0) + v; break;
          case "senior_dscr": yd.a_dscr = v; break;
          case "net_debt_ebitda": yd.a_leverage = v; break;
        }
      }

      // Make opex and DS positive for charting
      for (const yd of yearData.values()) {
        if (yd.f_opex != null) yd.f_opex = Math.abs(yd.f_opex);
        if (yd.f_ds != null) yd.f_ds = Math.abs(yd.f_ds);
        if (yd.a_opex != null) yd.a_opex = Math.abs(yd.a_opex);
        if (yd.a_ds != null) yd.a_ds = Math.abs(yd.a_ds);
      }

      setData(Array.from(yearData.values()).sort((a, b) => a.label.localeCompare(b.label)));
    }

    load();
  }, [slug]);

  if (loading) return <div style={{ padding: 20, color: "var(--ink-soft)", fontSize: "0.82rem" }}>Loading charts...</div>;
  if (data.length === 0) return null;

  // Horizon filtering: always show all past periods (with actuals or up to current year),
  // plus N years of forecast beyond the current year. "max" shows everything.
  const currentYear = new Date().getFullYear();
  const horizonYears = horizon === "max" ? 999 : parseInt(horizon, 10);
  const cutoffYear = currentYear + horizonYears;
  const filtered = data.filter((d) => {
    const y = parseInt(d.label.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(y)) return true;
    return y <= cutoffYear;
  });

  const hasActuals = filtered.some((d) => d.a_revenue != null);
  const hasLeverage = filtered.some((d) => d.f_leverage != null || d.a_leverage != null);

  const toggleBtn = (value: Horizon, label: string) => (
    <button
      key={value}
      onClick={() => setHorizon(value)}
      style={{
        padding: "3px 10px",
        fontSize: "0.72rem",
        fontWeight: 600,
        border: "1px solid var(--line)",
        background: horizon === value ? "var(--accent)" : "var(--panel)",
        color: horizon === value ? "#fff" : "var(--ink-soft)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <article className="topsheet-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <strong>Financial Performance Charts</strong>
        <div style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}>
          {toggleBtn("5", "5yr")}
          {toggleBtn("10", "10yr")}
          {toggleBtn("max", "Max")}
        </div>
      </div>
      <p className="topsheet-meta-note" style={{ marginBottom: 12 }}>
        Management case forecast (light) overlaid with reported actuals (bold) where available.
        {horizon !== "max" && ` Showing ${horizon} years of forecast from ${currentYear}.`}
      </p>

      {/* Chart 1: Cashflows */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 6 }}>
          Cashflow Performance ({sym}m, annual)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart key={`cf-${horizon}`} data={filtered} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tickFormatter={(v: number) => fmtM(v)} tick={{ fontSize: 9 }} width={50} />
            <Tooltip content={<ChartTooltipContent />} />
            {/* Management case — dashed muted lines */}
            <Line type="monotone" dataKey="f_revenue" name="Revenue (Forecast)" stroke={MGMT_COLORS.revenue} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line type="monotone" dataKey="f_opex" name="Opex (Forecast)" stroke={MGMT_COLORS.opex} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line type="monotone" dataKey="f_cfads" name="CFADS (Forecast)" stroke={MGMT_COLORS.cfads} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            <Line type="monotone" dataKey="f_ds" name="Debt Service (Forecast)" stroke={MGMT_COLORS.ds} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            {/* Actuals — solid bold lines */}
            {hasActuals && <>
              <Line type="monotone" dataKey="a_revenue" name="Revenue (Actual)" stroke={ACTUAL_COLORS.revenue} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="a_opex" name="Opex (Actual)" stroke={ACTUAL_COLORS.opex} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="a_cfads" name="CFADS (Actual)" stroke={ACTUAL_COLORS.cfads} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="a_ds" name="Debt Service (Actual)" stroke={ACTUAL_COLORS.ds} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            </>}
            <Legend wrapperStyle={{ fontSize: "0.62rem" }} iconSize={10} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Key Ratios — dual Y-axis */}
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 6 }}>
          Key Financial Ratios
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart key={`rt-${horizon}`} data={filtered} margin={{ top: 5, right: 55, bottom: 5, left: 10 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            {/* Left Y-axis: DSCR (coverage ratios) — starts at 0 */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: ACTUAL_COLORS.dscr }}
              width={40}
              domain={[0, 5]}
              allowDataOverflow
              allowDataOverflow
              tickFormatter={(v: number) => v.toFixed(1) + "x"}
              label={{ value: "DSCR", angle: -90, position: "insideLeft", fontSize: 9, fill: ACTUAL_COLORS.dscr, dx: -5 }}
            />
            {/* Right Y-axis: Leverage (Net Debt / EBITDA) — own scale */}
            {hasLeverage && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: ACTUAL_COLORS.leverage }}
                width={40}
                domain={[0, "auto"]}
                tickFormatter={(v: number) => v.toFixed(1) + "x"}
                label={{ value: "ND/EBITDA", angle: 90, position: "insideRight", fontSize: 9, fill: ACTUAL_COLORS.leverage, dx: 5 }}
              />
            )}
            <Tooltip content={<ChartTooltipContent />} />
            {/* Threshold reference lines (on DSCR axis) */}
            {lockupLevel && <ReferenceLine yAxisId="left" y={lockupLevel} stroke="#c97f1f" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Lockup", fontSize: 8, fill: "#c97f1f", position: "right" }} />}
            {defaultLevel && <ReferenceLine yAxisId="left" y={defaultLevel} stroke="#d65454" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Default", fontSize: 8, fill: "#d65454", position: "right" }} />}
            {/* DSCR — left axis */}
            <Line yAxisId="left" type="monotone" dataKey="f_dscr" name="DSCR (Forecast)" stroke={MGMT_COLORS.dscr} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
            {hasActuals && (
              <Line yAxisId="left" type="monotone" dataKey="a_dscr" name="DSCR (Actual)" stroke={ACTUAL_COLORS.dscr} strokeWidth={2.5} connectNulls
                dot={(props: { cx?: number; cy?: number; payload?: { a_dscr?: number }; index?: number }) => {
                  const { cx, cy, payload, index } = props;
                  if (cx == null || cy == null || payload?.a_dscr == null) return <g key={`dot-${index ?? 0}`} />;
                  const breached = defaultLevel != null && payload.a_dscr < defaultLevel;
                  return (
                    <circle
                      key={`dot-${index ?? 0}`}
                      cx={cx}
                      cy={cy}
                      r={3.5}
                      stroke={ACTUAL_COLORS.dscr}
                      strokeWidth={1.5}
                      fill={breached ? "#d65454" : "#ffffff"}
                    />
                  );
                }}
              />
            )}
            {/* Leverage — right axis */}
            {hasLeverage && <>
              <Line yAxisId="right" type="monotone" dataKey="f_leverage" name="ND/EBITDA (Forecast)" stroke={MGMT_COLORS.leverage} strokeWidth={1.5} strokeDasharray="6 3" dot={false} connectNulls />
              {hasActuals && (
                <Line yAxisId="right" type="monotone" dataKey="a_leverage" name="ND/EBITDA (Actual)" stroke={ACTUAL_COLORS.leverage} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              )}
            </>}
            <Legend wrapperStyle={{ fontSize: "0.62rem" }} iconSize={10} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
