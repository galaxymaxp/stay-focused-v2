import {
  hasExplicitRelationshipCue,
  hasSupportedProcedureSequence,
} from "./semantic-structure.js";
import type {
  GenerationPlan,
  NormalizedSource,
  PlanIntegrityIssue,
  PlannedSection,
} from "./types.js";

const NON_ACADEMIC_ROLES = new Set([
  "presentation-title",
  "presentation-divider",
  "references",
  "branding-noise",
]);

export interface PlanIntegrityCheck {
  readonly status: "passed" | "failed";
  readonly score: number;
  readonly issues: readonly PlanIntegrityIssue[];
  readonly issuesBySectionId: ReadonlyMap<string, readonly PlanIntegrityIssue[]>;
}

export function verifyPlanIntegrity(
  plan: GenerationPlan,
  source: NormalizedSource,
): PlanIntegrityCheck {
  const sourceById = new Map(source.blocks.map((block) => [block.id, block] as const));
  const issues = plan.sections.flatMap((section) =>
    verifySectionPlanIntegrity(section, sourceById),
  );
  const invalidSectionIds = new Set(issues.map((issue) => issue.plannedSectionId));
  const issuesBySectionId = new Map<string, readonly PlanIntegrityIssue[]>();
  for (const section of plan.sections) {
    issuesBySectionId.set(
      section.id,
      issues.filter((issue) => issue.plannedSectionId === section.id),
    );
  }
  const score = plan.sections.length === 0
    ? 0
    : Math.round(((plan.sections.length - invalidSectionIds.size) / plan.sections.length) * 100) / 100;
  return {
    status: issues.length === 0 ? "passed" : "failed",
    score,
    issues,
    issuesBySectionId,
  };
}

function verifySectionPlanIntegrity(
  section: PlannedSection,
  sourceById: ReadonlyMap<string, NormalizedSource["blocks"][number]>,
): readonly PlanIntegrityIssue[] {
  const blocks = section.sourceBlockIds.flatMap((id) => {
    const block = sourceById.get(id);
    return block ? [block] : [];
  });
  const semanticSourceText = blocks
    .filter((block) => block.metadata?.layoutStatus !== "ocr_supplemented")
    .map((block) => block.text)
    .join("\n");
  const base = {
    plannedSectionId: section.id,
    sourceBlockIds: section.sourceBlockIds,
  } as const;
  const issues: PlanIntegrityIssue[] = [];

  if (
    blocks.length > 0 &&
    blocks.every((block) => NON_ACADEMIC_ROLES.has(String(block.metadata?.presentationRole ?? "")))
  ) {
    issues.push({
      ...base,
      type: "presentation-only-target",
      message: "Planned target is sourced only from presentation furniture, not study content.",
    });
  }
  if (
    section.semanticPlan?.kind === "procedure" &&
    !hasSupportedProcedureSequence(section.title, semanticSourceText)
  ) {
    issues.push({
      ...base,
      type: "unsupported-procedure",
      message: "Procedure semantics lack explicit section-level sequence evidence in the source.",
    });
  }
  if (
    hasExplicitRelationshipCue(semanticSourceText) &&
    !(section.semanticPlan?.units.some((unit) => unit.kind !== "point") ?? false)
  ) {
    issues.push({
      ...base,
      type: "missing-explicit-relationship",
      message: "An explicit source relationship cue is absent from the semantic plan.",
    });
  }
  const meaningfulBlocks = blocks.filter((block) => block.metadata?.presentationRole === "academic");
  if (
    meaningfulBlocks.length > 0 &&
    meaningfulBlocks.every((block) => block.kind === "heading") &&
    (section.semanticPlan?.units.length ?? 0) === 0
  ) {
    issues.push({
      ...base,
      type: "empty-academic-target",
      message: "Academic target contains only a heading and no independently verifiable content.",
    });
  }
  return issues;
}
