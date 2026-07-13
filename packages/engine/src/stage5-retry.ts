import type { GenerationProvider } from "./provider";
import { validateLeakage } from "./leakage-guard.js";
import {
  collectSectionSourceBlocks,
  generateSection,
  SectionProviderError,
  SectionValidationError,
} from "./stage3-generate.js";
import { normalizeCoverageTitleKey, verifyCoverage } from "./stage4-verify.js";
import {
  extractGroundingSourceSectionText,
  validateGrounding,
} from "./stage5a-grounding.js";
import { extractCleanSourceItems } from "./source-items.js";
import { extractProtectedSourceTokens } from "./source-token-fidelity.js";
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
  ReviewerSectionQualityStatus,
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
  readonly onValidationFailure?: (
    section: PlannedSection,
    error: SectionValidationError,
  ) => void;
  readonly onRetryAttempt?: (
    section: PlannedSection,
    attempt: number,
  ) => void;
  readonly onProviderFailure?: (section: PlannedSection, error: unknown) => void;
  readonly onSectionRecovered?: (
    section: PlannedSection,
    status: Exclude<ReviewerSectionQualityStatus, "generated">,
  ) => void;
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
    let sectionCoverage = requireCoverageResult(section, coverageBySectionId);
    let sectionGrounding = groundingBySectionId.get(section.id);
    let sectionLeakage = leakageBySectionId.get(section.id);
    if (
      !shouldRetry(
        sectionCoverage,
        sectionGrounding,
        sectionLeakage,
        retryPolicy,
      )
    ) {
      continue;
    }

    for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt += 1) {
      args.onRetryAttempt?.(section, attempt);
      let generated: SectionOutput;
      try {
        generated = await generateSection({
          section,
          plan,
          source,
          provider,
          model: args.model,
          temperature: args.temperature,
          retryGuidance: buildRetryGuidance(
            section,
            source,
            sectionCoverage,
            sectionGrounding,
            sectionLeakage,
          ),
          metadata: {
            ...args.metadata,
            retryAttempt: attempt,
          },
        });
      } catch (error) {
        if (error instanceof SectionValidationError) {
          args.onValidationFailure?.(section, error);
          continue;
        }
        if (error instanceof SectionProviderError) {
          args.onProviderFailure?.(section, error);
          continue;
        }
        throw error;
      }

      currentOutputs.set(section.id, generated);
      const refreshed = refreshSectionReports({
        section,
        currentOutputs,
        plan,
        source,
        outline,
        groundingEnabled: grounding !== undefined,
        leakageEnabled: leakage !== undefined,
      });
      sectionCoverage = refreshed.coverage;
      sectionGrounding = refreshed.grounding;
      sectionLeakage = refreshed.leakage;
      if (
        isSectionAccepted(
          sectionCoverage,
          sectionGrounding,
          sectionLeakage,
        )
      ) {
        args.onSectionRecovered?.(section, "repaired");
        break;
      }
    }

    if (isSectionAccepted(sectionCoverage, sectionGrounding, sectionLeakage)) {
      continue;
    }

    const sourceOutlineSection = outline.sections.find(
      (candidate) => candidate.id === section.sourceSectionId,
    );
    const sourceTextOverride = sourceOutlineSection
      ? extractGroundingSourceSectionText(source, sourceOutlineSection)
      : undefined;
    const fallbackOutput = createExtractiveSectionFallback({
      section,
      source,
      sourceTextOverride,
    });
    if (!fallbackOutput) {
      currentOutputs.delete(section.id);
      continue;
    }

    currentOutputs.set(section.id, fallbackOutput);
    let fallbackReports = refreshSectionReports({
      section,
      currentOutputs,
      plan,
      source,
      outline,
      groundingEnabled: grounding !== undefined,
      leakageEnabled: leakage !== undefined,
    });
    let accepted = isSectionAccepted(
      fallbackReports.coverage,
      fallbackReports.grounding,
      fallbackReports.leakage,
    );
    if (!accepted) {
      const blockFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        mode: "blocks",
      });
      if (blockFallback) {
        currentOutputs.set(section.id, blockFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        );
      }
    }
    if (!accepted) {
      const lineFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        mode: "lines",
      });
      if (lineFallback) {
        currentOutputs.set(section.id, lineFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        );
      }
    }
    if (!accepted) {
      const spanFallback = createExtractiveSectionFallback({
        section,
        source,
        sourceTextOverride,
        mode: "span",
      });
      if (spanFallback) {
        currentOutputs.set(section.id, spanFallback);
        fallbackReports = refreshSectionReports({
          section,
          currentOutputs,
          plan,
          source,
          outline,
          groundingEnabled: grounding !== undefined,
          leakageEnabled: leakage !== undefined,
        });
        accepted = isSectionAccepted(
          fallbackReports.coverage,
          fallbackReports.grounding,
          fallbackReports.leakage,
        );
      }
    }
    if (accepted) {
      args.onSectionRecovered?.(section, "extractive_fallback");
    }
  }

  return orderedOutputs(plan, currentOutputs);
}

