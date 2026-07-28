import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
    setItem: vi.fn(async (key: string, value: string) => storage.set(key, value)),
  },
}));

const {
  readActiveCanvasSyncJobs,
  reserveCanvasSyncIntent,
  upsertActiveCanvasSyncJob,
} = await import("./activeCanvasSyncJobStore");

describe("active Canvas sync job store", () => {
  beforeEach(() => storage.clear());

  it("restores the same pending intent and idempotency key after runtime restart", async () => {
    const first = await reserveCanvasSyncIntent(intent());
    const restored = await reserveCanvasSyncIntent(intent());

    expect(restored.idempotencyKey).toBe(first.idempotencyKey);
    expect(restored.jobId).toBeNull();
    expect(await readActiveCanvasSyncJobs("user-1")).toEqual([first]);
  });

  it("replaces a pending intent with its accepted durable job", async () => {
    const pending = await reserveCanvasSyncIntent(intent());
    await upsertActiveCanvasSyncJob("user-1", acceptedJob());

    const [restored] = await readActiveCanvasSyncJobs("user-1");
    expect(restored).toMatchObject({
      idempotencyKey: pending.idempotencyKey,
      jobId: "job-1",
      lastKnownStatus: "queued",
    });
  });

  it("does not expose one owner's jobs to another owner", async () => {
    await reserveCanvasSyncIntent(intent());

    expect(await readActiveCanvasSyncJobs("user-2")).toEqual([]);
  });
});

function intent() {
  return {
    courseDisplayName: "Neutral Biology",
    courseId: "course-1",
    jobType: "course_content" as const,
    ownerUserId: "user-1",
  };
}

function acceptedJob() {
  return {
    acceptedAt: "2026-07-28T00:00:00.000Z",
    attemptCount: 0,
    cancellationRequestedAt: null,
    completedAt: null,
    course: {
      courseCode: "BIO-101",
      displayName: "Neutral Biology",
      id: "course-1",
    },
    createdAt: "2026-07-28T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType: "course_content" as const,
    progress: {
      completedUnits: 0,
      message: "Waiting to start",
      totalUnits: 1,
      unitLabel: "operations" as const,
    },
    resultAvailable: false,
    resultSummary: null,
    retryable: false,
    safeErrorMessage: null,
    stage: "waiting_to_start" as const,
    startedAt: null,
    status: "queued" as const,
    updatedAt: "2026-07-28T00:00:00.000Z",
  };
}
