"use client";

import { useState } from "react";

/* ── Forecast Grid ───────────────────────────────────────────────────────────
 * Renders the full life-of-investment cashflow template as a scrollable grid.
 * Rows = line items (grouped by section), Columns = periods (left to right).
 * Selector to switch between Management Case, Credit Case, Combined Downside, or Actuals.
 * Cells show forecast values if populated, or empty placeholders awaiting data.
 */

type Period = {
  id: number;
  period_flag: string;
  period_label: string;
  period_type: string;
};

type LineItem = {
  line_key: string;
  section: string;
  display_label: string;
  row_order: number;
  is_generic: boolean;
  is_computed: boolean;
  unit: string;
  parent_line_key: string | null;
};

type Props = {
  periods: Period[];
  lineItems: LineItem[];
  dealLabels: Record<string, string>;
  forecastItems: { forecast_case_version_id: number; reporting_period_id: number; line_key: string; value: number | null }[];
  actualItems: { reporting_period_id: number; line_key: string; approved_value: number | null; reported_value: number | null }[];
  currency?: string;
};

/* ── Section display order and labels ──────────────────────────────────────── */

const SECTION_ORDER = [
  { key: "operating_cashflow", label: "Operating Cash Flow" },
  { key: "capex", label: "Capital Expenditure" },
  { key: "working_capital", label: "Working Capital, Reserves & Tax" },
  { key: "additional_sources", label: "Additional Sources" },
  { key: "funding", label: "Funding Sources" },
  { key: "cfads", label: "Cash Available for Debt Service" },
  { key: "senior_ds", label: "Senior Debt Service" },
  { key: "junior_ds", label: "Junior Debt Service" },
  { key: "shareholder_interco", label: "Shareholder & Intercompany" },
  { key: "fees", label: "Other Fees & Costs" },
  { key: "net_cashflow", label: "Net Cashflow & Closing" },
  { key: "covenant_core", label: "Core Covenant Ratios" },
  { key: "covenant_project_finance", label: "Project Finance Ratios" },
  { key: "covenant_real_estate", label: "Real Estate Ratios" },
  { key: "covenant_regulated", label: "Regulated Utility Ratios" },
  { key: "covenant_social", label: "Social Infrastructure Ratios" },
  { key: "moodys_metrics", label: "Moody's Metrics" },
  { key: "moodys_ratios", label: "Moody's Ratios" },
  { key: "pnl", label: "Supplementary P&L Items" },
  { key: "balance_sheet", label: "Balance Sheet & Reserves" },
  { key: "sector_kpi", label: "Sector KPIs" },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fmtCell(value: number | null | undefined, unit: string) {
  if (value == null) return "";
  if (unit === "ratio") return value.toFixed(2) + "x";
  if (unit === "percentage") return value.toFixed(1) + "%";
  if (unit === "count") return value.toFixed(1);
  // currency — expressed in thousands, comma-separated
  const inThousands = value / 1000;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(inThousands);
}

/* ── Component ───────────────────────────────────────────────────────────── */

type ViewMode = "management_case" | "credit_case" | "combined_downside" | "actuals";

const VIEW_LABELS: Record<ViewMode, string> = {
  management_case: "Management Case",
  credit_case: "Credit Case",
  combined_downside: "Combined Downside",
  actuals: "Actuals",
};

const CASE_ASSUMPTIONS: Record<string, { title: string; assumptions: string[] }> = {
  credit_case: {
    title: "Credit Case Assumptions",
    assumptions: [
      "Revenue: Cumulative 0.25% per annum decline vs management case (0.25% year 1, 0.50% year 2, 0.75% year 3, etc.)",
      "Operating costs: 5% higher than management case in every period",
      "Tax: Falls proportionally with reduced EBITDA",
      "Capital expenditure: Unchanged from management case",
      "Debt service: Unchanged (fixed-rate amortising note)",
      "All other assumptions: Same as management case",
    ],
  },
  combined_downside: {
    title: "Combined Downside Assumptions",
    assumptions: [
      "Revenue: P90 resource assumption (10% below P50 base case)",
      "Operating costs: 10% above management case",
      "Major component failure in year 5",
      "Grid curtailment increased to 8%",
    ],
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "\u00A3", USD: "$", EUR: "\u20AC", CHF: "CHF", JPY: "\u00A5",
  AUD: "A$", CAD: "C$", SGD: "S$", HKD: "HK$", NZD: "NZ$",
};

export default function ForecastGrid({ periods, lineItems, dealLabels, forecastItems, actualItems, currency }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("management_case");
  const [showAssumptions, setShowAssumptions] = useState(false);

  const currSymbol = CURRENCY_SYMBOLS[currency ?? "USD"] ?? currency ?? "$";

  // Build lookup maps
  const forecastMap = new Map<string, number | null>();
  for (const fi of forecastItems) {
    forecastMap.set(`${fi.reporting_period_id}:${fi.line_key}`, fi.value);
  }
  const actualMap = new Map<string, number | null>();
  for (const ai of actualItems) {
    actualMap.set(`${ai.reporting_period_id}:${ai.line_key}`, ai.approved_value ?? ai.reported_value);
  }

  // Filter to generic line items only (not subcategory slots unless they have deal labels)
  const visibleItems = lineItems.filter((li) => {
    if (li.is_generic) return true;
    return !!dealLabels[li.line_key];
  });

  // Group line items by section
  const sectionMap = new Map<string, LineItem[]>();
  for (const li of visibleItems) {
    if (!sectionMap.has(li.section)) sectionMap.set(li.section, []);
    sectionMap.get(li.section)!.push(li);
  }

  // Sort periods
  const sortedPeriods = [...periods].sort((a, b) => a.id - b.id);

  const thStyle: React.CSSProperties = {
    padding: "4px 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.06em", whiteSpace: "nowrap", position: "sticky", top: 0,
    background: "var(--panel-strong)", borderBottom: "2px solid var(--line)", zIndex: 2,
  };
  const sectionHeaderStyle: React.CSSProperties = {
    padding: "4px 6px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", background: "var(--accent)", color: "white", whiteSpace: "nowrap",
  };
  const rowLabelStyle: React.CSSProperties = {
    padding: "3px 6px", fontSize: "0.70rem", fontWeight: 600, whiteSpace: "nowrap",
    position: "sticky", left: 0, background: "var(--panel-strong)", zIndex: 1,
    borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line-light, var(--line))",
    minWidth: 180, maxWidth: 240,
  };
  const subRowLabelStyle: React.CSSProperties = {
    ...rowLabelStyle, fontWeight: 400, paddingLeft: 16, color: "var(--ink-soft)", fontSize: "0.65rem",
  };
  const cellStyle: React.CSSProperties = {
    padding: "3px 6px", fontSize: "0.65rem", textAlign: "right", fontFamily: "monospace",
    whiteSpace: "nowrap", borderBottom: "1px solid var(--line-light, var(--line))",
    minWidth: 70,
  };

  return (
    <div>
      {/* Case selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", marginRight: 4 }}>
          View:
        </span>
        {CASE_ASSUMPTIONS[viewMode] && (
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            style={{
              padding: "5px 14px", borderRadius: 8,
              border: showAssumptions ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: showAssumptions ? "var(--accent-soft)" : "var(--panel)",
              color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap", marginRight: 8,
            }}
          >
            Assumptions
          </button>
        )}
        {(Object.entries(VIEW_LABELS) as [ViewMode, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: viewMode === key ? "2px solid var(--accent)" : "1px solid var(--line)",
              background: viewMode === key ? "var(--accent)" : "var(--panel)",
              color: viewMode === key ? "white" : "var(--ink)",
              fontSize: "0.75rem",
              fontWeight: viewMode === key ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Assumptions popup */}
      {showAssumptions && CASE_ASSUMPTIONS[viewMode] && (
        <div style={{
          background: "var(--panel-strong)", border: "1px solid var(--line)",
          borderRadius: 14, padding: "14px 18px", marginBottom: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)", position: "relative",
        }}>
          <button
            onClick={() => setShowAssumptions(false)}
            style={{
              position: "absolute", top: 8, right: 12,
              background: "none", border: "none", cursor: "pointer",
              fontSize: "1.1rem", color: "var(--ink-soft)", fontWeight: 700,
            }}
          >&times;</button>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)", marginBottom: 8 }}>
            {CASE_ASSUMPTIONS[viewMode].title}
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.80rem", lineHeight: 1.7, color: "var(--ink)" }}>
            {CASE_ASSUMPTIONS[viewMode].assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh", border: "1px solid var(--line)", borderRadius: 12 }}>
      <table style={{ borderCollapse: "collapse", width: "max-content" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, position: "sticky", left: 0, zIndex: 3, minWidth: 180, textAlign: "left", background: "var(--panel-strong)" }}>
              Line Item
            </th>
            {sortedPeriods.map((p) => (
              <th key={p.id} style={{
                ...thStyle, textAlign: "center",
                color: p.period_type === "forecast" ? "var(--accent)" : p.period_type === "current" ? "var(--warning)" : "var(--ink-soft)",
              }}>
                {p.period_label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SECTION_ORDER.map((sec) => {
            const items = sectionMap.get(sec.key);
            if (!items || items.length === 0) return null;
            return (
              <React.Fragment key={sec.key}>
                {/* Section header row */}
                <tr>
                  <td style={sectionHeaderStyle}>
                    {sec.label}
                    {!["covenant_core","covenant_project_finance","covenant_real_estate","covenant_regulated","covenant_social","moodys_metrics","moodys_ratios","sector_kpi"].includes(sec.key) && (
                      <span style={{ fontWeight: 400, fontSize: "0.55rem", marginLeft: 6, opacity: 0.8 }}>{currSymbol}&apos;000s</span>
                    )}
                  </td>
                  {sortedPeriods.map((p) => (
                    <td key={p.id} style={{ ...sectionHeaderStyle, textAlign: "center" }}></td>
                  ))}
                </tr>
                {/* Line item rows */}
                {items.map((li) => {
                  const label = dealLabels[li.line_key] || li.display_label;
                  const isSubItem = !!li.parent_line_key;
                  return (
                    <tr key={li.line_key}>
                      <td style={isSubItem ? subRowLabelStyle : rowLabelStyle}>{label}</td>
                      {sortedPeriods.map((p) => {
                        const actual = actualMap.get(`${p.id}:${li.line_key}`);
                        const forecast = forecastMap.get(`${p.id}:${li.line_key}`);
                        // Show based on selected view mode
                        const value = viewMode === "actuals" ? actual : (forecast ?? null);
                        const isActual = viewMode === "actuals" && actual != null;
                        return (
                          <td key={p.id} style={{
                            ...cellStyle,
                            color: value != null ? (isActual ? "var(--ink)" : "var(--ink-soft)") : "var(--line)",
                            fontWeight: isActual ? 600 : 400,
                            background: isActual ? "rgba(47, 139, 114, 0.04)" : undefined,
                          }}>
                            {value != null ? fmtCell(value, li.unit) : "\u00B7"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}

// Need React import for Fragment
import React from "react";
