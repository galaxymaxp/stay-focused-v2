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
const FLATTENED_LABEL_MIN_MATCHES = 3;
const FLATTENED_BOUNDARY_GROUPS = [
  {
    sectionTitleKeys: ["attacker", "actor"],
    labels: [
      "Insiders",
      "Internal Users",
      "Employees",
      "Former Employees",
      "Contract Staff",
      "Contract Partners",
      "Trusted Partners",
      "Outsiders",
      "External Groups",
      "Organized Attackers",
      "Cyber Criminals",
      "Hacktivists",
      "Terrorists",
      "State-Sponsored Groups",
      "State-sponsored Hackers",
      "Black Hats",
      "Grey Hats",
      "White Hats",
      "Amateurs",
      "Hobbyists",
      "Untrained Users",
      "Attack Concepts & Techniques",
      "Attacks Concepts & Techniques",
    ],
  },
  {
    sectionTitleKeys: ["infiltration", "entry method", "methods of entry"],
    labels: [
      "Social Engineering",
      "Pretexting",
      "Tailgating",
      "Something for Something",
      "Phishing",
      "Smishing",
      "Vishing",
      "Password Cracking",
      "Brute-force",
      "Network Sniffing",
      "Vulnerability Exploitation",
      "Advanced Persistent Threats",
    ],
  },
] as const;

interface ParsedTableRow {
  readonly cells: readonly string[];
  readonly separator: "pipe" | "spacing";
}

interface BoundaryLabelMatch {
  readonly index: number;
  readonly label: string;
}

