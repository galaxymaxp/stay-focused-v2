"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { QueueCard } from "../features/queue";
import { CourseBatchQueue } from '../features/course-batch-queue';
import { useQueueItems } from "../features/queue-items";
import { useListPreferences } from "../lib/list-preferences";
export { countActiveJobs } from "../features/queue-items";

export function QueueButton() {
  const [open, setOpen] = useState(false);
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
          <span className="queue-glow" />
          <span className="queue-orb-frame" />
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
          <div className="row between">
            <h2>Queue</h2>
            <button onClick={close} aria-label="Close Queue">
              Close
            </button>
          </div>
          <button className="subtle" onClick={queue.refresh}>
            Refresh
          </button>
          {queue.error ? <p role="status">{queue.error}</p> : null}
          <CourseBatchQueue />
          {queue.loading ? (
            <p role="status">Loading your generations...</p>
          ) : null}
          {queue.data && sections.length === 0 && !queue.data.courseBatches?.requests.some(row => ['waiting', 'quota', 'failed'].includes(row.state)) ? (
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
