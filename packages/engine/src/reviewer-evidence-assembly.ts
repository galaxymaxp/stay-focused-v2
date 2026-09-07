import {
  requiredEvidenceSourceIsAvailable,
  requiredEvidenceTargetIsRepresented,
} from "./required-evidence.js";
import { completeSourcePredicate, presentDeterministicEvidence } from "./reviewer-evidence-presentation.js";
import type {
  NormalizedSourceBlock,
  PlannedSection,
  RequiredEvidenceTarget,
  SectionOutput,
} from "./types.js";

export interface DeterministicEvidenceValidation {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly targetCount: number;
  readonly representedTargetCount: number;
  readonly missingTargetIds: readonly string[];
}

/**
 * Builds the complete source-owned portion of a Reviewer section. Provider
 * output is deliberately absent from this boundary: an explanation may be
 * attached later, but it cannot add, remove, reorder, or rewrite evidence.
 */
export function assembleDeterministicSectionEvidence(args: {
  readonly section: PlannedSection;
  readonly sourceBlocks: readonly NormalizedSourceBlock[];
}): SectionOutput {
  if (!requiredEvidenceSourceIsAvailable(args)) {
    throw new Error(
      `Deterministic evidence assembly failed for planned section "${args.section.id}" because required source evidence is unavailable.`,
    );
  }

  const targets = orderedTargets(args.section.requiredEvidence ?? []);
  const keyPoints = uniqueExact(targets.map(renderRequiredEvidenceTarget));
  const targetIds = targets.map((target) => target.id);

  const output = {
    id: stableId(
      "deterministic-section",
      [args.section.id, ...targetIds, ...keyPoints].join("\u001f"),
    ),
    kind: args.section.schemaKind,
    plannedSectionId: args.section.id,
    title: args.section.title,
    sourceBlockIds: [...args.section.sourceBlockIds],
    sourceCore: {
      explanation: "",
      keyPoints,
    },
    enrichment: null,
    deterministicEvidence: {
      targetIds,
      evidenceHash: stableId("evidence", keyPoints.join("\u001f")),
      ...(args.sourceBlocks.some(block => block.structuredBlock) ? {
        presentation: presentDeterministicEvidence(targets),
      } : {}),
    },
  } satisfies SectionOutput;

  const validation = validateDeterministicSectionEvidence(args.section, output);
  if (!validation.valid) {
    throw new Error(
      `Deterministic evidence assembly failed for planned section "${args.section.id}": ${validation.issues.join("; ")}`,
    );
  }
  return output;
}

export function attachGeneratedExplanation(
  output: SectionOutput,
  explanation: string,
): SectionOutput {
  return {
    ...output,
    sourceCore: {
      explanation: completeSourcePredicate(output.title, explanation),
      keyPoints: [...output.sourceCore.keyPoints],
    },
    enrichment: null,
  } as SectionOutput;
}

export function validateDeterministicSectionEvidence(
  section: PlannedSection,
  output: SectionOutput,
): DeterministicEvidenceValidation {
  const targets = orderedTargets(section.requiredEvidence ?? []);
  const expectedTargetIds = targets.map((target) => target.id);
  const expectedPoints = uniqueExact(targets.map(renderRequiredEvidenceTarget));
  const marker = output.deterministicEvidence;
  const issues: string[] = [];

  if (!marker) {
    issues.push("Deterministic evidence ownership marker is missing.");
  } else {
    if (!arraysEqual(marker.targetIds, expectedTargetIds)) {
      issues.push("Deterministic target identity or ordering changed.");
    }
    if (marker.evidenceHash !== stableId("evidence", expectedPoints.join("\u001f"))) {
      issues.push("Deterministic evidence hash does not match the planned targets.");
    }
  }
  if (!arraysEqual(output.sourceCore.keyPoints, expectedPoints)) {
    issues.push("Student-visible deterministic evidence differs from the planned source evidence.");
  }
  if (marker?.presentation && JSON.stringify(marker.presentation) !==
      JSON.stringify(presentDeterministicEvidence(targets))) {
    issues.push("Deterministic evidence presentation differs from the planned source evidence.");
  }

  const missing = targets.filter((target) =>
    !requiredEvidenceTargetIsRepresented(
      target,
      output.sourceCore.keyPoints,
      output.sourceCore.keyPoints.join("\n"),
    )
  );
  if (missing.length > 0) {
    issues.push(
      ...missing.map((target) =>
        `Required evidence target "${target.id}" (${target.kind}) is not represented.`,
      ),
    );
  }

  return {
    valid: issues.length === 0,
    issues,
    targetCount: targets.length,
    representedTargetCount: targets.length - missing.length,
    missingTargetIds: missing.map((target) => target.id),
  };
}

export function renderRequiredEvidenceTarget(
  target: RequiredEvidenceTarget,
): string {
  const label = target.label.trim();
  const relationship = target.relationshipLabel?.trim();
  if (!relationship || normalized(relationship) === normalized(label)) {
    return label;
  }
  return `${relationship}: ${label}`;
}

function orderedTargets(
  targets: readonly RequiredEvidenceTarget[],
): readonly RequiredEvidenceTarget[] {
  // The manifest is already emitted in stable source order. Keeping that
  // order preserves deliberate row/list sequencing and makes the manifest the
  // single authority for evidence identity and presentation.
  return [...targets];
}

function uniqueExact(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
