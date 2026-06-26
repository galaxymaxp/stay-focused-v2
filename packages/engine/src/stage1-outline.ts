import type {
  NormalizedSource,
  NormalizedSourceBlock,
  SectionContentTag,
  SourceBlockKind,
  SourceOutline,
  SourceOutlineSection,
} from "./types";

interface FlattenedBlock {
  readonly block: NormalizedSourceBlock;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface SectionFragment {
  readonly block: NormalizedSourceBlock;
  readonly kind: SourceBlockKind;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface SectionDraft {
  readonly title: string;
  readonly fragments: readonly SectionFragment[];
  readonly headingBased: boolean;
  readonly inferred: boolean;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface BoundaryCandidate {
  readonly title: string;
  readonly offset: number;
  readonly priority: number;
}

interface LineSlice {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface InlineHeadingCandidate {
  readonly title: string;
  readonly startOffset: number;
}

const PROCESS_PATTERN =
  /\b(first|next|then|finally|procedure|process|steps?)\b/i;
const EXAMPLE_PATTERN = /\b(for example|example|instance|scenario|sample)\b/i;
const CLAIM_PATTERN =
  /\b(argues?|states?|proves?|suggests?|evidence|therefore|because)\b/i;
const DEFINITION_PATTERN =
  /\b(is defined as|refers to|means|definition|vulnerability|exploit|breach)\b/i;

const BLOCK_SEPARATOR = "\n\n";
const MAX_INLINE_HEADING_LOOKBACK = 180;

export async function detectOutline(
  source: NormalizedSource,
): Promise<SourceOutline> {
  const orderedBlocks = source.blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort(
      (left, right) =>
        left.block.order - right.block.order ||
        left.inputIndex - right.inputIndex,
    )
    .map(({ block }) => block);
  const flattenedBlocks = flattenBlocks(
    removeConsecutiveDuplicateBlocks(orderedBlocks),
  );

  if (flattenedBlocks.length === 0) {
    return createEmptyOutline(source);
  }

  const drafts = mergeRepeatedDrafts(
    createDraftsFromBoundaries({
      source,
      flattenedBlocks,
      boundaries: detectBoundaries(flattenedBlocks),
    }),
  );
  const sections = drafts.map((draft, order) =>
    createOutlineSection(source.id, draft, order),
  );

  return {
    id: stableId(
      "outline",
      [source.id, ...sections.map((section) => section.id)].join("\u001f"),
    ),
    sourceId: source.id,
    title: source.title,
    sections,
  };
}

export function flattenSourceBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly FlattenedBlock[] {
  return flattenBlocks(blocks);
}

function createEmptyOutline(source: NormalizedSource): SourceOutline {
  return {
    id: stableId("outline", `${source.id}\u001fempty`),
    sourceId: source.id,
    title: source.title,
    sections: [],
  };
}

function flattenBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly FlattenedBlock[] {
  const flattened: FlattenedBlock[] = [];
  let offset = 0;

  for (const block of blocks) {
    const startOffset = offset;
    const endOffset = startOffset + block.text.length;
    flattened.push({ block, startOffset, endOffset });
    offset = endOffset + BLOCK_SEPARATOR.length;
  }

  return flattened;
}

function removeConsecutiveDuplicateBlocks(
  blocks: readonly NormalizedSourceBlock[],
): readonly NormalizedSourceBlock[] {
  const deduped: NormalizedSourceBlock[] = [];

  for (const block of blocks) {
    const previous = deduped.at(-1);
    if (
      previous &&
      previous.kind === block.kind &&
      normalizeSpaces(previous.text) === normalizeSpaces(block.text)
    ) {
      continue;
    }
    deduped.push(block);
  }

  return deduped;
}

function detectBoundaries(
  flattenedBlocks: readonly FlattenedBlock[],
): readonly BoundaryCandidate[] {
  const candidates = flattenedBlocks.flatMap((entry) => [
    ...detectBlockBoundary(entry),
    ...detectLineBoundaries(entry),
    ...detectInlineBoundaries(entry),
  ]);

  return cleanBoundaries(candidates);
}

function detectBlockBoundary(
  entry: FlattenedBlock,
): readonly BoundaryCandidate[] {
  if (entry.block.kind !== "heading") {
    return [];
  }

  return [
    {
      title: cleanHeading(entry.block.text) || "Untitled Section",
      offset: entry.startOffset,
      priority: 10,
    },
  ];
}

function detectLineBoundaries(
  entry: FlattenedBlock,
): readonly BoundaryCandidate[] {
  if (entry.block.kind === "heading") {
    return [];
  }

  const lines = splitLines(entry.block.text, entry.startOffset);
  const boundaries: BoundaryCandidate[] = [];
  const plainTextOcrBoundaryLines = findPlainTextOcrBoundaryLineIndexes(lines);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.text.trim();
    if (!trimmed) {
      continue;
    }

    const nextLine = lines
      .slice(index + 1)
      .find((candidate) => candidate.text.trim().length > 0);
    const markdownTitle = isMarkdownHeading(trimmed)
      ? cleanHeading(trimmed)
      : undefined;

    if (markdownTitle) {
      boundaries.push({
        title: markdownTitle,
        offset: line.startOffset + line.text.indexOf(trimmed),
        priority: 9,
      });
      continue;
    }

    if (
      isShortHeadingLine(trimmed) &&
      nextLine &&
      startsExplicitBodyAfterHeading(nextLine.text.trim())
    ) {
      boundaries.push({
        title: trimmed,
        offset: line.startOffset + line.text.indexOf(trimmed),
        priority: 7,
      });
      continue;
    }

    if (plainTextOcrBoundaryLines.has(index)) {
      boundaries.push({
        title: trimmed,
        offset: line.startOffset + line.text.indexOf(trimmed),
        priority: 7,
      });
    }
  }

  return boundaries;
}

function findPlainTextOcrBoundaryLineIndexes(
  lines: readonly LineSlice[],
): ReadonlySet<number> {
  const candidates = new Set<number>();

  for (const [index, line] of lines.entries()) {
    const trimmed = line.text.trim();
    const nextLine = lines
      .slice(index + 1)
      .find((candidate) => candidate.text.trim().length > 0);

    if (
      trimmed &&
      nextLine &&
      isPlainTextOcrHeadingLine(trimmed) &&
      startsPlainTextOcrBodyLine(nextLine.text.trim())
    ) {
      candidates.add(index);
    }
  }

  return candidates.size >= 2 ? candidates : new Set<number>();
}

function detectInlineBoundaries(
  entry: FlattenedBlock,
): readonly BoundaryCandidate[] {
  if (entry.block.kind === "heading") {
    return [];
  }

  const boundaries: BoundaryCandidate[] = [];
  const markerPattern = /(?:\u2022|â€¢|Ã¢â‚¬Â¢|\b\d{1,2}[.)]\s+)/g;
  let marker = markerPattern.exec(entry.block.text);

  while (marker) {
    const beforeMarker = entry.block.text.slice(
      Math.max(0, marker.index - MAX_INLINE_HEADING_LOOKBACK),
      marker.index,
    );
    const candidate = readInlineHeadingCandidate(beforeMarker);

    if (candidate) {
      boundaries.push({
        title: candidate.title,
        offset:
          entry.startOffset +
          marker.index -
          beforeMarker.length +
          candidate.startOffset,
        priority: 6,
      });
    }

    marker = markerPattern.exec(entry.block.text);
  }

  return boundaries;
}

function readInlineHeadingCandidate(
  textBeforeBodyMarker: string,
): InlineHeadingCandidate | undefined {
  const normalizedText = normalizeSpaces(textBeforeBodyMarker);
  if (!normalizedText) {
    return undefined;
  }

  const startMatches = [
    ...normalizedText.matchAll(
      /\b(?:What|Goal|Domains|Importance|Challenges|Impact|Types|Symptoms|Definition|Methods|Blended|Introduction|Intro)\b/gi,
    ),
  ];
  const startMatch = startMatches.at(-1);
  if (!startMatch || startMatch.index === undefined) {
    return undefined;
  }

  const rawCandidate = normalizedText.slice(startMatch.index).trim();
  const title = trimInlineHeadingCandidate(rawCandidate);
  if (!title || !isInlineHeadingTitle(title)) {
    return undefined;
  }

  const sourceOffset = textBeforeBodyMarker.lastIndexOf(title);
  if (sourceOffset < 0 || isImmediatelyAfterListMarker(textBeforeBodyMarker, sourceOffset)) {
    return undefined;
  }

  return {
    title,
    startOffset: sourceOffset,
  };
}

function trimInlineHeadingCandidate(candidate: string): string | undefined {
  const normalized = candidate
    .replace(/^[\s:;,.!?-]+/, "")
    .replace(/[\s:;,.!-]+$/, "")
    .trim();
  const headingOnly = normalized
    .split(/\s+(?:\u2022|â€¢|Ã¢â‚¬Â¢)\s*/)[0]
    ?.trim();
  const words = (headingOnly ?? "")
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const first = words[0]?.toLowerCase();

  if (!first) {
    return undefined;
  }
  if (first === "blended") {
    return words[1]?.toLowerCase() === "attacks"
      ? preserveWords(words, 2)
      : undefined;
  }
  if (first === "impact" && words[1]?.toLowerCase() === "reduction") {
    return preserveWords(words, 2);
  }
  if (first === "what" && words[1]?.toLowerCase() === "is") {
    const questionIndex = words.findIndex(
      (word, index) => index > 1 && word.endsWith("?"),
    );
    if (questionIndex >= 0) {
      return preserveWords(words, questionIndex + 1);
    }
    const allAboutIndex = words.findIndex(
      (word, index) =>
        index > 1 &&
        word.toLowerCase() === "all" &&
        words[index + 1]?.toLowerCase().replace(/\?$/, "") === "about",
    );
    if (allAboutIndex >= 0) {
      return preserveWords(words, allAboutIndex + 2).replace(/\?*$/, "?");
    }
    return preserveWords(words, Math.min(words.length, 4));
  }
  if (
    (first === "goal" ||
      first === "domains" ||
      first === "importance" ||
      first === "challenges" ||
      first === "symptoms" ||
      first === "definition") &&
    words[1]?.toLowerCase() === "of"
  ) {
    const wordCount = first === "goal" || first === "domains" ? 4 : 3;
    return preserveWords(words, Math.min(words.length, wordCount));
  }
  if (first === "impact" && words[1]?.toLowerCase() === "of") {
    const hasArticle = /^(?:a|an|the)$/i.test(words[2] ?? "");
    return preserveWords(words, Math.min(words.length, hasArticle ? 6 : 5));
  }
  if (first === "types" && words[1]?.toLowerCase() === "of") {
    const remaining = words.slice(2);
    if (remaining.length === 0) {
      return undefined;
    }
    const count = remaining[0]?.toLowerCase() === "cybersecurity" ? 2 : 1;
    return preserveWords(words, 2 + Math.min(count, remaining.length));
  }
  if (
    first === "methods" &&
    (words[1]?.toLowerCase() === "of" || words[1]?.toLowerCase() === "to")
  ) {
    return preserveWords(words, Math.min(words.length, 4));
  }
  if (first === "introduction" || first === "intro") {
    return undefined;
  }

  return undefined;
}

function preserveWords(words: readonly string[], count: number): string {
  return words.slice(0, count).join(" ").replace(/\s+\?/g, "?").trim();
}

function isInlineHeadingTitle(title: string): boolean {
  const words = title.split(/\s+/).filter((word) => word.length > 0);

  return (
    title.length >= 3 &&
    title.length <= 90 &&
    words.length >= 2 &&
    words.length <= 8 &&
    /[A-Za-z]/.test(title) &&
    !/[.!]$/.test(title)
  );
}

function isImmediatelyAfterListMarker(text: string, offset: number): boolean {
  const before = text.slice(Math.max(0, offset - 8), offset);
  return /(?:\u2022|â€¢|Ã¢â‚¬Â¢|\b\d{1,2}[.)]\s*)\s*$/.test(before);
}

function cleanBoundaries(
  candidates: readonly BoundaryCandidate[],
): readonly BoundaryCandidate[] {
  const sorted = [...candidates]
    .filter((candidate) => candidate.title.trim().length > 0)
    .sort(
      (left, right) =>
        left.offset - right.offset ||
        right.priority - left.priority ||
        right.title.length - left.title.length,
    );
  const cleaned: BoundaryCandidate[] = [];

  for (const candidate of sorted) {
    const previous = cleaned.at(-1);
    if (
      previous &&
      Math.abs(previous.offset - candidate.offset) <= 2
    ) {
      continue;
    }
    if (
      previous &&
      candidate.offset > previous.offset &&
      candidate.offset < previous.offset + previous.title.length
    ) {
      continue;
    }

    cleaned.push({
      ...candidate,
      title: normalizeTitle(candidate.title),
    });
  }

  return cleaned;
}

function createDraftsFromBoundaries(args: {
  readonly source: NormalizedSource;
  readonly flattenedBlocks: readonly FlattenedBlock[];
  readonly boundaries: readonly BoundaryCandidate[];
}): readonly SectionDraft[] {
  const documentStart = args.flattenedBlocks[0]?.startOffset ?? 0;
  const documentEnd = args.flattenedBlocks.at(-1)?.endOffset ?? 0;
  const boundaries = args.boundaries.filter(
    (boundary) =>
      boundary.offset >= documentStart && boundary.offset < documentEnd,
  );

  if (boundaries.length === 0) {
    return [
      createDraft({
        title: args.source.title || "Untitled Source",
        flattenedBlocks: args.flattenedBlocks,
        startOffset: documentStart,
        endOffset: documentEnd,
        headingBased: false,
        inferred: true,
      }),
    ].filter(isDefined);
  }

  const drafts: SectionDraft[] = [];
  const firstBoundary = boundaries[0];
  if (firstBoundary && firstBoundary.offset > documentStart) {
    const preface = createDraft({
      title: "Introduction",
      flattenedBlocks: args.flattenedBlocks,
      startOffset: documentStart,
      endOffset: firstBoundary.offset,
      headingBased: false,
      inferred: true,
    });
    if (preface && hasMeaningfulContent(fragmentText(preface.fragments))) {
      drafts.push(preface);
    }
  }

  for (const [index, boundary] of boundaries.entries()) {
    const nextBoundary = boundaries[index + 1];
    const draft = createDraft({
      title: boundary.title,
      flattenedBlocks: args.flattenedBlocks,
      startOffset: boundary.offset,
      endOffset: nextBoundary?.offset ?? documentEnd,
      headingBased: true,
      inferred: false,
    });

    if (draft) {
      drafts.push(draft);
    }
  }

  return drafts;
}

function createDraft(args: {
  readonly title: string;
  readonly flattenedBlocks: readonly FlattenedBlock[];
  readonly startOffset: number;
  readonly endOffset: number;
  readonly headingBased: boolean;
  readonly inferred: boolean;
}): SectionDraft | undefined {
  const fragments = extractFragments(
    args.flattenedBlocks,
    args.startOffset,
    args.endOffset,
  );

  if (fragments.length === 0) {
    return undefined;
  }

  return {
    title: args.title,
    fragments,
    headingBased: args.headingBased,
    inferred: args.inferred,
    startOffset: args.startOffset,
    endOffset: args.endOffset,
  };
}

function extractFragments(
  flattenedBlocks: readonly FlattenedBlock[],
  startOffset: number,
  endOffset: number,
): readonly SectionFragment[] {
  const fragments: SectionFragment[] = [];

  for (const entry of flattenedBlocks) {
    const start = Math.max(startOffset, entry.startOffset);
    const end = Math.min(endOffset, entry.endOffset);

    if (start >= end) {
      continue;
    }

    const localStart = start - entry.startOffset;
    const localEnd = end - entry.startOffset;
    const text = entry.block.text.slice(localStart, localEnd).trim();
    if (!text) {
      continue;
    }

    fragments.push({
      block: entry.block,
      kind: entry.block.kind,
      text,
      startOffset: start,
      endOffset: end,
    });
  }

  return fragments;
}

function mergeRepeatedDrafts(
  drafts: readonly SectionDraft[],
): readonly SectionDraft[] {
  const merged: SectionDraft[] = [];
  let previousKey = "";

  for (const draft of drafts) {
    const key = normalizeTitleKey(draft.title);
    const previous = merged.at(-1);

    if (previous && key && key === previousKey) {
      merged[merged.length - 1] = {
        ...previous,
        fragments: [...previous.fragments, ...draft.fragments],
        endOffset: draft.endOffset,
        inferred: previous.inferred && draft.inferred,
      };
      continue;
    }

    merged.push(draft);
    previousKey = key;
  }

  return disambiguateNonContiguousRepeats(merged);
}

function disambiguateNonContiguousRepeats(
  drafts: readonly SectionDraft[],
): readonly SectionDraft[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const draft of drafts) {
    const key = normalizeTitleKey(draft.title);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }

