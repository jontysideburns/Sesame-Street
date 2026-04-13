import { fetchJson } from "../../api/http";
import CalendarClient from "./calendar-client";

export const metadata = { title: "Deliverables Calendar — Sesame Street" };

export default async function CalendarPage() {
  let data: any = null;
  let holidays: any[] = [];
  let error = false;

  try {
    data = await fetchJson<any>("/api/portfolio/deliverables-calendar?months=12");
    holidays = data?.publicHolidays ?? [];
  } catch {
    error = true;
  }

  return (
    <main className="app-content">
      <header className="page-header">
        <h1>Deliverables Calendar</h1>
        <p className="page-subtitle">
          Covenant obligations and reporting deliverables across the portfolio.
          {data && ` ${data.deliverableCount} deliverables across ${data.dealCount} deals.`}
        </p>
      </header>

      {error ? (
        <article className="topsheet-note topsheet-note-info">
          <strong>No deliverables data</strong>
          <p>No deals have obligations configured yet. Add obligations via the TopSheet template (Tab 21) to populate this calendar.</p>
        </article>
      ) : (
        <CalendarClient
          deliverables={data?.deliverables ?? []}
          holidays={holidays}
        />
      )}
    </main>
  );
}
