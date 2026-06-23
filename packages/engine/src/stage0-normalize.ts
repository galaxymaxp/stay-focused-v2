import type {
  MetadataValue,
  NormalizedSource,
  NormalizedSourceBlock,
  NormalizedSourceKind,
  NormalizedSourceMetadata,
  SourceBlockKind,
  SourceNormalizationBlockInput,
  SourceNormalizationInput,
} from "./types";

interface DraftBlock {
  readonly id?: string;
  readonly kind: SourceBlockKind;
  readonly text: string;
  readonly pageNumber?: number;
  readonly sectionHint?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

interface TableOfContentsSignal {
  readonly startIndex: number;
  readonly bodyStartIndex: number;
  readonly items: readonly string[];
}

interface InlineSectionMarker {
  readonly index: number;
  readonly text: string;
  readonly priority: number;
}

interface WordToken {
  readonly text: string;
  readonly index: number;
}

const SOURCE_KINDS: readonly NormalizedSourceKind[] = [
  "document",
  "presentation",
  "webpage",
  "plain-text",
  "unknown",
];

const BLOCK_KINDS: readonly SourceBlockKind[] = [
  "heading",
  "paragraph",
  "list",
  "table",
  "code",
  "quote",
  "unknown",
];

const UNSAFE_METADATA_KEY =
  /(access.?token|authorization|cookie|password|secret|raw|file|blob|buffer|supabase|canvas|ocr|provider|response)/i;

export async function normalizeSource(
  input: SourceNormalizationInput,
): Promise<NormalizedSource> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Source normalization input is required.");
  }

  if (input.text === undefined && input.blocks === undefined) {
    throw new Error("Source normalization input must include text or blocks.");
  }

  if (input.text !== undefined && typeof input.text !== "string") {
    throw new Error("Source normalization text must be a string.");
  }

  if (input.blocks !== undefined && !Array.isArray(input.blocks)) {
    throw new Error("Source normalization blocks must be an array.");
  }

  const normalizedText = normalizeExtractedText(input.text ?? "");
  const inputBlocks = input.blocks ?? [];

  if (normalizedText.length === 0 && inputBlocks.length === 0) {
    throw new Error(
      "Source normalization requires non-empty text or at least one block.",
    );
  }

  const textBlocks = normalizedText ? detectTextBlocks(normalizedText) : [];
  const suppliedBlocks = normalizeSuppliedBlocks(inputBlocks);
  const draftBlocks = [...textBlocks, ...suppliedBlocks];

  if (draftBlocks.length === 0) {
    throw new Error(
      "Source normalization requires non-empty text or at least one block.",
    );
  }

  const title = readSafeString(input.title) ?? inferTitle(draftBlocks);
  const language = readSafeString(input.language) ?? "und";
  const kind = isSourceKind(input.kind)
    ? input.kind
    : normalizedText
      ? "plain-text"
      : "unknown";
  const metadata = sanitizeMetadata(input.metadata);
  const createdAt =
    readSafeString(input.createdAt) ??
    metadata.originalCreatedAt ??
    readMetadataAttributeString(metadata, "createdAt") ??
    new Date().toISOString();
  const sourceId =
    readSafeString(input.id) ??
    stableId(
      "source",
      [
        title,
        kind,
        language,
        ...draftBlocks.map((block) => `${block.kind}:${block.text}`),
      ].join("\u001f"),
    );
  const blocks = draftBlocks.map((block, order) =>
    finalizeBlock(block, sourceId, order),
  );

  return {
    id: sourceId,
    title,
    kind,
    language,
    metadata,
    blocks,
    createdAt,
  };
}

export function sanitizeMetadata(metadata: unknown): NormalizedSourceMetadata {
  if (!isRecord(metadata)) {
    return {};
  }

  const sourceName = readSafeString(metadata.sourceName);
  const author = readSafeString(metadata.author);
  const mimeType = readSafeString(metadata.mimeType);
  const pageCount = readNonNegativeNumber(metadata.pageCount);
  const originalCreatedAt = readSafeString(metadata.originalCreatedAt);
  const originalUpdatedAt = readSafeString(metadata.originalUpdatedAt);
  const attributes: Record<string, MetadataValue> = {
    ...sanitizeScalarRecord(metadata.attributes),
  };
  const knownKeys = new Set([
    "sourceName",
    "author",
    "mimeType",
    "pageCount",
    "originalCreatedAt",
    "originalUpdatedAt",
    "attributes",
  ]);

  for (const [key, value] of Object.entries(metadata)) {
    if (!knownKeys.has(key) && isSafeMetadataKey(key) && isMetadataValue(value)) {
      attributes[key] = value;
    }
  }

  return {
    ...(sourceName ? { sourceName } : {}),
    ...(author ? { author } : {}),
    ...(mimeType ? { mimeType } : {}),
    ...(pageCount !== undefined ? { pageCount } : {}),
    ...(originalCreatedAt ? { originalCreatedAt } : {}),
    ...(originalUpdatedAt ? { originalUpdatedAt } : {}),
    ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
  };
}

