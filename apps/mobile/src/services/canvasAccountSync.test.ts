import { describe, expect, it, vi } from "vitest";

import {
  changeCourseSelection,
  courseSyncStates,
  describeSyncAge,
  describeSyncState,
  latestSuccessfulSync,
  phaseForSyncError,
  selectAndSyncCourse,
  selectedSyncCourses,
  shouldAutoSync,
  startAccountCanvasSync,
  summarizeSyncJobs,
} from "./canvasAccountSync";
import type { CanvasCourseInventoryItem, CanvasCourseInventoryPayload, CanvasSyncJobStatusView } from "./canvasApi";

function course(id: string, overrides: Partial<CanvasCourseInventoryItem> = {}): CanvasCourseInventoryItem {
  return {
    id,
    displayName: `Course ${id}`,
    courseCode: null,
    workflowState: "available",
    startAt: null,
    endAt: null,
    term: null,
    classification: "likely_current",
    selectable: true,
    unavailableReason: null,
    selected: true,
    lastSync: null,
    ...overrides,
  } as CanvasCourseInventoryItem;
}
function inventory(courses: CanvasCourseInventoryItem[], selected: string[]): CanvasCourseInventoryPayload {
  return { courses, selectedCourseIds: selected, counts: { total: courses.length, likelyCurrent: 0, pastOrConcluded: 0, otherOrUncertain: 0, unavailable: 0 } } as CanvasCourseInventoryPayload;
}
function job(
  id: string,
  status: CanvasSyncJobStatusView["status"],
  outcome: CanvasSyncJobStatusView["outcome"] = null,
  courseId = id,
  jobType: CanvasSyncJobStatusView["jobType"] = "course_content",
) {
  return { id, status, outcome, jobType, course: { id: courseId, displayName: courseId, courseCode: null } } as CanvasSyncJobStatusView;
}
const input = { apiBaseUrl: "https://api.example", accessToken: "token" };

