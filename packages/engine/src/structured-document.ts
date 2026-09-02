export type StructuredParserName = "legacy" | "docling" | "mineru";

export type StructuredTextOrigin = "native" | "ocr" | "parser";

export type StructuredBlockRole = "content" | "metadata" | "furniture";

export interface StructuredBoundingBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly coordinateOrigin?: "top-left" | "bottom-left";
}

export interface StructuredTableCellReference {
  readonly tableBlockId: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
}

export interface StructuredBlockProvenance {
  readonly sourceId?: string;
  readonly pageNumber: number;
  readonly blockId: string;
  readonly parser: StructuredParserName;
  readonly nativeBlockId?: string;
  readonly boundingBox?: StructuredBoundingBox;
  readonly tableCell?: StructuredTableCellReference;
}

export interface StructuredBlockBase {
  readonly id: string;
  readonly type:
    | "heading"
    | "paragraph"
    | "list"
    | "code"
    | "formula"
    | "table"
    | "image";
  readonly pageNumber: number;
  readonly order: number;
  readonly provenance: StructuredBlockProvenance;
  readonly rawText?: string;
  readonly confidence?: number;
  readonly parentId?: string;
  readonly nativeLabel?: string;
  readonly role?: StructuredBlockRole;
  readonly textOrigin?: StructuredTextOrigin;
}

export interface StructuredHeadingBlock extends StructuredBlockBase {
  readonly type: "heading";
  readonly text: string;
  readonly level?: number;
  readonly hierarchyConfidence?: number;
}

export interface StructuredParagraphBlock extends StructuredBlockBase {
  readonly type: "paragraph";
  readonly text: string;
}

export interface StructuredListItem {
  readonly id: string;
  readonly order: number;
  readonly text: string;
  readonly provenance: StructuredBlockProvenance;
}

export interface StructuredListBlock extends StructuredBlockBase {
  readonly type: "list";
  readonly ordered?: boolean;
  readonly items: readonly StructuredListItem[];
}

export interface StructuredCodeBlock extends StructuredBlockBase {
  readonly type: "code";
  readonly text: string;
  readonly languageHint?: string;
}

export interface StructuredFormulaBlock extends StructuredBlockBase {
  readonly type: "formula";
  readonly rawText: string;
  readonly latex?: string;
}

export interface StructuredTableCell {
  readonly id: string;
  readonly rowIndex: number;
  readonly columnIndex: number;
  readonly rowSpan: number;
  readonly columnSpan: number;
  readonly text: string;
  readonly isHeader?: boolean;
  readonly confidence?: number;
  readonly provenance: StructuredBlockProvenance;
}

export interface StructuredTableRow {
  readonly index: number;
  readonly cells: readonly StructuredTableCell[];
}

export interface StructuredTableBlock extends StructuredBlockBase {
  readonly type: "table";
  readonly caption?: string;
  readonly rows: readonly StructuredTableRow[];
}

export interface StructuredImageBlock extends StructuredBlockBase {
  readonly type: "image";
  readonly altText?: string;
  readonly ocrText?: string;
}

export type StructuredBlock =
  | StructuredHeadingBlock
  | StructuredParagraphBlock
  | StructuredListBlock
  | StructuredCodeBlock
  | StructuredFormulaBlock
  | StructuredTableBlock
  | StructuredImageBlock;

export interface StructuredPage {
  readonly pageNumber: number;
  readonly blocks: readonly StructuredBlock[];
  readonly width?: number;
  readonly height?: number;
}

export interface StructuredParserMetadata {
  readonly name: StructuredParserName;
  readonly version?: string;
  readonly backend?: string;
  readonly ocrUsed?: boolean;
  readonly durationMs?: number;
}

export type ParserDiagnosticSeverity = "info" | "warning" | "fatal";

export interface ParserDiagnostic {
  readonly code: string;
  readonly severity: ParserDiagnosticSeverity;
  readonly message: string;
  readonly pageNumber?: number;
  readonly blockId?: string;
}

export interface StructuredDocument {
  readonly schemaVersion: "structured-document-v1";
  readonly sourceId?: string;
  readonly title?: string;
  readonly pageCount: number;
  readonly pages: readonly StructuredPage[];
  readonly parser: StructuredParserMetadata;
  readonly diagnostics: readonly ParserDiagnostic[];
}

