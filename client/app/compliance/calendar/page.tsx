import Link from "next/link";
import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

function groupObligations(items: Awaited<ReturnType<typeof getCompliance>>["obligations"]) {
  return {
    overdue: items.filter((item) => item.status === "overdue"),
    withinGrace: items.filter((item) => item.status === "late_within_grace"),
    approaching: items.filter((item) => item.status === "approaching"),
    complete: items.filter((item) => item.status === "fulfilled")
  };
}

export default async function ComplianceCalendarPage() {
  const compliance = await getCompliance();
  const groups = groupObligations(compliance.obligations);

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Calendar and SLA queue"
      description="The calendar is the operational schedule for deliverables. It should show due-state, lateness, and SLA pressure before users ever open a document."
    >
      <section className="calendar-grid">
        {[
          { key: "overdue", label: "Overdue", items: groups.overdue },
          { key: "withinGrace", label: "Within grace", items: groups.withinGrace },
          { key: "approaching", label: "Approaching", items: groups.approaching },
          { key: "complete", label: "Fulfilled", items: groups.complete }
        ].map((group) => (
          <article key={group.key} className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SLA queue</p>
                <h2>{group.label}</h2>
              </div>
            </div>
            <div className="stack">
              {group.items.map((item) => (
                <Link key={item.id} href={`/deals/${item.dealSlug}`} className="document-card">
                  <div className="status-row">
                    <strong>{item.title}</strong>
                    <span className={`badge ${complianceStatusTone(item.status)}`}>
                      {complianceLabel(item.status)}
                    </span>
                  </div>
                  <p>{item.dealName}</p>
                  <small className="meta-note">
                    Due {item.dueDate}
                    {item.daysOverdue > 0 ? ` · ${item.daysOverdue} days late` : ""}
                  </small>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </ComplianceShell>
  );
}
