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
}));

vi.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } }));
vi.mock("../../auth", () => ({ useAuth: () => ({ session: { user: { id: "owner" }, accessToken: "token" } }) }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "https://api.example" }));
vi.mock("../../services/canvasApi", () => ({ listCanvasCourses: mocks.listCourses, getCanvasSyncJob: mocks.getJob }));
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

    mocks.start.mockImplementation(async ({ courseId }: { courseId: string }) => ({ ok: true, data: job(`job-${courseId}`, "running") }));
    // Reconciliation sees nothing (references lost); direct polling must still converge.
    mocks.getJob.mockImplementation(async ({ jobId }: { jobId: string }) => ({ ok: true, data: job(jobId, "succeeded", jobId === "job-a" ? "partial" : "success") }));

    await act(async () => { await latest!.sync(); });
    expect(latest!.snapshot).toMatchObject({ phase: "syncing", total: 2, finished: 0 });
    const before = latest!.dataVersion;

    await act(async () => { await vi.advanceTimersByTimeAsync(4_100); });
    expect(mocks.getJob).toHaveBeenCalledTimes(2);
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
});
