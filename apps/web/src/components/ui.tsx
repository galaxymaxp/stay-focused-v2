import Link from "next/link";
import type { ReactNode } from "react";
import { BookLoader } from "./brand";
import { PageCrumb, type Crumb } from "./crumbs";
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
  crumb,
  parent,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Mobile back target; desktop uses the top-bar breadcrumb instead. */
  back?: string;
  /** Breadcrumb label when it should differ from the title; null when a
   * nested view reports the trail instead. */
  crumb?: string | null;
  /** Breadcrumb level between the section and this page. */
  parent?: Crumb;
}) {
  return (
    <header className="page-heading">
      {crumb !== null && (
        <PageCrumb parent={parent} current={crumb ?? (title || undefined)} />
      )}
      <div className="row">
        {back && (
          <Link
            href={back}
            className="icon-button back-button"
            aria-label="Go back"
          >
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
type Loadable = {
  loading: boolean;
  error: string | null;
  data: unknown;
  refresh: () => void;
};
/** One loader or error for a screen, however many requests it waits on. */
export function State({ resource }: { resource: Loadable | readonly Loadable[] }) {
  const all = Array.isArray(resource) ? resource : [resource as Loadable];
  const failed = all.find((r) => r.error);
  if (failed)
    return (
      <div>
        <Notice error>{failed.error}</Notice>
        <button onClick={() => all.forEach((r) => r.error && r.refresh())}>Try again</button>
      </div>
    );
  if (all.some((r) => r.loading && !r.data)) return <BookLoader />;
  return null;
}
/**
 * Content identity, as the app's ContentIcon: Reviewers, Quizzes, Drafts,
 * tasks and material kinds each keep one icon and one color everywhere.
 */
export function contentTone(kind: string) {
  return kind === "pdf"
    ? "red"
    : kind === "slides"
      ? "orange"
      : kind === "quiz" || kind === "quiz_generation"
        ? "violet"
        : kind === "activity_output" || kind === "activity_generation"
          ? "green"
          : "blue";
}
export function contentIconName(kind: string) {
  return kind === "slides"
    ? "presentation"
    : kind === "quiz" || kind === "quiz_generation"
      ? "file-question-mark"
      : kind === "reviewer" || kind === "reviewer_generation"
        ? "book-open"
        : kind === "activity_output" || kind === "activity_generation" || kind === "task"
          ? "clipboard-list"
          : kind === "page"
            ? "globe"
            : "file-text";
}
export function ContentIcon({ kind, small = false }: { kind: string; small?: boolean }) {
  return (
    <span className={`content-icon tone-${contentTone(kind)}${small ? " small" : ""}`} aria-hidden="true">
      <Icon name={contentIconName(kind)} />
    </span>
  );
}
export function RowLink({
  href,
  title,
  detail,
  icon = "book-open",
  kind,
  tag,
}: {
  href: string;
  title: string;
  detail?: string;
  icon?: string;
  /** Content kind; when set, the row uses that kind's icon and color. */
  kind?: string;
  tag?: string;
}) {
  return (
    <Link className="item-row" href={href}>
      {kind ? (
        <ContentIcon kind={kind} />
      ) : (
        <span className="content-icon">
          <Icon name={icon} />
        </span>
      )}
      <span className="grow">
        {tag && <span className="badge">{tag}</span>}
        <strong>{title}</strong>
        {detail && <span className="meta">{detail}</span>}
      </span>
      <Icon name="chevron-right" />
    </Link>
  );
}
