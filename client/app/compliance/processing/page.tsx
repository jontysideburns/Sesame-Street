import { getCompliance } from "../../../api/compliance";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceProcessingPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Processing state"
      description="Processing state should be visible as a proper operational lane, not buried in review or evidence. This view focuses on where documents are in the intake pipeline."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Pipeline</p>
            <h2>Current stage distribution</h2>
          </div>
        </div>
        <div className="stage-grid">
          {compliance.stageCounts.map((item) => (
            <article key={item.stage} className="stage-card">
              <span>{complianceLabel(item.stage)}</span>
              <strong>{item.count}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Runs</p>
            <h2>Recent processing events</h2>
          </div>
        </div>
        <div className="stack compliance-stack">
          {compliance.processingRuns.map((run) => (
            <div key={run.id} className="history-row">
              <div>
                <strong>{run.fileName}</strong>
                <p>{(run.dealName ?? "Unassigned") + " · " + complianceLabel(run.stageName)}</p>
                <small className="meta-note">{run.summary}</small>
              </div>
              <div className="obligation-meta">
                <span className={`badge ${complianceStatusTone(run.stageStatus)}`}>
                  {complianceLabel(run.stageStatus)}
                </span>
                <small>{run.processorType}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
