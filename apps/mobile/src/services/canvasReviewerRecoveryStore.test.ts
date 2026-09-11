import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  },
}));

// The store import must follow the hoisted storage mock.
// eslint-disable-next-line import/first
import {
  acceptCanvasReviewerRecovery,
  beginCanvasReviewerRecovery,
  clearCanvasReviewerRecoveryForOwner,
  findCanvasReviewerRecoveryCandidate,
  isUncertainCanvasReviewerSubmissionExpired,
  matchesCanvasReviewerRecoveryJob,
  prepareCanvasReviewerRetryRecovery,
  readCanvasReviewerRecovery,
  removeCanvasReviewerRecovery,
  shouldDiscardCanvasReviewerRecoveryAfterStatusError,
} from "./canvasReviewerRecoveryStore";

const STORAGE_KEY = "stay-focused-v2.canvas-reviewer-recovery.v1";

describe("Canvas Reviewer recovery persistence", () => {
  beforeEach(() => {
    values.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T00:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("stores only the small user-scoped identity before submission", async () => {
    const record = await begin();
    const serialized = values.get(STORAGE_KEY) ?? "";

    expect(record).toMatchObject({
      version: 1,
      ownerUserId: "user-a",
      jobId: null,
      courseId: "course-1",
      canvasItemIds: ["file:source-1"],
      sourceCharacterCount: 42,
    });
    expect(serialized).not.toContain("private source body");
    expect(serialized).not.toMatch(/accessToken|refreshToken|canvasPat/i);
  });

  it("persists the exact durable job identity after acceptance", async () => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());

    expect(accepted).toMatchObject({
      jobId: "job-1",
      jobSourceVersionId: "source-version-1",
      acceptedAt: "2026-09-12T00:00:01.000Z",
    });
    await expect(readCanvasReviewerRecovery("user-a")).resolves.toEqual(accepted);
  });

  it("restores course and source identity after component recreation", async () => {
    await acceptCanvasReviewerRecovery(await begin(), job());

    await expect(readCanvasReviewerRecovery("user-a")).resolves.toMatchObject({
      courseId: "course-1",
      courseName: "Course One",
      canvasItemIds: ["file:source-1"],
      canvasResolutionFingerprint: "fingerprint-1",
      sourceTitle: "Lecture.pdf",
    });
  });

  it("retains one accepted logical generation across background and foreground", async () => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());
    const createGeneration = vi.fn();

    const whileBackgrounded = await readCanvasReviewerRecovery("user-a");
    const afterForeground = await readCanvasReviewerRecovery("user-a");

    expect(whileBackgrounded).toEqual(accepted);
    expect(afterForeground).toEqual(accepted);
    expect(createGeneration).not.toHaveBeenCalled();
  });

  it("finds a running accepted job without calling generation again", async () => {
    const record = await begin();
    const createGeneration = vi.fn();

    expect(findCanvasReviewerRecoveryCandidate(record, [job()])?.id).toBe("job-1");
    expect(createGeneration).not.toHaveBeenCalled();
  });

  it("finds a completed-while-away job in owned history", async () => {
    const record = await begin();
    const completed = job({
      completedAt: "2026-09-12T00:01:00.000Z",
      resultAvailable: true,
      status: "succeeded",
    });

    expect(findCanvasReviewerRecoveryCandidate(record, [completed])).toBe(completed);
  });

  it("keeps the accepted job after a transient polling failure", async () => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());
    const createReplacement = vi.fn();

    expect(
      shouldDiscardCanvasReviewerRecoveryAfterStatusError({
        retryable: true,
        status: 0,
      }),
    ).toBe(false);
    await expect(readCanvasReviewerRecovery("user-a")).resolves.toEqual(accepted);
    expect(createReplacement).not.toHaveBeenCalled();
  });

  it("discards a nonexistent job recovery safely", () => {
    expect(
      shouldDiscardCanvasReviewerRecoveryAfterStatusError({
        retryable: false,
        status: 404,
      }),
    ).toBe(true);
  });

  it("gives an explicit retry a new request identity while retaining its source", async () => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());
    expect(accepted).not.toBeNull();

    const retry = prepareCanvasReviewerRetryRecovery(
      accepted!,
      "reviewer_generation:key-2",
      "2026-09-12T00:05:00.000Z",
    );

    expect(retry).toMatchObject({
      requestIdempotencyKey: "reviewer_generation:key-2",
      jobId: null,
      acceptedAt: null,
      canvasItemIds: ["file:source-1"],
      canvasResolutionFingerprint: "fingerprint-1",
    });
    expect(retry.requestIdempotencyKey).not.toBe(
      accepted!.requestIdempotencyKey,
    );
  });

  it("fails closed when more than one uncertain job matches", async () => {
    const record = await begin();

    expect(
      findCanvasReviewerRecoveryCandidate(record, [
        job(),
        job({ id: "job-2", acceptedAt: "2026-09-12T00:00:02.000Z" }),
      ]),
    ).toBeNull();
  });

  it.each([
    ["different job type", { jobType: "document_extraction" as const }],
    ["different source", { source: { ...job().source, displayName: "Other.pdf" } }],
    ["different source length", { source: { ...job().source, characterCount: 41 } }],
    ["different source version", { sourceVersionId: "source-version-2" }],
  ])("rejects a %s", async (_label, overrides) => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());
    expect(accepted).not.toBeNull();
    expect(matchesCanvasReviewerRecoveryJob(accepted!, job(overrides))).toBe(false);
  });

  it("discards malformed storage without crashing startup", async () => {
    values.set(STORAGE_KEY, "{not-json");

    await expect(readCanvasReviewerRecovery("user-a")).resolves.toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(false);
  });

  it("discards records with an invalid version or format", async () => {
    values.set(STORAGE_KEY, JSON.stringify({ version: 99, ownerUserId: "user-a" }));

    await expect(readCanvasReviewerRecovery("user-a")).resolves.toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(false);
  });

  it("fails closed and removes another user's recovery state", async () => {
    await begin();

    await expect(readCanvasReviewerRecovery("user-b")).resolves.toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(false);
  });

  it("clears the owner's record on sign-out", async () => {
    await begin();
    await clearCanvasReviewerRecoveryForOwner("user-a");

    await expect(readCanvasReviewerRecovery("user-a")).resolves.toBeNull();
  });

  it("does not let one job remove a newer recovery record", async () => {
    const accepted = await acceptCanvasReviewerRecovery(await begin(), job());
    expect(accepted).not.toBeNull();

    await removeCanvasReviewerRecovery("user-a", "job-older");
    await expect(readCanvasReviewerRecovery("user-a")).resolves.toEqual(accepted);
  });

  it("expires an unresolved submission so a failed request cannot trap future work", async () => {
    const record = await begin();
    vi.setSystemTime(new Date("2026-09-12T00:02:01.000Z"));

    expect(isUncertainCanvasReviewerSubmissionExpired(record)).toBe(true);
  });

  it("discards stale accepted recovery state", async () => {
    await acceptCanvasReviewerRecovery(await begin(), job());
    vi.setSystemTime(new Date("2026-09-20T00:00:00.000Z"));

    await expect(readCanvasReviewerRecovery("user-a")).resolves.toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(false);
  });
});

