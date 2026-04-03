"use client";

import { useState } from "react";

export default function RevenueRiskTooltip({ code }: { code: string | null }) {
  const [open, setOpen] = useState(false);

  if (!code) return <span>{"\u2014"}</span>;

  // Parse P/V/D components
  const parts = code.match(/P(\d)-V(\d)-D(\d)/);
  const p = parts ? parseInt(parts[1]) : null;
  const v = parts ? parseInt(parts[2]) : null;
  const d = parts ? parseInt(parts[3]) : null;

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          borderBottom: "1px dashed var(--accent)",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        {code}
      </span>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 360,
            background: "var(--panel-strong)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            padding: "14px 16px",
            zIndex: 100,
            fontSize: "0.78rem",
            lineHeight: 1.6,
            color: "var(--ink)",
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{
              position: "absolute", top: 8, right: 10,
              background: "none", border: "none", cursor: "pointer",
              fontSize: "1rem", color: "var(--ink-soft)", fontWeight: 700,
              lineHeight: 1, padding: "2px 6px",
            }}
          >
            &times;
          </button>

          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 8, color: "var(--accent)" }}>
            Revenue Risk Classification
          </div>

          <div style={{ marginBottom: 10 }}>
            The composite code <strong>{code}</strong> is built from three independent dimensions that characterise revenue risk:
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "4px 0", fontWeight: 700, width: 30 }}>P{p}</td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Pricing</strong> &mdash; {pricingLabel(p)}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "4px 0", fontWeight: 700 }}>V{v}</td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Volume</strong> &mdash; {volumeLabel(v)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", fontWeight: 700 }}>D{d}</td>
                <td style={{ padding: "4px 0" }}>
                  <strong>Duration</strong> &mdash; {durationLabel(d)}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
            Lower numbers = lower risk. P1-V1-D1 is the safest profile (fully contracted, guaranteed volume, matched duration).
          </div>
        </div>
      )}
    </span>
  );
}

function pricingLabel(p: number | null): string {
  switch (p) {
    case 1: return "Fixed by contract (lowest risk)";
    case 2: return "Indexed / escalating by formula";
    case 3: return "Regulated / administered";
    case 4: return "Negotiated / re-contracted periodically";
    case 5: return "Market / merchant pricing (highest risk)";
    case 6: return "Hybrid / layered pricing";
    default: return "Unknown";
  }
}

function volumeLabel(v: number | null): string {
  switch (v) {
    case 1: return "Guaranteed / take-or-pay (lowest risk)";
    case 2: return "Contracted with performance conditions";
    case 3: return "Partially contracted";
    case 4: return "Demand-driven, essential / inelastic";
    case 5: return "Demand-driven, elastic / discretionary";
    case 6: return "Speculative / project-dependent (highest risk)";
    default: return "Unknown";
  }
}

function durationLabel(d: number | null): string {
  switch (d) {
    case 1: return "Fully matched or over-hedged (lowest risk)";
    case 2: return "Substantially matched (>80% coverage)";
    case 3: return "Partially matched (50-80% coverage)";
    case 4: return "Under-matched (<50% coverage)";
    case 5: return "No contracted revenue / fully merchant (highest risk)";
    default: return "Unknown";
  }
}
