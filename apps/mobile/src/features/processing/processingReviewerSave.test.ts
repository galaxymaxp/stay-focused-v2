import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import { createProcessingReviewerSourceMetadata } from "./processingReviewerSave";

describe("processing reviewer save metadata", () => {
  it("preserves Canvas identity for a reviewer opened from completion routing", () => {
    expect(
      createProcessingReviewerSourceMetadata(
        reviewerJob(),
        "22222222-2222-4222-8222-222222222222",
      ),
    ).toEqual({
      sourceMode: "canvas",
      sourceCharacterCount: 842,
      sourceLabel: "Security module",
    });
  });

  it("uses safe pasted-text metadata when no immutable snapshot exists", () => {
    expect(createProcessingReviewerSourceMetadata(reviewerJob(), undefined)).toEqual({
      sourceMode: "paste",
      sourceCharacterCount: 842,
      sourceLabel: "Security module",
    });
  });
});

function reviewerJob(): ProcessingJobStatusView {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    jobType: "reviewer_generation",
    status: "succeeded",
    stage: "storing_reviewer",
    progress: {
      completedUnits: 2,
      totalUnits: 2,
      unitLabel: "sections",
      message: "Reviewer is ready",
    },
    source: {
      displayName: "Security module",
      sourceKind: "text",
      mimeType: "text/plain",
      characterCount: 842,
    },
    createdAt: "2026-08-28T00:00:00.000Z",
    acceptedAt: "2026-08-28T00:00:00.000Z",
    startedAt: "2026-08-28T00:00:01.000Z",
    updatedAt: "2026-08-28T00:00:05.000Z",
    completedAt: "2026-08-28T00:00:05.000Z",
    failedAt: null,
    cancellationRequestedAt: null,
    errorCode: null,
    safeErrorMessage: null,
    retryable: false,
    attemptCount: 1,
    resultAvailable: true,
    retryOfJobId: null,
    sourceVersionId: null,
    artifactType: "reviewer",
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: null,
  };
}
