import type {
  CoverageReport,
  GenerationPlan,
  GroundingReport,
  LeakageReport,
  NormalizedSource,
  ReviewerOutput,
  ReviewerSectionQualityStatus,
  ReviewerSection,
  SectionCoverageResult,
  SectionGroundingResult,
  SectionLeakageResult,
  SectionOutput,
} from "./types";
import { toDefaultStudentVisibleSectionOutput } from "./student-visible-text.js";

export interface AssembleReviewerArgs {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
  readonly grounding: GroundingReport;
  readonly leakage: LeakageReport;
  readonly allowWeakSections?: boolean;
  readonly sectionQualityById?: Readonly<Record<string, ReviewerSectionQualityStatus>>;
  readonly fallbackPlanUsed?: boolean;
}

export function assembleReviewer(args: AssembleReviewerArgs): ReviewerOutput {
  validateArgs(args);

  const { outputs, coverage, grounding, leakage, plan, source } = args;
  const allowWeakSections = args.allowWeakSections ?? false;
  validateRelationships(plan, coverage, grounding, leakage, source);

  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const outputsBySectionId = indexOutputs(outputs, plannedSectionIds);
  const coverageBySectionId = indexCoverage(coverage, plannedSectionIds);
  const groundingBySectionId = indexGrounding(grounding, plannedSectionIds);
  const leakageBySectionId = indexLeakage(leakage, plannedSectionIds);

  const sections = plan.sections.map((plannedSection) => {
    validatePlannedSourceReferences(plannedSection, sourceBlockIds);

    const output = outputsBySectionId.get(plannedSection.id);
    if (!output) {
      throw new Error(
        `Stage 6 assembly is missing output for planned section "${plannedSection.id}".`,
      );
    }
    if (output.kind !== plannedSection.schemaKind) {
      throw new Error(
        `Stage 6 output kind mismatch for planned section "${plannedSection.id}": expected "${plannedSection.schemaKind}" but received "${output.kind}".`,
      );
    }
    validateOutputSourceReferences(output, sourceBlockIds);

    const sectionCoverage = coverageBySectionId.get(plannedSection.id);
    if (!sectionCoverage) {
      throw new Error(
        `Stage 6 coverage is missing planned section "${plannedSection.id}".`,
      );
    }
    validateCoverageAcceptance(
      plannedSection.id,
      sectionCoverage,
      allowWeakSections,
    );
    const sectionGrounding = groundingBySectionId.get(plannedSection.id);
    if (!sectionGrounding) {
      throw new Error(
        `Stage 6 grounding is missing planned section "${plannedSection.id}".`,
      );
    }
    validateGroundingAcceptance(plannedSection.id, sectionGrounding);

    const sectionLeakage = leakageBySectionId.get(plannedSection.id);
    if (!sectionLeakage) {
      throw new Error(
        `Stage 6 leakage is missing planned section "${plannedSection.id}".`,
      );
    }
    validateLeakageAcceptance(plannedSection.id, sectionLeakage);

    return createReviewerSection(
      plannedSection,
      output,
      sectionCoverage,
      sectionGrounding,
      sectionLeakage,
      source.id,
      plan.id,
      coverage.id,
      args.sectionQualityById?.[plannedSection.id] ?? "generated",
    );
  });
  validateReportAcceptance(coverage);
  validateGroundingReportAcceptance(grounding);
  validateLeakageReportAcceptance(leakage);

  const originalGeneratedSectionCount = sections.filter(
    (section) => section.qualityStatus === "generated",
  ).length;
  const repairedSectionCount = sections.filter(
    (section) => section.qualityStatus === "repaired",
  ).length;
  const fallbackSectionCount = sections.filter(
    (section) => section.qualityStatus === "extractive_fallback",
  ).length;
  const fallbackPlanUsed = args.fallbackPlanUsed ?? false;
  const limitedSource = fallbackPlanUsed || coverage.sourceSectionsCovered < coverage.sourceSectionsTotal;
  const reviewerQualityStatus =
    fallbackPlanUsed || limitedSource || fallbackSectionCount > 0
      ? "limited"
      : "complete";

  return {
    id: stableId(
      "reviewer",
      [source.id, plan.id, coverage.id, ...sections.map((section) => section.id)].join(
        "\u001f",
      ),
    ),
    title: plan.title || source.title,
    sections,
    metadata: {
      sourceId: source.id,
      planId: plan.id,
      coverageReportId: coverage.id,
      sourceTitle: source.title,
      sourceKind: source.kind,
      language: source.language,
      sectionCount: plan.sections.length,
      generatedSectionCount: sections.length,
      originalGeneratedSectionCount,
      repairedSectionCount,
      fallbackSectionCount,
      reviewerQualityStatus,
      fallbackPlanUsed,
      limitedSource,
      uncoveredSourceTopics: coverage.sourceSections
        .filter((section) => section.status === "missing")
        .map((section) => section.title),
      coverageStatus: coverage.status,
      coverageScore: coverage.score,
      coverage,
      groundingStatus: grounding.status,
      groundingScore: grounding.score,
      grounding,
      leakageStatus: leakage.status,
      leakage,
    },
  };
}

