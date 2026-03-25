import Link from "next/link";
import { getPortfolio } from "../api/portfolio";

const capabilityGroups = [
  {
    title: "Compliance Monitoring",
    phase: "Live now",
    description: "Track obligations, due dates, grace windows, and fulfilment status across every monitored deal."
  },
  {
    title: "Covenant Testing",
    phase: "Live now",
    description: "Calculate ratio status, threshold headroom, and evidence-backed drilldowns for covenant health."
  },
  {
    title: "Distribution Assessment",
    phase: "Next",
    description: "Test all lock-up conditions, reserve requirements, and distribution permissions at each calculation date."
  },
  {
    title: "Variance Analysis",
    phase: "Next",
    description: "Compare reported metrics to baseline case expectations with materiality logic and period context."
  },
  {
    title: "Trend Detection",
    phase: "Next",
    description: "Detect multi-period deterioration and route persistent stress into watchlist and escalation flows."
  },
  {
    title: "Performance Grading",
    phase: "Live now",
    description: "Convert covenant, variance, trend, and compliance signals into an explainable overall grade."
  },
  {
    title: "Risk Assessment",
    phase: "Next",
    description: "Maintain a structured risk register with taxonomy-based scoring and annual refresh workflows."
  },
  {
    title: "Document Intelligence",
    phase: "Live now",
    description: "Receive documents, classify them, extract proposed facts, validate changes, and route approvals."
  },
  {
    title: "Portfolio Analytics",
    phase: "Live now",
    description: "Surface exposure, grade distribution, covenant concentration, watchlist load, and portfolio attention items."
  },
  {
    title: "Consent & Voting",
    phase: "Roadmap",
    description: "Track waiver requests, deadlines, vote mechanics, and downstream term changes before commit."
  },
  {
    title: "Alerting & Escalation",
    phase: "Next",
    description: "Drive action with rule-based alerts, SLA-aware routing, acknowledgement, and escalation history."
  },
  {
    title: "Deal Onboarding",
    phase: "Roadmap",
    description: "Create new investments, load finance documents, seed obligations, and configure monitoring logic."
  }
];

const operatingLayers = [
  {
    title: "Intake",
    description: "Email or portal receipt, immutable storage, AI classification, and proposed fact extraction.",
    link: "/evidence"
  },
  {
    title: "Decisioning",
    description: "Deterministic validation, covenant engines, grading, and human approval where judgement is required.",
    link: "/review"
  },
  {
    title: "Monitoring",
    description: "Portfolio analytics, deal TopSheets, covenant drilldowns, obligations, and evidence traceability.",
    link: "/portfolio"
  },
  {
    title: "Administration",
    description: "Onboarding, rules, access controls, and operating model configuration for scale.",
    link: "/setup"
  }
];

const workflowStages = [
  "1. Receipt and security",
  "2. AI classification",
  "3. Obligation matching",
  "4. Data extraction",
  "5. Deterministic validation",
  "6. Tiered approval",
  "7. Portfolio cascade"
];

const roadmapItems = [
  {
    label: "MVP",
    title: "Operational monitoring loop",
    description: "Portfolio dashboard, deal TopSheet, covenant detail, review queue, obligations calendar, and alerts foundation."
  },
  {
    label: "V1",
    title: "Deeper credit workbench",
    description: "Trends, exceptions, financial period analysis, risk register, consent tracking, and richer workflow controls."
  },
  {
    label: "Future",
    title: "Cross-client intelligence plane",
    description: "Benchmarking, anonymised exports, reporting automation, and market intelligence views."
  }
];

