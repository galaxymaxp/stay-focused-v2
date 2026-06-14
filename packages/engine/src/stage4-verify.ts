import type {
  CoverageReport,
  GenerationPlan,
  SectionOutput,
} from "./types";

export function verifyCoverage(
  _output: readonly SectionOutput[],
  _plan: GenerationPlan,
): CoverageReport {
  throw new Error("verifyCoverage is not implemented");
}
