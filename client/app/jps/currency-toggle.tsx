"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type Props = {
  current: "GBP" | "USD" | "EUR";
  fxAsOf?: string | null;
  fxSource?: string | null;
};

const SYMBOLS: Record<string, string> = { GBP: "\u00A3", USD: "$", EUR: "\u20AC" };

export default function CurrencyToggle({ current, fxAsOf, fxSource }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function setCurrency(ccy: "GBP" | "USD" | "EUR") {
    const params = new URLSearchParams(search?.toString() ?? "");
    if (ccy === "GBP") {
      params.delete("currency");
    } else {
      params.set("currency", ccy);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    try {
      window.localStorage.setItem("dashboard.reportingCurrency", ccy);
    } catch {
      // ignore — storage may be unavailable
    }
  }

  function btn(value: "GBP" | "USD" | "EUR") {
    const active = current === value;
    return (
      <button
        key={value}
        onClick={() => setCurrency(value)}
        style={{
          padding: "4px 12px",
          fontSize: "0.78rem",
          fontWeight: 700,
          border: "1px solid var(--line)",
          background: active ? "var(--accent)" : "var(--panel)",
          color: active ? "#fff" : "var(--ink-soft)",
          cursor: "pointer",
          borderRadius: 0,
        }}
        title={`Display all portfolio totals in ${value} (${SYMBOLS[value]})`}
      >
        {SYMBOLS[value]} {value}
      </button>
    );
  }

  const tooltip = fxAsOf
    ? `Spot FX as at ${fxAsOf}${fxSource ? ` (${fxSource})` : ""}. Deal-level views remain in native currency.`
    : "Portfolio aggregation converts to reporting currency at spot. Deal-level views remain in native currency.";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Reporting CCY
      </span>
      <div
        style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--line)" }}
        title={tooltip}
      >
        {btn("GBP")}
        {btn("USD")}
        {btn("EUR")}
      </div>
    </div>
  );
}