function normalizeExtractedText(text: string): string {
  const trimmed = text.replace(/\r\n?/g, "\n").trim();

  if (!trimmed) {
    return "";
  }

  const lines = trimmed.split("\n");
  const normalizedLines: string[] = [];
  let insideCodeFence = false;
  let previousLineWasBlank = false;

  for (const line of lines) {
    const isFence = /^\s*```/.test(line);

    if (isFence) {
      normalizedLines.push(line.trimEnd());
      insideCodeFence = !insideCodeFence;
      previousLineWasBlank = false;
      continue;
    }

    if (!insideCodeFence && line.trim().length === 0) {
      if (!previousLineWasBlank) {
        normalizedLines.push("");
      }
      previousLineWasBlank = true;
      continue;
    }

    normalizedLines.push(line.trimEnd());
    previousLineWasBlank = false;
  }

  while (normalizedLines.at(-1) === "") {
    normalizedLines.pop();
  }

  return normalizedLines.join("\n");
}

function detectTextBlocks(text: string): DraftBlock[] {
  const collapsedBlocks = splitCollapsedPlainTextIntoBlocks(text);

  if (collapsedBlocks.length > 0) {
    return collapsedBlocks;
  }

  const blocks: DraftBlock[] = [];
  const activeLines: string[] = [];
  let activeKind: SourceBlockKind | undefined;
  let codeLines: string[] = [];
  let insideCodeFence = false;

  const flushActiveBlock = (): void => {
    if (!activeKind || activeLines.length === 0) {
      return;
    }

    blocks.push({
      kind: activeKind,
      text: activeLines.join("\n").trim(),
    });
    activeLines.length = 0;
    activeKind = undefined;
  };

  const appendLine = (kind: SourceBlockKind, line: string): void => {
    if (activeKind !== kind) {
      flushActiveBlock();
      activeKind = kind;
    }
    activeLines.push(line);
  };

  for (const line of text.split("\n")) {
    const trimmedLine = line.trim();

    if (insideCodeFence) {
      codeLines.push(line);
      if (/^\s*```/.test(line)) {
        blocks.push({ kind: "code", text: codeLines.join("\n").trim() });
        codeLines = [];
        insideCodeFence = false;
      }
      continue;
    }

    if (/^\s*```/.test(line)) {
      flushActiveBlock();
      codeLines = [line];
      insideCodeFence = true;
      continue;
    }

    if (!trimmedLine) {
      flushActiveBlock();
      continue;
    }

    if (isMarkdownHeading(trimmedLine)) {
      flushActiveBlock();
      blocks.push({ kind: "heading", text: cleanHeading(trimmedLine) });
      continue;
    }

    if (isListLine(trimmedLine)) {
      appendLine("list", trimmedLine);
      continue;
    }

    if (isQuoteLine(trimmedLine)) {
      appendLine("quote", trimmedLine);
      continue;
    }

    if (isTableLine(trimmedLine)) {
      appendLine("table", trimmedLine);
      continue;
    }

    if (isReasonableAllCapsHeading(trimmedLine)) {
      flushActiveBlock();
      blocks.push({ kind: "heading", text: trimmedLine });
      continue;
    }

    appendLine("paragraph", trimmedLine);
  }

  flushActiveBlock();

  if (codeLines.length > 0) {
    blocks.push({ kind: "code", text: codeLines.join("\n").trim() });
  }

  return blocks;
}

function splitCollapsedPlainTextIntoBlocks(text: string): DraftBlock[] {
  const line = readSingleCollapsedLine(text);

  if (!line) {
    return [];
  }

  const tableOfContents = detectTableOfContentsSignal(line);
  const markers = detectInlineSectionMarkers(line, tableOfContents);

  if (!shouldSplitCollapsedText(line, tableOfContents, markers)) {
    return [];
  }

  const bodyStartIndex = tableOfContents?.bodyStartIndex ?? 0;
  const blocks: DraftBlock[] = [];
  const prefaceEndIndex = tableOfContents?.startIndex ?? markers[0]?.index ?? 0;
  const prefaceText = line.slice(0, prefaceEndIndex);

  appendCollapsedContentBlock(blocks, prefaceText);

  if (tableOfContents && tableOfContents.items.length > 0) {
    blocks.push({
      kind: "list",
      text: tableOfContents.items.map((item) => `- ${item}`).join("\n"),
      sectionHint: "Table of Contents",
    });
  }

  let cursor = bodyStartIndex;

  for (const marker of markers) {
    if (marker.index < cursor) {
      continue;
    }

    appendCollapsedContentBlock(blocks, line.slice(cursor, marker.index));
    blocks.push({
      kind: "heading",
      text: marker.text,
    });
    cursor = marker.index + marker.text.length;
  }

  appendCollapsedContentBlock(blocks, line.slice(cursor));

  return blocks.length > 1 ? blocks : [];
}

function readSingleCollapsedLine(text: string): string | undefined {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const line = lines[0];

  if (lines.length !== 1 || !line || line.length < 300) {
    return undefined;
  }
  if (/^\s*```/.test(line)) {
    return undefined;
  }

  return line;
}

