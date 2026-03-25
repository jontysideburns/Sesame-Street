import { getCompliance } from "../../../api/compliance";
import { triageIncomingDocument } from "../actions";
import { ComplianceShell } from "../../../components/compliance-shell";
import {
  complianceLabel,
  complianceStatusTone
} from "../../../components/compliance-utils";

export default async function ComplianceInboxPage() {
  const compliance = await getCompliance();

  return (
    <ComplianceShell
      eyebrow="Compliance monitoring"
      title="Incoming documents"
      description="This inbox is where inbound packages first become operational objects. It shows source, match quality, tier, and current processing state before the data becomes canonical."
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Inbox</p>
            <h2>Borrower packages and triage status</h2>
          </div>
        </div>
        <div className="stack">
          {compliance.incomingDocuments.map((document) => (
            <article key={document.id} className="document-card">
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
                {complianceLabel(document.sourceChannel)} · Received {document.receivedAt.slice(0, 10)}
                {typeof document.confidence === "number"
                  ? ` · ${(document.confidence * 100).toFixed(0)}% confidence`
                  : ""}
              </small>
              {document.processingStatus !== "committed" ? (
                <div className="card-actions">
                  {!document.dealSlug ? (
                    <form action={triageIncomingDocument} className="inline-form">
                      <input type="hidden" name="id" value={document.id} />
                      <input type="hidden" name="action" value="assign_deal" />
                      <input
                        type="hidden"
                        name="dealSlug"
                        value="aurora-prime-data-campus"
                      />
                      <button className="mini-button" type="submit">
                        Assign to Aurora
                      </button>
                    </form>
                  ) : null}
                  <form action={triageIncomingDocument} className="inline-form">
                    <input type="hidden" name="id" value={document.id} />
                    <input type="hidden" name="action" value="send_to_review" />
                    <button className="mini-button" type="submit">
                      Send to review
                    </button>
                  </form>
                  <form action={triageIncomingDocument} className="inline-form">
                    <input type="hidden" name="id" value={document.id} />
                    <input type="hidden" name="action" value="mark_duplicate" />
                    <button className="mini-button subtle" type="submit">
                      Mark duplicate
                    </button>
                  </form>
                  <form action={triageIncomingDocument} className="inline-form">
                    <input type="hidden" name="id" value={document.id} />
                    <input type="hidden" name="action" value="close" />
                    <button className="mini-button subtle" type="submit">
                      Close
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </ComplianceShell>
  );
}