function refreshSectionReports(args: {
  readonly section: PlannedSection;
  readonly currentOutputs: ReadonlyMap<string, SectionOutput>;
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
  readonly groundingEnabled: boolean;
  readonly leakageEnabled: boolean;
}): {
  readonly coverage: SectionCoverageResult;
  readonly grounding: SectionGroundingResult | undefined;
  readonly leakage: SectionLeakageResult | undefined;
} {
  const outputs = orderedOutputs(args.plan, args.currentOutputs);
  const refreshedCoverage = verifyCoverage({
    outputs,
    plan: args.plan,
    source: args.source,
    outline: args.outline,
  });
  const refreshedGrounding = args.groundingEnabled
    ? validateGrounding({
        outputs,
        plan: args.plan,
        source: args.source,
        outline: args.outline,
      })
    : undefined;
  const refreshedLeakage = args.leakageEnabled
    ? validateLeakage({
        outputs,
        plan: args.plan,
        source: args.source,
      })
    : undefined;
  const coverage = refreshedCoverage.sections.find(
    (candidate) => candidate.plannedSectionId === args.section.id,
  );
  if (!coverage) {
    throw new Error(
      `Stage 5 coverage is missing planned section "${args.section.id}".`,
    );
  }

  return {
    coverage,
    grounding: refreshedGrounding?.sections.find(
      (candidate) => candidate.plannedSectionId === args.section.id,
    ),
    leakage: refreshedLeakage?.sections.find(
      (candidate) => candidate.plannedSectionId === args.section.id,
    ),
  };
}

export function createExtractiveSectionFallback(args: {
  readonly section: PlannedSection;
  readonly source: NormalizedSource;
  readonly sourceTextOverride?: string;
  readonly mode?: "items" | "blocks" | "lines" | "span";
}): SectionOutput | undefined {
  const sourceBlocks = collectSectionSourceBlocks(args.section, args.source);
  const sourceText =
    args.sourceTextOverride?.trim() ||
    sourceBlocks.map((block) => block.text).join("\n").trim();
  if (sourceText.length === 0) {
    return undefined;
  }

  const detectedItems = extractCleanSourceItems({
    sourceSpanText: sourceText,
    sectionTitle: args.section.title,
  }).map((item) => normalizeBlockText(item.text));
  const sourceLines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const extractiveItems = detectedItems.map(
    (item) => {
      const restoredItem = restoreProtectedSourceTokens(item, sourceText);
      return (
      findRawItemText(restoredItem, sourceText) ??
      sourceLines.find(
        (line) =>
          normalizeCoverageTitleKey(line) === normalizeCoverageTitleKey(restoredItem),
      ) ?? restoredItem
      );
    },
  );
  const allBlocks = sourceLines.length > 0 ? sourceLines : [normalizeBlockText(sourceText)];
  const contentBlocks = allBlocks.filter(
    (text) => normalizeBlockText(text).toLocaleLowerCase() !== normalizeBlockText(args.section.title).toLocaleLowerCase(),
  );
  const proseBlocks = contentBlocks.filter((text) => /[.!?]$/.test(text));
  const explanation =
    proseBlocks.at(-1) ?? contentBlocks.at(-1) ?? detectedItems[0] ?? allBlocks[0];
  if (!explanation) {
    return undefined;
  }

  const keyPoints = uniqueExtracts(
    args.mode === "span"
      ? [
          sourceText,
          ...extractiveItems.filter(
            (item) =>
              !normalizeCoverageTitleKey(sourceText).includes(
                normalizeCoverageTitleKey(item),
              ),
          ),
        ]
      : args.mode === "lines"
      ? sourceLines
      : args.mode !== "blocks" && extractiveItems.length > 0
      ? extractiveItems
      : proseBlocks.length > 1
        ? proseBlocks.slice(0, -1)
        : contentBlocks.length > 0
          ? contentBlocks
          : allBlocks,
  );
  return {
    id: stableId("extractive", `${args.source.id}\u001f${args.section.id}`),
    kind: args.section.schemaKind,
    plannedSectionId: args.section.id,
    title: args.section.title,
    sourceBlockIds: [...args.section.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints: keyPoints.length > 0 ? keyPoints : [explanation],
    },
    enrichment: null,
  } as SectionOutput;
}

