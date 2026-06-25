import { normalizeCoverageTitleKey } from "./stage4-verify.js";

export interface SourceItem {
  readonly text: string;
}

export interface ExtractCleanSourceItemsArgs {
  readonly sourceSpanText: string;
  readonly sectionTitle: string;
}

const ORDERED_MARKER_PATTERN =
  /(?:^|\s)(?:\d{1,3}[.)]\s+|[a-z][.)]\s+)/gi;
const BULLET_GLYPH_PATTERN = /\u2022/g;
const MOJIBAKE_BULLET_GLYPH_PATTERN = /\u00e2\u20ac\u00a2/g;
const LINE_BULLET_MARKER_PATTERN = /(?:^|\n)[ \t]*[-*+]\s+/g;
const INLINE_BULLET_GLYPH_MARKER_PATTERN = /(?:^|\s)\u2022\s*/g;
const INLINE_HYPHEN_SEPARATOR_PATTERN = /\s+-\s+/g;
const MIN_INLINE_HYPHEN_SEGMENTS = 4;
const SPACED_TABLE_COLUMN_SEPARATOR_PATTERN = /[ \t]{2,}/;
const OCR_NOISE_LINE_PATTERNS = [
  /^\s*(?:page|p\.?)\s*\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i,
  /^\s*[-\u2013\u2014]*\s*(?:page|p\.?)\s*\d+\s*[-\u2013\u2014]*\s*$/i,
  /^\s*(?:header|footer)\s*[:\-\u2013\u2014]\s*(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i,
];
const TABLE_HEADER_LABELS = new Set([
  "column",
  "count",
  "definition",
  "description",
  "example",
  "example value",
  "item",
  "label",
  "meaning",
  "status",
  "term",
  "value",
]);

interface ParsedTableRow {
  readonly cells: readonly string[];
  readonly separator: "pipe" | "spacing";
}

export function extractCleanSourceItems(
  args: ExtractCleanSourceItemsArgs,
): readonly SourceItem[] {
  const normalized = normalizeListMarkers(args.sourceSpanText);
  const markerMatches = findExplicitMarkerMatches(normalized);
  if (markerMatches.length < 2) {
    const tableItems = extractTableRowItems(
      args.sourceSpanText,
      args.sectionTitle,
    );
    if (tableItems.length >= 2) {
      return tableItems;
    }

    const inlineHyphenItems = extractInlineHyphenItems(
      args.sourceSpanText,
      args.sectionTitle,
    );
    return inlineHyphenItems.length >= 2 ? inlineHyphenItems : [];
  }

  const itemTexts: string[] = [];
  for (let index = 0; index < markerMatches.length; index += 1) {
    const match = markerMatches[index];
    const nextMatch = markerMatches[index + 1];
    if (!match || match.index === undefined) {
      continue;
    }

    const itemStart = match.index + match[0].length;
    const itemEnd = nextMatch?.index ?? normalized.length;
    const rawItemText = cleanSourceItemText(
      normalized.slice(itemStart, itemEnd),
    );
    itemTexts.push(rawItemText);
  }

  return finalizeSourceItems(itemTexts, args.sectionTitle);
}

function normalizeListMarkers(value: string): string {
  return value
    .replace(MOJIBAKE_BULLET_GLYPH_PATTERN, "\u2022")
    .replace(BULLET_GLYPH_PATTERN, " \u2022 ")
    .trim();
}

function findExplicitMarkerMatches(value: string): readonly RegExpMatchArray[] {
  const sortedMatches = [
    ...value.matchAll(LINE_BULLET_MARKER_PATTERN),
    ...value.matchAll(INLINE_BULLET_GLYPH_MARKER_PATTERN),
    ...value.matchAll(ORDERED_MARKER_PATTERN),
  ]
    .filter((match, index, matches) =>
      match.index === undefined
        ? false
        : matches.findIndex(
            (candidate) => candidate.index === match.index,
          ) === index,
    )
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0));

  const markerMatches: RegExpMatchArray[] = [];
  let previousMarkerEnd = -1;
  let previousOrderedRank: number | undefined;
  for (const match of sortedMatches) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start < previousMarkerEnd) {
      continue;
    }
    const orderedRank = readOrderedMarkerRank(match);
    if (
      orderedRank !== undefined &&
      isInlineOrderedMarker(value, match) &&
      !isOrderedSequenceContinuation(
        value,
        start,
        orderedRank,
        previousOrderedRank,
      )
    ) {
      continue;
    }

    markerMatches.push(match);
    previousMarkerEnd = end;
    previousOrderedRank = orderedRank;
  }

  return markerMatches;
}

function readOrderedMarkerRank(match: RegExpMatchArray): number | undefined {
  const marker = /^(\d{1,3}|[a-z])[.)]/i.exec(match[0].trim())?.[1];
  if (marker === undefined) {
    return undefined;
  }

  const numericRank = Number(marker);
  if (Number.isInteger(numericRank)) {
    return numericRank;
  }

  return marker.toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
}

function isInlineOrderedMarker(
  value: string,
  match: RegExpMatchArray,
): boolean {
  const start = match.index ?? 0;
  return start > 0 && !match[0].startsWith("\n") && value[start - 1] !== "\n";
}

function isOrderedSequenceContinuation(
  value: string,
  markerStart: number,
  orderedRank: number,
  previousOrderedRank: number | undefined,
): boolean {
  const previousChar = value[markerStart - 1];
  if (previousChar === ":" || previousChar === ";") {
    return true;
  }

  return (
    previousOrderedRank !== undefined &&
    orderedRank > previousOrderedRank &&
    orderedRank <= previousOrderedRank + 2
  );
}

