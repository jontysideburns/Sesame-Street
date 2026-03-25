import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealAmendments } from "../../../../api/amendments";

function tone(value: string) {
  if (["declined", "blocked", "critical"].includes(value)) return "critical";
  if (["active", "warning", "review_required"].includes(value)) return "warning";
  if (["approved", "resolved", "good"].includes(value)) return "good";
  return "neutral";
}

function formatStateValue(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(" · ");
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  return String(value).replaceAll("_", " ");
}

export default async function DealAmendmentsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealAmendments(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Term change management</p>
            <h1>{data.dealName} amendments</h1>
            <p className="hero-copy">
              Amendments preserve the legal change history for waivers and
              consents, the effective-dated rule versions they activated, and
              the downstream objects that were recomputed when the change took
              effect.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${data.dealSlug}/requests`}>
                Borrower requests
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Deal grade</span>
                <strong>{data.dealGrade}</strong>
              </div>
              <div className="summary-stat">
                <span>Active amendments</span>
                <strong>{data.summary.activeAmendments}</strong>
              </div>
              <div className="summary-stat">
                <span>Active rule versions</span>
                <strong>{data.summary.activeRuleVersions}</strong>
              </div>
              <div className="summary-stat">
                <span>Latest effective date</span>
                <strong>{data.summary.latestEffectiveDate ?? "—"}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span>Total amendments</span>
            <strong>{data.summary.totalAmendments}</strong>
          </article>
          <article className="metric-card">
            <span>Recomputed objects</span>
            <strong>{data.summary.recomputedObjects}</strong>
          </article>
          <article className="metric-card">
            <span>Active amendments</span>
            <strong>{data.summary.activeAmendments}</strong>
          </article>
          <article className="metric-card">
            <span>Current posture</span>
            <strong>Rule versioned</strong>
          </article>
        </section>

        <section className="stack">
          {data.amendments.map((amendment) => (
            <article key={amendment.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{amendment.amendmentType.replaceAll("_", " ")}</p>
                  <h2>{amendment.title}</h2>
                </div>
                <div className="tag-row">
                  <span className={`badge ${tone(amendment.amendmentStatus)}`}>
                    {amendment.amendmentStatus.replaceAll("_", " ")}
                  </span>
                  <span className="badge neutral">{amendment.sourceDomain.replaceAll("_", " ")}</span>
                </div>
              </div>
              <p>{amendment.summary}</p>
              <dl className="topsheet-definition-grid">
                <div>
                  <dt>Effective from</dt>
                  <dd>{amendment.effectiveFrom}</dd>
                </div>
                <div>
                  <dt>Effective to</dt>
                  <dd>{amendment.effectiveTo ?? "Open ended"}</dd>
                </div>
                <div>
                  <dt>Created by</dt>
                  <dd>{amendment.createdBy}</dd>
                </div>
                <div>
                  <dt>Created at</dt>
                  <dd>{amendment.createdAt.slice(0, 10)}</dd>
                </div>
              </dl>

              <div className="content-grid">
                <article className="mini-card">
                  <div className="status-row">
                    <strong>Rule versions</strong>
                    <span className="badge neutral">{amendment.ruleVersions.length}</span>
                  </div>
                  <div className="stack compact-stack">
                    {amendment.ruleVersions.length > 0 ? (
                      amendment.ruleVersions.map((version) => (
                        <div key={version.id} className="document-card">
                          <div className="status-row">
                            <strong>{version.targetLabel}</strong>
                            <span className={`badge ${version.isActive ? "warning" : "neutral"}`}>
                              {version.isActive ? "active" : "inactive"}
                            </span>
                          </div>
                          <p>
                            {version.ruleDomain.replaceAll("_", " ")} ·{" "}
                            {version.ruleType.replaceAll("_", " ")}
                          </p>
                          <p>{version.changeSummary}</p>
                          <p className="meta-note">
                            {version.versionLabel} · effective {version.effectiveFrom}
                            {version.effectiveTo ? ` to ${version.effectiveTo}` : ""}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="detail-copy">
                        No live rule version was activated from this request.
                      </p>
                    )}
                  </div>
                </article>

                <article className="mini-card">
                  <div className="status-row">
                    <strong>Change impact</strong>
                    <span className="badge neutral">{amendment.changeImpacts.length}</span>
                  </div>
                  <div className="stack compact-stack">
                    {amendment.changeImpacts.map((impact) => (
                      <div key={impact.id} className="document-card">
                        <div className="status-row">
                          <strong>{impact.targetLabel}</strong>
                          <span className="badge neutral">
                            {impact.impactType.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p>{impact.impactSummary}</p>
                        <dl className="topsheet-definition-grid">
                          {Object.entries(impact.afterState)
                            .slice(0, 4)
                            .map(([key, value]) => (
                              <div key={key}>
                                <dt>{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                                <dd>{formatStateValue(value)}</dd>
                              </div>
                            ))}
                        </dl>
                        <p className="meta-note">
                          Recomputed {impact.recomputedAt.slice(0, 10)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </article>
          ))}
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
