import type {
  DocumentInput,
  DocumentParser,
  ParserCapability,
} from "./document-parser.js";
import type {
  ParserDiagnostic,
  StructuredBlock,
  StructuredBlockProvenance,
  StructuredBoundingBox,
  StructuredDocument,
  StructuredPage,
  StructuredParserName,
  StructuredTableBlock,
  StructuredTableCell,
  StructuredTableRow,
} from "./structured-document.js";

export interface NativeParserBridge {
  readonly parser: "docling" | "mineru";
  isAvailable(): Promise<boolean>;
  parse(input: DocumentInput): Promise<unknown>;
}

export interface LegacyDocumentPage {
  readonly pageNumber: number;
  readonly text: string;
  readonly method?: "native_text" | "ocr" | "blank";
  readonly confidence?: number;
  readonly blocks?: readonly {
    readonly id?: string;
    readonly order?: number;
    readonly text: string;
    readonly confidence?: number;
    readonly boundingBox?: StructuredBoundingBox;
  }[];
}

export class LegacyDocumentParser implements DocumentParser {
  public readonly name = "legacy" as const;

  public constructor(
    private readonly extract: (input: DocumentInput) => Promise<StructuredDocument>,
  ) {}

  public async canParse(): Promise<ParserCapability> {
    return { available: true, confidence: 1 };
  }

  public async parse(input: DocumentInput): Promise<StructuredDocument> {
    return await this.extract(input);
  }
}

export class DoclingDocumentParser implements DocumentParser {
  public readonly name = "docling" as const;

  public constructor(private readonly bridge: NativeParserBridge) {}

  public async canParse(input: DocumentInput): Promise<ParserCapability> {
    return {
      available: input.mimeType === "application/pdf" && await this.bridge.isAvailable(),
      confidence: input.mimeType === "application/pdf" ? 0.9 : 0,
    };
  }

  public async parse(input: DocumentInput): Promise<StructuredDocument> {
    return mapDoclingDocument(await this.bridge.parse(input), {
      pageCount: input.pageCount,
      sourceId: input.sourceId,
      title: input.title,
    });
  }
}

export class MinerUDocumentParser implements DocumentParser {
  public readonly name = "mineru" as const;

  public constructor(private readonly bridge: NativeParserBridge) {}

  public async canParse(input: DocumentInput): Promise<ParserCapability> {
    return {
      available: input.mimeType === "application/pdf" && await this.bridge.isAvailable(),
      confidence: input.mimeType === "application/pdf" ? 0.9 : 0,
    };
  }

  public async parse(input: DocumentInput): Promise<StructuredDocument> {
    return mapMinerUDocument(await this.bridge.parse(input), {
      pageCount: input.pageCount,
      sourceId: input.sourceId,
      title: input.title,
    });
  }
}

export function createLegacyStructuredDocument({
  pages,
  sourceId,
  title,
}: {
  readonly pages: readonly LegacyDocumentPage[];
  readonly sourceId?: string;
  readonly title?: string;
}): StructuredDocument {
  const parser = "legacy" as const;
  const structuredPages = pages
    .slice()
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .map((page): StructuredPage => {
      const sourceBlocks = page.blocks?.filter((block) => block.text.trim()) ?? [];
      const blocks = (sourceBlocks.length > 0
        ? sourceBlocks
        : page.text.trim()
          ? [{ id: `page-${page.pageNumber}`, order: 0, text: page.text }]
          : [])
        .map((block, order): StructuredBlock => {
          const id = block.id?.trim() || `legacy-page-${page.pageNumber}-block-${order}`;
          return {
            id,
            type: "paragraph",
            pageNumber: page.pageNumber,
            order,
            text: block.text,
            rawText: block.text,
            confidence: block.confidence ?? page.confidence,
            textOrigin: page.method === "ocr" ? "ocr" : "native",
            provenance: provenance({
              blockId: id,
              boundingBox: block.boundingBox,
              pageNumber: page.pageNumber,
              parser,
              sourceId,
            }),
          };
        });
      return { pageNumber: page.pageNumber, blocks };
    });

  return {
    schemaVersion: "structured-document-v1",
    ...(sourceId ? { sourceId } : {}),
    ...(title ? { title } : {}),
    pageCount: structuredPages.length,
    pages: structuredPages,
    parser: {
      name: parser,
      ocrUsed: pages.some((page) => page.method === "ocr"),
    },
    diagnostics: [],
  };
}

