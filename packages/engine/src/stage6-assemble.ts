import type {
  CoverageReport,
  GenerationPlan,
  NormalizedSource,
  ReviewerOutput,
  ReviewerSection,
  SectionCoverageResult,
  SectionOutput,
} from "./types";

export interface AssembleReviewerArgs {
  readonly source: NormalizedSource;
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly coverage: CoverageReport;
  readonly allowWeakSections?: boolean;
}

export function assembleReviewer(args: AssembleReviewerArgs): ReviewerOutput {
  validateArgs(args);

  const { outputs, coverage, plan, source } = args;
  const allowWeakSections = args.allowWeakSections ?? false;
  validateRelationships(plan, coverage, source);

  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const outputsBySectionId = indexOutputs(outputs, plannedSectionIds);
  const coverageBySectionId = indexCoverage(coverage, plannedSectionIds);

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

    return createReviewerSection(
      plannedSection,
      output,
      sectionCoverage,
      source.id,
      plan.id,
      coverage.id,
    );
  });
  validateReportAcceptance(coverage);

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
      coverageStatus: coverage.status,
      coverageScore: coverage.score,
      coverage,
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
}

function validateRelationships(
  plan: GenerationPlan,
  coverage: CoverageReport,
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

function validateReportAcceptance(
  coverage: CoverageReport,
): void {
  if (coverage.status === "failed") {
    throw new Error(
      `Stage 6 cannot assemble coverage report "${coverage.id}" because status is failed.`,
    );
  }
}

function createReviewerSection(
  plannedSection: GenerationPlan["sections"][number],
  output: SectionOutput,
  coverage: SectionCoverageResult,
  sourceId: string,
  planId: string,
  coverageId: string,
): ReviewerSection {
  return {
    id: stableId(
      "reviewer-section",
      [sourceId, planId, coverageId, plannedSection.id].join("\u001f"),
    ),
    sourceSectionId: plannedSection.sourceSectionId,
    plannedSectionId: plannedSection.id,
    title: output.title.trim() || plannedSection.title,
    order: plannedSection.order,
    kind: plannedSection.schemaKind,
    sourceBlockIds: [...output.sourceBlockIds],
    coverageStatus: coverage.status,
    coverageScore: coverage.score,
    items: [output],
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
