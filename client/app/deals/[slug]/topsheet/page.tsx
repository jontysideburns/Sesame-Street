import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchJson } from "../../../../api/http";
import { getDeal } from "../../../../api/deals";
import ForecastGrid from "./forecast-grid";

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt(n: number | null | undefined) {
  if (n == null) return "\u2014";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number | null | undefined) {
  if (n == null) return "\u2014";
  return `${Number(n).toFixed(1)}%`;
}
function fmtDec(n: number | null | undefined, dp = 2) {
  if (n == null) return "\u2014";
  return Number(n).toFixed(dp);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function tone(status: string) {
  if (["fully_funded", "performing", "active", "complete", "strong", "stable", "on_track"].includes(status)) return "good";
  if (["partially_funded", "distribution_lockup", "delayed", "watch", "concern", "enhanced", "approaching_stress"].includes(status)) return "warning";
  if (["unfunded", "trigger_event", "event_of_default", "overdue", "critical", "breached_stress"].includes(status)) return "critical";
  return "neutral";
}
function clean(s: string | null | undefined) {
  return s ? s.replace(/_/g, " ") : "\u2014";
}

/* ── Styles ──────────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: "0.70rem",
  textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)",
  borderBottom: "2px solid var(--line)", whiteSpace: "nowrap",
};
const thR: React.CSSProperties = { ...thStyle, textAlign: "right" };
const td: React.CSSProperties = { padding: "6px 8px", fontSize: "0.80rem", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontFamily: "monospace" };
const tdBold: React.CSSProperties = { ...td, fontWeight: 600 };

/* ── Sub-components ──────────────────────────────────────────────── */

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel section-panel">
      <header className="panel-heading">
        <p className="panel-eyebrow">{eyebrow}</p>
        <h2 className="panel-title">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function DL({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "8px 24px" }}>
      {items.map(([label, value], i) => (
        <div key={i}>
          <dt style={{ fontSize: "0.70rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 2 }}>{label}</dt>
          <dd style={{ fontSize: "0.85rem", fontWeight: 500, margin: 0 }}>{value ?? "\u2014"}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontStyle: "italic", padding: "12px 0" }}>{message}</p>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ── Page ────────────────────────────────────────────────────────── */

export default async function TopSheetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let ts: any;
  let deal: any;
  try {
    ts = await fetchJson<any>(`/api/deals/${slug}/topsheet`);
  } catch {
    notFound();
  }
  try {
    deal = await getDeal(slug);
  } catch {
    // Deal detail may fail for new deals with incomplete data — use safe defaults
    deal = {
      distributionAssessment: null,
      obligations: [],
      forecastSummary: { scenarioCount: 0, scenarios: [] },
      riskSnapshot: { entries: [], openCount: 0, highSeverityCount: 0 },
    };
  }

  const d = ts.deal;

  return (
    <main className="shell">
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="hero-body">
          <p className="section-eyebrow">TopSheet</p>
          <h1 className="hero-title" style={{ whiteSpace: "nowrap" }}>{d.name}</h1>
          <p className="hero-sub">{d.borrower} &middot; {d.sector} &middot; {d.region} &middot; {d.currency}</p>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button secondary" href={`/deals/${slug}`}>&larr; Back to Deal</Link>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 1: Deal Identity ═══════════════════════════ */}
      <Section eyebrow="F.1" title="Deal Identity & Overview">
        <DL items={[
          ["Borrower", d.borrower_legal_name || d.borrower],
          ["Trading Name", d.borrower_trading_name],
          ["LEI", d.borrower_lei],
          ["Jurisdiction", d.borrower_jurisdiction],
          ["Registered Address", d.borrower_registered_address],
          ["Sector", d.sector],
          ["Sub-Sector", d.sub_sector_label],
          ["Deal Type", d.deal_type],
          ["Phase", clean(d.phase)],
          ["Sponsor", d.sponsor_name],
          ["Sponsor Fund", d.sponsor_fund],
          ["Region", d.region],
          ["Country", d.primary_business_country_name || d.country],
          ["Currency", d.currency],
        ]} />
        <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Key Dates</h3>
        <DL items={[
          ["Origination", fmtDate(d.origination_date)],
          ["Commitment", fmtDate(d.commitment_date)],
          ["First Drawdown", fmtDate(d.first_drawdown_date)],
          ["COD", fmtDate(d.cod_date)],
          ["Maturity", fmtDate(d.maturity_date)],
          ["WAL", d.weighted_average_life ? `${Number(d.weighted_average_life).toFixed(1)} years` : "\u2014"],
          ["Concession Expiry", fmtDate(d.concession_expiry_date)],
          ["Fiscal Year End", d.fiscal_year_end_month ? `Month ${d.fiscal_year_end_month}` : "\u2014"],
        ]} />
        <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Ratings & Classification</h3>
        <DL items={[
          ["Moody's", d.moodys_rating],
          ["S&P", d.sp_rating],
          ["Fitch", d.fitch_rating],
          ["Internal Score", d.internal_credit_score],
          ["Performance Grade", d.performance_grade ? `Grade ${d.performance_grade}` : "\u2014"],
          ["Watchlist", d.watchlist ? "Active" : "Standard"],
          ["Revenue Risk", d.revenue_risk],
          ["Contracted Revenue", d.contracted_revenue_pct ? `${d.contracted_revenue_pct}%` : "\u2014"],
          ["Merchant Revenue", d.merchant_revenue_pct ? `${d.merchant_revenue_pct}%` : "\u2014"],
          ["Duration Coverage", d.duration_coverage_pct ? `${d.duration_coverage_pct}%` : "\u2014"],
        ]} />
      </Section>

      {/* ═══ SECTION 2: Capital Structure ══════════════════════════ */}
      <Section eyebrow="F.2A" title="Capital Structure">
        {ts.capitalStructure?.length > 0 ? (
          <div className="jps-table-wrap">
            <table className="jps-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Priority</th>
                  <th style={thStyle}>Instrument</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Format</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Pari-Passu</th>
                  <th style={thR}>Committed</th>
                  <th style={thR}>Drawn</th>
                  <th style={thR}>Margin (bps)</th>
                  <th style={thR}>All-In Rate</th>
                  <th style={thStyle}>Maturity</th>
                  <th style={thR}>Our Holding</th>
                  <th style={thR}>Our %</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ts.capitalStructure.map((inst: any) => (
                  <tr key={inst.id}>
                    <td style={td}>{inst.waterfall_priority}</td>
                    <td style={tdBold}>{inst.instrument_name}</td>
                    <td style={td}>{clean(inst.instrument_type)}</td>
                    <td style={td}>{clean(inst.instrument_format)}</td>
                    <td style={td}>{inst.enforcement_class || "\u2014"}</td>
                    <td style={td}>{inst.pari_passu_group || "\u2014"}</td>
                    <td style={tdR}>{fmt(inst.committed_amount)}</td>
                    <td style={tdR}>{fmt(inst.drawn_amount)}</td>
                    <td style={tdR}>{inst.margin_bps ?? "\u2014"}</td>
                    <td style={tdR}>{inst.all_in_rate ? fmtPct(inst.all_in_rate * 100) : "\u2014"}</td>
                    <td style={td}>{fmtDate(inst.maturity_date)}</td>
                    <td style={tdR}>{fmt(inst.our_holding)}</td>
                    <td style={tdR}>{inst.our_holding_pct ? fmtPct(inst.our_holding_pct) : "\u2014"}</td>
                    <td style={td}><span className={`badge ${tone(inst.status)} badge-sm`}>{clean(inst.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No capital structure instruments configured." />}

        {ts.enforcementClasses?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Enforcement Classes</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Class</th><th style={thStyle}>Code</th><th style={thStyle}>Priority</th><th style={thStyle}>Instruments</th></tr></thead>
                <tbody>
                  {ts.enforcementClasses.map((ec: any) => (
                    <tr key={ec.id}>
                      <td style={tdBold}>{ec.class_name}</td>
                      <td style={td}><code>{ec.class_code}</code></td>
                      <td style={td}>{ec.priority}</td>
                      <td style={td}>{ec.included_instruments ? JSON.stringify(ec.included_instruments).substring(0, 80) : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {ts.corporateEntities?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Corporate Entity Structure</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Entity</th><th style={thStyle}>Type</th><th style={thStyle}>Parent</th><th style={thStyle}>Jurisdiction</th><th style={thStyle}>Ring-Fenced</th></tr></thead>
                <tbody>
                  {ts.corporateEntities.map((e: any) => (
                    <tr key={e.id}>
                      <td style={tdBold}>{e.entity_name}</td>
                      <td style={td}>{clean(e.entity_type)}</td>
                      <td style={td}>{e.parent_entity || "\u2014"}</td>
                      <td style={td}>{e.jurisdiction || "\u2014"}</td>
                      <td style={td}>{e.ring_fenced ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ═══ SECTION 3: Counterparties & Investors ═════════════════ */}
      <Section eyebrow="F.4" title="Counterparties & Investors">
        {ts.counterparties?.length > 0 ? (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>Key Counterparties</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Type</th><th style={thStyle}>Rating</th><th style={thR}>Contract Value</th><th style={thStyle}>Expiry</th><th style={thStyle}>Replacement Risk</th></tr></thead>
                <tbody>
                  {ts.counterparties.map((cp: any) => (
                    <tr key={cp.id}>
                      <td style={tdBold}>{cp.name}</td>
                      <td style={td}>{clean(cp.counterparty_type)}</td>
                      <td style={td}>{cp.credit_rating || "\u2014"}</td>
                      <td style={tdR}>{fmt(cp.contract_value)}</td>
                      <td style={td}>{fmtDate(cp.contract_expiry)}</td>
                      <td style={td}>{cp.replacement_risk ? <span className={`badge ${tone(cp.replacement_risk)} badge-sm`}>{cp.replacement_risk}</span> : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <EmptyState message="No counterparties configured." />}

        {ts.investorAllocations?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Investor Allocations</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Investor</th><th style={thStyle}>Mandate</th><th style={thStyle}>Tranche</th><th style={thR}>Amount</th><th style={thR}>Mandate Size</th><th style={thR}>% of Mandate</th></tr></thead>
                <tbody>
                  {ts.investorAllocations.map((ia: any) => (
                    <tr key={ia.id}>
                      <td style={tdBold}>{ia.investor_name}</td>
                      <td style={td}>{ia.account_mandate || "\u2014"}</td>
                      <td style={td}>{ia.tranche || "\u2014"}</td>
                      <td style={tdR}>{fmt(ia.amount)}</td>
                      <td style={tdR}>{fmt(ia.mandate_size)}</td>
                      <td style={tdR}>{ia.pct_of_mandate ? fmtPct(ia.pct_of_mandate) : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {ts.intercreditorTerms && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Intercreditor Terms</h3>
            <DL items={[
              ["Agreement Type", ts.intercreditorTerms.agreement_type],
              ["Governing Law", ts.intercreditorTerms.governing_law],
              ["Standstill (days)", ts.intercreditorTerms.enforcement_standstill_days],
              ["Non-Petition", ts.intercreditorTerms.non_petition_clause ? "Yes" : "No"],
            ]} />
          </>
        )}
      </Section>

      {/* ═══ SECTION 4: Reserve Accounts & Liquidity ═══════════════ */}
      <Section eyebrow="F.2A.6" title="Reserve Accounts & Liquidity">
        {ts.reserveAccounts?.length > 0 ? (
          <div className="jps-table-wrap">
            <table className="jps-table" style={{ marginBottom: 0 }}>
              <thead><tr><th style={thStyle}>Account</th><th style={thStyle}>Type</th><th style={thStyle}>Sizing</th><th style={thR}>Required</th><th style={thR}>Current</th><th style={thStyle}>Funding</th><th style={thStyle}>Status</th><th style={thR}>Shortfall</th></tr></thead>
              <tbody>
                {ts.reserveAccounts.map((ra: any) => {
                  const req = ra.required_balance ?? 0;
                  const act = ra.current_balance ?? 0;
                  const shortfall = req > act ? req - act : 0;
                  const parts: string[] = [];
                  if (ra.cash_amount > 0) parts.push(`Cash ${fmt(ra.cash_amount)}`);
                  if (ra.lc_amount > 0) parts.push(`LC ${fmt(ra.lc_amount)}`);
                  if (ra.pcg_amount > 0) parts.push(`PCG ${fmt(ra.pcg_amount)}`);
                  return (
                    <tr key={ra.id}>
                      <td style={tdBold}>{ra.account_name}</td>
                      <td style={td}>{clean(ra.account_type)}</td>
                      <td style={td}>{ra.sizing_basis || "\u2014"}</td>
                      <td style={tdR}>{fmt(req)}</td>
                      <td style={tdR}>{fmt(act)}</td>
                      <td style={td}>{parts.join(" + ") || "\u2014"}</td>
                      <td style={td}><span className={`badge ${tone(ra.funded_status)} badge-sm`}>{clean(ra.funded_status)}{ra.periods_underfunded > 0 ? ` (${ra.periods_underfunded})` : ""}</span></td>
                      <td style={{ ...tdR, color: shortfall > 0 ? "var(--critical)" : undefined, fontWeight: shortfall > 0 ? 700 : 400 }}>{shortfall > 0 ? fmt(shortfall) : "\u2014"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No reserve accounts configured." />}

        {ts.hedgePortfolio?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Hedge Portfolio</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Type</th><th style={thR}>Notional</th><th style={thR}>% of Debt</th><th style={thR}>Fixed Rate</th><th style={thR}>Strike</th><th style={thStyle}>Counterparty</th><th style={thStyle}>Rating</th><th style={thR}>MTM</th><th style={thStyle}>Maturity</th></tr></thead>
                <tbody>
                  {ts.hedgePortfolio.map((h: any) => (
                    <tr key={h.id}>
                      <td style={td}>{clean(h.hedge_type)}</td>
                      <td style={tdR}>{fmt(h.notional)}</td>
                      <td style={tdR}>{h.pct_of_debt ? fmtPct(h.pct_of_debt) : "\u2014"}</td>
                      <td style={tdR}>{h.fixed_rate ? fmtPct(h.fixed_rate * 100) : "\u2014"}</td>
                      <td style={tdR}>{h.strike ? fmtPct(h.strike * 100) : "\u2014"}</td>
                      <td style={td}>{h.counterparty || "\u2014"}</td>
                      <td style={td}>{h.counterparty_rating || "\u2014"}</td>
                      <td style={tdR}>{fmt(h.mark_to_market)}</td>
                      <td style={td}>{fmtDate(h.maturity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ═══ SECTION 5: Financial Template & KPIs ══════════════════ */}
      <Section eyebrow="F.5 / F.7" title="Financial Template & Sector KPIs">
        {ts.financialTemplate ? (
          <DL items={[
            ["Sector Template", clean(ts.financialTemplate.sector_template)],
            ["Revenue Lines", (ts.financialTemplate.revenue_line_labels || []).join(", ") || "\u2014"],
            ["Cost Lines", (ts.financialTemplate.cost_line_labels || []).join(", ") || "\u2014"],
            ["Capex Lines", (ts.financialTemplate.capex_line_labels || []).join(", ") || "\u2014"],
            ["Sector KPIs", (ts.financialTemplate.sector_kpi_labels || []).join(", ") || "\u2014"],
          ]} />
        ) : <EmptyState message="No financial template configured." />}
      </Section>

      {/* ═══ F.8: Forecast Scenarios ═══════════════════════════════ */}
      <Section eyebrow="F.8" title="Forecast Scenarios">
        {deal.forecastSummary?.scenarioCount > 0 ? (
          <>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 12 }}>
              {deal.forecastSummary.scenarioCount} scenario{deal.forecastSummary.scenarioCount !== 1 ? "s" : ""} configured.
            </p>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Scenario</th><th style={thStyle}>Type</th><th style={thR}>Revenue Delta</th><th style={thR}>DSCR Delta</th></tr></thead>
                <tbody>
                  {deal.forecastSummary.scenarios?.map((s: any, i: number) => (
                    <tr key={i}>
                      <td style={tdBold}>{s.caseName}</td>
                      <td style={td}><span className={`badge neutral badge-sm`}>{clean(s.caseType)}</span></td>
                      <td style={tdR}>{s.deltaToMonitoring?.revenue != null ? fmt(s.deltaToMonitoring.revenue) : "\u2014"}</td>
                      <td style={tdR}>{s.deltaToMonitoring?.dscr != null ? `${fmtDec(s.deltaToMonitoring.dscr)}x` : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <EmptyState message="No forecast scenarios configured." />}
      </Section>

      {/* ═══ F.5.2: Forecast Grid with Case Selector ═══════════════ */}
      {ts.reportingPeriods?.length > 0 && ts.lineItemDefinitions?.length > 0 && (
        <Section eyebrow="F.5.2" title="Financial Forecast Grid">
          <ForecastGrid
            periods={ts.reportingPeriods}
            lineItems={ts.lineItemDefinitions}
            dealLabels={ts.dealLineLabels ?? {}}
            forecastItems={ts.forecastItems ?? []}
            actualItems={ts.actualItems ?? []}
          />
        </Section>
      )}

      {/* ═══ SECTION 6: Financial Performance ══════════════════════ */}
      <Section eyebrow="F.5.2" title="Financial Performance">
        <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>Key Metrics</h3>
        <DL items={[
          ["Revenue", fmt(d.metrics?.revenue)],
          ["EBITDA", fmt(d.metrics?.ebitda)],
          ["CFADS", fmt(d.metrics?.cfads)],
          ["Debt Service", fmt(d.metrics?.debtService)],
          ["Net Debt", fmt(d.metrics?.netDebt)],
          ["Cash", fmt(d.metrics?.cash)],
          ["DSCR", d.metrics?.dscr ? `${fmtDec(d.metrics.dscr)}x` : "\u2014"],
          ["Leased Capacity", d.metrics?.leasedCapacityPct ? `${d.metrics.leasedCapacityPct}%` : "\u2014"],
        ]} />

        {ts.latestPeriods?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Latest Reporting Periods</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Period</th><th style={thStyle}>End Date</th><th style={thStyle}>Status</th><th style={thStyle}>Summary</th></tr></thead>
                <tbody>
                  {ts.latestPeriods.map((p: any) => (
                    <tr key={p.id}>
                      <td style={tdBold}>{p.period_label}</td>
                      <td style={td}>{fmtDate(p.period_end)}</td>
                      <td style={td}><span className={`badge ${tone(p.status)} badge-sm`}>{clean(p.status)}</span></td>
                      <td style={td}>{p.summary || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {ts.latestCovenantTests?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Covenant Test Results</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Covenant</th><th style={thStyle}>Type</th><th style={thR}>Value</th><th style={thR}>Lockup</th><th style={thR}>Trigger</th><th style={thR}>Default</th><th style={thStyle}>Status</th></tr></thead>
                <tbody>
                  {ts.latestCovenantTests.map((ct: any) => (
                    <tr key={ct.id}>
                      <td style={tdBold}>{ct.covenant_name}</td>
                      <td style={td}>{clean(ct.test_type)}</td>
                      <td style={tdR}>{fmtDec(ct.ratio_value)}</td>
                      <td style={tdR}>{fmtDec(ct.lockup_threshold)}</td>
                      <td style={tdR}>{fmtDec(ct.trigger_threshold)}</td>
                      <td style={tdR}>{fmtDec(ct.default_threshold)}</td>
                      <td style={td}><span className={`badge ${tone(ct.tier_status)} badge-sm`}>{clean(ct.tier_status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* ═══ SECTION 7: Risk Register ══════════════════════════════ */}
      <Section eyebrow="F.11" title="Risk Register">
        {ts.riskSummary && Object.keys(ts.riskSummary).length > 0 ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {Object.entries(ts.riskSummary).map(([level, count]) => (
                <span key={level} className={`badge ${tone(level)} badge-sm`}>
                  {clean(level)}: {String(count)}
                </span>
              ))}
            </div>
            {deal.riskSnapshot?.entries?.length > 0 && (
              <div className="jps-table-wrap">
                <table className="jps-table" style={{ marginBottom: 0 }}>
                  <thead><tr><th style={thStyle}>Risk</th><th style={thStyle}>Category</th><th style={thStyle}>Severity</th><th style={thStyle}>Likelihood</th><th style={thStyle}>Trend</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {deal.riskSnapshot.entries.slice(0, 10).map((r: any) => (
                      <tr key={r.id}>
                        <td style={tdBold}>{r.title}</td>
                        <td style={td}>{r.category || "\u2014"}</td>
                        <td style={td}><span className={`badge ${tone(r.severity)} badge-sm`}>{r.severity}</span></td>
                        <td style={td}>{r.likelihood || "\u2014"}</td>
                        <td style={td}>{r.trend ? clean(r.trend) : "\u2014"}</td>
                        <td style={td}>{clean(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : <EmptyState message="No risk assessments recorded." />}
      </Section>

      {/* ═══ SECTION 8: Development & Construction ═════════════════ */}
      <Section eyebrow="F.15" title="Development & Construction">
        {ts.developmentPhases?.length > 0 ? (
          <div className="jps-table-wrap">
            <table className="jps-table" style={{ marginBottom: 0 }}>
              <thead><tr><th style={thStyle}>#</th><th style={thStyle}>Phase</th><th style={thR}>Budget</th><th style={thR}>Actual</th><th style={thR}>Variance</th><th style={thStyle}>Start</th><th style={thStyle}>Target End</th><th style={thStyle}>Actual End</th><th style={thStyle}>Status</th></tr></thead>
              <tbody>
                {ts.developmentPhases.map((p: any) => (
                  <tr key={p.id}>
                    <td style={td}>{p.phase_number}</td>
                    <td style={tdBold}>{p.phase_name}</td>
                    <td style={tdR}>{fmt(p.capex_budget)}</td>
                    <td style={tdR}>{fmt(p.actual_spend)}</td>
                    <td style={{ ...tdR, color: p.variance < 0 ? "var(--critical)" : undefined }}>{fmt(p.variance)}</td>
                    <td style={td}>{fmtDate(p.start_date)}</td>
                    <td style={td}>{fmtDate(p.target_end_date)}</td>
                    <td style={td}>{fmtDate(p.actual_end_date)}</td>
                    <td style={td}><span className={`badge ${tone(p.status)} badge-sm`}>{clean(p.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message="No development phases configured." />}
      </Section>

      {/* ═══ SECTION 9: Distribution & Compliance ══════════════════ */}
      <Section eyebrow="F.12" title="Distribution & Compliance">
        {deal.distributionAssessment ? (
          <>
            <DL items={[
              ["Status", deal.distributionAssessment.status ? <span className={`badge ${tone(deal.distributionAssessment.status)} badge-sm`}>{clean(deal.distributionAssessment.status)}</span> : "\u2014"],
              ["Lockup State", clean(deal.distributionAssessment.lockupState)],
              ["Distribution Capacity", fmt(deal.distributionAssessment.distributionCapacity)],
              ["Cash Trap", fmt(deal.distributionAssessment.cashTrapAmount)],
              ["Blocker Count", deal.distributionAssessment.blockerCount],
            ]} />
            {deal.distributionAssessment.failedConditions?.length > 0 && (
              <>
                <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 12, marginBottom: 8, color: "var(--accent)" }}>Failed Conditions</h3>
                {deal.distributionAssessment.failedConditions.map((fc: any, i: number) => (
                  <div key={i} style={{ fontSize: "0.80rem", marginBottom: 4 }}>
                    <span className={`badge ${tone(fc.status)} badge-sm`}>{fc.code}</span>{" "}
                    <strong>{fc.label}</strong>: {fc.detail}
                  </div>
                ))}
              </>
            )}
          </>
        ) : <EmptyState message="No distribution assessment available." />}

        {deal.obligations?.length > 0 && (
          <>
            <h3 style={{ fontSize: "0.80rem", fontWeight: 700, marginTop: 16, marginBottom: 8, color: "var(--accent)" }}>Compliance Obligations</h3>
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={thStyle}>Code</th><th style={thStyle}>Title</th><th style={thStyle}>Due</th><th style={thStyle}>Status</th><th style={thR}>Days Overdue</th></tr></thead>
                <tbody>
                  {deal.obligations.map((o: any) => (
                    <tr key={o.id}>
                      <td style={td}><code>{o.code}</code></td>
                      <td style={tdBold}>{o.title}</td>
                      <td style={td}>{o.dueDate}</td>
                      <td style={td}><span className={`badge ${tone(o.status)} badge-sm`}>{clean(o.status)}</span></td>
                      <td style={tdR}>{o.daysOverdue > 0 ? o.daysOverdue : "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

    </main>
  );
}