export function mapDoclingDocument(
  value: unknown,
  options: {
    readonly pageCount?: number;
    readonly sourceId?: string;
    readonly title?: string;
  } = {},
): StructuredDocument {
  const envelope = isRecord(value) ? value : {};
  const unwrapped = unwrapNative(value, "docling");
  const root = isRecord(unwrapped) ? unwrapped : {};
  const diagnostics: ParserDiagnostic[] = [];
  const orderedItems = collectDoclingItems(root);
  const blocks = orderedItems.flatMap((item, order) =>
    mapDoclingItem(item, order, options.sourceId, diagnostics),
  );
  const pageCount = options.pageCount ?? readDoclingPageCount(root, blocks);
  const pages = assemblePages(pageCount, blocks, readDoclingPageSizes(root));
  return {
    schemaVersion: "structured-document-v1",
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    ...(options.title ?? readString(root.name)
      ? { title: options.title ?? readString(root.name) }
      : {}),
    pageCount,
    pages,
    parser: {
      name: "docling",
      ...(readString(envelope.parserVersion) ? { version: readString(envelope.parserVersion) } : {}),
      backend: "document-tree-json",
    },
    diagnostics,
  };
}

export function mapMinerUDocument(
  value: unknown,
  options: {
    readonly pageCount?: number;
    readonly sourceId?: string;
    readonly title?: string;
  } = {},
): StructuredDocument {
  const envelope = isRecord(value) ? value : {};
  const native = unwrapNative(value, "mineru");
  let items: readonly unknown[] = [];
  if (Array.isArray(native)) {
    items = native;
  } else if (isRecord(native)) {
    if (Array.isArray(native.contentList)) items = native.contentList;
    else if (Array.isArray(native.content_list)) items = native.content_list;
  }
  const diagnostics: ParserDiagnostic[] = [];
  const pageOrders = new Map<number, number>();
  const blocks: readonly StructuredBlock[] = items.flatMap(
    (item: unknown, inputIndex: number): readonly StructuredBlock[] => {
    if (!isRecord(item)) return [];
    const pageNumber = readInteger(item.page_idx) !== undefined
      ? (readInteger(item.page_idx) ?? 0) + 1
      : readPositiveInteger(item.pageNumber) ?? 1;
    const order = pageOrders.get(pageNumber) ?? 0;
    pageOrders.set(pageNumber, order + 1);
    const nativeType = readString(item.type) ?? "text";
    const id = `mineru-${pageNumber}-${order}-${stableHash(`${nativeType}:${inputIndex}`)}`;
    const base = {
      id,
      pageNumber,
      order,
      nativeLabel: nativeType,
      textOrigin: "ocr" as const,
      ...(readFiniteNumber(item.confidence) !== undefined
        ? { confidence: readFiniteNumber(item.confidence) }
        : {}),
      provenance: provenance({
        blockId: id,
        boundingBox: readMinerUBoundingBox(item.bbox),
        nativeBlockId: readString(item.id),
        pageNumber,
        parser: "mineru",
        sourceId: options.sourceId,
      }),
    };

    if (nativeType === "header" || nativeType === "footer" || nativeType === "page_number") {
      const text = readString(item.text);
      return text ? [{ ...base, type: "paragraph", text, rawText: text, role: "furniture" }] : [];
    }
    if (nativeType === "code") {
      const text = readSourceText(item.code_body) ?? readSourceText(item.text);
      return text
        ? [{
            ...base,
            type: "code",
            text,
            rawText: text,
            ...(readString(item.language) ? { languageHint: readString(item.language) } : {}),
          }]
        : [];
    }
    if (nativeType === "equation") {
      const rawText = readString(item.text) ?? "";
      return rawText
        ? [{ ...base, type: "formula", rawText, latex: stripMathDelimiters(rawText) }]
        : [];
    }
    if (nativeType === "table") {
      const table = mapMinerUTable(item, base, diagnostics);
      return table ? [table] : [];
    }
    if (nativeType === "image") {
      const altText = readString(item.image_caption) ?? readString(item.text);
      return [{
        ...base,
        type: "image",
        ...(altText ? { altText, rawText: altText } : {}),
      }];
    }

    const text = readString(item.text);
    if (!text) return [];
    const level = readPositiveInteger(item.text_level);
    if (level !== undefined) {
      return [{ ...base, type: "heading", text, rawText: text, level }];
    }
    return [{ ...base, type: "paragraph", text, rawText: text }];
    },
  );
  const inferredPageCount = blocks.reduce(
    (maximum: number, block: StructuredBlock) => Math.max(maximum, block.pageNumber),
    0,
  );
  const pageCount = options.pageCount ?? inferredPageCount;
  return {
    schemaVersion: "structured-document-v1",
    ...(options.sourceId ? { sourceId: options.sourceId } : {}),
    ...(options.title ? { title: options.title } : {}),
    pageCount,
    pages: assemblePages(pageCount, blocks),
    parser: {
      name: "mineru",
      ...(readString(envelope.parserVersion) ? { version: readString(envelope.parserVersion) } : {}),
      backend: "pipeline",
      ocrUsed: true,
    },
    diagnostics,
  };
}

