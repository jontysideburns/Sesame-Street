import type { CapitalStackResponse } from "../../../../api/capital-stack";

// ─── Formatters ──────────────────────────────────────────────────────────
const CCY_SYM: Record<string, string> = { GBP: "\u00A3", USD: "$", EUR: "\u20AC" };

function sym(ccy: string) { return CCY_SYM[ccy] ?? ""; }

function fmtMillions(amt: number | null | undefined, ccy: string): string {
  if (amt == null) return "\u2014";
  const m = amt / 1_000_000;
  const abs = Math.abs(m);
  const formatted = new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(abs);
  const out = m < 0 ? `(${formatted})` : formatted;
  return `${sym(ccy)}${out}m`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `${n.toFixed(1)}%`;
}

function fmtX(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `${n.toFixed(2)}x`;
}

// ─── Colour tokens ───────────────────────────────────────────────────────
const COLORS = {
  rank1: "#1f6fa5",
  rank2: "#c97f1f",
  rank3: "#a03030",
  equity: "#2f8b72",
  parallel: "#8b5a9f",
  line: "var(--line)",
  panel: "var(--panel)",
  panelStrong: "var(--panel-strong)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  accent: "var(--accent)",
  warning: "#c97f1f",
  critical: "#d65454",
  good: "#2f8b72",
};

function rankColor(rank: number): string {
  if (rank === 1) return COLORS.rank1;
  if (rank === 2) return COLORS.rank2;
  return COLORS.rank3;
}

