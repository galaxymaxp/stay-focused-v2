import type {
  CoverageReport,
  GenerationPlan,
  GroundingReport,
  LeakageReport,
  NormalizedSource,
  ReviewerOutput,
  ReviewerGenerationMetrics,
  ReviewerSectionQualityStatus,
  ReviewerSection,
  SectionCoverageResult,
  SectionGroundingResult,
  SectionLeakageResult,
  SectionOutput,
} from "./types";
import { toDefaultStudentVisibleSectionOutput } from "./student-visible-text.js";
import { requiredEvidenceSourceIsAvailable } from "./required-evidence.js";
import {
  diagnoseStudentVisibleUsefulness,
  type StudentVisibleUsefulnessDiagnostic,
} from "./reviewer-usefulness.js";
import { reviewerDispositionFor } from "./reviewer-section-support.js";

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
  readonly generationMetrics?: ReviewerGenerationMetrics;
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
  validateStudentVisibleStructure({ plan, source, outputsBySectionId });

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
    (section) => section.representation === "standalone" && section.qualityStatus === "generated",
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
      generatedSectionCount: sections.filter((section) => section.representation === "standalone").length,
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
      sourceHierarchyNodeCount: plan.sections.length,
      standaloneSectionCount: plan.sections.filter((section) => reviewerDispositionFor(section) === "standalone").length,
      structuralNodeCount: plan.sections.filter((section) => reviewerDispositionFor(section) === "structural").length,
      typedEvidenceNodeCount: plan.sections.filter((section) => reviewerDispositionFor(section) === "typed-evidence").length,
      unsupportedNodeCount: plan.sections.filter((section) => reviewerDispositionFor(section) === "unsupported").length,
      ...(args.generationMetrics ? { generationMetrics: args.generationMetrics } : {}),
    },
  };
}

export type StudentVisibleStructureDiagnostic =
  | "NON_CONCEPT_HEADING"
  | "PRESENTATION_FURNITURE_HEADING"
  | "DUPLICATE_SECTION"
  | "TITLE_BODY_FRAGMENT"
  | "CODE_TITLE"
  | "OVERSIZED_SECTION"
  | "EMPTY_EXPLANATION"
  | "STRUCTURAL_NOISE"
  | StudentVisibleUsefulnessDiagnostic;