function collectDoclingItems(root: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] {
  const collections = {
    texts: readRecordArray(root.texts),
    tables: readRecordArray(root.tables),
    pictures: readRecordArray(root.pictures),
    groups: readRecordArray(root.groups),
  };
  const items: Readonly<Record<string, unknown>>[] = [];
  const seen = new Set<string>();

  const visitReference = (value: unknown): void => {
    if (!isRecord(value)) return;
    const reference = readString(value.$ref);
    if (!reference || seen.has(reference)) return;
    seen.add(reference);
    const match = /^#\/(texts|tables|pictures|groups)\/(\d+)$/.exec(reference);
    if (!match) return;
    const collectionName = match[1] as keyof typeof collections;
    const item = collections[collectionName][Number(match[2])];
    if (!item) return;
    if (collectionName === "groups") {
      for (const child of readArray(item.children)) visitReference(child);
      return;
    }
    items.push(item);
  };

  const body = isRecord(root.body) ? root.body : {};
  for (const child of readArray(body.children)) visitReference(child);
  if (items.length === 0) {
    items.push(...collections.texts, ...collections.tables, ...collections.pictures);
    items.sort(compareDoclingPosition);
  }
  return items;
}

function mapDoclingItem(
  item: Readonly<Record<string, unknown>>,
  order: number,
  sourceId: string | undefined,
  diagnostics: ParserDiagnostic[],
): readonly StructuredBlock[] {
  const label = readString(item.label) ?? "text";
  const pageNumber = readDoclingPageNumber(item);
  const nativeBlockId = readString(item.self_ref);
  const id = nativeBlockId?.replace(/^#\//, "docling-").replace(/\//g, "-") ??
    `docling-${pageNumber}-${order}`;
  const base = {
    id,
    pageNumber,
    order,
    nativeLabel: label,
    textOrigin: "parser" as const,
    ...(readDoclingParentId(item) ? { parentId: readDoclingParentId(item) } : {}),
    ...(readFiniteNumber(item.confidence) !== undefined
      ? { confidence: readFiniteNumber(item.confidence) }
      : {}),
    provenance: provenance({
      blockId: id,
      boundingBox: readDoclingBoundingBox(item),
      nativeBlockId,
      pageNumber,
      parser: "docling",
      sourceId,
    }),
  };
  const text = readString(item.text) ?? readString(item.orig) ?? "";
  if (label === "section_header" || label === "title") {
    return text
      ? [{
          ...base,
          type: "heading",
          text,
          rawText: readString(item.orig) ?? text,
          ...(readPositiveInteger(item.level) !== undefined
            ? { level: readPositiveInteger(item.level) }
            : {}),
        }]
      : [];
  }
  if (label === "code") {
    const code = readSourceText(item.text) ?? readSourceText(item.orig);
    return code ? [{ ...base, type: "code", text: code, rawText: readSourceText(item.orig) ?? code }] : [];
  }
  if (label === "formula") {
    const rawText = readString(item.orig) ?? text;
    return rawText ? [{ ...base, type: "formula", rawText, ...(text ? { latex: text } : {}) }] : [];
  }
  if (label === "list_item") {
    if (!text) return [];
    const itemId = `${id}-item-0`;
    return [{
      ...base,
      type: "list",
      rawText: readString(item.orig) ?? text,
      items: [{
        id: itemId,
        order: 0,
        text,
        provenance: { ...base.provenance, blockId: itemId },
      }],
    }];
  }
  if (label === "table") {
    const table = mapDoclingTable(item, base, diagnostics);
    return table ? [table] : [];
  }
  if (label === "picture") {
    const altText = text || readDoclingCaption(item);
    return [{ ...base, type: "image", ...(altText ? { altText, rawText: altText } : {}) }];
  }
  return text ? [{ ...base, type: "paragraph", text, rawText: readString(item.orig) ?? text }] : [];
}

function mapDoclingTable(
  item: Readonly<Record<string, unknown>>,
  base: Omit<StructuredTableBlock, "type" | "rows">,
  diagnostics: ParserDiagnostic[],
): StructuredTableBlock | undefined {
  const data = isRecord(item.data) ? item.data : {};
  const nativeCells = readRecordArray(data.table_cells);
  const cells = nativeCells.flatMap((cell, index): readonly StructuredTableCell[] => {
    const rowIndex = readInteger(cell.start_row_offset_idx);
    const columnIndex = readInteger(cell.start_col_offset_idx);
    if (rowIndex === undefined || columnIndex === undefined) return [];
    const id = `${base.id}-cell-${rowIndex}-${columnIndex}-${index}`;
    return [{
      id,
      rowIndex,
      columnIndex,
      rowSpan: Math.max(1, readPositiveInteger(cell.row_span) ?? 1),
      columnSpan: Math.max(1, readPositiveInteger(cell.col_span) ?? 1),
      text: readStringAllowEmpty(cell.text) ?? "",
      ...(cell.column_header === true || cell.row_header === true ? { isHeader: true } : {}),
      provenance: {
        ...base.provenance,
        blockId: id,
        tableCell: { tableBlockId: base.id, rowIndex, columnIndex },
      },
    }];
  });
  if (cells.length === 0) {
    diagnostics.push({
      blockId: base.id,
      code: "docling_table_unparseable",
      message: "Docling table contained no addressable cells.",
      pageNumber: base.pageNumber,
      severity: "warning",
    });
  }
  const rows = groupRows(cells);
  const caption = readDoclingCaption(item);
  return {
    ...base,
    type: "table",
    ...(caption ? { caption } : {}),
    rows,
  };
}

function mapMinerUTable(
  item: Readonly<Record<string, unknown>>,
  base: Omit<StructuredTableBlock, "type" | "rows">,
  diagnostics: ParserDiagnostic[],
): StructuredTableBlock | undefined {
  const html = readString(item.table_body) ?? "";
  const rows = parseHtmlTable(html, base);
  if (rows.length === 0) {
    diagnostics.push({
      blockId: base.id,
      code: "mineru_table_unparseable",
      message: "MinerU table contained no addressable cells.",
      pageNumber: base.pageNumber,
      severity: "warning",
    });
  }
  const caption = readTextArray(item.table_caption).join(" ").trim();
  return {
    ...base,
    type: "table",
    ...(caption ? { caption } : {}),
    rows,
  };
}

function parseHtmlTable(
  html: string,
  table: Omit<StructuredTableBlock, "type" | "rows">,
): readonly StructuredTableRow[] {
  const rows: StructuredTableRow[] = [];
  const occupiedThroughRow = new Map<number, number>();
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch = rowPattern.exec(html);
  let rowIndex = 0;
  while (rowMatch) {
    const cells: StructuredTableCell[] = [];
    const cellPattern = /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch = cellPattern.exec(rowMatch[1] ?? "");
    let columnIndex = 0;
    while (cellMatch) {
      while ((occupiedThroughRow.get(columnIndex) ?? -1) >= rowIndex) {
        columnIndex += 1;
      }
      const attributes = cellMatch[2] ?? "";
      const rowSpan = readHtmlSpan(attributes, "rowspan");
      const columnSpan = readHtmlSpan(attributes, "colspan");
      const id = `${table.id}-cell-${rowIndex}-${columnIndex}`;
      cells.push({
        id,
        rowIndex,
        columnIndex,
        rowSpan,
        columnSpan,
        text: decodeHtml(stripHtml(cellMatch[3] ?? "")).trim(),
        ...(cellMatch[1]?.toLowerCase() === "th" ? { isHeader: true } : {}),
        provenance: {
          ...table.provenance,
          blockId: id,
          tableCell: { tableBlockId: table.id, rowIndex, columnIndex },
        },
      });
      if (rowSpan > 1) {
        for (let offset = 0; offset < columnSpan; offset += 1) {
          occupiedThroughRow.set(columnIndex + offset, rowIndex + rowSpan - 1);
        }
      }
      columnIndex += columnSpan;
      cellMatch = cellPattern.exec(rowMatch[1] ?? "");
    }
    rows.push({ index: rowIndex, cells });
    rowIndex += 1;
    rowMatch = rowPattern.exec(html);
  }
  return rows;
}

function groupRows(cells: readonly StructuredTableCell[]): readonly StructuredTableRow[] {
  const byRow = new Map<number, StructuredTableCell[]>();
  for (const cell of cells) {
    const row = byRow.get(cell.rowIndex) ?? [];
    row.push(cell);
    byRow.set(cell.rowIndex, row);
  }
  return [...byRow.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, rowCells]) => ({
      index,
      cells: rowCells.slice().sort((left, right) => left.columnIndex - right.columnIndex),
    }));
}

