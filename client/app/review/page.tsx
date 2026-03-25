import { approveReviewItem } from "./actions";
import { getReviewQueue } from "../../api/review";
import { reviewFieldToMetricKey } from "../../api/deals";
import Link from "next/link";
import { DocumentArtifactPreview } from "../../components/document-artifact-preview";
import { DocumentViewer } from "../../components/document-viewer";

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

export default async function ReviewPage() {
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
  const pendingCount = reviewItems.filter((item) => item.status === "pending").length;
  const dueTodayCount = reviewItems.filter(
    (item) => item.dueAt.slice(0, 10) <= item.slaDueAt.slice(0, 10)
  ).length;

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Compliance flow</p>
          <h1>Review queue for inbound compliance certificates</h1>
          <p className="hero-copy">
            This investor demo focuses on the thin workflow that matters most:
            a late compliance package is ingested, reviewed, approved, and then
            reflected across the portfolio dashboard and TopSheet.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Tier 2 proposals</p>
            <h2>Basic review approval workspace</h2>
            <p className="detail-copy">
              Open a review item, inspect the source evidence and prior-period
              context, then approve it directly from the same screen.
            </p>
          </div>
        </div>
        <div className="review-summary-bar">
          <div>
            <span>Pending items</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>Reviewer</span>
            <strong>{items[0]?.ownerName ?? "HAM - Shared Queue"}</strong>
          </div>
          <div>
            <span>Active documents</span>
            <strong>{new Set(reviewItems.map((item) => item.documentName)).size}</strong>
          </div>
          <div>
            <span>Due / SLA tracked</span>
            <strong>{dueTodayCount}</strong>
          </div>
        </div>
        {reviewItems.length === 0 ? (
          <p className="detail-copy">No pending review items.</p>
        ) : (
          <div className="review-workspace-list">
            {reviewItems.map((item) => (
              <details key={item.id} className="review-workspace-item">
                <summary className="review-workspace-summary">
                  <div className="review-workspace-mainline">
                    <strong>{item.fieldName.replaceAll("_", " ")}</strong>
                    <span>{item.proposedValue}</span>
                    <span>{item.dealName}</span>
                    <span>{item.documentName}</span>
                  </div>
                  <div className="review-workspace-summary-meta">
                    <span className="badge neutral compact-pill">
                      {item.proposalType.replaceAll("_", " ")}
                    </span>
                    <span className="badge warning compact-pill">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                    <small>Due {item.dueAt.slice(0, 10)}</small>
                  </div>
                </summary>

                <div className="review-workspace-details">
                  <DocumentViewer
                    title={item.documentName}
                    subtitle={`${item.dealName} · page ${item.pageNumber}`}
                    badges={
                      <>
                        <span className="badge neutral">
                          {item.proposalType.replaceAll("_", " ")}
                        </span>
                        <span className="badge neutral">{item.ownerName}</span>
                        <span className="badge warning">
                          {(item.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </>
                    }
                    metadata={[
                      {
                        label: "Field",
                        value: item.fieldName.replaceAll("_", " ")
                      },
                      {
                        label: "Proposed",
                        value: item.proposedValue
                      },
                      {
                        label: "Prior",
                        value: item.priorValue
                      },
                      {
                        label: "Due",
                        value: item.dueAt.slice(0, 10)
                      },
                      {
                        label: "SLA due",
                        value: item.slaDueAt.slice(0, 10)
                      }
                    ]}
                    summary={item.reason}
                    actions={
                      <>
                        <Link className="button ghost" href={reviewContextHref(item)}>
                          Open period context
                        </Link>
                        {item.rawDocumentHref ? (
                          <a
                            className="button ghost"
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
                      </>
                    }
                  >
                    <div className="review-evidence-block">
                      <p className="eyebrow">Source evidence</p>
                      <blockquote>{item.snippet}</blockquote>
                    </div>
                    <DocumentArtifactPreview
                      mimeType={item.mimeType}
                      documentName={item.documentName}
                      rawDocumentHref={item.rawDocumentHref}
                    />
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
                  </DocumentViewer>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
