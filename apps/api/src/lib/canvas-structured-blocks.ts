import type { OcrResult } from "@stay-focused/ocr";
import { createHash, randomUUID } from "node:crypto";
import {
  parseFragment,
  type DefaultTreeAdapterMap,
} from "parse5";

import { sanitizeCanvasPreviewText } from "@/lib/canvas-source-safety";

export const CANVAS_STRUCTURED_BLOCKS_VERSION =
  "canvas-structured-blocks-v1";
export const CANVAS_HTML_STRUCTURED_BLOCKS_VERSION =
  "canvas-html-structured-blocks-v1";
export const CANVAS_OCR_STRUCTURED_BLOCKS_VERSION =
  "canvas-ocr-structured-blocks-v1";
export const CANVAS_SELECTIVE_PREVIEW_VERSION =
  "canvas-selective-preview-v1";

export const CANVAS_REVIEWER_MAX_STRUCTURED_BLOCKS = 400;
export const CANVAS_REVIEWER_MAX_SELECTED_BLOCKS = 250;

export type CanvasStructuredBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "table"
  | "quote"
  | "code";

export interface CanvasTableCell {
  readonly text: string;
  readonly header: boolean;
}

export interface CanvasTableRow {
  readonly cells: readonly CanvasTableCell[];
}

export interface CanvasTableStructure {
  readonly rows: readonly CanvasTableRow[];
}

export interface CanvasStructuredBlockDraft {
  readonly kind: CanvasStructuredBlockKind;
  readonly text: string;
  readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly listDepth?: number;
  readonly listStyle?: "ordered" | "unordered";
  readonly tableStructure?: CanvasTableStructure;
  readonly pageNumber?: number;
  readonly slideNumber?: number;
  readonly modulePosition?: number;
  readonly selectable?: boolean;
  readonly selectedByDefault?: boolean;
}

export interface CanvasStructuredBlockManifestItem {
  readonly id: string;
  readonly source_ordinal: number;
  readonly block_ordinal: number;
  readonly block_kind: CanvasStructuredBlockKind;
  readonly block_text: string;
  readonly block_sha256: string;
  readonly heading_level: 1 | 2 | 3 | 4 | 5 | 6 | null;
  readonly list_depth: number | null;
  readonly list_style: "ordered" | "unordered" | null;
  readonly table_structure: CanvasTableStructure | null;
  readonly page_number: number | null;
  readonly slide_number: number | null;
  readonly module_position: number | null;
  readonly parser_version: string | null;
  readonly ocr_version: string | null;
  readonly selectable: boolean;
  readonly selected_by_default: boolean;
}

export interface CanvasStructuredBlockPublic {
  readonly id: string;
  readonly kind: CanvasStructuredBlockKind;
  readonly text: string;
  readonly sourceOrdinal: number;
  readonly blockOrdinal: number;
  readonly headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  readonly listDepth?: number;
  readonly listStyle?: "ordered" | "unordered";
  readonly pageNumber?: number;
  readonly slideNumber?: number;
  readonly modulePosition?: number;
  readonly selectable: boolean;
  readonly selectedByDefault: boolean;
}

export interface CanvasStructuredSourceForAssembly {
  readonly ordinal: number;
  readonly source_type: "page" | "assignment" | "announcement" | "file";
  readonly source_title: string;
  readonly file_kind: "pdf" | "image" | null;
}

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlTextNode = DefaultTreeAdapterMap["textNode"];

const MAX_BLOCK_TEXT_CHARS = 20_000;
const SPLIT_BLOCK_TEXT_CHARS = 10_000;

export function normalizeCanvasHtmlToStructuredBlockDrafts(
  html: string | null,
): readonly CanvasStructuredBlockDraft[] {
  if (!html?.trim()) {
    return [];
  }

  const fragment = parseFragment(html);
  const drafts: CanvasStructuredBlockDraft[] = [];
  walkHtmlChildren(fragment.childNodes, drafts);
  return cleanDraftBlocks(drafts);
}

