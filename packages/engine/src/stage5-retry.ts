import type { GenerationProvider } from "./provider";
import { generateSection } from "./stage3-generate.js";
import { verifyCoverage } from "./stage4-verify.js";
import type {
  CoverageReport,
  CoverageStatus,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  RetryPolicy,
  SectionCoverageResult,
  SectionOutput,
  SourceOutline,
} from "./types";

export interface RetryFailedSectionsArgs {
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
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

  const { plan, source, outline, provider, coverage } = args;
  const retryPolicy = args.retryPolicy ?? defaultRetryPolicy;
  validateRetryPolicy(retryPolicy);
  validatePlanAndCoverage(plan, source, outline, coverage);

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

  for (const section of plan.sections) {
    const result = requireCoverageResult(section, coverageBySectionId);
    if (!shouldRetry(result, retryPolicy)) {
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
      const refreshedResult = refreshedCoverage.sections.find(
        (candidate) => candidate.plannedSectionId === section.id,
      );
      if (refreshedResult?.status === "passed") {
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

function validatePlanAndCoverage(
  plan: GenerationPlan,
  source: NormalizedSource,
  outline: SourceOutline,
  coverage: CoverageReport,
): void {
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
  policy: RetryPolicy,
): boolean {
  if (!result.retryable || result.status === "passed") {
    return false;
  }
  return isEnabledStatus(result.status, policy);
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