describe("account Canvas sync", () => {
  it("refreshes only selected, selectable courses and never changes the selection", async () => {
    const payload = inventory([course("a"), course("b", { selectable: false }), course("c")], ["a", "b"]);
    expect(selectedSyncCourses(payload).map((item) => item.id)).toEqual(["a"]);
    const startCourse = vi.fn(async (_course: { id: string }, jobType: CanvasSyncJobStatusView["jobType"]) => ({ ok: true as const, data: job(`job-a-${jobType}`, "queued", null, "a", jobType) }));
    const started = await startAccountCanvasSync(input, { listCourses: async () => ({ ok: true, data: payload }), startCourse });
    // Content and grades (submission status) for the one eligible course.
    expect(startCourse.mock.calls.map(([item, jobType]) => [item.id, jobType])).toEqual([["a", "course_content"], ["a", "course_grades"]]);
    expect(started).toMatchObject({ phase: "syncing", rejected: [] });
    expect(started.jobs).toHaveLength(2);
  });

  it("reports the newest successful sync among selected courses only", () => {
    const payload = inventory([
      course("a", { lastSync: { status: "success", startedAt: null, completedAt: null, lastCheckedAt: null, lastSuccessfulSyncAt: "2026-09-19T14:45:00.000Z", failureCode: null } } as Partial<CanvasCourseInventoryItem>),
      course("b", { lastSync: { status: "success", startedAt: null, completedAt: null, lastCheckedAt: null, lastSuccessfulSyncAt: "2026-09-17T00:00:00.000Z", failureCode: null } } as Partial<CanvasCourseInventoryItem>),
      course("z", { selected: false, lastSync: { status: "success", startedAt: null, completedAt: null, lastCheckedAt: null, lastSuccessfulSyncAt: "2026-09-24T00:00:00.000Z", failureCode: null } } as Partial<CanvasCourseInventoryItem>),
    ], ["a", "b"]);
    expect(latestSuccessfulSync(payload)).toBe("2026-09-19T14:45:00.000Z");
  });

  it("never reports success while a job runs, and never reports partial results as success", () => {
    expect(summarizeSyncJobs([job("a", "succeeded"), job("b", "running")], [])).toMatchObject({ phase: "syncing", finished: 1, total: 2 });
    expect(summarizeSyncJobs([job("a", "succeeded", "success"), job("b", "succeeded", "unchanged")], []).phase).toBe("succeeded");
    // Canvas withholding an area (Student permissions) is fresh-but-limited, never plain success.
    expect(summarizeSyncJobs([job("a", "succeeded", "partial")], []).phase).toBe("limited");
    expect(summarizeSyncJobs([job("a", "succeeded"), job("b", "failed")], []).phase).toBe("partial");
    expect(summarizeSyncJobs([job("a", "succeeded")], [{ courseId: "b", code: "course_unavailable" }]).phase).toBe("partial");
    expect(summarizeSyncJobs([job("a", "failed")], []).phase).toBe("failed");
  });

  it("counts progress per course: a course finishes when its content and grade jobs both finish", () => {
    const content = job("c-a", "succeeded", "success", "a");
    const grades = job("g-a", "running", null, "a", "course_grades");
    const other = job("c-b", "succeeded", "success", "b");
    expect(summarizeSyncJobs([content, grades, other], [])).toMatchObject({ phase: "syncing", total: 2, finished: 1 });
    expect(summarizeSyncJobs([content, { ...grades, status: "succeeded" }, other], [])).toMatchObject({ phase: "succeeded", total: 2, finished: 2 });
    expect(summarizeSyncJobs([content, { ...grades, status: "failed" }, other], []).phase).toBe("partial");
  });

  it("maps failures to calm states without surfacing provider details", async () => {
    expect(phaseForSyncError({ code: "network_error", message: "fetch failed at 10.0.0.1" })).toBe("offline");
    expect(phaseForSyncError({ code: "invalid_canvas_token", message: "401" })).toBe("needs_reconnect");
    expect(phaseForSyncError({ code: "missing_connection", message: "none" })).toBe("needs_setup");
    expect(phaseForSyncError({ code: "canvas_unavailable", message: "502 Bad Gateway" })).toBe("failed");
    const started = await startAccountCanvasSync(input, {
      listCourses: async () => ({ ok: false, error: { code: "canvas_unavailable", message: "Stack trace…" } }),
      startCourse: vi.fn(),
    });
    expect(started.phase).toBe("failed");
    const copy = describeSyncState({ phase: "failed", total: 0, finished: 0, lastSyncedAt: new Date(Date.now() - 14 * 60_000).toISOString() });
    expect(copy).toEqual({ title: "Canvas couldn’t be refreshed", detail: "Last synced 14 minutes ago", action: "retry" });
  });

  it("records per-course rejections by code only and still tracks accepted courses", async () => {
    const payload = inventory([course("a"), course("b")], ["a", "b"]);
    const started = await startAccountCanvasSync(input, {
      listCourses: async () => ({ ok: true, data: payload }),
      startCourse: async (item) =>
        item.id === "a"
          ? { ok: true as const, data: job("job-a", "running", null, "a") }
          : { ok: false as const, error: { code: "course_unavailable" as const, message: "Private detail" } },
    });
    expect(started.rejected).toEqual([{ courseId: "b", code: "course_unavailable" }, { courseId: "b", code: "course_unavailable" }]);
    expect(started.phase).toBe("syncing");
  });

  it("asks for setup when no course is selected", async () => {
    const started = await startAccountCanvasSync(input, { listCourses: async () => ({ ok: true, data: inventory([course("a")], []) }), startCourse: vi.fn() });
    expect(started.phase).toBe("needs_setup");
  });

  it("refreshes automatically only when data is stale and no recent attempt exists", () => {
    const now = Date.parse("2026-09-25T01:00:00.000Z");
    expect(shouldAutoSync({ lastSyncedAt: "2026-09-19T14:45:00.000Z", lastAttemptAt: null, now })).toBe(true);
    expect(shouldAutoSync({ lastSyncedAt: null, lastAttemptAt: null, now })).toBe(true);
    expect(shouldAutoSync({ lastSyncedAt: "2026-09-25T00:30:00.000Z", lastAttemptAt: null, now })).toBe(false);
    expect(shouldAutoSync({ lastSyncedAt: "2026-09-19T14:45:00.000Z", lastAttemptAt: now - 60_000, now })).toBe(false);
  });

  it("keeps a permanent Canvas permission limit quiet, but failures actionable", () => {
    const now = Date.parse("2026-09-25T01:00:00.000Z");
    expect(describeSyncState({ phase: "limited", total: 6, finished: 6, lastSyncedAt: "2026-09-25T00:59:40.000Z" }, now)).toEqual({ title: "Synced just now", detail: "Some Canvas areas aren’t shared with students", action: null });
    expect(describeSyncState({ phase: "partial", total: 6, finished: 6, lastSyncedAt: "2026-09-25T00:59:40.000Z" }, now).action).toBe("retry");
  });

  it("describes sync age in plain language", () => {
    const now = Date.parse("2026-09-25T01:00:00.000Z");
    expect(describeSyncAge(null, now)).toBe("Not synced yet");
    expect(describeSyncAge("2026-09-25T00:59:40.000Z", now)).toBe("Synced just now");
    expect(describeSyncAge("2026-09-25T00:46:00.000Z", now)).toBe("Synced 14 minutes ago");
    expect(describeSyncAge("2026-09-19T00:00:00.000Z", now)).toBe("Synced 6 days ago");
  });
});