function normalizeBlockText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueExtracts(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findRawItemText(item: string, sourceText: string): string | undefined {
  const components = item.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (components.length === 0) return undefined;
  const match = new RegExp(
    components.map(escapeRegExp).join("[^\\p{L}\\p{N}]+"),
    "iu",
  ).exec(sourceText);
  return match?.[0].trim();
}

function restoreProtectedSourceTokens(item: string, sourceText: string): string {
  return extractProtectedSourceTokens(sourceText).reduce((restored, token) => {
    if (restored.includes(token.text)) return restored;
    const components = token.text.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (components.length === 0) return restored;
    const pattern = new RegExp(
      components.map(escapeRegExp).join("[^\\p{L}\\p{N}]*"),
      "iu",
    );
    if (!pattern.test(restored)) return restored;
    const candidate = restored.replace(pattern, token.text);
    return alphaNumericKey(candidate) === alphaNumericKey(restored)
      ? candidate
      : restored;
  }, item);
}

function alphaNumericKey(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
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

function buildRetryGuidance(
  section: PlannedSection,
  source: NormalizedSource,
  coverageResult: SectionCoverageResult,
  groundingResult: SectionGroundingResult | undefined,
  leakageResult: SectionLeakageResult | undefined,
): readonly string[] {
  const guidance: string[] = [];
  const failedFields = new Set<string>();
  for (const issue of groundingResult?.issues ?? []) {
    if (issue.fieldPath) failedFields.add(issue.fieldPath);
  }
  for (const issue of leakageResult?.issues ?? []) {
    failedFields.add(issue.fieldPath);
  }
  if (coverageResult.status !== "passed") {
    failedFields.add("sourceCore");
  }
  if (failedFields.size > 0) {
    guidance.push(
      `Repair only the failed field scope when practical: ${[...failedFields].join(", ")}. Preserve already grounded fields, shorten uncertain wording, and regenerate the entire section only if the listed fields cannot be repaired independently.`,
    );
  }
  const exactTerms = collectAllowedSourceTerms(section, source);
  if (exactTerms.length > 0) {
    guidance.push(
      `Allowed source terminology that should be preserved exactly when used: ${exactTerms.join(", ")}.`,
    );
  }
  guidance.push(
    "Do not add examples, synonyms, explanations, recommendations, or consequences absent from the passage.",
  );

  if (coverageResult.status !== "passed" && coverageResult.issues.length > 0) {
    guidance.push(
      `Previous coverage status was ${coverageResult.status}. Fix these coverage issues: ${coverageResult.issues.join("; ")}`,
    );
  }

  if (groundingResult?.status === "failed") {
    guidance.push(
      "Previous default student-visible content failed grounding. Use the exact topic heading as title, rewrite sourceCore using only facts and terms present in the section passage, and set enrichment to null. If the passage is only a heading or very short phrase, use a minimal restatement of that exact text.",
    );
    guidance.push(
      ...groundingResult.issues.slice(0, 5).map(formatGroundingIssueGuidance),
    );
  }

  if (leakageResult?.status === "failed") {
    guidance.push(
      "Previous output contained internal or forbidden wording. Remove every leaked term from title, sourceCore, and enrichment.",
    );
    guidance.push(
      ...leakageResult.issues.slice(0, 5).map(formatLeakageIssueGuidance),
    );
  }

  return guidance;
}

function collectAllowedSourceTerms(
  section: PlannedSection,
  source: NormalizedSource,
): readonly string[] {
  const text = collectSectionSourceBlocks(section, source)
    .map((block) => block.text)
    .join(" ");
  const candidates = text.match(/\b(?:[A-Z]{2,}(?:-[A-Z0-9]+)*|[A-Z][A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|\d+(?:\.\d+)*%?)\b/g) ?? [];
  return uniqueExtracts(candidates).slice(0, 24);
}

function formatGroundingIssueGuidance(
  issue: SectionGroundingResult["issues"][number],
): string {
  const details = [
    issue.message,
    issue.fieldPath ? `field=${issue.fieldPath}` : "",
    issue.offendingText
      ? `unsupported=${issue.offendingText.join(", ")}`
      : "",
    issue.sourceItem ? `missingSourceItem=${issue.sourceItem}` : "",
  ].filter((value) => value.length > 0);

  return `Grounding issue: ${details.join(" | ")}`;
}

function formatLeakageIssueGuidance(
  issue: SectionLeakageResult["issues"][number],
): string {
  return `Leakage issue in ${issue.fieldPath}: rewrite it as plain student-facing prose without label-and-colon formatting or internal wording.`;
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
