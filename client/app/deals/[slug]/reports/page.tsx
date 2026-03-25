import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealReports } from "../../../../api/reports";
import { ReportExportList } from "../../../../components/report-export-list";
import {
  approveDealReportExport,
  generateDealActivityAuditReport,
  generateDealMonitoringReport,
  releaseDealReportExport,
  reviewDealReportExport
} from "../../actions";

export default async function DealReportsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const reports = await getDealReports(slug);
    const permissions = reports.viewer.permissions;
    const pendingExports = reports.exports.filter(
      (item) => item.reviewStatus !== "approved" || item.releaseStatus !== "released"
    );

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Deal reports</p>
            <h1>{reports.dealName}</h1>
            <p className="hero-copy">
              Generate external-ready monitoring and audit exports directly from the
              live deal workspace.
            </p>
            <p className="meta-note">
              Viewer: {reports.viewer.displayName} · {reports.viewer.teamName}
            </p>
            <div className="hero-actions">
              <Link className="button secondary" href={`/deals/${reports.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${reports.dealSlug}/activity`}>
                Open timeline
              </Link>
            </div>
          </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Deal grade</span>
              <strong>{reports.dealGrade}</strong>
            </div>
            <div className="summary-stat">
              <span>Generated exports</span>
              <strong>{reports.exports.length}</strong>
            </div>
            <div className="summary-stat">
              <span>Open exceptions</span>
              <strong>{reports.deliveryExceptions.filter((item) => item.status === "open").length}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Schedules</p>
              <h2>Deal report schedules</h2>
            </div>
          </div>
          <div className="stack">
            {reports.schedules.length > 0 ? (
              reports.schedules.map((schedule) => (
                <article key={schedule.id} className="mini-card">
                  <strong>{schedule.scheduleLabel}</strong>
                  <p>{schedule.notes}</p>
                  <p className="meta-note">
                    {schedule.cadence} · next run {schedule.nextRunAt.slice(0, 10)} · recipients{" "}
                    {schedule.recipients.length}
                  </p>
                </article>
              ))
            ) : (
              <p className="detail-copy">No deal-level schedules configured.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workflow</p>
              <h2>Approval and release queue</h2>
            </div>
          </div>
          <div className="stack">
            {pendingExports.length > 0 ? (
              pendingExports.map((reportExport) => (
                <article key={reportExport.id} className="mini-card">
                  <strong>{reportExport.title}</strong>
                  <p>{reportExport.summary}</p>
                  <p className="meta-note">
                    review {reportExport.reviewStatus} · release {reportExport.releaseStatus}
                  </p>
                  <div className="decision-row">
                    {permissions.canReviewReports && reportExport.reviewStatus === "pending_review" ? (
                      <form action={reviewDealReportExport}>
                        <input type="hidden" name="dealSlug" value={reports.dealSlug} />
                        <input type="hidden" name="exportId" value={reportExport.id} />
                        <button className="mini-button" type="submit">
                          Mark reviewed
                        </button>
                      </form>
                    ) : null}
                    {permissions.canApproveReports && reportExport.reviewStatus !== "approved" ? (
                      <form action={approveDealReportExport}>
                        <input type="hidden" name="dealSlug" value={reports.dealSlug} />
                        <input type="hidden" name="exportId" value={reportExport.id} />
                        <button className="mini-button" type="submit">
                          Approve
                        </button>
                      </form>
                    ) : null}
                    {permissions.canReleaseReports &&
                    reportExport.reviewStatus === "approved" &&
                    reportExport.releaseStatus !== "released" ? (
                      <form action={releaseDealReportExport}>
                        <input type="hidden" name="dealSlug" value={reports.dealSlug} />
                        <input type="hidden" name="exportId" value={reportExport.id} />
                        <button className="mini-button" type="submit">
                          Release
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p className="detail-copy">No deal exports are waiting for review or release.</p>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Monitoring export</p>
                <h2>Deal monitoring report</h2>
              </div>
            </div>
            <p className="detail-copy">
              Export the current TopSheet, latest approved period, risk posture,
              requests, distribution state, and recent activity.
            </p>
            {permissions.canGenerateReports ? (
              <form action={generateDealMonitoringReport} className="hero-actions">
                <input type="hidden" name="dealSlug" value={reports.dealSlug} />
                <button className="button primary" type="submit">
                  Generate monitoring report
                </button>
              </form>
            ) : (
              <p className="detail-copy">This viewer cannot generate deal monitoring reports.</p>
            )}
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Audit export</p>
                <h2>Deal activity / audit export</h2>
              </div>
            </div>
            <p className="detail-copy">
              Export the full deal timeline with before/after state summaries for
              audit, IC, or governance review.
            </p>
            {permissions.canGenerateReports ? (
              <form action={generateDealActivityAuditReport} className="hero-actions">
                <input type="hidden" name="dealSlug" value={reports.dealSlug} />
                <button className="button primary" type="submit">
                  Generate audit export
                </button>
              </form>
            ) : (
              <p className="detail-copy">This viewer cannot generate deal audit exports.</p>
            )}
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Runs</p>
              <h2>Recent generation jobs</h2>
            </div>
          </div>
          <div className="stack">
            {reports.generationRuns.length > 0 ? (
              reports.generationRuns.map((run) => (
                <article key={run.id} className="mini-card">
                  <strong>{run.triggerSummary}</strong>
                  <p className="meta-note">
                    {run.triggerMode} · {run.runStatus} · review {run.reviewStatus} · release{" "}
                    {run.releaseStatus}
                  </p>
                </article>
              ))
            ) : (
              <p className="detail-copy">No generation runs for this deal yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Delivery</p>
              <h2>Delivery log</h2>
            </div>
          </div>
          <div className="stack">
            {reports.deliveryLogs.length > 0 ? (
              reports.deliveryLogs.map((delivery) => (
                <article key={delivery.id} className="mini-card">
                  <strong>{delivery.title}</strong>
                  <p className="meta-note">
                    {delivery.recipientName} · {delivery.deliveryChannel} · {delivery.deliveryStatus}
                  </p>
                </article>
              ))
            ) : (
              <p className="detail-copy">No delivery records for this deal yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Exceptions</p>
              <h2>Delivery exceptions</h2>
            </div>
          </div>
          <div className="stack">
            {reports.deliveryExceptions.length > 0 ? (
              reports.deliveryExceptions.map((exception) => (
                <article key={exception.id} className="mini-card">
                  <strong>{exception.title}</strong>
                  <p>{exception.summary}</p>
                  <p className="meta-note">
                    {exception.severity} · {exception.status} · owner {exception.ownerName}
                  </p>
                </article>
              ))
            ) : (
              <p className="detail-copy">No delivery exceptions for this deal.</p>
            )}
          </div>
        </article>
      </section>

      <ReportExportList
        exports={reports.exports}
          emptyTitle="No deal exports generated yet"
          emptyCopy="Generate a monitoring report or an audit export to create a reusable external reporting artifact for this deal."
        />
      </main>
    );
  } catch {
    notFound();
  }
}
