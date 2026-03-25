import Link from "next/link";
import { getPortfolioCalendar } from "../../api/calendar";
import { updateDemoClock } from "./actions";

export default async function MiscellaneousPage() {
  const calendar = await getPortfolioCalendar();

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Miscellaneous</p>
          <h1>Demo controls and cross-workspace utilities.</h1>
          <p className="hero-copy">
            Use this workspace for demo-level controls that should not live in
            core configuration, including the simulated operating clock.
          </p>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Demo date</span>
          <strong>{calendar.demoClock.currentDemoDate}</strong>
          <small>{calendar.demoClock.clockLabel}</small>
        </article>
        <article className="metric-card">
          <span>Active cycles</span>
          <strong>{calendar.summary.activeCycles}</strong>
        </article>
        <article className="metric-card">
          <span>Blocked cycles</span>
          <strong>{calendar.summary.blockedCycles}</strong>
        </article>
        <article className="metric-card">
          <span>Ready for release</span>
          <strong>{calendar.summary.readyForRelease}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Demo clock</p>
              <h2>Operating date and cycle posture</h2>
            </div>
            <Link className="text-link" href="/portfolio/calendar">
              Portfolio calendar
            </Link>
          </div>
          <form className="onboarding-form" action={updateDemoClock}>
            <div className="form-grid">
              <label className="field">
                <span>Current demo date</span>
                <input
                  name="currentDemoDate"
                  type="date"
                  defaultValue={calendar.demoClock.currentDemoDate}
                  required
                />
              </label>
              <label className="field">
                <span>Clock label</span>
                <input
                  name="clockLabel"
                  defaultValue={calendar.demoClock.clockLabel}
                  required
                />
              </label>
              <label className="field">
                <span>Updated by</span>
                <input
                  name="updatedBy"
                  defaultValue={calendar.viewer.displayName}
                  required
                />
              </label>
              <div className="mini-card">
                <strong>Last update</strong>
                <p>
                  {calendar.demoClock.updatedAt.slice(0, 10)} by{" "}
                  {calendar.demoClock.updatedBy}
                </p>
              </div>
            </div>
            <div className="form-actions">
              <button className="button primary" type="submit">
                Update demo clock
              </button>
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Cycle alerts</p>
              <h2>What the new date will affect</h2>
            </div>
          </div>
          <div className="stack">
            {calendar.cycleAlerts.map((alert) => (
              <Link
                key={alert.id}
                className="mini-card"
                href={`/deals/${alert.dealSlug}/calendar`}
              >
                <div className="status-row">
                  <strong>{alert.dealName}</strong>
                  <span className={`badge ${alert.priority === "high" ? "critical" : "warning"}`}>
                    {alert.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p>{alert.title}</p>
                <p className="meta-note">{alert.summary}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
