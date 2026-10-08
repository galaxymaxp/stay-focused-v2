"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Breadcrumbs, CrumbProvider, trailFor, useCrumbState } from "./crumbs";
import { useAuth } from "./providers";
import { Icon, Notice } from "./ui";
const tabs = [
  { href: "/today", label: "Today", icon: "clock" },
  { href: "/generate", label: "Generate", icon: "sparkles" },
  { href: "/tasks", label: "Tasks", icon: "square-check-big" },
  { href: "/library", label: "Library", icon: "book-open" },
];
const tools = [
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/canvas", label: "Canvas", icon: "globe" },
];
export function Shell({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth(),
    router = useRouter(),
    pathname = usePathname(),
    { page, setPage } = useCrumbState();
  const active = (href: string) =>
    pathname.startsWith(href) ||
    (href === "/library" && pathname.startsWith("/quiz")) ||
    (href === "/generate" && pathname.startsWith("/generation"));
  const detail = !tabs.some((tab) => pathname === tab.href),
    // A course and its materials are one screen, so choosing a material
    // keeps the list mounted instead of replaying the page entrance.
    screen = pathname.replace(/^(\/generate\/[^/]+)\/.+$/, "$1");
  useEffect(() => {
    if (!loading && !session) router.replace("/sign-in");
  }, [loading, session, router]);
  if (loading || !session)
    return (
      <main className="auth-page">
        <p role="status">
          {loading ? "Restoring your session…" : "Opening sign in…"}
        </p>
        {error && <Notice error>{error}</Notice>}
      </main>
    );
  const email = session.user.email ?? "Signed in";
  return (
    <div
      className={`app-shell${detail ? " detail-page" : ""}`}
      key={session.user.id}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/today" className="brand">
          <Icon name="layers" />
          <span>Stay Focused</span>
        </Link>
        <nav aria-label="Primary navigation">
          {[...tabs, ...tools].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active(tab.href) ? "page" : undefined}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <nav aria-label="Account">
            <Link
              href="/settings"
              aria-current={active("/settings") ? "page" : undefined}
            >
              <Icon name="settings" />
              Settings
            </Link>
          </nav>
          <div className="account" title={email}>
            <span className="avatar" aria-hidden="true">
              {email.charAt(0).toUpperCase()}
            </span>
            <span className="account-email">{email}</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/today" className="mobile-brand">
            Stay Focused
          </Link>
          <Breadcrumbs trail={trailFor(pathname, page)} />
          <div className="row topbar-actions">
            <Link
              href="/queue"
              className="button subtle"
              aria-current={active("/queue") ? "page" : undefined}
            >
              <Icon name="layers" />
              Queue
            </Link>
            <Link
              href="/settings"
              className="icon-button mobile-only"
              aria-label="Settings"
            >
              <Icon name="settings" />
            </Link>
          </div>
        </header>
        <CrumbProvider onChange={setPage}>
          <main id="main" tabIndex={-1} className="main" key={screen}>
            {children}
          </main>
        </CrumbProvider>
      </div>
      <nav className="bottom-nav glass" aria-label="Mobile navigation">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active(tab.href) ? "page" : undefined}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
