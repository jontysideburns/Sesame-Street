import Link from "next/link";
import type { ActivityEvent } from "../api/activity";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function prettyState(value: Record<string, unknown>) {
  if (!value || Object.keys(value).length === 0) {
    return "No captured state.";
  }

  return JSON.stringify(value, null, 2);
}

function descriptor(event: ActivityEvent) {
  const parts = [event.actorName];
  if (event.dealName) parts.push(event.dealName);
  if (event.organisationName && !event.dealName) parts.push(event.organisationName);
  if (event.ownerName) parts.push(event.ownerName);
  if (event.accountName) parts.push(event.accountName);
  return parts.join(" · ");
}

export function ActivityFeed({
  events,
  emptyMessage
}: {
  events: ActivityEvent[];
  emptyMessage: string;
}) {
  if (events.length === 0) {
    return <p className="detail-copy">{emptyMessage}</p>;
  }

  return (
    <div className="timeline-feed">
      {events.map((event) => (
        <article key={event.id} className="timeline-entry">
          <div className="timeline-entry-header">
            <div>
              <div className="tag-row">
                <span className="badge neutral">{event.eventFamily.replaceAll("_", " ")}</span>
                <span className="badge neutral">{event.sourceDomain.replaceAll("_", " ")}</span>
                <span className="badge neutral">{event.eventType.replaceAll("_", " ")}</span>
                <span className="badge neutral">{event.auditHow.replaceAll("_", " ")}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              <p className="meta-note">
                {descriptor(event)} · {event.actorType.replaceAll("_", " ")} ·{" "}
                {formatDate(event.createdAt)}
              </p>
            </div>
            <Link className="button secondary" href={event.deepLink}>
              Open related item
            </Link>
          </div>

          <div className="audit-diff-grid">
            <section className="audit-state-card">
              <span>Before</span>
              <pre>{prettyState(event.beforeState)}</pre>
            </section>
            <section className="audit-state-card">
              <span>After</span>
              <pre>{prettyState(event.afterState)}</pre>
            </section>
          </div>
        </article>
      ))}
    </div>
  );
}
