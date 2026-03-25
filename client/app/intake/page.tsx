import Link from "next/link";
import { getIntake } from "../../api/intake";
import { DocumentArtifactPreview } from "../../components/document-artifact-preview";
import { DocumentViewer } from "../../components/document-viewer";
import {
  approveDocumentPackage,
  invokeExceptionAssist,
  updateExtractionProposal
} from "./actions";

function stageLabel(value: string) {
  return value.replaceAll("_", " ");
}

function stageHref(stage: string | null) {
  if (!stage) {
    return "/intake";
  }
  const params = new URLSearchParams({ stage });
  return `/intake?${params.toString()}`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet recorded";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function badgeTone(value: string) {
  if (value.includes("committed") || value === "completed") return "good";
  if (value.includes("review") || value.includes("pending") || value.includes("attention")) return "warning";
  if (value.includes("failed") || value.includes("triage") || value.includes("exception")) return "critical";
  return "neutral";
}

function routingLabel(value: string) {
  return value.replaceAll("_", " ");
}

function proposalVarianceText(messages: Array<Record<string, unknown>>) {
  const varianceMessage = messages.find((message) => message.code === "variance_check");
  if (!varianceMessage) return null;
  const variancePct = varianceMessage.variancePct;
  const expectedValue = varianceMessage.expectedValue;
  if (typeof variancePct !== "number") return null;
  return `Variance ${variancePct}%${expectedValue !== undefined ? ` vs expected ${expectedValue}` : ""}`;
}

function stageTimelineHeadline(event: {
  stageName: string;
  stageStatus: string;
  processorType: string;
  confidence: number | null;
}) {
  const parts = [
    stageLabel(event.stageName),
    routingLabel(event.stageStatus),
    event.processorType.replaceAll("_", " ")
  ];
  if (event.confidence !== null) {
    parts.push(`${Math.round(event.confidence * 100)}%`);
  }
  return parts.join(" · ");
}

function shortProposalPill(proposal: {
  validationStatus: string;
  routingDecision: string;
  targetEntityType: string;
  confidence: number | null;
}) {
  const confidenceText =
    proposal.confidence !== null ? `${Math.round(proposal.confidence * 100)}%` : null;
  return [
    routingLabel(proposal.validationStatus),
    routingLabel(proposal.routingDecision),
    routingLabel(proposal.targetEntityType),
    confidenceText
  ].filter(Boolean) as string[];
}

function formatAuditHeadline(documentName: string, stage: string, actor: string, confidence: number | null) {
  const confidenceText =
    confidence !== null ? `${Math.round(confidence * 100)}% confidence` : "confidence not set";
  return `${stageLabel(stage)} · ${actor} · ${documentName} · ${confidenceText}`;
}

function proposalSupportsTargetPeriod(proposalType: string) {
  return ["period_match", "document_registration", "obligation_match", "metric_extraction"].includes(
    proposalType
  );
}

