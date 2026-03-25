import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealActivity } from "../../../../api/activity";
import { ActivityFeed } from "../../../../components/activity-feed";

export default async function DealActivityPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const activity = await getDealActivity(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Deal timeline</p>
            <h1>{activity.dealName}</h1>
            <p className="hero-copy">
              Review the audit timeline for this deal, including approvals,
              decisions, amendments, snapshots, and workflow updates.
            </p>
            <div className="hero-actions">
              <Link className="button secondary" href={`/deals/${activity.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href="/activity">
                Open platform feed
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Events</span>
                <strong>{activity.summary.eventCount}</strong>
              </div>
              <div className="summary-stat">
                <span>Source domains</span>
                <strong>{activity.summary.domains}</strong>
              </div>
              <div className="summary-stat">
                <span>Grade</span>
                <strong>{activity.dealGrade}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="panel section-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h2>Deal activity timeline</h2>
            </div>
          </div>
          <ActivityFeed
            events={activity.events}
            emptyMessage="No activity has been recorded for this deal yet."
          />
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
