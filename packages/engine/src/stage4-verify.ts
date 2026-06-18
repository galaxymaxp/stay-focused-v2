import { COVERAGE_THRESHOLD } from "@stay-focused/shared";

import type {
  CoverageIssue,
  CoverageReport,
  CoverageReportStatus,
  CoverageStatus,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionCoverageResult,
  SectionOutput,
  SectionSchemaKind,
  SourceOutline,
  SourceOutlineSection,
  SourceSectionCoverage,
} from "./types";

export interface VerifyCoverageArgs {
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
}

interface FieldCheckResult {
  readonly score: number;
  readonly issues: readonly string[];
  readonly hasMissingRequiredField: boolean;
  readonly hasWeakContent: boolean;
}

interface SourceCheckResult {
  readonly score: number;
  readonly issues: readonly string[];
  readonly hasUnknownReference: boolean;
}

interface DuplicateSectionGroup {
  readonly sourceSectionId: string;
  readonly title: string;
  readonly plannedSectionIds: readonly string[];
}

const PASSED_THRESHOLD = 0.85;
const WEAK_THRESHOLD = 0.6;
const REQUIRED_FIELD_FAILURE_CAP = 0.59;

export function verifyCoverage(args: VerifyCoverageArgs): CoverageReport {
  validateArgs(args);

  const { plan, outputs, source, outline } = args;
  const sourceBlockIds = new Set(source.blocks.map((block) => block.id));
  validatePlanReferences(plan, sourceBlockIds);

  const plannedSectionIds = new Set(plan.sections.map((section) => section.id));
  const outputsBySectionId = groupOutputsByPlannedSection(outputs);
  const sectionResults = plan.sections.map((section) =>
    verifyPlannedSection(
      section,
      outputsBySectionId.get(section.id) ?? [],
      sourceBlockIds,
    ),
  );
  const unplannedResults = outputs
    .filter((output) => !plannedSectionIds.has(output.plannedSectionId))
    .map(createUnplannedOutputResult);
  const sections = [...sectionResults, ...unplannedResults];
  const sectionResultsByPlannedId = new Map(
    sectionResults.map((result) => [result.plannedSectionId, result] as const),
  );
  const sourceSections = createSourceSectionCoverage(
    outline.sections,
    plan.sections,
    sectionResultsByPlannedId,
  );
  const sourceSectionsTotal = outline.sections.length;
  const sourceSectionsCovered = sourceSections.filter(
    (section) => section.status === "covered",
  ).length;
  const coverageScore = roundScore(
    sourceSectionsTotal === 0
      ? 0
      : sourceSectionsCovered / sourceSectionsTotal,
  );
  const duplicateGroups = findDuplicateSectionGroups(plan.sections);
  const issues = createCoverageIssues({
    sourceSections,
    duplicateGroups,
    unplannedResults,
    sourceSectionsTotal,
  });
  const status = reportStatus({
    coverageScore,
    sectionResults,
    unplannedResults,
  });

  emitCoverageLog({
    sourceId: source.id,
    detectedSectionCount: sourceSectionsTotal,
    coveredCount: sourceSectionsCovered,
    missingSectionTitles: sourceSections
      .filter((section) => section.status === "missing")
      .map((section) => section.title),
    duplicateGroups,
    coverageScore,
    status,
  });

  return {
    id: stableId(
      "coverage",
      [
        plan.id,
        source.id,
        outline.id,
        coverageScore,
        status,
        ...sourceSections.map(
          (section) =>
            `${section.sourceSectionId}:${section.status}:${section.plannedSectionIds.join(",")}`,
        ),
        ...sections.map(
          (section) =>
            `${section.plannedSectionId}:${section.status}:${section.score}`,
        ),
      ].join("\u001f"),
    ),
    planId: plan.id,
    sourceId: source.id,
    status,
    score: coverageScore,
    coverageScore,
    coverageBasis: "source-outline",
    sourceSectionsTotal,
    sourceSectionsCovered,
    sourceSections,
    issues,
    sections,
  };
}

