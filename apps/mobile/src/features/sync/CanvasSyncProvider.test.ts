import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CanvasSyncJobStatusView } from "../../services/canvasApi";

const mocks = vi.hoisted(() => ({
  listCourses: vi.fn(),
  getJob: vi.fn(),
  start: vi.fn(),
  reconcile: vi.fn(),
  upsert: vi.fn(async () => undefined),
  readSelection: vi.fn(),
  saveSelection: vi.fn(),
}));

vi.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "token" } }) }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://api.example" }));
vi.mock("../../services/canvasApi", () => ({
  listCanvasCourses: mocks.listCourses,
  getCanvasSyncJob: mocks.getJob,
  getCanvasCoursePreferences: mocks.readSelection,
  saveCanvasCoursePreferences: mocks.saveSelection,
}));
vi.mock("../../services/canvasSyncJobCoordinator", () => ({ startDurableCanvasSync: mocks.start, reconcileCanvasSyncJobs: mocks.reconcile }));
vi.mock("../../services/activeCanvasSyncJobStore", () => ({ upsertActiveCanvasSyncJob: mocks.upsert }));

const { CanvasSyncProvider, useCanvasSync } = await import("./CanvasSyncProvider");

type SyncValue = ReturnType<typeof useCanvasSync>;
let latest: SyncValue | null = null;
function Probe() {
  latest = useCanvasSync();
  return null;
}
function job(id: string, status: CanvasSyncJobStatusView["status"], outcome: CanvasSyncJobStatusView["outcome"] = null) {
  return { id, status, outcome, jobType: "course_content", course: { id: `course-${id}`, displayName: id, courseCode: null }, createdAt: new Date().toISOString() } as CanvasSyncJobStatusView;
}
const inventory = (lastSuccessfulSyncAt: string | null) => ({
  ok: true,
  data: {
    selectedCourseIds: ["a", "b"],
    courses: ["a", "b"].map((id) => ({ id, displayName: id, selectable: true, selected: true, lastSync: { lastSuccessfulSyncAt } })),
    counts: {},
  },
});

let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  latest = null;
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.reconcile.mockResolvedValue({ jobs: [], newlyCompleted: [] });
});
afterEach(async () => {
  if (rendered) await act(async () => rendered!.unmount());
  rendered = undefined;
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    rendered = create(createElement(CanvasSyncProvider, null, createElement(Probe)));
  });
}

describe("CanvasSyncProvider", () => {
  it("finishes a refresh by polling started jobs directly, even when no stored reference survives", async () => {
    const fresh = new Date().toISOString();
    mocks.listCourses.mockResolvedValue(inventory(fresh));
    await mount();
    expect(latest!.snapshot.phase).toBe("idle");

    mocks.start.mockImplementation(async ({ courseId, jobType }: { courseId: string; jobType: string }) => ({ ok: true, data: { ...job(`job-${courseId}-${jobType}`, "running"), course: { id: courseId, displayName: courseId, courseCode: null } } }));
    // Reconciliation sees nothing (references lost); direct polling must still converge.
    mocks.getJob.mockImplementation(async ({ jobId }: { jobId: string }) => ({ ok: true, data: { ...job(jobId, "succeeded", jobId === "job-a-course_content" ? "partial" : "success"), course: { id: jobId.split("-")[1]!, displayName: "x", courseCode: null } } }));

    await act(async () => { await latest!.sync(); });
    expect(latest!.snapshot).toMatchObject({ phase: "syncing", total: 2, finished: 0 });
    const before = latest!.dataVersion;

    await act(async () => { await vi.advanceTimersByTimeAsync(4_100); });
    expect(mocks.getJob).toHaveBeenCalledTimes(4);
    expect(latest!.snapshot).toMatchObject({ phase: "limited", total: 2, finished: 2 });
    expect(latest!.dataVersion).toBe(before + 1);
  });

  it("refreshes automatically on launch when Canvas data is stale", async () => {
    mocks.listCourses.mockResolvedValue(inventory("2026-09-19T14:45:00.000Z"));
    mocks.start.mockResolvedValue({ ok: true, data: job("job-x", "running") });
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(mocks.start).toHaveBeenCalled();
    expect(latest!.snapshot.phase).toBe("syncing");
  });

  it("shows a calm failure when Canvas cannot be reached, and keeps the last sync time", async () => {
    const fresh = new Date(Date.now() - 14 * 60_000).toISOString();
    mocks.listCourses.mockResolvedValueOnce(inventory(fresh));
    await mount();
    mocks.listCourses.mockResolvedValueOnce({ ok: false, error: { code: "canvas_unavailable", message: "Bad gateway" } });
    await act(async () => { await latest!.sync(); });
    expect(latest!.snapshot).toMatchObject({ phase: "failed", lastSyncedAt: fresh });
  });

  it("syncs one tapped course in a single step and reports it synced when its jobs finish", async () => {
    const fresh = new Date().toISOString();
    mocks.listCourses.mockResolvedValue(inventory(fresh));
    mocks.readSelection.mockResolvedValue({ ok: true, data: { selectedCourseIds: ["a"] } });
    mocks.saveSelection.mockImplementation(async ({ selectedCourseIds }: { selectedCourseIds: string[] }) => ({ ok: true, data: { selectedCourseIds } }));
    mocks.start.mockImplementation(async ({ courseId, jobType }: { courseId: string; jobType: string }) => ({ ok: true, data: { ...job(`job-${courseId}-${jobType}`, "running"), course: { id: courseId, displayName: courseId, courseCode: null } } }));
    mocks.getJob.mockImplementation(async ({ jobId }: { jobId: string }) => ({ ok: true, data: { ...job(jobId, "succeeded", "success"), course: { id: "cit17", displayName: "CIT17", courseCode: null } } }));
    await mount();

    let started = false;
    await act(async () => { started = await latest!.syncCourse({ id: "cit17", displayName: "CIT17" }); });
    expect(started).toBe(true);
    expect(mocks.saveSelection).toHaveBeenCalledWith(expect.objectContaining({ selectedCourseIds: ["a", "cit17"] }));
    expect(latest!.courseStates.cit17).toBe("syncing");
    expect(latest!.selectedCourseIds?.has("cit17")).toBe(true);
    // The header orb reads this phase while the course syncs.
    expect(latest!.snapshot.phase).toBe("syncing");

    await act(async () => { await vi.advanceTimersByTimeAsync(4_100); });
    expect(latest!.courseStates.cit17).toBe("synced");
    expect(latest!.snapshot.phase).toBe("succeeded");
  });

  it("unsyncs by deselecting only that course and refreshes screens", async () => {
    mocks.listCourses.mockResolvedValue(inventory(new Date().toISOString()));
    mocks.readSelection.mockResolvedValue({ ok: true, data: { selectedCourseIds: ["a", "b"] } });
    mocks.saveSelection.mockImplementation(async ({ selectedCourseIds }: { selectedCourseIds: string[] }) => ({ ok: true, data: { selectedCourseIds } }));
    await mount();
    const before = latest!.dataVersion;
    await act(async () => { await latest!.unsyncCourse("a"); });
    expect(mocks.saveSelection).toHaveBeenCalledWith(expect.objectContaining({ selectedCourseIds: ["b"] }));
    expect([...latest!.selectedCourseIds!]).toEqual(["b"]);
    expect(latest!.dataVersion).toBe(before + 1);
    expect(mocks.start).not.toHaveBeenCalled();
  });
});
