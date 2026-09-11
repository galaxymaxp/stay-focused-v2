import type { ReviewerOutput } from "@stay-focused/engine";
import type { ProcessingJobStatusView } from "@stay-focused/shared";

import type {
  CanvasReviewerSourceDescriptor,
  CanvasReviewerSourcePreviewPayload,
} from "../../services/canvasApi";

export interface CanvasReviewerJobDraft {
  readonly canvasCourseId: string;
  readonly canvasItemIds: readonly string[];
  readonly canvasPreviewSessionId: string;
  readonly canvasResolutionFingerprint: string;
  readonly sourceText: string;
  readonly sourceTitle: string;
}

export interface CanvasReviewerSaveDraft {
  readonly reviewerOutput: ReviewerOutput;
  readonly sourceMetadata: {
    readonly sourceCharacterCount: number;
    readonly sourceLabel: string;
    readonly sourceMode: "canvas";
  };
  readonly sourceSnapshotId: string;
  readonly title: string;
}

/**
 * Keep the generated job bound to the server-resolved Canvas identities. The
 * screen never reconstructs or guesses a source ID from a title or module.
 */
export function createCanvasReviewerJobDraft(input: {
  readonly courseId: string;
  readonly preview: CanvasReviewerSourcePreviewPayload;
  readonly sourceText: string;
  readonly sourceTitle: string;
}): CanvasReviewerJobDraft {
  return {
    canvasCourseId: input.courseId,
    canvasItemIds: input.preview.sources.map((source) => source.id),
    canvasPreviewSessionId: input.preview.previewSessionId,
    canvasResolutionFingerprint: input.preview.resolutionFingerprint,
    sourceText: input.sourceText,
    sourceTitle: input.sourceTitle,
  };
}

/** A completed Canvas reviewer is saved with the same immutable snapshot. */
export function createCanvasReviewerSaveDraft(input: {
  readonly courseName?: string;
  readonly reviewer: ReviewerOutput;
  readonly sourceSnapshotId: string;
  readonly sourceText: string;
  readonly sourceTitle: string;
  readonly title?: string;
}): CanvasReviewerSaveDraft {
  return {
    reviewerOutput: input.reviewer,
    sourceMetadata: {
      sourceCharacterCount: input.sourceText.trim().length,
      sourceLabel: [input.courseName?.trim(), input.sourceTitle.trim()]
        .filter((part): part is string => Boolean(part))
        .join(" · "),
      sourceMode: "canvas",
    },
    sourceSnapshotId: input.sourceSnapshotId,
    title:
      input.title?.trim() ||
      input.sourceTitle.trim() ||
      input.reviewer.title.trim() ||
      "Canvas reviewer",
  };
}

export async function persistCanvasReviewerAutomatically<TResult>(
  input: Parameters<typeof createCanvasReviewerSaveDraft>[0],
  persist: (draft: CanvasReviewerSaveDraft) => Promise<TResult>,
): Promise<TResult> {
  return persist(createCanvasReviewerSaveDraft(input));
}

export function canvasSourceModuleLabel(
  source: CanvasReviewerSourceDescriptor,
): string {
  return source.placement.group === "module" && source.placement.moduleTitle
    ? source.placement.moduleTitle
    : "Other course content";
}

/** Coarse student language intentionally hides engine stage numbering. */
export function canvasReviewerProgressLabel(
  job: ProcessingJobStatusView,
): string {
  if (job.status === "queued") return "Waiting to start";
  if (job.status === "succeeded") return "Complete";
  if (job.status === "failed" || job.status === "expired") {
    return "Needs attention";
  }
  if (job.status === "cancelled") return "Cancelled";
  if (job.status === "cancellation_requested") return "Stopping safely";
  switch (job.stage) {
    case "preparing_source":
    case "normalizing_source":
      return "Preparing material";
    case "detecting_outline":
    case "planning_sections":
    case "generating_sections":
      return "Creating reviewer";
    default:
      return "Finishing reviewer";
  }
}