function validateArgs(args: VerifyCoverageArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Coverage verification requires generated outputs.");
  }
  if (
    !args.plan ||
    typeof args.plan !== "object" ||
    Array.isArray(args.plan)
  ) {
    throw new Error("Coverage verification requires a generation plan.");
  }
  if (
    !args.source ||
    typeof args.source !== "object" ||
    Array.isArray(args.source)
  ) {
    throw new Error("Coverage verification requires a normalized source.");
  }
  if (
    !args.outline ||
    typeof args.outline !== "object" ||
    Array.isArray(args.outline)
  ) {
    throw new Error("Coverage verification requires a source outline.");
  }
  if (!Array.isArray(args.plan.sections)) {
    throw new Error("Coverage verification requires planned sections.");
  }
  if (!Array.isArray(args.outline.sections)) {
    throw new Error("Coverage verification requires source outline sections.");
  }
  if (args.plan.sourceId !== args.source.id) {
    throw new Error(
      `Coverage verification source mismatch: plan source ID "${args.plan.sourceId}" does not match source ID "${args.source.id}".`,
    );
  }
  if (args.outline.sourceId !== args.source.id) {
    throw new Error(
      `Coverage verification source mismatch: outline source ID "${args.outline.sourceId}" does not match source ID "${args.source.id}".`,
    );
  }
}

function validatePlanReferences(
  plan: GenerationPlan,
  sourceBlockIds: ReadonlySet<string>,
): void {
  for (const section of plan.sections) {
    const referencedIds = new Set([
      ...section.sourceBlockIds,
      ...section.target.requiredSourceBlockIds,
    ]);
    for (const blockId of referencedIds) {
      if (!sourceBlockIds.has(blockId)) {
        throw new Error(
          `Planned section "${section.id}" references missing source block ID "${blockId}".`,
        );
      }
    }
  }
}

function groupOutputsByPlannedSection(
  outputs: readonly SectionOutput[],
): ReadonlyMap<string, readonly SectionOutput[]> {
  const grouped = new Map<string, SectionOutput[]>();
  for (const output of outputs) {
    const existing = grouped.get(output.plannedSectionId) ?? [];
    existing.push(output);
    grouped.set(output.plannedSectionId, existing);
  }
  return grouped;
}

function verifyPlannedSection(
  section: PlannedSection,
  outputs: readonly SectionOutput[],
  sourceBlockIds: ReadonlySet<string>,
): SectionCoverageResult {
  const output = outputs[0];
  if (!output) {
    return {
      plannedSectionId: section.id,
      status: "failed",
      score: 0,
      issues: [`Missing output for planned section "${section.id}".`],
      retryable: true,
    };
  }

  const issues: string[] = [];
  let score = 0;
  const hasWrongKind = output.kind !== section.schemaKind;

  if (!hasWrongKind) {
    score += 0.25;
  } else {
    issues.push("Output kind does not match planned schema kind.");
  }

  const fieldCheck = checkRequiredFields(output, section.schemaKind);
  score += fieldCheck.score * 0.35;
  issues.push(...fieldCheck.issues);

  const sourceCheck = checkSourceCoverage(output, section, sourceBlockIds);
  score += sourceCheck.score * 0.4;
  issues.push(...sourceCheck.issues);

  if (outputs.length > 1) {
    issues.push(`Multiple outputs found for planned section "${section.id}".`);
    score -= 0.2;
  }

  score = Math.max(0, score);
  if (
    hasWrongKind ||
    fieldCheck.hasMissingRequiredField ||
    sourceCheck.hasUnknownReference
  ) {
    score = Math.min(score, REQUIRED_FIELD_FAILURE_CAP);
  } else if (fieldCheck.hasWeakContent) {
    score = Math.min(score, 0.84);
  }
  score = roundScore(score);

  return {
    plannedSectionId: section.id,
    status: statusForScore(score),
    score,
    issues,
    retryable: score < PASSED_THRESHOLD,
  };
}

