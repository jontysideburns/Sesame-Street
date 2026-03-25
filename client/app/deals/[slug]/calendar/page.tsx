import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealCalendar } from "../../../../api/calendar";

export default async function DealCalendarPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealCalendar(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Deal calendar</p>
            <h1>{data.dealName}</h1>
            <p className="hero-copy">
              Cycle readiness is shown against the shared demo clock so intake,
              review, committee, and release milestones can be demonstrated in order.
            </p>
            <div className="hero-actions">
              <Link className="button secondary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Demo date</span>
                <strong>{data.demoClock.currentDemoDate}</strong>
              </div>
              <div className="summary-stat">
                <span>Cycle alerts</span>
                <strong>{data.summary.alertCount}</strong>
              </div>
              <div className="summary-stat">
                <span>Ready for release</span>
                <strong>{data.summary.readyForRelease}</strong>
              </div>
            </div>
          </aside>
        </section>

        {data.cycleAlerts.length > 0 ? (
          <section className="panel section-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Escalations</p>
                <h2>Cycle alerts</h2>
              </div>
            </div>
            <div className="stack">
              {data.cycleAlerts.map((alert) => (
                <article key={alert.id} className="alert-card">
                  <div className="status-row">
                    <strong>{alert.title}</strong>
                    <span className={`badge ${alert.priority === "high" ? "critical" : "warning"}`}>
                      {alert.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p>{alert.summary}</p>
                  <p className="meta-note">{alert.scheduledFor.slice(0, 10)}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="stack">
          {data.cycles.map((cycle) => (
            <article key={cycle.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{cycle.cycleType.replaceAll("_", " ")}</p>
                  <h2>{cycle.cycleLabel}</h2>
                </div>
                <span className="badge neutral">{cycle.cycleStatus.replaceAll("_", " ")}</span>
              </div>
              <p>{cycle.summary}</p>
              <dl className="topsheet-definition-grid">
                <div>
                  <dt>Package due</dt>
                  <dd>{cycle.packageDueDate}</dd>
                </div>
                <div>
                  <dt>Internal review due</dt>
                  <dd>{cycle.internalReviewDueDate}</dd>
                </div>
                <div>
                  <dt>Committee date</dt>
                  <dd>{cycle.committeeDate}</dd>
                </div>
                <div>
                  <dt>Release date</dt>
                  <dd>{cycle.reportReleaseDate}</dd>
                </div>
              </dl>

              <div className="calendar-grid">
                <article className="mini-card">
                  <strong>Readiness</strong>
                  <p>
                    Package {cycle.readiness.hasPackage ? "in" : "missing"} ·{" "}
                    {cycle.readiness.pendingReviews} pending reviews ·{" "}
                    {cycle.readiness.openHighRisks} high risks
                  </p>
                  <p className="meta-note">
                    Requests {cycle.readiness.openRequests} · cases {cycle.readiness.openCases} ·
                    snapshots {cycle.readiness.snapshotsCaptured}
                  </p>
                </article>
                <article className="mini-card">
                  <strong>Release dependencies</strong>
                  <p>
                    Committee {cycle.readiness.committeeReady ? "ready" : "not ready"} ·
                    release {cycle.readiness.releaseReady ? " ready" : " blocked"}
                  </p>
                  <p className="meta-note">
                    Reports released {cycle.readiness.releasedReports} · overdue tasks{" "}
                    {cycle.readiness.overdueTasks}
                  </p>
                </article>
              </div>

              <div className="timeline-grid">
                {cycle.events.map((event) => (
                  <article key={event.id} className="timeline-step">
                    <span>{event.eventLabel}</span>
                    <strong>{event.status.replaceAll("_", " ")}</strong>
                    <p>{event.scheduledFor.slice(0, 10)}</p>
                    <p className="meta-note">{event.detailText}</p>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
