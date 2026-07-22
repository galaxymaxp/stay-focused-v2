import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.hoisted(() => new Map<string, string>());

vi.mock("../auth/sessionStore", () => ({
  sessionStore: {
    deleteItem: vi.fn(async (key: string) => { values.delete(key); }),
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  },
}));

import {
  readActiveProcessingJobs,
  removeActiveProcessingJob,
  upsertActiveProcessingJob,
} from "./activeProcessingJobStore";

describe("active processing job persistence", () => {
  beforeEach(() => values.clear());

  it("restores the same active job reference after an app restart", async () => {
    await upsertActiveProcessingJob("user-a", jobView());

    await expect(readActiveProcessingJobs("user-a")).resolves.toMatchObject([
      {
        jobId: "job-1",
        jobType: "reviewer_generation",
        lastKnownStatus: "running",
        ownerUserId: "user-a",
        sourceDisplayName: "Neutral source",
      },
    ]);
  });

  it("does not reveal another user's local job references after sign-in", async () => {
    await upsertActiveProcessingJob("user-a", jobView());
    await expect(readActiveProcessingJobs("user-b")).resolves.toEqual([]);
  });

  it("keeps terminal work recoverable until the result is consumed", async () => {
    await upsertActiveProcessingJob(
      "user-a",
      jobView({ resultAvailable: true, status: "succeeded" }),
    );
    expect(await readActiveProcessingJobs("user-a")).toHaveLength(1);

    await removeActiveProcessingJob("job-1");
    expect(await readActiveProcessingJobs("user-a")).toEqual([]);
  });
});

function jobView(
  overrides: Partial<ProcessingJobStatusView> = {},
): ProcessingJobStatusView {
  return {
    acceptedAt: "2026-07-23T00:00:00.000Z",
    attemptCount: 1,
    cancellationRequestedAt: null,
    completedAt: null,
    createdAt: "2026-07-23T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType: "reviewer_generation",
    progress: {
      completedUnits: 2,
      message: "Creating reviewer sections",
      totalUnits: 5,
      unitLabel: "sections",
    },
    resultAvailable: false,
    retryable: false,
    retryOfJobId: null,
    safeErrorMessage: null,
    source: {
      characterCount: 100,
      displayName: "Neutral source",
      mimeType: "text/plain",
      sourceKind: "text",
    },
    stage: "generating_sections",
    startedAt: "2026-07-23T00:00:01.000Z",
    status: "running",
    updatedAt: "2026-07-23T00:00:02.000Z",
    ...overrides,
  };
}
