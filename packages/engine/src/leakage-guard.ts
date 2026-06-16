import { STUDENT_CONTENT_LEAKAGE_DENYLIST } from "@stay-focused/shared";

import type {
  GenerationPlan,
  LeakageIssue,
  LeakageReport,
  PlannedSection,
  SectionLeakageResult,
  SectionOutput,
  StudentFacingSectionField,
} from "./types.js";

export const DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS = [
  "recall the exam meaning",
  "explain the source relationship",
  "as an ai",
  "the source text",
  "based on the instructions",
  "based on these instructions",
  "provided instructions",
  "you are generating one structured study-review section",
  "section title:",
  "target:",
  "source excerpt",
  "instructions:",
  "use only the provided source content",
  "do not invent missing information",
  "return structured output matching the provided schema exactly",
  "matching the provided schema exactly",
  "set plannedsectionid",
  "set sourceblockids",
  "schema kind:",
  "requested item count:",
  "coverage rules:",
] as const;

export type UserFacingSectionOutputField = StudentFacingSectionField;

export interface InstructionLeakageFinding {
  readonly field: UserFacingSectionOutputField;
  readonly fieldPath: string;
  readonly forbiddenPattern: string;
}

export interface InstructionLeakageGuardOptions {
  readonly forbiddenPatterns?: readonly string[];
}

export type InstructionLeakageGuardResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: "instruction-leakage";
      readonly fields: readonly UserFacingSectionOutputField[];
      readonly findings: readonly InstructionLeakageFinding[];
    };

export interface ValidateLeakageArgs {
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
}

interface StudentFacingTextEntry {
  readonly field: StudentFacingSectionField;
  readonly fieldPath: string;
  readonly text: string;
}

interface MatchedLeakageTerm {
  readonly term: string;
  readonly index: number;
}

export function detectInstructionLeakage(
  output: SectionOutput,
  options: InstructionLeakageGuardOptions = {},
): InstructionLeakageGuardResult {
  const forbiddenPatterns =
    options.forbiddenPatterns ?? DEFAULT_FORBIDDEN_INSTRUCTION_PATTERNS;
  const normalizedPatterns = forbiddenPatterns
    .map((pattern) => ({
      original: pattern,
      normalized: normalizeForLooseMatch(pattern),
    }))
    .filter(({ normalized }) => normalized.length > 0);
  const findings: InstructionLeakageFinding[] = [];

  for (const entry of collectStudentFacingText(output)) {
    const normalizedText = normalizeForLooseMatch(entry.text);
    for (const pattern of normalizedPatterns) {
      if (normalizedText.includes(pattern.normalized)) {
        findings.push({
          field: entry.field,
          fieldPath: entry.fieldPath,
          forbiddenPattern: pattern.original,
        });
      }
    }
  }

  if (findings.length === 0) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "instruction-leakage",
    fields: uniqueInstructionFields(findings),
    findings,
  };
}

export function validateLeakage(args: ValidateLeakageArgs): LeakageReport {
  validateLeakageArgs(args);

  const plannedSectionsById = new Map(
    args.plan.sections.map((section) => [section.id, section] as const),
  );
  const outputsBySectionId = groupOutputsByPlannedSection(args.outputs);
  const sections = args.plan.sections.map((section) =>
    validateSectionLeakage(section, outputsBySectionId.get(section.id) ?? []),
  );
  const issues = sections.flatMap((section) => section.issues);

  for (const output of args.outputs) {
    if (plannedSectionsById.has(output.plannedSectionId)) {
      continue;
    }

    const unplannedIssues = collectLeakageIssues({
      output,
      plannedSectionId: output.plannedSectionId,
      sourceSectionId: "",
    });
    if (unplannedIssues.length > 0) {
      issues.push(...unplannedIssues);
    }
  }
  const status = issues.length === 0 ? "passed" : "failed";

  return {
    id: stableId(
      "leakage",
      [
        args.plan.id,
        args.plan.sourceId,
        status,
        ...sections.map(
          (section) =>
            `${section.plannedSectionId}:${section.status}:${section.issues.length}`,
        ),
        ...issues.map(
          (issue) =>
            `${issue.plannedSectionId}:${issue.fieldPath}:${issue.offendingTerm}:${issue.excerpt}`,
        ),
      ].join("\u001f"),
    ),
    planId: args.plan.id,
    sourceId: args.plan.sourceId,
    status,
    issues,
    sections,
  };
}