function extractTableRowItems(
  sourceSpanText: string,
  sectionTitle: string,
): readonly SourceItem[] {
  const rows = sourceSpanText
    .split(/\r?\n/)
    .map(parseTableRow)
    .filter((row): row is ParsedTableRow => row !== undefined);
  if (rows.length < 2) {
    return [];
  }

  const dataRows = isHeaderRow(
    rows[0]?.cells,
    rows.slice(1).map((row) => row.cells),
  )
    ? rows.slice(1)
    : rows;
  if (
    dataRows.some((row) => row.separator === "spacing") &&
    dataRows.length === rows.length
  ) {
    return [];
  }

  return finalizeSourceItems(
    dataRows.map((row) => row.cells.join(" | ")),
    sectionTitle,
  );
}

function parseTableRow(line: string): ParsedTableRow | undefined {
  return parsePipeTableRow(line) ?? parseSpacedTableRow(line);
}

function parsePipeTableRow(line: string): ParsedTableRow | undefined {
  const trimmed = line.trim();
  if ((trimmed.match(/\|/g)?.length ?? 0) < 2) {
    return undefined;
  }

  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  if (
    cells.length < 2 ||
    cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  ) {
    return undefined;
  }

  return { cells, separator: "pipe" };
}

function parseSpacedTableRow(line: string): ParsedTableRow | undefined {
  const trimmed = line.trim();
  if (
    trimmed.length === 0 ||
    isOcrNoiseLine(trimmed) ||
    !SPACED_TABLE_COLUMN_SEPARATOR_PATTERN.test(trimmed)
  ) {
    return undefined;
  }

  const cells = trimmed
    .split(SPACED_TABLE_COLUMN_SEPARATOR_PATTERN)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  if (cells.length < 2) {
    return undefined;
  }

  return { cells, separator: "spacing" };
}

function isHeaderRow(
  firstRow: readonly string[] | undefined,
  remainingRows: readonly (readonly string[])[],
): boolean {
  return (
    firstRow !== undefined &&
    remainingRows.length > 0 &&
    firstRow.every((cell) =>
      TABLE_HEADER_LABELS.has(cleanSourceItemText(cell).toLowerCase()),
    )
  );
}

function extractInlineHyphenItems(
  sourceSpanText: string,
  sectionTitle: string,
): readonly SourceItem[] {
  const segments = sourceSpanText
    .split(INLINE_HYPHEN_SEPARATOR_PATTERN)
    .map(cleanSourceItemText)
    .filter((segment) => segment.length > 0);
  if (segments.length < MIN_INLINE_HYPHEN_SEGMENTS) {
    return [];
  }

  const itemTexts: string[] = [];
  for (const segment of segments.slice(1)) {
    const previousItem = itemTexts[itemTexts.length - 1];
    if (
      previousItem !== undefined &&
      shouldJoinHyphenContinuation(previousItem, segment)
    ) {
      itemTexts[itemTexts.length - 1] = `${previousItem} - ${segment}`;
      continue;
    }
    itemTexts.push(segment);
  }

  return finalizeSourceItems(itemTexts, sectionTitle);
}

function shouldJoinHyphenContinuation(
  previousItem: string,
  segment: string,
): boolean {
  const normalizedSegment = normalizeCoverageTitleKey(segment);
  return (
    normalizedSegment === "basics" &&
    normalizeCoverageTitleKey(previousItem).length > 0
  );
}

function cleanSourceItemText(value: string): string {
  return value
    .split(/\r?\n/)
    .filter((line) => !isOcrNoiseLine(line))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function isOcrNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length > 0 &&
    OCR_NOISE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))
  );
}

function finalizeSourceItems(
  itemTexts: readonly string[],
  sectionTitle: string,
): readonly SourceItem[] {
  const normalizedTitleKey = normalizeCoverageTitleKey(sectionTitle);
  const cleanedItems = itemTexts
    .map((itemText) =>
      stripTrailingRepeatedSectionTitle(itemText, sectionTitle),
    )
    .map(cleanSourceItemText)
    .filter((itemText) => normalizeCoverageTitleKey(itemText).length > 0);
  const filteredItems =
    cleanedItems.length > 1 && normalizedTitleKey.length > 0
      ? cleanedItems.filter(
          (itemText) =>
            normalizeCoverageTitleKey(itemText) !== normalizedTitleKey,
        )
      : cleanedItems;

  return filteredItems.map((text) => ({ text }));
}

function stripTrailingRepeatedSectionTitle(
  itemText: string,
  sectionTitle: string,
): string {
  const normalizedTitleKey = normalizeCoverageTitleKey(sectionTitle);
  if (!itemText || !normalizedTitleKey) {
    return itemText;
  }

  // Repeated headings can be fused onto the final item when source slides/lists repeat titles.
  // Clean before grounding and before passing detected items into Stage 3, or the model will
  // faithfully copy polluted items such as "Scareware Types of Malware".
  let cleaned = itemText;
  while (true) {
    const suffixStart = cleaned
      .toLocaleLowerCase()
      .lastIndexOf(sectionTitle.toLocaleLowerCase());
    if (suffixStart <= 0) {
      return cleaned;
    }

    const suffix = cleaned
      .slice(suffixStart)
      .replace(/[\s:;,.!?-]+$/, "");
    const prefix = cleaned.slice(0, suffixStart).trim();
    if (
      normalizeCoverageTitleKey(suffix) !== normalizedTitleKey ||
      normalizeCoverageTitleKey(prefix).length === 0
    ) {
      return cleaned;
    }
    cleaned = prefix;
  }
}
