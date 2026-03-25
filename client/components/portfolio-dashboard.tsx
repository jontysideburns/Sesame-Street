import Link from "next/link";
import { getPortfolioCalendar } from "../api/calendar";
import { getPortfolio } from "../api/portfolio";
import { PortfolioTree } from "./portfolio-tree";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function statusTone(status: string) {
  if (status.includes("trigger")) return "critical";
  if (status.includes("lock")) return "warning";
  return "good";
}

function attentionTone(value: string) {
  if (
    ["alert", "watchlist", "escalate_to_pm", "pm", "high", "open", "under_review"].includes(
      value
    )
  ) {
    return "critical";
  }
  if (
    [
      "concern",
      "watch",
      "enhanced_monitoring",
      "ham",
      "monitor",
      "medium",
      "monitoring",
      "support_with_conditions"
    ].includes(value)
  ) {
    return "warning";
  }
  if (
    ["stable", "standard", "deescalate", "no_change", "none", "low", "resolved"].includes(
      value
    )
  ) {
    return "good";
  }
  return "neutral";
}

function distributionTone(status: string | null) {
  if (status === "blocked") return "critical";
  if (status === "restricted" || status === "review_required") return "warning";
  if (status === "allowed") return "good";
  return "neutral";
}

export async function PortfolioDashboard({
  scope
}: {
  scope?: {
    organisation?: string;
    owner?: string;
    account?: string;
  };
}) {
  const scopeParams = new URLSearchParams();
  if (scope?.organisation) scopeParams.set("organisation", scope.organisation);
  if (scope?.owner) scopeParams.set("owner", scope.owner);
  if (scope?.account) scopeParams.set("account", scope.account);
  const portfolioPacksHref =
    scopeParams.size > 0 ? `/portfolio/packs?${scopeParams.toString()}` : "/portfolio/packs";
  const portfolioCalendarHref =
    scopeParams.size > 0 ? `/portfolio/calendar?${scopeParams.toString()}` : "/portfolio/calendar";

  let portfolio: Awaited<ReturnType<typeof getPortfolio>> | null = null;
  let calendar: Awaited<ReturnType<typeof getPortfolioCalendar>> | null = null;

  try {
    [portfolio, calendar] = await Promise.all([
      getPortfolio(scope),
      getPortfolioCalendar(scope)
    ]);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Portfolio service unavailable";
    return renderPortfolioUnavailable(
      `The portfolio hierarchy service did not load (${detail}). Reinitialize the database and restart the API so the new hierarchy tables and portfolio endpoint are live.`
    );
  }

  if (
    !portfolio.currentScope ||
    !portfolio.platformClient ||
    !portfolio.hierarchy ||
    !portfolio.holdings
  ) {
    return renderPortfolioUnavailable(
      "The running API is still serving the older flat portfolio payload. Restart the backend against a clean database init so the hierarchy response is available."
    );
  }

  const activeAttention = portfolio.overdueObligations + portfolio.pendingReviews;

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Portfolio hierarchy</p>
          <h1>{portfolio.currentScope.title}</h1>
          <p className="hero-copy">
            {portfolio.currentScope.subtitle}. Deal analytics stay shared at the
            investment level, while exposure and navigation roll up through
            organisation, owner, account, and holding views.
          </p>
        </div>
        <div className="hero-card emphasis-card">
          <p className="eyebrow">Scope summary</p>
          <h2>{formatMoney(portfolio.totalAum)}</h2>
          <p>Exposure represented by the current hierarchy slice.</p>
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Deals in scope</span>
              <strong>{portfolio.dealCount}</strong>
            </div>
            <div className="summary-stat">
              <span>Active interventions</span>
              <strong>{activeAttention}</strong>
            </div>
            <div className="summary-stat">
              <span>Watchlist deals</span>
              <strong>{portfolio.watchlistCount}</strong>
            </div>
            {portfolio.currentScope.benchmark ? (
              <div className="summary-stat">
                <span>Benchmark</span>
                <strong>{portfolio.currentScope.benchmark}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Scoped exposure</span>
          <strong>{formatMoney(portfolio.totalAum)}</strong>
        </article>
        <article className="metric-card">
          <span>Distinct deals</span>
          <strong>{portfolio.dealCount}</strong>
        </article>
        <article className="metric-card">
          <span>Weighted avg. DSCR</span>
          <strong>{portfolio.weightedAvgDscr.toFixed(2)}x</strong>
        </article>
        <article className="metric-card">
          <span>Avg. headroom</span>
          <strong>{portfolio.weightedAvgHeadroomPct.toFixed(1)}%</strong>
        </article>
        <article className="metric-card">
          <span>Overdue obligations</span>
          <strong>{portfolio.overdueObligations}</strong>
        </article>
        <article className="metric-card">
          <span>Pending reviews</span>
          <strong>{portfolio.pendingReviews}</strong>
        </article>
        <Link className="metric-card metric-card-link" href="#portfolio-alerts">
          <span>Recent alerts</span>
          <strong>{portfolio.recentAlerts.length}</strong>
          <small>View alert queue</small>
        </Link>
      </section>

      {calendar ? (
        <section className="panel section-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Operating calendar</p>
              <h2>
                {calendar.demoClock.currentDemoDate} · {calendar.demoClock.clockLabel}
              </h2>
            </div>
            <Link className="text-link" href={portfolioCalendarHref}>
              Open full calendar
            </Link>
          </div>
          <div className="calendar-grid">
            <article className="mini-card">
              <strong>Cycle posture</strong>
              <p>
                {calendar.summary.activeCycles} active · {calendar.summary.blockedCycles}{" "}
                blocked · {calendar.summary.readyForRelease} ready for release
              </p>
            </article>
            <div className="stack compact-stack">
              {calendar.cycleAlerts.slice(0, 3).map((alert) => (
                <Link
                  key={alert.id}
                  className="mini-card"
                  href={`/deals/${alert.dealSlug}/calendar`}
                >
                  <div className="status-row">
                    <strong>{alert.dealName}</strong>
                    <span className={`badge ${alert.priority === "high" ? "critical" : "warning"}`}>
                      {alert.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{alert.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <PortfolioTree
        platformClientName={portfolio.platformClient.name}
        hierarchy={portfolio.hierarchy}
        holdings={portfolio.holdings}
      />

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Holdings</p>
            <h2>Current scope holdings</h2>
          </div>
        </div>
        <div className="holding-list">
          {portfolio.holdings.map((holding) => (
            <Link
              key={holding.id}
              className="holding-row"
              href={`/deals/${holding.dealSlug}`}
            >
              <div className="holding-copy">
                <div className="tag-row">
                  <span className={`badge ${holding.watchlist ? "critical" : "neutral"}`}>
                    {holding.watchlist ? "watchlist" : "standard"}
                  </span>
                  <span className={`badge ${statusTone(holding.covenantStatus)}`}>
                    {holding.covenantStatus.replaceAll("_", " ")}
                  </span>
                  <span className={`badge ${distributionTone(holding.distributionStatus)}`}>
                    {(holding.distributionStatus ?? "not_assessed").replaceAll("_", " ")}
                  </span>
                </div>
                <strong>{holding.dealName}</strong>
                <p>
                  {holding.organisationName} · {holding.ownerName} · {holding.accountName}
                </p>
                <p>
                  {holding.grade} · {holding.phase} · {holding.region}
                </p>
              </div>
              <div className="holding-meta">
                <strong>{formatMoney(holding.currentAmount)}</strong>
                <span>
                  {holding.headroomPct === null ? "Headroom pending" : `${holding.headroomPct.toFixed(1)}% headroom`}
                </span>
                <small>
                  {holding.distributionBlockerCount > 0
                    ? `${holding.distributionBlockerCount} blocker${
                        holding.distributionBlockerCount > 1 ? "s" : ""
                      }`
                    : holding.benchmark}
                </small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel section-panel" id="portfolio-alerts">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Attention</p>
            <h2>Recent alerts</h2>
          </div>
        </div>
        <div className="stack">
          {portfolio.recentAlerts.map((alert) => (
            <Link key={alert.id} className="alert-card" href={`/deals/${alert.dealSlug}`}>
              <span className="badge critical">{alert.priority}</span>
              <strong>{alert.title}</strong>
              <p>{alert.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Portfolio map</p>
              <h2>Covenant heatmap</h2>
            </div>
            <Link className="text-link" href="/evidence">
              Evidence view
            </Link>
          </div>
          <div className="heatmap">
            {portfolio.covenantHeatmap.map((item) => (
              <Link
                key={item.slug}
                className={`heatmap-cell ${statusTone(item.status)}`}
                href={`/deals/${item.slug}`}
              >
                <span>{item.name}</span>
                <strong>{item.headroomPct.toFixed(1)}%</strong>
                <small>{item.covenantName}</small>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cash movement</p>
              <h2>Distribution posture</h2>
            </div>
          </div>
          <div className="distribution-list">
            {portfolio.distributionSummary.map((bucket) => (
              <div key={bucket.status} className="distribution-row">
                <div>
                  <strong>{bucket.status.replaceAll("_", " ")}</strong>
                  <p>{bucket.count} deals</p>
                </div>
                <span>{formatMoney(bucket.exposure)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Performance</p>
              <h2>Grade mix</h2>
            </div>
          </div>
          <div className="distribution-list">
            {portfolio.gradeDistribution.map((bucket) => (
              <div key={bucket.grade} className="distribution-row">
                <div>
                  <strong>{bucket.grade}</strong>
                  <p>{bucket.count} deals</p>
                </div>
                <span>{formatMoney(bucket.exposure)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Compliance</p>
              <h2>Overdue obligations</h2>
            </div>
            <Link className="text-link" href="/compliance">
              Open compliance
            </Link>
          </div>
          <div className="stack">
            {portfolio.overdueItems.map((item) => (
              <Link key={item.id} className="obligation-row" href={`/deals/${item.dealSlug}`}>
                <div>
                  <strong>{item.dealName}</strong>
                  <p>{item.title}</p>
                </div>
                <div className="obligation-meta">
                  <span>{item.daysOverdue} days overdue</span>
                  <small>{item.dueDate}</small>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Risk register</p>
              <h2>Top risks in scope</h2>
            </div>
          </div>
          <div className="stack">
            {portfolio.topRisks.map((item) => (
              <Link key={item.id} className="document-card" href={`/deals/${item.dealSlug}/risk`}>
                <div className="tag-row">
                  <span className={`badge ${attentionTone(item.severity)}`}>
                    {item.severity}
                  </span>
                  <span className={`badge ${attentionTone(item.status)}`}>
                    {item.status.replaceAll("_", " ")}
                  </span>
                </div>
                <strong>{item.dealName}</strong>
                <p>{item.title}</p>
                <p>{item.summary}</p>
                <p className="meta-note">
                  Review {item.nextReviewDate} · {formatMoney(item.scopedExposure)}
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Borrower requests</p>
              <h2>Consents and waivers</h2>
            </div>
          </div>
          <div className="stack">
            {portfolio.borrowerRequests.map((item) => (
              <Link
                key={item.id}
                className="document-card"
                href={`/deals/${item.dealSlug}/requests`}
              >
                <div className="tag-row">
                  <span className={`badge ${attentionTone(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className={`badge ${attentionTone(item.requestStatus)}`}>
                    {item.requestStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <strong>{item.dealName}</strong>
                <p>{item.title}</p>
                <p>{item.summary}</p>
                <p className="meta-note">
                  Due {item.dueDate} · votes {item.totalVotes} · oppose {item.opposeVotes}
                </p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trend detection</p>
              <h2>Deteriorating deals</h2>
            </div>
          </div>
          <div className="stack">
            {portfolio.deterioratingTrends.map((item) => (
              <Link
                key={item.id}
                className="document-card"
                href={`/deals/${item.dealSlug}/assessment`}
              >
                <div className="tag-row">
                  <span className={`badge ${attentionTone(item.severity)}`}>
                    {item.severity}
                  </span>
                  <span className="badge neutral">{item.metricLabel}</span>
                </div>
                <strong>{item.dealName}</strong>
                <p>
                  {item.grade} · {item.periodsObserved} periods ·{" "}
                  {item.watchlist ? "watchlist" : "standard"}
                </p>
                <p>{item.summary}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Watchlist</p>
              <h2>Escalation actions</h2>
            </div>
            <Link className="text-link" href={portfolioPacksHref}>
              Committee packs
            </Link>
          </div>
          <div className="stack">
            {portfolio.watchlistActions.map((item) => (
              <Link
                key={item.id}
                className="document-card"
                href={`/deals/${item.dealSlug}/assessment`}
              >
                <div className="tag-row">
                  <span className={`badge ${attentionTone(item.statusTo)}`}>
                    {item.statusTo.replaceAll("_", " ")}
                  </span>
                  <span className={`badge ${attentionTone(item.escalationLevel)}`}>
                    {item.escalationLevel}
                  </span>
                </div>
                <strong>{item.dealName}</strong>
                <p>
                  {item.recommendation.replaceAll("_", " ")} · owner {item.ownerName}
                </p>
                <p>{item.rationale}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function renderPortfolioUnavailable(message: string) {
  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Portfolio hierarchy</p>
          <h1>Portfolio screen needs the refreshed hierarchy service.</h1>
          <p className="hero-copy">{message}</p>
        </div>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Required refresh</p>
            <h2>Restart with a clean init</h2>
          </div>
        </div>
        <div className="stack">
          <div className="roadmap-card">
            <strong>1. Clear persisted Postgres data</strong>
            <p>`./app/clear.sh`</p>
          </div>
          <div className="roadmap-card">
            <strong>2. Start the stack again</strong>
            <p>`PROJECT_DIR="/Users/ericbroda/Development/scratch/sesamestreet" ./app/startd.sh up --detach`</p>
          </div>
          <div className="roadmap-card">
            <strong>3. Reload `/portfolio`</strong>
            <p>The page will then render the full organisation, owner, account, and holding hierarchy.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
