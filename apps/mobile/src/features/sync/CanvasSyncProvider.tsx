import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { useAuth } from "../../auth";
import { getApiBaseUrl } from "../../config/apiBaseUrl";
import {
  latestSuccessfulSync,
  shouldAutoSync,
  startAccountCanvasSync,
  summarizeSyncJobs,
  type AccountSyncSnapshot,
} from "../../services/canvasAccountSync";
import { listCanvasCourses, type CanvasSyncJobStatusView } from "../../services/canvasApi";
import {
  reconcileCanvasSyncJobs,
  startDurableCanvasSync,
} from "../../services/canvasSyncJobCoordinator";

const POLL_MS = 4_000;
const MAX_POLL_MS = 15 * 60 * 1_000;

interface CanvasSyncValue {
  readonly snapshot: AccountSyncSnapshot;
  /** Increments after a sync finishes so screens refetch server data. */
  readonly dataVersion: number;
  readonly sync: () => Promise<void>;
}

const idle: AccountSyncSnapshot = { phase: "idle", total: 0, finished: 0, lastSyncedAt: null };
const CanvasSyncContext = createContext<CanvasSyncValue>({
  snapshot: idle,
  dataVersion: 0,
  sync: async () => {},
});

export const useCanvasSync = () => useContext(CanvasSyncContext);

/** Diagnostics carry counts and stable codes only: no tokens, names or content. */
function diagnose(event: string, details: Record<string, unknown> = {}) {
  console.info(`[canvas-sync] ${event}`, JSON.stringify(details));
}

