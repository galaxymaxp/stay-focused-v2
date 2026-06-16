import { GROUNDING_THRESHOLD } from "@stay-focused/shared";

import { flattenSourceBlocks } from "./stage1-outline.js";
import type {
  GenerationPlan,
  GroundingIssue,
  GroundingReport,
  NormalizedSource,
  NormalizedSourceBlock,
  PlannedSection,
  SectionGroundingResult,
  SectionOutput,
  SourceOutline,
  SourceOutlineSection,
  StudentFacingSectionField,
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

interface CoreTextEntry {
  readonly field: StudentFacingSectionField;
  readonly fieldPath: string;
  readonly text: string;
}

interface TermOccurrence {
  readonly text: string;
  readonly canonical: string;
  readonly field: StudentFacingSectionField;
  readonly fieldPath: string;
  readonly index: number;
  readonly sourceText: string;
}

interface SourceItem {
  readonly text: string;
  readonly terms: readonly string[];
}

interface FabricationCheck {
  readonly score: number;
  readonly issues: readonly GroundingIssue[];
}

interface OmissionCheck {
  readonly score: number;
  readonly sourceItemCount: number;
  readonly representedSourceItemCount: number;
  readonly issues: readonly GroundingIssue[];
}

const HIGH_RISK_UNSUPPORTED_TERMS = new Set([
  "api",
  "apis",
  "browser",
  "covid",
  "covid-19",
  "disaster",
  "encryption",
  "firewall",
  "firewalls",
  "flood",
  "hijacker",
  "hijackers",
  "http",
  "icmp",
  "injection",
  "logging",
  "pandemic",
  "redundancy",
  "recovery",
  "retail",
  "slowloris",
  "sql",
  "ssl",
  "ssl/tls",
  "syn",
  "telemetry",
  "testing",
  "tls",
  "udp",
  "vpn",
  "vpns",
]);

const COMMON_UNSUPPORTED_WORDS = new Set([
  "about",
  "above",
  "across",
  "action",
  "actions",
  "additional",
  "also",
  "another",
  "because",
  "being",
  "below",
  "brief",
  "business",
  "cause",
  "caused",
  "causes",
  "clear",
  "clearly",
  "complete",
  "concept",
  "connect",
  "connected",
  "content",
  "context",
  "could",
  "describes",
  "detail",
  "details",
  "during",
  "example",
  "explain",
  "explained",
  "explains",
  "explanation",
  "focus",
  "focused",
  "following",
  "from",
  "given",
  "grounded",
  "helps",
  "include",
  "includes",
  "including",
  "information",
  "into",
  "itself",
  "key",
  "learner",
  "learners",
  "material",
  "meaning",
  "method",
  "methods",
  "must",
  "only",
  "part",
  "point",
  "points",
  "practical",
  "provided",
  "required",
  "review",
  "section",
  "shows",
  "source",
  "study",
  "summary",
  "takeaway",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "topic",
  "using",
  "where",
  "which",
  "while",
  "with",
  "within",
]);

const TOKEN_PATTERN = /[A-Za-z][A-Za-z0-9]*(?:[-/][A-Za-z0-9]+)*/g;
const LIST_MARKER_PATTERN =
  /(?:^|\s)(?:[-*]\s+|[•]\s+|â€¢\s+|\d{1,2}[.)]\s*|[a-z]\)\s*)/gi;

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
        text: extractSourceSectionText(args.source, sourceSection),
      },
    });
  });
  const issues = sections.flatMap((section) => section.issues);
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
  };
}

function validateSectionGrounding(args: {
  readonly section: PlannedSection;
  readonly outputs: readonly SectionOutput[];
  readonly sourceSpan: SourceSpan;
}): SectionGroundingResult {
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
    };
  }

  const coreEntries = collectSourceCoreText(output);
  const coreText = coreEntries.map((entry) => entry.text).join("\n");
  const sourceTerms = extractTermSet(args.sourceSpan.text);
  const sourceItems = extractSourceItems(args.sourceSpan.text);
  const fabricationCheck = checkFabrication({
    section: args.section,
    sourceTerms,
    sourceText: args.sourceSpan.text,
    coreEntries,
  });
  const omissionCheck = checkOmissions({
    section: args.section,
    sourceItems,
    coreText,
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
  };
}

function checkFabrication(args: {
  readonly section: PlannedSection;
  readonly sourceTerms: ReadonlySet<string>;
  readonly sourceText: string;
  readonly coreEntries: readonly CoreTextEntry[];
}): FabricationCheck {
  const sourceTermCount = args.sourceTerms.size;
  if (sourceTermCount < 3) {
    return { score: 1, issues: [] };
  }

  const unsupported = uniqueUnsupportedTerms(
    args.coreEntries.flatMap((entry) => extractTermOccurrences(entry)),
    args.sourceTerms,
  );
  const highConfidence = unsupported.filter((occurrence) =>
    isHighConfidenceFabrication(occurrence),
  );
  const issueOccurrences =
    highConfidence.length > 0
      ? highConfidence
      : unsupported.length >= 3
        ? unsupported
        : [];

  if (issueOccurrences.length === 0) {
    return { score: 1, issues: [] };
  }

  const issues = issueOccurrences.slice(0, 8).map((occurrence) =>
    createFabricationIssue({
      section: args.section,
      occurrence,
    }),
  );
  const rawScore = Math.max(0, 1 - issueOccurrences.length * 0.15);

  return {
    score: Math.min(0.79, roundScore(rawScore)),
    issues,
  };
}