  return drafts.map((draft) => {
    const key = normalizeTitleKey(draft.title);
    const total = totals.get(key) ?? 0;
    if (total <= 1) {
      return draft;
    }

    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return {
      ...draft,
      title: `${draft.title} ${count}`,
    };
  });
}

function createOutlineSection(
  sourceId: string,
  draft: SectionDraft,
  order: number,
): SourceOutlineSection {
  const firstFragment = draft.fragments[0];
  const lastFragment = draft.fragments.at(-1);

  if (!firstFragment || !lastFragment) {
    throw new Error("Outline section requires at least one source fragment.");
  }

  const sourceBlockIds = uniqueInOrder(
    draft.fragments.map((fragment) => fragment.block.id),
  );
  const tokenWeight = countTokens(fragmentText(draft.fragments));

  return {
    id: stableId(
      `${sourceId}-section`,
      [
        order,
        draft.title,
        draft.startOffset,
        draft.endOffset,
        ...sourceBlockIds,
      ].join("\u001f"),
    ),
    title: draft.title,
    order,
    startOffset: draft.startOffset,
    endOffset: draft.endOffset,
    tokenWeight,
    sourceBlockIds,
    blockIds: sourceBlockIds,
    roughStartBlockId: firstFragment.block.id,
    roughEndBlockId: lastFragment.block.id,
    tags: detectContentTags(draft.fragments),
    confidence: calculateConfidence(draft),
    ...(draft.inferred ? { inferred: true } : {}),
  };
}

