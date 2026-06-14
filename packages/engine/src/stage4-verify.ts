import type {
  CoverageReport,
  CoverageStatus,
  GenerationPlan,
  NormalizedSource,
  PlannedSection,
  SectionCoverageResult,
  SectionOutput,
  SectionSchemaKind,
} from "./types";

export interface VerifyCoverageArgs {
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly source: NormalizedSource;
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

const PASSED_THRESHOLD = 0.85;
const WEAK_THRESHOLD = 0.6;
const REQUIRED_FIELD_FAILURE_CAP = 0.59;

export function verifyCoverage(args: VerifyCoverageArgs): CoverageReport {
  validateArgs(args);

  const { plan, outputs, source } = args;
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
  const score = roundScore(
    sections.reduce((total, section) => total + section.score, 0) /
      sections.length,
  );

  return {
    id: stableId(
      "coverage",
      [
        plan.id,
        source.id,
        ...sections.map(
          (section) =>
            `${section.plannedSectionId}:${section.status}:${section.score}`,
        ),
      ].join("\u001f"),
    ),
    planId: plan.id,
    sourceId: source.id,
    status: overallStatus(sections),
    score,
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
  if (!Array.isArray(args.plan.sections) || args.plan.sections.length === 0) {
    throw new Error(
      "Coverage verification requires at least one planned section.",
    );
  }
  if (args.plan.sourceId !== args.source.id) {
    throw new Error(
      `Coverage verification source mismatch: plan source ID "${args.plan.sourceId}" does not match source ID "${args.source.id}".`,
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
    const fieldValue = value[field];
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
  const weaknessPenalty = fields.length === 0 ? 0 : (weakFields / fields.length) * 0.4;

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
      return ["explanation", "keyPoints"];
    case "process-step":
      return ["steps", "summary"];
    case "example-card":
      return ["scenario", "explanation", "takeaway"];
    case "claim-card":
      return ["claim", "support", "reasoning"];
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

function statusForScore(score: number): CoverageStatus {
  if (score >= PASSED_THRESHOLD) {
    return "passed";
  }
  if (score >= WEAK_THRESHOLD) {
    return "weak";
  }
  return "failed";
}

function overallStatus(
  sections: readonly SectionCoverageResult[],
): CoverageStatus {
  if (sections.some((section) => section.status === "failed")) {
    return "failed";
  }
  if (sections.some((section) => section.status === "weak")) {
    return "weak";
  }
  return "passed";
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
