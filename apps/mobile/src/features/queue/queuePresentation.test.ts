import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";
import { queueItems, queueProgress, unseenFailures } from "./queuePresentation";
import { queueSections } from "../redesign/presentation";
function job(
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
    sourceVersionId: "source-version-1",
    artifactType: "reviewer",
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: {
      generationPolicyVersion: "reviewer-policy-v1",
      engineVersion: "engine-stage0-6-v1",
      schemaVersion: "reviewer-output-v1",
      providerId: "openai:gpt-4o",
      settingsFingerprint: "a".repeat(64),
      language: "auto",
      outputMode: "standard",
    },
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

describe("header Queue grouping", () => {
  it("matches the old page groups for mixed active, attention and finished jobs", () => {
    const jobs = [
      "running",
      "queued",
      "cancellation_requested",
      "failed",
      "expired",
      "cancelled",
      "succeeded",
    ].map((status, i) =>
      job({
        id: String(i),
        status: status as ProcessingJobStatusView["status"],
      }),
    );
    expect(queueItems(jobs)).toEqual(queueSections(jobs));
  });
  it("keeps only the latest five finished entries and respects dismissed entries", () => {
    const jobs = Array.from({ length: 8 }, (_, i) =>
      job({
        id: String(i),
        status: "succeeded",
        completedAt: new Date(2026, 0, i + 1).toISOString(),
      }),
    );
    expect(queueItems(jobs, ["7"])[0]!.jobs.map((j) => j.id)).toEqual([
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
  });
  it("reports only unseen failed or expired items, never idle, cancelled or successful jobs", () => {
    expect(unseenFailures([], new Set())).toBe(false);
    expect(
      unseenFailures(
        [job({ status: "succeeded" }), job({ status: "cancelled" })],
        new Set(),
      ),
    ).toBe(false);
    expect(unseenFailures([job({ status: "failed" })], new Set())).toBe(true);
    expect(
      unseenFailures([job({ status: "expired" })], new Set(["job-1"])),
    ).toBe(false);
  });
  it("presents measured progress or the server progress message without inventing a percentage", () => {
    expect(queueProgress(job())).toBe("2 of 5 sections");
    expect(
      queueProgress(
        job({
          progress: {
            completedUnits: null,
            totalUnits: null,
            unitLabel: null,
            message: "Waiting",
          },
        }),
      ),
    ).toBe("Waiting");
  });
});
