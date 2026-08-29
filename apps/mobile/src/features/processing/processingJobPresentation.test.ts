import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import {
  groupProcessingJobs,
  presentProcessingFailure,
  presentProcessingJob,
  presentProcessingProgress,
  processingEmptyState,
  processingStatusLabel,
  processingTimestamp,
} from "./processingJobPresentation";

describe("processing job presentation", () => {
  it("names every real job status without relying on colour", () => {
    expect(processingStatusLabel(job({ status: "queued" }))).toBe(
      "Waiting to start",
    );
    expect(processingStatusLabel(job({ status: "running" }))).toBe(
      "Processing reviewer",
    );
    expect(
      processingStatusLabel(job({ status: "cancellation_requested" })),
    ).toBe("Stopping");
    expect(processingStatusLabel(job({ status: "succeeded" }))).toBe(
      "Reviewer ready",
    );
    expect(processingStatusLabel(job({ status: "failed" }))).toBe(
      "Processing failed",
    );
    expect(processingStatusLabel(job({ status: "expired" }))).toBe(
      "Processing expired",
    );
    expect(processingStatusLabel(job({ status: "cancelled" }))).toBe(
      "Cancelled",
    );
  });

  it("labels an extraction job by what it actually does", () => {
    expect(
      processingStatusLabel(
        job({ jobType: "document_extraction", status: "running" }),
      ),
    ).toBe("Extracting text");
    expect(
      presentProcessingJob(
        job({
          jobType: "document_extraction",
          resultAvailable: true,
          status: "succeeded",
        }),
      ).resultActionLabel,
    ).toBe("Open extracted text");
  });

  it("reports real counted progress in the server's own units", () => {
    expect(
      presentProcessingProgress(
        job({
          progress: {
            completedUnits: 1,
            totalUnits: 3,
            unitLabel: "sections",
            message: "Creating reviewer sections",
          },
          status: "running",
        }),
      ),
    ).toEqual({
      label: "1 of 3 sections complete",
      completedUnits: 1,
      totalUnits: 3,
      ratio: 1 / 3,
    });
  });

  it("singularises a one-unit job", () => {
    expect(
      presentProcessingProgress(
        job({
          progress: {
            completedUnits: 0,
            totalUnits: 1,
            unitLabel: "sections",
            message: "Creating reviewer sections",
          },
          status: "running",
        }),
      )?.label,
    ).toBe("0 of 1 section complete");
  });

  it("reports no progress rather than inventing one when units are missing", () => {
    expect(
      presentProcessingProgress(
        job({
          progress: {
            completedUnits: null,
            totalUnits: null,
            unitLabel: null,
            message: "Preparing source",
          },
          status: "running",
        }),
      ),
    ).toBeNull();

    expect(
      presentProcessingProgress(
        job({
          progress: {
            completedUnits: 2,
            totalUnits: 0,
            unitLabel: "sections",
            message: "Preparing source",
          },
          status: "running",
        }),
      ),
    ).toBeNull();
  });

  it("keeps partial progress visible on a failed job", () => {
    expect(
      presentProcessingProgress(
        job({
          progress: {
            completedUnits: 1,
            totalUnits: 3,
            unitLabel: "sections",
            message: "Creating reviewer sections",
          },
          status: "failed",
        }),
      )?.label,
    ).toBe("1 of 3 sections complete");
  });

  it("shows the live server message while active and never after it finishes", () => {
    expect(
      presentProcessingJob(
        job({
          progress: {
            completedUnits: 1,
            totalUnits: 3,
            unitLabel: "sections",
            message: "Creating reviewer sections",
          },
          status: "running",
        }),
      ).detail,
    ).toBe("Creating reviewer sections");

    expect(
      presentProcessingJob(
        job({
          progress: {
            completedUnits: 3,
            totalUnits: 3,
            unitLabel: "sections",
            message: "Storing reviewer",
          },
          resultAvailable: true,
          status: "succeeded",
        }),
      ).detail,
    ).toBeNull();
  });

  it("promises durable processing only while the job is really running", () => {
    const active = presentProcessingJob(job({ status: "running" }));
    expect(active.durableNotice).toBe(
      "You can leave this screen. Processing continues on the server.",
    );
    expect(
      presentProcessingJob(job({ status: "queued" })).durableNotice,
    ).toBe(active.durableNotice);
    expect(
      presentProcessingJob(job({ status: "succeeded" })).durableNotice,
    ).toBeNull();
    expect(
      presentProcessingJob(job({ status: "failed" })).durableNotice,
    ).toBeNull();
  });

  it("offers a result action only when a result can actually be opened", () => {
    expect(
      presentProcessingJob(
        job({ resultAvailable: true, status: "succeeded" }),
      ).resultActionLabel,
    ).toBe("Open reviewer");
    expect(
      presentProcessingJob(
        job({ resultAvailable: false, status: "succeeded" }),
      ).resultActionLabel,
    ).toBeNull();
    expect(
      presentProcessingJob(job({ status: "running" })).resultActionLabel,
    ).toBeNull();
  });

  it("offers cancel only while the server can still stop the job", () => {
    expect(presentProcessingJob(job({ status: "queued" })).canCancel).toBe(true);
    expect(presentProcessingJob(job({ status: "running" })).canCancel).toBe(
      true,
    );
    expect(
      presentProcessingJob(job({ status: "cancellation_requested" })).canCancel,
    ).toBe(false);
    expect(presentProcessingJob(job({ status: "succeeded" })).canCancel).toBe(
      false,
    );
    expect(presentProcessingJob(job({ status: "failed" })).canCancel).toBe(
      false,
    );
  });

  it("offers retry only where the server marked the job retryable", () => {
    expect(
      presentProcessingJob(job({ retryable: true, status: "failed" })).canRetry,
    ).toBe(true);
    expect(
      presentProcessingJob(job({ retryable: true, status: "expired" })).canRetry,
    ).toBe(true);
    expect(
      presentProcessingJob(job({ retryable: false, status: "failed" })).canRetry,
    ).toBe(false);
    expect(
      presentProcessingJob(job({ retryable: true, status: "running" })).canRetry,
    ).toBe(false);
    expect(
      presentProcessingJob(job({ retryable: true, status: "cancelled" }))
        .canRetry,
    ).toBe(false);
  });

  it("separates a readable failure summary from technical detail", () => {
    expect(
      presentProcessingFailure(
        job({
          attemptCount: 2,
          errorCode: "processing_job_source_download_failed",
          safeErrorMessage: "The staged source could not be read.",
          status: "failed",
        }),
      ),
    ).toEqual({
      summary: "The staged source could not be read.",
      detail: "Code processing_job_source_download_failed · Attempt 2",
    });
  });

  it("still explains a failure the server did not describe", () => {
    expect(
      presentProcessingFailure(
        job({
          attemptCount: 1,
          errorCode: null,
          safeErrorMessage: null,
          status: "failed",
        }),
      ),
    ).toEqual({
      summary: "This job stopped before it finished.",
      detail: null,
    });
    expect(presentProcessingFailure(job({ status: "running" }))).toBeNull();
  });

  it("puts an openable result above jobs that only need acknowledgement", () => {
    const groups = groupProcessingJobs([
      job({ id: "failed-1", status: "failed" }),
      job({ id: "ready-1", resultAvailable: true, status: "succeeded" }),
      job({ id: "running-1", status: "running" }),
      job({ id: "queued-1", status: "queued" }),
      job({ id: "cancelled-1", status: "cancelled" }),
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      "in_progress",
      "waiting",
      "ready",
      "attention",
      "finished",
    ]);
    expect(groups.map((group) => group.title)).toEqual([
      "In progress",
      "Waiting to start",
      "Ready to open",
      "Needs attention",
      "Finished",
    ]);
  });

  it("keeps the caller's order inside a group and omits empty groups", () => {
    const groups = groupProcessingJobs([
      job({ id: "newer", status: "running" }),
      job({ id: "older", status: "running" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.jobs.map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("groups a succeeded job with no stored result away from openable results", () => {
    const groups = groupProcessingJobs([
      job({ id: "gone", resultAvailable: false, status: "succeeded" }),
    ]);
    expect(groups.map((group) => group.key)).toEqual(["finished"]);
  });

  it("marks a job active only while the server still has work in flight", () => {
    expect(presentProcessingJob(job({ status: "running" })).isActive).toBe(true);
    expect(presentProcessingJob(job({ status: "queued" })).isActive).toBe(true);
    expect(
      presentProcessingJob(job({ status: "cancellation_requested" })).isActive,
    ).toBe(true);
    expect(presentProcessingJob(job({ status: "failed" })).isActive).toBe(false);
    expect(presentProcessingJob(job({ status: "succeeded" })).isActive).toBe(
      false,
    );
  });

  it("shows the one timestamp that describes what the job last did", () => {
    expect(
      processingTimestamp(
        job({ completedAt: "2026-08-29T10:05:00.000Z", status: "succeeded" }),
      ),
    ).toEqual({ label: "Finished", value: "2026-08-29T10:05:00.000Z" });
    expect(
      processingTimestamp(
        job({ failedAt: "2026-08-29T10:04:00.000Z", status: "failed" }),
      ),
    ).toEqual({ label: "Stopped", value: "2026-08-29T10:04:00.000Z" });
    expect(processingTimestamp(job({ status: "queued" }))).toEqual({
      label: "Submitted",
      value: "2026-08-29T10:00:00.000Z",
    });
    expect(processingTimestamp(job({ status: "running" }))).toEqual({
      label: "Updated",
      value: "2026-08-29T10:00:30.000Z",
    });
  });

  it("falls back to the update time when a terminal timestamp is missing", () => {
    expect(
      processingTimestamp(job({ completedAt: null, status: "succeeded" })),
    ).toEqual({ label: "Updated", value: "2026-08-29T10:00:30.000Z" });
  });

  it("distinguishes restoring from having nothing to process", () => {
    expect(processingEmptyState(true).title).toBe("Restoring processing");
    expect(processingEmptyState(false).title).toBe("Nothing is processing");
    expect(processingEmptyState(true).message).not.toBe(
      processingEmptyState(false).message,
    );
  });
});

function job(
  overrides: Partial<ProcessingJobStatusView> = {},
): ProcessingJobStatusView {
  return {
    id: "job-1",
    jobType: "reviewer_generation",
    status: "running",
    stage: "generating_sections",
    progress: {
      completedUnits: null,
      totalUnits: null,
      unitLabel: null,
      message: "Creating reviewer sections",
    },
    source: {
      displayName: "Week 4 lecture notes",
      sourceKind: "text",
      mimeType: "text/plain",
    },
    createdAt: "2026-08-29T10:00:00.000Z",
    acceptedAt: "2026-08-29T10:00:00.000Z",
    startedAt: "2026-08-29T10:00:05.000Z",
    updatedAt: "2026-08-29T10:00:30.000Z",
    completedAt: null,
    failedAt: null,
    cancellationRequestedAt: null,
    errorCode: null,
    safeErrorMessage: null,
    retryable: false,
    attemptCount: 1,
    resultAvailable: false,
    retryOfJobId: null,
    sourceVersionId: null,
    artifactType: "reviewer",
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: null,
    ...overrides,
  };
}
