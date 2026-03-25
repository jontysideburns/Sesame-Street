import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealAssessment } from "../../../../api/assessment";

function toneForStatus(status: string) {
  if (["alert", "stressed", "watchlist"].includes(status)) return "critical";
  if (["concern", "pressure", "enhanced_monitoring", "escalate_to_pm"].includes(status)) {
    return "warning";
  }
  if (["strong", "stable", "standard", "no_change", "deescalate"].includes(status)) {
    return "good";
  }
  return "neutral";
}

export default async function DealAssessmentPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealAssessment(slug);
    const currentWatchlistDecision = data.watchlistHistory[0] ?? null;

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Performance grading</p>
            <h1>{data.dealName} assessment</h1>
            <p className="hero-copy">{data.assessment.summary}</p>
            <div className="tag-row">
              <span className="badge neutral">{data.assessment.periodLabel}</span>
              <span className={`badge ${toneForStatus(data.assessment.watchlistStatus)}`}>
                {data.assessment.watchlistStatus.replaceAll("_", " ")}
              </span>
              <span className="badge neutral">{data.revenueRisk}</span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${data.dealSlug}/forecasts`}
              >
                Forecasts
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${data.dealSlug}/periods/${data.assessment.periodKey}`}
              >
                Open period view
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Current grade</span>
                <strong>{data.effectiveGrade}</strong>
              </div>
              <div className="summary-stat">
                <span>Overall score</span>
                <strong>{data.assessment.overallScore.toFixed(0)}/100</strong>
              </div>
              <div className="summary-stat">
                <span>Recommendation</span>
                <strong>{data.assessment.watchlistRecommendation.replaceAll("_", " ")}</strong>
              </div>
              <div className="summary-stat">
                <span>Escalation</span>
                <strong>{data.assessment.escalationLevel}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span>Assessment date</span>
            <strong>{data.assessment.assessmentDate}</strong>
          </article>
          <article className="metric-card">
            <span>Active trends</span>
            <strong>{data.activeTrends.length}</strong>
          </article>
          <article className="metric-card">
            <span>Watchlist status</span>
            <strong>{data.assessment.watchlistStatus.replaceAll("_", " ")}</strong>
          </article>
          <article className="metric-card">
            <span>Borrower</span>
            <strong>{data.borrower}</strong>
          </article>
          <article className="metric-card">
            <span>Portfolio status</span>
            <strong>{data.dealStatus}</strong>
          </article>
          <article className="metric-card">
            <span>Next review</span>
            <strong>{currentWatchlistDecision?.nextReviewDate ?? "TBD"}</strong>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Grade breakdown</p>
                <h2>Weighted component scoring</h2>
              </div>
            </div>
            <div className="component-grid">
              {data.assessment.components.map((component) => (
                <article key={component.key} className="component-card">
                  <div className="status-row">
                    <strong>{component.label}</strong>
                    <span className={`badge ${toneForStatus(component.status)}`}>
                      {component.status}
                    </span>
                  </div>
                  <div className="score-strip">
                    <div
                      className={`score-fill ${toneForStatus(component.status)}`}
                      style={{ width: `${component.score}%` }}
                    />
                  </div>
                  <div className="summary-grid">
                    <div>
                      <span>Score</span>
                      <strong>{component.score}</strong>
                    </div>
                    <div>
                      <span>Weight</span>
                      <strong>{Math.round(component.weight * 100)}%</strong>
                    </div>
                    <div>
                      <span>Weighted points</span>
                      <strong>{component.weightedPoints.toFixed(1)}</strong>
                    </div>
                  </div>
                  <p>{component.summary}</p>
                </article>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Trend detection</p>
                <h2>Active monitoring signals</h2>
              </div>
            </div>
            <div className="stack">
              {data.activeTrends.map((trend) => (
                <div key={trend.id} className="document-card">
                  <div className="tag-row">
                    <span className={`badge ${toneForStatus(trend.severity)}`}>
                      {trend.severity}
                    </span>
                    <span className="badge neutral">
                      {trend.periodsObserved} periods
                    </span>
                  </div>
                  <strong>{trend.metricLabel}</strong>
                  <p>
                    {trend.trendType.replaceAll("_", " ")} · {trend.direction} ·{" "}
                    {trend.totalChangePct.toFixed(2)}%
                  </p>
                  <p>{trend.summary}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Forecast context</p>
                <h2>Active monitoring case</h2>
              </div>
            </div>
            {data.forecastContext ? (
              <div className="stack compact-stack">
                <div className="document-card">
                  <div className="status-row">
                    <strong>{data.forecastContext.activeMonitoringCaseName}</strong>
                    <span className="badge good">
                      {data.forecastContext.activeMonitoringVersionLabel}
                    </span>
                  </div>
                  <p>
                    Scenario count {data.forecastContext.scenarioCount} · last refresh{" "}
                    {data.forecastContext.latestRefreshAt
                      ? data.forecastContext.latestRefreshAt.slice(0, 10)
                      : "not refreshed"}
                  </p>
                </div>
                {data.forecastContext.scenarios.map((scenario) => (
                  <div key={`${scenario.caseType}-${scenario.versionLabel}`} className="document-card">
                    <div className="status-row">
                      <strong>{scenario.caseName}</strong>
                      <span className={`badge ${scenario.isMonitoring ? "good" : "neutral"}`}>
                        {scenario.caseType}
                      </span>
                    </div>
                    <p>{scenario.scenarioSummary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="detail-copy">
                No active forecast context is linked to this assessment yet.
              </p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Watchlist</p>
                <h2>Escalation history</h2>
              </div>
            </div>
            <div className="stack">
              {data.watchlistHistory.map((event) => (
                <div key={event.id} className="document-card">
                  <div className="status-row">
                    <strong>
                      {event.statusFrom.replaceAll("_", " ")} to{" "}
                      {event.statusTo.replaceAll("_", " ")}
                    </strong>
                    <span className={`badge ${toneForStatus(event.statusTo)}`}>
                      {event.escalationLevel}
                    </span>
                  </div>
                  <p>
                    {event.recommendation.replaceAll("_", " ")} · owner{" "}
                    {event.ownerName}
                  </p>
                  <p>{event.rationale}</p>
                  <p className="meta-note">
                    Decided {event.decidedAt.slice(0, 10)} · next review{" "}
                    {event.nextReviewDate}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Assessment summary</p>
                <h2>Current posture</h2>
              </div>
            </div>
            <div className="summary-grid">
              <div>
                <span>Deal grade</span>
                <strong>{data.effectiveGrade}</strong>
              </div>
              <div>
                <span>Watchlist flag</span>
                <strong>{data.watchlist ? "On" : "Off"}</strong>
              </div>
              <div>
                <span>Recommendation</span>
                <strong>{data.assessment.watchlistRecommendation.replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span>Escalation</span>
                <strong>{data.assessment.escalationLevel}</strong>
              </div>
            </div>
            <p className="detail-copy">
              This assessment ties the latest period results to a deal-level
              monitoring judgement: grade, persistent trends, and whether the
              deal should remain standard, move into enhanced monitoring, or
              escalate.
            </p>
            {data.activeGradeOverride ? (
              <div className="document-card">
                <div className="status-row">
                  <strong>Active grade override</strong>
                  <span className={`badge ${toneForStatus("pressure")}`}>
                    {data.activeGradeOverride.status}
                  </span>
                </div>
                <p>
                  {data.activeGradeOverride.previousGrade} to{" "}
                  {data.activeGradeOverride.overrideGrade} · owner{" "}
                  {data.activeGradeOverride.ownerName}
                </p>
                <p>{data.activeGradeOverride.rationale}</p>
                <p className="meta-note">
                  Expires {data.activeGradeOverride.expiresOn} · decided{" "}
                  {data.activeGradeOverride.decidedAt.slice(0, 10)}
                </p>
              </div>
            ) : null}
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Override workflow</p>
              <h2>Grade override history</h2>
            </div>
          </div>
          <div className="stack">
            {data.gradeOverrideHistory.length > 0 ? (
              data.gradeOverrideHistory.map((item) => (
                <div key={item.id} className="document-card">
                  <div className="status-row">
                    <strong>
                      {item.previousGrade} to {item.overrideGrade}
                    </strong>
                    <span className="badge warning">{item.status}</span>
                  </div>
                  <p>{item.impactSummary}</p>
                  <p>{item.rationale}</p>
                  <p className="meta-note">
                    Owner {item.ownerName} · expires {item.expiresOn}
                  </p>
                </div>
              ))
            ) : (
              <p className="detail-copy">No grade overrides have been recorded for this deal.</p>
            )}
          </div>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
