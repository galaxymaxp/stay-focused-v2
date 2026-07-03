import type { GenerationProvider } from "./provider";
import { normalizeSource } from "./stage0-normalize.js";
import { detectOutline } from "./stage1-outline.js";
import { buildGenerationPlan } from "./stage2-plan.js";
import {
  collectSectionSourceBlocks,
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
  PlannedSection,
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
  readonly retryAttemptsBySectionId: Readonly<Record<string, number>>;
}

export interface PipelineAssemblyOutputDiagnostic {
  readonly outputId: string;
  readonly kind: string;
  readonly title: string;
  readonly sourceBlockIds: readonly string[];
  readonly explanationLength: number;
  readonly explanationExcerpt: string;
  readonly keyPointCount: number;
  readonly keyPointExcerpts: readonly string[];
}

export interface PipelineAssemblySectionDiagnostic {
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly status: string;
  readonly failureReasons: readonly string[];
  readonly issues: readonly string[];
  readonly retryCount: number;
  readonly coverageScore?: number;
  readonly coverageStatus?: string;
  readonly groundingScore?: number;
  readonly groundingStatus?: string;
  readonly leakageStatus?: string;
  readonly leakageIssueCount?: number;
  readonly sourceSpanLength?: number;
  readonly sourceExcerpt?: string;
  readonly output?: PipelineAssemblyOutputDiagnostic;
}

export interface PipelineAssemblyDiagnostics {
  readonly causeMessage: string;
  readonly failingSections: readonly PipelineAssemblySectionDiagnostic[];
  readonly sectionValidationFailures: readonly SectionValidationFailure[];
}

export class PipelineAssemblyError extends Error {
  public readonly state: PipelineAssemblyErrorState;
  public readonly diagnostics: PipelineAssemblyDiagnostics;
  public override readonly cause: unknown;