export function normalizeOcrResultToStructuredBlockDrafts(
  result: OcrResult,
): readonly CanvasStructuredBlockDraft[] {
  const drafts: CanvasStructuredBlockDraft[] = [];

  for (const page of result.pages) {
    const pageNumber = Number.isSafeInteger(page.pageNumber) && page.pageNumber > 0
      ? page.pageNumber
      : 1;
    const blocks = [...page.blocks].sort(
      (left, right) => left.order - right.order,
    );

    if (blocks.length === 0 && page.text.trim()) {
      drafts.push({
        kind: "paragraph",
        pageNumber,
        text: page.text,
      });
      continue;
    }

    for (const block of blocks) {
      const lines =
        block.lines.length > 0
          ? [...block.lines]
              .sort((left, right) => left.order - right.order)
              .map((line) => line.text)
          : block.text.split("\n");
      drafts.push(...createOcrDraftsFromLines(lines, pageNumber, block.text));
    }
  }

  return cleanDraftBlocks(drafts);
}

export function finalizeStructuredBlockDrafts({
  drafts,
  ocrVersion,
  parserVersion,
  sourceOrdinal,
}: {
  readonly drafts: readonly CanvasStructuredBlockDraft[];
  readonly ocrVersion?: string | null;
  readonly parserVersion?: string | null;
  readonly sourceOrdinal: number;
}): readonly CanvasStructuredBlockManifestItem[] {
  const splitDrafts = drafts.flatMap(splitOversizedDraft);

  return splitDrafts.map((draft, index) => {
    const text = sanitizeCanvasPreviewText(draft.text);
    return {
      block_kind: draft.kind,
      block_ordinal: index + 1,
      block_sha256: sha256Utf8Hex(text),
      block_text: text,
      heading_level: draft.headingLevel ?? null,
      id: randomUUID(),
      list_depth: draft.listDepth ?? null,
      list_style: draft.listStyle ?? null,
      module_position: draft.modulePosition ?? null,
      ocr_version: ocrVersion ?? null,
      page_number: draft.pageNumber ?? null,
      parser_version: parserVersion ?? null,
      selectable: draft.selectable ?? true,
      selected_by_default: draft.selectedByDefault ?? true,
      slide_number: draft.slideNumber ?? null,
      source_ordinal: sourceOrdinal,
      table_structure: draft.tableStructure ?? null,
    };
  });
}

export function toPublicStructuredBlock(
  block: CanvasStructuredBlockManifestItem,
): CanvasStructuredBlockPublic {
  return {
    blockOrdinal: block.block_ordinal,
    id: block.id,
    kind: block.block_kind,
    ...(block.heading_level !== null ? { headingLevel: block.heading_level } : {}),
    ...(block.list_depth !== null ? { listDepth: block.list_depth } : {}),
    ...(block.list_style !== null ? { listStyle: block.list_style } : {}),
    ...(block.module_position !== null
      ? { modulePosition: block.module_position }
      : {}),
    ...(block.page_number !== null ? { pageNumber: block.page_number } : {}),
    ...(block.slide_number !== null ? { slideNumber: block.slide_number } : {}),
    selectable: block.selectable,
    selectedByDefault: block.selected_by_default,
    sourceOrdinal: block.source_ordinal,
    text: block.block_text,
  };
}

export function assembleSelectedCanvasBlocks(
  sources: readonly {
    readonly source: CanvasStructuredSourceForAssembly;
    readonly displayOrdinal: number;
    readonly blocks: readonly CanvasStructuredBlockManifestItem[];
  }[],
): string {
  return sources
    .map(({ blocks }) => assembleSourceBlocks(blocks))
    .filter((body) => body.length > 0)
    .join("\n\n");
}

