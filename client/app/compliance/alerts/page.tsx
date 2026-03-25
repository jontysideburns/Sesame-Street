import Link from "next/link";
import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceAlertsPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Alerts centre"
      description="Alerts are the routed signal layer above cases and obligations. They should be filterable, statused, and explicitly tied back to compliance events."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Alerts</p>
            <h2>Triggered compliance alerts</h2>
          </div>
        </div>
        <div className="stack">
          {compliance.alerts.map((item) => (
            <Link
              key={item.id}
              href={item.dealSlug ? `/deals/${item.dealSlug}` : "/compliance/exceptions"}
              className="document-card"
            >
              <div className="tag-row">
                <span className={`badge ${complianceStatusTone(item.priority)}`}>
                  {complianceLabel(item.priority)}
                </span>
                <span className="badge neutral">{complianceLabel(item.status)}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <small className="meta-note">
                {item.dealName ?? "Shared inbox"} · {complianceLabel(item.channel)} · Triggered{" "}
                {item.triggeredAt.slice(0, 10)}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
