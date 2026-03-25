import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealRisk } from "../../../../api/risk";

function tone(value: string) {
  if (["high", "open"].includes(value)) return "critical";
  if (["medium", "monitoring"].includes(value)) return "warning";
  if (["low", "resolved"].includes(value)) return "good";
  return "neutral";
}

export default async function DealRiskPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealRisk(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Risk register</p>
            <h1>{data.dealName} risks</h1>
            <p className="hero-copy">
              Structured risk entries tie trend, compliance, and reconciliation
              exceptions into an owned monitoring record with mitigants and next
              review dates.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${data.dealSlug}/assessment`}>
                Assessment
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
                <span>Open risks</span>
                <strong>{data.summary.openRisks}</strong>
              </div>
              <div className="summary-stat">
                <span>High severity</span>
                <strong>{data.summary.highSeverityRisks}</strong>
              </div>
              <div className="summary-stat">
                <span>Next review</span>
                <strong>{data.summary.nextReviewDate ?? "TBD"}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="stack">
          {data.entries.map((entry) => (
            <article key={entry.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{entry.riskCategory.replaceAll("_", " ")}</p>
                  <h2>{entry.title}</h2>
                </div>
                <div className="tag-row">
                  <span className={`badge ${tone(entry.severity)}`}>{entry.severity}</span>
                  <span className={`badge ${tone(entry.status)}`}>
                    {entry.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
              <p>{entry.summary}</p>
              <dl className="topsheet-definition-grid">
                <div>
                  <dt>Probability / impact</dt>
                  <dd>
                    {entry.probability} / {entry.impact}
                  </dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{entry.ownerName}</dd>
                </div>
                <div>
                  <dt>Opened</dt>
                  <dd>{entry.openedAt.slice(0, 10)}</dd>
                </div>
                <div>
                  <dt>Next review</dt>
                  <dd>{entry.nextReviewDate}</dd>
                </div>
              </dl>
              <div className="mini-card">
                <strong>Mitigant</strong>
                <p>{entry.mitigant}</p>
                {entry.sourceDocument ? (
                  <p className="meta-note">
                    Source: {entry.sourceDocument.documentName}
                  </p>
                ) : null}
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
