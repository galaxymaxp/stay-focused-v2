import {
  OCR_PDF_MIME_TYPE,
  OCR_SUPPORTED_IMAGE_MIME_TYPES,
  OcrProviderError,
  createFailedDocumentExtractionDiagnostics,
  verifyDocumentExtraction,
  type DocumentExtractionDiagnostics,
  type OcrImageMimeType,
  type OcrInput,
  type OcrPage,
  type OcrPdfInput,
  type OcrProvider,
  type OcrResult,
  type OcrWarning,
} from "@stay-focused/ocr";

import {
  createRequestedPdfPages,
  hasPdfSignature,
  readPdfPageCount,
} from "@/lib/ocr/pdf-validation";
import {
  createPdfOcrChunks,
  mapWithConcurrency,
  type PdfOcrChunk,
} from "@/lib/ocr/pdf-chunking";
import {
  inspectPdfTextPages,
  type PdfPageInspection,
} from "@/lib/ocr/pdf-native-text";
import {
  DOCUMENT_EXTRACTION_TIMEOUT_MS,
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
  OCR_PDF_CHUNK_CONCURRENCY,
  OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST,
  OCR_PROVIDER_REQUEST_TIMEOUT_MS,
  getConfiguredDocumentMaxPdfPages,
} from "@/lib/ocr/upload-policy";

export type OcrProviderFailureCode =
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "pdf_ocr_page_limit_exceeded"
  | "document_extraction_incomplete"
  | "document_unreadable"
  | "document_extraction_timeout"
  | "internal_error";

export interface OcrProviderFailure {
  readonly code: OcrProviderFailureCode;
  readonly extraction: DocumentExtractionDiagnostics;
}

export type ImageOcrValidationFailureCode =
  | "empty_image"
  | "image_too_large"
  | "unsupported_media_type";

export type PdfOcrValidationFailureCode =
  | "empty_file"
  | "file_too_large"
  | "invalid_pdf"
  | "pdf_encrypted"
  | "pdf_page_limit_exceeded"
  | "unsupported_file_type";

export type ImageOcrValidationResult =
  | {
      readonly ok: true;
      readonly input: Extract<OcrInput, { readonly kind: "image" }>;
    }
  | {
      readonly ok: false;
      readonly code: ImageOcrValidationFailureCode;
    };

export type PdfOcrValidationResult =
  | {
      readonly ok: true;
      readonly input: OcrPdfInput;
      readonly pageCount: number;
      readonly requestedPages: readonly number[];
    }
  | {
      readonly ok: false;
      readonly code: PdfOcrValidationFailureCode;
      readonly documentPageLimit?: number;
    };

export type OcrExtractionResult =
  | {
      readonly ok: true;
      readonly result: OcrResult;
      readonly extraction: DocumentExtractionDiagnostics;
    }
  | { readonly ok: false; readonly failure: OcrProviderFailure };

export interface DocumentExtractionProgress {
  readonly stage:
    | "inspecting_document"
    | "extracting_native_text"
    | "preparing_ocr_chunks"
    | "extracting_ocr"
    | "verifying_pages"
    | "assembling_text";
  readonly completedPages?: number;
  readonly totalPages?: number;
  readonly ocrChunkCount?: number;
}

export interface PreparedPdfOcrChunkResult {
  readonly pages: readonly OcrPage[];
  readonly warnings: readonly OcrWarning[];
  readonly providerId: string;
}

export class DocumentExtractionCancellationError extends Error {
  public constructor() {
    super("Document extraction was cancelled.");
    this.name = "DocumentExtractionCancellationError";
  }
}

export function validateImageOcrBytes({
  bytes,
  fileName,
  mimeType,
}: {
  readonly bytes: Uint8Array;
  readonly fileName?: string;
  readonly mimeType: string;
}): ImageOcrValidationResult {
  if (!isSupportedImageMimeType(mimeType)) {
    return { ok: false, code: "unsupported_media_type" };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, code: "empty_image" };
  }
  if (bytes.byteLength > OCR_MAX_IMAGE_BYTES) {
    return { ok: false, code: "image_too_large" };
  }

  return {
    ok: true,
    input: {
      bytes,
      kind: "image",
      mimeType,
      ...(fileName ? { fileName } : {}),
    },
  };
}

