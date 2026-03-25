import Link from "next/link";
import { getNotifications } from "../../api/notifications";
import {
  updateNotificationDeliveryState,
  updateNotificationPreferences,
  updateNotificationSubscription
} from "./actions";

function tone(value: string) {
  if (["high", "critical", "task_overdue", "task_escalated", "new"].includes(value)) {
    return "critical";
  }
  if (["medium", "task_due_soon", "acknowledged"].includes(value)) {
    return "warning";
  }
  if (["resolved", "seen", "good"].includes(value)) {
    return "good";
  }
  return "neutral";
}

function filterHref(filters: { subscriber?: string; team?: string }) {
  const params = new URLSearchParams();
  if (filters.subscriber) params.set("subscriber", filters.subscriber);
  if (filters.team) params.set("team", filters.team);
  return params.size > 0 ? `/notifications?${params.toString()}` : "/notifications";
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ subscriber?: string; team?: string }>;
}) {
  const filters = searchParams ? await searchParams : undefined;
  const notifications = await getNotifications(filters);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>In-app inbox and routing</h1>
          <p className="hero-copy">
            Notifications route task escalations, decisions, and workflow changes into
            an in-app inbox with recipient preferences, scoped subscriptions, and
            digest tracking.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/work">
              Back to work
            </Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Recipient</span>
              <strong>{notifications.selectedSubscriber}</strong>
            </div>
            <div className="summary-stat">
              <span>New inbox items</span>
              <strong>{notifications.summary.newItems}</strong>
            </div>
            <div className="summary-stat">
              <span>Escalations</span>
              <strong>{notifications.summary.escalations}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>New</span>
          <strong>{notifications.summary.newItems}</strong>
        </article>
        <article className="metric-card">
          <span>Acknowledged</span>
          <strong>{notifications.summary.acknowledgedItems}</strong>
        </article>
        <article className="metric-card">
          <span>Digests</span>
          <strong>{notifications.summary.digestCount}</strong>
        </article>
        <article className="metric-card">
          <span>Escalations</span>
          <strong>{notifications.summary.escalations}</strong>
        </article>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Recipient filters</p>
            <h2>Subscriber and team context</h2>
          </div>
        </div>
        <div className="filter-group">
          <strong>Subscriber</strong>
          <div className="scope-breadcrumb">
            {notifications.subscriberOptions.map((option) => (
              <Link
                key={option}
                className={`scope-crumb ${option === notifications.selectedSubscriber ? "active" : ""}`}
                href={filterHref({ subscriber: option, team: notifications.selectedTeam })}
              >
                {option}
              </Link>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <strong>Team</strong>
          <div className="scope-breadcrumb">
            {notifications.teamOptions.map((option) => (
              <Link
                key={option}
                className={`scope-crumb ${option === notifications.selectedTeam ? "active" : ""}`}
                href={filterHref({ subscriber: notifications.selectedSubscriber, team: option })}
              >
                {option}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">In-app inbox</p>
              <h2>Current notifications</h2>
            </div>
          </div>
          <div className="stack">
            {notifications.inbox.map((item) => (
              <article key={item.id} className="document-card">
                <div className="tag-row">
                  <span className={`badge ${tone(item.event.severity)}`}>{item.event.severity}</span>
                  <span className={`badge ${tone(item.event.eventType)}`}>
                    {item.event.eventType.replaceAll("_", " ")}
                  </span>
                  <span className={`badge ${tone(item.deliveryStatus)}`}>
                    {item.deliveryStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <strong>{item.event.title}</strong>
                <p>{item.event.summary}</p>
                <p className="meta-note">
                  {item.event.sourceDomain} · delivered {item.deliveredAt.slice(0, 10)}
                </p>
                <div className="decision-row">
                  <Link className="mini-button subtle" href={item.event.deepLink}>
                    Open context
                  </Link>
                  <form action={updateNotificationDeliveryState}>
                    <input type="hidden" name="deliveryId" value={item.id} />
                    <input type="hidden" name="state" value="seen" />
                    <button className="mini-button subtle" type="submit">
                      Mark seen
                    </button>
                  </form>
                  <form action={updateNotificationDeliveryState}>
                    <input type="hidden" name="deliveryId" value={item.id} />
                    <input type="hidden" name="state" value="acknowledged" />
                    <button className="mini-button" type="submit">
                      Acknowledge
                    </button>
                  </form>
                  <form action={updateNotificationDeliveryState}>
                    <input type="hidden" name="deliveryId" value={item.id} />
                    <input type="hidden" name="state" value="dismissed" />
                    <button className="mini-button subtle" type="submit">
                      Dismiss
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Preferences</p>
              <h2>Recipient defaults</h2>
            </div>
          </div>
          <form className="onboarding-form" action={updateNotificationPreferences}>
            <input type="hidden" name="subscriberName" value={notifications.preferences.subscriberName} />
            <div className="form-grid">
              <label className="field">
                <span>Subscriber team</span>
                <input name="subscriberTeam" defaultValue={notifications.preferences.subscriberTeam} />
              </label>
              <label className="field">
                <span>Default channel</span>
                <select name="defaultChannel" defaultValue={notifications.preferences.defaultChannel}>
                  <option value="in_app">In-app</option>
                </select>
              </label>
              <label className="field">
                <span>In-app enabled</span>
                <select
                  name="inAppEnabled"
                  defaultValue={String(notifications.preferences.inAppEnabled)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label className="field">
                <span>Immediate notifications</span>
                <select
                  name="immediateEnabled"
                  defaultValue={String(notifications.preferences.immediateEnabled)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label className="field">
                <span>Digest enabled</span>
                <select
                  name="digestEnabled"
                  defaultValue={String(notifications.preferences.digestEnabled)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </label>
              <label className="field">
                <span>Digest frequency</span>
                <select
                  name="digestFrequency"
                  defaultValue={notifications.preferences.digestFrequency}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
              <label className="field">
                <span>Escalations only</span>
                <select
                  name="escalationOnly"
                  defaultValue={String(notifications.preferences.escalationOnly)}
                >
                  <option value="false">All matching items</option>
                  <option value="true">Escalations only</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="button primary" type="submit">
                Save preferences
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Subscriptions</p>
              <h2>Routing rules</h2>
            </div>
          </div>
          <div className="stack">
            {notifications.subscriptions.map((subscription) => (
              <article key={subscription.id} className="mini-card">
                <div className="status-row">
                  <strong>{subscription.subscriptionLabel}</strong>
                  <span className={`badge ${subscription.active ? "good" : "neutral"}`}>
                    {subscription.active ? "active" : "inactive"}
                  </span>
                </div>
                <p>
                  {(subscription.sourceDomain ?? "all domains").replaceAll("_", " ")} ·{" "}
                  {subscription.dealName ??
                    subscription.accountName ??
                    subscription.ownerName ??
                    subscription.organisationName ??
                    "portfolio-wide"}
                </p>
                <form className="onboarding-form" action={updateNotificationSubscription}>
                  <input type="hidden" name="subscriptionId" value={subscription.id} />
                  <div className="form-grid">
                    <label className="field">
                      <span>Active</span>
                      <select name="active" defaultValue={String(subscription.active)}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Frequency</span>
                      <select
                        name="deliveryFrequency"
                        defaultValue={subscription.deliveryFrequency}
                      >
                        <option value="immediate">Immediate</option>
                        <option value="daily_digest">Daily digest</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Escalations only</span>
                      <select
                        name="onlyEscalations"
                        defaultValue={String(subscription.onlyEscalations)}
                      >
                        <option value="false">All matching items</option>
                        <option value="true">Escalations only</option>
                      </select>
                    </label>
                  </div>
                  <div className="form-actions">
                    <button className="mini-button" type="submit">
                      Save subscription
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Digests</p>
              <h2>Recent digest routing</h2>
            </div>
          </div>
          <div className="stack">
            {notifications.digests.map((digest) => (
              <article key={digest.id} className="document-card">
                <div className="tag-row">
                  <span className="badge neutral">{digest.digestFrequency}</span>
                  <span className={`badge ${tone(digest.digestStatus)}`}>
                    {digest.digestStatus}
                  </span>
                </div>
                <strong>{digest.digestLabel}</strong>
                <p>{digest.summary}</p>
                <p className="meta-note">
                  {digest.itemCount} item(s) · generated {digest.generatedAt.slice(0, 10)}
                </p>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
