import Link from "next/link";
import { getReports } from "../../api/reports";
import { ReportExportList } from "../../components/report-export-list";
import {
  approveReportExport,
  generateActivityAuditReport,
  generatePortfolioMonitoringReport,
  releaseReportExport,
  reviewReportExport,
  runDueReportSchedules
} from "./actions";

function buildScopeHref(scope: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();
  if (scope.organisation) params.set("organisation", scope.organisation);
  if (scope.owner) params.set("owner", scope.owner);
  if (scope.account) params.set("account", scope.account);
  return params.size > 0 ? `/portfolio?${params.toString()}` : "/portfolio";
}

function filterHref(filters: {
  organisation?: string;
  owner?: string;
  account?: string;
  sourceDomain?: string;
}) {
  const params = new URLSearchParams();
  if (filters.organisation) params.set("organisation", filters.organisation);
  if (filters.owner) params.set("owner", filters.owner);
  if (filters.account) params.set("account", filters.account);
  if (filters.sourceDomain && filters.sourceDomain !== "All domains") {
    params.set("sourceDomain", filters.sourceDomain);
  }
  return params.size > 0 ? `/reports?${params.toString()}` : "/reports";
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: Promise<{
    organisation?: string;
    owner?: string;
    account?: string;
    sourceDomain?: string;
  }>;
}) {
  const scope = searchParams ? await searchParams : undefined;
  const data = await getReports(scope);
  const permissions = data.viewer.permissions;
  const dueSchedules = data.schedules.filter(
    (item) => new Date(item.nextRunAt).getTime() <= Date.now()
  );
  const pendingExports = data.exports.filter(
    (item) => item.reviewStatus !== "approved" || item.releaseStatus !== "released"
  );

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>{data.scope.title}</h1>
          <p className="hero-copy">
            Generate reusable monitoring exports for portfolio oversight and audit
            review without leaving the current operating model.
          </p>
          <p className="meta-note">
            Viewer: {data.viewer.displayName} · {data.viewer.teamName}
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href={buildScopeHref(scope ?? {})}>
              Back to portfolio
            </Link>
            <Link className="button secondary" href="/activity">
              Open activity feed
            </Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Scope</span>
              <strong>{data.scope.level.replaceAll("_", " ")}</strong>
            </div>
            <div className="summary-stat">
              <span>Due schedules</span>
              <strong>{data.summary.dueSchedules}</strong>
            </div>
            <div className="summary-stat">
              <span>Pending approval</span>
              <strong>{data.summary.pendingApproval}</strong>
            </div>
            <div className="summary-stat">
              <span>Open exceptions</span>
              <strong>{data.summary.openExceptions}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Scheduler</p>
              <h2>Due schedules</h2>
            </div>
          </div>
          <p className="detail-copy">
            Run due report schedules to generate fresh exports and queue them for review.
          </p>
          {permissions.canGenerateReports ? (
            <form action={runDueReportSchedules} className="hero-actions">
              <button className="button primary" type="submit">
                Run due schedules
              </button>
            </form>
          ) : (
            <p className="detail-copy">This viewer cannot run scheduled report generation.</p>
          )}
          <div className="stack">
            {dueSchedules.length > 0 ? (
              dueSchedules.map((schedule) => (
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
              <p className="detail-copy">No schedules are currently due.</p>
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
                      <form action={reviewReportExport}>
                        <input type="hidden" name="exportId" value={reportExport.id} />
                        <button className="mini-button" type="submit">
                          Mark reviewed
                        </button>
                      </form>
                    ) : null}
                    {permissions.canApproveReports && reportExport.reviewStatus !== "approved" ? (
                      <form action={approveReportExport}>
                        <input type="hidden" name="exportId" value={reportExport.id} />
                        <button className="mini-button" type="submit">
                          Approve
                        </button>
                      </form>
                    ) : null}
                    {permissions.canReleaseReports &&
                    reportExport.reviewStatus === "approved" &&
                    reportExport.releaseStatus !== "released" ? (
                      <form action={releaseReportExport}>
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
              <p className="detail-copy">No exports are waiting for review or release.</p>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Portfolio export</p>
              <h2>Portfolio monitoring report</h2>
            </div>
          </div>
          <p className="detail-copy">
            Export scoped exposure, watchlist concentration, blocked distributions,
            high-severity risks, and recent material events.
          </p>
          {permissions.canGenerateReports ? (
            <form action={generatePortfolioMonitoringReport} className="hero-actions">
              <input type="hidden" name="organisation" value={scope?.organisation ?? ""} />
              <input type="hidden" name="owner" value={scope?.owner ?? ""} />
              <input type="hidden" name="account" value={scope?.account ?? ""} />
              <input type="hidden" name="organisationId" value={scope?.organisation ?? ""} />
              <input type="hidden" name="ownerId" value={scope?.owner ?? ""} />
              <input type="hidden" name="accountId" value={scope?.account ?? ""} />
              <button className="button primary" type="submit">
                Generate portfolio report
              </button>
            </form>
          ) : (
            <p className="detail-copy">This viewer cannot generate portfolio exports.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Audit export</p>
              <h2>Activity / audit export</h2>
            </div>
          </div>
          <p className="detail-copy">
            Export the scoped activity timeline with captured before/after state
            transitions for audit or governance review.
          </p>
          <div className="scope-breadcrumb">
            {data.sourceDomainOptions.map((option) => (
              <Link
                key={option}
                className={`scope-crumb ${option === data.selectedSourceDomain ? "active" : ""}`}
                href={filterHref({
                  organisation: scope?.organisation,
                  owner: scope?.owner,
                  account: scope?.account,
                  sourceDomain: option
                })}
              >
                {option}
              </Link>
            ))}
          </div>
          {permissions.canGenerateReports ? (
            <form action={generateActivityAuditReport} className="hero-actions">
              <input type="hidden" name="organisation" value={scope?.organisation ?? ""} />
              <input type="hidden" name="owner" value={scope?.owner ?? ""} />
              <input type="hidden" name="account" value={scope?.account ?? ""} />
              <input type="hidden" name="organisationId" value={scope?.organisation ?? ""} />
              <input type="hidden" name="ownerId" value={scope?.owner ?? ""} />
              <input type="hidden" name="accountId" value={scope?.account ?? ""} />
              <input type="hidden" name="sourceDomain" value={data.selectedSourceDomain === "All domains" ? "" : data.selectedSourceDomain} />
              <button className="button primary" type="submit">
                Generate activity export
              </button>
            </form>
          ) : (
            <p className="detail-copy">This viewer cannot generate activity audit exports.</p>
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
            {data.generationRuns.slice(0, 5).map((run) => (
              <article key={run.id} className="mini-card">
                <strong>{run.triggerSummary}</strong>
                <p className="meta-note">
                  {run.triggerMode} · {run.runStatus} · review {run.reviewStatus} · release{" "}
                  {run.releaseStatus}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Schedules</p>
              <h2>Distribution model</h2>
            </div>
          </div>
          <div className="stack">
            {data.schedules.map((schedule) => (
              <article key={schedule.id} className="mini-card">
                <strong>{schedule.scheduleLabel}</strong>
                <p>{schedule.notes}</p>
                <p className="meta-note">
                  {schedule.reportKind.replaceAll("_", " ")} · {schedule.cadence} · channel{" "}
                  {schedule.releaseChannel}
                </p>
                <p className="meta-note">
                  Recipients:{" "}
                  {schedule.recipients.map((recipient) => recipient.recipientName).join(", ") || "None"}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Delivery</p>
              <h2>Logs and exceptions</h2>
            </div>
          </div>
          <div className="stack">
            {data.deliveryLogs.slice(0, 5).map((delivery) => (
              <article key={delivery.id} className="mini-card">
                <strong>{delivery.title}</strong>
                <p className="meta-note">
                  {delivery.recipientName} · {delivery.deliveryChannel} · {delivery.deliveryStatus}
                </p>
              </article>
            ))}
            {data.deliveryExceptions.map((exception) => (
              <article key={exception.id} className="mini-card">
                <strong>{exception.title}</strong>
                <p>{exception.summary}</p>
                <p className="meta-note">
                  {exception.severity} · {exception.status} · owner {exception.ownerName}
                </p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <ReportExportList
        exports={data.exports}
        emptyTitle="No reports generated yet"
        emptyCopy="Generate a portfolio monitoring report or an activity / audit export to create a reusable external reporting artifact."
      />
    </main>
  );
}