function assemblePages(
  pageCount: number,
  blocks: readonly StructuredBlock[],
  sizes: ReadonlyMap<number, { readonly width: number; readonly height: number }> = new Map(),
): readonly StructuredPage[] {
  const byPage = new Map<number, StructuredBlock[]>();
  for (const block of blocks) {
    const pageBlocks = byPage.get(block.pageNumber) ?? [];
    pageBlocks.push(block);
    byPage.set(block.pageNumber, pageBlocks);
  }
  return Array.from({ length: pageCount }, (_, index): StructuredPage => {
    const pageNumber = index + 1;
    const size = sizes.get(pageNumber);
    return {
      pageNumber,
      blocks: (byPage.get(pageNumber) ?? [])
        .slice()
        .sort((left, right) => left.order - right.order)
        .map((block, order) => ({ ...block, order })),
      ...(size ? size : {}),
    };
  });
}

function readDoclingPageSizes(
  root: Readonly<Record<string, unknown>>,
): ReadonlyMap<number, { readonly width: number; readonly height: number }> {
  const sizes = new Map<number, { width: number; height: number }>();
  const pages = isRecord(root.pages) ? root.pages : {};
  for (const page of Object.values(pages)) {
    if (!isRecord(page) || !isRecord(page.size)) continue;
    const pageNumber = readPositiveInteger(page.page_no);
    const width = readFiniteNumber(page.size.width);
    const height = readFiniteNumber(page.size.height);
    if (pageNumber && width !== undefined && height !== undefined) {
      sizes.set(pageNumber, { width, height });
    }
  }
  return sizes;
}

