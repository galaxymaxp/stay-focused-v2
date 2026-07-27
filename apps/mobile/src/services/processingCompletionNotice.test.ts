import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import type { ActiveProcessingJobReference } from "./activeProcessingJobStore";
import { getProcessingCompletionNotice } from "./processingCompletionNotice";

describe("processing completion notices", () => {
  it("reports a truthful extraction completion discovered after reconciliation", () => {
    expect(
      getProcessingCompletionNotice(
        previousReference("running"),
        completedJob("document_extraction"),
      ),
    ).toEqual({
      title: "Your text extraction is ready",
      message: "The extracted text has been restored and is ready to review or edit.",
    });
  });

  it("reports reviewer completion without including private source content", () => {
    const notice = getProcessingCompletionNotice(
      previousReference("queued"),
      completedJob("reviewer_generation"),
    );
    expect(notice?.title).toBe("Your reviewer is ready");
    expect(JSON.stringify(notice)).not.toContain("Private source");
  });

  it("does not repeat a notice for an already terminal local reference", () => {
    expect(
      getProcessingCompletionNotice(
        previousReference("succeeded"),
        completedJob("reviewer_generation"),
      ),
    ).toBeNull();
  });

  it("does not claim completion before a persisted result is available", () => {
    expect(
      getProcessingCompletionNotice(
        previousReference("running"),
        { ...completedJob("reviewer_generation"), resultAvailable: false },
      ),
    ).toBeNull();
  });
});

function previousReference(
  status: ActiveProcessingJobReference["lastKnownStatus"],
): ActiveProcessingJobReference {
  return {
    jobId: "job-1",
    ownerUserId: "user-1",
    jobType: "reviewer_generation",
    sourceDisplayName: "Private source",
    sourceKind: "text",
    createdAt: "2026-07-27T00:00:00.000Z",
    lastKnownStatus: status,
    lastStatusCheckAt: "2026-07-27T00:01:00.000Z",
    updatedAt: "2026-07-27T00:01:00.000Z",
    completedAt: null,
    resultAvailable: false,
    progressMessage: "Creating reviewer sections",
    completedUnits: 1,
    totalUnits: 2,
    unitLabel: "sections",
    errorCode: null,
    safeErrorMessage: null,
    retryable: false,
  };
}

function completedJob(
  jobType: ProcessingJobStatusView["jobType"],
): ProcessingJobStatusView {
  return {
    acceptedAt: "2026-07-27T00:00:00.000Z",
    attemptCount: 1,
    cancellationRequestedAt: null,
    completedAt: "2026-07-27T00:02:00.000Z",
    createdAt: "2026-07-27T00:00:00.000Z",
    errorCode: null,
    failedAt: null,
    id: "job-1",
    jobType,
    progress: {
      completedUnits: 2,
      message: "Complete",
      totalUnits: 2,
      unitLabel: jobType === "document_extraction" ? "pages" : "sections",
    },
    resultAvailable: true,
    retryable: false,
    retryOfJobId: null,
    sourceVersionId: null,
    artifactType: null,
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: null,
    safeErrorMessage: null,
    source: {
      characterCount: 100,
      displayName: "Private source",
      mimeType: jobType === "document_extraction" ? "application/pdf" : "text/plain",
      sourceKind: jobType === "document_extraction" ? "pdf" : "text",
    },
    stage: jobType === "document_extraction" ? "storing_result" : "storing_reviewer",
    startedAt: "2026-07-27T00:00:01.000Z",
    status: "succeeded",
    updatedAt: "2026-07-27T00:02:00.000Z",
  };
}
