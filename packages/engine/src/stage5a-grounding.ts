import { GROUNDING_THRESHOLD } from "@stay-focused/shared";

import {
  extractCleanSourceItems,
  type SourceItem,
} from "./source-items.js";
import { removeConsecutiveDuplicateSourceBlocks } from "./source-blocks.js";
import {
  extractStudentVisibleText,
  type StudentVisibleTextEntry,
} from "./student-visible-text.js";
import { flattenSourceBlocks } from "./stage1-outline.js";
import { normalizeCoverageTitleKey } from "./stage4-verify.js";
import { findSourceTokenFidelityViolations } from "./source-token-fidelity.js";
import type {
  GenerationPlan,
  GroundingIssue,
  GroundingReport,
  NormalizedSource,
  NormalizedSourceBlock,
  Phase1FabricationFailure,
  PlannedSection,
  SectionGroundingResult,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
} from "./types.js";

export interface ValidateGroundingArgs {
  readonly plan: GenerationPlan;
  readonly outputs: readonly SectionOutput[];
  readonly source: NormalizedSource;
  readonly outline: SourceOutline;
}

interface SourceSpan {
  readonly sourceSection: SourceOutlineSection;
  readonly text: string;
}

interface TermOccurrence {
  readonly text: string;
  readonly canonical: string;
  readonly index: number;
}

interface ClaimFabricationFailure extends Phase1FabricationFailure {
  readonly field: StudentVisibleTextEntry["field"];
  readonly unsupportedOccurrences: readonly TermOccurrence[];
}

interface FabricationCheck {
  readonly score: number;
  readonly issues: readonly GroundingIssue[];
  readonly failures: readonly ClaimFabricationFailure[];
}

interface OmissionCheck {
  readonly score: number;
  readonly sourceItemCount: number;
  readonly representedSourceItemCount: number;
  readonly issues: readonly GroundingIssue[];
}

interface InstrumentedSectionGroundingResult extends SectionGroundingResult {
  readonly phase1FabricationFailures: readonly Phase1FabricationFailure[];
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "as",
  "it",
  "is",
  "are",
  "was",
  "were",
  "for",
  "to",
  "of",
  "in",
  "on",
  "by",
  "with",
  "that",
  "this",
  "these",
  "those",
  "can",
  "be",
  "its",
  "also",
  "such",
  "which",
  "from",
  "into",
  "their",
  "they",
  "them",
]);

const LIST_COVERAGE_THRESHOLD = 0.8; // mirrors GROUNDING_THRESHOLD convention
const TOKEN_PATTERN = /[A-Za-z][A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)*/g;

export function validateGrounding(
  args: ValidateGroundingArgs,
): GroundingReport {
  validateArgs(args);

  const sourceSectionsById = new Map(
    args.outline.sections.map((section) => [section.id, section] as const),
  );
  const outputsBySectionId = groupOutputsByPlannedSection(args.outputs);
  const sections = args.plan.sections.map((section) => {
    const sourceSection = sourceSectionsById.get(section.sourceSectionId);
    if (!sourceSection) {
      throw new Error(
        `Grounding validation could not find source section "${section.sourceSectionId}".`,
      );
    }
    return validateSectionGrounding({
      section,
      outputs: outputsBySectionId.get(section.id) ?? [],
      sourceSpan: {
        sourceSection,
        text: extractGroundingSourceSectionText(args.source, sourceSection),
      },
    });
  });
  const issues = sections.flatMap((section) => section.issues);
  const phase1FabricationFailures = sections.flatMap(
    (section) => section.phase1FabricationFailures,
  );
  const score = roundScore(
    sections.length === 0
      ? 0
      : sections.reduce((total, section) => total + section.score, 0) /
          sections.length,
  );
  const status =
    score >= GROUNDING_THRESHOLD &&
    sections.every((section) => section.status === "passed")
      ? "passed"
      : "failed";

  return {
    id: stableId(
      "grounding",
      [
        args.plan.id,
        args.source.id,
        args.outline.id,
        score,
        status,
        phase1FabricationFailures.length,
        ...sections.map(
          (section) =>
            `${section.plannedSectionId}:${section.score}:${section.status}:${section.issues.length}`,
        ),
      ].join("\u001f"),
    ),
    planId: args.plan.id,
    sourceId: args.source.id,
    status,
    score,
    threshold: GROUNDING_THRESHOLD,
    issues,
    sections,
    phase1FabricationFails: phase1FabricationFailures.length,
    phase1FabricationFailures,
  };
}