function checkRequiredFields(
  output: SectionOutput,
  expectedKind: SectionSchemaKind,
): FieldCheckResult {
  const value = output as unknown as Readonly<Record<string, unknown>>;
  const fields = requiredFieldsFor(expectedKind);
  const issues: string[] = [];
  let validFields = 0;
  let weakFields = 0;
  let hasMissingRequiredField = false;

  for (const field of fields) {
    const fieldValue = readNestedField(value, field);
    if (!hasRequiredContent(fieldValue)) {
      issues.push(`Missing required field: ${field}.`);
      hasMissingRequiredField = true;
      continue;
    }
    validFields += 1;
    if (isWeakContent(fieldValue)) {
      issues.push(`Weak content field: ${field}.`);
      weakFields += 1;
    }
  }

  const completeness = fields.length === 0 ? 0 : validFields / fields.length;
  const weaknessPenalty =
    fields.length === 0 ? 0 : (weakFields / fields.length) * 0.4;

  return {
    score: Math.max(0, completeness - weaknessPenalty),
    issues,
    hasMissingRequiredField,
    hasWeakContent: weakFields > 0,
  };
}

function checkSourceCoverage(
  output: SectionOutput,
  section: PlannedSection,
  sourceBlockIds: ReadonlySet<string>,
): SourceCheckResult {
  const issues: string[] = [];
  const outputBlockIds = Array.isArray(output.sourceBlockIds)
    ? output.sourceBlockIds
    : [];
  const outputIdSet = new Set(outputBlockIds);
  let hasUnknownReference = false;

  for (const blockId of outputBlockIds) {
    if (!sourceBlockIds.has(blockId)) {
      issues.push(`Output references unknown source block: "${blockId}".`);
      hasUnknownReference = true;
    }
  }

  const requiredIds = section.target.requiredSourceBlockIds;
  let coveredCount = 0;
  for (const blockId of requiredIds) {
    if (outputIdSet.has(blockId)) {
      coveredCount += 1;
    } else {
      issues.push(`Missing required source block: "${blockId}".`);
    }
  }

  return {
    score: requiredIds.length === 0 ? 1 : coveredCount / requiredIds.length,
    issues,
    hasUnknownReference,
  };
}

function createSourceSectionCoverage(
  sourceSections: readonly SourceOutlineSection[],
  plannedSections: readonly PlannedSection[],
  sectionResultsByPlannedId: ReadonlyMap<string, SectionCoverageResult>,
): readonly SourceSectionCoverage[] {
  const plannedIdsBySourceSectionId = new Map<string, string[]>();
  for (const plannedSection of plannedSections) {
    const existing =
      plannedIdsBySourceSectionId.get(plannedSection.sourceSectionId) ?? [];
    existing.push(plannedSection.id);
    plannedIdsBySourceSectionId.set(plannedSection.sourceSectionId, existing);
  }

  return sourceSections.map((sourceSection) => {
    const plannedSectionIds =
      plannedIdsBySourceSectionId.get(sourceSection.id) ?? [];
    const hasCoveredResult = plannedSectionIds.some((plannedSectionId) => {
      const result = sectionResultsByPlannedId.get(plannedSectionId);
      return result?.status === "passed" || result?.status === "weak";
    });

    return {
      sourceSectionId: sourceSection.id,
      title: sourceSection.title,
      status: hasCoveredResult ? "covered" : "missing",
      plannedSectionIds,
    };
  });
}