export function assembleSourceBlocks(
  blocks: readonly CanvasStructuredBlockManifestItem[],
): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = formatBlockForPreview(block);
    if (!text) {
      continue;
    }
    if (lines.length > 0 && lines.at(-1) !== "") {
      lines.push("");
    }
    lines.push(text);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isStructuredBlockManifestItem(
  value: unknown,
): value is CanvasStructuredBlockManifestItem {
  if (!isRecord(value)) {
    return false;
  }
  const listDepth = value.list_depth;
  const modulePosition = value.module_position;

  return (
    typeof value.id === "string" &&
    isPositiveInteger(value.source_ordinal) &&
    isPositiveInteger(value.block_ordinal) &&
    isStructuredBlockKind(value.block_kind) &&
    typeof value.block_text === "string" &&
    /^[a-f0-9]{64}$/.test(String(value.block_sha256)) &&
    (value.heading_level === null || isHeadingLevel(value.heading_level)) &&
    (listDepth === null ||
      (typeof listDepth === "number" &&
        Number.isSafeInteger(listDepth) &&
        listDepth >= 0)) &&
    (value.list_style === null ||
      value.list_style === "ordered" ||
      value.list_style === "unordered") &&
    (value.table_structure === null || isTableStructure(value.table_structure)) &&
    (value.page_number === null || isPositiveInteger(value.page_number)) &&
    (value.slide_number === null || isPositiveInteger(value.slide_number)) &&
    (modulePosition === null ||
      (typeof modulePosition === "number" &&
        Number.isSafeInteger(modulePosition) &&
        modulePosition >= 0)) &&
    (value.parser_version === null || typeof value.parser_version === "string") &&
    (value.ocr_version === null || typeof value.ocr_version === "string") &&
    typeof value.selectable === "boolean" &&
    typeof value.selected_by_default === "boolean"
  );
}

function walkHtmlChildren(
  nodes: readonly HtmlNode[],
  drafts: CanvasStructuredBlockDraft[],
): void {
  for (const node of nodes) {
    walkHtmlNode(node, drafts);
  }
}

function walkHtmlNode(
  node: HtmlNode,
  drafts: CanvasStructuredBlockDraft[],
): void {
  if (isTextNode(node)) {
    appendTextParagraph(drafts, node.value);
    return;
  }

  if (!isElementNode(node) || shouldSkipElement(node)) {
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (isHeadingTag(tag)) {
    appendDraft(drafts, {
      headingLevel: Number(tag.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6,
      kind: "heading",
      text: extractVisibleText(node),
    });
    return;
  }

  if (tag === "p") {
    appendDraft(drafts, { kind: "paragraph", text: extractVisibleText(node) });
    return;
  }

  if (tag === "blockquote") {
    appendDraft(drafts, { kind: "quote", text: extractVisibleText(node) });
    return;
  }

  if (tag === "pre") {
    appendDraft(drafts, { kind: "code", text: extractPreText(node) });
    return;
  }

  if (tag === "table") {
    const table = extractTable(node);
    if (table.text) {
      appendDraft(drafts, {
        kind: "table",
        tableStructure: table.structure,
        text: table.text,
      });
    }
    return;
  }

  if (tag === "ol" || tag === "ul") {
    walkList(node, drafts, 0, tag === "ol" ? "ordered" : "unordered");
    return;
  }

  if (tag === "li") {
    appendDraft(drafts, {
      kind: "list_item",
      listDepth: 0,
      listStyle: "unordered",
      text: extractListItemOwnText(node),
    });
    return;
  }

  walkHtmlChildren(node.childNodes, drafts);
}

function walkList(
  list: HtmlElement,
  drafts: CanvasStructuredBlockDraft[],
  depth: number,
  style: "ordered" | "unordered",
): void {
  for (const child of list.childNodes) {
    if (!isElementNode(child) || shouldSkipElement(child)) {
      continue;
    }
    if (child.tagName.toLowerCase() !== "li") {
      walkHtmlNode(child, drafts);
      continue;
    }

    appendDraft(drafts, {
      kind: "list_item",
      listDepth: depth,
      listStyle: style,
      text: extractListItemOwnText(child),
    });

    for (const nested of child.childNodes) {
      if (!isElementNode(nested) || shouldSkipElement(nested)) {
        continue;
      }
      const nestedTag = nested.tagName.toLowerCase();
      if (nestedTag === "ol" || nestedTag === "ul") {
        walkList(
          nested,
          drafts,
          depth + 1,
          nestedTag === "ol" ? "ordered" : "unordered",
        );
      }
    }
  }
}

function createOcrDraftsFromLines(
  rawLines: readonly string[],
  pageNumber: number,
  fallbackText: string,
): readonly CanvasStructuredBlockDraft[] {
  const lines = rawLines
    .map((line) => sanitizeCanvasPreviewText(line))
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    const text = sanitizeCanvasPreviewText(fallbackText);
    return text ? [{ kind: "paragraph", pageNumber, text }] : [];
  }

  if (lines.every(isUnorderedListLine)) {
    return lines.map((line) => ({
      kind: "list_item",
      listDepth: 0,
      listStyle: "unordered",
      pageNumber,
      text: line.replace(/^[-*+]\s+/, "").trim(),
    }));
  }

  if (lines.every(isOrderedListLine)) {
    return lines.map((line) => ({
      kind: "list_item",
      listDepth: 0,
      listStyle: "ordered",
      pageNumber,
      text: line.replace(/^\d+[.)]\s+/, "").trim(),
    }));
  }

  if (lines.length === 1 && isUnorderedListLine(lines[0])) {
    return [
      {
        kind: "list_item",
        listDepth: 0,
        listStyle: "unordered",
        pageNumber,
        text: lines[0].replace(/^[-*+]\s+/, "").trim(),
      },
    ];
  }

  if (lines.length === 1 && isOrderedListLine(lines[0])) {
    return [
      {
        kind: "list_item",
        listDepth: 0,
        listStyle: "ordered",
        pageNumber,
        text: lines[0].replace(/^\d+[.)]\s+/, "").trim(),
      },
    ];
  }

  return [
    {
      kind: "paragraph",
      pageNumber,
      text: lines.join("\n"),
    },
  ];
}