function validateSectionGrounding(args: {
  readonly section: PlannedSection;
  readonly outputs: readonly SectionOutput[];
  readonly sourceSpan: SourceSpan;
}): InstrumentedSectionGroundingResult {
  const output = args.outputs[0];
  if (!output) {
    return {
      plannedSectionId: args.section.id,
      sourceSectionId: args.section.sourceSectionId,
      status: "failed",
      score: 0,
      sourceItemCount: 0,
      representedSourceItemCount: 0,
      issues: [],
      retryable: true,
      phase1FabricationFailures: [],
    };
  }

  const visibleEntries = extractStudentVisibleText(output);
  const sourceTerms = extractTermSet(args.sourceSpan.text);
  const titleTerms = new Set([
    ...sourceTerms,
    ...extractTermSet(args.sourceSpan.sourceSection.title),
    ...extractTermSet(args.section.title),
  ]);
  const sourceItems = extractCleanSourceItems({
    sourceSpanText: args.sourceSpan.text,
    sectionTitle: args.sourceSpan.sourceSection.title,
  });
  const fabricationCheck = checkFabrication({
    section: args.section,
    sourceText: args.sourceSpan.text,
    titleSourceText: [
      args.sourceSpan.text,
      args.sourceSpan.sourceSection.title,
      args.section.title,
    ].join("\n"),
    sourceTerms,
    titleTerms,
    visibleEntries,
  });
  const omissionCheck = checkOmissions({
    section: args.section,
    sourceItems,
    keyPoints: output.sourceCore.keyPoints,
  });
  const score = roundScore(
    Math.min(fabricationCheck.score, omissionCheck.score),
  );
  const issues = [...fabricationCheck.issues, ...omissionCheck.issues];

  return {
    plannedSectionId: args.section.id,
    sourceSectionId: args.section.sourceSectionId,
    status:
      score >= GROUNDING_THRESHOLD && issues.length === 0 ? "passed" : "failed",
    score,
    sourceItemCount: omissionCheck.sourceItemCount,
    representedSourceItemCount: omissionCheck.representedSourceItemCount,
    issues,
    retryable: issues.length > 0,
    phase1FabricationFailures: fabricationCheck.failures,
  };
}

function checkFabrication(args: {
  readonly section: PlannedSection;
  readonly sourceText: string;
  readonly titleSourceText: string;
  readonly sourceTerms: ReadonlySet<string>;
  readonly titleTerms: ReadonlySet<string>;
  readonly visibleEntries: readonly StudentVisibleTextEntry[];
}): FabricationCheck {
  // PHASE 1: lexical content-token check. Flags faithful synonym paraphrase
  // (e.g. "blocks" for "prevents") as fabrication. Phase 2 adds an entailment
  // judge for exactly these cases. Generator is kept extraction-first meanwhile.
  const failures = args.visibleEntries.flatMap((entry) => {
    const unsupportedOccurrences = findUnsupportedContentTerms(
      entry.text,
      entry.field === "title" ? args.titleTerms : args.sourceTerms,
    );
    const fidelityOccurrences = findSourceTokenFidelityViolations(
      entry.field === "title" ? args.titleSourceText : args.sourceText,
      entry.text,
    ).map(
      (violation): TermOccurrence => ({
        text: violation.text,
        canonical: `source-token:${violation.text}`,
        index: violation.index,
      }),
    );
    const combinedOccurrences = dedupeTermOccurrences([
      ...unsupportedOccurrences,
      ...fidelityOccurrences,
    ]);
    if (combinedOccurrences.length === 0) {
      return [];
    }

    return [
      {
        claimText: entry.text,
        unsupportedTokens: combinedOccurrences.map(
          (occurrence) => occurrence.text,
        ),
        sourceSectionId: args.section.sourceSectionId,
        field: entry.field,
        fieldPath: entry.fieldPath,
        unsupportedOccurrences: combinedOccurrences,
      } satisfies ClaimFabricationFailure,
    ];
  });

  if (failures.length === 0) {
    return { score: 1, issues: [], failures: [] };
  }

  const unsupportedTokenCount = failures.reduce(
    (total, failure) => total + failure.unsupportedTokens.length,
    0,
  );
  const issues = failures.map((failure) =>
    createFabricationIssue({
      section: args.section,
      failure,
    }),
  );
  const rawScore = Math.max(0, 1 - unsupportedTokenCount * 0.15);

  return {
    score: Math.min(0.79, roundScore(rawScore)),
    issues,
    failures,
  };
}

