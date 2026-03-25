import { notFound } from "next/navigation";
import { getCovenantDetail } from "../../../../../api/deals";

function markerPosition(value: number, min: number, max: number) {
  return `${((value - min) / (max - min)) * 100}%`;
}

export default async function CovenantDetailPage({
  params
}: {
  params: Promise<{ slug: string; covenantId: string }>;
}) {
  const { slug, covenantId } = await params;

  try {
    const covenant = await getCovenantDetail(slug, covenantId);
    const min = Math.min(covenant.thresholdTrigger - 0.05, 1);
    const max = Math.max(covenant.currentValue + 0.15, covenant.thresholdLockup + 0.2);

    return (
      <main className="shell">
        <section className="hero compact">
          <div>
            <p className="eyebrow">Covenant drilldown</p>
            <h1>
              {covenant.dealName} · {covenant.name}
            </h1>
            <p className="hero-copy">{covenant.rationale}</p>
          </div>
          <div className="hero-card">
            <p>Current status</p>
            <h2>{covenant.currentValue.toFixed(2)}x</h2>
            <span className="badge warning">
              {covenant.headroomPct.toFixed(1)}% headroom
            </span>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Threshold ladder</p>
                <h2>Coverage against adverse tiers</h2>
              </div>
            </div>
            <div className="ladder">
              <div className="ladder-line" />
              <span
                className="ladder-point trigger"
                style={{ left: markerPosition(covenant.thresholdTrigger, min, max) }}
              >
                Trigger {covenant.thresholdTrigger.toFixed(2)}x
              </span>
              <span
                className="ladder-point lock"
                style={{ left: markerPosition(covenant.thresholdLockup, min, max) }}
              >
                Lock-up {covenant.thresholdLockup.toFixed(2)}x
              </span>
              <span
                className="ladder-point current"
                style={{ left: markerPosition(covenant.currentValue, min, max) }}
              >
                Current {covenant.currentValue.toFixed(2)}x
              </span>
            </div>
            <div className="component-grid">
              <div className="component-card">
                <span>{covenant.numeratorLabel}</span>
                <strong>${(covenant.numeratorValue / 1000000).toFixed(1)}m</strong>
              </div>
              <div className="component-card">
                <span>{covenant.denominatorLabel}</span>
                <strong>${(covenant.denominatorValue / 1000000).toFixed(1)}m</strong>
              </div>
              <div className="component-card">
                <span>Composition</span>
                <strong>{covenant.compositionTag}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2>Document citation</h2>
              </div>
            </div>
            <div className="document-card">
              <strong>Quarterly compliance certificate</strong>
              <p>Page {covenant.evidencePage}</p>
              <p>{covenant.evidenceSnippet}</p>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">History</p>
              <h2>Actual vs expected DSCR</h2>
            </div>
          </div>
          <div className="history-grid">
            {covenant.history.map((entry) => (
              <div key={entry.periodLabel} className="history-row">
                <strong>{entry.periodLabel}</strong>
                <span>{entry.value.toFixed(2)}x actual</span>
                <span>{entry.expectedValue.toFixed(2)}x expected</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