function detectTableOfContentsSignal(
  line: string,
): TableOfContentsSignal | undefined {
  const tocMatch = /table\s+of\s+contents/i.exec(line);

  if (!tocMatch) {
    return undefined;
  }

  const bulletMatches = findBulletMatches(
    line,
    tocMatch.index + tocMatch[0].length,
  );
  const items: string[] = [];
  let firstItem: string | undefined;
  let bodyStartIndex = line.length;

  for (const [index, bullet] of bulletMatches.entries()) {
    const segmentStart = bullet.index + bullet.text.length;
    const segmentEnd = bulletMatches[index + 1]?.index ?? line.length;
    const rawSegment = line.slice(segmentStart, segmentEnd);
    const bodyOffset =
      firstItem !== undefined
        ? rawSegment.search(new RegExp(`\\s+${escapeRegExp(firstItem)}\\b`))
        : -1;
    const itemText = normalizeInlineWhitespace(
      rawSegment.slice(0, bodyOffset >= 0 ? bodyOffset : undefined),
    );

    if (!isLikelyTableOfContentsItem(itemText)) {
      continue;
    }

    items.push(itemText);
    firstItem = firstItem ?? itemText;

    if (bodyOffset >= 0) {
      bodyStartIndex = segmentStart + bodyOffset;
      break;
    }
  }

  if (items.length < 2 || bodyStartIndex >= line.length) {
    return undefined;
  }

  return {
    startIndex: tocMatch.index,
    bodyStartIndex,
    items,
  };
}

function findBulletMatches(
  line: string,
  startIndex: number,
): readonly { readonly index: number; readonly text: string }[] {
  const bulletPattern = /(?:\u2022|â€¢)/g;
  const matches: { index: number; text: string }[] = [];
  bulletPattern.lastIndex = startIndex;

  let match = bulletPattern.exec(line);
  while (match) {
    matches.push({
      index: match.index,
      text: match[0],
    });
    match = bulletPattern.exec(line);
  }

  return matches;
}

function isLikelyTableOfContentsItem(text: string): boolean {
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  return (
    text.length >= 3 &&
    text.length <= 90 &&
    words.length <= 8 &&
    /[A-Za-z]/.test(text) &&
    !/[.!?]$/.test(text)
  );
}

function detectInlineSectionMarkers(
  line: string,
  tableOfContents: TableOfContentsSignal | undefined,
): readonly InlineSectionMarker[] {
  const searchStart = tableOfContents?.bodyStartIndex ?? 0;
  const markers = [
    ...detectTableOfContentsBodyMarkers(line, tableOfContents),
    ...detectRepeatedTitleMarkers(line, searchStart),
    ...detectFunctionLabelMarkers(line, searchStart),
    ...detectReferenceMarkers(line, searchStart),
  ];

  return cleanInlineSectionMarkers(line, markers, searchStart);
}

function detectTableOfContentsBodyMarkers(
  line: string,
  tableOfContents: TableOfContentsSignal | undefined,
): readonly InlineSectionMarker[] {
  if (!tableOfContents) {
    return [];
  }

  return tableOfContents.items
    .map((item) => ({
      item,
      index: line.indexOf(item, tableOfContents.bodyStartIndex),
    }))
    .filter((entry) => entry.index >= tableOfContents.bodyStartIndex)
    .map((entry) => ({
      index: entry.index,
      text: entry.item,
      priority: 4,
    }));
}