function dedupeTermOccurrences(
  occurrences: readonly TermOccurrence[],
): readonly TermOccurrence[] {
  const seen = new Set<string>();
  return occurrences.filter((occurrence) => {
    const key = `${occurrence.index}\u001f${occurrence.text}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function checkOmissions(args: {
  readonly section: PlannedSection;
  readonly sourceItems: readonly SourceItem[];
  readonly keyPoints: readonly string[];
}): OmissionCheck {
  if (args.sourceItems.length < 2) {
    return {
      score: 1,
      sourceItemCount: args.sourceItems.length,
      representedSourceItemCount: args.sourceItems.length,
      issues: [],
    };
  }

  const representedItemKeys = new Set(
    args.keyPoints
      .map(normalizeCoverageTitleKey)
      .filter((key) => key.length > 0),
  );
  const missingItems: SourceItem[] = [];

  for (const item of args.sourceItems) {
    if (!representedItemKeys.has(normalizeCoverageTitleKey(item.text))) {
      missingItems.push(item);
    }
  }

  const representedCount = args.sourceItems.length - missingItems.length;
  const score = roundScore(representedCount / args.sourceItems.length);

  if (score >= LIST_COVERAGE_THRESHOLD) {
    return {
      score,
      sourceItemCount: args.sourceItems.length,
      representedSourceItemCount: representedCount,
      issues: [],
    };
  }

  return {
    score,
    sourceItemCount: args.sourceItems.length,
    representedSourceItemCount: representedCount,
    issues: [
      {
        type: "grounding-omission",
        severity: "error",
        plannedSectionId: args.section.id,
        sourceSectionId: args.section.sourceSectionId,
        sourceItem: missingItems
          .slice(0, 5)
          .map((item) => item.text)
          .join(" | "),
        message: `SourceCore represents ${representedCount} of ${args.sourceItems.length} detected source list items.`,
      },
    ],
  };
}

function createFabricationIssue(args: {
  readonly section: PlannedSection;
  readonly failure: ClaimFabricationFailure;
}): GroundingIssue {
  const firstOccurrence = args.failure.unsupportedOccurrences[0];
  if (!firstOccurrence) {
    throw new Error("Fabrication issue requires an unsupported content token.");
  }

  return {
    type: "grounding-fabrication",
    severity: "error",
    plannedSectionId: args.section.id,
    sourceSectionId: args.section.sourceSectionId,
    field: args.failure.field,
    fieldPath: args.failure.fieldPath,
    offendingText: args.failure.unsupportedTokens,
    excerpt: excerptAround(
      args.failure.claimText,
      firstOccurrence.index,
      firstOccurrence.text.length,
    ),
    message: `Default student-visible content introduces unsupported content tokens "${args.failure.unsupportedTokens.join(", ")}" in ${args.failure.fieldPath}.`,
  };
}

export function extractGroundingSourceSectionText(
  source: NormalizedSource,
  sourceSection: SourceOutlineSection,
): string {
  const sourceBlockIds = new Set([
    ...sourceSection.sourceBlockIds,
    ...sourceSection.blockIds,
  ]);
  const orderedBlocks = source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
  const flattened = flattenSourceBlocks(
    removeConsecutiveDuplicateSourceBlocks(orderedBlocks),
  );
  const fragments = flattened
    .filter(({ block }) => sourceBlockIds.has(block.id))
    .map(({ block, startOffset, endOffset }) =>
      sliceBlockForSourceSection({
        block,
        blockStartOffset: startOffset,
        blockEndOffset: endOffset,
        sourceSection,
      }),
    )
    .filter((text): text is string => text !== undefined && text.length > 0);

  return fragments.join("\n").trim();
}

function sliceBlockForSourceSection(args: {
  readonly block: NormalizedSourceBlock;
  readonly blockStartOffset: number;
  readonly blockEndOffset: number;
  readonly sourceSection: SourceOutlineSection;
}): string | undefined {
  const startOffset = Math.max(
    args.blockStartOffset,
    args.sourceSection.startOffset,
  );
  const endOffset = Math.min(args.blockEndOffset, args.sourceSection.endOffset);
  if (startOffset >= endOffset) {
    return undefined;
  }

  const localStartOffset = startOffset - args.blockStartOffset;
  const localEndOffset = endOffset - args.blockStartOffset;
  const text = args.block.text.slice(localStartOffset, localEndOffset).trim();
  return text.length > 0 ? text : undefined;
}

function extractTermSet(value: string): ReadonlySet<string> {
  return new Set(
    extractTerms(value)
      .map((term) => term.canonical)
      .filter((term) => term.length > 0),
  );
}

function extractTerms(
  value: string,
): readonly { readonly text: string; readonly canonical: string; readonly index: number }[] {
  const terms: { readonly text: string; readonly canonical: string; readonly index: number }[] = [];

  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const text = match[0];
    if (STOPWORDS.has(text.toLowerCase())) {
      continue;
    }
    const canonical = canonicalTerm(text);
    if (canonical.length === 0) {
      continue;
    }
    terms.push({
      text,
      canonical,
      index: match.index ?? 0,
    });
  }

  return terms;
}

function findUnsupportedContentTerms(
  claimText: string,
  sourceTerms: ReadonlySet<string>,
): readonly TermOccurrence[] {
  const seen = new Set<string>();
  const unsupported: TermOccurrence[] = [];

  for (const occurrence of extractTerms(claimText)) {
    if (
      sourceTerms.has(occurrence.canonical) ||
      seen.has(occurrence.canonical)
    ) {
      continue;
    }
    seen.add(occurrence.canonical);
    unsupported.push(occurrence);
  }

  return unsupported;
}

function canonicalTerm(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9/-]+/g, "")
    .trim();

  if (normalized.endsWith("ies") && normalized.length > 4) {
    return `${normalized.slice(0, -3)}y`;
  }
  if (normalized.endsWith("ing") && normalized.length > 6) {
    return normalized.slice(0, -3);
  }
  if (normalized.endsWith("ed") && normalized.length > 5) {
    return normalized.slice(0, -2);
  }
  if (
    normalized.endsWith("s") &&
    !normalized.endsWith("ss") &&
    normalized.length > 4
  ) {
    return normalized.slice(0, -1);
  }

  return normalized;
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

function validateArgs(args: ValidateGroundingArgs): void {
  if (!args || !Array.isArray(args.outputs)) {
    throw new Error("Grounding validation requires generated outputs.");
  }
  if (!args.plan || typeof args.plan !== "object" || Array.isArray(args.plan)) {
    throw new Error("Grounding validation requires a generation plan.");
  }
  if (!args.source || typeof args.source !== "object" || Array.isArray(args.source)) {
    throw new Error("Grounding validation requires a normalized source.");
  }
  if (!args.outline || typeof args.outline !== "object" || Array.isArray(args.outline)) {
    throw new Error("Grounding validation requires a source outline.");
  }
  if (!Array.isArray(args.plan.sections)) {
    throw new Error("Grounding validation requires planned sections.");
  }
  if (!Array.isArray(args.outline.sections)) {
    throw new Error("Grounding validation requires source outline sections.");
  }
  if (args.plan.sourceId !== args.source.id) {
    throw new Error(
      `Grounding validation source mismatch: plan source ID "${args.plan.sourceId}" does not match source ID "${args.source.id}".`,
    );
  }
  if (args.outline.sourceId !== args.source.id) {
    throw new Error(
      `Grounding validation source mismatch: outline source ID "${args.outline.sourceId}" does not match source ID "${args.source.id}".`,
    );
  }
}

function excerptAround(text: string, start: number, length: number): string {
  const prefixStart = Math.max(0, start - 36);
  const suffixEnd = Math.min(text.length, start + length + 36);
  const prefix = prefixStart > 0 ? "..." : "";
  const suffix = suffixEnd < text.length ? "..." : "";
  return `${prefix}${text.slice(prefixStart, suffixEnd).trim()}${suffix}`;
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
