import type { GenerationProvider } from "./provider";
import { validateLeakage } from "./leakage-guard.js";
import { generateSection } from "./stage3-generate.js";
import { verifyCoverage } from "./stage4-verify.js";
import { validateGrounding } from "./stage5a-grounding.js";
import type {
  CoverageReport,
  CoverageStatus,
  GenerationPlan,
  GroundingReport,
  LeakageReport,
  NormalizedSource,
  PlannedSection,
  RetryPolicy,
  SectionCoverageResult,
  SectionGroundingResult,
  SectionLeakageResult,
  SectionOutput,
  SourceOutline,
} from "./types";

export interface RetryFailedSectionsArgs {
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
  readonly grounding?: GroundingReport;
  readonly leakage?: LeakageReport;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly provider: GenerationProvider;
  readonly retryPolicy?: RetryPolicy;
  readonly model?: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export const defaultRetryPolicy: RetryPolicy = {
  maxRetries: 2,
  retryWeakSections: true,
  retryFailedSections: true,
};

export async function retryFailedSections(
  args: RetryFailedSectionsArgs,
): Promise<readonly SectionOutput[]> {
  validateArgs(args);

  const { plan, source, outline, provider, coverage, grounding, leakage } = args;
  const retryPolicy = args.retryPolicy ?? defaultRetryPolicy;
  validateRetryPolicy(retryPolicy);
  validatePlanAndReports({ plan, source, outline, coverage, grounding, leakage });

  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const currentOutputs = new Map<string, SectionOutput>();
  for (const output of args.outputs) {
    if (
      plannedSectionIds.has(output.plannedSectionId) &&
      !currentOutputs.has(output.plannedSectionId)
    ) {
      currentOutputs.set(output.plannedSectionId, output);
    }
  }

  if (retryPolicy.maxRetries === 0) {
    return orderedOutputs(plan, currentOutputs);
  }

  const coverageBySectionId = new Map(
    coverage.sections.map((result) => [result.plannedSectionId, result] as const),
  );
  const groundingBySectionId = new Map(
    (grounding?.sections ?? []).map(
      (result) => [result.plannedSectionId, result] as const,
    ),
  );
  const leakageBySectionId = new Map(
    (leakage?.sections ?? []).map(
      (result) => [result.plannedSectionId, result] as const,
    ),
  );

  for (const section of plan.sections) {
    const result = requireCoverageResult(section, coverageBySectionId);
    const groundingResult = groundingBySectionId.get(section.id);
    const leakageResult = leakageBySectionId.get(section.id);
    if (!shouldRetry(result, groundingResult, leakageResult, retryPolicy)) {
      continue;
    }

    for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt += 1) {
      let generated: SectionOutput;
      try {
        generated = await generateSection({
          section,
          plan,
          source,
          provider,
          model: args.model,
          temperature: args.temperature,
          metadata: {
            ...args.metadata,
            retryAttempt: attempt,
          },
        });
      } catch {
        continue;
      }

      currentOutputs.set(section.id, generated);
      const refreshedCoverage = verifyCoverage({
        outputs: orderedOutputs(plan, currentOutputs),
        plan,
        source,
        outline,
      });
      const refreshedGrounding =
        grounding === undefined
          ? undefined
          : validateGrounding({
              outputs: orderedOutputs(plan, currentOutputs),
              plan,
              source,
              outline,
            });
      const refreshedLeakage =
        leakage === undefined
          ? undefined
          : validateLeakage({
              outputs: orderedOutputs(plan, currentOutputs),
              plan,
            });
      const refreshedResult = refreshedCoverage.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const refreshedGroundingResult = refreshedGrounding?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      const refreshedLeakageResult = refreshedLeakage?.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      if (
        isSectionAccepted(
          refreshedResult,
          refreshedGroundingResult,
          refreshedLeakageResult,
        )
      ) {
        break;
      }
    }
  }

  return orderedOutputs(plan, currentOutputs);
}

function validateArgs(args: RetryFailedSectionsArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Stage 5 retry requires generated outputs.");
  }
  if (!isRecord(args.coverage)) {
    throw new Error("Stage 5 retry requires a coverage report.");
  }
  if (!isRecord(args.plan)) {
    throw new Error("Stage 5 retry requires a generation plan.");
  }
  if (!isRecord(args.source)) {
    throw new Error("Stage 5 retry requires a normalized source.");
  }
  if (!isRecord(args.outline)) {
    throw new Error("Stage 5 retry requires a source outline.");
  }
  if (!args.provider || typeof args.provider.generate !== "function") {
    throw new Error("Stage 5 retry requires a generation provider.");
  }
}

function validateRetryPolicy(policy: RetryPolicy): void {
  if (
    !Number.isInteger(policy.maxRetries) ||
    policy.maxRetries < 0 ||
    policy.maxRetries > 5
  ) {
    throw new Error(
      "Stage 5 retry policy maxRetries must be an integer between 0 and 5.",
    );
  }
}

