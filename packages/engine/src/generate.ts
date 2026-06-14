import type { GenerationProvider } from "./provider";
import type {
  NormalizedSource,
  PipelineOptions,
  ReviewerOutput,
} from "./types";

export interface RunPipelineArgs {
  readonly source: NormalizedSource;
  readonly provider: GenerationProvider;
  readonly options: PipelineOptions;
}

export async function runPipeline(
  _args: RunPipelineArgs,
): Promise<ReviewerOutput> {
  throw new Error("runPipeline is not implemented");
}
