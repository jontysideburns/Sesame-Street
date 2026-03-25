import Link from "next/link";
import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceExceptionsPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Exceptions and cases"
      description="Cases turn exceptions into durable work items with an owner, SLA, status, and resolution note. This is the operational queue for compliance exceptions."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Cases</p>
            <h2>Open and resolved exceptions</h2>
          </div>
        </div>
        <div className="stack">
          {compliance.cases.map((item) => (
            <Link
              key={item.id}
              href={item.dealSlug ? `/deals/${item.dealSlug}` : "/compliance/inbox"}
              className="document-card"
            >
              <div className="tag-row">
                <span className={`badge ${complianceStatusTone(item.severity)}`}>
                  {complianceLabel(item.severity)}
                </span>
                <span className="badge neutral">{complianceLabel(item.status)}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
              <small className="meta-note">
                {item.dealName ?? "Shared inbox"} · Owner {item.ownerName} · SLA{" "}
                {item.slaDueAt.slice(0, 10)}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
