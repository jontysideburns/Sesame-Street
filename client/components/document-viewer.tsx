import type { ReactNode } from "react";

type DocumentViewerProps = {
  title: string;
  subtitle?: string | null;
  badges?: ReactNode;
  headerActions?: ReactNode;
  metadata: Array<{
    label: string;
    value: string;
  }>;
  sourcePath?: string | null;
  summary?: string | null;
  children?: ReactNode;
  actions?: ReactNode;
};

export function DocumentViewer({
  title,
  subtitle,
  badges,
  headerActions,
  metadata,
  sourcePath,
  summary,
  children,
  actions
}: DocumentViewerProps) {
  return (
    <article className="panel document-viewer">
      <div className="document-viewer-header">
        <div className="document-viewer-heading">
          <p className="eyebrow">Document viewer</p>
          <div className="document-viewer-title-row">
            <h3>{title}</h3>
          </div>
          {subtitle ? <p className="detail-copy">{subtitle}</p> : null}
          {headerActions ? <div className="document-viewer-header-actions">{headerActions}</div> : null}
        </div>
        {badges ? <div className="tag-row">{badges}</div> : null}
      </div>

      <div className="document-viewer-meta">
        {metadata.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {sourcePath ? (
        <p className="meta-note">
          Source path: <code>{sourcePath}</code>
        </p>
      ) : null}

      {summary ? (
        <div className="document-viewer-body">
          <p className="eyebrow">Processing summary</p>
          <p>{summary}</p>
        </div>
      ) : null}

      {children}

      {actions ? <div className="hero-actions">{actions}</div> : null}
    </article>
  );
}