export default async function IntakePage({
  searchParams
}: {
  searchParams?: Promise<{ stage?: string }>;
}) {
  const filters = searchParams ? await searchParams : undefined;
  const intake = await getIntake();
  const selectedStage = filters?.stage ?? null;
  const matchedDocuments = intake.documents.filter((document) => document.dealSlug).length;
  const canonicalDocuments = intake.documents.filter(
    (document) => document.canonicalDocumentId !== null
  ).length;
  const unmatchedDocuments = intake.documents.filter((document) => !document.dealSlug).length;
  const lowConfidenceDocuments = intake.documents.filter(
    (document) => document.confidence !== null && document.confidence < 0.8
  ).length;
  const filteredDocuments = selectedStage
    ? intake.documents.filter((document) => document.normalizedStage === selectedStage)
    : intake.documents;
  const documentTypeLookup = new Map(
    intake.referenceData.documentTypes.map((documentType) => [documentType.key, documentType])
  );
  const visibleDocuments = filteredDocuments.map((document) => {
    const rawDocumentHref = `/api/artifacts/${document.id}/content`;
    const reviewDocumentHref = `/intake/documents/${document.id}`;
    return {
      ...document,
      rawDocumentHref,
      reviewDocumentHref
    };
  });

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Intake</p>
          <h1>Watched-directory intake and agent pipeline</h1>
          <p className="hero-copy">
            Files dropped into the watched directory are fingerprinted, classified,
            routed, and tracked through to review or auto-commit. This workspace
            shows each document&apos;s stage history and the proposals generated by the
            scaffolded agents.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href="/compliance/inbox">
              Open compliance inbox
            </Link>
            <Link className="button secondary" href="/review">
              Open review queue
            </Link>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Watcher</span>
          <strong>{intake.watcher.lastError ? "Issue" : "Healthy"}</strong>
          <small>
            Last scan {formatTimestamp(intake.watcher.lastScanAt)} ·{" "}
            {intake.watcher.directoryFileCount} files on disk
          </small>
        </article>
        <article className="metric-card">
          <span>Tracked documents</span>
          <strong>{intake.summary.trackedDocuments}</strong>
          <small>Total intake records currently visible.</small>
        </article>
        <article className="metric-card">
          <span>Matched to deal</span>
          <strong>{matchedDocuments}</strong>
          <small>Arrivals already tied to a visible deal.</small>
        </article>
        <article className="metric-card">
          <span>Canonical links</span>
          <strong>{canonicalDocuments}</strong>
          <small>Documents already promoted into the system of record.</small>
        </article>
        <article className="metric-card">
          <span>Unmatched arrivals</span>
          <strong>{unmatchedDocuments}</strong>
          <small>Need deal assignment before they can flow downstream.</small>
        </article>
        <article className="metric-card">
          <span>Tracked on disk</span>
          <strong>{intake.watcher.trackedFiles}</strong>
          <small>Files observed in the latest scan.</small>
        </article>
        <article className="metric-card">
          <span>Low-confidence items</span>
          <strong>{lowConfidenceDocuments}</strong>
          <small>Likely to need review even if they are matched.</small>
        </article>
      </section>

      <section className="panel section-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Stage counts</p>
            <h2>Pipeline posture</h2>
          </div>
        </div>
        <div className="stage-grid">
          {intake.stageCounts.map((item) => (
            <Link
              key={item.stage}
              className={`stage-card ${selectedStage === item.stage ? "selected" : ""}`}
              href={stageHref(item.stage)}
              scroll={false}
            >
              <span>{item.stage.replaceAll("_", " ")}</span>
              <strong>{item.count}</strong>
            </Link>
          ))}
        </div>
        <p className="meta-note">
          This section is the workflow-stage view only: arrived, fingerprinted,
          classified, matched, validated, exception, review, committed, closed, or failed.
        </p>
        <div className="stage-browser" id="stage-browser">
          <div className="stage-browser-header">
            <div>
              <p className="eyebrow">Stage browser</p>
              <h3>
                {selectedStage
                  ? `${stageLabel(selectedStage)} documents`
                  : "Choose a stage to inspect documents"}
              </h3>
            </div>
            {selectedStage ? (
              <Link className="button secondary" href={stageHref(null)} scroll={false}>
                Clear stage
              </Link>
            ) : null}
          </div>

          <p className="meta-note">
            {selectedStage
              ? `${filteredDocuments.length} document${filteredDocuments.length === 1 ? "" : "s"} currently in ${stageLabel(selectedStage)}.`
              : "Click any pipeline bubble above to see the documents currently sitting in that stage."}
          </p>

          {selectedStage ? (
            <div className="stage-document-list">
              {visibleDocuments.map((document) => (
                <details key={document.id} className="stage-document-disclosure">
                  <summary className="stage-document-summary">
                    <div className="stage-document-mainline">
                      <strong>{document.fileName}</strong>
                      <span>
                        {document.dealName
                          ? `${document.dealName}${document.periodLabel ? ` · ${document.periodLabel}` : ""}`
                          : "Unmatched intake item"}
                      </span>
                    </div>
                    <div className="stage-document-summary-meta">
                      <small>
                        {document.confidence !== null
                          ? `${Math.round(document.confidence * 100)}% confidence`
                          : "Confidence not set"}
                      </small>
                      <small>{formatTimestamp(document.directoryObservedAt)}</small>
                    </div>
                  </summary>

                  <div className="stage-document-details">
                    <DocumentViewer
                      title={document.fileName}
                      subtitle={
                        document.dealName
                          ? `${document.dealName}${document.periodLabel ? ` · ${document.periodLabel}` : ""}`
                          : "Unmatched intake item"
                      }
                      headerActions={
                        <>
                          {document.normalizedStage === "exception" ? (
                            <form action={invokeExceptionAssist}>
                              <input name="documentId" type="hidden" value={document.id} />
                              <input
                                name="invokedBy"
                                type="hidden"
                                value="Operations - Exception Assist"
                              />
                              <button className="button primary" type="submit">
                                Invoke AI assist
                              </button>
                            </form>
                          ) : null}
                          {document.normalizedStage === "review" ? (
                            <form action={approveDocumentPackage}>
                              <input name="documentId" type="hidden" value={document.id} />
                              <input name="approvedBy" type="hidden" value="Review - Tier 2" />
                              <button className="button primary" type="submit">
                                Approve document package
                              </button>
                            </form>
                          ) : null}
                          <Link
                            className={`button ${document.normalizedStage === "review" || document.normalizedStage === "exception" ? "secondary" : "primary"}`}
                            href={document.reviewDocumentHref}
                          >
                            {document.normalizedStage === "review"
                              ? "In Review"
                              : document.normalizedStage === "exception"
                                ? "Open Document"
                                : "Review"}
                          </Link>
                          {document.proposals.some((proposal) => proposal.routingDecision === "review") ? (
                            <Link className="button secondary" href="/review">
                              Open extracted fact review
                            </Link>
                          ) : null}
                          {document.dealSlug ? (
                            <Link className="button secondary" href={`/deals/${document.dealSlug}`}>
                              Open deal
                            </Link>
                          ) : null}
                          <Link className="button secondary" href="/compliance/inbox">
                            Open inbox
                          </Link>
                        </>
                      }
                      badges={
                        <>
                          <span className={`badge ${badgeTone(document.normalizedStage)}`}>
                            {stageLabel(document.normalizedStage)}
                          </span>
                          <span className={`badge ${badgeTone(document.processingStatus)}`}>
                            {stageLabel(document.processingStatus)}
                          </span>
                        </>
                      }
                      metadata={[
                        {
                          label: "Observed",
                          value: formatTimestamp(document.directoryObservedAt)
                        },
                        {
                          label: "Fingerprint",
                          value: formatTimestamp(document.fingerprintedAt)
                        },
                        {
                          label: "Size",
                          value: formatBytes(document.fileSizeBytes)
                        },
                        {
                          label: "Confidence",
                          value:
                            document.confidence !== null
                              ? `${Math.round(document.confidence * 100)}%`
                              : "—"
                        },
                        {
                          label: "Raw stage",
                          value: stageLabel(document.currentStage)
                        },
                        {
                          label: "Classification",
                          value: stageLabel(document.classificationStatus)
                        },
                        {
                          label: "Source",
                          value: stageLabel(document.sourceChannel)
                        },
                        {
                          label: "Review tier",
                          value: stageLabel(document.reviewTier)
                        }
                      ]}
                      sourcePath={document.intakeSourcePath || null}
                      summary={document.notes}
                    >
                      <DocumentArtifactPreview
                        mimeType={document.mimeType}
                        documentName={document.fileName}
                        rawDocumentHref={document.rawDocumentHref}
                        sectionClassName="intake-section"
                      />

                      <div className="intake-section">
                        <p className="eyebrow">Extraction proposals</p>
                        <div className="proposal-list">
                          {document.proposals.map((proposal) => (
                            <details key={proposal.id} className="proposal-item">
                              <summary className="proposal-summary">
                                <div className="proposal-mainline">
                                  <strong>
                                    {proposal.fieldLabel}:{" "}
                                    {proposal.fieldKey === "documentType"
                                      ? (documentTypeLookup.get(proposal.proposedValue)?.label ??
                                        proposal.proposedValue)
                                      : proposal.proposedValue}
                                  </strong>
                                  <div className="tag-row">
                                    {shortProposalPill(proposal).map((pill) => (
                                      <span key={pill} className="badge neutral compact-pill">
                                        {pill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="proposal-summary-meta">
                                  <small>
                                    {proposal.targetPeriodKey ?? proposal.commitAction.replaceAll("_", " ")}
                                  </small>
                                </div>
                              </summary>
                              <div className="proposal-details">
                                <p className="detail-copy">{proposal.validationSummary}</p>
                                <p className="meta-note">
                                  Target: {routingLabel(proposal.targetEntityType)}
                                  {proposal.targetMetricKey ? ` · ${proposal.targetMetricKey}` : ""}
                                  {proposal.targetPeriodKey ? ` · ${proposal.targetPeriodKey}` : ""}
                                </p>
                                <p className="meta-note">
                                  Commit path: {proposal.commitAction.replaceAll("_", " ")}
                                </p>
                                {proposalVarianceText(proposal.validationMessages) ? (
                                  <p className="meta-note">
                                    {proposalVarianceText(proposal.validationMessages)}
                                  </p>
                                ) : null}
                                {proposal.impactPreview.length > 0 ? (
                                  <div className="proposal-impact-list">
                                    <p className="eyebrow">Impact preview</p>
                                    {proposal.impactPreview.map((impact) => (
                                      <article key={impact.label} className="history-row intake-stage-event">
                                        <div>
                                          <strong>{impact.label}</strong>
                                          <p className="detail-copy">{impact.impactSummary}</p>
                                        </div>
                                        <div className="proposal-impact-meta">
                                          <small>Now: {impact.beforeValue}</small>
                                          <strong>If approved: {impact.afterValue}</strong>
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                ) : null}
                                {proposal.committedAt ? (
                                  <p className="meta-note">
                                    Committed {formatTimestamp(proposal.committedAt)}
                                    {proposal.committedBy ? ` by ${proposal.committedBy}` : ""}
                                  </p>
                                ) : null}
                                {!proposal.committedAt ? (
                                  <form action={updateExtractionProposal} className="proposal-edit-form">
                                    <input name="proposalId" type="hidden" value={proposal.id} />
                                    <input name="updatedBy" type="hidden" value="Review - Tier 2" />
                                    <label>
                                      <span>Proposed value</span>
                                      {proposal.fieldKey === "documentType" ? (
                                        <select defaultValue={proposal.proposedValue} name="proposedValue">
                                          {intake.referenceData.documentTypes.map((documentType) => (
                                            <option
                                              key={documentType.key}
                                              title={documentType.description}
                                              value={documentType.key}
                                            >
                                              {documentType.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          defaultValue={proposal.proposedValue}
                                          name="proposedValue"
                                          type="text"
                                        />
                                      )}
                                    </label>
                                    {proposal.fieldKey === "documentType" ? (
                                      <p className="meta-note">
                                        {documentTypeLookup.get(proposal.proposedValue)?.description ??
                                          "Select a standard document type from the controlled list."}
                                      </p>
                                    ) : null}
                                    {proposalSupportsTargetPeriod(proposal.proposalType) ? (
                                      <label>
                                        <span>Target period</span>
                                        <input
                                          defaultValue={proposal.targetPeriodKey ?? ""}
                                          name="targetPeriodKey"
                                          type="text"
                                        />
                                      </label>
                                    ) : null}
                                    {!document.dealSlug ? (
                                      <label>
                                        <span>Assign deal</span>
                                        <select defaultValue="" name="dealSlug">
                                          <option value="">Keep unmatched</option>
                                          {intake.referenceData.deals.map((deal) => (
                                            <option key={deal.id} value={deal.slug}>
                                              {deal.name}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    ) : null}
                                    <button className="button secondary" type="submit">
                                      Save correction
                                    </button>
                                  </form>
                                ) : null}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>

                      <div className="intake-section">
                        <p className="eyebrow">AI audit log</p>
                        <div className="intake-audit-list">
                          {document.aiAuditLogs.map((log) => {
                            const supportingCitations = document.citations.filter(
                              (citation) =>
                                log.proposalId !== null && citation.proposalId === log.proposalId
                            );

                            return (
                              <details key={log.id} className="intake-audit-item">
                                <summary className="intake-audit-summary">
                                  <span className="intake-audit-headline">
                                    {formatAuditHeadline(
                                      document.fileName,
                                      log.aiStage,
                                      log.actorLabel,
                                      log.confidence
                                    )}
                                  </span>
                                  <span className="meta-note">{formatTimestamp(log.createdAt)}</span>
                                </summary>
                                <div className="intake-audit-details">
                                  <p className="detail-copy">{log.summary}</p>
                                  <p className="meta-note">
                                    {log.modelName} {log.modelVersion} · {log.promptTemplate}
                                  </p>
                                  <p className="meta-note">
                                    Context: {log.retrievedContext.length} item
                                    {log.retrievedContext.length === 1 ? "" : "s"} · Tool calls:{" "}
                                    {log.toolCalls.length}
                                  </p>

                                  <div className="intake-audit-citations">
                                    <p className="eyebrow">Supporting citations</p>
                                    {supportingCitations.length > 0 ? (
                                      <div className="list-grid intake-timeline-grid">
                                        {supportingCitations.map((citation) => (
                                          <article
                                            key={citation.id}
                                            className="history-row intake-stage-event"
                                          >
                                            <div className="intake-inline-header">
                                              <strong>{citation.citationLabel}</strong>
                                              <span className="badge neutral">
                                                {stageLabel(citation.citationKind)}
                                              </span>
                                            </div>
                                            <p className="detail-copy">{citation.textSnippet}</p>
                                            <p className="meta-note">
                                              {citation.fieldKey ?? "general citation"}
                                              {citation.pageNumber
                                                ? ` · page ${citation.pageNumber}`
                                                : ""}
                                              {citation.tableLabel
                                                ? ` · ${citation.tableLabel}`
                                                : ""}
                                              {citation.cellReference
                                                ? ` · ${citation.cellReference}`
                                                : ""}
                                            </p>
                                          </article>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="meta-note">
                                        No structured citations are attached to this audit entry.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      </div>

                      <div className="intake-section">
                        <p className="eyebrow">Stage timeline</p>
                        <div className="proposal-list">
                          {document.stageTimeline.map((event) => (
                            <details key={event.id} className="proposal-item">
                              <summary className="proposal-summary">
                                <div className="proposal-mainline">
                                  <strong>{stageTimelineHeadline(event)}</strong>
                                  <div className="tag-row">
                                    <span className={`badge ${badgeTone(event.stageStatus)} compact-pill`}>
                                      {routingLabel(event.stageStatus)}
                                    </span>
                                    <span className="badge neutral compact-pill">
                                      {routingLabel(event.stageName)}
                                    </span>
                                  </div>
                                </div>
                                <div className="proposal-summary-meta">
                                  <small>{formatTimestamp(event.startedAt)}</small>
                                </div>
                              </summary>
                              <div className="proposal-details">
                                <p className="detail-copy">{event.summary}</p>
                                <p className="meta-note">
                                  Processor: {event.processorType.replaceAll("_", " ")}
                                </p>
                                <p className="meta-note">
                                  Started {formatTimestamp(event.startedAt)}
                                  {event.completedAt
                                    ? ` · Completed ${formatTimestamp(event.completedAt)}`
                                    : ""}
                                </p>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    </DocumentViewer>
                  </div>
                </details>
              ))}
            </div>
          ) : null}

          {selectedStage && filteredDocuments.length === 0 ? (
            <p className="meta-note">No documents are currently sitting in this stage.</p>
          ) : null}
        </div>
      </section>

    </main>
  );
}
