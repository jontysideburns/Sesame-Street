import Link from "next/link";
import { getEvidence } from "../../api/evidence";

export default async function EvidencePage() {
  const evidence = await getEvidence();

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Evidence</p>
          <h1>One place for source packages, citations, and review state.</h1>
          <p className="hero-copy">
            Documents and proposed facts are grouped together here because the
            operating UX should follow the evidence chain from receipt to
            approval.
          </p>
        </div>
      </section>

      <section className="metric-grid evidence-metrics">
        <article className="metric-card">
          <span>Documents received</span>
          <strong>{evidence.summary.documentsReceived}</strong>
        </article>
        <article className="metric-card">
          <span>Pending reviews</span>
          <strong>{evidence.summary.pendingReviews}</strong>
        </article>
        <article className="metric-card">
          <span>Approved packages</span>
          <strong>{evidence.summary.approvedDocuments}</strong>
        </article>
        <article className="metric-card">
          <span>Supersessions</span>
          <strong>{evidence.summary.supersessions}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Document library</p>
              <h2>Recent source packages</h2>
            </div>
          </div>
          <div className="stack">
            {evidence.documents.map((document) => (
              <Link
                key={document.id}
                href={`/deals/${document.dealSlug}`}
                className="document-card"
              >
                <div className="status-row">
                  <strong>{document.documentName}</strong>
                  <span className={`badge ${document.status === "approved" ? "good" : "warning"}`}>
                    {document.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p>
                  {document.dealName} · {document.documentType.replaceAll("_", " ")} ·{" "}
                  {document.periodLabel}
                </p>
                <p>{document.snippet}</p>
                <small className="meta-note">
                  Received {document.receivedAt.slice(0, 10)} · Page {document.evidencePage}
                </small>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Review state</p>
              <h2>Proposals awaiting approval</h2>
            </div>
            <Link className="text-link" href="/review">
              Open workflow
            </Link>
          </div>
          <div className="stack">
            {evidence.reviewItems.map((item) => (
              <Link key={item.id} href="/review" className="document-card">
                <div className="tag-row">
                  <span className="badge neutral">{item.dealName}</span>
                  <span className="badge neutral">
                    {item.proposalType.replaceAll("_", " ")}
                  </span>
                  <span className="badge warning">
                    {(item.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <strong>{item.fieldName.replaceAll("_", " ")}</strong>
                <p>{item.reason}</p>
                <p>{item.snippet}</p>
                <small className="meta-note">
                  {item.documentName} · Page {item.pageNumber} · Proposed {item.proposedValue}
                </small>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Source lineage</p>
            <h2>Supersession events</h2>
          </div>
        </div>
        <div className="stack">
          {evidence.supersessions.map((item) => (
            <Link key={item.id} href={`/deals/${item.dealSlug}/periods/latest`} className="document-card">
              <div className="status-row">
                <strong>{item.dealName}</strong>
                <span className="badge warning">
                  {item.supersessionReason.replaceAll("_", " ")}
                </span>
              </div>
              <p>
                {item.supersedingDocument.documentName} supersedes{" "}
                {item.supersededDocument.documentName}
              </p>
              <p>{item.impactSummary}</p>
              <small className="meta-note">
                {item.periodLabel} · effective {item.effectiveAt.slice(0, 10)}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
