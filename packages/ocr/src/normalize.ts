import type {
  NormalizeOcrResultInput,
  OcrBlock,
  OcrBoundingBox,
  OcrDraftBlock,
  OcrDraftLine,
  OcrDraftPage,
  OcrLine,
  OcrPage,
  OcrResult,
  OcrWarning,
} from "./types";

interface IndexedValue<TValue> {
  readonly value: TValue;
  readonly inputIndex: number;
}

export function normalizeOcrResult(input: NormalizeOcrResultInput): OcrResult {
  const warnings: OcrWarning[] = [...(input.warnings ?? [])];
  const pages = normalizePages(input.pages, warnings);
  const text = normalizeOcrText(pages.map((page) => page.text).join("\n\n"));

  if (text.length === 0) {
    warnings.push({
      code: "empty_text",
      message: "The OCR provider returned no extracted text.",
    });
  }

  return {
    text,
    pages,
    mimeType: input.mimeType,
    provider: input.provider,
    warnings,
  };
}

export function normalizeOcrText(text: string): string {
  const lines = text
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  while (lines.length > 0 && isBlankLine(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && isBlankLine(lines.at(-1))) {
    lines.pop();
  }

  return lines.join("\n");
}

function normalizePages(
  pages: readonly OcrDraftPage[],
  warnings: OcrWarning[],
): readonly OcrPage[] {
  return pages
    .map((page, inputIndex) => ({ value: page, inputIndex }))
    .sort(compareIndexedPages)
    .map(({ value: page }, sortedIndex) =>
      normalizePage(page, sortedIndex + 1, warnings),
    );
}

function normalizePage(
  page: OcrDraftPage,
  fallbackPageNumber: number,
  warnings: OcrWarning[],
): OcrPage {
  const pageNumber = readPositiveInteger(page.pageNumber) ?? fallbackPageNumber;
  const blocks = normalizePageBlocks(page, pageNumber);
  const textFromBlocks = blocks
    .map((block) => block.text)
    .filter((blockText) => blockText.length > 0)
    .join("\n\n");
  const normalizedPageText = normalizeOcrText(page.text ?? "");
  const text = textFromBlocks || normalizedPageText;

  if (blocks.length === 0 && text.length > 0) {
    warnings.push({
      code: "missing_layout",
      message: "The OCR provider returned page text without block layout.",
      pageNumber,
    });
  }

  return {
    pageNumber,
    text,
    blocks,
    ...(readPositiveNumber(page.width) !== undefined
      ? { width: readPositiveNumber(page.width) }
      : {}),
    ...(readPositiveNumber(page.height) !== undefined
      ? { height: readPositiveNumber(page.height) }
      : {}),
    ...(readFiniteNumber(page.confidence) !== undefined
      ? { confidence: readFiniteNumber(page.confidence) }
      : {}),
  };
}

function normalizePageBlocks(
  page: OcrDraftPage,
  pageNumber: number,
): readonly OcrBlock[] {
  const explicitBlocks = page.blocks ?? [];
  if (explicitBlocks.length > 0) {
    return explicitBlocks
      .map((block, inputIndex) => ({ value: block, inputIndex }))
      .sort(compareIndexedLayoutItems)
      .map(({ value: block }, order) =>
        normalizeBlock(block, pageNumber, order),
      )
      .filter((block) => block.text.length > 0 || block.lines.length > 0);
  }

  const explicitLines = page.lines ?? [];
  if (explicitLines.length > 0) {
    const lines = normalizeLines(explicitLines, pageNumber, 0);
    const text = lines.map((line) => line.text).join("\n");

    return [
      {
        id: `page-${pageNumber}-block-1`,
        order: 0,
        kind: "line-group",
        text,
        lines,
      },
    ];
  }

  const text = normalizeOcrText(page.text ?? "");
  if (!text) {
    return [];
  }

  return [
    {
      id: `page-${pageNumber}-block-1`,
      order: 0,
      kind: "block",
      text,
      lines: linesFromText(text, pageNumber, 0),
    },
  ];
}

function normalizeBlock(
  block: OcrDraftBlock,
  pageNumber: number,
  order: number,
): OcrBlock {
  const explicitLines = block.lines ?? [];
  const lines =
    explicitLines.length > 0
      ? normalizeLines(explicitLines, pageNumber, order)
      : linesFromText(normalizeOcrText(block.text ?? ""), pageNumber, order);
  const textFromLines = lines.map((line) => line.text).join("\n");
  const text = normalizeOcrText(block.text ?? "") || textFromLines;

  return {
    id: `page-${pageNumber}-block-${order + 1}`,
    order,
    kind: block.kind ?? "block",
    text,
    lines,
    ...(block.boundingBox ? { boundingBox: block.boundingBox } : {}),
    ...(readFiniteNumber(block.confidence) !== undefined
      ? { confidence: readFiniteNumber(block.confidence) }
      : {}),
  };
}

function normalizeLines(
  lines: readonly OcrDraftLine[],
  pageNumber: number,
  blockOrder: number,
): readonly OcrLine[] {
  return lines
    .map((line, inputIndex) => ({ value: line, inputIndex }))
    .sort(compareIndexedLayoutItems)
    .map(({ value: line }, order) =>
      normalizeLine(line, pageNumber, blockOrder, order),
    );
}

function normalizeLine(
  line: OcrDraftLine,
  pageNumber: number,
  blockOrder: number,
  order: number,
): OcrLine {
  return {
    id: `page-${pageNumber}-block-${blockOrder + 1}-line-${order + 1}`,
    order,
    text: normalizeOcrLineText(line.text ?? ""),
    ...(line.boundingBox ? { boundingBox: line.boundingBox } : {}),
    ...(readFiniteNumber(line.confidence) !== undefined
      ? { confidence: readFiniteNumber(line.confidence) }
      : {}),
  };
}

function linesFromText(
  text: string,
  pageNumber: number,
  blockOrder: number,
): readonly OcrLine[] {
  if (!text) {
    return [];
  }

  return text.split("\n").map((line, order) => ({
    id: `page-${pageNumber}-block-${blockOrder + 1}-line-${order + 1}`,
    order,
    text: normalizeOcrLineText(line),
  }));
}

function normalizeOcrLineText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join(" ");
}