function detectRepeatedTitleMarkers(
  line: string,
  searchStart: number,
): readonly InlineSectionMarker[] {
  const body = line.slice(searchStart);
  const tokens = tokenizeWords(body, searchStart);
  const candidates = new Map<string, number>();

  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = 2; length <= 5; length += 1) {
      const phraseTokens = tokens.slice(start, start + length);

      if (phraseTokens.length !== length) {
        continue;
      }

      const phrase = phraseTokens.map((token) => token.text).join(" ");
      if (
        isPotentialInlineHeadingPhrase(phraseTokens) &&
        isStrongRepeatedTitleCandidate(body, phraseTokens, phrase)
      ) {
        candidates.set(phrase, countOccurrences(body, phrase));
      }
    }
  }

  const markers: InlineSectionMarker[] = [];
  for (const [phrase, count] of candidates.entries()) {
    if (count < 2) {
      continue;
    }

    let index = line.indexOf(phrase, searchStart);
    while (index >= searchStart) {
      if (isRepeatedTitleMarkerOccurrence(line, index, searchStart)) {
        markers.push({
          index,
          text: phrase,
          priority: 2,
        });
      }
      index = line.indexOf(phrase, index + phrase.length);
    }
  }

  return markers;
}

function tokenizeWords(text: string, offset: number): readonly WordToken[] {
  const wordPattern = /[A-Za-z][A-Za-z0-9']*\.?/g;
  const tokens: WordToken[] = [];
  let match = wordPattern.exec(text);

  while (match) {
    tokens.push({
      text: match[0],
      index: offset + match.index,
    });
    match = wordPattern.exec(text);
  }

  return tokens;
}

function isPotentialInlineHeadingPhrase(
  tokens: readonly WordToken[],
): boolean {
  const firstToken = tokens[0]?.text ?? "";
  const lastToken = tokens.at(-1)?.text ?? "";
  const capitalizedCount = tokens.filter((token) =>
    /^[A-Z][A-Za-z0-9']*\.?$/.test(token.text),
  ).length;
  const connectorCount = tokens.filter((token) =>
    isHeadingConnector(token.text),
  ).length;

  return (
    tokens.length >= 2 &&
    tokens.length <= 5 &&
    /^[A-Z]/.test(firstToken) &&
    !isHeadingConnector(lastToken) &&
    capitalizedCount >= 2 &&
    capitalizedCount + connectorCount === tokens.length &&
    tokens.map((token) => token.text).join(" ").length <= 70
  );
}

function isStrongRepeatedTitleCandidate(
  body: string,
  tokens: readonly WordToken[],
  phrase: string,
): boolean {
  const significantTokens = tokens.filter(
    (token) => !isHeadingConnector(token.text),
  );
  const allSignificantTokensAreAcronyms = significantTokens.every(
    (token) => token.text === token.text.toUpperCase(),
  );
  const hasImmediateRepeat = body.includes(`${phrase} ${phrase}`);
  const hasSpecificMultiwordShape = significantTokens.length >= 3;

  return (
    !allSignificantTokensAreAcronyms &&
    (hasImmediateRepeat || hasSpecificMultiwordShape)
  );
}

function isRepeatedTitleMarkerOccurrence(
  line: string,
  index: number,
  searchStart: number,
): boolean {
  if (index <= searchStart) {
    return true;
  }

  const previousCharacter = previousNonWhitespaceCharacter(line, index);
  return previousCharacter !== "\u2022" && previousCharacter !== "•";
}

function previousNonWhitespaceCharacter(
  text: string,
  index: number,
): string | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const character = text[cursor];

    if (character && !/\s/.test(character)) {
      return character;
    }
  }

  return undefined;
}

function isHeadingConnector(token: string): boolean {
  return /^(?:a|an|and|for|in|of|or|the|to|vs\.?|with)$/i.test(token);
}

