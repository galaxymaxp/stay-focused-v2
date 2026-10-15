import type { ProcessingJobListPage } from "@stay-focused/shared";
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../../auth";
import { experienceRequest } from "../../services/experienceApi";
import { useExperienceClient } from "../redesign/useExperience";
import { countActiveJobs } from "../../design/appActivity";
import { failedQueueIds, unseenFailures } from "./queuePresentation";

export function useQueueSource() {
  const { session } = useAuth();
  const owner = session?.user.id ?? "";
  const client = useExperienceClient();
  const credentials = useRef(client);
  credentials.current = client;
  const [state, setState] = useState<{ owner: string; data: ProcessingJobListPage | null; error: string | null }>({ owner, data: null, error: null });
  const [kick, setKick] = useState(0);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 72, right: 16 });
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const refresh = useCallback(() => setKick(n => n + 1), []);
  useEffect(() => { setOpen(false); setSeen(new Set()); }, [owner]);
  useEffect(() => {
    if (!owner) return;
    let live = true, busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function check() {
      if (busy) return;
      clearTimeout(timer);
      let next = 30_000;
      if (AppState.currentState === "active") {
        busy = true;
        try {
          const data = await experienceRequest<ProcessingJobListPage>(credentials.current, "/api/jobs?scope=all&limit=50", { signal: controller.signal });
          if (live) setState({ owner, data, error: null });
          const counts = countActiveJobs(data.jobs);
          if (counts.generating + counts.queued > 0) next = 5_000;
        } catch {
          if (live) setState(old => ({ owner, data: old.owner === owner ? old.data : null, error: "Couldn�t refresh Queue. Try again." }));
        } finally { busy = false; }
      }
      if (live) timer = setTimeout(() => void check(), next);
    }
    void check();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void check(); });
    return () => { live = false; controller.abort(); clearTimeout(timer); listener.remove(); };
  }, [owner, kick]);
  const data = state.owner === owner ? state.data : null;
  const jobs = data?.jobs ?? [];
  useEffect(() => { if (open) setSeen(new Set(failedQueueIds(data?.jobs ?? []))); }, [open, data]);
  const show = useCallback((position?: { top: number; right: number }) => {
    if (position) setAnchor(position);
    setOpen(true);
    refresh();
  }, [refresh]);
  const close = useCallback(() => setOpen(false), []);
  return { data, error: state.owner === owner ? state.error : null, loading: !data && !state.error, refresh,
    ...countActiveJobs(jobs), open, anchor, show, close, unseenError: !open && unseenFailures(jobs, seen) };
}
export type QueueSource = ReturnType<typeof useQueueSource>;
export const QueueItemsContext = createContext<QueueSource | null>(null);
export function useQueueItems() {
  const value = useContext(QueueItemsContext);
  if (!value) throw new Error("QueueItemsContext is missing");
  return value;
}

import type { GenerateCourseList } from "@stay-focused/shared";
import { attributeGenerationIntent, discardGenerationIntents, readGenerationIntents, type GenerationIntent } from "../../services/generationRecovery";
import { useExperience } from "../redesign/useExperience";
import { useListPreferences } from "../redesign/useListPreferences";
import { queueItems } from "./queuePresentation";

export function useQueueGroups() {
  const queue = useQueueItems();
  const courses = useExperience<GenerateCourseList>('/api/experience/courses');
  const { session } = useAuth();
  const client = useExperienceClient();
  const attributed = useRef(new Set<string>());
  const [pending, setPending] = useState<GenerationIntent[]>([]),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (session)
      void readGenerationIntents(session.user.id)
        .then(async (items) => {
          if (live) setPending(items.filter((item) => !item.generationId));
          // Read saved requests immediately, then resolve older missing course
          // attribution once per mount. Refresh explicitly retries failures.
          for (const item of items.filter(item => !item.generationId && !item.courseId)) {
            if (!live) break;
            const key = `${session.user.id}:${item.key}`;
            if (attributed.current.has(key)) continue;
            attributed.current.add(key);
            try {
              const resolved = await attributeGenerationIntent(session.user.id, client, item);
              if (live) setPending(current => current.map(old => old.key === resolved.key ? resolved : old));
            } catch { /* An unresolved request remains available for Retry. */ }
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
  const attention = sections.find((section) => section.key === "attention")?.jobs ?? [];
  const completed = sections.find((section) => section.key === "completed")?.jobs ?? [];
  const pastIds = new Set(courses.data?.items.filter(course => course.courseState === 'past' || (!course.courseState && course.period === 'previous')).map(course => course.id) ?? []);
  const visiblePending = pending.filter(item => !pastIds.has(item.courseId ?? (typeof item.body.courseId === 'string' ? item.body.courseId : '')));
  const needsAttention = attention.length > 0 || visiblePending.length > 0;
  async function clearAttention() {
    for (const job of attention) hide("queue", job.id, true);
    if (session && visiblePending.length) {
      try {
        const cleared = new Set(visiblePending.map(item => item.key));
        await discardGenerationIntents(session.user.id, [...cleared]);
        setPending(items => items.filter(item => !cleared.has(item.key)));
      } catch {
        setError("Could not clear saved requests on this device.");
      }
    }
  }
  return { sections, attention, completed, visiblePending, needsAttention, clearAttention, hide, error, jobs };
}
