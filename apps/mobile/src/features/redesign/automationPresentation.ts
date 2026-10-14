import type { LibraryArtifactSummary, ProcessingJobStatusView } from "@stay-focused/shared";

export function automaticQueueLabel(job: Pick<ProcessingJobStatusView, "origin">): string | null {
  return job.origin === "automatic" ? "Auto" : null;
}
export function automaticLibraryLabel(artifact: Pick<LibraryArtifactSummary, "origin">): string | null {
  return artifact.origin === "automatic" ? "Made automatically" : null;
}
export function automaticReviewerLabel(artifact: Pick<LibraryArtifactSummary, "origin" | "sourceTitle">): string | null {
  if (artifact.origin !== "automatic") return null;
  const title = artifact.sourceTitle?.trim();
  return title ? `Made automatically from ${title}` : "Made automatically";
}