function validateArgs(args: AssembleReviewerArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Stage 6 assembly requires generated outputs.");
  }
  if (!isRecord(args.coverage)) {
    throw new Error("Stage 6 assembly requires a coverage report.");
  }
  if (!isRecord(args.grounding)) {
    throw new Error("Stage 6 assembly requires a grounding report.");
  }
  if (!isRecord(args.leakage)) {
    throw new Error("Stage 6 assembly requires a leakage report.");
  }
  if (!isRecord(args.plan)) {
    throw new Error("Stage 6 assembly requires a generation plan.");
  }
  if (!isRecord(args.source)) {
    throw new Error("Stage 6 assembly requires a normalized source.");
  }
  if (!Array.isArray(args.plan.sections) || args.plan.sections.length === 0) {
    throw new Error("Stage 6 assembly requires at least one planned section.");
  }
  if (
    !Array.isArray(args.coverage.sections) ||
    args.coverage.sections.length === 0
  ) {
    throw new Error("Stage 6 assembly requires at least one coverage result.");
  }
  if (
    !Array.isArray(args.grounding.sections) ||
    args.grounding.sections.length === 0
  ) {
    throw new Error("Stage 6 assembly requires at least one grounding result.");
  }
  if (
    !Array.isArray(args.leakage.sections) ||
    args.leakage.sections.length === 0
  ) {
    throw new Error("Stage 6 assembly requires at least one leakage result.");
  }
}

function validateRelationships(
  plan: GenerationPlan,
  coverage: CoverageReport,
  grounding: GroundingReport,
  leakage: LeakageReport,
  source: NormalizedSource,
): void {
  if (plan.sourceId !== source.id) {
    throw new Error(
      `Stage 6 source mismatch: plan source ID "${plan.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (coverage.planId !== plan.id) {
    throw new Error(
      `Stage 6 coverage mismatch: coverage plan ID "${coverage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (coverage.sourceId !== source.id) {
    throw new Error(
      `Stage 6 coverage source mismatch: coverage source ID "${coverage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (grounding.planId !== plan.id) {
    throw new Error(
      `Stage 6 grounding mismatch: grounding plan ID "${grounding.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (grounding.sourceId !== source.id) {
    throw new Error(
      `Stage 6 grounding source mismatch: grounding source ID "${grounding.sourceId}" does not match source ID "${source.id}".`,
    );
  }
  if (leakage.planId !== plan.id) {
    throw new Error(
      `Stage 6 leakage mismatch: leakage plan ID "${leakage.planId}" does not match plan ID "${plan.id}".`,
    );
  }
  if (leakage.sourceId !== source.id) {
    throw new Error(
      `Stage 6 leakage source mismatch: leakage source ID "${leakage.sourceId}" does not match source ID "${source.id}".`,
    );
  }
}

function indexOutputs(
  outputs: readonly SectionOutput[],
  plannedSectionIds: ReadonlySet<string>,
): ReadonlyMap<string, SectionOutput> {
  const indexed = new Map<string, SectionOutput>();
  for (const output of outputs) {
    if (!plannedSectionIds.has(output.plannedSectionId)) {
      throw new Error(
        `Stage 6 output references unplanned section "${output.plannedSectionId}".`,
      );
    }
    if (indexed.has(output.plannedSectionId)) {
      throw new Error(
        `Stage 6 assembly found multiple outputs for planned section "${output.plannedSectionId}".`,
      );
    }
    indexed.set(output.plannedSectionId, output);
  }
  return indexed;
}

function indexCoverage(
  coverage: CoverageReport,
  plannedSectionIds: ReadonlySet<string>,
): ReadonlyMap<string, SectionCoverageResult> {
  const indexed = new Map<string, SectionCoverageResult>();
  for (const result of coverage.sections) {
    if (!plannedSectionIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 coverage references unplanned section "${result.plannedSectionId}".`,
      );
    }
    if (indexed.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 coverage contains multiple results for planned section "${result.plannedSectionId}".`,
      );
    }
    indexed.set(result.plannedSectionId, result);
  }
  return indexed;
}

function indexGrounding(
  grounding: GroundingReport,
  plannedSectionIds: ReadonlySet<string>,
): ReadonlyMap<string, SectionGroundingResult> {
  const indexed = new Map<string, SectionGroundingResult>();
  for (const result of grounding.sections) {
    if (!plannedSectionIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 grounding references unplanned section "${result.plannedSectionId}".`,
      );
    }
    if (indexed.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 grounding contains multiple results for planned section "${result.plannedSectionId}".`,
      );
    }
    indexed.set(result.plannedSectionId, result);
  }
  return indexed;
}

