"use client";
import { queueIsIdle } from '@stay-focused/shared';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QueueCard } from "../features/queue";
import { CourseBatchQueue } from '../features/course-batch-queue';
import { useQueueItems } from "../features/queue-items";
import { useListPreferences } from "../lib/list-preferences";
import { Icon } from './ui';
import { OrbStill } from '../features/knowledge-core/OrbStill';
import { useOrbInteraction } from '../features/knowledge-core/orbInteraction';
export { countActiveJobs } from "../features/queue-items";

export function QueueButton() {
  const orbInteraction = useOrbInteraction();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let focused = true;
    const sync = () => setHidden(document.visibilityState === 'hidden' || !focused);
    const focus = () => { focused = true; sync(); };
    const blur = () => { focused = false; sync(); };
    sync(); document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    return () => { document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', focus); window.removeEventListener('blur', blur); };
  }, []);
  const { prefs, hide } = useListPreferences();
  const queue = useQueueItems(open, prefs.hidden.queue);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname(),
    search = useSearchParams(),
    router = useRouter();
  const { refresh } = queue;
  const close = useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);
  const show = useCallback(() => {
    setOpen(true);
    refresh();
  }, [refresh]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (search.get("queue") !== "open") return;
    show();
    const params = new URLSearchParams(search.toString());
    params.delete("queue");
    router.replace(
      pathname +
        (params.size ? "?" + params.toString() : "") +
        window.location.hash,
      { scroll: false },
    );
  }, [pathname, search, router, show]);
  useEffect(() => {
    window.addEventListener("sf:queue-open", show);
    return () => window.removeEventListener("sf:queue-open", show);
  }, [show]);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open, close]);
  const count = queue.generating;
  const active = count + queue.queued > 0;
  const sections = queue.sections;
  const refreshing = queue.loading || queue.refreshing;
  return (
    <div className="queue-control" ref={root}>
      <button
        ref={button}
        type="button"
        className={`queue-button${active ? " working" : ""}`}
        aria-label={`Open Queue${count ? ", " + count + " generating" : ""}${queue.unseenError ? ", new failure" : ""}`}
        aria-expanded={open}
        aria-controls="queue-popover"
        aria-haspopup="dialog"
        data-testid="queue-button"
        data-hidden={hidden}
        onClick={() => (open ? close() : show())}
      >
        {count > 0 ? (
          <span className="queue-count shown" aria-hidden="true">
            {count}
          </span>
        ) : null}
        {queue.unseenError ? (
          <span
            className="queue-error-dot"
            aria-label="Queue has a new failure"
          />
        ) : null}
        <span className="queue-orb" aria-hidden="true">
          <OrbStill variant="standalone" interaction={orbInteraction} className="queue-orb-frame" />
        </span>
        <span className="queue-label">Queue</span>
      </button>
      {open ? (
        <div
          id="queue-popover"
          className="queue-popover stack"
          role="dialog"
          aria-label="Queue"
          tabIndex={-1}
          ref={panel}
          onBlur={(event) => {
            if (
              event.relatedTarget &&
              !root.current?.contains(event.relatedTarget as Node)
            )
              close();
          }}
        >
          <div className="row queue-popover-header">
            <h2>Queue</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Refresh queue"
              aria-busy={refreshing}
              disabled={refreshing}
              onClick={() => { if (!refreshing) queue.refresh(); }}
            >
              {refreshing ? <span className="tile-spinner" aria-hidden="true" /> : <Icon name="refresh-cw" />}
            </button>
            <button onClick={close} aria-label="Close Queue">
              Close
            </button>
          </div>
          {queue.error ? <p role="status">{queue.error}</p> : null}
          <CourseBatchQueue />
          {queue.loading ? (
            <p role="status">Loading your generations...</p>
          ) : null}
          {queue.data && !queue.loading && !queue.error && queueIsIdle({ jobs: sections.flatMap(group => group.jobs), pending: [], courseBatches: queue.data.courseBatches }) ? (
            <p className="muted">Nothing generating right now.</p>
          ) : null}
          {sections.map((group) => (
            <section className="stack" key={group.key}>
              <div className="row between">
                <h3>{group.title}</h3>
                {group.key === "attention" || group.key === "completed" ? (
                  <button
                    className="subtle"
                    aria-label={`Clear ${group.title}`}
                    onClick={() =>
                      group.jobs.forEach((job) => hide("queue", job.id, true))
                    }
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="list-card">
                {group.jobs.map((job) => (
                  <QueueCard
                    key={job.id}
                    job={job}
                    onRefresh={queue.refresh}
                    onOpen={close}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
