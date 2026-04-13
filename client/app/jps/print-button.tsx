"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        marginTop: 10, padding: "6px 16px", borderRadius: 8,
        border: "1px solid var(--line-strong)", background: "var(--panel)",
        cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
        color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"/>
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Print
    </button>
  );
}
