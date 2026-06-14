import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  ReviewerOutput,
  SectionOutput,
} from "./types";

export interface AssembleReviewerArgs {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
}

export function assembleReviewer(_args: AssembleReviewerArgs): ReviewerOutput {
  throw new Error("assembleReviewer is not implemented");
}