function splitOversizedDraft(
  draft: CanvasStructuredBlockDraft,
): readonly CanvasStructuredBlockDraft[] {
  const text = sanitizeCanvasPreviewText(draft.text);
  if (text.length <= SPLIT_BLOCK_TEXT_CHARS || draft.kind === "table") {
    return [{ ...draft, text }];
  }

  const chunks = splitTextSafely(text, SPLIT_BLOCK_TEXT_CHARS);
  return chunks.map((chunk) => ({ ...draft, text: chunk }));
}

function splitTextSafely(text: string, maximum: number): readonly string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maximum) {
    const window = remaining.slice(0, maximum + 1);
    const lineBreak = window.lastIndexOf("\n");
    const sentence = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
    );
    const space = window.lastIndexOf(" ");
    const splitAt =
      lineBreak > maximum * 0.5
        ? lineBreak
        : sentence > maximum * 0.5
          ? sentence + 1
          : space > maximum * 0.5
            ? space
            : maximum;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }
  return chunks.filter((chunk) => chunk.length > 0);
}

function cleanDraftBlocks(
  drafts: readonly CanvasStructuredBlockDraft[],
): readonly CanvasStructuredBlockDraft[] {
  return drafts
    .map((draft) => ({
      ...draft,
      text: sanitizeCanvasPreviewText(draft.text),
    }))
    .filter((draft) => draft.text.length > 0);
}

function appendDraft(
  drafts: CanvasStructuredBlockDraft[],
  draft: CanvasStructuredBlockDraft,
): void {
  const text = sanitizeCanvasPreviewText(draft.text);
  if (!text) {
    return;
  }
  drafts.push({ ...draft, text });
}

function appendTextParagraph(
  drafts: CanvasStructuredBlockDraft[],
  value: string,
): void {
  const text = sanitizeCanvasPreviewText(value);
  if (text) {
    drafts.push({ kind: "paragraph", text });
  }
}

function extractVisibleText(node: HtmlNode): string {
  if (isTextNode(node)) {
    return node.value;
  }
  if (!isElementNode(node) || shouldSkipElement(node)) {
    return "";
  }
  const tag = node.tagName.toLowerCase();
  if (tag === "br") {
    return "\n";
  }
  if (tag === "table") {
    return extractTable(node).text;
  }
  return node.childNodes.map(extractVisibleText).join(" ");
}

function extractPreText(node: HtmlElement): string {
  return node.childNodes
    .map((child) => (isTextNode(child) ? child.value : extractVisibleText(child)))
    .join("");
}

function extractListItemOwnText(node: HtmlElement): string {
  return node.childNodes
    .filter(
      (child) =>
        !isElementNode(child) ||
        !["ol", "ul"].includes(child.tagName.toLowerCase()),
    )
    .map(extractVisibleText)
    .join(" ");
}

function extractTable(node: HtmlElement): {
  readonly text: string;
  readonly structure: CanvasTableStructure;
} {
  const rows: CanvasTableRow[] = [];
  collectTableRows(node, rows);
  const text = rows
    .map((row) => row.cells.map((cell) => cell.text).join(" | "))
    .filter((line) => line.trim().length > 0)
    .join("\n");
  return {
    structure: { rows },
    text,
  };
}

