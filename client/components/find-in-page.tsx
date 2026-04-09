"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Browser-style in-page find. Binds Ctrl+F / Cmd+F across the whole app,
 * highlights matches using the CSS Custom Highlight API (no DOM mutation),
 * and supports Enter / Shift+Enter / Arrow buttons to navigate matches.
 *
 * The CSS Custom Highlight API is supported in Chrome 105+, Safari 17.2+,
 * and Firefox 140+. On unsupported browsers the component gracefully
 * degrades — the input still works but matches are not visually highlighted.
 */
export default function FindInPage() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CSSany = typeof window !== "undefined" ? (CSS as any) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const HighlightCtor = typeof window !== "undefined" ? (window as any).Highlight : null;
  const highlightsSupported = !!(CSSany?.highlights && HighlightCtor);

  const clearHighlights = useCallback(() => {
    if (!highlightsSupported) return;
    CSSany.highlights.delete("find-match");
    CSSany.highlights.delete("find-current");
  }, [CSSany, highlightsSupported]);

  const closeFind = useCallback(() => {
    setOpen(false);
    setQuery("");
    setMatches([]);
    setIdx(0);
    clearHighlights();
  }, [clearHighlights]);

  const scrollToRange = useCallback((range: Range) => {
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const targetY = window.scrollY + rect.top - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
  }, []);

  const setCurrentHighlight = useCallback(
    (range: Range) => {
      if (!highlightsSupported) return;
      CSSany.highlights.set("find-current", new HighlightCtor(range));
    },
    [CSSany, HighlightCtor, highlightsSupported]
  );

  const doFind = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q || q.length < 1) {
        setMatches([]);
        setIdx(0);
        clearHighlights();
        return;
      }

      const needle = q.toLowerCase();
      const ranges: Range[] = [];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest("#find-in-page-overlay"))
              return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (["script", "style", "noscript", "textarea"].includes(tag))
              return NodeFilter.FILTER_REJECT;
            // Skip non-visible elements (rough check)
            if (parent.getAttribute("aria-hidden") === "true")
              return NodeFilter.FILTER_REJECT;
            const text = node.textContent ?? "";
            if (!text || !text.toLowerCase().includes(needle))
              return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        const lower = text.toLowerCase();
        let start = 0;
        while (true) {
          const pos = lower.indexOf(needle, start);
          if (pos === -1) break;
          try {
            const range = document.createRange();
            range.setStart(node, pos);
            range.setEnd(node, pos + needle.length);
            ranges.push(range);
          } catch {
            // skip invalid ranges (detached nodes, etc.)
          }
          start = pos + needle.length;
        }
      }

      setMatches(ranges);
      setIdx(0);

      if (highlightsSupported) {
        if (ranges.length > 0) {
          CSSany.highlights.set("find-match", new HighlightCtor(...ranges));
          CSSany.highlights.set("find-current", new HighlightCtor(ranges[0]));
          scrollToRange(ranges[0]);
        } else {
          clearHighlights();
        }
      }
    },
    [CSSany, HighlightCtor, highlightsSupported, clearHighlights, scrollToRange]
  );

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (idx + 1) % matches.length;
    setIdx(next);
    setCurrentHighlight(matches[next]);
    scrollToRange(matches[next]);
  }, [idx, matches, scrollToRange, setCurrentHighlight]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (idx - 1 + matches.length) % matches.length;
    setIdx(prev);
    setCurrentHighlight(matches[prev]);
    scrollToRange(matches[prev]);
  }, [idx, matches, scrollToRange, setCurrentHighlight]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isFind =
        (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && !e.altKey;
      if (isFind) {
        e.preventDefault();
        setOpen(true);
        // focus after render
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closeFind();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeFind]);

  // Clean up highlights if the component unmounts while open
  useEffect(() => {
    return () => {
      clearHighlights();
    };
  }, [clearHighlights]);

  if (!open) return null;

  const total = matches.length;
  const counterText =
    total === 0 ? (query ? "No results" : "0") : `${idx + 1} of ${total}`;

  return (
    <div
      id="find-in-page-overlay"
      role="dialog"
      aria-label="Find in page"
      style={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid var(--line-strong, #d0d0d0)",
        background: "var(--panel, #ffffff)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
        fontSize: "0.82rem",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => doFind(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) goPrev();
            else goNext();
          }
        }}
        placeholder="Find in page…"
        aria-label="Search text"
        style={{
          width: 220,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid var(--line, #dcdcdc)",
          outline: "none",
          fontSize: "0.82rem",
        }}
      />
      <span
        aria-live="polite"
        style={{
          minWidth: 72,
          textAlign: "right",
          color: total === 0 ? "var(--critical, #c97f1f)" : "var(--ink-soft, #666)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {counterText}
      </span>
      <button
        onClick={goPrev}
        disabled={total === 0}
        aria-label="Previous match"
        title="Previous (Shift+Enter)"
        style={iconBtnStyle}
      >
        ↑
      </button>
      <button
        onClick={goNext}
        disabled={total === 0}
        aria-label="Next match"
        title="Next (Enter)"
        style={iconBtnStyle}
      >
        ↓
      </button>
      <button
        onClick={closeFind}
        aria-label="Close"
        title="Close (Esc)"
        style={{ ...iconBtnStyle, fontSize: "1rem" }}
      >
        ×
      </button>
    </div>
  );
}

const iconBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  padding: 0,
  borderRadius: 6,
  border: "1px solid var(--line, #dcdcdc)",
  background: "var(--panel, #ffffff)",
  cursor: "pointer",
  fontSize: "0.82rem",
  lineHeight: 1,
};
