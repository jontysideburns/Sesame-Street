import type { ReportExport } from "../api/reports";

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function toneForReportKind(value: string) {
  if (value.includes("activity")) return "warning";
  if (value.includes("portfolio")) return "critical";
  return "good";
}

export function ReportExportList({
  exports,
  emptyTitle,
  emptyCopy
}: {
  exports: ReportExport[];
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (exports.length === 0) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>{emptyTitle}</h2>
          </div>
        </div>
        <p className="detail-copy">{emptyCopy}</p>
      </section>
    );
  }

  return (
    <section className="stack">
      {exports.map((reportExport) => (
        <article key={reportExport.id} className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{formatLabel(reportExport.exportScope)}</p>
              <h2>{reportExport.title}</h2>
              <p className="hero-copy">{reportExport.summary}</p>
            </div>
            <div className="tag-row">
              <span className={`badge ${toneForReportKind(reportExport.reportKind)}`}>
                {formatLabel(reportExport.reportKind)}
              </span>
              <span className="badge neutral">{reportExport.exportStatus}</span>
              <span className="badge neutral">{reportExport.reviewStatus}</span>
              <span className="badge neutral">{reportExport.releaseStatus}</span>
              <span className="badge neutral">{reportExport.exportFormat}</span>
            </div>
          </div>

          <div className="summary-grid memo-pack-meta-grid">
            <div className="mini-card">
              <strong>Generated</strong>
              <p>
                {formatDate(reportExport.generatedAt)} by {reportExport.generatedBy}
              </p>
            </div>
            <div className="mini-card">
              <strong>Context</strong>
              <p>
                {reportExport.dealName ??
                  reportExport.organisationName ??
                  reportExport.ownerName ??
                  reportExport.accountName ??
                  "Platform"}
              </p>
            </div>
          </div>

          <div className="memo-pack-sections">
            {reportExport.sections.map((section) => (
              <article key={section.id} className="mini-card">
                <div className="status-row">
                  <strong>{section.sectionTitle}</strong>
                  <span>{formatLabel(section.sectionKey)}</span>
                </div>
                <p>{section.summary}</p>
                <pre className="memo-pack-payload">
                  {JSON.stringify(section.sectionPayload, null, 2)}
                </pre>
              </article>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