function validateStudentVisibleStructure(args: {
  readonly plan: GenerationPlan;
  readonly source: NormalizedSource;
  readonly outputsBySectionId: ReadonlyMap<string, SectionOutput>;
}): void {
  const seenTitles = new Map<string, string>();
  const sourceBlockById = new Map(
    args.source.blocks.map((block) => [block.id, block] as const),
  );
  for (const section of args.plan.sections) {
    const output = args.outputsBySectionId.get(section.id);
    if (!output) continue;
    const title = output.title.trim() || section.title.trim();
    const duplicateScopeKey = `${section.conceptualParentKey ?? "<root>"}\u001f${structuralKey(title)}`;
    const previousSectionId = seenTitles.get(duplicateScopeKey);
    if (previousSectionId) {
      throw new Error(
        `Stage 6 student-visible structure [DUPLICATE_SECTION] repeats conceptual title "${title}" in planned sections "${previousSectionId}" and "${section.id}".`,
      );
    }
    seenTitles.set(duplicateScopeKey, section.id);
  }
  for (const section of args.plan.sections) {
    const output = args.outputsBySectionId.get(section.id);
    if (!output) continue;
    const title = output.title.trim() || section.title.trim();
    const titleKey = structuralKey(title);
    if ((title.match(/[\p{L}\p{N}]/gu)?.length ?? 0) < 2) {
      throwStructureError("NON_CONCEPT_HEADING", section.id, title);
    }
    if (looksLikeCodeTitle(title)) {
      throwStructureError("CODE_TITLE", section.id, title);
    }
    if (looksLikeBodyFragmentTitle(title)) {
      throwStructureError("TITLE_BODY_FRAGMENT", section.id, title);
    }
    const sourceBlocks = section.sourceBlockIds.flatMap((id) => {
      const block = sourceBlockById.get(id);
      return block ? [block] : [];
    });
    if (looksLikePresentationFurniture(title, sourceBlocks)) {
      throwStructureError("PRESENTATION_FURNITURE_HEADING", section.id, title);
    }
    const explanation = output.sourceCore.explanation.trim();
    if (!requiredEvidenceSourceIsAvailable({
      section,
      sourceBlocks: args.source.blocks.filter((block) => section.sourceBlockIds.includes(block.id)),
    })) {
      throw new Error(`Stage 6 cannot assemble planned section "${section.id}" because required evidence is absent from its source.`);
    }
    const disposition = reviewerDispositionFor(section);
    if (disposition !== "standalone") continue;
    const points = output.sourceCore.keyPoints.map((point) => point.trim()).filter(Boolean);
    if (!explanation && points.length === 0) {
      throwStructureError("EMPTY_EXPLANATION", section.id, title);
    }
    const pointKeys = points.map(structuralKey).filter(Boolean);
    const duplicatePointCount = pointKeys.length - new Set(pointKeys).size;
    if (duplicatePointCount >= 2) {
      throwStructureError("STRUCTURAL_NOISE", section.id, title);
    }
    const hiddenHeadingCount = points.filter((point) =>
      point.length <= 90 &&
      (/:$/.test(point) ||
        (/^[\p{Lu}\p{N}][\p{L}\p{N} &'()/-]+$/u.test(point) &&
          (point.match(/[\p{L}\p{N}]+/gu)?.length ?? 0) <= 7))
    ).length;
    const sourceHeadingTransitions = sourceBlocks.filter((block) =>
      block.kind === "heading" &&
      structuralKey(block.text) !== titleKey &&
      !/^(?:activity|answer|answers|example|examples|exercise|exercises|practice|question|questions|recap|review|solution|solutions)[:;]?$/i.test(block.text.trim())
    ).length;
    const visibleLength = explanation.length + points.reduce(
      (total, point) => total + point.length,
      0,
    );
    if (
      (points.length >= 12 && hiddenHeadingCount >= 3 && sourceHeadingTransitions >= 3) ||
      (visibleLength > 12_000 && hiddenHeadingCount >= 2 && sourceHeadingTransitions >= 2)
    ) {
      throwStructureError("OVERSIZED_SECTION", section.id, title);
    }
    const usefulnessIssues = disposition === "standalone" && section.requiredEvidence !== undefined
      ? diagnoseStudentVisibleUsefulness({
          section,
          source: args.source,
          output,
        })
      : [];
    const firstUsefulnessIssue = usefulnessIssues[0];
    if (firstUsefulnessIssue) {
      throw new Error(
        `Stage 6 student-visible usefulness [${firstUsefulnessIssue.type}] rejected planned section "${section.id}" with title "${title}": ${firstUsefulnessIssue.message}`,
      );
    }
  }
}

function looksLikePresentationFurniture(
  title: string,
  sourceBlocks: readonly NormalizedSource["blocks"][number][],
): boolean {
  const compactVocabulary = /^(?:activity|answer|answers|example|examples|exercise|exercises|practice|question|questions|recap|review|solution|solutions)$/i;
  const normalizedTitle = title.replace(/[:;]+$/, "").trim();
  if (!compactVocabulary.test(normalizedTitle)) return false;
  const body = sourceBlocks
    .filter((block) => block.kind !== "heading")
    .map((block) => block.text)
    .join(" ")
    .trim();
  const wordCount = body.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const instructional = /\b(?:answer|complete|discuss|identify|perform|practice|review|solve|try|write)\b/i.test(body);
  const typedSubordinateEvidence = sourceBlocks.some((block) =>
    block.structuredBlock !== undefined &&
    (block.kind === "code" || block.kind === "formula" || block.kind === "table")
  );
  return instructional || wordCount < 8 || typedSubordinateEvidence;
}

function looksLikeCodeTitle(title: string): boolean {
  return (
    /^```/u.test(title) ||
    /(?:^|\s)(?:def|class|return|yield|print|const|let|var)\b.*[();={}:]/i.test(title) ||
    /^[\[{(].*[\]})]$/u.test(title)
  );
}

function looksLikeBodyFragmentTitle(title: string): boolean {
  const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];
  return (
    /^(?:[-*+\u00b7\u2022]|\u00c2\u00b7)/u.test(title) ||
    /[:;]$/.test(title) ||
    (words.length >= 12 && /[.!?]$/.test(title))
  );
}

function throwStructureError(
  diagnostic: StudentVisibleStructureDiagnostic,
  sectionId: string,
  title: string,
): never {
  throw new Error(
    `Stage 6 student-visible structure [${diagnostic}] rejected planned section "${sectionId}" with title "${title}".`,
  );
}

function structuralKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
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
  const representation = reviewerDispositionFor(plannedSection);
  const hasVisibleItem =
    representation === "standalone" ||
    representation === "typed-evidence" ||
    visibleOutput.sourceCore.explanation.trim().length > 0 ||
    visibleOutput.sourceCore.keyPoints.some((point) => point.trim().length > 0);

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
    items: hasVisibleItem ? [visibleOutput] : [],
    representation,
    ...(plannedSection.dispositionReason
      ? { dispositionReason: plannedSection.dispositionReason }
      : {}),
    ...(plannedSection.parentPlannedSectionId
      ? { parentPlannedSectionId: plannedSection.parentPlannedSectionId }
      : {}),
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
