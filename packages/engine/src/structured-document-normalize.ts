import {
  isStructuredBlock,
  structuredBlockText,
  type StructuredBlock,
  type StructuredDocument,
} from "./structured-document.js";
import type {
  NormalizedSourceKind,
  SourceBlockKind,
  SourceNormalizationBlockInput,
  SourceNormalizationInput,
} from "./types.js";

export function structuredDocumentToNormalizationInput(
  document: StructuredDocument,
  overrides: Omit<SourceNormalizationInput, "structuredDocument" | "text" | "blocks"> = {},
): SourceNormalizationInput {
  validateStructuredDocument(document);
  const blocks = document.pages
    .slice()
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .flatMap((page) =>
      page.blocks
        .slice()
        .sort((left, right) => left.order - right.order),
    )
    .filter((block) => block.role !== "furniture" && structuredBlockText(block).length > 0)
    .map((block, order) => toNormalizationBlock(
      block,
      order,
      document.parser.name !== "legacy",
    ));
  if (blocks.length === 0) {
    throw new Error("Structured document requires at least one readable block.");
  }
  const kind = overrides.kind ?? inferSourceKind(document);
  return {
    ...overrides,
    id: overrides.id ?? document.sourceId,
    title: overrides.title ?? document.title,
    kind,
    blocks,
    metadata: overrides.metadata ?? {
      pageCount: document.pageCount,
      attributes: {
        structuredInput: true,
        parserName: document.parser.name,
        parserVersion: document.parser.version ?? null,
      },
    },
  };
}

export function validateStructuredDocument(document: StructuredDocument): void {
  if (!document || document.schemaVersion !== "structured-document-v1") {
    throw new Error("Structured document schema is invalid.");
  }
  if (!Number.isInteger(document.pageCount) || document.pageCount < 1) {
    throw new Error("Structured document page count must be positive.");
  }
  if (!Array.isArray(document.pages) || document.pages.length !== document.pageCount) {
    throw new Error("Structured document must contain every declared page.");
  }
  const pageNumbers = new Set<number>();
  for (const page of document.pages) {
    if (
      !Number.isInteger(page.pageNumber) ||
      page.pageNumber < 1 ||
      page.pageNumber > document.pageCount ||
      pageNumbers.has(page.pageNumber)
    ) {
      throw new Error("Structured document page numbering is invalid.");
    }
    pageNumbers.add(page.pageNumber);
    if (!Array.isArray(page.blocks) || !page.blocks.every(isStructuredBlock)) {
      throw new Error(`Structured document page ${page.pageNumber} contains an invalid block.`);
    }
    if (page.blocks.some((block: StructuredBlock) => block.pageNumber !== page.pageNumber)) {
      throw new Error(`Structured document page ${page.pageNumber} contains mismatched provenance.`);
    }
  }
}

function toNormalizationBlock(
  block: StructuredBlock,
  order: number,
  typedStructure: boolean,
): SourceNormalizationBlockInput {
  const text = structuredBlockText(block);
  if (!text) {
    throw new Error(`Structured block ${block.id} has no readable text.`);
  }
  return {
    id: block.id,
    kind: toSourceBlockKind(block),
    order,
    pageNumber: block.pageNumber,
    text,
    structuredBlock: block,
    metadata: {
      typedStructure,
      structuredRole: block.role ?? "content",
      textOrigin: block.textOrigin ?? "parser",
      ...(block.type === "heading" && block.level !== undefined
        ? { headingLevel: block.level }
        : {}),
    },
  };
}

function toSourceBlockKind(block: StructuredBlock): SourceBlockKind {
  switch (block.type) {
    case "heading": return "heading";
    case "paragraph": return "paragraph";
    case "list": return "list";
    case "code": return "code";
    case "formula": return "formula";
    case "table": return "table";
    case "image": return "image";
  }
}

function inferSourceKind(document: StructuredDocument): NormalizedSourceKind {
  const blocks = document.pages.flatMap((page) => page.blocks);
  const headings = blocks.filter((block) => block.type === "heading");
  const repeatedPageHeadings = new Map<string, Set<number>>();
  for (const heading of headings) {
    const key = heading.text.trim().toLowerCase();
    const pages = repeatedPageHeadings.get(key) ?? new Set<number>();
    pages.add(heading.pageNumber);
    repeatedPageHeadings.set(key, pages);
  }
  const repeatedAcrossPages = [...repeatedPageHeadings.values()].some(
    (pages) => pages.size >= 2,
  );
  return repeatedAcrossPages ? "presentation" : "document";
}
