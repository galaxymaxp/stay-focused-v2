import type {
  CanvasApiBaseInput,
  CanvasApiClientError,
  CanvasApiResult,
  CanvasCourseInventoryPayload,
  CanvasSyncJobStatusView,
  CanvasSyncJobType,
} from "./canvasApi";

/**
 * Account-level Canvas refresh: one action that re-synchronizes every course
 * the student selected, using the existing durable per-course jobs. It never
 * changes the selection and never infers deletion; the server job owns
 * pagination, routing and persistence.
 */
export interface AccountSyncCourse {
  readonly id: string;
  readonly displayName: string;
}

export type AccountSyncPhase =
  | "idle"
  | "syncing"
  | "succeeded"
  /** Every course refreshed, but Canvas withheld some areas (e.g. a Student cannot list course Files). */
  | "limited"
  /** At least one course failed or was rejected; retrying may help. */
  | "partial"
  | "failed"
  | "needs_setup"
  | "needs_reconnect"
  | "offline";

export interface AccountSyncSnapshot {
  readonly phase: AccountSyncPhase;
  readonly total: number;
  readonly finished: number;
  readonly lastSyncedAt: string | null;
}

/** Only courses the student selected and Canvas still allows are refreshed. */
export function selectedSyncCourses(
  payload: CanvasCourseInventoryPayload,
): readonly AccountSyncCourse[] {
  const selected = new Set(payload.selectedCourseIds);
  return payload.courses
    .filter((course) => selected.has(course.id) && course.selectable)
    .map((course) => ({ id: course.id, displayName: course.displayName }));
}

/** The newest successful sync among selected courses; null when none has synced. */
export function latestSuccessfulSync(
  payload: CanvasCourseInventoryPayload,
): string | null {
  const selected = new Set(payload.selectedCourseIds);
  let latest: number | null = null;
  for (const course of payload.courses) {
    if (!selected.has(course.id)) continue;
    const value = Date.parse(course.lastSync?.lastSuccessfulSyncAt ?? "");
    if (Number.isFinite(value) && (latest === null || value > latest)) latest = value;
  }
  return latest === null ? null : new Date(latest).toISOString();
}

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "expired"]);

export function isFinishedSyncJob(job: CanvasSyncJobStatusView): boolean {
  return TERMINAL.has(job.status);
}

export interface SyncRejection {
  readonly courseId: string;
  readonly code: string;
}

/**
 * Each course runs two durable jobs: content (materials, announcements,
 * assignments) and grades (submission status, so submitted work is not shown
 * as past due). Progress is per course: a course is finished when all of its
 * jobs are. A failed or rejected job makes the refresh "partial" (actionable);
 * Canvas areas withheld from students make it "limited", never success.
 */
export function summarizeSyncJobs(
  jobs: readonly CanvasSyncJobStatusView[],
  rejected: readonly SyncRejection[],
): Pick<AccountSyncSnapshot, "phase" | "total" | "finished"> {
  const courses = new Map<string, { done: boolean; failed: boolean }>();
  const mark = (courseId: string, done: boolean, failed: boolean) => {
    const entry = courses.get(courseId) ?? { done: true, failed: false };
    courses.set(courseId, { done: entry.done && done, failed: entry.failed || failed });
  };
  for (const job of jobs) mark(job.course.id, isFinishedSyncJob(job), isFinishedSyncJob(job) && job.status !== "succeeded");
  for (const item of rejected) mark(item.courseId, true, true);
  const total = courses.size;
  const finished = [...courses.values()].filter((course) => course.done).length;
  if (total === 0) return { phase: "idle", total, finished };
  if (finished < total) return { phase: "syncing", total, finished };
  const failed = [...courses.values()].filter((course) => course.failed).length;
  if (failed === total) return { phase: "failed", total, finished };
  if (failed > 0) return { phase: "partial", total, finished };
  const limited = jobs.some((job) => job.outcome === "partial");
  return { phase: limited ? "limited" : "succeeded", total, finished };
}

/** Maps a request failure to a calm state without exposing provider details. */
export function phaseForSyncError(error: CanvasApiClientError): AccountSyncPhase {
  switch (error.code) {
    case "network_error":
    case "request_aborted":
      return "offline";
    case "missing_connection":
      return "needs_setup";
    case "invalid_canvas_token":
    case "corrupted_credentials":
    case "permission_denied":
    case "unauthorized":
      return "needs_reconnect";
    default:
      return "failed";
  }
}

