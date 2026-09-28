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
  changeCourseSelection,
  courseSyncStates,
  isFinishedSyncJob,
  latestSuccessfulSync,
  selectAndSyncCourse,
  shouldAutoSync,
  startAccountCanvasSync,
  summarizeSyncJobs,
  type AccountSyncCourse,
  type AccountSyncSnapshot,
  type CourseSyncState,
  type SyncRejection,
} from "../../services/canvasAccountSync";
import {
  getCanvasConnection,
  getCanvasCoursePreferences,
  getCanvasSyncJob,
  listCanvasCourses,
  saveCanvasCoursePreferences,
  type CanvasSyncJobStatusView,
} from "../../services/canvasApi";
import { upsertActiveCanvasSyncJob } from "../../services/activeCanvasSyncJobStore";
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
  /** Per-course state for jobs started or resumed in this session. */
  readonly courseStates: Readonly<Record<string, CourseSyncState>>;
  /** The saved selection (synced courses); null until first known. */
  readonly selectedCourseIds: ReadonlySet<string> | null;
  /** Select one course and start its sync: the whole Sync tap. */
  readonly syncCourse: (course: AccountSyncCourse) => Promise<boolean>;
  /** Stop syncing one course. Its synced data and saved study work stay. */
  readonly unsyncCourse: (courseId: string) => Promise<boolean>;
}

