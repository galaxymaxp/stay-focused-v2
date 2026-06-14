import type {
  CoverageReport,
  GenerationPlan,
  SectionOutput,
} from "./types";

export interface VerifyCoverageArgs {
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
}

export function verifyCoverage(_args: VerifyCoverageArgs): CoverageReport {
  throw new Error("verifyCoverage is not implemented");
}
