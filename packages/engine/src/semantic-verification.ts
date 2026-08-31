import type {
  PlannedSection,
  PlannedSemanticUnit,
  SectionOutput,
} from "./types.js";

export interface SemanticCoverageCheck {
  readonly targetCount: number;
  readonly coveredTargetCount: number;
  readonly score: number;
  readonly issues: readonly string[];
}

export type SemanticRelationshipIssueType =
  | "grounding-unsupported-relationship"
  | "grounding-wrong-definition-association"
  | "grounding-wrong-parent-child"
  | "grounding-wrong-step-order"
  | "grounding-cross-concept-fusion"
  | "grounding-sibling-fusion"
  | "grounding-wrong-example-association";

export interface SemanticRelationshipIssue {
  readonly type: SemanticRelationshipIssueType;
  readonly message: string;
  readonly fieldPath: string;
  readonly offendingText: readonly string[];
}

interface VisibleRow {
  readonly text: string;
  readonly fieldPath: string;
}

const CONTENT_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "the", "this", "to", "was",
  "were", "with",
]);
const IDEA_MATCH_THRESHOLD = 0.7;

export function verifySemanticCoverage(
  section: PlannedSection,
  output: SectionOutput,
): SemanticCoverageCheck {
  const units = section.semanticPlan?.units ?? [];
  if (units.length === 0) {
    return { targetCount: 0, coveredTargetCount: 0, score: 1, issues: [] };
  }

  const rows = visibleRows(output);
  const assignedUnits = new Set<number>();
  units.forEach((unit, unitIndex) => {
    if (semanticUnitIsCovered(unit, rows)) assignedUnits.add(unitIndex);
  });

  const missingUnits = units.filter((_unit, index) => !assignedUnits.has(index));
  return {
    targetCount: units.length,
    coveredTargetCount: assignedUnits.size,
    score: roundScore(assignedUnits.size / units.length),
    issues: missingUnits.map(
      (unit) =>
        `Missing semantic target: ${describeUnit(unit)}. Preserve its source-supported content and relationship.`,
    ),
  };
}

function semanticUnitIsCovered(
  unit: PlannedSemanticUnit,
  rows: readonly VisibleRow[],
): boolean {
  if (unit.kind === "point") {
    return rows.some((row) => ideaMatchScore(row.text, unit.label) >= IDEA_MATCH_THRESHOLD);
  }
  if (unit.kind === "steps" || unit.kind === "sequence") {
    const itemRows = unit.items.map((item) =>
      rows.find((row) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD),
    );
    if (itemRows.some((row) => row === undefined)) return false;
    return stepOrderIsValid(unit, rows, itemRows as readonly VisibleRow[]);
  }
  const labelRows = rows.filter(
    (row) => ideaMatchScore(row.text, unit.label) >= IDEA_MATCH_THRESHOLD,
  );
  const relatedRows = labelRows.length > 0 ? labelRows : rows.filter(
    (row) =>
      unit.items.some((item) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD),
  );
  if (relatedRows.length === 0) return false;
  const combined = relatedRows.map((row) => row.text).join(" \n ");
  return relationshipShapeIsValid(unit, combined) && unit.items.every((item) =>
    relatedRows.some(
      (row) =>
        ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD &&
        ideaMatchScore(row.text, unit.label) >= IDEA_MATCH_THRESHOLD,
    ),
  );
}

export function verifySemanticRelationships(args: {
  readonly section: PlannedSection;
  readonly output: SectionOutput;
  readonly allSections: readonly PlannedSection[];
  readonly currentSourceText?: string;
}): readonly SemanticRelationshipIssue[] {
  const units = args.section.semanticPlan?.units ?? [];
  const rows = visibleRows(args.output);
  return dedupeIssues([
    ...detectUnsupportedExplicitRelations(units, rows),
    ...detectRelationshipShapeIssues(units, rows),
    ...detectSiblingFusion(units, rows),
    ...detectCrossConceptFusion(
      args.section,
      args.allSections,
      rows,
      args.currentSourceText,
    ),
  ]);
}

