"use client";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface Crumb {
  label: string;
  href?: string;
}
export interface PageTrail {
  parent?: Crumb;
  current?: string;
}
const sections = [
  { prefixes: ["/today"], href: "/today", label: "Today" },
  { prefixes: ["/generate", "/generation"], href: "/generate", label: "Generate" },
  { prefixes: ["/tasks"], href: "/tasks", label: "Tasks" },
  { prefixes: ["/library", "/quiz"], href: "/library", label: "Library" },
  { prefixes: ["/schedule"], href: "/schedule", label: "Schedule" },
  { prefixes: ["/canvas"], href: "/canvas", label: "Canvas" },
  { prefixes: ["/settings"], href: "/settings", label: "Settings" },
  { prefixes: ["/queue"], href: "/queue", label: "Queue" },
];

/** Builds the top-bar trail: section root, optional parent, current page. */
export function trailFor(pathname: string, page: PageTrail): Crumb[] {
  const section = sections.find((s) =>
    s.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );
  if (!section) return page.current ? [{ label: page.current }] : [];
  if (pathname === section.href) return [{ label: section.label }];
  const trail: Crumb[] = [{ label: section.label, href: section.href }];
  if (page.parent) trail.push(page.parent);
  if (page.current && page.current !== section.label)
    trail.push({ label: page.current });
  const last = trail[trail.length - 1];
  if (last) trail[trail.length - 1] = { label: last.label };
  return trail;
}

const Context = createContext<((trail: PageTrail) => void) | null>(null);

/** Holds the trail reported by the current page's heading. */
export function useCrumbState() {
  const [page, setPage] = useState<PageTrail>({});
  return { page, setPage };
}
export function CrumbProvider({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange: (trail: PageTrail) => void;
}) {
  return <Context.Provider value={onChange}>{children}</Context.Provider>;
}

/** Rendered by page headings so the shell can show where the user is. */
export function PageCrumb({ parent, current }: PageTrail) {
  const set = useContext(Context);
  const parentLabel = parent?.label,
    parentHref = parent?.href;
  useEffect(() => {
    if (!set) return;
    set({
      parent: parentLabel ? { label: parentLabel, href: parentHref } : undefined,
      current,
    });
    return () => set({});
  }, [set, parentLabel, parentHref, current]);
  return null;
}

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        {trail.map((crumb, i) => (
          <li key={`${i}-${crumb.label}`}>
            {crumb.href ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
