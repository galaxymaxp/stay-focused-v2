"use client";
import type { ProcessingJobStatusView } from "@stay-focused/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./providers";

// Web port of the app's header Queue control (apps/mobile/src/design/
// QueueButton.tsx with AppActivityProvider): the Knowledge Core in miniature.

/** Poll quickly only while something is running; otherwise check rarely. */
const ACTIVE_POLL_MS = 5_000;
const IDLE_POLL_MS = 30_000;

/** Counts from the server's active job list; anything not queued is working. */
export function countActiveJobs(jobs: readonly { readonly status: string }[]) {
  let generating = 0;
  let queued = 0;
  for (const job of jobs) {
    if (job.status === "queued") queued += 1;
    else if (job.status === "running" || job.status === "cancellation_requested") generating += 1;
  }
  return { generating, queued };
}

function useActivity() {
  const { api, session } = useAuth();
  const [counts, setCounts] = useState({ generating: 0, queued: 0 });
  useEffect(() => {
    if (!session?.user.id) return;
    let live = true;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const check = async () => {
      clearTimeout(timer);
      let next = IDLE_POLL_MS;
      if (document.visibilityState === "visible" && !busy) {
        busy = true;
        try {
          const value = await api<ProcessingJobStatusView[] | { jobs: ProcessingJobStatusView[] }>(
            "/api/jobs",
            { signal: controller.signal },
          );
          const jobs = Array.isArray(value) ? value : (value?.jobs ?? []);
          const found = countActiveJobs(jobs);
          if (live)
            setCounts((current) =>
              current.generating === found.generating && current.queued === found.queued ? current : found,
            );
          if (found.generating + found.queued > 0) next = ACTIVE_POLL_MS;
        } catch {
          /* Offline or unavailable: keep the last known state and try later. */
        } finally {
          busy = false;
        }
      }
      if (live) timer = setTimeout(() => void check(), next);
    };
    void check();
    const wake = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [api, session?.user.id]);
  return counts;
}

/**
 * Idle, a still glass orb. While Stay Focused is generating, the orb turns
 * slowly inside a soft glow and a count on its left shows how much work is in
 * the queue. Either way it opens Queue.
 */
export function QueueButton({ current }: { current: boolean }) {
  const { generating, queued } = useActivity();
  const count = generating + queued;
  const active = count > 0;
  const status =
    generating > 0
      ? `${generating} generating${queued ? `, ${queued} queued` : ""}`
      : queued > 0
        ? `${queued} queued`
        : null;
  return (
    <Link
      href="/queue"
      className={`queue-button${active ? " working" : ""}`}
      aria-label={status ? `Open Queue, ${status}` : "Open Queue"}
      aria-current={current ? "page" : undefined}
      title={status ? `Queue · ${status}` : "Queue"}
      data-testid="queue-button"
    >
      <span className={`queue-count${count > 0 ? " shown" : ""}`} aria-hidden="true">
        {count || ""}
      </span>
      <span className="queue-orb" aria-hidden="true">
        <span className="queue-glow" />
        {/* A still frame of the Knowledge Core, captured from the app's render. */}
        <span className="queue-orb-frame" />
      </span>
      <span className="queue-label">Queue</span>
    </Link>
  );
}