function detectUnsupportedExplicitRelations(
  units: readonly PlannedSemanticUnit[],
  rows: readonly VisibleRow[],
): readonly SemanticRelationshipIssue[] {
  if (units.some((unit) => unit.kind !== "point")) return [];
  return rows.flatMap((row) => {
    if (!/(?:[-=]+>|[\u2190-\u21ff\u27f0-\u27ff])/u.test(row.text)) return [];
    const representedPoints = units.filter(
      (unit) => ideaMatchScore(row.text, unit.label) >= IDEA_MATCH_THRESHOLD,
    );
    return units.length < 2 || representedPoints.length >= 2
      ? [relationshipIssue(
          "grounding-unsupported-relationship",
          row,
          "Visible content adds an explicit relationship that is not supported by the source semantic structure.",
        )]
      : [];
  });
}

function detectRelationshipShapeIssues(
  units: readonly PlannedSemanticUnit[],
  rows: readonly VisibleRow[],
): readonly SemanticRelationshipIssue[] {
  const issues: SemanticRelationshipIssue[] = [];
  for (const [unitIndex, unit] of units.entries()) {
    if (unit.kind === "point") continue;

    if (unit.kind === "steps" || unit.kind === "sequence") {
      const itemRows = unit.items.map((item) =>
        rows.find((row) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD),
      );
      if (itemRows.every((row) => row !== undefined)) {
        const ordered = stepOrderIsValid(
          unit,
          rows,
          itemRows as readonly VisibleRow[],
        );
        if (!ordered) {
          const firstRow = itemRows[0] as VisibleRow;
          issues.push(relationshipIssue(
            "grounding-wrong-step-order",
            firstRow,
            `Procedure "${unit.label}" does not preserve the source step order.`,
          ));
        }
        continue;
      }
    }

    const matchingRows = rows.filter(
      (row) => ideaMatchScore(row.text, unit.label) >= IDEA_MATCH_THRESHOLD,
    );
    const combined = matchingRows.map((row) => row.text).join(" \n ");
    const distributedShapeIsValid =
      matchingRows.length > 0 &&
      relationshipShapeIsValid(unit, combined) &&
      unit.items.every((item) => matchingRows.some((row) =>
        ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD,
      ));
    if (distributedShapeIsValid) continue;
    for (const row of matchingRows) {
      const hasEveryChild = unit.items.every(
        (item) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD,
      );
      if (hasEveryChild && relationshipShapeIsValid(unit, row.text)) continue;

      const siblingAssociation = semanticPosition(row.text, unit.label) === 0
        ? units.find(
            (candidate, candidateIndex) =>
              candidateIndex !== unitIndex &&
              candidate.kind === unit.kind &&
              candidate.items.length > 0 &&
              candidate.items.every(
                (item) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD,
              ),
          )
        : undefined;
      if (siblingAssociation) {
        issues.push(
          relationshipIssue(
            associationIssueType(unit),
            row,
            `${unitKindName(unit)} "${unit.label}" is associated with content belonging to "${siblingAssociation.label}". Preserve the source association.`,
          ),
        );
        continue;
      }

      if (hasEveryChild) {
        const type =
          unit.kind === "steps" || unit.kind === "sequence"
            ? "grounding-wrong-step-order"
            : associationIssueType(unit);
        const message =
          unit.kind === "steps" || unit.kind === "sequence"
            ? `Procedure "${unit.label}" does not preserve the source step order.`
            : `${unitKindName(unit)} "${unit.label}" does not preserve its source-supported parent-child direction.`;
        issues.push(relationshipIssue(type, row, message));
      }
    }

    if (unit.kind === "examples") {
      const childRow = rows.find(
        (row) =>
          unit.items.every(
            (item) => ideaMatchScore(row.text, item) >= IDEA_MATCH_THRESHOLD,
          ) && ideaMatchScore(row.text, unit.label) < IDEA_MATCH_THRESHOLD,
      );
      if (childRow) {
        issues.push(
          relationshipIssue(
            "grounding-wrong-example-association",
            childRow,
            `Examples for "${unit.label}" are attached to a different visible concept. Preserve the source example association.`,
          ),
        );
      }
    }
  }
  return issues;
}

