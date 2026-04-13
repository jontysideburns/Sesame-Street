"use client";

import { useState, useMemo } from "react";

type Deliverable = {
  dealSlug?: string;
  dealName?: string;
  sector?: string;
  obligationId: string;
  title: string;
  periodLabel: string;
  dueDate: string;
  graceExpiry: string;
  severity: string;
  responsibleParty: string;
  status: string;
};

type Holiday = {
  date: string;
  name: string;
  jurisdiction: string;
};

type Props = {
  deliverables: Deliverable[];
  holidays: Holiday[];
};

const STATUS_TONE: Record<string, string> = {
  overdue: "critical",
  late_within_grace: "warning",
  approaching: "warning",
  not_yet_due: "neutral",
  delivered: "good",
};

const STATUS_LABEL: Record<string, string> = {
  overdue: "Overdue",
  late_within_grace: "In Grace",
  approaching: "Approaching",
  not_yet_due: "Upcoming",
  delivered: "Delivered",
};

const SEVERITY_TONE: Record<string, string> = {
  event_of_default: "critical",
  potential_default: "warning",
  informational: "neutral",
};

export default function CalendarClient({ deliverables, holidays }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState("");

  const holidaySet = useMemo(() => {
    const s = new Map<string, string[]>();
    for (const h of holidays) {
      const existing = s.get(h.date) || [];
      existing.push(`${h.name} (${h.jurisdiction})`);
      s.set(h.date, existing);
    }
    return s;
  }, [holidays]);

  const filtered = useMemo(() => {
    if (!filter) return deliverables;
    const lc = filter.toLowerCase();
    return deliverables.filter(
      (d) =>
        (d.dealName ?? "").toLowerCase().includes(lc) ||
        d.title.toLowerCase().includes(lc) ||
        d.obligationId.toLowerCase().includes(lc) ||
        (d.sector ?? "").toLowerCase().includes(lc)
    );
  }, [deliverables, filter]);

  // Group by month for calendar view
  const byMonth = useMemo(() => {
    const map = new Map<string, Deliverable[]>();
    for (const d of filtered) {
      const month = d.dueDate.slice(0, 7); // YYYY-MM
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(d);
    }
    return map;
  }, [filtered]);

  // Overdue count
  const overdueCount = filtered.filter((d) => d.status === "overdue").length;
  const approachingCount = filtered.filter((d) => d.status === "approaching").length;

  const td: React.CSSProperties = { padding: "6px 10px", fontSize: "0.78rem", borderBottom: "1px solid var(--line)" };
  const thStyle: React.CSSProperties = { ...td, fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)", background: "var(--accent-soft)" };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--panel-strong)", borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "none", fontSize: "0.78rem", fontWeight: 600,
              background: view === "list" ? "var(--accent)" : "transparent",
              color: view === "list" ? "white" : "var(--ink-soft)", cursor: "pointer",
            }}
          >List</button>
          <button
            onClick={() => setView("calendar")}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "none", fontSize: "0.78rem", fontWeight: 600,
              background: view === "calendar" ? "var(--accent)" : "transparent",
              color: view === "calendar" ? "white" : "var(--ink-soft)", cursor: "pointer",
            }}
          >Calendar</button>
        </div>

        <input
          type="text"
          placeholder="Search deals, obligations..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid var(--line)",
            fontSize: "0.8rem", width: 260, background: "var(--panel)",
          }}
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: "0.78rem" }}>
          {overdueCount > 0 && (
            <span className="badge critical badge-sm">{overdueCount} overdue</span>
          )}
          {approachingCount > 0 && (
            <span className="badge warning badge-sm">{approachingCount} approaching</span>
          )}
          <span className="badge neutral badge-sm">{filtered.length} total</span>
        </div>
      </div>

      {/* List view */}
      {view === "list" && (
        <div style={{ borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Due Date</th>
                <th style={thStyle}>Deal</th>
                <th style={thStyle}>Obligation</th>
                <th style={thStyle}>Period</th>
                <th style={thStyle}>Responsible</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Grace Expiry</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "var(--ink-soft)", padding: 24 }}>No deliverables to show. Configure obligations on deals via the TopSheet template.</td></tr>
              ) : (
                filtered.map((d, i) => {
                  const isHoliday = holidaySet.has(d.dueDate);
                  return (
                    <tr key={i} style={{ background: d.status === "overdue" ? "rgba(214,84,84,0.06)" : undefined }}>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 600 }}>
                        {d.dueDate}
                        {isHoliday && <span title={holidaySet.get(d.dueDate)?.join(", ")} style={{ marginLeft: 4, fontSize: "0.65rem", color: "#c97f1f" }}>H</span>}
                      </td>
                      <td style={td}>
                        {d.dealName ? (
                          <a href={`/deals/${d.dealSlug}`} style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>{d.dealName}</a>
                        ) : "\u2014"}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 600 }}>{d.obligationId}</span>
                        <span style={{ color: "var(--ink-soft)", marginLeft: 6 }}>{d.title}</span>
                      </td>
                      <td style={{ ...td, fontSize: "0.72rem" }}>{d.periodLabel}</td>
                      <td style={{ ...td, fontSize: "0.72rem" }}>{d.responsibleParty}</td>
                      <td style={td}>
                        <span className={`badge ${SEVERITY_TONE[d.severity] ?? "neutral"} badge-sm`}>{d.severity.replace(/_/g, " ")}</span>
                      </td>
                      <td style={td}>
                        <span className={`badge ${STATUS_TONE[d.status] ?? "neutral"} badge-sm`}>{STATUS_LABEL[d.status] ?? d.status}</span>
                      </td>
                      <td style={{ ...td, fontFamily: "monospace", fontSize: "0.72rem" }}>{d.graceExpiry}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Array.from(byMonth.entries()).map(([month, items]) => {
            const [y, m] = month.split("-").map(Number);
            const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
            const daysInMonth = new Date(y, m, 0).getDate();
            const firstDow = new Date(y, m - 1, 1).getDay(); // 0=Sun

            // Build grid cells
            const cells: { day: number; isMonth: boolean }[] = [];
            // Padding for start of month
            for (let i = 0; i < (firstDow === 0 ? 6 : firstDow - 1); i++) {
              cells.push({ day: 0, isMonth: false });
            }
            for (let d = 1; d <= daysInMonth; d++) {
              cells.push({ day: d, isMonth: true });
            }

            // Group deliverables by day
            const itemsByDay = new Map<number, Deliverable[]>();
            for (const item of items) {
              const day = parseInt(item.dueDate.split("-")[2]);
              if (!itemsByDay.has(day)) itemsByDay.set(day, []);
              itemsByDay.get(day)!.push(item);
            }

            return (
              <div key={month} style={{ borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: "var(--accent)", color: "white", fontWeight: 700, fontSize: "0.9rem" }}>
                  {monthName} <span style={{ fontWeight: 400, fontSize: "0.75rem", opacity: 0.8 }}>({items.length} deliverable{items.length !== 1 ? "s" : ""})</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--line)", padding: 1 }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} style={{ background: "var(--accent-soft)", padding: "4px 6px", fontSize: "0.65rem", fontWeight: 700, textAlign: "center", color: "var(--ink-soft)" }}>{d}</div>
                  ))}
                  {cells.map((cell, ci) => {
                    if (!cell.isMonth) return <div key={ci} style={{ background: "var(--panel)", minHeight: 48 }} />;
                    const dateStr = `${month}-${String(cell.day).padStart(2, "0")}`;
                    const dayItems = itemsByDay.get(cell.day) || [];
                    const hols = holidaySet.get(dateStr);
                    const isWeekend = new Date(y, m - 1, cell.day).getDay() === 0 || new Date(y, m - 1, cell.day).getDay() === 6;

                    return (
                      <div
                        key={ci}
                        style={{
                          background: hols ? "#fff9c4" : isWeekend ? "#f5f5f5" : "var(--panel)",
                          minHeight: 48, padding: "3px 5px", position: "relative",
                        }}
                        title={hols ? hols.join(", ") : undefined}
                      >
                        <div style={{ fontSize: "0.65rem", fontWeight: 600, color: isWeekend ? "#999" : "var(--ink)" }}>{cell.day}</div>
                        {hols && <div style={{ fontSize: "0.55rem", color: "#c97f1f", lineHeight: 1.2 }}>{hols[0].split(" (")[0]}</div>}
                        {dayItems.map((item, ii) => (
                          <div
                            key={ii}
                            style={{
                              width: 8, height: 8, borderRadius: "50%", display: "inline-block", marginRight: 2,
                              background: item.status === "overdue" ? "#d65454" : item.status === "approaching" ? "#c97f1f" : item.status === "delivered" ? "#4caf50" : "#bbb",
                            }}
                            title={`${item.dealName ?? item.obligationId}: ${item.title} (${item.status})`}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {byMonth.size === 0 && (
            <article className="topsheet-note topsheet-note-info">
              <strong>No deliverables in the selected window</strong>
              <p>No obligations are configured for deals in this portfolio. Add obligations via the TopSheet template (Tab 21).</p>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
