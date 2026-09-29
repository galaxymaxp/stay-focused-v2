import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CanvasApiResult, CanvasSyncJobStatusView } from "./canvasApi";

const storage = vi.hoisted(() => new Map<string, string>());
const api = vi.hoisted(() => ({
  start: vi.fn(),
  get: vi.fn(),
}));

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
}));
vi.mock("./canvasApi", () => ({
  startCanvasCourseSyncJob: api.start,
  startCanvasCourseGradeSyncJob: vi.fn(),
  getCanvasSyncJob: api.get,
  cancelCanvasSyncJob: vi.fn(),
  retryCanvasSyncJob: vi.fn(),
}));

const { reconcileCanvasSyncJobs, startDurableCanvasSync, isReplayedFinishedJob } = await import("./canvasSyncJobCoordinator");
const { readActiveCanvasSyncJobs, upsertActiveCanvasSyncJob } = await import("./activeCanvasSyncJobStore");

const base = { apiBaseUrl: "https://api.example", accessToken: "token", ownerUserId: "user-1" };
const request = { ...base, courseId: "course-1", courseDisplayName: "Neutral Biology", jobType: "course_content" as const };

function job(overrides: Partial<CanvasSyncJobStatusView> = {}): CanvasSyncJobStatusView {
  const now = new Date().toISOString();
  return {
    id: "job-new",
    jobType: "course_content",
    status: "queued",
    stage: "waiting_to_start",
    outcome: null,
    progress: { completedUnits: 0, totalUnits: null, unitLabel: "operations", message: "Waiting to start" },
    course: { id: "course-1", displayName: "Neutral Biology", courseCode: null },
    createdAt: now,
    acceptedAt: now,
    startedAt: null,
    updatedAt: now,
    completedAt: null,
    failedAt: null,
    cancellationRequestedAt: null,
    errorCode: null,
    safeErrorMessage: null,
    retryable: false,
    attemptCount: 0,
    resultAvailable: false,
    resultSummary: null,
    ...overrides,
  };
}
const ok = (data: CanvasSyncJobStatusView): CanvasApiResult<CanvasSyncJobStatusView> => ({ ok: true, data });

describe("durable Canvas sync coordinator", () => {
  beforeEach(() => {
    storage.clear();
    api.start.mockReset();
    api.get.mockReset();
  });

  it("starts a new job instead of replaying a stale 'running' reference from an earlier sync", async () => {
    // A job from days ago that the app last saw running (the app left before it finished).
    const old = job({ id: "job-old", status: "running", createdAt: "2026-09-19T14:41:56.000Z", updatedAt: "2026-09-19T14:42:00.000Z" });
    await upsertActiveCanvasSyncJob("user-1", old);
    const oldKey = (await readActiveCanvasSyncJobs("user-1"))[0]!.idempotencyKey;
    api.start.mockResolvedValue(ok(job()));

    const result = await startDurableCanvasSync(request);

    expect(result).toMatchObject({ ok: true, data: { id: "job-new" } });
    const sentKey = api.start.mock.calls[0]![0].idempotencyKey as string;
    expect(sentKey).not.toBe(oldKey);
    expect((await readActiveCanvasSyncJobs("user-1"))[0]).toMatchObject({ jobId: "job-new", lastKnownStatus: "queued" });
  });

  it("detects a replayed finished job and submits once more under a fresh key", async () => {
    const replay = job({ id: "job-old", status: "succeeded", createdAt: "2026-09-19T14:41:56.000Z" });
    api.start.mockResolvedValueOnce(ok(replay)).mockResolvedValueOnce(ok(job()));

    const result = await startDurableCanvasSync(request);

    expect(api.start).toHaveBeenCalledTimes(2);
    expect(api.start.mock.calls[0]![0].idempotencyKey).not.toBe(api.start.mock.calls[1]![0].idempotencyKey);
    expect(result).toMatchObject({ ok: true, data: { id: "job-new", status: "queued" } });
  });

  it("reports the course's running job when the server says a sync is already in progress", async () => {
    await upsertActiveCanvasSyncJob("user-1", job({ id: "job-running", status: "running" }));
    api.start.mockResolvedValue({ ok: false, error: { code: "sync_in_progress", message: "Busy", status: 409 } });
    api.get.mockResolvedValue(ok(job({ id: "job-running", status: "running" })));

    const result = await startDurableCanvasSync(request);

    expect(api.get).toHaveBeenCalledWith(expect.objectContaining({ jobId: "job-running" }));
    expect(result).toMatchObject({ ok: true, data: { id: "job-running", status: "running" } });
  });

  it("keeps reusing an unacknowledged submission key so a lost response cannot duplicate a job", async () => {
    api.start.mockResolvedValueOnce({ ok: false, error: { code: "network_error", message: "Offline" } });
    await startDurableCanvasSync(request);
    api.start.mockResolvedValueOnce(ok(job()));
    await startDurableCanvasSync(request);
    expect(api.start.mock.calls[0]![0].idempotencyKey).toBe(api.start.mock.calls[1]![0].idempotencyKey);
  });

  it("stops tracking a job the server no longer knows", async () => {
    await upsertActiveCanvasSyncJob("user-1", job({ id: "job-gone", status: "running" }));
    api.get.mockResolvedValue({ ok: false, error: { code: "unknown_api_error", message: "Missing", status: 404 } });

    const reconciliation = await reconcileCanvasSyncJobs(base);

    expect(reconciliation.jobs).toEqual([]);
    expect(await readActiveCanvasSyncJobs("user-1")).toEqual([]);
  });

  it("restores a failed job for a visible manual retry without submitting a new job", async () => {
    await upsertActiveCanvasSyncJob("user-1", job({ id: "job-failed", status: "failed" }));
    api.get.mockResolvedValue(ok(job({ id: "job-failed", status: "failed" })));
    const reconciliation = await reconcileCanvasSyncJobs(base);
    expect(reconciliation.jobs).toMatchObject([{ id: "job-failed", status: "failed" }]);
    expect(api.start).not.toHaveBeenCalled();
  });

  it("treats only finished jobs created before the request as replays", () => {
    const requestedAt = Date.parse("2026-09-25T01:00:00.000Z");
    expect(isReplayedFinishedJob(job({ status: "succeeded", createdAt: "2026-09-19T14:41:56.000Z" }), requestedAt)).toBe(true);
    expect(isReplayedFinishedJob(job({ status: "running", createdAt: "2026-09-19T14:41:56.000Z" }), requestedAt)).toBe(false);
    expect(isReplayedFinishedJob(job({ status: "succeeded", createdAt: "2026-09-25T01:00:10.000Z" }), requestedAt)).toBe(false);
  });
});