function detectFunctionLabelMarkers(
  line: string,
  searchStart: number,
): readonly InlineSectionMarker[] {
  const markers: InlineSectionMarker[] = [];
  const functionPattern = /\b[a-z][A-Za-z0-9_]*\s*\(\s*\)/g;
  functionPattern.lastIndex = searchStart;

  let match = functionPattern.exec(line);
  while (match) {
    const markerText = normalizeInlineWhitespace(match[0]);
    const followingText = line.slice(
      match.index + match[0].length,
      match.index + match[0].length + 28,
    );

    if (/^\s*(?:Example\s+Code:|(?:\u2022|â€¢))/.test(followingText)) {
      markers.push({
        index: match.index,
        text: markerText,
        priority: 5,
      });
    }

    match = functionPattern.exec(line);
  }

  return markers;
}

function detectReferenceMarkers(
  line: string,
  searchStart: number,
): readonly InlineSectionMarker[] {
  const markers: InlineSectionMarker[] = [];
  const referencePattern = /\bReferences\b/g;
  referencePattern.lastIndex = searchStart;

  let match = referencePattern.exec(line);
  while (match) {
    markers.push({
      index: match.index,
      text: match[0],
      priority: 6,
    });
    match = referencePattern.exec(line);
  }

  return markers;
}

function cleanInlineSectionMarkers(
  line: string,
  markers: readonly InlineSectionMarker[],
  searchStart: number,
): readonly InlineSectionMarker[] {
  const sorted = [...markers]
    .filter((marker) => marker.index >= searchStart)
    .sort(
      (left, right) =>
        left.index - right.index ||
        right.priority - left.priority ||
        right.text.length - left.text.length,
    );
  const deduped: InlineSectionMarker[] = [];

  for (const marker of sorted) {
    const previous = deduped.at(-1);

    if (
      previous &&
      marker.index < previous.index + previous.text.length
    ) {
      continue;
    }

    deduped.push(marker);
  }

  const cleaned: InlineSectionMarker[] = [];

  for (const marker of deduped) {
    const previous = cleaned.at(-1);

    if (previous) {
      const betweenMarkers = line
        .slice(previous.index + previous.text.length, marker.index)
        .trim();
      const markersAreDuplicateOrNested =
        previous.text === marker.text ||
        marker.text.startsWith(`${previous.text} `);

      if (
        markersAreDuplicateOrNested &&
        /^(?:[-:–—]|\s)*$/.test(betweenMarkers)
      ) {
        continue;
      }
    }

    cleaned.push(marker);
  }

  return cleaned;
}

function shouldSplitCollapsedText(
  line: string,
  tableOfContents: TableOfContentsSignal | undefined,
  markers: readonly InlineSectionMarker[],
): boolean {
  const hasTableOfContentsStructure =
    tableOfContents !== undefined &&
    tableOfContents.items.length >= 2 &&
    markers.length >= 2;
  const hasRepeatedAcademicStructure =
    line.length >= 600 && markers.length >= 4;

  return hasTableOfContentsStructure || hasRepeatedAcademicStructure;
}

function appendCollapsedContentBlock(
  blocks: DraftBlock[],
  text: string,
): void {
  const normalizedText = normalizeInlineWhitespace(
    text.replace(/^table\s+of\s+contents\b/i, ""),
  );

  if (!hasMeaningfulInlineContent(normalizedText)) {
    return;
  }

  blocks.push({
    kind: "paragraph",
    text: normalizedText,
  });
}

function hasMeaningfulInlineContent(text: string): boolean {
  return (text.match(/[A-Za-z0-9]/g) ?? []).length >= 3;
}

function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }

  let count = 0;
  let offset = text.indexOf(needle);

  while (offset >= 0) {
    count += 1;
    offset = text.indexOf(needle, offset + needle.length);
  }

  return count;
}

function normalizeSuppliedBlocks(
  blocks: readonly SourceNormalizationBlockInput[],
): DraftBlock[] {
  return blocks
    .map((block, inputIndex) => ({ block, inputIndex }))
    .sort((left, right) => {
      const leftOrder = readFiniteNumber(left.block.order) ?? left.inputIndex;
      const rightOrder = readFiniteNumber(right.block.order) ?? right.inputIndex;
      return leftOrder - rightOrder || left.inputIndex - right.inputIndex;
    })
    .map(({ block, inputIndex }) => normalizeSuppliedBlock(block, inputIndex));
}

