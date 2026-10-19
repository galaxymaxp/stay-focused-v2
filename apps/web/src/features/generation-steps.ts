import {
  EXTRACTION_JOB_STAGES,
  REVIEWER_JOB_STAGES,
  type ProcessingJobStage,
  type ProcessingJobStatus,
  type ProcessingJobType,
} from "@stay-focused/shared";

const stageLabels = {
  accepting_upload: "Saving material",
  inspecting_document: "Reading document",
  extracting_native_text: "Reading text",
  preparing_ocr_chunks: "Preparing page recognition",
  extracting_ocr: "Reading scanned pages",
  verifying_pages: "Checking pages",
  assembling_text: "Putting text together",
  storing_result: "Saving result",
  preparing_source: "Preparing material",
  normalizing_source: "Preparing text",
  detecting_outline: "Finding topics",
  planning_sections: "Organizing topics",
  generating_sections: "Building study material",
  verifying_coverage: "Checking reviewer",
  retrying_sections: "Completing topics",
  assembling_reviewer: "Putting reviewer together",
  storing_reviewer: "Saving reviewer",
} satisfies Record<ProcessingJobStage, string>;

export type GenerationStepState = "done" | "current" | "failed" | "pending";

/** Stage position comes from the server contract, not elapsed time or a timer. */
export function generationSteps(
  stage: ProcessingJobStage,
  status: ProcessingJobStatus,
  jobType: ProcessingJobType,
) {
  // Quiz and Draft workers only report these generation stages and storing_result.
  const stages: readonly ProcessingJobStage[] =
    jobType === "document_extraction"
      ? EXTRACTION_JOB_STAGES
      : jobType === "reviewer_generation"
        ? REVIEWER_JOB_STAGES
        : [
            ...REVIEWER_JOB_STAGES.filter(
              (item) =>
                item === "preparing_source" || item === "generating_sections",
            ),
            ...EXTRACTION_JOB_STAGES.filter(
              (item) => item === "storing_result",
            ),
          ];
  const index = stages.indexOf(stage);
  return stages.map((item, position) => {
    let state: GenerationStepState = "pending";
    if (status === "succeeded") state = "done";
    else if (status !== "queued" && index >= 0) {
      if (position < index) state = "done";
      else if (position === index) {
        if (status === "failed" || status === "expired") state = "failed";
        else if (status !== "cancelled") state = "current";
      }
    }
    return { stage: item, label: stageLabels[item], state };
  });
}

/** Time each newly finished stage holds before the next one ticks off. */
export const STEP_REVEAL_MS = 180;

/**
 * When one poll reports several finished stages at once, the frames that tick
 * them off in order instead of in the same frame. A frame marks a stage done
 * only when `next` (the server) reports it done; the last frame is `next`.
 */
export function stepRevealQueue(
  prev: readonly GenerationStepState[],
  next: readonly GenerationStepState[],
): GenerationStepState[][] {
  if (prev.length !== next.length) return [[...next]];
  const newly = next.flatMap((state, index) =>
    state === "done" && prev[index] !== "done" ? [index] : [],
  );
  const frames = newly.slice(1).map((upcoming, shown) =>
    next.map((state, index): GenerationStepState =>
      state === "done" &&
      (prev[index] === "done" || newly.indexOf(index) <= shown)
        ? "done"
        : index === upcoming
          ? "current"
          : "pending",
    ),
  );
  return [...frames, [...next]];
}