export async function validatePdfOcrBytes({
  bytes,
  documentMaxPages = getConfiguredDocumentMaxPdfPages(),
  fileName,
  mimeType,
}: {
  readonly bytes: Uint8Array;
  readonly documentMaxPages?: number;
  readonly fileName?: string;
  readonly mimeType: string;
}): Promise<PdfOcrValidationResult> {
  if (mimeType !== OCR_PDF_MIME_TYPE) {
    return { ok: false, code: "unsupported_file_type" };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, code: "empty_file" };
  }
  if (bytes.byteLength > OCR_MAX_PDF_BYTES) {
    return { ok: false, code: "file_too_large" };
  }
  if (!hasPdfSignature(bytes)) {
    return { ok: false, code: "invalid_pdf" };
  }

  const pageCount = await readPdfPageCount(bytes);
  if (!pageCount.ok) {
    return { ok: false, code: pageCount.code };
  }
  if (pageCount.pageCount < 1) {
    return { ok: false, code: "invalid_pdf" };
  }
  if (pageCount.pageCount > documentMaxPages) {
    return {
      ok: false,
      code: "pdf_page_limit_exceeded",
      documentPageLimit: documentMaxPages,
    };
  }

  const requestedPages = createRequestedPdfPages(pageCount.pageCount);
  return {
    ok: true,
    input: {
      bytes,
      kind: "pdf",
      mimeType: OCR_PDF_MIME_TYPE,
      requestedPages,
      ...(fileName ? { fileName } : {}),
    },
    pageCount: pageCount.pageCount,
    requestedPages,
  };
}

export async function extractPdfDocument({
  getProvider,
  input,
  pageCount,
  options = {},
}: {
  readonly getProvider: () => OcrProvider;
  readonly input: OcrPdfInput;
  readonly pageCount: number;
  readonly options?: {
    readonly chunkConcurrency?: number;
    readonly documentTimeoutMs?: number;
    readonly providerRequestTimeoutMs?: number;
    readonly maxOcrPages?: number;
    readonly onProgress?: (
      progress: DocumentExtractionProgress,
    ) => void | Promise<void>;
    readonly shouldCancel?: () => boolean | Promise<boolean>;
  };
}): Promise<OcrExtractionResult> {
  const documentTimeoutMs =
    options.documentTimeoutMs ?? DOCUMENT_EXTRACTION_TIMEOUT_MS;

  try {
    return await withTimeout(
      extractPdfDocumentWithinDeadline({
        chunkConcurrency:
          options.chunkConcurrency ?? OCR_PDF_CHUNK_CONCURRENCY,
        getProvider,
        input,
        maxOcrPages: options.maxOcrPages,
        pageCount,
        providerRequestTimeoutMs:
          options.providerRequestTimeoutMs ?? OCR_PROVIDER_REQUEST_TIMEOUT_MS,
        onProgress: options.onProgress,
        shouldCancel: options.shouldCancel,
      }),
      documentTimeoutMs,
    );
  } catch (error) {
    if (error instanceof DocumentExtractionCancellationError) {
      throw error;
    }
    if (error instanceof ExtractionTimeoutError) {
      return {
        ok: false,
        failure: {
          code: "document_extraction_timeout",
          extraction: createFailedDocumentExtractionDiagnostics({
            expectedPageCount: pageCount,
            failureCategory: "timeout",
          }),
        },
      };
    }
    return {
      ok: false,
      failure: mapOcrProviderError(error, pageCount),
    };
  }
}

export function createInspectedPdfPages(
  inspections: readonly PdfPageInspection[],
): readonly OcrPage[] {
  return inspections.flatMap((page) => {
    if (page.kind === "native_text") {
      return [createNativeTextPage(page.pageNumber, page.text)];
    }
    if (page.kind === "blank") {
      return [createBlankPage(page.pageNumber)];
    }
    return [];
  });
}

export async function extractPreparedPdfOcrChunk({
  bytes,
  fileName,
  getProvider,
  originalPageNumbers,
  timeoutMs,
}: {
  readonly bytes: Uint8Array;
  readonly fileName?: string;
  readonly getProvider: () => OcrProvider;
  readonly originalPageNumbers: readonly number[];
  readonly timeoutMs: number;
}): Promise<PreparedPdfOcrChunkResult> {
  const chunks = await createPdfOcrChunks({
    bytes,
    pageNumbers: originalPageNumbers,
    pagesPerChunk: Math.max(1, originalPageNumbers.length),
  });
  const chunk = chunks[0];
  if (!chunk) {
    return { pages: [], warnings: [], providerId: "none" };
  }
  const provider = getProvider();
  const result = await extractOcrChunk({
    chunk,
    fileName,
    provider,
    timeoutMs,
  });
  return {
    ...result,
    providerId: provider.id,
  };
}

