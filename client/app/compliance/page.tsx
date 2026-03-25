import Link from "next/link";
import { getCompliance } from "../../api/compliance";
import { ComplianceShell } from "../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../components/compliance-utils";

export default async function CompliancePage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Track what is due, what arrived, and where each package sits in processing."
      description="This workspace groups the sub-functions of compliance into a consistent local navigation: obligations, incoming packages, processing state, fulfilments, review, and evidence."
      aside={
        <div className="hero-card emphasis-card">
          <p className="eyebrow">Implementation plan</p>
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>1. Intake model</span>
              <strong>Built</strong>
            </div>
            <div className="summary-stat">
              <span>2. Compliance hub</span>
              <strong>Built</strong>
            </div>
            <div className="summary-stat">
              <span>3. Processing states</span>
              <strong>Built</strong>
            </div>
            <div className="summary-stat">
              <span>4. Calendar / SLAs</span>
              <strong>Next</strong>
            </div>
          </div>
        </div>
      }
    >

      <section className="metric-grid">
        <article className="metric-card">
          <span>Active obligations</span>
          <strong>{compliance.summary.activeObligations}</strong>
        </article>
        <article className="metric-card">
          <span>Overdue</span>
          <strong>{compliance.summary.overdueObligations}</strong>
        </article>
        <article className="metric-card">
          <span>Within grace</span>
          <strong>{compliance.summary.withinGrace}</strong>
        </article>
        <article className="metric-card">
          <span>Approaching</span>
          <strong>{compliance.summary.approaching}</strong>
        </article>
        <article className="metric-card">
          <span>Inbox attention</span>
          <strong>{compliance.summary.inboxAttention}</strong>
        </article>
        <article className="metric-card">
          <span>Pending review</span>
          <strong>{compliance.summary.pendingReview}</strong>
        </article>
        <article className="metric-card">
          <span>Open cases</span>
          <strong>{compliance.summary.openCases}</strong>
        </article>
        <article className="metric-card">
          <span>Active alerts</span>
          <strong>{compliance.summary.activeAlerts}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Live schedule and exceptions</h2>
            </div>
          </div>
          <div className="stack">
            {compliance.obligations.slice(0, 4).map((item) => (
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
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Incoming packages needing attention</h2>
            </div>
          </div>
          <div className="stack">
            {compliance.incomingDocuments.slice(0, 4).map((document) => (
              <Link
                key={document.id}
                href={document.dealSlug ? `/deals/${document.dealSlug}` : "/evidence"}
                className="document-card"
              >
                <div className="tag-row">
                  <span className={`badge ${complianceStatusTone(document.processingStatus)}`}>
                    {complianceLabel(document.currentStage)}
                  </span>
                  <span className="badge neutral">{complianceLabel(document.reviewTier)}</span>
                </div>
                <strong>{document.fileName}</strong>
                <p>
                  {document.dealName ?? "Unmatched"} · {complianceLabel(document.documentType)} ·{" "}
                  {complianceLabel(document.classificationStatus)}
                </p>
                <p>{document.notes}</p>
                <small className="meta-note">
                  {complianceLabel(document.sourceChannel)} · Received{" "}
                  {document.receivedAt.slice(0, 10)}
                  {typeof document.confidence === "number"
                    ? ` · ${(document.confidence * 100).toFixed(0)}% confidence`
                    : ""}
                </small>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h2>Open case queue</h2>
            </div>
          </div>
          <div className="stack">
            {compliance.cases.slice(0, 3).map((item) => (
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
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Alerts</p>
              <h2>Active signal layer</h2>
            </div>
          </div>
          <div className="stack">
            {compliance.alerts.slice(0, 3).map((item) => (
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
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2>Stage distribution and recent processing</h2>
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

          <div className="stack compliance-stack">
            {compliance.processingRuns.slice(0, 4).map((run) => (
              <div key={run.id} className="history-row">
                <div>
                  <strong>{run.fileName}</strong>
                  <p>
                    {(run.dealName ?? "Unassigned") + " · " + complianceLabel(run.stageName)}
                  </p>
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
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Recent fulfilments</h2>
            </div>
          </div>
          <div className="stack compliance-stack">
            {compliance.fulfilments.slice(0, 4).map((item) => (
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
        </article>
      </section>
    </ComplianceShell>
  );
}
