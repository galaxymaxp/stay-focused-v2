import type { GenerationProvider } from "./provider";
import { normalizeSource } from "./stage0-normalize.js";
import { detectOutline } from "./stage1-outline.js";
import { buildGenerationPlan } from "./stage2-plan.js";
import { generateSection } from "./stage3-generate.js";
import { verifyCoverage } from "./stage4-verify.js";
import { retryFailedSections } from "./stage5-retry.js";
import { assembleReviewer } from "./stage6-assemble.js";
import type {
  PipelineOptions,
  ReviewerOutput,
  SectionOutput,
  SourceNormalizationInput,
} from "./types";

export interface RunPipelineArgs extends PipelineOptions {
  readonly input: SourceNormalizationInput;
  readonly provider: GenerationProvider;
}

export async function runPipeline(
  args: RunPipelineArgs,
): Promise<ReviewerOutput> {
  validateArgs(args);

  const source = await normalizeSource(args.input);
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  const initialOutputs: SectionOutput[] = [];

  for (const section of plan.sections) {
    initialOutputs.push(
      await generateSection({
        section,
        plan,
        source,
        provider: args.provider,
        model: args.model,
        temperature: args.temperature,
        metadata: args.metadata,
      }),
    );
  }

  const initialCoverage = verifyCoverage({
    outputs: initialOutputs,
    plan,
    source,
    outline,
  });
  const finalOutputs = await retryFailedSections({
    outputs: initialOutputs,
    coverage: initialCoverage,
    plan,
    source,
    outline,
    provider: args.provider,
    retryPolicy: args.retryPolicy,
    model: args.model,
    temperature: args.temperature,
    metadata: args.metadata,
  });
  const finalCoverage = verifyCoverage({
    outputs: finalOutputs,
    plan,
    source,
    outline,
  });

  return assembleReviewer({
    outputs: finalOutputs,
    coverage: finalCoverage,
    plan,
    source,
    allowWeakSections: args.allowWeakSections,
  });
}

function validateArgs(args: RunPipelineArgs): void {
  if (!args || !args.input || typeof args.input !== "object") {
    throw new Error("Pipeline requires source normalization input.");
  }
  if (!args.provider || typeof args.provider.generate !== "function") {
    throw new Error("Pipeline requires a generation provider.");
  }
}
