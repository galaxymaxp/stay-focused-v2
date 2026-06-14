import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  SectionOutput,
} from "./types";

export async function retryFailedSections(
  _report: CoverageReport,
  _plan: GenerationPlan,
  _source: NormalizedSource,
): Promise<SectionOutput[]> {
  throw new Error("retryFailedSections is not implemented");
}
