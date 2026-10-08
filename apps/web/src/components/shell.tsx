"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./providers";
import { Icon, Notice } from "./ui";
const tabs = [
  { href: "/today", label: "Today", icon: "clock" },
  { href: "/generate", label: "Generate", icon: "sparkles" },
  { href: "/tasks", label: "Tasks", icon: "square-check-big" },
  { href: "/library", label: "Library", icon: "book-open" },
];
export function Shell({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth(),
    router = useRouter(),
    pathname = usePathname();
  const active = (href: string) =>
    pathname.startsWith(href) ||
    (href === "/library" && pathname.startsWith("/quiz")) ||
    (href === "/generate" && pathname.startsWith("/generation"));
  const detail = !tabs.some((tab) => pathname === tab.href);
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
  return (
    <div
      className={`app-shell${detail ? " detail-page" : ""}`}
      key={session.user.id}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar glass">
        <Link href="/today" className="brand">
          <Icon name="layers" />
          <span>
            Stay Focused<span className="meta">Your day, with purpose.</span>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
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
        <nav aria-label="More" className="secondary-nav">
          <Link
            href="/schedule"
            aria-current={pathname === "/schedule" ? "page" : undefined}
          >
            <Icon name="calendar" />
            Schedule
          </Link>
          <Link
            href="/canvas"
            aria-current={pathname === "/canvas" ? "page" : undefined}
          >
            <Icon name="globe" />
            Canvas
          </Link>
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <Icon name="settings" />
            Settings
          </Link>
        </nav>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <Link href="/today" className="mobile-brand">
            Stay Focused
          </Link>
          <div className="row">
            <Link href="/queue" className="button subtle">
              <Icon name="layers" />
              Queue
            </Link>
            <Link
              href="/settings"
              className="icon-button"
              aria-label="Settings"
            >
              <Icon name="settings" />
            </Link>
          </div>
        </div>
        <main id="main" tabIndex={-1} className="main" key={pathname}>
          {children}
        </main>
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
