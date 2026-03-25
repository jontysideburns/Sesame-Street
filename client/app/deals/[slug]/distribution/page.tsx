import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealDistribution } from "../../../../api/distribution";

function toneForStatus(status: string) {
  if (status === "blocked" || status === "failed") return "critical";
  if (
    status === "restricted" ||
    status === "review_required" ||
    status === "pending" ||
    status === "near_lock_up" ||
    status === "construction_restricted" ||
    status === "monitoring"
  ) {
    return "warning";
  }
  if (status === "allowed" || status === "clear") return "good";
  return "neutral";
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function DealDistributionPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealDistribution(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Distribution assessment</p>
            <h1>{data.dealName} cash movement posture</h1>
            <p className="hero-copy">{data.distribution.summary}</p>
            <div className="tag-row">
              <span className={`badge ${toneForStatus(data.distribution.status)}`}>
                {data.distribution.status.replaceAll("_", " ")}
              </span>
              <span className={`badge ${toneForStatus(data.distribution.lockupState)}`}>
                {data.distribution.lockupState.replaceAll("_", " ")}
              </span>
              <span className="badge neutral">{data.distribution.periodLabel}</span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${data.dealSlug}/periods/${data.distribution.periodKey}`}
              >
                Open period view
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Distribution status</span>
                <strong>{data.distribution.status.replaceAll("_", " ")}</strong>
              </div>
              <div className="summary-stat">
                <span>Blockers</span>
                <strong>{data.distribution.blockerCount}</strong>
              </div>
              <div className="summary-stat">
                <span>Permitted capacity</span>
                <strong>{formatMoney(data.distribution.distributionCapacity)}</strong>
              </div>
              <div className="summary-stat">
                <span>Cash trap</span>
                <strong>{formatMoney(data.distribution.cashTrapAmount)}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span>Assessment date</span>
            <strong>{data.distribution.assessedAt.slice(0, 10)}</strong>
          </article>
          <article className="metric-card">
            <span>Deal grade</span>
            <strong>{data.dealGrade}</strong>
          </article>
          <article className="metric-card">
            <span>Covenant status</span>
            <strong>{data.covenant.status.replaceAll("_", " ")}</strong>
          </article>
          <article className="metric-card">
            <span>Senior DSCR</span>
            <strong>{data.covenant.currentValue.toFixed(2)}x</strong>
          </article>
          <article className="metric-card">
            <span>Lock-up threshold</span>
            <strong>{data.covenant.thresholdLockup.toFixed(2)}x</strong>
          </article>
          <article className="metric-card">
            <span>Headroom</span>
            <strong>{data.covenant.headroomPct.toFixed(1)}%</strong>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Decision drivers</p>
                <h2>Failed conditions and blockers</h2>
              </div>
            </div>
            <div className="stack">
              {data.distribution.failedConditions.length > 0 ? (
                data.distribution.failedConditions.map((condition) => (
                  <div key={condition.code} className="document-card">
                    <div className="status-row">
                      <strong>{condition.label}</strong>
                      <span className={`badge ${toneForStatus(condition.status)}`}>
                        {condition.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p>{condition.detail}</p>
                    <p className="meta-note">{condition.code}</p>
                  </div>
                ))
              ) : (
                <div className="document-card">
                  <strong>No active blockers</strong>
                  <p>The current assessment does not identify any failed distribution conditions.</p>
                </div>
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Required actions</p>
                <h2>What needs to happen next</h2>
              </div>
            </div>
            <div className="stack">
              {data.distribution.requiredActions.map((action, index) => (
                <div key={`${action.owner}-${index}`} className="document-card">
                  <strong>{action.label}</strong>
                  <p>Owner: {action.owner}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Assessment rationale</p>
                <h2>Current posture</h2>
              </div>
            </div>
            <p className="detail-copy">{data.distribution.rationale}</p>
            <div className="summary-grid">
              <div>
                <span>Borrower</span>
                <strong>{data.borrower}</strong>
              </div>
              <div>
                <span>Portfolio status</span>
                <strong>{data.dealStatus}</strong>
              </div>
              <div>
                <span>Watchlist</span>
                <strong>{data.watchlist ? "Active" : "Standard"}</strong>
              </div>
              <div>
                <span>Open obligations</span>
                <strong>{data.openObligations.length}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2>Source support</h2>
              </div>
            </div>
            {data.sourceDocument ? (
              <div className="document-card">
                <strong>{data.sourceDocument.documentName}</strong>
                <p>
                  {data.sourceDocument.documentType.replaceAll("_", " ")} · page{" "}
                  {data.sourceDocument.evidencePage}
                </p>
                <blockquote>{data.sourceDocument.snippet}</blockquote>
              </div>
            ) : (
              <p className="detail-copy">No source document is linked to the current assessment.</p>
            )}
          </article>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