function findDuplicateSectionGroups(
  plannedSections: readonly PlannedSection[],
): readonly DuplicateSectionGroup[] {
  const grouped = new Map<string, PlannedSection[]>();

  for (const section of plannedSections) {
    const key = `${section.sourceSectionId}\u001f${normalizeCoverageTitleKey(section.title)}`;
    const existing = grouped.get(key) ?? [];
    existing.push(section);
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .filter((sections) => sections.length > 1)
    .map((sections) => {
      const first = sections[0];
      if (!first) {
        throw new Error("Duplicate section group requires at least one section.");
      }
      return {
        sourceSectionId: first.sourceSectionId,
        title: first.title,
        plannedSectionIds: sections.map((section) => section.id),
      };
    });
}

function createCoverageIssues(args: {
  readonly sourceSections: readonly SourceSectionCoverage[];
  readonly duplicateGroups: readonly DuplicateSectionGroup[];
  readonly unplannedResults: readonly SectionCoverageResult[];
  readonly sourceSectionsTotal: number;
}): readonly CoverageIssue[] {
  const issues: CoverageIssue[] = [];

  if (args.sourceSectionsTotal === 0) {
    issues.push({
      type: "empty-source",
      severity: "error",
      message: "No source outline sections were detected for coverage verification.",
    });
  }

  for (const sourceSection of args.sourceSections) {
    if (sourceSection.status === "covered") {
      continue;
    }

    issues.push({
      type: "missing-source-section",
      severity: "error",
      sourceSectionId: sourceSection.sourceSectionId,
      title: sourceSection.title,
      plannedSectionIds: sourceSection.plannedSectionIds,
      message:
        "Detected source section was not represented in the generated reviewer.",
    });
  }

  for (const duplicateGroup of args.duplicateGroups) {
    issues.push({
      type: "duplicate-section",
      severity: "warning",
      sourceSectionId: duplicateGroup.sourceSectionId,
      title: duplicateGroup.title,
      plannedSectionIds: duplicateGroup.plannedSectionIds,
      message:
        "Multiple planned sections normalize to the same title for the same source section.",
    });
  }

  for (const result of args.unplannedResults) {
    issues.push({
      type: "unplanned-output",
      severity: "error",
      plannedSectionId: result.plannedSectionId,
      message: `Output references unplanned section "${result.plannedSectionId}".`,
    });
  }

  return issues;
}

function createUnplannedOutputResult(
  output: SectionOutput,
): SectionCoverageResult {
  return {
    plannedSectionId: output.plannedSectionId,
    status: "failed",
    score: 0,
    issues: [
      `Output references unplanned section "${output.plannedSectionId}".`,
    ],
    retryable: false,
  };
}

function requiredFieldsFor(
  schemaKind: SectionSchemaKind,
): readonly string[] {
  switch (schemaKind) {
    case "concept-card":
    case "process-step":
    case "example-card":
    case "claim-card":
      return ["sourceCore.explanation", "sourceCore.keyPoints"];
  }
}

function hasRequiredContent(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) => typeof item === "string" && item.trim().length > 0,
    )
  );
}

function isWeakContent(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length < 12;
  }
  if (Array.isArray(value)) {
    return value.join(" ").trim().length < 12;
  }
  return true;
}

function readNestedField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  return field.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[key];
  }, value);
}

function statusForScore(score: number): CoverageStatus {
  if (score >= PASSED_THRESHOLD) {
    return "passed";
  }
  if (score >= WEAK_THRESHOLD) {
    return "weak";
  }
  return "failed";
}

function reportStatus(args: {
  readonly coverageScore: number;
  readonly sectionResults: readonly SectionCoverageResult[];
  readonly unplannedResults: readonly SectionCoverageResult[];
}): CoverageReportStatus {
  const hasFailedGeneratedSection =
    args.sectionResults.some((section) => section.status === "failed") ||
    args.unplannedResults.length > 0;

  return args.coverageScore >= COVERAGE_THRESHOLD && !hasFailedGeneratedSection
    ? "passed"
    : "failed";
}

function emitCoverageLog(args: {
  readonly sourceId: string;
  readonly detectedSectionCount: number;
  readonly coveredCount: number;
  readonly missingSectionTitles: readonly string[];
  readonly duplicateGroups: readonly DuplicateSectionGroup[];
  readonly coverageScore: number;
  readonly status: CoverageReportStatus;
}): void {
  console.info(
    JSON.stringify({
      event: "reviewer.coverage.completed",
      sourceId: args.sourceId,
      detectedSectionCount: args.detectedSectionCount,
      coveredCount: args.coveredCount,
      missingSectionTitles: args.missingSectionTitles,
      duplicateGroups: args.duplicateGroups,
      coverageScore: args.coverageScore,
      coverageBasis: "source-outline",
      status: args.status,
    }),
  );
}

export function normalizeCoverageTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
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
