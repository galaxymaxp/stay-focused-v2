import type {
  DocumentExtractionDiagnostics,
  OcrPage,
  OcrWarning,
} from "@stay-focused/ocr";

export interface OcrExtractSuccessResponse {
  readonly ok: true;
  readonly data: {
    readonly text: string;
    readonly pages: readonly OcrPage[];
    readonly mimeType: string;
    readonly pageCount?: number;
    readonly processedPageCount?: number;
    readonly extraction: DocumentExtractionDiagnostics;
    readonly provider: string;
    readonly warnings: readonly OcrWarning[];
  };
}

export type OcrExtractErrorCode =
  | "unauthorized"
  | "unsupported_media_type"
  | "unsupported_file_type"
  | "invalid_image"
  | "invalid_pdf"
  | "image_too_large"
  | "pdf_encrypted"
  | "pdf_page_limit_exceeded"
  | "file_too_large"
  | "empty_image"
  | "empty_file"
  | "no_text_detected"
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "document_unreadable"
  | "document_extraction_incomplete"
  | "document_extraction_failed"
  | "internal_error";

export interface OcrExtractErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: OcrExtractErrorCode;
    readonly message: string;
    readonly extraction?: DocumentExtractionDiagnostics;
  };
}

export type OcrExtractResponse =
  | OcrExtractSuccessResponse
  | OcrExtractErrorResponse;
