import Link from "next/link";
import { getPortfolioCalendar } from "../../../api/calendar";

function buildPortfolioHref(scope: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();

  if (scope.organisation) params.set("organisation", scope.organisation);
  if (scope.owner) params.set("owner", scope.owner);
  if (scope.account) params.set("account", scope.account);

  return params.size > 0 ? `/portfolio?${params.toString()}` : "/portfolio";
}

export default async function PortfolioCalendarPage({
  searchParams
}: {
  searchParams?: Promise<{
    organisation?: string;
    owner?: string;
    account?: string;
  }>;
}) {
  const scope = searchParams ? await searchParams : undefined;
  const data = await getPortfolioCalendar(scope);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Operating calendar</p>
          <h1>{data.scope.title}</h1>
          <p className="hero-copy">
            The demo clock drives milestone status across intake, review, committee,
            and release so the operating cycle can be demonstrated consistently.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href={buildPortfolioHref(scope ?? {})}>
              Back to portfolio
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
              <span>Blocked cycles</span>
              <strong>{data.summary.blockedCycles}</strong>
            </div>
            <div className="summary-stat">
              <span>Milestones this week</span>
              <strong>{data.summary.milestonesThisWeek}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Escalations</p>
            <h2>Cycle alerts</h2>
          </div>
        </div>
        <div className="stack">
          {data.cycleAlerts.map((alert) => (
            <Link key={alert.id} className="alert-card" href={`/deals/${alert.dealSlug}/calendar`}>
              <div className="status-row">
                <strong>{alert.dealName}</strong>
                <span className={`badge ${alert.priority === "high" ? "critical" : "warning"}`}>
                  {alert.status.replaceAll("_", " ")}
                </span>
              </div>
              <p>{alert.title}</p>
              <p className="meta-note">
                {alert.summary} · {alert.scheduledFor.slice(0, 10)}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Upcoming</p>
            <h2>Milestone queue</h2>
          </div>
        </div>
        <div className="stack">
          {data.upcomingEvents.map((event) => (
            <Link
              key={`${event.cycleId}-${event.id}`}
              className="history-row"
              href={`/deals/${event.dealSlug}/calendar`}
            >
              <div className="status-row">
                <strong>{event.dealName}</strong>
                <span className="badge neutral">{event.status.replaceAll("_", " ")}</span>
              </div>
              <p>
                {event.eventLabel} · {event.scheduledFor.slice(0, 10)}
              </p>
              <p className="meta-note">{event.detailText}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack">
        {data.cycles.map((cycle) => (
          <article key={cycle.id} className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{cycle.cycleType.replaceAll("_", " ")}</p>
                <h2>{cycle.dealName}</h2>
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
                <dt>Review due</dt>
                <dd>{cycle.internalReviewDueDate}</dd>
              </div>
              <div>
                <dt>Committee</dt>
                <dd>{cycle.committeeDate}</dd>
              </div>
              <div>
                <dt>Release</dt>
                <dd>{cycle.reportReleaseDate}</dd>
              </div>
            </dl>
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
}