export const AUTO_SYNC_STALE_MS = 6 * 60 * 60 * 1_000;
const AUTO_SYNC_RETRY_MS = 30 * 60 * 1_000;

/** Refresh automatically only when data is old and no recent attempt was made. */
export function shouldAutoSync(input: {
  readonly lastSyncedAt: string | null;
  readonly lastAttemptAt: number | null;
  readonly now: number;
}): boolean {
  if (input.lastAttemptAt !== null && input.now - input.lastAttemptAt < AUTO_SYNC_RETRY_MS) {
    return false;
  }
  const last = Date.parse(input.lastSyncedAt ?? "");
  return !Number.isFinite(last) || input.now - last >= AUTO_SYNC_STALE_MS;
}

export function describeSyncAge(iso: string | null, now = Date.now()): string {
  const value = Date.parse(iso ?? "");
  if (!Number.isFinite(value)) return "Not synced yet";
  const minutes = Math.max(0, Math.floor((now - value) / 60_000));
  if (minutes < 1) return "Synced just now";
  if (minutes < 60) return `Synced ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `Synced ${days} day${days === 1 ? "" : "s"} ago`;
}

/** Short user-facing line for each state. Never includes raw server text. */
export function describeSyncState(snapshot: AccountSyncSnapshot, now = Date.now()): {
  readonly title: string;
  readonly detail: string | null;
  readonly action: "retry" | "settings" | null;
} {
  const age = describeSyncAge(snapshot.lastSyncedAt, now);
  const last = snapshot.lastSyncedAt ? `Last ${age.charAt(0).toLowerCase()}${age.slice(1)}` : null;
  switch (snapshot.phase) {
    case "syncing":
      return {
        title: "Syncing Canvas…",
        detail: snapshot.total > 0 ? `${snapshot.finished} of ${snapshot.total} courses` : null,
        action: null,
      };
    case "failed":
      return { title: "Canvas couldn’t be refreshed", detail: last, action: "retry" };
    case "offline":
      return { title: "You’re offline", detail: last, action: "retry" };
    case "partial":
      return { title: "Some courses couldn’t be refreshed", detail: age, action: "retry" };
    case "limited":
      return { title: age, detail: "Some Canvas areas aren’t shared with students", action: null };
    case "needs_setup":
      return { title: "Choose courses to sync", detail: null, action: "settings" };
    case "needs_reconnect":
      return { title: "Reconnect Canvas", detail: last, action: "settings" };
    default:
      return { title: age, detail: null, action: null };
  }
}

export interface AccountSyncDependencies {
  readonly listCourses: (
    input: CanvasApiBaseInput,
  ) => Promise<CanvasApiResult<CanvasCourseInventoryPayload>>;
  readonly startCourse: (
    course: AccountSyncCourse,
    jobType: CanvasSyncJobType,
  ) => Promise<CanvasApiResult<CanvasSyncJobStatusView>>;
}

export interface AccountSyncStart {
  readonly phase: AccountSyncPhase;
  readonly lastSyncedAt: string | null;
  readonly jobs: readonly CanvasSyncJobStatusView[];
  readonly rejected: readonly SyncRejection[];
}

/** Content and grade jobs for each selected course. Only codes are kept for diagnostics. */
export const ACCOUNT_SYNC_JOB_TYPES: readonly CanvasSyncJobType[] = ["course_content", "course_grades"];

/** Starts the durable jobs for every selected course. */
export async function startAccountCanvasSync(
  input: CanvasApiBaseInput,
  dependencies: AccountSyncDependencies,
): Promise<AccountSyncStart> {
  const inventory = await dependencies.listCourses(input);
  if (!inventory.ok) {
    return { phase: phaseForSyncError(inventory.error), lastSyncedAt: null, jobs: [], rejected: [] };
  }
  const lastSyncedAt = latestSuccessfulSync(inventory.data);
  const courses = selectedSyncCourses(inventory.data);
  if (courses.length === 0) {
    return { phase: "needs_setup", lastSyncedAt, jobs: [], rejected: [] };
  }
  const results = await Promise.all(
    courses.flatMap((course) =>
      ACCOUNT_SYNC_JOB_TYPES.map(async (jobType) => ({ course, result: await dependencies.startCourse(course, jobType) })),
    ),
  );
  const jobs = results.flatMap(({ result }) => (result.ok ? [result.data] : []));
  const rejected = results.flatMap(({ course, result }) =>
    result.ok ? [] : [{ courseId: course.id, code: result.error.code }],
  );
  const firstError = results.find(({ result }) => !result.ok)?.result;
  const phase =
    jobs.length === 0 && firstError && !firstError.ok
      ? phaseForSyncError(firstError.error)
      : summarizeSyncJobs(jobs, rejected).phase;
  return { phase, lastSyncedAt, jobs, rejected };
}

/** What one course's sync looks like to the student: never raw job stages. */
export type CourseSyncState = "syncing" | "synced" | "failed";

/** Per-course state from the jobs this session started or resumed. */
export function courseSyncStates(
  jobs: readonly CanvasSyncJobStatusView[],
  rejected: readonly SyncRejection[],
): Readonly<Record<string, CourseSyncState>> {
  const states: Record<string, CourseSyncState> = {};
  const rank: Record<CourseSyncState, number> = { synced: 0, syncing: 1, failed: 2 };
  const mark = (courseId: string, state: CourseSyncState) => {
    const current = states[courseId];
    if (!current || rank[state] > rank[current]) states[courseId] = state;
  };
  for (const job of jobs) {
    mark(job.course.id, !isFinishedSyncJob(job) ? "syncing" : job.status === "succeeded" ? "synced" : "failed");
  }
  for (const item of rejected) mark(item.courseId, "failed");
  return states;
}

export interface CourseSelectionDependencies {
  readonly readSelection: (
    input: CanvasApiBaseInput,
  ) => Promise<CanvasApiResult<{ readonly selectedCourseIds: readonly string[] }>>;
  readonly saveSelection: (
    input: CanvasApiBaseInput & { readonly selectedCourseIds: readonly string[] },
  ) => Promise<CanvasApiResult<{ readonly selectedCourseIds: readonly string[] }>>;
}

export type CourseSelectionChange =
  | { readonly ok: true; readonly selectedCourseIds: readonly string[] }
  | { readonly ok: false; readonly phase: AccountSyncPhase };

/**
 * Adds or removes one course from the saved selection. It re-reads the saved
 * selection first, so a change made elsewhere is never overwritten, and it
 * saves nothing when the course is already in the requested state.
 */
export async function changeCourseSelection(
  input: CanvasApiBaseInput,
  courseId: string,
  selected: boolean,
  dependencies: CourseSelectionDependencies,
): Promise<CourseSelectionChange> {
  const current = await dependencies.readSelection(input);
  if (!current.ok) return { ok: false, phase: phaseForSyncError(current.error) };
  const ids = current.data.selectedCourseIds;
  if (ids.includes(courseId) === selected) return { ok: true, selectedCourseIds: ids };
  const next = selected ? [...ids, courseId] : ids.filter((id) => id !== courseId);
  const saved = await dependencies.saveSelection({ ...input, selectedCourseIds: next });
  return saved.ok
    ? { ok: true, selectedCourseIds: saved.data.selectedCourseIds }
    : { ok: false, phase: phaseForSyncError(saved.error) };
}

/**
 * The whole "Sync" tap for one course: select it, then start the same durable
 * content and grade jobs as the account refresh. No separate Save step.
 */
export async function selectAndSyncCourse(
  input: CanvasApiBaseInput,
  course: AccountSyncCourse,
  dependencies: CourseSelectionDependencies & Pick<AccountSyncDependencies, "startCourse">,
): Promise<AccountSyncStart & { readonly selectedCourseIds: readonly string[] | null }> {
  const selection = await changeCourseSelection(input, course.id, true, dependencies);
  if (!selection.ok) {
    return { phase: selection.phase, lastSyncedAt: null, jobs: [], rejected: [{ courseId: course.id, code: selection.phase }], selectedCourseIds: null };
  }
  const results = await Promise.all(
    ACCOUNT_SYNC_JOB_TYPES.map((jobType) => dependencies.startCourse(course, jobType)),
  );
  const jobs = results.flatMap((result) => (result.ok ? [result.data] : []));
  const rejected = results.flatMap((result) => (result.ok ? [] : [{ courseId: course.id, code: result.error.code }]));
  return { phase: summarizeSyncJobs(jobs, rejected).phase, lastSyncedAt: null, jobs, rejected, selectedCourseIds: selection.selectedCourseIds };
}
