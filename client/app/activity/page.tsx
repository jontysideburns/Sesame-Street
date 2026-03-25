import Link from "next/link";
import { ActivityFeed } from "../../components/activity-feed";
import { getActivity } from "../../api/activity";

function filterHref(sourceDomain: string) {
  if (sourceDomain === "All domains") {
    return "/activity";
  }
  const params = new URLSearchParams({ sourceDomain });
  return `/activity?${params.toString()}`;
}

export default async function ActivityPage({
  searchParams
}: {
  searchParams?: Promise<{ sourceDomain?: string }>;
}) {
  const filters = searchParams ? await searchParams : undefined;
  const activity = await getActivity(filters);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Platform activity feed</h1>
          <p className="hero-copy">
            Track the cross-domain audit narrative across review, compliance,
            requests, amendments, forecasts, notifications, and committee output.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/portfolio">
              Back to portfolio
            </Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Visible events</span>
              <strong>{activity.summary.eventCount}</strong>
            </div>
            <div className="summary-stat">
              <span>Deal-linked events</span>
              <strong>{activity.summary.dealEvents}</strong>
            </div>
            <div className="summary-stat">
              <span>Actors</span>
              <strong>{activity.summary.actors}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Domain view</h2>
          </div>
        </div>
        <div className="scope-breadcrumb">
          {activity.sourceDomainOptions.map((option) => (
            <Link
              key={option}
              className={`scope-crumb ${option === activity.selectedSourceDomain ? "active" : ""}`}
              href={filterHref(option)}
            >
              {option}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Feed</p>
            <h2>Chronological activity</h2>
          </div>
        </div>
        <ActivityFeed
          events={activity.events}
          emptyMessage="No activity events have been recorded for the selected filter."
        />
      </section>
    </main>
  );
}