async function begin() {
  return beginCanvasReviewerRecovery({
    ownerUserId: "user-a",
    requestIdempotencyKey: "reviewer_generation:key-1",
    courseId: "course-1",
    courseName: "Course One",
    canvasItemIds: ["file:source-1"],
    canvasResolutionFingerprint: "fingerprint-1",
    sourceTitle: "Lecture.pdf",
    sourceCharacterCount: 42,
  });
}

function job(
  overrides: Partial<ProcessingJobStatusView> = {},
): ProcessingJobStatusView {
  return {
    acceptedAt: "2026-09-12T00:00:01.000Z",
    attemptCount: 1,
    artifactType: "reviewer",
    cancellationRequestedAt: null,
    completedAt: null,
    createdAt: "2026-09-12T00:00:01.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType: "reviewer_generation",
    progress: {
      completedUnits: 1,
      message: "Creating reviewer",
      totalUnits: 3,
      unitLabel: "sections",
    },
    provenance: null,
    resultAvailable: false,
    retryable: false,
    retryOfJobId: null,
    reuseCandidateArtifactVersionId: null,
    reusedFromJobId: null,
    reuseMode: "fresh",
    safeErrorMessage: null,
    source: {
      characterCount: 42,
      displayName: "Lecture.pdf",
      mimeType: "text/plain",
      sourceKind: "text",
    },
    sourceVersionId: "source-version-1",
    stage: "generating_sections",
    startedAt: "2026-09-12T00:00:02.000Z",
    status: "running",
    updatedAt: "2026-09-12T00:00:03.000Z",
    ...overrides,
  };
}