describe("one-tap course sync", () => {
  function selection(initial: string[]) {
    let saved = [...initial];
    return {
      get saved() { return saved; },
      readSelection: vi.fn(async () => ({ ok: true as const, data: { selectedCourseIds: saved } })),
      saveSelection: vi.fn(async (request: { selectedCourseIds: readonly string[] }) => {
        saved = [...request.selectedCourseIds];
        return { ok: true as const, data: { selectedCourseIds: saved } };
      }),
    };
  }

  it("selects the course and starts content and grade jobs with no separate save step", async () => {
    const store = selection(["other"]);
    const startCourse = vi.fn(async (item: { id: string }, jobType: CanvasSyncJobStatusView["jobType"]) => ({ ok: true as const, data: job(`${item.id}-${jobType}`, "queued", null, item.id, jobType) }));
    const started = await selectAndSyncCourse(input, { id: "cit17", displayName: "CIT17" }, { ...store, startCourse });
    // The existing selection is preserved; the course is added, not substituted.
    expect(store.saved).toEqual(["other", "cit17"]);
    expect(startCourse.mock.calls.map(([, jobType]) => jobType)).toEqual(["course_content", "course_grades"]);
    expect(started).toMatchObject({ phase: "syncing", rejected: [], selectedCourseIds: ["other", "cit17"] });
  });

  it("never starts jobs when the selection could not be saved", async () => {
    const startCourse = vi.fn();
    const started = await selectAndSyncCourse(input, { id: "cit17", displayName: "CIT17" }, {
      readSelection: async () => ({ ok: false as const, error: { code: "network_error", message: "offline" } }),
      saveSelection: vi.fn(),
      startCourse,
    });
    expect(startCourse).not.toHaveBeenCalled();
    expect(started).toMatchObject({ phase: "offline", jobs: [], rejected: [{ courseId: "cit17", code: "offline" }] });
  });

  it("unsyncs by removing only that course and saves nothing when it is already unsynced", async () => {
    const store = selection(["a", "b"]);
    expect(await changeCourseSelection(input, "a", false, store)).toEqual({ ok: true, selectedCourseIds: ["b"] });
    expect(await changeCourseSelection(input, "a", false, store)).toEqual({ ok: true, selectedCourseIds: ["b"] });
    expect(store.saveSelection).toHaveBeenCalledOnce();
  });

  it("states each course simply: syncing until every job finishes, failed if any failed", () => {
    expect(courseSyncStates([
      job("a1", "succeeded", "success", "a"), job("a2", "running", null, "a", "course_grades"),
      job("b1", "succeeded", "unchanged", "b"), job("b2", "succeeded", "success", "b", "course_grades"),
      job("c1", "succeeded", "success", "c"),
    ], [{ courseId: "c", code: "rate_limited" }])).toEqual({ a: "syncing", b: "synced", c: "failed" });
  });
});
