import Link from "next/link";
import type { ReactNode } from "react";
export function Icon({ name }: { name: string }) {
  return (
    <span
      className="icon"
      aria-hidden="true"
      style={{
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskImage: `url(/icons/${name}.svg)`,
      }}
    />
  );
}
export function Heading({
  title,
  subtitle,
  action,
  back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  back?: string;
}) {
  return (
    <header className="page-heading">
      <div className="row">
        {back && (
          <Link href={back} className="icon-button" aria-label="Go back">
            <Icon name="arrow-left" />
          </Link>
        )}
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Icon name="book-open" />
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  );
}
export function State({
  resource,
}: {
  resource: {
    loading: boolean;
    error: string | null;
    data: unknown;
    refresh: () => void;
  };
}) {
  if (resource.error)
    return (
      <div>
        <Notice error>{resource.error}</Notice>
        <button onClick={resource.refresh}>Try again</button>
      </div>
    );
  if (resource.loading && !resource.data)
    return (
      <div role="status" aria-label="Loading" className="stack">
        <div className="skeleton" />
        <div className="skeleton" />
        <span className="muted">Loading…</span>
      </div>
    );
  return null;
}
export function RowLink({
  href,
  title,
  detail,
  icon = "book-open",
  tag,
}: {
  href: string;
  title: string;
  detail?: string;
  icon?: string;
  tag?: string;
}) {
  return (
    <Link className="item-row" href={href}>
      <span className="content-icon">
        <Icon name={icon} />
      </span>
      <span className="grow">
        {tag && <span className="badge">{tag}</span>}
        <strong>{title}</strong>
        {detail && <span className="meta">{detail}</span>}
      </span>
      <Icon name="chevron-right" />
    </Link>
  );
}