function compareIndexedPages(
  left: IndexedValue<OcrDraftPage>,
  right: IndexedValue<OcrDraftPage>,
): number {
  const leftOrder = readFiniteNumber(left.value.order);
  const rightOrder = readFiniteNumber(right.value.order);
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (
      (leftOrder ?? left.inputIndex) - (rightOrder ?? right.inputIndex) ||
      left.inputIndex - right.inputIndex
    );
  }

  const leftPageNumber = readPositiveInteger(left.value.pageNumber);
  const rightPageNumber = readPositiveInteger(right.value.pageNumber);
  if (leftPageNumber !== undefined || rightPageNumber !== undefined) {
    return (
      (leftPageNumber ?? left.inputIndex + 1) -
        (rightPageNumber ?? right.inputIndex + 1) ||
      left.inputIndex - right.inputIndex
    );
  }

  return left.inputIndex - right.inputIndex;
}

function compareIndexedLayoutItems(
  left: IndexedValue<OcrDraftBlock | OcrDraftLine>,
  right: IndexedValue<OcrDraftBlock | OcrDraftLine>,
): number {
  const leftOrder = readFiniteNumber(left.value.order);
  const rightOrder = readFiniteNumber(right.value.order);
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (
      (leftOrder ?? left.inputIndex) - (rightOrder ?? right.inputIndex) ||
      left.inputIndex - right.inputIndex
    );
  }

  const leftBox = left.value.boundingBox;
  const rightBox = right.value.boundingBox;
  if (leftBox && rightBox) {
    const vertical = minY(leftBox) - minY(rightBox);
    if (Math.abs(vertical) > 4) {
      return vertical;
    }

    const horizontal = minX(leftBox) - minX(rightBox);
    if (horizontal !== 0) {
      return horizontal;
    }
  }

  return left.inputIndex - right.inputIndex;
}

function minX(box: OcrBoundingBox): number {
  return Math.min(...box.vertices.map((vertex) => vertex.x));
}

function minY(box: OcrBoundingBox): number {
  return Math.min(...box.vertices.map((vertex) => vertex.y));
}

function readPositiveInteger(value: unknown): number | undefined {
  const number = readFiniteNumber(value);
  return number !== undefined && number > 0 && Number.isInteger(number)
    ? number
    : undefined;
}

function readPositiveNumber(value: unknown): number | undefined {
  const number = readFiniteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isBlankLine(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}
