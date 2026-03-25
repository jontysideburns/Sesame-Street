import type { MemoPack } from "../api/packs";

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function toneForPackKind(value: string) {
  if (value.includes("watchlist")) return "critical";
  if (value.includes("decision")) return "warning";
  return "good";
}

export function MemoPackList({
  packs,
  emptyTitle,
  emptyCopy
}: {
  packs: MemoPack[];
  emptyTitle: string;
  emptyCopy: string;
}) {
  if (packs.length === 0) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Memo packs</p>
            <h2>{emptyTitle}</h2>
          </div>
        </div>
        <p className="detail-copy">{emptyCopy}</p>
      </section>
    );
  }

  return (
    <section className="stack">
      {packs.map((pack) => (
        <article key={pack.id} className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{formatLabel(pack.packScope)}</p>
              <h2>{pack.title}</h2>
              <p className="hero-copy">{pack.summary}</p>
            </div>
            <div className="tag-row">
              <span className={`badge ${toneForPackKind(pack.packKind)}`}>
                {formatLabel(pack.packKind)}
              </span>
              <span className="badge neutral">{pack.packStatus}</span>
            </div>
          </div>

          <div className="summary-grid memo-pack-meta-grid">
            <div className="mini-card">
              <strong>Generated</strong>
              <p>
                {formatDate(pack.generatedAt)} by {pack.generatedBy}
              </p>
            </div>
            <div className="mini-card">
              <strong>Context</strong>
              <p>
                {pack.dealName ?? pack.borrowerRequestTitle ?? pack.organisationName ?? "Portfolio"}
              </p>
            </div>
          </div>

          <div className="memo-pack-sections">
            {pack.sections.map((section) => (
              <article key={section.id} className="mini-card">
                <div className="status-row">
                  <strong>{section.sectionTitle}</strong>
                  <span>{section.sectionKey.replaceAll("_", " ")}</span>
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
