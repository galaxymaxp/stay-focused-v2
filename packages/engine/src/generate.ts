import type { GenerationProvider, GenerationRequest } from "./provider";
import { normalizeSource } from "./stage0-normalize.js";
import { detectOutline } from "./stage1-outline.js";
import { buildGenerationPlan } from "./stage2-plan.js";
import {
  collectSectionSourceBlocks,
  generateSections,
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
  ReviewerGenerationMetrics,
  ReviewerSectionQualityStatus,
  SectionOutput,
  SourceOutline,
  SourceNormalizationInput,
} from "./types";

export interface RunPipelineArgs extends PipelineOptions {
  readonly input: SourceNormalizationInput;
  readonly provider: GenerationProvider;
  readonly onProgress?: (
    progress: ReviewerPipelineProgress,
  ) => void | Promise<void>;
  readonly shouldCancel?: () => boolean | Promise<boolean>;
}

export interface ReviewerPipelineProgress {
  readonly stage:
    | "normalizing_source"
    | "detecting_outline"
    | "planning_sections"
    | "generating_sections"
    | "verifying_coverage"
    | "retrying_sections"
    | "assembling_reviewer";
  readonly completedUnits?: number;
  readonly totalUnits?: number;
  readonly sourceCharacterCount?: number;
  readonly normalizedCharacterCount?: number;
  readonly outlineItemCount?: number;
  readonly plannedSectionCount?: number;
  readonly providerCallCount: number;
  readonly retryCount: number;
}

export class PipelineCancellationError extends Error {
  public constructor() {
    super("Reviewer generation was cancelled.");
    this.name = "PipelineCancellationError";
  }
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
  readonly generationMetrics?: ReviewerGenerationMetrics;
}

export interface PipelineAssemblyOutputDiagnostic {
  readonly outputId: string;
  readonly kind: string;
  readonly title: string;
  readonly sourceBlockIds: readonly string[];
  readonly explanationLength: number;
  readonly keyPointCount: number;
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
  readonly groundingIssueTypes?: readonly string[];
  readonly groundingFailedFields?: readonly string[];
  readonly leakageStatus?: string;
  readonly leakageIssueCount?: number;
  readonly sourceSpanLength?: number;
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

  const pipelineStartedAt = Date.now();
  const providerObservation = observeProvider(args.provider);
  let providerCallCount = 0;
  let retryCount = 0;
  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "normalizing_source",
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    providerCallCount,
    retryCount,
  });
  const source = await normalizeSource(args.input);
  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "detecting_outline",
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    providerCallCount,
    retryCount,
  });
  const outline = await detectOutline(source);
  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "planning_sections",
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    providerCallCount,
    retryCount,
  });
  const plan = buildGenerationPlan(outline, source);
  const planningCompletedAt = Date.now();
  const initialOutputs: SectionOutput[] = [];
  const sectionValidationFailures = new Map<
    string,
    SectionValidationFailure
  >();
  const retryAttemptsBySectionId = new Map<string, number>();
  const sectionQualityById = new Map<string, ReviewerSectionQualityStatus>();

  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "generating_sections",
    completedUnits: 0,
    totalUnits: plan.sections.length,
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    plannedSectionCount: plan.metadata.standaloneSectionCount ?? plan.sections.length,
    providerCallCount,
    retryCount,
  });
  const initialGeneration = await generateSections({
    sections: plan.sections,
    plan,
    source,
    provider: providerObservation.provider,
    model: args.model,
    temperature: args.temperature,
    metadata: args.metadata,
  });
  initialOutputs.push(...initialGeneration.outputs);
  for (const failure of initialGeneration.validationFailures) {
    const section = plan.sections.find((candidate) => candidate.id === failure.sectionId);
    if (section) {
      sectionValidationFailures.set(
        section.id,
        createSectionValidationFailure(section.title, failure),
      );
    }
  }
  for (const output of initialOutputs) {
    sectionQualityById.set(output.plannedSectionId, "generated");
  }
  providerCallCount = providerObservation.requestCount;
  await emitProgress(args, {
    stage: "generating_sections",
    completedUnits: initialOutputs.length,
    totalUnits: plan.sections.length,
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    plannedSectionCount: plan.metadata.standaloneSectionCount ?? plan.sections.length,
    providerCallCount,
    retryCount,
  });

  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "verifying_coverage",
    completedUnits: initialOutputs.length,
    totalUnits: plan.sections.length,
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    plannedSectionCount: plan.metadata.standaloneSectionCount ?? plan.sections.length,
    providerCallCount,
    retryCount,
  });
  const initialValidationStartedAt = Date.now();
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
  const initialValidationCompletedAt = Date.now();
  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "retrying_sections",
    completedUnits: initialOutputs.length,
    totalUnits: plan.sections.length,
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    plannedSectionCount: plan.metadata.standaloneSectionCount ?? plan.sections.length,
    providerCallCount,
    retryCount,
  });
  const finalOutputs = await retryFailedSections({
    outputs: initialOutputs,
    coverage: initialCoverage,
    grounding: initialGrounding,
    leakage: initialLeakage,
    plan,
    source,
    outline,
    provider: providerObservation.provider,
    retryPolicy: args.retryPolicy,
    model: args.model,
    temperature: args.temperature,
    metadata: args.metadata,
    skipProviderRetries:
      initialGeneration.providerErrors.length > 0 &&
      initialGeneration.providerErrors.every(isPermanentProviderFailure),
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
    onSectionRecovered: (section, status) => {
      sectionQualityById.set(section.id, status);
    },
  });
  providerCallCount = providerObservation.requestCount;
  retryCount = providerObservation.retryRequestCount;
  const finalValidationStartedAt = Date.now();
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
  const finalValidationCompletedAt = Date.now();
  await assertNotCancelled(args);
  await emitProgress(args, {
    stage: "assembling_reviewer",
    completedUnits: finalOutputs.length,
    totalUnits: plan.sections.length,
    sourceCharacterCount: sourceInputCharacterCount(args.input),
    normalizedCharacterCount: normalizedSourceCharacterCount(source),
    outlineItemCount: outline.sections.length,
    plannedSectionCount: plan.metadata.standaloneSectionCount ?? plan.sections.length,
    providerCallCount,
    retryCount,
  });
  const metricsBeforeAssembly: ReviewerGenerationMetrics = {
    totalDurationMs: finalValidationCompletedAt - pipelineStartedAt,
    planningDurationMs: planningCompletedAt - pipelineStartedAt,
    deterministicEvidenceDurationMs: initialGeneration.deterministicAssemblyDurationMs,
    providerWaitDurationMs: providerObservation.waitDurationMs,
    validationDurationMs:
      (initialValidationCompletedAt - initialValidationStartedAt) +
      (finalValidationCompletedAt - finalValidationStartedAt),
    assemblyDurationMs: 0,
    providerRequestCount: providerObservation.requestCount,
    sectionsPerProviderRequest: providerObservation.sectionsPerRequest,
    providerRetryCount: providerObservation.retryRequestCount,
    factualCompletionRetryCount: 0,
    explanationRetryCount: providerObservation.retryRequestCount,
  };
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
    generationMetrics: metricsBeforeAssembly,
  };

  let reviewer: ReviewerOutput;
  try {
    const fallbackPlanUsed =
      plan.sections.every(
        (section) => sectionQualityById.get(section.id) === "extractive_fallback",
      );
    const assemblyStartedAt = Date.now();
    const preliminaryMetrics = metricsBeforeAssembly;
    reviewer = assembleReviewer({
      outputs: finalOutputs,
      coverage: finalCoverage,
      grounding: finalGrounding,
      leakage: finalLeakage,
      plan,
      source,
      allowWeakSections: args.allowWeakSections,
      sectionQualityById: Object.fromEntries(sectionQualityById),
      fallbackPlanUsed,
      generationMetrics: preliminaryMetrics,
    });
    const completedAt = Date.now();
    const metrics: ReviewerGenerationMetrics = {
      ...preliminaryMetrics,
      totalDurationMs: completedAt - pipelineStartedAt,
      assemblyDurationMs: completedAt - assemblyStartedAt,
    };
    reviewer = {
      ...reviewer,
      metadata: { ...reviewer.metadata, generationMetrics: metrics },
    };
  } catch (error) {
    throw new PipelineAssemblyError(
      errorMessage(error),
      state,
      error,
    );
  }

  return reviewer;
}

