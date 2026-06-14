import type {
  GenerationPlan,
  NormalizedSource,
  SourceOutline,
} from "./types";

export function buildGenerationPlan(
  _outline: SourceOutline,
  _source: NormalizedSource,
): GenerationPlan {
  throw new Error("buildGenerationPlan is not implemented");
}
