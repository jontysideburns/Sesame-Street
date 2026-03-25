import Link from "next/link";
import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceFulfilmentsPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Fulfilments"
      description="Fulfilments link the compliance schedule to received documents. This ledger is the canonical view of whether each expected deliverable was actually satisfied."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2>Matched delivery history</h2>
          </div>
        </div>
        <div className="stack">
          {compliance.fulfilments.map((item) => (
            <Link key={item.id} href={`/deals/${item.dealSlug}`} className="document-card">
              <div className="status-row">
                <strong>{item.obligationTitle}</strong>
                <span className={`badge ${complianceStatusTone(item.status)}`}>
                  {complianceLabel(item.status)}
                </span>
              </div>
              <p>{item.dealName}</p>
              <p>{item.notes}</p>
              <small className="meta-note">
                Due {item.dueDate}
                {item.receivedAt ? ` · Received ${item.receivedAt.slice(0, 10)}` : ""}
                {item.daysLate > 0 ? ` · ${item.daysLate} days late` : ""}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
