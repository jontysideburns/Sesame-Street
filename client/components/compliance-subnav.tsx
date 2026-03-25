"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/compliance", label: "Overview", exact: true },
  { href: "/compliance/calendar", label: "Calendar" },
  { href: "/compliance/obligations", label: "Obligations" },
  { href: "/compliance/inbox", label: "Incoming Documents" },
  { href: "/compliance/processing", label: "Processing State" },
  { href: "/compliance/fulfilments", label: "Fulfilments" },
  { href: "/compliance/exceptions", label: "Exceptions" },
  { href: "/compliance/alerts", label: "Alerts" },
  { href: "/compliance/review", label: "Review Queue" },
  { href: "/compliance/evidence", label: "Evidence" }
];

export function ComplianceSubnav() {
  const pathname = usePathname();

  return (
    <nav className="subnav" aria-label="Compliance sections">
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`subnav-link ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