async function extractPdfDocumentWithinDeadline({
  chunkConcurrency,
  getProvider,
  input,
  maxOcrPages,
  onProgress,
  pageCount,
  providerRequestTimeoutMs,
  shouldCancel,
}: {
  readonly chunkConcurrency: number;
  readonly getProvider: () => OcrProvider;
  readonly input: OcrPdfInput;
  readonly maxOcrPages?: number;
  readonly pageCount: number;
  readonly providerRequestTimeoutMs: number;
  readonly onProgress?: (
    progress: DocumentExtractionProgress,
  ) => void | Promise<void>;
  readonly shouldCancel?: () => boolean | Promise<boolean>;
}): Promise<OcrExtractionResult> {
  await assertExtractionNotCancelled(shouldCancel);
  await onProgress?.({
    stage: "inspecting_document",
    completedPages: 0,
    totalPages: pageCount,
  });
  let inspections: readonly PdfPageInspection[];
  const warnings: OcrWarning[] = [];
  try {
    inspections = await inspectPdfTextPages(input.bytes, pageCount);
  } catch {
    inspections = createRequestedPdfPages(pageCount).map((pageNumber) => ({
      pageNumber,
      kind: "ocr" as const,
      text: "" as const,
    }));
    warnings.push({
      code: "native_text_unavailable",
      message: "Embedded PDF text could not be inspected; affected pages used OCR.",
    });
  }

  await assertExtractionNotCancelled(shouldCancel);
  const inspectedPageCount = inspections.filter(
    (page) => page.kind === "native_text" || page.kind === "blank",
  ).length;
  await onProgress?.({
    stage: "extracting_native_text",
    completedPages: inspectedPageCount,
    totalPages: pageCount,
  });

  const pages: OcrPage[] = [...createInspectedPdfPages(inspections)];
  const incompleteNativeTextByPage = new Map(
    inspections.flatMap((page) =>
      page.kind === "ocr" && page.reason === "layout_incomplete" && page.nativeText
        ? [[page.pageNumber, page.nativeText] as const]
        : [],
    ),
  );
  for (const [pageNumber] of incompleteNativeTextByPage) {
    warnings.push({
      code: "native_text_layout_incomplete",
      pageNumber,
      message: "Sparse embedded text did not account for the page's visual content; OCR supplemented the page.",
    });
  }
  const ocrPageNumbers = inspections
    .filter((page) => page.kind === "ocr")
    .map((page) => page.pageNumber);
  if (
    maxOcrPages !== undefined &&
    ocrPageNumbers.length > maxOcrPages
  ) {
    const nativeTextPageCount = inspections.filter(
      (page) => page.kind === "native_text",
    ).length;
    const blankPageCount = inspections.filter(
      (page) => page.kind === "blank",
    ).length;
    return {
      ok: false,
      failure: {
        code: "pdf_ocr_page_limit_exceeded",
        extraction: {
          status: "failed",
          expectedPageCount: pageCount,
          processedPageCount: nativeTextPageCount + blankPageCount,
          successfulPageCount: nativeTextPageCount,
          blankPageCount,
          failedPageCount: 0,
          missingPageNumbers: ocrPageNumbers,
          duplicatePageNumbers: [],
          outOfRangePageNumbers: [],
          invalidPageNumbers: [],
          affectedPageNumbers: ocrPageNumbers,
          failureCategories: ["ocr_page_limit_exceeded"],
          extractionMode: nativeTextPageCount > 0 ? "mixed" : "ocr",
          nativeTextPageCount,
          ocrPageCount: ocrPageNumbers.length,
          ocrChunkCount: 0,
          ocrChunks: [],
        },
      },
    };
  }

  let providerId = "pdfjs-native-text";
  let chunks: readonly PdfOcrChunk[] = [];
  if (ocrPageNumbers.length > 0) {
    await assertExtractionNotCancelled(shouldCancel);
    await onProgress?.({
      stage: "preparing_ocr_chunks",
      completedPages: inspectedPageCount,
      totalPages: pageCount,
    });
    let provider: OcrProvider;
    try {
      provider = getProvider();
    } catch (error) {
      return {
        ok: false,
        failure: mapOcrProviderError(error, pageCount),
      };
    }
    providerId =
      pages.some((page) => page.method === "native_text")
        ? `pdfjs-native-text+${provider.id}`
        : provider.id;
    chunks = await createPdfOcrChunks({
      bytes: input.bytes,
      pageNumbers: ocrPageNumbers,
      pagesPerChunk: OCR_PROVIDER_MAX_PDF_PAGES_PER_REQUEST,
    });
    let processedPageCount = inspectedPageCount;
    await onProgress?.({
      stage: "extracting_ocr",
      completedPages: processedPageCount,
      totalPages: pageCount,
      ocrChunkCount: chunks.length,
    });
    const chunkResults = await mapWithConcurrency(
      chunks,
      chunkConcurrency,
      async (chunk) => {
        await assertExtractionNotCancelled(shouldCancel);
        const chunkResult = await extractOcrChunk({
          chunk,
          fileName: input.fileName,
          provider,
          timeoutMs: providerRequestTimeoutMs,
        });
        processedPageCount += chunk.originalPageNumbers.length;
        await onProgress?.({
          stage: "extracting_ocr",
          completedPages: Math.min(processedPageCount, pageCount),
          totalPages: pageCount,
          ocrChunkCount: chunks.length,
        });
        return chunkResult;
      },
    );
    for (const chunkResult of chunkResults) {
      pages.push(...chunkResult.pages.map((page) =>
        supplementOcrPage(page, incompleteNativeTextByPage.get(page.pageNumber)),
      ));
      warnings.push(...chunkResult.warnings);
    }
  }

  await assertExtractionNotCancelled(shouldCancel);
  await onProgress?.({
    stage: "verifying_pages",
    completedPages: pages.length,
    totalPages: pageCount,
    ocrChunkCount: chunks.length,
  });
  const verification = verifyDocumentExtraction({
    expectedPageCount: pageCount,
    pages,
  });
  const diagnostics: DocumentExtractionDiagnostics = {
    ...verification.diagnostics,
    extractionMode:
      pages.some((page) => page.method === "native_text") &&
      ocrPageNumbers.length > 0
        ? "mixed"
        : pages.some((page) => page.method === "native_text")
          ? "native_text"
          : "ocr",
    nativeTextPageCount: inspections.filter(
      (page) => page.kind === "native_text",
    ).length,
    ocrPageCount: ocrPageNumbers.length,
    ocrChunkCount: chunks.length,
    ocrChunks: chunks.map((chunk) => ({
      originalPageNumbers: chunk.originalPageNumbers,
    })),
  };
  if (!verification.sourceEligible) {
    return {
      ok: false,
      failure: {
        code:
          verification.status === "incomplete"
            ? "document_extraction_incomplete"
            : "document_unreadable",
        extraction: diagnostics,
      },
    };
  }

  await onProgress?.({
    stage: "assembling_text",
    completedPages: pageCount,
    totalPages: pageCount,
    ocrChunkCount: chunks.length,
  });

  return {
    ok: true,
    result: {
      text: verification.text,
      pages: verification.pages,
      mimeType: input.mimeType,
      provider: providerId,
      warnings,
    },
    extraction: diagnostics,
  };
}

