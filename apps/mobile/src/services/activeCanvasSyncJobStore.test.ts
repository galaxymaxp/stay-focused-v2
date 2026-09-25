import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
      return storage.get(key) ?? null;
    }),
    removeItem: vi.fn(async (key: string) => storage.delete(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
      storage.set(key, value);
    }),
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

  it("keeps every course's intent when several syncs start at once", async () => {
    // Real SecureStore calls are asynchronous; interleaved read-modify-write
    // cycles on the single key used to drop intents.
    const courses = ["c1", "c2", "c3", "c4", "c5", "c6"];
    const intents = await Promise.all(courses.map((courseId) => reserveCanvasSyncIntent({ ...intent(), courseId })));
    await Promise.all(intents.map((item, index) => upsertActiveCanvasSyncJob("user-1", { ...acceptedJob(), id: `job-${index}`, course: { id: item.courseId, displayName: "Course", courseCode: null } })));
    const stored = await readActiveCanvasSyncJobs("user-1");
    expect(stored.map((item) => item.courseId).sort()).toEqual(courses);
    expect(stored.every((item) => item.jobId?.startsWith("job-"))).toBe(true);
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