function readDoclingPageCount(
  root: Readonly<Record<string, unknown>>,
  blocks: readonly StructuredBlock[],
): number {
  const pages = isRecord(root.pages) ? Object.keys(root.pages).length : 0;
  return Math.max(pages, blocks.reduce((maximum, block) => Math.max(maximum, block.pageNumber), 0));
}

function readDoclingPageNumber(item: Readonly<Record<string, unknown>>): number {
  const prov = readRecordArray(item.prov)[0];
  return readPositiveInteger(prov?.page_no) ?? 1;
}

function readDoclingBoundingBox(
  item: Readonly<Record<string, unknown>>,
): StructuredBoundingBox | undefined {
  const prov = readRecordArray(item.prov)[0];
  return prov && isRecord(prov.bbox) ? readBoundingBox(prov.bbox) : undefined;
}

function readMinerUBoundingBox(value: unknown): StructuredBoundingBox | undefined {
  if (!Array.isArray(value) || value.length < 4) return undefined;
  const numbers = value.slice(0, 4).map(readFiniteNumber);
  if (numbers.some((entry) => entry === undefined)) return undefined;
  return {
    left: numbers[0] ?? 0,
    top: numbers[1] ?? 0,
    right: numbers[2] ?? 0,
    bottom: numbers[3] ?? 0,
    coordinateOrigin: "top-left",
  };
}