function normalizeSuppliedBlock(
  block: SourceNormalizationBlockInput,
  inputIndex: number,
): DraftBlock {
  if (block === null || typeof block !== "object" || Array.isArray(block)) {
    throw new Error(`Source block at index ${inputIndex} must be an object.`);
  }

  if (typeof block.text !== "string") {
    throw new Error(`Source block at index ${inputIndex} must include text.`);
  }

  const text = normalizeExtractedText(block.text);
  if (!text) {
    throw new Error(
      `Source block at index ${inputIndex} has empty text after trimming.`,
    );
  }

  const metadata = sanitizeScalarRecord(block.metadata);
  const pageNumber = readNonNegativeNumber(block.pageNumber);
  const sectionHint = readSafeString(block.sectionHint);
  const id = readSafeString(block.id);
  const kind = isBlockKind(block.kind) ? block.kind : detectStandaloneKind(text);
  const normalizedBlockText =
    kind === "heading" && isMarkdownHeading(text) ? cleanHeading(text) : text;

  return {
    ...(id ? { id } : {}),
    kind,
    text: normalizedBlockText,
    ...(pageNumber !== undefined ? { pageNumber } : {}),
    ...(sectionHint ? { sectionHint } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

function finalizeBlock(
  block: DraftBlock,
  sourceId: string,
  order: number,
): NormalizedSourceBlock {
  return {
    id:
      block.id ??
      stableId(
        `${sourceId}-block`,
        [
          order,
          block.kind,
          block.text,
          block.pageNumber ?? "",
          block.sectionHint ?? "",
        ].join("\u001f"),
      ),
    kind: block.kind,
    text: block.text,
    order,
    ...(block.pageNumber !== undefined
      ? { pageNumber: block.pageNumber }
      : {}),
    ...(block.sectionHint ? { sectionHint: block.sectionHint } : {}),
    ...(block.metadata ? { metadata: block.metadata } : {}),
  };
}

function inferTitle(blocks: readonly DraftBlock[]): string {
  const heading = blocks.find((block) => block.kind === "heading");
  return heading?.text ?? "Untitled Source";
}

function detectStandaloneKind(text: string): SourceBlockKind {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const firstLine = lines[0]?.trim() ?? "";

  if (/^\s*```/.test(firstLine)) {
    return "code";
  }
  if (isMarkdownHeading(firstLine) || isReasonableAllCapsHeading(firstLine)) {
    return "heading";
  }
  if (lines.length > 0 && lines.every((line) => isListLine(line.trim()))) {
    return "list";
  }
  if (lines.length > 0 && lines.every((line) => isQuoteLine(line.trim()))) {
    return "quote";
  }
  if (lines.length > 0 && lines.every((line) => isTableLine(line.trim()))) {
    return "table";
  }
  return "paragraph";
}

function isMarkdownHeading(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line);
}

function cleanHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").trim();
}

function isReasonableAllCapsHeading(line: string): boolean {
  const letters = line.match(/[A-Za-z]/g) ?? [];
  return (
    line.length >= 3 &&
    line.length <= 80 &&
    line.split(/\s+/).length <= 10 &&
    letters.length >= 2 &&
    line === line.toUpperCase() &&
    !/[.!?]$/.test(line)
  );
}

function isListLine(line: string): boolean {
  return /^(?:[-*+]\s+|\d+[.)]\s+)\S/.test(line);
}

function isQuoteLine(line: string): boolean {
  return /^>\s?\S/.test(line);
}

function isTableLine(line: string): boolean {
  return (line.match(/\|/g)?.length ?? 0) >= 2;
}

function sanitizeScalarRecord(
  value: unknown,
): Readonly<Record<string, MetadataValue>> {
  if (!isRecord(value)) {
    return {};
  }

  const sanitized: Record<string, MetadataValue> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isSafeMetadataKey(key) && isMetadataValue(entry)) {
      sanitized[key] = entry;
    }
  }
  return sanitized;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMetadataValue(value: unknown): value is MetadataValue {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

function isSafeMetadataKey(key: string): boolean {
  return key.trim().length > 0 && !UNSAFE_METADATA_KEY.test(key);
}

function readSafeString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : undefined;
}

function readMetadataAttributeString(
  metadata: NormalizedSourceMetadata,
  key: string,
): string | undefined {
  return readSafeString(metadata.attributes?.[key]);
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNonNegativeNumber(value: unknown): number | undefined {
  const number = readFiniteNumber(value);
  return number !== undefined && number >= 0 ? number : undefined;
}

function isSourceKind(value: unknown): value is NormalizedSourceKind {
  return SOURCE_KINDS.some((kind) => kind === value);
}

function isBlockKind(value: unknown): value is SourceBlockKind {
  return BLOCK_KINDS.some((kind) => kind === value);
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
