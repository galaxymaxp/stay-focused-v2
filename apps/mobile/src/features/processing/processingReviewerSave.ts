import type { ProcessingJobStatusView } from "@stay-focused/shared";

import type { SavedReviewerSourceMetadata } from "../../services/reviewerLibraryApi";

export function createProcessingReviewerSourceMetadata(
  job: ProcessingJobStatusView,
  sourceSnapshotId: string | undefined,
): SavedReviewerSourceMetadata {
  const sourceLabel = job.source.displayName.trim();
  const sourceCharacterCount = Number.isSafeInteger(job.source.characterCount)
    ? Math.max(job.source.characterCount ?? 0, 0)
    : 0;

  return {
    sourceMode: sourceSnapshotId ? "canvas" : "paste",
    sourceCharacterCount,
    ...(sourceLabel ? { sourceLabel } : {}),
  };
}
