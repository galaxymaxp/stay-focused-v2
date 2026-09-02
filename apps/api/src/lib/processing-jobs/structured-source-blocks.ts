import {
  sanitizeStructuredBlock,
  structuredBlockText,
  type SourceBlockKind,
  type SourceNormalizationBlockInput,
} from "@stay-focused/engine";

const SOURCE_BLOCK_KINDS: readonly SourceBlockKind[] = [
  "heading", "paragraph", "list", "table", "code", "formula", "image", "quote", "unknown",
];

export function readStructuredSourceBlocks(
  value: unknown,
  options: { readonly strict?: boolean; readonly maxTextLength?: number } = {},
): readonly SourceNormalizationBlockInput[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 500) return undefined;
  const blocks = value.flatMap((entry, inputIndex): readonly SourceNormalizationBlockInput[] => {
    if (!isRecord(entry) || typeof entry.text !== "string") return [];
    const rawText = entry.text.replace(/\r\n?/gu, "\n");
    const pageNumber = readPageNumber(entry.pageNumber);
    const structuredBlock = sanitizeStructuredBlock(entry.structuredBlock);
    const text = structuredBlock ? rawText : rawText.trim();
    if (
      !text.trim() ||
      (options.maxTextLength !== undefined && text.length > options.maxTextLength) ||
      (entry.pageNumber !== undefined && pageNumber === undefined) ||
      (entry.structuredBlock !== undefined && !structuredBlock) ||
      (structuredBlock && structuredBlockText(structuredBlock) !== text)
    ) return [];
    const kind = structuredBlock && isSourceBlockKind(entry.kind) ? entry.kind : "unknown";
    return [{
      ...(typeof entry.id === "string" && entry.id.trim() ? { id: entry.id.trim().slice(0, 180) } : {}),
      kind,
      order: typeof entry.order === "number" && Number.isFinite(entry.order) ? entry.order : inputIndex,
      ...(pageNumber !== undefined ? { pageNumber } : {}),
      text,
      ...(structuredBlock
        ? {
            structuredBlock,
            metadata: {
              typedStructure: true,
              structuredRole: structuredBlock.role ?? "content",
              textOrigin: structuredBlock.textOrigin ?? "parser",
            },
          }
        : {}),
    }];
  });
  return options.strict && blocks.length !== value.length ? undefined : blocks;
}

function isSourceBlockKind(value: unknown): value is SourceBlockKind {
  return SOURCE_BLOCK_KINDS.includes(value as SourceBlockKind);
}

function readPageNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