async function emitProgress(
  args: RunPipelineArgs,
  progress: ReviewerPipelineProgress,
): Promise<void> {
  await args.onProgress?.(progress);
}

async function assertNotCancelled(args: RunPipelineArgs): Promise<void> {
  if (await args.shouldCancel?.()) {
    throw new PipelineCancellationError();
  }
}

function sourceInputCharacterCount(input: SourceNormalizationInput): number {
  if (typeof input.text === "string") {
    return input.text.length;
  }
  return (input.blocks ?? []).reduce((total, block) => total + block.text.length, 0);
}

function normalizedSourceCharacterCount(source: NormalizedSource): number {
  return source.blocks.reduce((total, block) => total + block.text.length, 0);
}

function observeProvider(provider: GenerationProvider): {
  readonly provider: GenerationProvider;
  readonly requestCount: number;
  readonly retryRequestCount: number;
  readonly waitDurationMs: number;
  readonly sectionsPerRequest: readonly number[];
} {
  let requestCount = 0;
  let retryRequestCount = 0;
  let waitDurationMs = 0;
  const sectionsPerRequest: number[] = [];
  const observed: GenerationProvider = {
    async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
      requestCount += 1;
      if (typeof request.metadata?.retryAttempt === "number") retryRequestCount += 1;
      const sectionIds = request.metadata?.explanationBatchSectionIds;
      sectionsPerRequest.push(Array.isArray(sectionIds) ? sectionIds.length : 1);
      const startedAt = Date.now();
      try {
        return await provider.generate<TOutput>(request);
      } finally {
        waitDurationMs += Date.now() - startedAt;
      }
    },
  };
  return {
    provider: observed,
    get requestCount() { return requestCount; },
    get retryRequestCount() { return retryRequestCount; },
    get waitDurationMs() { return waitDurationMs; },
    get sectionsPerRequest() { return [...sectionsPerRequest]; },
  };
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

function isPermanentProviderFailure(error: unknown): boolean {
  const message = errorMessage(error).toLocaleLowerCase();
  return message.includes("no credits remaining") ||
    message.includes("insufficient_quota") ||
    /\b(?:400|401|403|404|422)\b/u.test(message);
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
          groundingIssueTypes: [...new Set(args.grounding.issues.map((issue) => issue.type))],
          groundingFailedFields: [...new Set(args.grounding.issues.map((issue) => issue.fieldPath).filter((field): field is string => Boolean(field)))],
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
  "sourceSpanLength"
> {
  try {
    const text = collectSectionSourceBlocks(section, source)
      .map((block) => block.text)
      .join("\n")
      .trim();

    return {
      sourceSpanLength: text.length,
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
    keyPointCount: output.sourceCore.keyPoints.length,
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