function indexLeakage(
  leakage: LeakageReport,
  plannedSectionIds: ReadonlySet<string>,
): ReadonlyMap<string, SectionLeakageResult> {
  const indexed = new Map<string, SectionLeakageResult>();
  for (const result of leakage.sections) {
    if (!plannedSectionIds.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 leakage references unplanned section "${result.plannedSectionId}".`,
      );
    }
    if (indexed.has(result.plannedSectionId)) {
      throw new Error(
        `Stage 6 leakage contains multiple results for planned section "${result.plannedSectionId}".`,
      );
    }
    indexed.set(result.plannedSectionId, result);
  }
  return indexed;
}

function validatePlannedSourceReferences(
  section: GenerationPlan["sections"][number],
  sourceBlockIds: ReadonlySet<string>,
): void {
  const referencedIds = new Set([
    ...section.sourceBlockIds,
    ...section.target.requiredSourceBlockIds,
  ]);
  for (const blockId of referencedIds) {
    if (!sourceBlockIds.has(blockId)) {
      throw new Error(
        `Stage 6 planned section "${section.id}" references missing source block ID "${blockId}".`,
      );
    }
  }
}

function validateOutputSourceReferences(
  output: SectionOutput,
  sourceBlockIds: ReadonlySet<string>,
): void {
  for (const blockId of output.sourceBlockIds) {
    if (!sourceBlockIds.has(blockId)) {
      throw new Error(
        `Stage 6 output for planned section "${output.plannedSectionId}" references missing source block ID "${blockId}".`,
      );
    }
  }
}

function validateCoverageAcceptance(
  plannedSectionId: string,
  coverage: SectionCoverageResult,
  allowWeakSections: boolean,
): void {
  if (coverage.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble planned section "${plannedSectionId}" because coverage status is failed.`,
    );
  }
  if (coverage.status === "weak" && !allowWeakSections) {
    throw new Error(
      `Stage 6 cannot assemble planned section "${plannedSectionId}" because coverage status is weak and allowWeakSections is false.`,
    );
  }
}

function validateGroundingAcceptance(
  plannedSectionId: string,
  grounding: SectionGroundingResult,
): void {
  if (grounding.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble planned section "${plannedSectionId}" because grounding status is failed.`,
    );
  }
}

function validateLeakageAcceptance(
  plannedSectionId: string,
  leakage: SectionLeakageResult,
): void {
  if (leakage.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble planned section "${plannedSectionId}" because leakage status is failed.`,
    );
  }
}

function validateReportAcceptance(
  coverage: CoverageReport,
): void {
  if (coverage.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble coverage report "${coverage.id}" because status is failed.`,
    );
  }
}

function validateGroundingReportAcceptance(
  grounding: GroundingReport,
): void {
  if (grounding.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble grounding report "${grounding.id}" because status is failed.`,
    );
  }
}

function validateLeakageReportAcceptance(leakage: LeakageReport): void {
  if (leakage.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble leakage report "${leakage.id}" because status is failed.`,
    );
  }
}

function createReviewerSection(
  plannedSection: GenerationPlan["sections"][number],
  output: SectionOutput,
  coverage: SectionCoverageResult,
  grounding: SectionGroundingResult,
  leakage: SectionLeakageResult,
  sourceId: string,
  planId: string,
  coverageId: string,
  qualityStatus: ReviewerSectionQualityStatus,
): ReviewerSection {
  const visibleOutput = toDefaultStudentVisibleSectionOutput(output);

  return {
    id: stableId(
      "reviewer-section",
      [sourceId, planId, coverageId, plannedSection.id].join("\u001f"),
    ),
    sourceSectionId: plannedSection.sourceSectionId,
    plannedSectionId: plannedSection.id,
    title: visibleOutput.title.trim() || plannedSection.title,
    order: plannedSection.order,
    kind: plannedSection.schemaKind,
    sourceBlockIds: [...output.sourceBlockIds],
    coverageStatus: coverage.status,
    coverageScore: coverage.score,
    groundingStatus: grounding.status,
    groundingScore: grounding.score,
    groundingIssues: [...grounding.issues],
    leakageStatus: leakage.status,
    leakageIssues: [...leakage.issues],
    qualityStatus,
    items: [visibleOutput],
  };
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
