"use client";
import type { ProcessingJobListPage } from "@stay-focused/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/providers";
import { failedQueueIds, unseenFailures } from "./queue-presentation";
export const ACTIVE_POLL_MS = 5_000, IDLE_POLL_MS = 30_000;
export function countActiveJobs(jobs: readonly { readonly status: string }[]) {
  let generating = 0;
  let queued = 0;
  for (const job of jobs) {
    if (job.status === "queued") queued += 1;
    else if (job.status === "running" || job.status === "cancellation_requested") generating += 1;
  }
  return { generating, queued };
}


export function useQueueItems(open: boolean) {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const [state, setState] = useState<{ owner: string; data: ProcessingJobListPage | null; error: string | null }>({ owner, data: null, error: null });
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [kick, setKick] = useState(0);
  const credentials = useRef(api); credentials.current = api;
  const refresh = useCallback(() => setKick(n => n + 1), []);
  useEffect(() => { setSeen(new Set()); }, [owner]);
  useEffect(() => {
    if (!owner) return;
    let live = true, busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function check() {
      if (busy) return;
      clearTimeout(timer);
      let next = IDLE_POLL_MS;
      if (document.visibilityState === "visible") {
        busy = true;
        try {
          const data = await credentials.current<ProcessingJobListPage>("/api/jobs?scope=all&limit=50", { signal: controller.signal });
          if (live) setState({ owner, data, error: null });
          const counts = countActiveJobs(data.jobs);
          if (counts.generating + counts.queued > 0) next = ACTIVE_POLL_MS;
        } catch {
          if (live) setState(old => ({ owner, data: old.owner === owner ? old.data : null, error: "Couldn�t refresh Queue. Try again." }));
        } finally { busy = false; }
      }
      if (live) timer = setTimeout(() => void check(), next);
    }
    void check();
    const wake = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", wake); window.addEventListener("focus", wake);
    return () => { live = false; controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); };
  }, [owner, kick]);
  const data = state.owner === owner ? state.data : null;
  const jobs = data?.jobs ?? [];
  useEffect(() => { if (open) setSeen(new Set(failedQueueIds(data?.jobs ?? []))); }, [open, data]);
  return { data, loading: !data && !state.error, error: state.owner === owner ? state.error : null, refresh,
    ...countActiveJobs(jobs), unseenError: !open && unseenFailures(jobs, seen) };
}