function validateSectionLeakage(
  section: PlannedSection,
  outputs: readonly SectionOutput[],
): SectionLeakageResult {
  const output = outputs[0];
  if (!output) {
    return {
      plannedSectionId: section.id,
      sourceSectionId: section.sourceSectionId,
      status: "passed",
      issues: [],
      retryable: false,
    };
  }

  const issues = collectLeakageIssues({
    output,
    plannedSectionId: section.id,
    sourceSectionId: section.sourceSectionId,
  });

  return {
    plannedSectionId: section.id,
    sourceSectionId: section.sourceSectionId,
    status: issues.length === 0 ? "passed" : "failed",
    issues,
    retryable: issues.length > 0,
  };
}

function collectLeakageIssues(args: {
  readonly output: SectionOutput;
  readonly plannedSectionId: string;
  readonly sourceSectionId: string;
}): readonly LeakageIssue[] {
  const issues: LeakageIssue[] = [];

  for (const entry of collectStudentFacingText(args.output)) {
    const matchedTerms = findLeakageTerms(entry.text);
    for (const match of matchedTerms) {
      const excerpt = excerptAround(entry.text, match.index, match.term.length);
      issues.push({
        type: "leakage",
        severity: "error",
        plannedSectionId: args.plannedSectionId,
        sourceSectionId: args.sourceSectionId,
        field: entry.field,
        fieldPath: entry.fieldPath,
        offendingTerm: match.term,
        excerpt,
        message: `Student-facing content contains internal project term "${match.term}" in ${entry.fieldPath}.`,
      });
    }
  }

  return issues;
}

function collectStudentFacingText(
  output: SectionOutput,
): readonly StudentFacingTextEntry[] {
  const entries: StudentFacingTextEntry[] = [
    { field: "title", fieldPath: "title", text: output.title },
    {
      field: "sourceCore.explanation",
      fieldPath: "sourceCore.explanation",
      text: output.sourceCore.explanation,
    },
    ...output.sourceCore.keyPoints.map(
      (text, index): StudentFacingTextEntry => ({
        field: "sourceCore.keyPoints",
        fieldPath: `sourceCore.keyPoints[${index}]`,
        text,
      }),
    ),
  ];

  if (output.enrichment?.note !== undefined) {
    entries.push({
      field: "enrichment.note",
      fieldPath: "enrichment.note",
      text: output.enrichment.note,
    });
  }

  if (output.enrichment?.points !== undefined) {
    entries.push(
      ...output.enrichment.points.map(
        (text, index): StudentFacingTextEntry => ({
          field: "enrichment.points",
          fieldPath: `enrichment.points[${index}]`,
          text,
        }),
      ),
    );
  }

  return entries;
}

function findLeakageTerms(text: string): readonly MatchedLeakageTerm[] {
  const matches: MatchedLeakageTerm[] = [];

  for (const term of STUDENT_CONTENT_LEAKAGE_DENYLIST) {
    const match = findBoundedTerm(text, term);
    if (match !== undefined) {
      matches.push({ term, index: match });
    }
  }

  return matches;
}

function findBoundedTerm(text: string, term: string): number | undefined {
  const escapedTerm = escapeRegExp(term).replace(/\s+/g, "\\s+");
  const expression = new RegExp(`(^|[^A-Za-z0-9])(${escapedTerm})(?=$|[^A-Za-z0-9])`, "i");
  const match = expression.exec(text);
  if (!match || match.index < 0) {
    return undefined;
  }
  return match.index + (match[1]?.length ?? 0);
}

function excerptAround(text: string, start: number, length: number): string {
  const prefixStart = Math.max(0, start - 36);
  const suffixEnd = Math.min(text.length, start + length + 36);
  const prefix = prefixStart > 0 ? "..." : "";
  const suffix = suffixEnd < text.length ? "..." : "";
  return `${prefix}${text.slice(prefixStart, suffixEnd).trim()}${suffix}`;
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

function validateLeakageArgs(args: ValidateLeakageArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Leakage validation requires generated outputs.");
  }
  if (!args.plan || typeof args.plan !== "object" || Array.isArray(args.plan)) {
    throw new Error("Leakage validation requires a generation plan.");
  }
  if (!Array.isArray(args.plan.sections)) {
    throw new Error("Leakage validation requires planned sections.");
  }
}

function uniqueInstructionFields(
  findings: readonly InstructionLeakageFinding[],
): readonly UserFacingSectionOutputField[] {
  const fields = new Set<UserFacingSectionOutputField>();
  for (const finding of findings) {
    fields.add(finding.field);
  }
  return Array.from(fields);
}

function normalizeForLooseMatch(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
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