function supplementOcrPage(page: OcrPage, nativeText: string | undefined): OcrPage {
  if (!nativeText) return page;
  if (page.status !== "text_extracted") {
    return { ...page, layoutStatus: "layout_incomplete" };
  }
  const normalizedNative = nativeText.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const normalizedOcr = page.text.toLocaleLowerCase().replace(/\s+/g, " ").trim();
  if (normalizedOcr.includes(normalizedNative)) {
    return { ...page, layoutStatus: "ocr_supplemented" };
  }
  const text = `${nativeText}\n${page.text}`.trim();
  return {
    ...page,
    layoutStatus: "ocr_supplemented",
    text,
    blocks: [
      {
        id: `page-${page.pageNumber}-native-supplement`,
        order: -1,
        kind: "block",
        text: nativeText,
        lines: nativeText.split("\n").map((line, order) => ({
          id: `page-${page.pageNumber}-native-supplement-line-${order + 1}`,
          order,
          text: line,
        })),
      },
      ...page.blocks,
    ],
  };
}

async function assertExtractionNotCancelled(
  shouldCancel: (() => boolean | Promise<boolean>) | undefined,
): Promise<void> {
  if (await shouldCancel?.()) {
    throw new DocumentExtractionCancellationError();
  }
}

async function extractOcrChunk({
  chunk,
  fileName,
  provider,
  timeoutMs,
}: {
  readonly chunk: PdfOcrChunk;
  readonly fileName?: string;
  readonly provider: OcrProvider;
  readonly timeoutMs: number;
}): Promise<{
  readonly pages: readonly OcrPage[];
  readonly warnings: readonly OcrWarning[];
}> {
  try {
    const result = await withTimeout(
      provider.extract({
        bytes: chunk.bytes,
        kind: "pdf",
        mimeType: OCR_PDF_MIME_TYPE,
        requestedPages: chunk.requestedPages,
        ...(fileName ? { fileName } : {}),
      }),
      timeoutMs,
    );

    return {
      pages: result.pages.map((page) =>
        remapChunkPage(page, chunk.originalPageNumbers),
      ),
      warnings: result.warnings.map((warning) =>
        remapChunkWarning(warning, chunk.originalPageNumbers),
      ),
    };
  } catch {
    return {
      pages: chunk.originalPageNumbers.map(createFailedOcrPage),
      warnings: [],
    };
  }
}

