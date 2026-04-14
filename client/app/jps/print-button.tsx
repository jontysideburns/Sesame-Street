"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: "4px 12px",
        fontSize: "0.78rem",
        fontWeight: 700,
        border: "1px solid var(--line)",
        borderRadius: 6,
        background: "var(--panel)",
        color: "var(--accent)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print
    </button>
  );
}