function detectContentTags(
  fragments: readonly SectionFragment[],
): readonly SectionContentTag[] {
  const contentFragments = fragments.filter(
    (fragment) => fragment.kind !== "heading",
  );
  const text = fragmentText(contentFragments).trim();

  if (!hasMeaningfulContent(text)) {
    return ["unknown"];
  }

  const signals: SectionContentTag[] = [];
  const hasNumberedList = contentFragments.some((fragment) =>
    /(?:^|\s)\d+[.)]\s+\S/.test(fragment.text),
  );

  if (hasNumberedList || PROCESS_PATTERN.test(text)) {
    signals.push("process");
  }
  if (EXAMPLE_PATTERN.test(text)) {
    signals.push("example");
  }
  if (CLAIM_PATTERN.test(text)) {
    signals.push("claim");
  }
  if (DEFINITION_PATTERN.test(text)) {
    signals.push("definition");
  }

  if (signals.length > 1) {
    return ["mixed"];
  }
  if (signals.length === 1) {
    return signals;
  }
  if (contentFragments.some((fragment) => fragment.kind === "paragraph")) {
    return ["concept"];
  }

  return ["unknown"];
}

function calculateConfidence(draft: SectionDraft): number {
  const contentText = fragmentText(
    draft.fragments.filter((fragment) => fragment.kind !== "heading"),
  );
  const hasUsableContent = hasMeaningfulContent(contentText);

  if (draft.headingBased && hasUsableContent) {
    return 0.9;
  }
  if (!draft.headingBased && hasUsableContent) {
    return 0.7;
  }
  return 0.5;
}

