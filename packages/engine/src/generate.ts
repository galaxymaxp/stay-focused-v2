import type { GenerationProvider } from "./provider";
import { normalizeSource } from "./stage0-normalize.js";
import { detectOutline } from "./stage1-outline.js";
import { buildGenerationPlan } from "./stage2-plan.js";
import {
  generateSection,
  SectionValidationError,
  type SectionValidationFailureReason,
} from "./stage3-generate.js";
import { verifyCoverage } from "./stage4-verify.js";
import { retryFailedSections } from "./stage5-retry.js";
import { validateGrounding } from "./stage5a-grounding.js";
import { validateLeakage } from "./leakage-guard.js";
import { assembleReviewer } from "./stage6-assemble.js";
import type {
  CoverageReport,
  GenerationPlan,
  GroundingReport,
  LeakageReport,
  NormalizedSource,
  PipelineOptions,
  ReviewerOutput,
  SectionOutput,
  SourceOutline,
  SourceNormalizationInput,
} from "./types";

export interface RunPipelineArgs extends PipelineOptions {
  readonly input: SourceNormalizationInput;
  readonly provider: GenerationProvider;
}

export interface SectionValidationFailure {
  readonly sectionTitle: string;
  readonly sectionId: string;
  readonly stage: "stage3";
  readonly reason: SectionValidationFailureReason;
  readonly issues: readonly string[];
}

export interface PipelineAssemblyErrorState {
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
  readonly grounding: GroundingReport;
  readonly leakage: LeakageReport;
  readonly sectionValidationFailures: readonly SectionValidationFailure[];
}

export class PipelineAssemblyError extends Error {
  public readonly state: PipelineAssemblyErrorState;
  public override readonly cause: unknown;

  public constructor(
    message: string,
    state: PipelineAssemblyErrorState,
    cause: unknown,
  ) {
    super(message);
    this.name = "PipelineAssemblyError";
    this.state = state;
    this.cause = cause;
  }
}

export async function runPipeline(
  args: RunPipelineArgs,
): Promise<ReviewerOutput> {
  validateArgs(args);

  const source = await normalizeSource(args.input);
  const outline = await detectOutline(source);
  const plan = buildGenerationPlan(outline, source);
  const initialOutputs: SectionOutput[] = [];
  const sectionValidationFailures = new Map<
    string,
    SectionValidationFailure
  >();

  for (const section of plan.sections) {
    try {
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
    } catch (error) {
      if (!(error instanceof SectionValidationError)) {
        throw error;
      }
      sectionValidationFailures.set(
        section.id,
        createSectionValidationFailure(section.title, error),
      );
    }
  }

  const initialCoverage = verifyCoverage({
    outputs: initialOutputs,
    plan,
    source,
    outline,
  });
  const initialGrounding = validateGrounding({
    outputs: initialOutputs,
    plan,
    source,
    outline,
  });
  const initialLeakage = validateLeakage({
    outputs: initialOutputs,
    plan,
  });
  const finalOutputs = await retryFailedSections({
    outputs: initialOutputs,
    coverage: initialCoverage,
    grounding: initialGrounding,
    leakage: initialLeakage,
    plan,
    source,
    outline,
    provider: args.provider,
    retryPolicy: args.retryPolicy,
    model: args.model,
    temperature: args.temperature,
    metadata: args.metadata,
    onValidationFailure: (section, error) => {
      sectionValidationFailures.set(
        section.id,
        createSectionValidationFailure(section.title, error),
      );
    },
  });
  const finalCoverage = verifyCoverage({
    outputs: finalOutputs,
    plan,
    source,
    outline,
  });
  const finalGrounding = validateGrounding({
    outputs: finalOutputs,
    plan,
    source,
    outline,
  });
  const finalLeakage = validateLeakage({
    outputs: finalOutputs,
    plan,
  });
  const state: PipelineAssemblyErrorState = {
    source,
    outline,
    plan,
    outputs: finalOutputs,
    coverage: finalCoverage,
    grounding: finalGrounding,
    leakage: finalLeakage,
    sectionValidationFailures: Array.from(
      sectionValidationFailures.values(),
    ),
  };

  let reviewer: ReviewerOutput;
  try {
    reviewer = assembleReviewer({
      outputs: finalOutputs,
      coverage: finalCoverage,
      grounding: finalGrounding,
      leakage: finalLeakage,
      plan,
      source,
      allowWeakSections: args.allowWeakSections,
    });
  } catch (error) {
    throw new PipelineAssemblyError(
      errorMessage(error),
      state,
      error,
    );
  }

  if (state.sectionValidationFailures.length > 0) {
    throw new PipelineAssemblyError(
      `Stage 3 validation failed for ${state.sectionValidationFailures.length} section(s).`,
      state,
      state.sectionValidationFailures,
    );
  }

  return reviewer;
}

function createSectionValidationFailure(
  sectionTitle: string,
  error: SectionValidationError,
): SectionValidationFailure {
  return {
    sectionTitle,
    sectionId: error.sectionId,
    stage: error.stage,
    reason: error.reason,
    issues: error.issues,
  };
}

function validateArgs(args: RunPipelineArgs): void {
  if (!args || !args.input || typeof args.input !== "object") {
    throw new Error("Pipeline requires source normalization input.");
  }
  if (!args.provider || typeof args.provider.generate !== "function") {
    throw new Error("Pipeline requires a generation provider.");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