function stepOrderIsValid(
  unit: PlannedSemanticUnit,
  allRows: readonly VisibleRow[],
  itemRows: readonly VisibleRow[],
): boolean {
  const distinctRows = new Set(itemRows);
  if (distinctRows.size === 1) {
    const text = itemRows[0]?.text ?? "";
    const positions = unit.items.map((item) => semanticPosition(text, item));
    return positions.every(
      (position, index) =>
        position >= 0 && (index === 0 || position > (positions[index - 1] ?? -1)),
    );
  }
  const rowIndexes = itemRows.map((row) => allRows.indexOf(row));
  return rowIndexes.every(
    (rowIndex, index) => index === 0 || rowIndex > (rowIndexes[index - 1] ?? -1),
  );
}

function detectSiblingFusion(
  units: readonly PlannedSemanticUnit[],
  rows: readonly VisibleRow[],
): readonly SemanticRelationshipIssue[] {
  const points = units.filter((unit) => unit.kind === "point");
  if (points.length < 2) return [];

  return rows.flatMap((row) => {
    const matched = points.filter(
      (point) => ideaMatchScore(row.text, point.label) >= 0.8,
    );
    if (matched.length < 2) return [];
    const normalizedRow = normalizeWords(row.text);
    if (matched.some((point) => normalizeWords(point.label) === normalizedRow)) {
      return [];
    }
    return [
      relationshipIssue(
        "grounding-sibling-fusion",
        row,
        `One visible semantic unit fuses distinct source siblings: ${matched
          .slice(0, 3)
          .map((unit) => `"${unit.label}"`)
          .join(", ")}.`,
      ),
    ];
  });
}

function detectCrossConceptFusion(
  section: PlannedSection,
  allSections: readonly PlannedSection[],
  rows: readonly VisibleRow[],
  currentSourceText?: string,
): readonly SemanticRelationshipIssue[] {
  const ownEvidence = normalizeWords(
    [
      ...(section.semanticPlan?.units ?? [])
        .flatMap((unit) => [unit.label, ...unit.items]),
      currentSourceText ?? "",
    ].join(" "),
  );
  const foreignTitles = allSections.filter((candidate) => candidate.id !== section.id);

  return rows.flatMap((row) => {
    const normalizedRow = normalizeWords(row.text);
    const fusedTitle = foreignTitles.find((candidate) => {
      const titleKey = normalizeWords(candidate.title);
      return (
        titleKey.split(" ").length >= 2 &&
        normalizedRow.includes(titleKey) &&
        !ownEvidence.includes(titleKey)
      );
    });
    if (!fusedTitle) return [];
    return [
      relationshipIssue(
        "grounding-cross-concept-fusion",
        row,
        `Visible content for "${section.title}" is fused with the separate source heading "${fusedTitle.title}".`,
      ),
    ];
  });
}