export function structuredBlockText(block: StructuredBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
      return block.text.trim();
    case "code":
      return block.text;
    case "formula":
      return (block.latex ?? block.rawText).trim();
    case "list":
      return block.items
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((item, index) => `${block.ordered ? `${index + 1}.` : "-"} ${item.text}`)
        .join("\n")
        .trim();
    case "table":
      return [
        ...(block.caption ? [block.caption] : []),
        ...block.rows
          .slice()
          .sort((left, right) => left.index - right.index)
          .map((row) =>
            row.cells
              .slice()
              .sort((left, right) => left.columnIndex - right.columnIndex)
              .map((cell) => cell.text)
              .join(" | "),
          ),
      ].join("\n").trim();
    case "image":
      return (block.ocrText ?? block.altText ?? block.rawText ?? "").trim();
  }
}

export function structuredDocumentText(document: StructuredDocument): string {
  return document.pages
    .slice()
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .flatMap((page) =>
      page.blocks
        .slice()
        .sort((left, right) => left.order - right.order)
        .filter((block) => block.role !== "furniture")
        .map(structuredBlockText),
    )
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function isStructuredBlock(value: unknown): value is StructuredBlock {
  if (!isRecord(value)) return false;
  if (
    !isSafeId(value.id) ||
    !isPositiveInteger(value.pageNumber) ||
    !isNonNegativeInteger(value.order) ||
    !isStructuredProvenance(value.provenance) ||
    value.provenance.pageNumber !== value.pageNumber ||
    value.provenance.blockId !== value.id
  ) {
    return false;
  }
  if (value.role !== undefined && value.role !== "content" && value.role !== "metadata" && value.role !== "furniture") return false;
  if (value.textOrigin !== undefined && value.textOrigin !== "native" && value.textOrigin !== "ocr" && value.textOrigin !== "parser") return false;
  if (value.rawText !== undefined && (typeof value.rawText !== "string" || value.rawText.length > 200_000)) return false;
  if (value.confidence !== undefined && !isFiniteNumber(value.confidence)) return false;
  if (value.parentId !== undefined && !isSafeId(value.parentId)) return false;
  if (value.nativeLabel !== undefined && !isBoundedOptionalText(value.nativeLabel, 500)) return false;

  switch (value.type) {
    case "heading":
      return isBoundedText(value.text) &&
        (value.level === undefined || isPositiveInteger(value.level)) &&
        (value.hierarchyConfidence === undefined || isFiniteNumber(value.hierarchyConfidence));
    case "paragraph":
    case "code":
      return isBoundedText(value.text) &&
        (value.languageHint === undefined || isBoundedOptionalText(value.languageHint, 100));
    case "formula":
      return isBoundedText(value.rawText) &&
        (value.latex === undefined || typeof value.latex === "string");
    case "image":
      return (value.altText === undefined || isBoundedText(value.altText)) &&
        (value.ocrText === undefined || isBoundedText(value.ocrText));
    case "list":
      return (value.ordered === undefined || typeof value.ordered === "boolean") &&
        Array.isArray(value.items) &&
        value.items.length <= 500 &&
        value.items.every((item) =>
          isRecord(item) &&
          isSafeId(item.id) &&
          isNonNegativeInteger(item.order) &&
          isBoundedText(item.text) &&
          isStructuredProvenance(item.provenance) &&
          item.provenance.blockId === item.id &&
          item.provenance.pageNumber === value.pageNumber,
        );
    case "table":
      return (value.caption === undefined || isBoundedOptionalText(value.caption, 20_000)) &&
        Array.isArray(value.rows) &&
        value.rows.length <= 500 &&
        value.rows.every((row) =>
          isRecord(row) &&
          isNonNegativeInteger(row.index) &&
          Array.isArray(row.cells) &&
          row.cells.length <= 500 &&
          row.cells.every((cell) =>
            isRecord(cell) &&
            isSafeId(cell.id) &&
            isNonNegativeInteger(cell.rowIndex) &&
            isNonNegativeInteger(cell.columnIndex) &&
            isPositiveInteger(cell.rowSpan) &&
            isPositiveInteger(cell.columnSpan) &&
            typeof cell.text === "string" &&
            cell.text.length <= 20_000 &&
            isStructuredProvenance(cell.provenance) &&
            cell.provenance.blockId === cell.id &&
            cell.provenance.pageNumber === value.pageNumber &&
            cell.provenance.tableCell?.tableBlockId === value.id &&
            cell.provenance.tableCell?.rowIndex === cell.rowIndex &&
            cell.provenance.tableCell?.columnIndex === cell.columnIndex,
          ),
        );
    default:
      return false;
  }
}

export function sanitizeStructuredBlock(value: unknown): StructuredBlock | undefined {
  if (!isStructuredBlock(value)) return undefined;
  const base = {
    id: value.id,
    pageNumber: value.pageNumber,
    order: value.order,
    provenance: sanitizeProvenance(value.provenance),
    ...(typeof value.rawText === "string" ? { rawText: value.rawText } : {}),
    ...(typeof value.confidence === "number" && Number.isFinite(value.confidence) ? { confidence: value.confidence } : {}),
    ...(typeof value.parentId === "string" ? { parentId: value.parentId } : {}),
    ...(typeof value.nativeLabel === "string" ? { nativeLabel: value.nativeLabel } : {}),
    ...(value.role ? { role: value.role } : {}),
    ...(value.textOrigin ? { textOrigin: value.textOrigin } : {}),
  };
  switch (value.type) {
    case "heading":
      return { ...base, type: "heading", text: value.text, ...(value.level !== undefined ? { level: value.level } : {}), ...(typeof value.hierarchyConfidence === "number" ? { hierarchyConfidence: value.hierarchyConfidence } : {}) };
    case "paragraph":
      return { ...base, type: "paragraph", text: value.text };
    case "code":
      return { ...base, type: "code", text: value.text, ...(typeof value.languageHint === "string" ? { languageHint: value.languageHint } : {}) };
    case "formula":
      return { ...base, type: "formula", rawText: value.rawText, ...(typeof value.latex === "string" ? { latex: value.latex } : {}) };
    case "image":
      return { ...base, type: "image", ...(typeof value.altText === "string" ? { altText: value.altText } : {}), ...(typeof value.ocrText === "string" ? { ocrText: value.ocrText } : {}) };
    case "list":
      return {
        ...base,
        type: "list",
        ...(typeof value.ordered === "boolean" ? { ordered: value.ordered } : {}),
        items: value.items.map((item) => ({
          id: item.id,
          order: item.order,
          text: item.text,
          provenance: sanitizeProvenance(item.provenance),
        })),
      };
    case "table":
      return {
        ...base,
        type: "table",
        ...(typeof value.caption === "string" ? { caption: value.caption } : {}),
        rows: value.rows.map((row) => ({
          index: row.index,
          cells: row.cells.map((cell) => ({
            id: cell.id,
            rowIndex: cell.rowIndex,
            columnIndex: cell.columnIndex,
            rowSpan: cell.rowSpan,
            columnSpan: cell.columnSpan,
            text: cell.text,
            ...(typeof cell.isHeader === "boolean" ? { isHeader: cell.isHeader } : {}),
            ...(typeof cell.confidence === "number" && Number.isFinite(cell.confidence) ? { confidence: cell.confidence } : {}),
            provenance: sanitizeProvenance(cell.provenance),
          })),
        })),
      };
  }
}

function sanitizeProvenance(value: StructuredBlockProvenance): StructuredBlockProvenance {
  return {
    pageNumber: value.pageNumber,
    blockId: value.blockId,
    parser: value.parser,
    ...(value.sourceId ? { sourceId: value.sourceId } : {}),
    ...(value.nativeBlockId ? { nativeBlockId: value.nativeBlockId } : {}),
    ...(value.boundingBox ? { boundingBox: { ...value.boundingBox } } : {}),
    ...(value.tableCell ? { tableCell: { ...value.tableCell } } : {}),
  };
}

function isStructuredProvenance(value: unknown): value is StructuredBlockProvenance {
  if (!isRecord(value) || !isPositiveInteger(value.pageNumber) || !isSafeId(value.blockId) || !isParserName(value.parser)) return false;
  if (value.sourceId !== undefined && !isSafeId(value.sourceId)) return false;
  if (value.nativeBlockId !== undefined && !isSafeId(value.nativeBlockId)) return false;
  if (value.boundingBox !== undefined) {
    if (!isRecord(value.boundingBox)) return false;
    const box = value.boundingBox;
    if (![box.left, box.top, box.right, box.bottom].every(isFiniteNumber)) return false;
    if (box.coordinateOrigin !== undefined && box.coordinateOrigin !== "top-left" && box.coordinateOrigin !== "bottom-left") return false;
  }
  if (value.tableCell !== undefined) {
    if (!isRecord(value.tableCell) || !isSafeId(value.tableCell.tableBlockId) || !isNonNegativeInteger(value.tableCell.rowIndex) || !isNonNegativeInteger(value.tableCell.columnIndex)) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isParserName(value: unknown): value is StructuredParserName {
  return value === "legacy" || value === "docling" || value === "mineru";
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 300;
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200_000;
}

function isBoundedOptionalText(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length <= maximumLength;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