function statusTone(status: "green" | "amber" | "red"): string {
  if (status === "red") return COLORS.critical;
  if (status === "amber") return COLORS.warning;
  return COLORS.good;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function CapitalStackBlock({ data }: { data: CapitalStackResponse | null }) {
  if (!data) {
    return (
      <article className="topsheet-note topsheet-note-info">
        <strong>Capital Stack not available</strong>
        <p>The server did not return a Capital Stack view. This deal may be missing an Enterprise Value (Tab 1, VALUATION & EQUITY), or capital structure instruments are not yet configured.</p>
      </article>
    );
  }

  const ccy = data.reporting_currency;
  const ev = data.valuation.enterprise_value;
  const hasEv = ev > 0;

  // Derive the visual layer list — bottom up (rank 1 = senior, first on the stack)
  // plus the residual equity as the top-most "layer"
  const visualLayers: Array<{
    label: string;
    entity: string;
    total: number;
    our: number;
    rank: number | "equity";
    color: string;
    pct: number;
    residual: number;
  }> = [];

  for (const lyr of data.layers) {
    visualLayers.push({
      label: lyr.rank === 1 ? "Senior secured" : `Subordinated (rank ${lyr.rank})`,
      entity: lyr.entity_name,
      total: lyr.debt_total,
      our: lyr.debt_our,
      rank: lyr.rank,
      color: rankColor(lyr.rank),
      pct: hasEv ? (lyr.debt_total / ev) * 100 : 0,
      residual: lyr.residual_after_debt,
    });
  }
  // Residual equity at the top
  if (hasEv) {
    visualLayers.push({
      label: "Residual equity",
      entity: "Shareholders",
      total: data.residual_equity,
      our: 0,
      rank: "equity",
      color: COLORS.equity,
      pct: (data.residual_equity / ev) * 100,
      residual: data.residual_equity,
    });
  }

  const our = data.our_position;
  const ourDominantLayer = visualLayers.find(
    (v) => typeof v.rank === "number" && v.rank === our.dominant_rank,
  );
  const ourCushion = our.total_cushion_below_us ?? 0;

  // Visual stack bar — each layer sized proportional to its share of EV.
  // Linear; no branching per decision #4. Stacks render BOTTOM (senior) first.
  const barWidth = 620;
  const barHeight = 24;

  return (
    <article className="topsheet-card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: "1rem" }}>Capital Stack</strong>
        <span style={{ fontSize: "0.72rem", color: COLORS.inkSoft }}>
          {hasEv ? (
            <>
              EV <strong>{fmtMillions(ev, ccy)}</strong>
              {data.valuation.date && <> as at <strong>{data.valuation.date}</strong></>}
              {data.valuation.method && <> ({data.valuation.method})</>}
              {data.currency !== ccy && <> &middot; converted to {ccy} at spot</>}
            </>
          ) : (
            <span style={{ color: COLORS.warning }}>Enterprise Value missing \u2014 populate Tab 1</span>
          )}
        </span>
      </div>
      <p className="topsheet-meta-note" style={{ marginBottom: 12 }}>
        Anchored at <strong>{data.valuation.entity ?? "\u2014"}</strong>. Each row shows a layer of
        the stack from senior-most (rank 1) at the bottom through to residual equity at the top.
        Total column is the whole market position at that layer; Our column is our client&apos;s slice.
      </p>

      {/* ─── Two-column layered table ─────────────────────────────── */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
              <th style={thStyle}>Layer</th>
              <th style={thStyle}>Entity</th>
              <th style={thRight}>Total</th>
              <th style={thRight}>Our holding</th>
              <th style={thRight}>% of EV</th>
              <th style={thRight}>Priority</th>
            </tr>
          </thead>
          <tbody>
            {/* Render top-down (equity first, senior last) for visual stack convention */}
            {[...visualLayers].reverse().map((v, i) => {
              const isEquity = v.rank === "equity";
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                  <td style={{ ...td, color: v.color, fontWeight: isEquity ? 600 : 700 }}>{v.label}</td>
                  <td style={{ ...td, color: COLORS.inkSoft }}>{v.entity}</td>
                  <td style={{ ...tdRight, fontWeight: 600 }}>{fmtMillions(v.total, ccy)}</td>
                  <td style={{ ...tdRight, fontWeight: 600, color: v.our > 0 ? COLORS.accent : COLORS.inkSoft }}>
                    {v.our > 0 ? fmtMillions(v.our, ccy) : fmtMillions(0, ccy)}
                  </td>
                  <td style={tdRight}>{hasEv ? fmtPct(v.pct) : "\u2014"}</td>
                  <td style={{ ...tdRight, fontSize: "0.72rem", color: v.color }}>
                    {isEquity ? "Rank \u221E" : `Rank ${v.rank}${our.dominant_rank === v.rank ? " (our position)" : ""}`}
                  </td>
                </tr>
              );
            })}
            {/* EV total */}
            {hasEv && (
              <tr style={{ background: "var(--panel-strong)", borderTop: `2px solid var(--line-strong)` }}>
                <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Enterprise Value</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>{fmtMillions(ev, ccy)}</td>
                <td style={{ ...tdRight, fontWeight: 700, color: COLORS.accent }}>{fmtMillions(our.total_holding, ccy)}</td>
                <td style={{ ...tdRight, fontWeight: 700 }}>100.0%</td>
                <td style={tdRight}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Visual stack bar ─────────────────────────────────────── */}
      {hasEv && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Stack — horizontal proportions
          </div>
          <div style={{ display: "flex", width: "100%", height: barHeight, borderRadius: 4, overflow: "hidden", border: `1px solid ${COLORS.line}` }}>
            {/* Render bottom-up: senior first (left = senior = first claim) */}
            {visualLayers.map((v, i) => (
              <div
                key={i}
                title={`${v.label}: ${fmtMillions(v.total, ccy)} (${v.pct.toFixed(1)}% of EV)`}
                style={{
                  background: v.color,
                  width: `${v.pct}%`,
                  color: "#fff",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRight: i < visualLayers.length - 1 ? "1px solid rgba(255,255,255,0.35)" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  padding: "0 4px",
                }}
              >
                {v.pct >= 8 ? (typeof v.rank === "number" ? `R${v.rank}` : "Equity") : ""}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: COLORS.inkSoft, marginTop: 2 }}>
            <span>First claim on cashflows (senior)</span>
            <span>Residual (equity)</span>
          </div>
        </div>
      )}

      {/* ─── Metrics panel — two lenses ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 16 }}>
        <MetricCard
          label="Senior LTV"
          value={fmtPct(data.metrics.senior_ltv_pct)}
          sub="Rank 1 debt / EV"
        />
        <MetricCard
          label="CTA-consolidated leverage"
          value={fmtX(data.metrics.consolidated_leverage_x)}
          sub={`In-perimeter debt ${fmtMillions(data.metrics.consolidated_debt_total, ccy)}`}
        />
        {data.parallel_claims.length > 0 ? (
          <MetricCard
            label="Grossed-up equivalent leverage"
            value={fmtX(data.metrics.grossed_up_equivalent_leverage_x)}
            sub={`Incl. parallel claims grossed up: ${fmtMillions(data.metrics.grossed_up_equivalent_debt, ccy)}`}
            tone="warn"
          />
        ) : (
          <MetricCard
            label="Consolidated LTV"
            value={fmtPct(data.metrics.consolidated_ltv_pct)}
            sub="In-perimeter debt / EV"
          />
        )}
      </div>

      {/* ─── Parallel claims (if any) ─────────────────────────────── */}
      {data.parallel_claims.length > 0 && (
        <div style={{ marginBottom: 16, padding: "10px 12px", border: `1px solid ${COLORS.parallel}`, borderRadius: 8, background: "rgba(139, 90, 159, 0.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ color: COLORS.parallel }}>Parallel claims (outside the consolidated group)</strong>
            <span style={{ fontSize: "0.72rem", color: COLORS.inkSoft }}>
              Not in the priority waterfall \u2014 secured on specific shareholder stakes
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.line}`, textAlign: "left" }}>
                <th style={thStyle}>Instrument</th>
                <th style={thStyle}>Pledged on</th>
                <th style={thRight}>Face</th>
                <th style={thRight}>Pledge %</th>
                <th style={thRight}>Gross-up</th>
                <th style={thRight}>Equivalent debt</th>
              </tr>
            </thead>
            <tbody>
              {data.parallel_claims.map((pc, i) => (
                <tr key={i}>
                  <td style={td}>{pc.instrument_name}</td>
                  <td style={{ ...td, color: COLORS.inkSoft }}>{pc.pledged_share_entity}</td>
                  <td style={tdRight}>{fmtMillions(pc.face_value, ccy)}</td>
                  <td style={tdRight}>{pc.pledged_share_pct.toFixed(2)}%</td>
                  <td style={tdRight}>{pc.gross_up_factor.toFixed(2)}x</td>
                  <td style={{ ...tdRight, fontWeight: 700, color: COLORS.parallel }}>
                    {fmtMillions(pc.grossed_up_equivalent, ccy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Change-of-control coverage ───────────────────────────── */}
      {data.change_of_control.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Change-of-control coverage
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.line}`, textAlign: "left" }}>
                <th style={thStyle}>Instrument</th>
                <th style={thStyle}>Pledged entity</th>
                <th style={thRight}>Pledged value</th>
                <th style={thRight}>Face</th>
                <th style={thRight}>LTV on pledge</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.change_of_control.map((coc, i) => (
                <tr key={i}>
                  <td style={td}>{coc.instrument_name}</td>
                  <td style={{ ...td, color: COLORS.inkSoft }}>{coc.pledged_share_entity}</td>
                  <td style={tdRight}>{fmtMillions(coc.pledged_value, ccy)}</td>
                  <td style={tdRight}>{fmtMillions(coc.face_value, ccy)}</td>
                  <td style={{ ...tdRight, fontWeight: 700 }}>{coc.ltv_on_pledge_pct.toFixed(1)}%</td>
                  <td style={td}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      background: statusTone(coc.status),
                      color: "#fff",
                    }}>
                      {coc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Our position summary ─────────────────────────────────── */}
      {our.dominant_rank != null && (
        <div style={{ padding: "10px 14px", background: COLORS.panelStrong, borderRadius: 8, border: `1px solid ${COLORS.accent}`, borderLeft: `4px solid ${COLORS.accent}`, marginBottom: hasEv ? 8 : 0 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: COLORS.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Our position
          </div>
          <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.5 }}>
            We hold <strong>{fmtMillions(our.total_holding, ccy)}</strong>
            {ourDominantLayer && <> of the <strong>{fmtMillions(ourDominantLayer.total, ccy)}</strong> {ourDominantLayer.label.toLowerCase()}</>}
            , ranked <strong>#{our.dominant_rank}</strong>
            {typeof our.debt_senior_to_us === "number" && (
              <>. Debt senior to us: <strong>{fmtMillions(our.debt_senior_to_us, ccy)}</strong></>
            )}
            {typeof our.subordinated_cushion === "number" && our.subordinated_cushion > 0 && (
              <>. Subordinated cushion: <strong>{fmtMillions(our.subordinated_cushion, ccy)}</strong></>
            )}
            {typeof our.true_equity_cushion === "number" && (
              <>. Equity cushion: <strong>{fmtMillions(our.true_equity_cushion, ccy)}</strong></>
            )}
            {ourCushion > 0 && hasEv && (
              <>. Total cushion below us: <strong>{fmtMillions(ourCushion, ccy)}</strong> ({fmtPct((ourCushion / ev) * 100)} of EV).</>
            )}
          </p>
        </div>
      )}

      {/* ─── Warnings ─────────────────────────────────────────────── */}
      {data.warnings.length > 0 && (
        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(201, 127, 31, 0.08)", border: `1px solid ${COLORS.warning}`, borderRadius: 6, fontSize: "0.78rem" }}>
          <strong style={{ color: COLORS.warning }}>Validation</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
            {data.warnings.map((w, i) => (
              <li key={i} style={{ color: w.severity === "error" ? COLORS.critical : COLORS.inkSoft }}>
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

// ─── Small KPI card ──────────────────────────────────────────────────────
function MetricCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "good" }) {
  const accent = tone === "warn" ? COLORS.warning : tone === "good" ? COLORS.good : COLORS.accent;
  return (
    <div style={{
      padding: "10px 12px",
      background: COLORS.panelStrong,
      border: `1px solid ${COLORS.line}`,
      borderRadius: 6,
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: COLORS.ink, marginTop: 2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.68rem", color: COLORS.inkSoft, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: "0.66rem",
  fontWeight: 700,
  color: "var(--ink-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 10px", fontSize: "0.82rem" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "var(--font-mono, monospace)" };