const idle: AccountSyncSnapshot = { phase: "idle", total: 0, finished: 0, lastSyncedAt: null };
const CanvasSyncContext = createContext<CanvasSyncValue>({
  snapshot: idle,
  dataVersion: 0,
  sync: async () => {},
  courseStates: {},
  selectedCourseIds: null,
  syncCourse: async () => false,
  unsyncCourse: async () => false,
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
  const [courseStates, setCourseStates] = useState<Readonly<Record<string, CourseSyncState>>>({});
  const [selectedCourseIds, setSelectedCourseIds] = useState<ReadonlySet<string> | null>(null);
  const running = useRef(false);
  const lastAttemptAt = useRef<number | null>(null);
  const tracked = useRef(new Map<string, CanvasSyncJobStatusView>());
  const rejected = useRef<SyncRejection[]>([]);
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
    if (live.current) {
      setSnapshot((current) => ({ ...current, lastSyncedAt }));
      setSelectedCourseIds(new Set(inventory.data.selectedCourseIds));
    }
    return lastSyncedAt;
  }, [request]);

  const finish = useCallback(async () => {
    const summary = summarizeSyncJobs([...tracked.current.values()], rejected.current);
    diagnose("finished", { phase: summary.phase, courses: summary.total });
    if (live.current) setCourseStates(courseSyncStates([...tracked.current.values()], rejected.current));
    running.current = false;
    const lastSyncedAt = await refreshLastSynced();
    if (!live.current) return;
    setSnapshot((current) => ({ ...current, ...summary, lastSyncedAt: lastSyncedAt ?? current.lastSyncedAt }));
    setDataVersion((value) => value + 1);
  }, [refreshLastSynced]);

  // Poll the jobs this refresh started by id. The stored references are only
  // a recovery aid; a missing reference must never freeze the progress count.
  const poll = useCallback(async () => {
    clearTimeout(pollTimer.current);
    const input = request();
    if (!input || !live.current) return;
    if (AppState.currentState === "active") {
      try {
        const pending = [...tracked.current.values()].filter((job) => !isFinishedSyncJob(job));
        const results = await Promise.all(pending.map((job) => getCanvasSyncJob({ ...input, jobId: job.id })));
        for (const [index, result] of results.entries()) {
          if (result.ok) {
            tracked.current.set(result.data.id, result.data);
            await upsertActiveCanvasSyncJob(input.ownerUserId, result.data);
          } else if (result.error.status === 404) {
            // The server no longer knows this job; it can never finish.
            tracked.current.delete(pending[index]!.id);
            rejected.current.push({ courseId: pending[index]!.course.id, code: "job_not_found" });
          }
        }
      } catch {
        diagnose("poll_failed");
      }
      const summary = summarizeSyncJobs([...tracked.current.values()], rejected.current);
      if (!live.current) return;
      setCourseStates(courseSyncStates([...tracked.current.values()], rejected.current));
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
        startCourse: (course, jobType) =>
          startDurableCanvasSync({
            ...input,
            courseId: course.id,
            courseDisplayName: course.displayName,
            jobType,
          }),
      });
      diagnose("started", {
        phase: started.phase,
        accepted: started.jobs.length,
        rejected: started.rejected.map((item) => item.code),
      });
      tracked.current = new Map(started.jobs.map((job) => [job.id, job]));
      rejected.current = [...started.rejected];
      if (!live.current) return;
      setCourseStates(courseSyncStates(started.jobs, started.rejected));
      if (started.phase !== "syncing") {
        running.current = false;
        setSnapshot((current) => ({
          ...current,
          ...summarizeSyncJobs(started.jobs, started.rejected),
          phase: started.phase,
          lastSyncedAt: started.lastSyncedAt ?? current.lastSyncedAt,
        }));
        if (started.jobs.length > 0) setDataVersion((value) => value + 1);
        return;
      }
      setSnapshot((current) => ({
        ...current,
        ...summarizeSyncJobs(started.jobs, started.rejected),
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

  const selection = useMemo(() => ({
    readSelection: getCanvasCoursePreferences,
    saveSelection: saveCanvasCoursePreferences,
  }), []);

  // One course joins whatever is already being tracked, so a single-course
  // sync and an account refresh share one polling loop and one status line.
  const syncCourse = useCallback(async (course: AccountSyncCourse) => {
    const input = request();
    if (!input) return false;
    setCourseStates((current) => ({ ...current, [course.id]: "syncing" }));
    try {
      const started = await selectAndSyncCourse(input, course, {
        ...selection,
        startCourse: (item, jobType) =>
          startDurableCanvasSync({ ...input, courseId: item.id, courseDisplayName: item.displayName, jobType }),
      });
      diagnose("course_started", { phase: started.phase, accepted: started.jobs.length, rejected: started.rejected.map((item) => item.code) });
      if (!live.current) return started.jobs.length > 0;
      if (started.selectedCourseIds) setSelectedCourseIds(new Set(started.selectedCourseIds));
      rejected.current = [...rejected.current.filter((item) => item.courseId !== course.id), ...started.rejected];
      for (const job of started.jobs) tracked.current.set(job.id, job);
      setCourseStates(courseSyncStates([...tracked.current.values()], rejected.current));
      if (started.jobs.length === 0) return false;
      setSnapshot((current) => ({ ...current, ...summarizeSyncJobs([...tracked.current.values()], rejected.current) }));
      if (!running.current) {
        running.current = true;
        pollStartedAt.current = Date.now();
        clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(() => void poll(), POLL_MS);
      }
      return true;
    } catch {
      diagnose("course_start_failed");
      if (live.current) setCourseStates((current) => ({ ...current, [course.id]: "failed" }));
      return false;
    }
  }, [poll, request, selection]);

  const unsyncCourse = useCallback(async (courseId: string) => {
    const input = request();
    if (!input) return false;
    const changed = await changeCourseSelection(input, courseId, false, selection).catch(() => null);
    if (!changed?.ok || !live.current) return false;
    setSelectedCourseIds(new Set(changed.selectedCourseIds));
    setCourseStates((current) => {
      const { [courseId]: _removed, ...rest } = current;
      return rest;
    });
    setDataVersion((value) => value + 1);
    return true;
  }, [request, selection]);

  // On sign-in and each return to the foreground: resume jobs still running on
  // the server, otherwise refresh automatically when the data is stale.
  const resume = useCallback(async () => {
    const input = request();
    if (!input || running.current) return;
    const connection = await getCanvasConnection(input);
    if (!connection.ok || connection.data.connection?.status !== "active") return;
    const { jobs } = await reconcileCanvasSyncJobs(input);
    const active = jobs.filter((job) => !isFinishedSyncJob(job));
    if (active.length > 0 && live.current) {
      running.current = true;
      tracked.current = new Map(active.map((job) => [job.id, job]));
      rejected.current = [];
      setSnapshot((current) => ({ ...current, ...summarizeSyncJobs(active, []) }));
      setCourseStates(courseSyncStates(active, []));
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

  const value = useMemo(
    () => ({ snapshot, dataVersion, sync, courseStates, selectedCourseIds, syncCourse, unsyncCourse }),
    [snapshot, dataVersion, sync, courseStates, selectedCourseIds, syncCourse, unsyncCourse],
  );
  return <CanvasSyncContext.Provider value={value}>{children}</CanvasSyncContext.Provider>;
}