function validatePlanAndReports(args: {
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly coverage: CoverageReport;
  readonly grounding?: GroundingReport;
  readonly leakage?: LeakageReport;
}): void {
  const { plan, source, outline, coverage, grounding, leakage } = args;
  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    throw new Error("Stage 5 retry requires at least one planned section.");
  }
  if (coverage.planId !== plan.id) {
    throw new Error(
      `Stage 5 coverage mismatch: coverage plan ID "${coverage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (plan.sourceId !== source.id) {
    throw new Error(
      `Stage 5 source mismatch: plan source ID "${plan.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (coverage.sourceId !== source.id) {
    throw new Error(
      `Stage 5 coverage source mismatch: coverage source ID "${coverage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (outline.sourceId !== source.id) {
    throw new Error(
      `Stage 5 outline source mismatch: outline source ID "${outline.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (coverage.coverageBasis !== "source-outline") {
    throw new Error("Stage 5 coverage must use source-outline coverage basis.");
  }

  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  for (const section of plan.sections) {
    const referencedBlockIds = new Set([
      ...section.sourceBlockIds,
      ...section.target.requiredSourceBlockIds,
    ]);
    for (const blockId of referencedBlockIds) {
      if (!sourceBlockIds.has(blockId)) {
        throw new Error(
          `Stage 5 planned section "${section.id}" references missing source block ID "${blockId}".`,
        );
      }
    }
  }

  const seenCoverageIds = new Set<string>();
  for (const result of coverage.sections) {
    if (!plannedSectionIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 5 coverage references unknown planned section "${result.plannedSectionId}".`,
      );
    }
    if (seenCoverageIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 5 coverage contains duplicate result for planned section "${result.plannedSectionId}".`,
      );
    }
    seenCoverageIds.add(result.plannedSectionId);
  }

  for (const section of plan.sections) {
    if (!seenCoverageIds.has(section.id)) {
      throw new Error(
        `Stage 5 coverage is missing planned section "${section.id}".`,
      );
    }
  }

  if (grounding !== undefined) {
    validateGroundingReport(plan, source, grounding);
  }
  if (leakage !== undefined) {
    validateLeakageReport(plan, source, leakage);
  }
}

function requireCoverageResult(
  section: PlannedSection,
  coverageBySectionId: ReadonlyMap<string, SectionCoverageResult>,
): SectionCoverageResult {
  const result = coverageBySectionId.get(section.id);
  if (!result) {
    throw new Error(`Stage 5 coverage is missing planned section "${section.id}".`);
  }
  return result;
}

function shouldRetry(
  result: SectionCoverageResult,
  groundingResult: SectionGroundingResult | undefined,
  leakageResult: SectionLeakageResult | undefined,
  policy: RetryPolicy,
): boolean {
  const shouldRetryCoverage =
    result.retryable &&
    result.status !== "passed" &&
    isEnabledStatus(result.status, policy);
  const shouldRetryGrounding =
    groundingResult?.retryable === true && groundingResult.status === "failed";
  const shouldRetryLeakage =
    leakageResult?.retryable === true && leakageResult.status === "failed";

  if (shouldRetryCoverage) {
    return true;
  }
  return shouldRetryGrounding || shouldRetryLeakage;
}

function isEnabledStatus(status: CoverageStatus, policy: RetryPolicy): boolean {
  if (status === "weak") {
    return policy.retryWeakSections;
  }
  if (status === "failed") {
    return policy.retryFailedSections;
  }
  return false;
}

function orderedOutputs(
  plan: GenerationPlan,
  outputsBySectionId: ReadonlyMap<string, SectionOutput>,
): readonly SectionOutput[] {
  return plan.sections.flatMap((section) => {
    const output = outputsBySectionId.get(section.id);
    return output ? [output] : [];
  });
}

function validateGroundingReport(
  plan: GenerationPlan,
  source: NormalizedSource,
  grounding: GroundingReport,
): void {
  if (grounding.planId !== plan.id) {
    throw new Error(
      `Stage 5 grounding mismatch: grounding plan ID "${grounding.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (grounding.sourceId !== source.id) {
    throw new Error(
      `Stage 5 grounding source mismatch: grounding source ID "${grounding.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  validateReportSections(
    plan,
    grounding.sections.map((section) => section.plannedSectionId),
    "grounding",
  );
}

function validateLeakageReport(
  plan: GenerationPlan,
  source: NormalizedSource,
  leakage: LeakageReport,
): void {
  if (leakage.planId !== plan.id) {
    throw new Error(
      `Stage 5 leakage mismatch: leakage plan ID "${leakage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (leakage.sourceId !== source.id) {
    throw new Error(
      `Stage 5 leakage source mismatch: leakage source ID "${leakage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  validateReportSections(
    plan,
    leakage.sections.map((section) => section.plannedSectionId),
    "leakage",
  );
}

function validateReportSections(
  plan: GenerationPlan,
  sectionIds: readonly string[],
  reportName: string,
): void {
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const seenSectionIds = new Set<string>();
  for (const sectionId of sectionIds) {
    if (!plannedSectionIds.has(sectionId)) {
      throw new Error(
        `Stage 5 ${reportName} references unknown planned section "${sectionId}".`,
      );
    }
    if (seenSectionIds.has(sectionId)) {
      throw new Error(
        `Stage 5 ${reportName} contains duplicate result for planned section "${sectionId}".`,
      );
    }
    seenSectionIds.add(sectionId);
  }

  for (const section of plan.sections) {
    if (!seenSectionIds.has(section.id)) {
      throw new Error(
        `Stage 5 ${reportName} is missing planned section "${section.id}".`,
      );
    }
  }
}

function isSectionAccepted(
  coverage: SectionCoverageResult | undefined,
  grounding: SectionGroundingResult | undefined,
  leakage: SectionLeakageResult | undefined,
): boolean {
  return (
    coverage?.status === "passed" &&
    (grounding === undefined || grounding.status === "passed") &&
    (leakage === undefined || leakage.status === "passed")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
