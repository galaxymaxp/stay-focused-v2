import type { GenerationProvider } from "./provider";
import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  RetryPolicy,
  SectionOutput,
} from "./types";

export interface RetryFailedSectionsArgs {
  readonly report: CoverageReport;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outputs: readonly SectionOutput[];
  readonly provider: GenerationProvider;
  readonly model: string;
  readonly policy: RetryPolicy;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export async function retryFailedSections(
  _args: RetryFailedSectionsArgs,
): Promise<SectionOutput[]> {
  throw new Error("retryFailedSections is not implemented");
}