function remapChunkPage(
  page: OcrPage,
  originalPageNumbers: readonly number[],
): OcrPage {
  const originalPageNumber = originalPageNumbers[page.pageNumber - 1];
  return {
    ...page,
    pageNumber:
      originalPageNumber ??
      (originalPageNumbers[0] ?? 1) + Math.max(1, page.pageNumber) - 1,
  };
}

function remapChunkWarning(
  warning: OcrWarning,
  originalPageNumbers: readonly number[],
): OcrWarning {
  if (warning.pageNumber === undefined) {
    return warning;
  }
  const originalPageNumber = originalPageNumbers[warning.pageNumber - 1];
  return originalPageNumber === undefined
    ? { code: warning.code, message: warning.message }
    : { ...warning, pageNumber: originalPageNumber };
}

function createNativeTextPage(pageNumber: number, text: string): OcrPage {
  const lines = text.split("\n");
  return {
    pageNumber,
    status: "text_extracted",
    method: "native_text",
    layoutStatus: "native_complete",
    text,
    blocks: [
      {
        id: `page-${pageNumber}-block-1`,
        order: 0,
        kind: "block",
        text,
        lines: lines.map((line, order) => ({
          id: `page-${pageNumber}-block-1-line-${order + 1}`,
          order,
          text: line,
        })),
      },
    ],
  };
}

function createBlankPage(pageNumber: number): OcrPage {
  return {
    pageNumber,
    status: "blank",
    method: "blank",
    text: "",
    blocks: [],
  };
}

function createFailedOcrPage(pageNumber: number): OcrPage {
  return {
    pageNumber,
    status: "failed",
    method: "ocr",
    failureCategory: "provider_page_error",
    text: "",
    blocks: [],
  };
}

class ExtractionTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ExtractionTimeoutError();
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ExtractionTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function extractWithOcrProvider(
  provider: OcrProvider,
  input: OcrInput,
): Promise<OcrExtractionResult> {
  const expectedPageCount =
    input.kind === "image" ? 1 : input.requestedPages.length;
  try {
    const result = await provider.extract(input);
    const verification = verifyDocumentExtraction({
      expectedPageCount,
      pages: result.pages,
    });
    if (!verification.sourceEligible) {
      return {
        ok: false,
        failure: {
          code:
            verification.status === "incomplete"
              ? "document_extraction_incomplete"
              : "document_unreadable",
          extraction: verification.diagnostics,
        },
      };
    }

    return {
      ok: true,
      result: {
        ...result,
        text: verification.text,
        pages: verification.pages,
      },
      extraction: verification.diagnostics,
    };
  } catch (error) {
    const failure = mapOcrProviderError(error, expectedPageCount);
    return {
      ok: false,
      failure,
    };
  }
}

export function mapOcrProviderError(
  error: unknown,
  expectedPageCount = 0,
): OcrProviderFailure {
  const failedExtraction = createFailedDocumentExtractionDiagnostics({
    expectedPageCount,
    failureCategory:
      error instanceof OcrProviderError ? "provider_failure" : "internal_failure",
  });
  if (error instanceof OcrProviderError) {
    if (error.code === "ocr_not_configured") {
      return { code: "ocr_not_configured", extraction: failedExtraction };
    }
    if (error.code === "ocr_empty_result") {
      return { code: "ocr_empty_result", extraction: failedExtraction };
    }
    return { code: "ocr_provider_failed", extraction: failedExtraction };
  }

  return { code: "internal_error", extraction: failedExtraction };
}

export function isSupportedImageMimeType(
  value: string,
): value is OcrImageMimeType {
  return OCR_SUPPORTED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);
}
