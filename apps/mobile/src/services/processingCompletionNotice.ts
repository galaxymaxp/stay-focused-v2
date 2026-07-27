import type { ProcessingJobStatusView } from "@stay-focused/shared";

import type { ActiveProcessingJobReference } from "./activeProcessingJobStore";

export interface ProcessingCompletionNotice {
  readonly title: string;
  readonly message: string;
}

export function getProcessingCompletionNotice(
  previous: ActiveProcessingJobReference | undefined,
  current: ProcessingJobStatusView,
): ProcessingCompletionNotice | null {
  if (
    !previous ||
    !isLocallyActive(previous.lastKnownStatus) ||
    current.status !== "succeeded" ||
    !current.resultAvailable
  ) {
    return null;
  }

  return current.jobType === "document_extraction"
    ? {
        title: "Your text extraction is ready",
        message: "The extracted text has been restored and is ready to review or edit.",
      }
    : {
        title: "Your reviewer is ready",
        message: "The completed reviewer has been restored and is ready to view.",
      };
}

function isLocallyActive(status: string): boolean {
  return (
    status === "queued" ||
    status === "running" ||
    status === "cancellation_requested"
  );
}
