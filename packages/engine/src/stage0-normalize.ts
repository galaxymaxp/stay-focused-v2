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
