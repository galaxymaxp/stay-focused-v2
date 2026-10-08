"use client";
import type { StudentAnnouncement, StudentAnnouncementList } from "@stay-focused/shared";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { announcementCourseLabel, formatAnnouncementDate } from "../app-model/announcementPresentation";
import { arrangeList } from "../app-model/listPreferences";
import { PageCrumb } from "../components/crumbs";
import { CourseMark } from "../components/course";
import { Heading, Icon, Notice, State } from "../components/ui";
import { safeUrl } from "../lib/api";
import { useResource } from "../lib/hooks";
import { useListPreferences } from "../lib/list-preferences";

// Web counterpart of apps/mobile/src/features/announcements/AnnouncementsScreen.tsx:
// read or unread like mail, pinned first, read state kept in this browser
// (Canvas is never changed). On desktop the list and the open announcement
// sit side by side.

const LIST_PATH = "/api/experience/announcements?limit=100";
const Context = createContext<readonly StudentAnnouncement[] | null>(null);

function useArranged(items: readonly StudentAnnouncement[]) {
  const { prefs, pin, read } = useListPreferences();
  const readSet = new Set([...prefs.read.announcements, ...prefs.hidden.announcements]);
  const arranged = arrangeList(items, (item) => item.id, prefs.pinned.announcement, []);
  const ordered = [...arranged.pinned, ...arranged.rest];
  return {
    unread: ordered.filter((item) => !readSet.has(item.id)),
    read: ordered.filter((item) => readSet.has(item.id)),
    isRead: (id: string) => readSet.has(id),
    isPinned: (id: string) => prefs.pinned.announcement.includes(id),
    setPinned: (id: string, value: boolean) => pin("announcement", id, value),
    setRead: (id: string, value: boolean) => read(id, value),
  };
}

export function AnnouncementsWorkspace({ children }: { children: ReactNode }) {
  const list = useResource<StudentAnnouncementList>(LIST_PATH, 60000);
  const selected = useSelectedLayoutSegment();
  const selectedId = selected ? decodeURIComponent(selected) : null;
  const arranged = useArranged(list.data?.items ?? []);
  const row = (item: StudentAnnouncement) => {
    const read = arranged.isRead(item.id);
    const pinned = arranged.isPinned(item.id);
    return (
      <div key={item.id} className={`announcement-item${read ? " read" : ""}`}>
        <Link
          href={`/announcements/${encodeURIComponent(item.id)}`}
          className="announcement-open"
          aria-current={item.id === selectedId ? "page" : undefined}
          aria-label={`${read ? "" : "Unread: "}${item.title}${pinned ? ", pinned" : ""}`}
        >
          <span className={`unread-dot${read ? "" : " on"}`} aria-hidden="true" />
          <span className="grow">
            <span className="meta">
              {announcementCourseLabel(item)} · {formatAnnouncementDate(item.postedAt)}
            </span>
            <strong>{item.title}</strong>
            {item.preview && <span className="meta preview">{item.preview}</span>}
          </span>
        </Link>
        <span className="row-actions">
          <button
            className="icon-button subtle"
            aria-pressed={pinned}
            aria-label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
            title={pinned ? "Unpin" : "Pin to top"}
            onClick={() => arranged.setPinned(item.id, !pinned)}
          >
            <Icon name="pin" />
          </button>
          <button
            className="icon-button subtle"
            aria-label={read ? `Mark ${item.title} as unread` : `Mark ${item.title} as read`}
            title={read ? "Mark as unread" : "Mark as read"}
            onClick={() => arranged.setRead(item.id, !read)}
          >
            <Icon name={read ? "circle-alert" : "check"} />
          </button>
        </span>
      </div>
    );
  };
  return (
    <Context.Provider value={list.data?.items ?? null}>
      <div className={`announcements-workspace${selectedId ? " has-selection" : ""}`}>
        <div className="announcements-heading">
          <Heading
            title="Announcements"
            subtitle={arranged.unread.length ? `${arranged.unread.length} unread` : "Updates from your Canvas courses"}
            back="/today"
            crumb={selectedId ? null : undefined}
          />
        </div>
        <State resource={list} />
        {list.data && (
          <div className="announcements-split">
            <section className="announcements-list" aria-label="Announcements">
              {list.data.items.length === 0 ? (
                <div className="pane-placeholder">
                  <h2>No announcements</h2>
                  <p className="muted">New Canvas course updates appear here after your next sync.</p>
                </div>
              ) : (
                <>
                  {arranged.unread.length > 0 && <h2 className="pane-group-title">Unread</h2>}
                  {arranged.unread.map(row)}
                  {arranged.read.length > 0 && <h2 className="pane-group-title">Read</h2>}
                  {arranged.read.map(row)}
                </>
              )}
            </section>
            <section className="announcements-detail" aria-label="Announcement">
              {children}
            </section>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

export function AnnouncementsOverview() {
  return (
    <div className="pane-placeholder">
      <Icon name="book-open" />
      <h2>Choose an announcement</h2>
      <p className="muted">Opening one marks it read. Pin the ones you want to keep at the top.</p>
    </div>
  );
}

export function AnnouncementDetail({ id }: { id: string }) {
  const items = useContext(Context);
  const { read } = useListPreferences();
  const item = items?.find((entry) => entry.id === id) ?? null;
  // Opening an announcement, from anywhere, reads it.
  useEffect(() => {
    read(id, true);
  }, [id, read]);
  if (!items) return null;
  if (!item)
    return (
      <div className="pane-placeholder">
        <Notice>This announcement is no longer available.</Notice>
      </div>
    );
  const canvas = item.htmlUrl ? safeUrl(item.htmlUrl) : null;
  return (
    <article className="announcement-article" key={item.id}>
      <PageCrumb parent={{ label: "Announcements", href: "/announcements" }} current={item.title} />
      <header className="stack">
        <div className="row">
          <CourseMark course={item.course} size={36} />
          <div>
            <span className="meta">{item.course.name}</span>
            <span className="meta">
              {[item.authorName, formatAnnouncementDate(item.postedAt)].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
        <h2>{item.title}</h2>
      </header>
      <p className="announcement-body">{item.body}</p>
      {item.attachments.length > 0 && (
        <section className="stack">
          <h3>Attachments</h3>
          {item.attachments.map((file) => {
            const href = safeUrl(file.url);
            return href ? (
              <a key={file.url} className="resource-row" href={href} target="_blank" rel="noopener noreferrer">
                <Icon name="file-text" />
                <span className="grow">{file.label}</span>
                <Icon name="chevron-right" />
              </a>
            ) : null;
          })}
        </section>
      )}
      {item.links.length > 0 && (
        <section className="stack">
          <h3>Links</h3>
          {item.links.map((link) => {
            const href = safeUrl(link.url);
            return href ? (
              <a key={link.url} href={href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : null;
          })}
        </section>
      )}
      <div className="row wrap">
        {canvas && (
          <a className="button" href={canvas} target="_blank" rel="noopener noreferrer">
            Open in Canvas
          </a>
        )}
        <Link className="button subtle" href="/announcements">
          Back to all
        </Link>
      </div>
    </article>
  );
}
