import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealSnapshots } from "../../../../api/snapshots";
import { captureDealSnapshot, recomputeDealSnapshot } from "../../actions";

export default async function DealSnapshotsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealSnapshots(slug);
    const canCaptureSnapshots = data.viewer.permissions.canCaptureSnapshots;

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">TopSheet snapshots</p>
            <h1>{data.dealName} history</h1>
            <p className="hero-copy">
              Snapshots preserve what the TopSheet looked like at quarter-end,
              activation, or manual capture points so users can compare the
              current deal view to prior monitored states.
            </p>
            <p className="meta-note">
              Viewer: {data.viewer.displayName} · {data.viewer.teamName}
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Stored snapshots</span>
                <strong>{data.snapshots.length}</strong>
              </div>
            </div>
            {canCaptureSnapshots ? (
              <form action={captureDealSnapshot} className="stack compact-stack">
                <input type="hidden" name="dealSlug" value={data.dealSlug} />
                <input
                  type="hidden"
                  name="snapshotLabel"
                  value={`${data.dealName} manual snapshot`}
                />
                <input type="hidden" name="snapshotType" value="manual" />
                <input type="hidden" name="capturedBy" value="Snapshot history page" />
                <button className="button secondary" type="submit">
                  Capture new snapshot
                </button>
              </form>
            ) : (
              <p className="detail-copy">This viewer cannot capture snapshots.</p>
            )}
          </aside>
        </section>

        <section className="stack">
          {data.snapshots.map((snapshot) => (
            <article key={snapshot.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{snapshot.snapshotType.replaceAll("_", " ")}</p>
                  <h2>{snapshot.snapshotLabel}</h2>
                </div>
                <span className="badge neutral">{snapshot.capturedAt.slice(0, 10)}</span>
              </div>
              <p>{snapshot.summary}</p>
              <p className="meta-note">
                Hash: <code>{snapshot.payloadHash}</code>
              </p>
              <p className="meta-note">
                Trigger event: {snapshot.triggerEventId ?? "Not recorded"} · Prior snapshot:{" "}
                {snapshot.priorSnapshotId ?? "None"}
              </p>
              <dl className="topsheet-definition-grid">
                {Object.entries(snapshot.snapshotData).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                    <dd>
                      {Array.isArray(value)
                        ? value.join(" · ")
                        : typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="intake-section">
                <p className="eyebrow">Provenance</p>
                <div className="list-grid intake-timeline-grid">
                  {snapshot.provenance.map((item) => (
                    <article key={item.id} className="history-row intake-stage-event">
                      <div className="intake-inline-header">
                        <strong>{item.provenanceKind.replaceAll("_", " ")}</strong>
                        <span className="badge neutral">
                          {item.sourceEntityType.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="detail-copy">{item.sourceLabel}</p>
                      <p className="meta-note">
                        Event {item.sourceEventId ?? "—"} · {item.createdAt.slice(0, 10)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="intake-section">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Recomputation</p>
                    <h3>Integrity checks</h3>
                  </div>
                  {canCaptureSnapshots ? (
                    <form action={recomputeDealSnapshot}>
                      <input type="hidden" name="dealSlug" value={data.dealSlug} />
                      <input type="hidden" name="snapshotId" value={snapshot.id} />
                      <input type="hidden" name="recomputedBy" value={data.viewer.displayName} />
                      <button className="button secondary" type="submit">
                        Recompute snapshot
                      </button>
                    </form>
                  ) : null}
                </div>
                {snapshot.recomputations.length > 0 ? (
                  <div className="list-grid intake-timeline-grid">
                    {snapshot.recomputations.map((item) => (
                      <article key={item.id} className="history-row intake-stage-event">
                        <div className="intake-inline-header">
                          <strong>{item.recomputationStatus.replaceAll("_", " ")}</strong>
                          <span
                            className={`badge ${item.recomputationStatus === "matched" ? "good" : "warning"}`}
                          >
                            {item.recomputedBy}
                          </span>
                        </div>
                        <p className="detail-copy">{item.divergenceSummary}</p>
                        <p className="meta-note">
                          Expected {item.expectedHash} · Actual {item.actualHash}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="detail-copy">No recomputation checks recorded yet.</p>
                )}
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
