import Link from "next/link";
import { getWorkQueue, type WorkTask } from "../../api/work";

function tone(value: string) {
  if (["overdue", "escalated", "critical", "high", "blocked"].includes(value)) {
    return "critical";
  }
  if (["approaching_due", "warning", "medium", "in_progress"].includes(value)) {
    return "warning";
  }
  if (["resolved", "low", "on_track"].includes(value)) {
    return "good";
  }
  return "neutral";
}

function taskHref(task: WorkTask) {
  return task.deepLink || (task.dealSlug ? `/deals/${task.dealSlug}` : "/configuration");
}

function taskCard(task: WorkTask) {
  return (
    <Link key={task.id} className="document-card" href={taskHref(task)}>
      <div className="tag-row">
        <span className={`badge ${tone(task.priority)}`}>{task.priority}</span>
        <span className={`badge ${tone(task.taskStatus)}`}>
          {task.taskStatus.replaceAll("_", " ")}
        </span>
        <span className={`badge ${tone(task.escalationStatus)}`}>
          {task.escalationStatus.replaceAll("_", " ")}
        </span>
      </div>
      <strong>{task.title}</strong>
      <p>{task.summary}</p>
      <p className="meta-note">
        {task.queueName} · {task.assigneeName} · due {task.dueAt.slice(0, 10)}
      </p>
    </Link>
  );
}

function filterHref(filters: { assignee?: string; team?: string }) {
  const params = new URLSearchParams();

  if (filters.assignee) params.set("assignee", filters.assignee);
  if (filters.team) params.set("team", filters.team);

  return params.size > 0 ? `/work?${params.toString()}` : "/work";
}

export default async function WorkPage({
  searchParams
}: {
  searchParams?: Promise<{ assignee?: string; team?: string }>;
}) {
  const filters = searchParams ? await searchParams : undefined;
  const work = await getWorkQueue(filters);

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Work queue</p>
          <h1>Cross-domain operating queue</h1>
          <p className="hero-copy">
            Work consolidates review, compliance, risk, borrower requests, and
            configuration tasks into one operating surface with assignment, SLA,
            and escalation context.
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
              <span>Selected assignee</span>
              <strong>{work.selectedAssignee}</strong>
            </div>
            <div className="summary-stat">
              <span>Selected team</span>
              <strong>{work.selectedTeam}</strong>
            </div>
            <div className="summary-stat">
              <span>Attention items</span>
              <strong>{work.attentionTasks.length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Open tasks</span>
          <strong>{work.summary.openTasks}</strong>
        </article>
        <article className="metric-card">
          <span>My open tasks</span>
          <strong>{work.summary.myOpenTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Team queue</span>
          <strong>{work.summary.teamOpenTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Overdue</span>
          <strong>{work.summary.overdueTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Escalated</span>
          <strong>{work.summary.escalatedTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Blocked</span>
          <strong>{work.summary.blockedTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Due today</span>
          <strong>{work.summary.dueToday}</strong>
        </article>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>Assignee and team views</h2>
          </div>
        </div>
        <div className="filter-group">
          <strong>Assignee</strong>
          <div className="scope-breadcrumb">
            {work.assigneeOptions.map((option) => (
              <Link
                key={option}
                className={`scope-crumb ${option === work.selectedAssignee ? "active" : ""}`}
                href={filterHref({ assignee: option, team: work.selectedTeam })}
              >
                {option}
              </Link>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <strong>Team</strong>
          <div className="scope-breadcrumb">
            {work.teamOptions.map((option) => (
              <Link
                key={option}
                className={`scope-crumb ${option === work.selectedTeam ? "active" : ""}`}
                href={filterHref({ assignee: work.selectedAssignee, team: option })}
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
              <p className="eyebrow">My work</p>
              <h2>{work.selectedAssignee}</h2>
            </div>
          </div>
          <div className="stack">
            {work.myTasks.length > 0 ? (
              work.myTasks.map(taskCard)
            ) : (
              <p className="detail-copy">No open tasks for this assignee.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Team queue</p>
              <h2>{work.selectedTeam}</h2>
            </div>
          </div>
          <div className="stack">
            {work.teamTasks.length > 0 ? (
              work.teamTasks.map(taskCard)
            ) : (
              <p className="detail-copy">No open tasks for this team.</p>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Escalations and SLA breaches</h2>
            </div>
          </div>
          <div className="stack">
            {work.attentionTasks.length > 0 ? (
              work.attentionTasks.map(taskCard)
            ) : (
              <p className="detail-copy">No escalated or overdue items.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Resolved</p>
              <h2>Recently completed</h2>
            </div>
          </div>
          <div className="stack">
            {work.recentlyResolved.length > 0 ? (
              work.recentlyResolved.map(taskCard)
            ) : (
              <p className="detail-copy">No recently completed tasks.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
