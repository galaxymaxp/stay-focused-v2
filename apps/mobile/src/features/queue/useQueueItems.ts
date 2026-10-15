import { createJobStatusReader } from "@stay-focused/shared";
import type {
  GenerateCourseList,
  ProcessingJobListPage,
} from "@stay-focused/shared";
import {
  attributeGenerationIntent,
  discardGenerationIntents,
  readGenerationIntents,
  type GenerationIntent,
} from "../../services/generationRecovery";
import { useExperience, useExperienceClient } from "../redesign/useExperience";
import { useListPreferences } from "../redesign/useListPreferences";
import {
  queueItems,
  failedQueueIds,
  unseenFailures,
} from "./queuePresentation";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "../../auth";
import { experienceRequest } from "../../services/experienceApi";
import { countActiveJobs } from "../../design/appActivity";

export function useQueueSource() {
  const { session } = useAuth();
  const owner = session?.user.id ?? "";
  const client = useExperienceClient();
  const credentials = useRef(client);
  credentials.current = client;
  const [state, setState] = useState<{
    owner: string;
    data: ProcessingJobListPage | null;
    error: string | null;
  }>({ owner, data: null, error: null });
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
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 72, right: 16 });
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setOpen(false);
    setSeen(new Set());
  }, [owner]);
  useEffect(() => {
    if (!owner) return;
    let live = true,
      busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reader = createJobStatusReader((id, signal) => {
      const path =
        "/api/jobs?scope=all&limit=50" +
        (id ? "&detailId=" + encodeURIComponent(id) : "");
      return experienceRequest<ProcessingJobListPage>(
        credentials.current,
        path,
        { signal },
      );
    });
    async function check() {
      if (busy) return;
      clearTimeout(timer);
      let stateDetail: string | null = detailId.current;
      let next = 30_000;
      if (AppState.currentState === "active") {
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
            next = detailId.current ? 3_000 : 5_000;
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
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      live = false;
      reader.dispose();
      wakeRef.current = null;
      clearTimeout(timer);
      listener.remove();
    };
  }, [owner]);
  const data = state.owner === owner ? state.data : null;
  const jobs = data?.jobs ?? [];
  useEffect(() => {
    if (open) setSeen(new Set(failedQueueIds(data?.jobs ?? [])));
  }, [open, data]);
  const show = useCallback(
    (position?: { top: number; right: number }) => {
      if (position) setAnchor(position);
      setOpen(true);
      refresh();
    },
    [refresh],
  );
  const close = useCallback(() => setOpen(false), []);
  const error = state.owner === owner ? state.error : null;
  return {
    data,
    error,
    loading: !data && !error,
    refresh,
    watchDetail,
    ...countActiveJobs(jobs),
    open,
    anchor,
    show,
    close,
    unseenError: !open && unseenFailures(jobs, seen),
  };
}
export type QueueSource = ReturnType<typeof useQueueSource>;
export const QueueItemsContext = createContext<QueueSource | null>(null);
export function useQueueItems() {
  const value = useContext(QueueItemsContext);
  if (!value) throw new Error("QueueItemsContext is missing");
  return value;
}

export function useQueueGroups() {
  const queue = useQueueItems();
  const courses = useExperience<GenerateCourseList>("/api/experience/courses");
  const { session } = useAuth();
  const client = useExperienceClient();
  const attributed = useRef(new Set<string>());
  const pendingOwner = useRef(session?.user.id);
  const [pending, setPending] = useState<GenerationIntent[]>([]),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (session)
      void readGenerationIntents(session.user.id)
        .then(async (items) => {
          if (live) {
            pendingOwner.current = session.user.id;
            setPending(items.filter((item) => !item.generationId));
          }
          // Read saved requests immediately, then resolve older missing course
          // attribution once per mount. Refresh explicitly retries failures.
          for (const item of items.filter(
            (item) => !item.generationId && !item.courseId,
          )) {
            if (!live) break;
            const key = `${session.user.id}:${item.key}`;
            if (attributed.current.has(key)) continue;
            attributed.current.add(key);
            try {
              const resolved = await attributeGenerationIntent(
                session.user.id,
                client,
                item,
              );
              if (live)
                setPending((current) =>
                  current.map((old) =>
                    old.key === resolved.key ? resolved : old,
                  ),
                );
            } catch {
              /* An unresolved request remains available for Retry. */
            }
          }
        })
        .catch(() => {
          if (live)
            setError(
              "Could not load local requests. Your accepted work is still on the server.",
            );
        });
    return () => {
      live = false;
    };
  }, [session, client, queue.data]);
  const { prefs, hide } = useListPreferences();
  const cleared = new Set(prefs.hidden.queue);
  const jobs = (queue.data?.jobs ?? []).filter((job) => !cleared.has(job.id));
  const sections = queueItems(jobs);
  const attention =
    sections.find((section) => section.key === "attention")?.jobs ?? [];
  const completed =
    sections.find((section) => section.key === "completed")?.jobs ?? [];
  const pastIds = new Set(
    courses.data?.items
      .filter(
        (course) =>
          course.courseState === "past" ||
          (!course.courseState && course.period === "previous"),
      )
      .map((course) => course.id) ?? [],
  );
  const visiblePending = (
    pendingOwner.current === session?.user.id ? pending : []
  ).filter(
    (item) =>
      !pastIds.has(
        item.courseId ??
          (typeof item.body.courseId === "string" ? item.body.courseId : ""),
      ),
  );
  const needsAttention = attention.length > 0 || visiblePending.length > 0;
  async function clearAttention() {
    for (const job of attention) hide("queue", job.id, true);
    if (session && visiblePending.length) {
      try {
        const cleared = new Set(visiblePending.map((item) => item.key));
        await discardGenerationIntents(session.user.id, [...cleared]);
        setPending((items) => items.filter((item) => !cleared.has(item.key)));
      } catch {
        setError("Could not clear saved requests on this device.");
      }
    }
  }
  return {
    sections,
    attention,
    completed,
    visiblePending,
    needsAttention,
    clearAttention,
    hide,
    error,
    jobs,
  };
}

export function useJobRead(id: string | null) {
  const source = useQueueItems();
  useEffect(
    () => (id ? source.watchDetail(id) : undefined),
    [id, source.watchDetail],
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