function collectTableRows(node: HtmlNode, rows: CanvasTableRow[]): void {
  if (!isElementNode(node) || shouldSkipElement(node)) {
    return;
  }
  const tag = node.tagName.toLowerCase();
  if (tag === "tr") {
    const cells = node.childNodes
      .filter(isElementNode)
      .filter((child) => {
        const childTag = child.tagName.toLowerCase();
        return childTag === "td" || childTag === "th";
      })
      .map((cell) => ({
        header: cell.tagName.toLowerCase() === "th",
        text: sanitizeCanvasPreviewText(extractVisibleText(cell)),
      }))
      .filter((cell) => cell.text.length > 0);
    if (cells.length > 0) {
      rows.push({ cells });
    }
    return;
  }

  for (const child of node.childNodes) {
    collectTableRows(child, rows);
  }
}

function formatBlockForPreview(
  block: CanvasStructuredBlockManifestItem,
): string {
  switch (block.block_kind) {
    case "heading": {
      const level = block.heading_level ?? 2;
      return `${"#".repeat(level)} ${block.block_text}`;
    }
    case "list_item": {
      const depth = block.list_depth ?? 0;
      const marker = block.list_style === "ordered" ? "1." : "-";
      return `${"  ".repeat(depth)}${marker} ${block.block_text}`;
    }
    case "table":
      return block.block_text;
    case "quote":
      return block.block_text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "code":
      return ["```", block.block_text, "```"].join("\n");
    case "paragraph":
      return block.block_text;
  }
}

function shouldSkipElement(node: HtmlElement): boolean {
  const tag = node.tagName.toLowerCase();
  if (
    tag === "script" ||
    tag === "style" ||
    tag === "form" ||
    tag === "input" ||
    tag === "button" ||
    tag === "select" ||
    tag === "textarea" ||
    tag === "iframe" ||
    tag === "object" ||
    tag === "embed" ||
    tag === "svg" ||
    tag === "canvas"
  ) {
    return true;
  }

  const hidden = getAttribute(node, "hidden");
  const ariaHidden = getAttribute(node, "aria-hidden");
  const style = (getAttribute(node, "style")?.toLowerCase() ?? "").replace(
    /\s+/g,
    "",
  );
  return (
    hidden !== null ||
    ariaHidden === "true" ||
    style.includes("display:none") ||
    style.includes("visibility:hidden")
  );
}

function getAttribute(node: HtmlElement, name: string): string | null {
  const attribute = node.attrs.find(
    (entry) => entry.name.toLowerCase() === name.toLowerCase(),
  );
  return attribute?.value ?? null;
}

function isHeadingTag(tag: string): boolean {
  return /^h[1-6]$/.test(tag);
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return node.nodeName === "#text" && "value" in node;
}

function isElementNode(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray(node.childNodes);
}

function isUnorderedListLine(line: string): boolean {
  return /^[-*+]\s+\S/.test(line);
}

function isOrderedListLine(line: string): boolean {
  return /^\d+[.)]\s+\S/.test(line);
}

function isStructuredBlockKind(
  value: unknown,
): value is CanvasStructuredBlockKind {
  return (
    value === "heading" ||
    value === "paragraph" ||
    value === "list_item" ||
    value === "table" ||
    value === "quote" ||
    value === "code"
  );
}

function isTableStructure(value: unknown): value is CanvasTableStructure {
  return (
    isRecord(value) &&
    Array.isArray(value.rows) &&
    value.rows.every(
      (row) =>
        isRecord(row) &&
        Array.isArray(row.cells) &&
        row.cells.every(
          (cell) =>
            isRecord(cell) &&
            typeof cell.text === "string" &&
            typeof cell.header === "boolean",
        ),
    )
  );
}

function isHeadingLevel(value: unknown): value is 1 | 2 | 3 | 4 | 5 | 6 {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
  );
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Utf8Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isBlockTextWithinSnapshotLimit(
  block: CanvasStructuredBlockManifestItem,
): boolean {
  return block.block_kind !== "table" || block.block_text.length <= MAX_BLOCK_TEXT_CHARS;
}
