"use client";
import { createJobStatusReader } from "@stay-focused/shared";
import type { ProcessingJobListPage } from "@stay-focused/shared";
import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "../components/providers";
import {
  failedQueueIds,
  unseenFailures,
  queueItems,
} from "./queue-presentation";
export const ACTIVE_POLL_MS = 5_000,
  IDLE_POLL_MS = 30_000;
export function countActiveJobs(jobs: readonly { readonly status: string }[]) {
  let generating = 0;
  let queued = 0;
  for (const job of jobs) {
    if (job.status === "queued") queued += 1;
    else if (
      job.status === "running" ||
      job.status === "cancellation_requested"
    )
      generating += 1;
  }
  return { generating, queued };
}

export function useQueueSource(open = false, hidden: readonly string[] = []) {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const [state, setState] = useState<{
    owner: string;
    data: ProcessingJobListPage | null;
    error: string | null;
  }>({ owner, data: null, error: null });
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const detailId = useRef<string | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => wakeRef.current?.(), []);
  const watchDetail = useCallback(
    (id: string) => {
      detailId.current = id;
      refresh();
      return () => {
        if (detailId.current === id) detailId.current = null;
      };
    },
    [refresh],
  );
  const credentials = useRef(api);
  credentials.current = api;

  useEffect(() => {
    setSeen(new Set());
  }, [owner]);
  useEffect(() => {
    if (!owner) return;
    let live = true,
      busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reader = createJobStatusReader((id, signal) => {
      const path =
        "/api/jobs?scope=all&limit=50&batches=1" +
        (id ? "&detailId=" + encodeURIComponent(id) : "");
      return credentials.current<ProcessingJobListPage>(path, { signal });
    });
    async function check() {
      if (busy) return;
      clearTimeout(timer);
      let stateDetail: string | null = detailId.current;
      let next = IDLE_POLL_MS;
      if (document.visibilityState === "visible") {
        busy = true;
        try {
          const requested = detailId.current;
          stateDetail = requested;
          const data = await reader.read(requested);
          if (live) setState({ owner, data, error: null });
          const counts = countActiveJobs(
            data.detail ? [...data.jobs, data.detail.job] : data.jobs,
          );
          if (counts.generating + counts.queued > 0)
            next = detailId.current ? 3_000 : ACTIVE_POLL_MS;
        } catch {
          if (live)
            setState((old) => ({
              owner,
              data: old.owner === owner ? old.data : null,
              error: "Couldn't refresh Queue. Try again.",
            }));
        } finally {
          busy = false;
        }
      }
      if (live)
        timer = setTimeout(
          () => void check(),
          detailId.current && stateDetail !== detailId.current ? 0 : next,
        );
    }
    wakeRef.current = () => void check();
    void Promise.resolve().then(() => {
      if (live) void check();
    });
    const wake = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      live = false;
      reader.dispose();
      wakeRef.current = null;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [owner]);
  const data = state.owner === owner ? state.data : null;
  const jobs = data?.jobs ?? [];
  useEffect(() => {
    if (open) setSeen(new Set(failedQueueIds(data?.jobs ?? [])));
  }, [open, data]);
  const error = state.owner === owner ? state.error : null;
  const markSeen = useCallback(
    () => setSeen(new Set(failedQueueIds(data?.jobs ?? []))),
    [data],
  );
  return {
    data,
    loading: !data && !error,
    error,
    refresh,
    watchDetail,
    markSeen,
    sections: queueItems(jobs, hidden),
    ...countActiveJobs(jobs),
    unseenError: !open && unseenFailures(jobs, seen),
  };
}

const QueueReadContext = createContext<ReturnType<
  typeof useQueueSource
> | null>(null);
export function QueueReadProvider({ children }: { children: ReactNode }) {
  const source = useQueueSource();
  return createElement(QueueReadContext.Provider, { value: source }, children);
}
export function useQueueItems(open = false, hidden: readonly string[] = []) {
  const source = useContext(QueueReadContext);
  if (!source) throw new Error("Queue read provider is missing");
  const { markSeen } = source;
  useEffect(() => {
    if (open) markSeen();
  }, [open, markSeen]);
  return {
    ...source,
    sections: queueItems(source.data?.jobs ?? [], hidden),
    unseenError: !open && source.unseenError,
  };
}
export function useJobRead(id: string | null) {
  const source = useQueueItems();
  const { watchDetail } = source;
  useEffect(
    () => (id ? watchDetail(id) : undefined),
    [id, watchDetail],
  );
  const known = !!id && source.data?.detailId === id;
  const detail = known ? source.data?.detail : null;
  return {
    data: detail?.generation ?? null,
    job: detail?.job ?? null,
    loading: !!id && !known && !source.error,
    error:
      source.error ??
      (known &&
      (!detail ||
        (detail.job.jobType !== "document_extraction" && !detail.generation))
        ? "This generation is no longer available."
        : null),
    refresh: source.refresh,
  };
}
