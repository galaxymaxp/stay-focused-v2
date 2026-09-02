import {
  structuredBlockText,
  type ParserDiagnostic,
  type StructuredDocument,
  type StructuredParserName,
} from "./structured-document.js";

export type DocumentParserMode = "legacy" | "docling" | "hybrid";

export type DocumentClass =
  | "born-digital"
  | "code-heavy"
  | "formula-table-heavy"
  | "scanned-ocr-heavy"
  | "unknown";

export interface DocumentSignals {
  readonly pageCount: number;
  readonly nativeTextPageCount: number;
  readonly ocrRequiredPageCount: number;
  readonly nativeTextCharacterCount: number;
  readonly blankPageCount?: number;
  readonly codeRegionCount?: number;
  readonly formulaRegionCount?: number;
  readonly tableRegionCount?: number;
  readonly imageDominantPageCount?: number;
}

export interface DocumentInput {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  readonly pageCount: number;
  readonly fileName?: string;
  readonly sourceId?: string;
  readonly title?: string;
  readonly signals: DocumentSignals;
}

export interface ParserCapability {
  readonly available: boolean;
  readonly confidence: number;
  readonly diagnostics?: readonly ParserDiagnostic[];
}

export interface DocumentParser {
  readonly name: StructuredParserName;
  canParse(input: DocumentInput): Promise<ParserCapability>;
  parse(input: DocumentInput): Promise<StructuredDocument>;
}

export interface ParserQualityReport {
  readonly accepted: boolean;
  readonly emptyPageRatio: number;
  readonly textLossRatio: number | null;
  readonly unparseableTableCount: number;
  readonly formulaAnomalyCount: number;
  readonly brokenReadingOrderCount: number;
  readonly lowOcrConfidenceBlockCount: number;
  readonly diagnostics: readonly ParserDiagnostic[];
}

export type ParserAttemptOutcome =
  | "unavailable"
  | "parse-failed"
  | "quality-rejected"
  | "accepted";

export interface ParserAttempt {
  readonly parser: StructuredParserName;
  readonly outcome: ParserAttemptOutcome;
  readonly quality?: ParserQualityReport;
  readonly diagnostics: readonly ParserDiagnostic[];
}

export interface DocumentRoutingResult {
  readonly classification: DocumentClass;
  readonly selectedParser: StructuredParserName;
  readonly document: StructuredDocument;
  readonly attempts: readonly ParserAttempt[];
}

export interface DocumentParserSet {
  readonly legacy: DocumentParser;
  readonly docling?: DocumentParser;
  readonly mineru?: DocumentParser;
}

export function classifyDocument(signals: DocumentSignals): DocumentClass {
  const pageCount = Math.max(1, signals.pageCount - (signals.blankPageCount ?? 0));
  const ocrRatio = signals.ocrRequiredPageCount / pageCount;
  const nativeRatio = signals.nativeTextPageCount / pageCount;
  const imageRatio = (signals.imageDominantPageCount ?? 0) / pageCount;
  const formulaTableRegions =
    (signals.formulaRegionCount ?? 0) + (signals.tableRegionCount ?? 0);
  const codeRegions = signals.codeRegionCount ?? 0;

  if (ocrRatio >= 0.5 || nativeRatio < 0.4 || imageRatio >= 0.5) {
    return "scanned-ocr-heavy";
  }
  if (formulaTableRegions >= Math.max(2, Math.ceil(pageCount * 0.4))) {
    return "formula-table-heavy";
  }
  if (codeRegions >= Math.max(2, Math.ceil(pageCount * 0.2))) {
    return "code-heavy";
  }
  if (nativeRatio >= 0.75 && signals.nativeTextCharacterCount > 0) {
    return "born-digital";
  }
  return "unknown";
}

export function parserOrderFor(
  mode: DocumentParserMode,
  classification: DocumentClass,
): readonly StructuredParserName[] {
  if (mode === "legacy") return ["legacy"];
  if (mode === "docling") return ["docling", "legacy"];
  if (
    classification === "scanned-ocr-heavy" ||
    classification === "formula-table-heavy"
  ) {
    return ["mineru", "legacy"];
  }
  return ["docling", "mineru", "legacy"];
}

export async function routeDocument({
  input,
  mode,
  parsers,
}: {
  readonly input: DocumentInput;
  readonly mode: DocumentParserMode;
  readonly parsers: DocumentParserSet;
}): Promise<DocumentRoutingResult> {
  const classification = classifyDocument(input.signals);
  const attempts: ParserAttempt[] = [];

  for (const parserName of parserOrderFor(mode, classification)) {
    const parser = parsers[parserName];
    if (!parser) {
      attempts.push({
        parser: parserName,
        outcome: "unavailable",
        diagnostics: [safeDiagnostic("parser_unavailable", "Parser is unavailable.")],
      });
      continue;
    }

    let capability: ParserCapability;
    try {
      capability = await parser.canParse(input);
    } catch {
      attempts.push({
        parser: parserName,
        outcome: "unavailable",
        diagnostics: [safeDiagnostic("parser_capability_failed", "Parser capability check failed.")],
      });
      continue;
    }
    if (!capability.available) {
      attempts.push({
        parser: parserName,
        outcome: "unavailable",
        diagnostics: capability.diagnostics ?? [
          safeDiagnostic("parser_unavailable", "Parser is unavailable."),
        ],
      });
      continue;
    }

    let document: StructuredDocument;
    try {
      document = await parser.parse(input);
    } catch {
      attempts.push({
        parser: parserName,
        outcome: "parse-failed",
        diagnostics: [safeDiagnostic("parser_failed", "Parser execution failed.")],
      });
      continue;
    }

    const quality = evaluateParserQuality(document, input.signals);
    if (!quality.accepted && parserName !== "legacy") {
      attempts.push({
        parser: parserName,
        outcome: "quality-rejected",
        quality,
        diagnostics: quality.diagnostics,
      });
      continue;
    }

    attempts.push({
      parser: parserName,
      outcome: "accepted",
      quality,
      diagnostics: quality.diagnostics,
    });
    return {
      classification,
      selectedParser: parserName,
      document,
      attempts,
    };
  }

  throw new DocumentParserRoutingError(attempts);
}

