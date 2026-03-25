import Link from "next/link";
import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceObligationsPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Obligations"
      description="The live compliance schedule should be easy to scan by due date, status, and deal. This view isolates the obligations ledger from the rest of the intake workflow."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Schedule</p>
            <h2>All active obligations</h2>
          </div>
        </div>
        <div className="stack">
          {compliance.obligations.map((item) => (
            <Link key={item.id} href={`/deals/${item.dealSlug}`} className="document-card">
              <div className="status-row">
                <strong>{item.title}</strong>
                <span className={`badge ${complianceStatusTone(item.status)}`}>
                  {complianceLabel(item.status)}
                </span>
              </div>
              <p>
                {item.dealName} · {item.code} · {complianceLabel(item.phase)}
              </p>
              <small className="meta-note">
                Due {item.dueDate}
                {item.daysOverdue > 0 ? ` · ${item.daysOverdue} days late` : ""}
                {item.graceDays > 0 ? ` · ${item.graceDays} grace days` : ""}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
