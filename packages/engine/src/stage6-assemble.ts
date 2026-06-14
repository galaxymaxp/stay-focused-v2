import type { ReviewerOutput, SectionOutput } from "./types";

export function assembleReviewer(
  _sections: readonly SectionOutput[],
): ReviewerOutput {
  throw new Error("assembleReviewer is not implemented");
}
