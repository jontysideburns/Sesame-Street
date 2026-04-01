import Link from "next/link";
import { notFound } from "next/navigation";
import { getForecastCaseDetail } from "../../../../../api/forecasts";
import ForecastCharts from "./forecast-charts";

export default async function ForecastCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; caseId: string }>;
}) {
  const { slug, caseId } = await params;

  try {
    const data = await getForecastCaseDetail(slug, Number(caseId));
    const hasActuals = data.periodSeries.some((p) => p.actuals !== null);

    return (
      <main className="shell">
        <section className="hero">
          <div className="hero-body">
            <p className="section-eyebrow">
              <Link href={`/deals/${slug}/forecasts`} style={{ color: "inherit", textDecoration: "none" }}>
                Forecasts
              </Link>
              {" · "}{data.caseType.replace(/_/g, " ")}
            </p>
            <h1 className="hero-title">{data.caseName}</h1>
            <p className="hero-sub">{data.summary}</p>
          </div>
        </section>

        <section className="panel section-panel">
          <header className="panel-heading">
            <div>
              <p className="panel-eyebrow">
                {data.versionLabel} · {data.versionStatus}
                {data.drivesMonitoring ? " · drives monitoring" : ""}
              </p>
              <h2 className="panel-title">Forecast vs Actuals</h2>
            </div>
          </header>

          <ForecastCharts
            periodSeries={data.periodSeries}
            caseName={data.caseName}
            caseType={data.caseType}
            hasActuals={hasActuals}
          />
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
