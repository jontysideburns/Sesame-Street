"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import type { ViewerDirectoryResponse } from "../api/entitlements";
import { VIEWER_COOKIE_NAME } from "../lib/viewer";

type NavItem = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
  icon: (className?: string) => ReactNode;
  requiredPermission?: string;
};

function GridIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function InboxIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5A1.5 1.5 0 0 1 6 6h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 18H6a1.5 1.5 0 0 1-1.5-1.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.5 13h3a1.5 1.5 0 0 0 3 0h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m10.5 11 1.5 1.5 1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4.5h6M9.5 3h5a1.5 1.5 0 0 1 1.5 1.5V6H8V4.5A1.5 1.5 0 0 1 9.5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 5.5H5.5A1.5 1.5 0 0 0 4 7v12a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V7a1.5 1.5 0 0 0-1.5-1.5H17" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 10h8M8 14h8M8 18h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FlowIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4" width="7" height="5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="15" width="7" height="5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 6.5h3a2 2 0 0 1 2 2V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15.5 12.5 17 15l1.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12.3 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.3c0 .7-.2 1.38-.57 1.97L5.5 15.5h13l-1.43-2.23a3.7 3.7 0 0 1-.57-1.97V9A4.5 4.5 0 0 0 12 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TimelineIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6.5h12M6 12h8M6 17.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
      <circle cx="6" cy="17.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ReportsIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 4.5V9h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 13.5h7M8.5 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.5 10h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EvidenceIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 4.5V9h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 12.5h7M8.5 16h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ConfigurationIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5A1.5 1.5 0 0 1 6 6h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 18H6a1.5 1.5 0 0 1-1.5-1.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 10.5h8M8 13.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 6V4.5M16 6V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4v7M6 15v5M12 4v3M12 11v9M18 4v11M18 19v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="6" cy="13" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function JpsIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="13" width="3.5" height="8" rx="1" fill="currentColor" opacity="0.5" />
      <rect x="8.5" y="9" width="3.5" height="12" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="14" y="5" width="3.5" height="16" rx="1" fill="currentColor" />
      <path d="M4.5 11 9 7.5l5 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlumbingIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 3v4a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 9h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M15 17H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 17H7a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="19" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function TodosIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9.5h8M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    </svg>
  );
}

function DotsIcon(className?: string) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

const primaryNavItems: NavItem[] = [
  {
    href: "/jps",
    label: "JPS",
    matches: (pathname) => pathname.startsWith("/jps"),
    icon: JpsIcon,
    requiredPermission: "canViewPortfolio"
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    matches: (pathname) => pathname.startsWith("/portfolio"),
    icon: GridIcon,
    requiredPermission: "canViewPortfolio"
  },
  {
    href: "/intake",
    label: "Intake",
    matches: (pathname) => pathname.startsWith("/intake"),
    icon: InboxIcon,
    requiredPermission: "canViewPortfolio"
  },
  {
    href: "/compliance",
    label: "Compliance",
    matches: (pathname) => pathname.startsWith("/compliance"),
    icon: ClipboardIcon
  },
  {
    href: "/review",
    label: "Review",
    matches: (pathname) => pathname.startsWith("/review"),
    icon: FlowIcon
  },
  {
    href: "/work",
    label: "Work",
    matches: (pathname) => pathname.startsWith("/work"),
    icon: CheckCircleIcon
  },
  {
    href: "/notifications",
    label: "Notifications",
    matches: (pathname) => pathname.startsWith("/notifications"),
    icon: BellIcon
  },
  {
    href: "/activity",
    label: "Activity",
    matches: (pathname) => pathname.startsWith("/activity") || pathname.includes("/activity"),
    icon: TimelineIcon,
    requiredPermission: "canViewActivity"
  },
  {
    href: "/reports",
    label: "Reports",
    matches: (pathname) => pathname.startsWith("/reports") || pathname.includes("/reports"),
    icon: ReportsIcon,
    requiredPermission: "canViewReports"
  },
  {
    href: "/evidence",
    label: "Evidence",
    matches: (pathname) => pathname.startsWith("/evidence"),
    icon: EvidenceIcon
  },
  {
    href: "/configuration",
    label: "Configuration",
    matches: (pathname) => pathname.startsWith("/configuration"),
    icon: ConfigurationIcon
  },
  {
    href: "/todos",
    label: "To Dos",
    matches: (pathname) => pathname.startsWith("/todos"),
    icon: TodosIcon
  }
];

const bottomNavItems: NavItem[] = [
  {
    href: "/plumbing",
    label: "Plumbing",
    matches: (pathname) => pathname.startsWith("/plumbing"),
    icon: PlumbingIcon
  },
  {
    href: "/miscellaneous",
    label: "Miscellaneous",
    matches: (pathname) => pathname.startsWith("/miscellaneous"),
    icon: DotsIcon
  },
  {
    href: "/setup",
    label: "Setup",
    matches: (pathname) => pathname.startsWith("/setup"),
    icon: SlidersIcon
  }
];

export function SidebarNav({
  viewerDirectory
}: {
  viewerDirectory: ViewerDirectoryResponse;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeViewerName, setActiveViewerName] = useState(
    viewerDirectory.activeViewer.displayName
  );

  function applyViewer(nextViewer: string) {
    document.cookie = `${VIEWER_COOKIE_NAME}=${encodeURIComponent(nextViewer)}; path=/; max-age=31536000; samesite=lax`;
    setActiveViewerName(nextViewer);
    router.refresh();
  }

  const activeViewer =
    viewerDirectory.viewers.find((viewer) => viewer.displayName === activeViewerName) ??
    viewerDirectory.viewers[0];
  const visiblePrimaryNavItems = primaryNavItems.filter((item) => {
    if (!item.requiredPermission) {
      return true;
    }
    return viewerDirectory.activeViewer.permissions[
      item.requiredPermission as keyof typeof viewerDirectory.activeViewer.permissions
    ];
  });

  return (
    <aside className="sidebar">
      <Link href="/home" className="sidebar-brand" aria-label="Open home">
        <span className="sidebar-brand-mark">SS</span>
        <span className="sidebar-brand-copy">
          <strong>Sesame Street</strong>
          <small>Credit monitoring</small>
        </span>
      </Link>

      <div className="sidebar-viewer">
        <label className="sidebar-viewer-label" htmlFor="viewer-switcher">
          Active viewer
        </label>
        <select
          id="viewer-switcher"
          className="sidebar-viewer-select"
          value={activeViewerName}
          onChange={(event) => applyViewer(event.target.value)}
        >
          {viewerDirectory.viewers.map((viewer) => (
            <option key={viewer.displayName} value={viewer.displayName}>
              {viewer.displayName}
            </option>
          ))}
        </select>
        <p className="sidebar-viewer-meta">
          {activeViewer?.teamName} · {activeViewer?.roleNames.join(", ")}
        </p>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {visiblePrimaryNavItems.map((item) => {
          const isActive = item.matches(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <span className="sidebar-icon-wrap">
                {item.icon("sidebar-icon")}
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <nav className="sidebar-nav sidebar-nav-bottom" aria-label="Secondary">
        {bottomNavItems.map((item) => {
          const isActive = item.matches(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <span className="sidebar-icon-wrap">
                {item.icon("sidebar-icon")}
              </span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