function semanticUnitMatchScore(unit: PlannedSemanticUnit, text: string): number {
  if (unit.kind === "point") return ideaMatchScore(text, unit.label);
  const scores = [
    ideaMatchScore(text, unit.label),
    ...unit.items.map((item) => ideaMatchScore(text, item)),
  ];
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function relationshipShapeIsValid(unit: PlannedSemanticUnit, text: string): boolean {
  if (unit.kind === "point") return true;
  if (
    ideaMatchScore(text, unit.label) < IDEA_MATCH_THRESHOLD ||
    unit.items.some(
      (item) => ideaMatchScore(text, item) < IDEA_MATCH_THRESHOLD,
    )
  ) {
    return false;
  }
  const labelPosition = semanticPosition(text, unit.label);
  const childPositions = unit.items.map((item) => semanticPosition(text, item));
  if (
    labelPosition < 0 ||
    childPositions.some((position) => position < 0) ||
    childPositions.some((position) => position <= labelPosition)
  ) {
    return false;
  }
  if (unit.kind === "steps" || unit.kind === "sequence") {
    return childPositions.every(
      (position, index) => index === 0 || position > (childPositions[index - 1] ?? -1),
    );
  }
  return true;
}

function semanticPosition(text: string, expected: string): number {
  const textTerms = canonicalTerms(text);
  const expectedTerms = canonicalTerms(expected);
  for (
    let index = 0;
    index <= textTerms.length - expectedTerms.length;
    index += 1
  ) {
    if (
      expectedTerms.every(
        (term, offset) => textTerms[index + offset] === term,
      )
    ) {
      return index;
    }
  }
  const matchedIndexes = expectedTerms.flatMap((term) => {
    const index = textTerms.indexOf(term);
    return index >= 0 ? [index] : [];
  });
  return matchedIndexes.length / Math.max(1, expectedTerms.length) >= 0.6
    ? Math.min(...matchedIndexes)
    : -1;
}

function ideaMatchScore(text: string, expected: string): number {
  const expectedTerms = new Set(canonicalTerms(expected));
  const textTerms = new Set(canonicalTerms(text));
  if (expectedTerms.size === 0 || textTerms.size === 0) return 0;
  const matched = [...expectedTerms].filter((term) => textTerms.has(term)).length;
  const recall = matched / expectedTerms.size;
  return recall;
}

function visibleRows(output: SectionOutput): readonly VisibleRow[] {
  const rows: VisibleRow[] = [];
  const explanation = output.sourceCore.explanation.trim();
  if (explanation) {
    rows.push({ text: explanation, fieldPath: "sourceCore.explanation" });
  }
  output.sourceCore.keyPoints.forEach((text, index) => {
    if (text.trim()) rows.push({ text, fieldPath: `sourceCore.keyPoints[${index}]` });
  });
  return rows;
}

function associationIssueType(unit: PlannedSemanticUnit): SemanticRelationshipIssueType {
  switch (unit.kind) {
    case "definition": return "grounding-wrong-definition-association";
    case "mapping": return "grounding-unsupported-relationship";
    case "group": return "grounding-wrong-parent-child";
    case "steps": return "grounding-wrong-step-order";
    case "sequence": return "grounding-wrong-step-order";
    case "examples": return "grounding-wrong-example-association";
    case "point": return "grounding-unsupported-relationship";
  }
}

function unitKindName(unit: PlannedSemanticUnit): string {
  switch (unit.kind) {
    case "definition": return "Definition";
    case "mapping": return "Mapping";
    case "group": return "Parent";
    case "steps": return "Procedure";
    case "sequence": return "Sequence";
    case "examples": return "Example group";
    case "point": return "Point";
  }
}

function relationshipIssue(
  type: SemanticRelationshipIssueType,
  row: VisibleRow,
  message: string,
): SemanticRelationshipIssue {
  return { type, message, fieldPath: row.fieldPath, offendingText: [row.text] };
}

function describeUnit(unit: PlannedSemanticUnit): string {
  if (unit.kind === "point") return `point "${unit.label}"`;
  return `${unitKindName(unit).toLocaleLowerCase()} "${unit.label}"`;
}

function canonicalTerms(value: string): readonly string[] {
  return (value.toLocaleLowerCase().match(/[a-z0-9]+(?:[-/][a-z0-9]+)*/g) ?? [])
    .filter((term) => !CONTENT_STOPWORDS.has(term))
    .map(canonicalTerm)
    .filter(Boolean);
}

function canonicalTerm(value: string): string {
  if (value.endsWith("ies") && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith("ing") && value.length > 6) return value.slice(0, -3);
  if (value.endsWith("ed") && value.length > 5) return value.slice(0, -2);
  if (value.endsWith("s") && !value.endsWith("ss") && value.length > 4) {
    return value.slice(0, -1);
  }
  return value;
}

function normalizeWords(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function dedupeIssues(
  issues: readonly SemanticRelationshipIssue[],
): readonly SemanticRelationshipIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}\u001f${issue.fieldPath}\u001f${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
