import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealForecasts } from "../../../../api/forecasts";
import { activateForecastVersion } from "../../actions";

function formatMetricValue(metricKey: string, value: number) {
  if (metricKey === "seniorDscr") {
    return `${value.toFixed(2)}x`;
  }

  if (metricKey.endsWith("Pct")) {
    return `${value.toFixed(0)}%`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function tone(value: string) {
  if (["downside", "draft"].includes(value)) return "warning";
  if (["base", "active"].includes(value)) return "good";
  return "neutral";
}

export default async function DealForecastsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const data = await getDealForecasts(slug);

    return (
      <main className="shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Forecast cases</p>
            <h1>{data.dealName} scenarios</h1>
            <p className="hero-copy">
              Forecast cases hold the monitored base case, management
              reforecast, and downside comparators. Activating a new monitoring
              version refreshes the live expected metrics, variance analysis,
              assessment, and linked risk narrative.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${data.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${data.dealSlug}/periods/latest`}>
                Period view
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
                <span>Monitoring case</span>
                <strong>{data.summary?.activeMonitoringCaseName ?? "—"}</strong>
              </div>
              <div className="summary-stat">
                <span>Active version</span>
                <strong>{data.summary?.activeMonitoringVersionLabel ?? "—"}</strong>
              </div>
              <div className="summary-stat">
                <span>Last refresh</span>
                <strong>{data.summary?.latestRefreshAt?.slice(0, 10) ?? "—"}</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="stack">
          {data.cases.map((forecastCase) => (
            <article key={forecastCase.id} className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">{forecastCase.caseType}</p>
                  <h2>{forecastCase.caseName}</h2>
                </div>
                <div className="tag-row">
                  <span className={`badge ${tone(forecastCase.caseType)}`}>
                    {forecastCase.caseType}
                  </span>
                  {forecastCase.drivesMonitoring ? (
                    <span className="badge good">monitoring baseline</span>
                  ) : (
                    <span className="badge neutral">scenario only</span>
                  )}
                </div>
              </div>
              <p>{forecastCase.summary}</p>
              <Link
                className="mini-button subtle"
                href={`/deals/${slug}/forecasts/${forecastCase.id}`}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                View charts &rarr;
              </Link>
              <div className="stack compact-stack">
                {forecastCase.versions.map((version) => (
                  <div key={version.id} className="mini-card">
                    <div className="status-row">
                      <strong>{version.versionLabel}</strong>
                      <div className="tag-row">
                        <span className={`badge ${tone(version.versionStatus)}`}>
                          {version.versionStatus}
                        </span>
                        {version.isActive ? (
                          <span className="badge good">active</span>
                        ) : null}
                      </div>
                    </div>
                    <p>{version.summary}</p>
                    <p className="meta-note">
                      Effective {version.effectiveFrom} · source {version.sourceDomain.replaceAll("_", " ")}
                    </p>
                    {version.periods.map((period) => (
                      <div key={period.id} className="document-card">
                        <div className="status-row">
                          <strong>{period.periodLabel}</strong>
                          <span className="badge neutral">{period.periodKey}</span>
                        </div>
                        <p>{period.scenarioSummary}</p>
                        <dl className="topsheet-definition-grid">
                          {Object.entries(period.scenarioMetrics).map(([key, value]) => (
                            <div key={key}>
                              <dt>{key.replace(/([A-Z])/g, " $1").trim()}</dt>
                              <dd>{formatMetricValue(key, Number(value))}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                    {forecastCase.drivesMonitoring && !version.isActive ? (
                      <form action={activateForecastVersion}>
                        <input type="hidden" name="dealSlug" value={data.dealSlug} />
                        <input type="hidden" name="versionId" value={version.id} />
                        <input
                          type="hidden"
                          name="activatedBy"
                          value="PM - Forecast Workspace"
                        />
                        <button className="mini-button" type="submit">
                          Activate for monitoring
                        </button>
                      </form>
                    ) : null}
                    {version.refreshImpacts.length > 0 ? (
                      <div className="stack compact-stack">
                        {version.refreshImpacts.slice(0, 3).map((impact) => (
                          <div key={impact.id} className="document-card">
                            <div className="status-row">
                              <strong>{impact.impactType.replaceAll("_", " ")}</strong>
                              <span className="badge neutral">
                                {impact.recomputedAt.slice(0, 10)}
                              </span>
                            </div>
                            <p>{impact.impactSummary}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
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
