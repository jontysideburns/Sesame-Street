"use client";

import { useState } from "react";

type Memo = {
  id: number;
  text: string;
  createdAt: string;
  done: boolean;
};

const INITIAL_MEMOS: Memo[] = [
  {
    id: 1,
    text: "JPS to review/construct a reserve account architecture to allow the monitoring of reserve account balances.",
    createdAt: "2026-04-01",
    done: false,
  },
];

export default function TodosMemoBoard() {
  const [memos, setMemos] = useState<Memo[]>(INITIAL_MEMOS);
  const [draft, setDraft] = useState("");

  function addMemo() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setMemos((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: trimmed,
        createdAt: new Date().toISOString().slice(0, 10),
        done: false,
      },
    ]);
    setDraft("");
  }

  function toggleDone(id: number) {
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, done: !m.done } : m))
    );
  }

  function removeMemo(id: number) {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  }

  const pending = memos.filter((m) => !m.done);
  const completed = memos.filter((m) => m.done);

  return (
    <section className="panel section-panel">
      <header className="panel-heading">
        <div>
          <p className="panel-eyebrow">{pending.length} open</p>
          <h2 className="panel-title">Memo Board</h2>
        </div>
      </header>

      {/* Add new memo */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "16px 0",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <input
          type="text"
          placeholder="Add a new memo..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addMemo();
          }}
          style={{
            flex: 1,
            padding: "0.6rem 0.8rem",
            borderRadius: 12,
            border: "1px solid var(--line-strong)",
            background: "var(--panel-strong)",
            color: "var(--ink)",
            fontSize: "0.85rem",
          }}
        />
        <button className="mini-button primary" onClick={addMemo}>
          Add
        </button>
      </div>

      {/* Pending memos */}
      <div style={{ marginTop: 16 }}>
        {pending.length === 0 && (
          <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", padding: "12px 0" }}>
            No open memos. Add one above.
          </p>
        )}
        {pending.map((memo) => (
          <div
            key={memo.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <button
              onClick={() => toggleDone(memo.id)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: "2px solid var(--accent)",
                background: "transparent",
                cursor: "pointer",
                flexShrink: 0,
                marginTop: 2,
              }}
              title="Mark as done"
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.88rem", lineHeight: 1.5, margin: 0 }}>{memo.text}</p>
              <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", margin: "4px 0 0" }}>
                Added {memo.createdAt}
              </p>
            </div>
            <button
              onClick={() => removeMemo(memo.id)}
              className="mini-button subtle"
              style={{ fontSize: "0.72rem", flexShrink: 0 }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Completed memos */}
      {completed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-soft)",
              marginBottom: 8,
            }}
          >
            Completed ({completed.length})
          </h3>
          {completed.map((memo) => (
            <div
              key={memo.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                opacity: 0.55,
              }}
            >
              <button
                onClick={() => toggleDone(memo.id)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: "2px solid var(--good)",
                  background: "var(--good)",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
                title="Mark as not done"
              >
                &#10003;
              </button>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "0.88rem",
                    lineHeight: 1.5,
                    margin: 0,
                    textDecoration: "line-through",
                  }}
                >
                  {memo.text}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", margin: "4px 0 0" }}>
                  Added {memo.createdAt}
                </p>
              </div>
              <button
                onClick={() => removeMemo(memo.id)}
                className="mini-button subtle"
                style={{ fontSize: "0.72rem", flexShrink: 0 }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