function splitLines(text: string, baseOffset: number): readonly LineSlice[] {
  const lines: LineSlice[] = [];
  let cursor = 0;

  for (const line of text.split(/\n/)) {
    const startOffset = baseOffset + cursor;
    const endOffset = startOffset + line.length;
    lines.push({ text: line, startOffset, endOffset });
    cursor += line.length + 1;
  }

  return lines;
}

function startsExplicitBodyAfterHeading(line: string): boolean {
  return /^(?:[-*+]\s+|\d+[.)]\s+|(?:\u2022|â€¢|Ã¢â‚¬Â¢)\s*)\S/.test(line);
}

function isShortHeadingLine(line: string): boolean {
  const words = line.split(/\s+/).filter((word) => word.length > 0);
  const letters = line.match(/[A-Za-z]/g) ?? [];
  const capitalizedWords = words.filter((word) =>
    /^(?:[A-Z][A-Za-z0-9()'.?&-]*|IT|IoT|BYOD|SEO|DDoS)$/.test(word),
  );
  const connectorWords = words.filter((word) =>
    /^(?:a|an|and|for|in|is|of|or|the|to|vs\.?|with)$/i.test(word),
  );

  return (
    line.length >= 3 &&
    line.length <= 90 &&
    words.length <= 10 &&
    letters.length >= 2 &&
    !/[.!]$/.test(line) &&
    capitalizedWords.length + connectorWords.length === words.length &&
    capitalizedWords.length >= 1
  );
}

function isPlainTextOcrHeadingLine(line: string): boolean {
  if (
    isMarkdownHeading(line) ||
    startsExplicitBodyAfterHeading(line) ||
    isTableLine(line)
  ) {
    return false;
  }

  const words = line.split(/\s+/).filter((word) => word.length > 0);
  const letters = line.match(/[A-Za-z]/g) ?? [];
  const headingWords = words.filter((word) =>
    /^(?:[A-Z][A-Za-z0-9()'.?&-]*|IT|IoT|BYOD|SEO|DDoS)$/.test(word),
  );
  const connectorWords = words.filter((word) =>
    /^(?:a|an|and|for|in|is|of|or|the|to|vs\.?|with)$/i.test(word),
  );

  return (
    line.length >= 3 &&
    line.length <= 80 &&
    words.length >= 2 &&
    words.length <= 8 &&
    letters.length >= 2 &&
    !/[.!?:;]$/.test(line) &&
    headingWords.length + connectorWords.length === words.length &&
    headingWords.length >= 2
  );
}

function startsPlainTextOcrBodyLine(line: string): boolean {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return false;
  }
  if (startsExplicitBodyAfterHeading(trimmedLine)) {
    return true;
  }
  if (
    isMarkdownHeading(trimmedLine) ||
    isTableLine(trimmedLine) ||
    isPlainTextOcrHeadingLine(trimmedLine)
  ) {
    return false;
  }

  const words =
    trimmedLine.match(/[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*/g) ?? [];
  return /[.!?:;]/.test(trimmedLine) || words.length >= 4;
}

function isMarkdownHeading(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line);
}

function cleanHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").trim();
}

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, " ").replace(/\s+\?/g, "?").trim();
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function isTableLine(line: string): boolean {
  return (line.match(/\|/g)?.length ?? 0) >= 2;
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function fragmentText(fragments: readonly SectionFragment[]): string {
  return fragments.map((fragment) => fragment.text).join("\n");
}

function countTokens(text: string): number {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

function hasMeaningfulContent(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu) ?? []).length >= 3;
}

function uniqueInOrder(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      unique.push(value);
    }
  }

  return unique;
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
