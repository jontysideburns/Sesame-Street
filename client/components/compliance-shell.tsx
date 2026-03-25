import type { ReactNode } from "react";
import { ComplianceSubnav } from "./compliance-subnav";

type ComplianceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
};

export function ComplianceShell({
  eyebrow,
  title,
  description,
  aside,
  children
}: ComplianceShellProps) {
  return (
    <main className="shell">
      <ComplianceSubnav />

      <section className="hero">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-copy">{description}</p>
        </div>
        {aside ? aside : <div />}
      </section>
      {children}
    </main>
  );
}