  public constructor(
    message: string,
    state: PipelineAssemblyErrorState,
    cause: unknown,
  ) {
    super(message);
    this.name = "PipelineAssemblyError";
    this.state = state;
    this.diagnostics = createPipelineAssemblyDiagnostics(state, cause);
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
  const retryAttemptsBySectionId = new Map<string, number>();

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
    source,
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
    onRetryAttempt: (section, attempt) => {
      retryAttemptsBySectionId.set(
        section.id,
        Math.max(retryAttemptsBySectionId.get(section.id) ?? 0, attempt),
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
    source,
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
    retryAttemptsBySectionId: Object.fromEntries(retryAttemptsBySectionId),
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

function createPipelineAssemblyDiagnostics(
  state: PipelineAssemblyErrorState,
  cause: unknown,
): PipelineAssemblyDiagnostics {
  const outputsBySectionId = new Map(
    state.outputs.map((output) => [output.plannedSectionId, output] as const),
  );
  const coverageBySectionId = new Map(
    state.coverage.sections.map(
      (section) => [section.plannedSectionId, section] as const,
    ),
  );
  const groundingBySectionId = new Map(
    state.grounding.sections.map(
      (section) => [section.plannedSectionId, section] as const,
    ),
  );
  const leakageBySectionId = new Map(
    state.leakage.sections.map(
      (section) => [section.plannedSectionId, section] as const,
    ),
  );
  const validationFailuresBySectionId = new Map(
    state.sectionValidationFailures.map(
      (failure) => [failure.sectionId, failure] as const,
    ),
  );
  const causeMessage = errorMessage(cause);
  const causePlannedSectionId = readPlannedSectionIdFromMessage(causeMessage);
  const failingSections = state.plan.sections
    .filter((section) => {
      const coverage = coverageBySectionId.get(section.id);
      const grounding = groundingBySectionId.get(section.id);
      const leakage = leakageBySectionId.get(section.id);

      return (
        section.id === causePlannedSectionId ||
        !outputsBySectionId.has(section.id) ||
        coverage === undefined ||
        coverage.status !== "passed" ||
        grounding === undefined ||
        grounding.status !== "passed" ||
        leakage === undefined ||
        leakage.status !== "passed" ||
        validationFailuresBySectionId.has(section.id)
      );
    })
    .map((section) =>
      createSectionDiagnostic({
        section,
        state,
        output: outputsBySectionId.get(section.id),
        coverage: coverageBySectionId.get(section.id),
        grounding: groundingBySectionId.get(section.id),
        leakage: leakageBySectionId.get(section.id),
        validationFailure: validationFailuresBySectionId.get(section.id),
      }),
    );

  return {
    causeMessage: sanitizeDiagnosticText(causeMessage, 800),
    failingSections,
    sectionValidationFailures: state.sectionValidationFailures.map(
      sanitizeSectionValidationFailure,
    ),
  };
}

function sanitizeSectionValidationFailure(
  failure: SectionValidationFailure,
): SectionValidationFailure {
  return {
    ...failure,
    sectionTitle: sanitizeDiagnosticText(failure.sectionTitle, 200),
    sectionId: sanitizeDiagnosticText(failure.sectionId, 160),
    issues: failure.issues.map((issue) => sanitizeDiagnosticText(issue, 300)),
  };
}

function createSectionDiagnostic(args: {
  readonly section: PlannedSection;
  readonly state: PipelineAssemblyErrorState;
  readonly output: SectionOutput | undefined;
  readonly coverage: CoverageReport["sections"][number] | undefined;
  readonly grounding: GroundingReport["sections"][number] | undefined;
  readonly leakage: LeakageReport["sections"][number] | undefined;
  readonly validationFailure: SectionValidationFailure | undefined;
}): PipelineAssemblySectionDiagnostic {
  const failureReasons = sectionFailureReasons(args);
  const issues = sectionIssues(args);
  const sourceSpan = sourceSpanDiagnostic(args.section, args.state.source);

  return {
    plannedSectionId: args.section.id,
    sourceSectionId: args.section.sourceSectionId,
    title: sanitizeDiagnosticText(args.section.title, 200),
    status: sectionDiagnosticStatus(args),
    failureReasons,
    issues,
    retryCount: args.state.retryAttemptsBySectionId[args.section.id] ?? 0,
    ...(args.coverage
      ? {
          coverageStatus: args.coverage.status,
          coverageScore: args.coverage.score,
        }
      : {}),
    ...(args.grounding
      ? {
          groundingStatus: args.grounding.status,
          groundingScore: args.grounding.score,
        }
      : {}),
    ...(args.leakage
      ? {
          leakageStatus: args.leakage.status,
          leakageIssueCount: args.leakage.issues.length,
        }
      : {}),
    ...sourceSpan,
    ...(args.output ? { output: outputDiagnostic(args.output) } : {}),
  };
}

function sectionFailureReasons(args: {
  readonly output: SectionOutput | undefined;
  readonly coverage: CoverageReport["sections"][number] | undefined;
  readonly grounding: GroundingReport["sections"][number] | undefined;
  readonly leakage: LeakageReport["sections"][number] | undefined;
  readonly validationFailure: SectionValidationFailure | undefined;
}): readonly string[] {
  const reasons: string[] = [];

  if (!args.output) {
    reasons.push("missing-output");
  }
  if (!args.coverage) {
    reasons.push("missing-coverage");
  } else if (args.coverage.status !== "passed") {
    reasons.push(`coverage-${args.coverage.status}`);
  }
  if (!args.grounding) {
    reasons.push("missing-grounding");
  } else if (args.grounding.status !== "passed") {
    reasons.push(`grounding-${args.grounding.status}`);
  }
  if (!args.leakage) {
    reasons.push("missing-leakage");
  } else if (args.leakage.status !== "passed") {
    reasons.push(`leakage-${args.leakage.status}`);
  }
  if (args.validationFailure) {
    reasons.push(`stage3-${args.validationFailure.reason}`);
  }

  return reasons.length > 0 ? reasons : ["assembly-rejected"];
}

function sectionIssues(args: {
  readonly output: SectionOutput | undefined;
  readonly coverage: CoverageReport["sections"][number] | undefined;
  readonly grounding: GroundingReport["sections"][number] | undefined;
  readonly leakage: LeakageReport["sections"][number] | undefined;
  readonly validationFailure: SectionValidationFailure | undefined;
}): readonly string[] {
  const issues: string[] = [];

  if (!args.output) {
    issues.push("Missing generated output.");
  }
  if (!args.coverage) {
    issues.push("Missing coverage result.");
  } else {
    issues.push(...args.coverage.issues);
  }
  if (!args.grounding) {
    issues.push("Missing grounding result.");
  } else {
    issues.push(...args.grounding.issues.map((issue) => issue.message));
  }
  if (!args.leakage) {
    issues.push("Missing leakage result.");
  } else {
    issues.push(...args.leakage.issues.map((issue) => issue.message));
  }
  if (args.validationFailure) {
    issues.push(...args.validationFailure.issues);
  }

  return issues.map((issue) => sanitizeDiagnosticText(issue, 300));
}

function sectionDiagnosticStatus(args: {
  readonly output: SectionOutput | undefined;
  readonly coverage: CoverageReport["sections"][number] | undefined;
  readonly grounding: GroundingReport["sections"][number] | undefined;
  readonly leakage: LeakageReport["sections"][number] | undefined;
  readonly validationFailure: SectionValidationFailure | undefined;
}): string {
  if (!args.output || args.validationFailure) {
    return "failed";
  }
  if (args.coverage?.status === "failed" || args.coverage?.status === "weak") {
    return args.coverage.status;
  }
  if (args.grounding?.status === "failed" || args.leakage?.status === "failed") {
    return "failed";
  }
  return "unknown";
}

function sourceSpanDiagnostic(
  section: PlannedSection,
  source: NormalizedSource,
): Pick<
  PipelineAssemblySectionDiagnostic,
  "sourceSpanLength" | "sourceExcerpt"
> {
  try {
    const text = collectSectionSourceBlocks(section, source)
      .map((block) => block.text)
      .join("\n")
      .trim();

    return {
      sourceSpanLength: text.length,
      ...(text
        ? { sourceExcerpt: sanitizeDiagnosticText(text, 240) }
        : {}),
    };
  } catch {
    return {
      sourceSpanLength: Math.max(
        0,
        section.sourceEndOffset - section.sourceStartOffset,
      ),
    };
  }
}

function outputDiagnostic(output: SectionOutput): PipelineAssemblyOutputDiagnostic {
  return {
    outputId: sanitizeDiagnosticText(output.id, 160),
    kind: output.kind,
    title: sanitizeDiagnosticText(output.title, 200),
    sourceBlockIds: output.sourceBlockIds.map((blockId) =>
      sanitizeDiagnosticText(blockId, 120),
    ),
    explanationLength: output.sourceCore.explanation.length,
    explanationExcerpt: sanitizeDiagnosticText(
      output.sourceCore.explanation,
      240,
    ),
    keyPointCount: output.sourceCore.keyPoints.length,
    keyPointExcerpts: output.sourceCore.keyPoints
      .slice(0, 5)
      .map((keyPoint) => sanitizeDiagnosticText(keyPoint, 180)),
  };
}

function readPlannedSectionIdFromMessage(message: string): string | undefined {
  return /planned section "([^"]+)"/.exec(message)?.[1];
}

function sanitizeDiagnosticText(value: string, maxLength: number): string {
  const redacted = value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, "[REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[REDACTED]",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, maxLength)}...[truncated]`;
}
