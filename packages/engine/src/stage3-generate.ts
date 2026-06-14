import type {
  GenerationPlan,
  GenerationPlanSection,
  NormalizedSource,
  SectionOutput,
} from "./types";

export async function generateSection(
  _section: GenerationPlanSection,
  _plan: GenerationPlan,
  _source: NormalizedSource,
): Promise<SectionOutput> {
  throw new Error("generateSection is not implemented");
}
