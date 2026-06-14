import type { GenerationProvider } from "./provider";
import type {
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionOutput,
} from "./types";

export interface GenerateSectionArgs {
  readonly section: PlannedSection;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly provider: GenerationProvider;
  readonly model: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export async function generateSection(
  _args: GenerateSectionArgs,
): Promise<SectionOutput> {
  throw new Error("generateSection is not implemented");
}
