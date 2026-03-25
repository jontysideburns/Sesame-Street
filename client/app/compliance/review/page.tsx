import { approveReviewItem } from "../../review/actions";
import { getReviewQueue } from "../../../api/review";
import { reviewFieldToMetricKey } from "../../../api/deals";
import { ComplianceShell } from "../../../components/compliance-shell";
import { DocumentArtifactPreview } from "../../../components/document-artifact-preview";
import Link from "next/link";

function reviewContextHref(item: {
  dealSlug: string;
  proposalType: string;
  fieldName: string;
}) {
  const metricKey = reviewFieldToMetricKey(item.fieldName);
  if (item.proposalType === "ratio_reconciliation") {
    return `/deals/${item.dealSlug}/periods/latest#reconciliation-${metricKey}`;
  }
  return `/deals/${item.dealSlug}/periods/latest#variance-${metricKey}`;
}

export default async function ComplianceReviewPage() {
  const items = await getReviewQueue();
  const reviewItems = items.map((item) => {
    const rawDocumentHref = item.incomingDocumentId
      ? `/api/artifacts/${item.incomingDocumentId}/content`
      : null;
    return {
      ...item,
      rawDocumentHref
    };
  });

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Review queue"
      description="Review is shown here as a sub-function of compliance processing, while still remaining available as a standalone workspace in the top-level navigation."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tier 2 proposals</p>
            <h2>Pending review items</h2>
          </div>
        </div>
        <div className="review-layout">
          {reviewItems.map((item) => (
            <article key={item.id} className="review-card">
              <div className="review-source">
                <p className="eyebrow">Source</p>
                <strong>{item.documentName}</strong>
                <p>Page {item.pageNumber}</p>
                <blockquote>{item.snippet}</blockquote>
                <DocumentArtifactPreview
                  mimeType={item.mimeType}
                  documentName={item.documentName}
                  rawDocumentHref={item.rawDocumentHref}
                  sectionClassName="review-evidence-block"
                />
              </div>
              <div className="review-details">
                <div className="tag-row">
                  <span className="badge neutral">{item.dealName}</span>
                  <span className="badge neutral">
                    {item.proposalType.replaceAll("_", " ")}
                  </span>
                  <span className="badge warning">
                    {(item.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <h3>{item.fieldName.replaceAll("_", " ")}</h3>
                <p>{item.reason}</p>
                <div className="comparison-grid">
                  <div>
                    <span>Proposed</span>
                    <strong>{item.proposedValue}</strong>
                  </div>
                  <div>
                    <span>Prior period</span>
                    <strong>{item.priorValue}</strong>
                  </div>
                </div>
                <Link
                  className="text-link"
                  href={reviewContextHref(item)}
                >
                  Open period context
                </Link>
                {item.rawDocumentHref ? (
                  <a
                    className="text-link"
                    href={item.rawDocumentHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open raw document
                  </a>
                ) : null}
                <form
                  action={async () => {
                    "use server";
                    await approveReviewItem(item.id);
                  }}
                >
                  <button className="button primary" type="submit">
                    Approve and commit
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