export function evaluateParserQuality(
  document: StructuredDocument,
  signals?: DocumentSignals,
): ParserQualityReport {
  const pages = document.pages.slice().sort((left, right) => left.pageNumber - right.pageNumber);
  const parsedEmptyPageCount = pages.filter(
    (page) => page.blocks.every((block) => !structuredBlockText(block)),
  ).length;
  const expectedBlankPageCount = Math.max(0, signals?.blankPageCount ?? 0);
  const emptyPageCount = Math.max(0, parsedEmptyPageCount - expectedBlankPageCount);
  const emptyPageRatio = emptyPageCount /
    Math.max(1, document.pageCount - expectedBlankPageCount);
  const extractedCharacters = pages.reduce(
    (total, page) =>
      total + page.blocks.reduce((pageTotal, block) => pageTotal + structuredBlockText(block).length, 0),
    0,
  );
  const nativeCharacters = signals?.nativeTextCharacterCount ?? 0;
  const textLossRatio = nativeCharacters > 0
    ? Math.max(0, 1 - extractedCharacters / nativeCharacters)
    : null;
  const tables = pages.flatMap((page) => page.blocks).filter((block) => block.type === "table");
  const formulas = pages.flatMap((page) => page.blocks).filter((block) => block.type === "formula");
  const blocks = pages.flatMap((page) => page.blocks);
  const ocrConfidenceBlocks = blocks.filter(
    (block) => block.textOrigin === "ocr" && block.confidence !== undefined,
  );
  const lowOcrConfidenceBlockCount = ocrConfidenceBlocks.filter(
    (block) => (block.confidence ?? 1) < 0.5,
  ).length;
  const unparseableTableCount = tables.filter(
    (table) => table.rows.length === 0 || table.rows.every((row) => row.cells.length === 0),
  ).length;
  const formulaAnomalyCount = formulas.filter(
    (formula) => !formula.rawText.trim() && !formula.latex?.trim(),
  ).length;
  const brokenReadingOrderCount = pages.reduce((total, page) => {
    const orders = page.blocks.map((block) => block.order);
    return total + orders.filter((order, index) => index > 0 && order <= (orders[index - 1] ?? -1)).length;
  }, 0);
  const fatalDiagnostics = document.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "fatal",
  );
  const diagnostics: ParserDiagnostic[] = [...fatalDiagnostics];

  if (document.pages.length !== document.pageCount) {
    diagnostics.push(safeDiagnostic("page_count_mismatch", "Parser page coverage is incomplete."));
  }
  if (emptyPageRatio > 0.25) {
    diagnostics.push(safeDiagnostic("empty_page_ratio_high", "Too many parsed pages are empty."));
  }
  if (textLossRatio !== null && textLossRatio > 0.45) {
    diagnostics.push(safeDiagnostic("text_loss_ratio_high", "Parsed text is substantially incomplete."));
  }
  if (unparseableTableCount > 0) {
    diagnostics.push(safeDiagnostic("unparseable_table", "One or more tables have no usable cells."));
  }
  if (formulaAnomalyCount > 0) {
    diagnostics.push(safeDiagnostic("formula_anomaly", "One or more formulas have no source representation."));
  }
  if (brokenReadingOrderCount > 0) {
    diagnostics.push(safeDiagnostic("broken_reading_order", "Block reading order is not strictly increasing."));
  }
  if (
    ocrConfidenceBlocks.length > 0 &&
    lowOcrConfidenceBlockCount / ocrConfidenceBlocks.length > 0.25
  ) {
    diagnostics.push(safeDiagnostic("ocr_confidence_low", "OCR confidence is too low for multiple blocks."));
  }
  if (extractedCharacters === 0) {
    diagnostics.push(safeDiagnostic("empty_document", "Parser produced no readable document content."));
  }

  return {
    accepted: diagnostics.length === 0,
    emptyPageRatio,
    textLossRatio,
    unparseableTableCount,
    formulaAnomalyCount,
    brokenReadingOrderCount,
    lowOcrConfidenceBlockCount,
    diagnostics,
  };
}

export class DocumentParserRoutingError extends Error {
  public readonly attempts: readonly ParserAttempt[];

  public constructor(attempts: readonly ParserAttempt[]) {
    super("No document parser produced an acceptable result.");
    this.name = "DocumentParserRoutingError";
    this.attempts = attempts;
  }
}

function safeDiagnostic(code: string, message: string): ParserDiagnostic {
  return { code, message, severity: "warning" };
}
