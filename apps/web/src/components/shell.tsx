"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BookLoader, LogoMark } from "./brand";
import { Breadcrumbs, CrumbProvider, trailFor, useCrumbState } from "./crumbs";
import { useAuth } from "./providers";
import { QueueButton } from "./queue-button";
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
    { page, setPage } = useCrumbState(),
    { collapsed, toggleSidebar } = useSidebar();
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
        <BookLoader
          label={loading ? "Restoring your session" : "Opening sign in"}
        />
        {error && <Notice error>{error}</Notice>}
      </main>
    );
  const email = session.user.email ?? "Signed in";
  return (
    <div
      className={`app-shell${detail ? " detail-page" : ""}${collapsed ? " sidebar-collapsed" : ""}`}
      key={session.user.id}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar" id="sidebar" inert={collapsed}>
        <Link href="/today" className="brand">
          <LogoMark size={22} />
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
          <button
            type="button"
            className="icon-button sidebar-toggle"
            aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            title={`${collapsed ? "Show" : "Hide"} sidebar (Ctrl+B)`}
            onClick={toggleSidebar}
          >
            <Icon name="panel-left" />
          </button>
          <Link href="/today" className="mobile-brand">
            <LogoMark size={20} />
            Stay Focused
          </Link>
          <Breadcrumbs trail={trailFor(pathname, page)} />
          <div className="row topbar-actions">
            <QueueButton current={active("/queue")} />
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

const sidebarKey = "stay-focused-web-sidebar";
/** Desktop sidebar visibility, remembered per browser and toggled with Ctrl+B. */
function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(sidebarKey) === "hidden");
    } catch {
      /* Storage can be unavailable; the sidebar simply starts visible. */
    }
  }, []);
  const toggleSidebar = useCallback(() => {
    setCollapsed((old) => {
      try {
        localStorage.setItem(sidebarKey, old ? "shown" : "hidden");
      } catch {
        /* Not remembered this time. */
      }
      return !old;
    });
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key.toLowerCase() !== "b" ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey ||
        target?.closest("input, textarea, select, [contenteditable='true']")
      )
        return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
  return { collapsed, toggleSidebar };
}
