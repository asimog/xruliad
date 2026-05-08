import type { ReactNode } from "react";

type UnifiedRouteShellProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  status?: ReactNode;
  children: ReactNode;
};

export function UnifiedRouteShell({
  eyebrow,
  title,
  subtitle,
  status,
  children,
}: UnifiedRouteShellProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle || status);

  return (
    <div className="ux-page">
      {hasHeader ? (
        <div className="ux-header-row">
          {eyebrow || title || subtitle ? (
            <div className="ux-header-copy">
              {eyebrow ? <p className="ux-eyebrow">{eyebrow}</p> : null}
              {title ? <h1 className="ux-title">{title}</h1> : null}
              {subtitle ? <p className="ux-subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          {status ? <div className="ux-header-status">{status}</div> : null}
        </div>
      ) : null}

      <section className="ux-panel">{children}</section>
    </div>
  );
}
