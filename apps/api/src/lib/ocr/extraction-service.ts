import {
  OCR_PDF_MIME_TYPE,
  OCR_SUPPORTED_IMAGE_MIME_TYPES,
  OcrProviderError,
  createFailedDocumentExtractionDiagnostics,
  verifyDocumentExtraction,
  type DocumentExtractionDiagnostics,
  type OcrImageMimeType,
  type OcrInput,
  type OcrPdfInput,
  type OcrProvider,
  type OcrResult,
} from "@stay-focused/ocr";

import {
  createRequestedPdfPages,
  hasPdfSignature,
  readPdfPageCount,
} from "@/lib/ocr/pdf-validation";
import {
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
  OCR_MAX_PDF_PAGES,
} from "@/lib/ocr/upload-policy";

export type OcrProviderFailureCode =
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "document_extraction_incomplete"
  | "document_unreadable"
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
    };

export type OcrExtractionResult =
  | {
      readonly ok: true;
      readonly result: OcrResult;
      readonly extraction: DocumentExtractionDiagnostics;
    }
  | { readonly ok: false; readonly failure: OcrProviderFailure };

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
  fileName,
  mimeType,
}: {
  readonly bytes: Uint8Array;
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
  if (pageCount.pageCount > OCR_MAX_PDF_PAGES) {
    return { ok: false, code: "pdf_page_limit_exceeded" };
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