export function extractCleanSourceItems(
  args: ExtractCleanSourceItemsArgs,
): readonly SourceItem[] {
  const normalized = normalizeListMarkers(args.sourceSpanText);
  const markerMatches = findExplicitMarkerMatches(
    normalized,
    args.sectionTitle,
  );
  if (markerMatches.length < 2) {
    const tableItems = extractTableRowItems(
      args.sourceSpanText,
      args.sectionTitle,
    );
    if (tableItems.length >= 2) {
      return tableItems;
    }

    const flattenedLabelItems = extractFlattenedLabelItems(
      args.sourceSpanText,
      args.sectionTitle,
    );
    if (flattenedLabelItems.length >= 2) {
      return flattenedLabelItems;
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

function findExplicitMarkerMatches(
  value: string,
  sectionTitle: string,
): readonly RegExpMatchArray[] {
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
      !isInlineOrderedMarkerAfterSectionTitle(value, start, sectionTitle) &&
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
    if (orderedRank !== undefined) {
      previousOrderedRank = orderedRank;
    }
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

function isInlineOrderedMarkerAfterSectionTitle(
  value: string,
  markerStart: number,
  sectionTitle: string,
): boolean {
  const normalizedTitleKey = normalizeCoverageTitleKey(sectionTitle);
  if (normalizedTitleKey.length === 0) {
    return false;
  }

  const prefix = cleanSourceItemText(value.slice(0, markerStart));
  return normalizeCoverageTitleKey(prefix).endsWith(normalizedTitleKey);
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

function extractFlattenedLabelItems(
  sourceSpanText: string,
  sectionTitle: string,
): readonly SourceItem[] {
  const itemTexts = splitFlattenedBoundaryItems(
    cleanSourceItemText(sourceSpanText),
    sectionTitle,
    { requireDescriptions: true },
  );

  return itemTexts.length >= 2
    ? finalizeSourceItems(itemTexts, sectionTitle)
    : [];
}

function splitFlattenedBoundaryItems(
  value: string,
  sectionTitle: string,
  options: { readonly requireDescriptions: boolean },
): readonly string[] {
  const boundaryGroup = findFlattenedBoundaryGroup(sectionTitle);
  if (!boundaryGroup) {
    return [value];
  }

  const matches = findBoundaryLabelMatches(value, boundaryGroup.labels);
  if (matches.length < FLATTENED_LABEL_MIN_MATCHES) {
    return [value];
  }

  const itemTexts = matches
    .map((match, index) =>
      cleanSourceItemText(
        value.slice(match.index, matches[index + 1]?.index ?? value.length),
      ),
    )
    .filter((itemText) => itemText.length > 0);
  const dedupedItemTexts = suppressBareDuplicateBoundaryLabelsForGroup(
    itemTexts,
    boundaryGroup,
  );
  if (
    options.requireDescriptions &&
    dedupedItemTexts.some(
      (itemText) => !hasDescriptionAfterBoundaryLabel(itemText),
    )
  ) {
    return [value];
  }

  return dedupedItemTexts;
}

function findFlattenedBoundaryGroup(
  sectionTitle: string,
): (typeof FLATTENED_BOUNDARY_GROUPS)[number] | undefined {
  const normalizedTitleKey = normalizeCoverageTitleKey(sectionTitle);
  return FLATTENED_BOUNDARY_GROUPS.find((group) =>
    group.sectionTitleKeys.some((key) =>
      normalizedTitleKey.includes(normalizeCoverageTitleKey(key)),
    ),
  );
}

function findBoundaryLabelMatches(
  value: string,
  labels: readonly string[],
): readonly BoundaryLabelMatch[] {
  const lowerValue = value.toLocaleLowerCase();
  const sortedLabels = [...labels].sort(
    (left, right) => right.length - left.length,
  );
  const matches: BoundaryLabelMatch[] = [];

  for (const label of sortedLabels) {
    const lowerLabel = label.toLocaleLowerCase();
    let searchStart = 0;
    while (searchStart < lowerValue.length) {
      const index = lowerValue.indexOf(lowerLabel, searchStart);
      if (index < 0) {
        break;
      }
      const end = index + label.length;
      if (
        isWordBoundary(value[index - 1]) &&
        isWordBoundary(value[end]) &&
        !matches.some((match) =>
          rangesOverlap(
            index,
            end,
            match.index,
            match.index + match.label.length,
          ),
        )
      ) {
        matches.push({ index, label: value.slice(index, end) });
      }
      searchStart = end;
    }
  }

  return matches.sort((left, right) => left.index - right.index);
}

function hasDescriptionAfterBoundaryLabel(itemText: string): boolean {
  const boundaryGroupLabels = FLATTENED_BOUNDARY_GROUPS.flatMap(
    (group) => group.labels,
  );
  const [firstMatch] = findBoundaryLabelMatches(itemText, boundaryGroupLabels);
  if (!firstMatch || firstMatch.index !== 0) {
    return false;
  }

  return (
    countTerms(
      itemText.slice(firstMatch.label.length).replace(/^[\s:;,.!?-]+/, ""),
    ) >= 2
  );
}

function isWordBoundary(value: string | undefined): boolean {
  return value === undefined || !/[A-Za-z0-9]/.test(value);
}

function rangesOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
): boolean {
  return leftStart < rightEnd && rightStart < leftEnd;
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
    .flatMap((itemText) =>
      splitFlattenedBoundaryItems(itemText, sectionTitle, {
        requireDescriptions: false,
      }),
    )
    .map(cleanSourceItemText)
    .filter((itemText) => normalizeCoverageTitleKey(itemText).length > 0);
  const dedupedItems = suppressBareDuplicateBoundaryLabels(
    cleanedItems,
    sectionTitle,
  );
  const filteredItems =
    dedupedItems.length > 1 && normalizedTitleKey.length > 0
      ? dedupedItems.filter(
          (itemText) =>
            normalizeCoverageTitleKey(itemText) !== normalizedTitleKey,
        )
      : dedupedItems;

  return filteredItems.map((text) => ({ text }));
}

function suppressBareDuplicateBoundaryLabels(
  itemTexts: readonly string[],
  sectionTitle: string,
): readonly string[] {
  const boundaryGroup = findFlattenedBoundaryGroup(sectionTitle);
  if (!boundaryGroup || itemTexts.length < 2) {
    return itemTexts;
  }

  return suppressBareDuplicateBoundaryLabelsForGroup(itemTexts, boundaryGroup);
}

function suppressBareDuplicateBoundaryLabelsForGroup(
  itemTexts: readonly string[],
  boundaryGroup: (typeof FLATTENED_BOUNDARY_GROUPS)[number],
): readonly string[] {
  if (itemTexts.length < 2) {
    return itemTexts;
  }

  const informativeLabelKeys = new Set(
    itemTexts.flatMap((itemText) => {
      const match = readLeadingBoundaryLabel(itemText, boundaryGroup.labels);
      if (
        !match ||
        match.index !== 0 ||
        countTerms(stripBoundaryLabel(itemText, match.label)) < 2
      ) {
        return [];
      }

      return [normalizeCoverageTitleKey(match.label)];
    }),
  );
  if (informativeLabelKeys.size === 0) {
    return itemTexts;
  }

  return itemTexts.filter((itemText) => {
    const match = readLeadingBoundaryLabel(itemText, boundaryGroup.labels);
    if (!match || match.index !== 0) {
      return true;
    }

    return (
      !isBareBoundaryLabel(itemText, match.label) ||
      !informativeLabelKeys.has(normalizeCoverageTitleKey(match.label))
    );
  });
}

function readLeadingBoundaryLabel(
  itemText: string,
  labels: readonly string[],
): BoundaryLabelMatch | undefined {
  return findBoundaryLabelMatches(itemText, labels).find(
    (match) => match.index === 0,
  );
}

function isBareBoundaryLabel(itemText: string, label: string): boolean {
  return normalizeCoverageTitleKey(itemText) === normalizeCoverageTitleKey(label);
}

function stripBoundaryLabel(itemText: string, label: string): string {
  return itemText.slice(label.length).replace(/^[\s:;,.!?-]+/, "");
}

function countTerms(value: string): number {
  return [...value.matchAll(/[A-Za-z0-9]+(?:[-/][A-Za-z0-9]+)*/g)].length;
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
