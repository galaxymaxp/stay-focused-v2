import {
  DoclingDocumentParser,
  DocumentParserRoutingError,
  MinerUDocumentParser,
  routeDocument,
  structuredDocumentText,
  structuredDocumentToNormalizationInput,
  type DocumentInput,
  type DocumentSignals,
  type DocumentRoutingResult,
  type ParserAttempt,
  type StructuredDocument,
} from "@stay-focused/engine";

import { readDocumentParserConfig, type DocumentParserConfig } from "./config";
import { createSubprocessParserBridge } from "./subprocess-bridge";

export interface StructuredParserAttemptResult {
  readonly document: StructuredDocument | null;
  readonly selectedParser: "docling" | "mineru" | null;
  readonly attempts: readonly ParserAttempt[];
  readonly durationMs: number;
}

export interface InspectedTextPage {
  readonly kind: "native_text" | "ocr" | "blank";
  readonly text: string;
}

export function createDocumentSignalsFromInspections(
  pages: readonly InspectedTextPage[],
): DocumentSignals {
  const nativePages = pages.filter((page) => page.kind === "native_text");
  const ocrPages = pages.filter((page) => page.kind === "ocr");
  const blankPages = pages.filter((page) => page.kind === "blank");
  const lines = nativePages.flatMap((page) => page.text.split(/\r?\n/u));
  return {
    pageCount: pages.length,
    nativeTextPageCount: nativePages.length,
    ocrRequiredPageCount: ocrPages.length,
    nativeTextCharacterCount: nativePages.reduce((total, page) => total + page.text.length, 0),
    blankPageCount: blankPages.length,
    imageDominantPageCount: ocrPages.length,
    codeRegionCount: lines.filter((line) => /^\s{2,}\S/u.test(line) || /[{}()[\];=]{3,}/u.test(line)).length,
    formulaRegionCount: lines.filter((line) => /[∑Σ√±×÷]|(?:[=+*/^]\s*){2,}/u.test(line)).length,
    tableRegionCount: lines.filter((line) => /\S\s{2,}\S\s{2,}\S/u.test(line) || (line.match(/\|/g)?.length ?? 0) >= 2).length,
  };
}

export async function tryParseStructuredPdf(
  input: DocumentInput,
  config: DocumentParserConfig = readDocumentParserConfig(),
): Promise<StructuredParserAttemptResult> {
  const startedAt = Date.now();
  if (config.mode === "legacy") {
    return { document: null, selectedParser: null, attempts: [], durationMs: 0 };
  }
  const parsers = {
    legacy: unavailableLegacyParser,
    ...(config.docling
      ? { docling: new DoclingDocumentParser(createSubprocessParserBridge({ parser: "docling", ...config.docling, timeoutMs: config.timeoutMs })) }
      : {}),
    ...(config.mineru
      ? { mineru: new MinerUDocumentParser(createSubprocessParserBridge({ parser: "mineru", ...config.mineru, timeoutMs: config.timeoutMs })) }
      : {}),
  };
  try {
    const result: DocumentRoutingResult = await routeDocument({ input, mode: config.mode, parsers });
    if (result.selectedParser === "legacy") {
      return { document: null, selectedParser: null, attempts: result.attempts, durationMs: Date.now() - startedAt };
    }
    return {
      document: result.document,
      selectedParser: result.selectedParser,
      attempts: result.attempts,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      document: null,
      selectedParser: null,
      attempts: error instanceof DocumentParserRoutingError ? error.attempts : [],
      durationMs: Date.now() - startedAt,
    };
  }
}

export function createStructuredExtractionPayload(
  document: StructuredDocument,
  mimeType: string,
): Record<string, unknown> {
  const normalizationInput = structuredDocumentToNormalizationInput(document);
  const text = normalizationInput.blocks?.map((block) => block.text).join("\n\n") ??
    structuredDocumentText(document);
  const blockTextById = new Map(
    (normalizationInput.blocks ?? []).flatMap((block) =>
      block.id ? [[block.id, block.text] as const] : []
    ),
  );
  return {
    text,
    sourceBlocks: normalizationInput.blocks ?? [],
    structuredDocument: document,
    rawText: text,
    rawPages: document.pages.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.blocks.map((block) => blockTextById.get(block.id) ?? "")
        .filter(Boolean)
        .join("\n\n"),
      method: document.parser.ocrUsed ? "ocr" : "native_text",
    })),
    mimeType,
    pageCount: document.pageCount,
    processedPageCount: document.pages.length,
    provider: `structured-parser:${document.parser.name}`,
    warnings: document.diagnostics.filter((diagnostic) => diagnostic.severity !== "info"),
    normalization: {
      structured: true,
      parser: document.parser.name,
      blockCount: normalizationInput.blocks?.length ?? 0,
    },
  };
}

const unavailableLegacyParser = {
  name: "legacy" as const,
  canParse: async () => ({ available: false, confidence: 0 }),
  parse: async (): Promise<StructuredDocument> => {
    throw new Error("Legacy extraction is handled by the existing extraction path.");
  },
};