export default async function HomePage() {
  let portfolio: Awaited<ReturnType<typeof getPortfolio>> | null = null;

  try {
    portfolio = await getPortfolio();
  } catch {
    portfolio = null;
  }

  return (
    <main className="shell">
      <section className="hero landing-hero">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Private markets debt monitoring as one operating system.</h1>
          <p className="hero-copy">
            The demo implements only part of the surface today, but the platform
            is designed to cover the full cycle: intake, validation, covenant
            testing, grading, compliance operations, risk workflows, consent
            tracking, and portfolio intelligence.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/portfolio">
              Get Started
            </Link>
            <Link className="button secondary" href="/deals">
              Browse deal workspace
            </Link>
          </div>
        </div>
        <div className="hero-card landing-summary-card">
          <p className="eyebrow">Platform posture</p>
          <h2>Full capability map, partial implementation.</h2>
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Capabilities mapped</span>
              <strong>12</strong>
            </div>
            {portfolio ? (
              <>
                <div className="summary-stat">
                  <span>Monitored deals</span>
                  <strong>{portfolio.dealCount}</strong>
                </div>
                <div className="summary-stat">
                  <span>Pending reviews</span>
                  <strong>{portfolio.pendingReviews}</strong>
                </div>
                <div className="summary-stat">
                  <span>Overdue obligations</span>
                  <strong>{portfolio.overdueObligations}</strong>
                </div>
              </>
            ) : (
              <div className="summary-stat">
                <span>Live portfolio status</span>
                <strong>Service unavailable</strong>
              </div>
            )}
          </div>
          <div className="insight-pill-row">
            <span className="pill">Evidence-backed</span>
            <span className="pill">Human approval</span>
            <span className="pill">Portfolio-scale</span>
          </div>
        </div>
      </section>

      <section className="home-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Operating model</p>
              <h2>What the platform covers</h2>
            </div>
          </div>
          <div className="capability-grid">
            {capabilityGroups.map((capability) => (
              <article key={capability.title} className="capability-card">
                <span className="badge neutral">{capability.phase}</span>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Platform rails</p>
              <h2>How the product is organised</h2>
            </div>
          </div>
          <div className="rail-grid">
            {operatingLayers.map((layer) => (
              <Link key={layer.title} href={layer.link} className="rail-card">
                <h3>{layer.title}</h3>
                <p>{layer.description}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live today</p>
              <h2>Current demo footprint</h2>
            </div>
          </div>
          <div className="summary-stat-list">
            {portfolio ? (
              <>
                <div className="summary-stat">
                  <span>Total exposure</span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0
                    }).format(portfolio.totalAum)}
                  </strong>
                </div>
                <div className="summary-stat">
                  <span>Weighted avg. DSCR</span>
                  <strong>{portfolio.weightedAvgDscr.toFixed(2)}x</strong>
                </div>
                <div className="summary-stat">
                  <span>Avg. headroom</span>
                  <strong>{portfolio.weightedAvgHeadroomPct.toFixed(1)}%</strong>
                </div>
                <div className="summary-stat">
                  <span>Watchlist deals</span>
                  <strong>{portfolio.watchlistCount}</strong>
                </div>
              </>
            ) : (
              <div className="summary-stat">
                <span>Live footprint</span>
                <strong>Portfolio API unavailable</strong>
              </div>
            )}
          </div>
          {!portfolio ? (
            <p className="meta-note">
              Restart the API and database init to restore live portfolio metrics on
              the home page.
            </p>
          ) : null}
          <div className="hero-actions">
            <Link className="button secondary" href="/review">
              Review workflow
            </Link>
            <Link className="button secondary" href="/evidence">
              Evidence chain
            </Link>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workflow spine</p>
            <h2>Document intake to portfolio impact</h2>
          </div>
        </div>
        <div className="timeline-grid">
          {workflowStages.map((stage) => (
            <div key={stage} className="timeline-step">
              <strong>{stage}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="roadmap-grid home-roadmap">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Delivery path</p>
              <h2>How the surface expands</h2>
            </div>
          </div>
          <div className="roadmap-grid">
            {roadmapItems.map((item) => (
              <article key={item.label} className="roadmap-card">
                <span className="badge neutral">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