export function CanvasSyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? "";
  const ownerUserId = session?.user.id ?? "";
  const [snapshot, setSnapshot] = useState<AccountSyncSnapshot>(idle);
  const [dataVersion, setDataVersion] = useState(0);
  const running = useRef(false);
  const lastAttemptAt = useRef<number | null>(null);
  const tracked = useRef(new Map<string, CanvasSyncJobStatusView>());
  const rejectedCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollStartedAt = useRef(0);
  const live = useRef(true);
  // Timers and foreground listeners outlive renders; they read the current
  // session so a refreshed access token is used rather than the one captured.
  const credentials = useRef({ accessToken, ownerUserId });
  credentials.current = { accessToken, ownerUserId };

  const request = useCallback(() => {
    const apiBaseUrl = getApiBaseUrl();
    const current = credentials.current;
    return apiBaseUrl && current.accessToken && current.ownerUserId
      ? { apiBaseUrl, accessToken: current.accessToken, ownerUserId: current.ownerUserId }
      : null;
  }, []);

  const refreshLastSynced = useCallback(async () => {
    const input = request();
    if (!input) return null;
    const inventory = await listCanvasCourses(input);
    if (!inventory.ok) return null;
    const lastSyncedAt = latestSuccessfulSync(inventory.data);
    if (live.current) setSnapshot((current) => ({ ...current, lastSyncedAt }));
    return lastSyncedAt;
  }, [request]);

  const finish = useCallback(async () => {
    const summary = summarizeSyncJobs([...tracked.current.values()], rejectedCount.current);
    diagnose("finished", { phase: summary.phase, courses: summary.total });
    running.current = false;
    const lastSyncedAt = await refreshLastSynced();
    if (!live.current) return;
    setSnapshot((current) => ({ ...current, ...summary, lastSyncedAt: lastSyncedAt ?? current.lastSyncedAt }));
    setDataVersion((value) => value + 1);
  }, [refreshLastSynced]);

  const poll = useCallback(async () => {
    clearTimeout(pollTimer.current);
    const input = request();
    if (!input || !live.current) return;
    if (AppState.currentState === "active") {
      const { jobs } = await reconcileCanvasSyncJobs(input);
      for (const job of jobs) {
        if (job.jobType === "course_content" && tracked.current.has(job.id)) tracked.current.set(job.id, job);
      }
      const summary = summarizeSyncJobs([...tracked.current.values()], rejectedCount.current);
      if (!live.current) return;
      if (summary.phase !== "syncing") {
        await finish();
        return;
      }
      setSnapshot((current) => ({ ...current, ...summary }));
    }
    if (Date.now() - pollStartedAt.current > MAX_POLL_MS) {
      // Durable jobs keep running on the server; the next foreground resumes them.
      diagnose("polling_paused", { tracked: tracked.current.size });
      running.current = false;
      return;
    }
    pollTimer.current = setTimeout(() => void poll(), POLL_MS);
  }, [finish, request]);

  const sync = useCallback(async () => {
    const input = request();
    if (!input || running.current) return;
    running.current = true;
    lastAttemptAt.current = Date.now();
    setSnapshot((current) => ({ ...current, phase: "syncing", total: 0, finished: 0 }));
    try {
      const started = await startAccountCanvasSync(input, {
        listCourses: listCanvasCourses,
        startCourse: (course) =>
          startDurableCanvasSync({
            ...input,
            courseId: course.id,
            courseDisplayName: course.displayName,
            jobType: "course_content",
          }),
      });
      diagnose("started", {
        phase: started.phase,
        accepted: started.jobs.length,
        rejected: started.rejected.map((item) => item.code),
      });
      tracked.current = new Map(started.jobs.map((job) => [job.id, job]));
      rejectedCount.current = started.rejected.length;
      if (!live.current) return;
      if (started.phase !== "syncing") {
        running.current = false;
        setSnapshot((current) => ({
          ...current,
          phase: started.phase,
          total: started.jobs.length + started.rejected.length,
          finished: started.jobs.length + started.rejected.length,
          lastSyncedAt: started.lastSyncedAt ?? current.lastSyncedAt,
        }));
        if (started.jobs.length > 0) setDataVersion((value) => value + 1);
        return;
      }
      setSnapshot((current) => ({
        ...current,
        ...summarizeSyncJobs(started.jobs, started.rejected.length),
        lastSyncedAt: started.lastSyncedAt ?? current.lastSyncedAt,
      }));
      pollStartedAt.current = Date.now();
      pollTimer.current = setTimeout(() => void poll(), POLL_MS);
    } catch {
      diagnose("start_failed");
      running.current = false;
      if (live.current) setSnapshot((current) => ({ ...current, phase: "failed" }));
    }
  }, [poll, request]);

  // On sign-in and each return to the foreground: resume jobs still running on
  // the server, otherwise refresh automatically when the data is stale.
  const resume = useCallback(async () => {
    const input = request();
    if (!input || running.current) return;
    const { jobs } = await reconcileCanvasSyncJobs(input);
    const active = jobs.filter((job) => job.jobType === "course_content" && !["succeeded", "failed", "cancelled", "expired"].includes(job.status));
    if (active.length > 0 && live.current) {
      running.current = true;
      tracked.current = new Map(active.map((job) => [job.id, job]));
      rejectedCount.current = 0;
      setSnapshot((current) => ({ ...current, ...summarizeSyncJobs(active, 0) }));
      pollStartedAt.current = Date.now();
      pollTimer.current = setTimeout(() => void poll(), POLL_MS);
      return;
    }
    const lastSyncedAt = await refreshLastSynced();
    if (shouldAutoSync({ lastSyncedAt, lastAttemptAt: lastAttemptAt.current, now: Date.now() })) {
      diagnose("auto_refresh");
      await sync();
    }
  }, [poll, refreshLastSynced, request, sync]);

  useEffect(() => {
    live.current = true;
    if (!ownerUserId) return;
    void resume().catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void resume().catch(() => undefined);
    });
    return () => {
      live.current = false;
      subscription.remove();
      clearTimeout(pollTimer.current);
      running.current = false;
    };
  }, [ownerUserId, resume]);

  const value = useMemo(() => ({ snapshot, dataVersion, sync }), [snapshot, dataVersion, sync]);
  return <CanvasSyncContext.Provider value={value}>{children}</CanvasSyncContext.Provider>;
}