function checkOmissions(args: {
  readonly section: PlannedSection;
  readonly sourceItems: readonly SourceItem[];
  readonly coreText: string;
}): OmissionCheck {
  if (args.sourceItems.length < 2) {
    return {
      score: 1,
      sourceItemCount: args.sourceItems.length,
      representedSourceItemCount: args.sourceItems.length,
      issues: [],
    };
  }

  const coreTerms = extractTermSet(args.coreText);
  const missingItems: SourceItem[] = [];

  for (const item of args.sourceItems) {
    if (!isSourceItemRepresented(item, coreTerms)) {
      missingItems.push(item);
    }
  }

  const representedCount = args.sourceItems.length - missingItems.length;
  const score = roundScore(representedCount / args.sourceItems.length);

  if (score >= GROUNDING_THRESHOLD) {
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
  readonly occurrence: TermOccurrence;
}): GroundingIssue {
  return {
    type: "grounding-fabrication",
    severity: "error",
    plannedSectionId: args.section.id,
    sourceSectionId: args.section.sourceSectionId,
    field: args.occurrence.field,
    fieldPath: args.occurrence.fieldPath,
    offendingText: args.occurrence.text,
    excerpt: excerptAround(
      args.occurrence.sourceText,
      args.occurrence.index,
      args.occurrence.text.length,
    ),
    message: `SourceCore introduces unsupported term "${args.occurrence.text}" in ${args.occurrence.fieldPath}.`,
  };
}

function collectSourceCoreText(output: SectionOutput): readonly CoreTextEntry[] {
  return [
    {
      field: "sourceCore.explanation",
      fieldPath: "sourceCore.explanation",
      text: output.sourceCore.explanation,
    },
    ...output.sourceCore.keyPoints.map(
      (text, index): CoreTextEntry => ({
        field: "sourceCore.keyPoints",
        fieldPath: `sourceCore.keyPoints[${index}]`,
        text,
      }),
    ),
  ];
}

function extractSourceSectionText(
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
    removeConsecutiveDuplicateBlocks(orderedBlocks),
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

function removeConsecutiveDuplicateBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly NormalizedSourceBlock[] {
  const uniqueBlocks: NormalizedSourceBlock[] = [];
  let previousText: string | undefined;

  for (const block of blocks) {
    if (block.text === previousText) {
      continue;
    }
    uniqueBlocks.push(block);
    previousText = block.text;
  }

  return uniqueBlocks;
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

function extractSourceItems(sourceText: string): readonly SourceItem[] {
  const normalized = normalizeListMarkers(sourceText);
  const markerMatches = [...normalized.matchAll(LIST_MARKER_PATTERN)];
  if (markerMatches.length < 2) {
    return [];
  }

  const items: SourceItem[] = [];
  for (let index = 0; index < markerMatches.length; index += 1) {
    const match = markerMatches[index];
    const nextMatch = markerMatches[index + 1];
    if (!match || match.index === undefined) {
      continue;
    }

    const itemStart = match.index + match[0].length;
    const itemEnd = nextMatch?.index ?? normalized.length;
    const itemText = cleanSourceItemText(normalized.slice(itemStart, itemEnd));
    const terms = Array.from(extractTermSet(itemText));
    if (itemText.length > 0 && terms.length > 0) {
      items.push({ text: itemText, terms });
    }
  }

  return items;
}

function normalizeListMarkers(value: string): string {
  return value
    .replace(/â€¢/g, " • ")
    .replace(/•/g, " • ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSourceItemText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[.:;,\s]+/, "")
    .trim();
}

function extractTermSet(value: string): ReadonlySet<string> {
  return new Set(
    extractTerms(value)
      .map((term) => term.canonical)
      .filter((term) => term.length > 0),
  );
}

function extractTermOccurrences(
  entry: CoreTextEntry,
): readonly TermOccurrence[] {
  return extractTerms(entry.text).map((term) => ({
    ...term,
    field: entry.field,
    fieldPath: entry.fieldPath,
    sourceText: entry.text,
  }));
}

function extractTerms(
  value: string,
): readonly { readonly text: string; readonly canonical: string; readonly index: number }[] {
  const terms: { readonly text: string; readonly canonical: string; readonly index: number }[] = [];

  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const text = match[0];
    const canonical = canonicalTerm(text);
    if (canonical.length === 0 || COMMON_UNSUPPORTED_WORDS.has(canonical)) {
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

function uniqueUnsupportedTerms(
  occurrences: readonly TermOccurrence[],
  sourceTerms: ReadonlySet<string>,
): readonly TermOccurrence[] {
  const seen = new Set<string>();
  const unique: TermOccurrence[] = [];

  for (const occurrence of occurrences) {
    if (
      sourceTerms.has(occurrence.canonical) ||
      seen.has(occurrence.canonical)
    ) {
      continue;
    }
    seen.add(occurrence.canonical);
    unique.push(occurrence);
  }

  return unique;
}

function isHighConfidenceFabrication(occurrence: TermOccurrence): boolean {
  return (
    HIGH_RISK_UNSUPPORTED_TERMS.has(occurrence.canonical) ||
    /[0-9/-]/.test(occurrence.text) ||
    /^[A-Z0-9]{2,}$/.test(occurrence.text)
  );
}

function isSourceItemRepresented(
  item: SourceItem,
  coreTerms: ReadonlySet<string>,
): boolean {
  const matchedTerms = item.terms.filter((term) => coreTerms.has(term));
  if (item.terms.length <= 2) {
    return matchedTerms.length === item.terms.length;
  }
  return matchedTerms.length >= Math.ceil(item.terms.length * 0.5);
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
