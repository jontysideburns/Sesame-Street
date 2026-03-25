import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import Script from "next/script";
import { SidebarNav } from "../components/sidebar-nav";
import { getViewerDirectory } from "../api/entitlements";
import { getUiConfigBootstrapScript } from "../lib/ux-config";

export const metadata: Metadata = {
  title: "Sesame Street Demo",
  description: "Private markets debt monitoring platform investor demo"
};

export default async function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  const uiConfigScript = getUiConfigBootstrapScript();
  const viewerDirectory = await getViewerDirectory();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-script" strategy="beforeInteractive">
          {uiConfigScript}
        </Script>
      </head>
      <body>
        <div className="app-layout">
          <SidebarNav viewerDirectory={viewerDirectory} />
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