function readBoundingBox(value: Readonly<Record<string, unknown>>): StructuredBoundingBox | undefined {
  const left = readFiniteNumber(value.l);
  const top = readFiniteNumber(value.t);
  const right = readFiniteNumber(value.r);
  const bottom = readFiniteNumber(value.b);
  if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
    return undefined;
  }
  return {
    left,
    top,
    right,
    bottom,
    coordinateOrigin: readString(value.coord_origin) === "BOTTOMLEFT" ? "bottom-left" : "top-left",
  };
}

function compareDoclingPosition(
  left: Readonly<Record<string, unknown>>,
  right: Readonly<Record<string, unknown>>,
): number {
  const pageDifference = readDoclingPageNumber(left) - readDoclingPageNumber(right);
  if (pageDifference !== 0) return pageDifference;
  const leftBox = readDoclingBoundingBox(left);
  const rightBox = readDoclingBoundingBox(right);
  return (leftBox?.top ?? 0) - (rightBox?.top ?? 0) ||
    (leftBox?.left ?? 0) - (rightBox?.left ?? 0);
}

function readDoclingCaption(item: Readonly<Record<string, unknown>>): string | undefined {
  return readTextArray(item.captions).join(" ").trim() || undefined;
}

function readDoclingParentId(item: Readonly<Record<string, unknown>>): string | undefined {
  const parent = isRecord(item.parent) ? readString(item.parent.$ref) : undefined;
  return parent?.replace(/^#\//, "docling-").replace(/\//g, "-");
}

function provenance({
  blockId,
  boundingBox,
  nativeBlockId,
  pageNumber,
  parser,
  sourceId,
}: {
  readonly blockId: string;
  readonly boundingBox?: StructuredBoundingBox;
  readonly nativeBlockId?: string;
  readonly pageNumber: number;
  readonly parser: StructuredParserName;
  readonly sourceId?: string;
}): StructuredBlockProvenance {
  return {
    blockId,
    pageNumber,
    parser,
    ...(sourceId ? { sourceId } : {}),
    ...(nativeBlockId ? { nativeBlockId } : {}),
    ...(boundingBox ? { boundingBox } : {}),
  };
}

function unwrapNative(value: unknown, parser: "docling" | "mineru"): Readonly<Record<string, unknown>> | readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return {};
  if (isRecord(value.native)) return value.native;
  if (parser === "docling" && isRecord(value.document)) return value.document;
  return value;
}

function readHtmlSpan(attributes: string, name: string): number {
  const match = new RegExp(`${name}\\s*=\\s*["']?(\\d+)`, "i").exec(attributes);
  return Math.max(1, Number(match?.[1] ?? 1));
}

function stripHtml(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function stripMathDelimiters(value: string): string {
  return value.replace(/^\s*\$\$\s*/u, "").replace(/\s*\$\$\s*$/u, "").trim();
}

function readTextArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string" && entry.trim()) return [entry.trim()];
    if (isRecord(entry)) {
      const text = readString(entry.text);
      return text ? [text] : [];
    }
    return [];
  });
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readRecordArray(value: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSourceText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringAllowEmpty(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
