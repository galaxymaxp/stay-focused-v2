export const OCR_SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
] as const;

export type OcrImageMimeType = (typeof OCR_SUPPORTED_IMAGE_MIME_TYPES)[number];

export const OCR_PDF_MIME_TYPE = "application/pdf" as const;

export type OcrPdfMimeType = typeof OCR_PDF_MIME_TYPE;

export type OcrMimeType = OcrImageMimeType | OcrPdfMimeType;

export type DocumentExtractionStatus = "complete" | "incomplete" | "failed";

export type PageExtractionStatus = "text_extracted" | "blank" | "failed";

export type PageExtractionMethod = "native_text" | "ocr" | "blank";

export type PageExtractionFailureCategory =
  | "provider_page_error"
  | "malformed_page_result"
  | "unresolved_page";

export type DocumentExtractionFailureCategory =
  | "invalid_expected_page_count"
  | "missing_page"
  | "duplicate_page"
  | "out_of_range_page"
  | "malformed_page_result"
  | "failed_page"
  | "empty_document"
  | "provider_failure"
  | "internal_failure";

export interface OcrPoint {
  readonly x: number;
  readonly y: number;
}

export interface OcrBoundingBox {
  readonly vertices: readonly OcrPoint[];
}

export interface OcrImageInput {
  readonly kind: "image";
  readonly mimeType: OcrImageMimeType;
  readonly bytes: Uint8Array;
  readonly fileName?: string;
}

export interface OcrPdfInput {
  readonly kind: "pdf";
  readonly mimeType: OcrPdfMimeType;
  readonly bytes: Uint8Array;
  readonly requestedPages: readonly number[];
  readonly fileName?: string;
}

export type OcrInput = OcrImageInput | OcrPdfInput;

export type OcrBlockKind = "block" | "paragraph" | "line-group";

export interface OcrLine {
  readonly id: string;
  readonly order: number;
  readonly text: string;
  readonly boundingBox?: OcrBoundingBox;
  readonly confidence?: number;
}

export interface OcrBlock {
  readonly id: string;
  readonly order: number;
  readonly kind: OcrBlockKind;
  readonly text: string;
  readonly lines: readonly OcrLine[];
  readonly boundingBox?: OcrBoundingBox;
  readonly confidence?: number;
}

export interface OcrPage {
  readonly pageNumber: number;
  readonly status: PageExtractionStatus;
  readonly method: PageExtractionMethod;
  readonly text: string;
  readonly blocks: readonly OcrBlock[];
  readonly failureCategory?: PageExtractionFailureCategory;
  readonly width?: number;
  readonly height?: number;
  readonly confidence?: number;
}

export type OcrWarningCode =
  | "empty_text"
  | "missing_layout"
  | "partial_layout";

export interface OcrWarning {
  readonly code: OcrWarningCode;
  readonly message: string;
  readonly pageNumber?: number;
}

export interface OcrResult {
  readonly text: string;
  readonly pages: readonly OcrPage[];
  readonly mimeType: OcrMimeType;
  readonly provider: string;
  readonly warnings: readonly OcrWarning[];
}

export interface DocumentExtractionDiagnostics {
  readonly status: DocumentExtractionStatus;
  readonly expectedPageCount: number;
  readonly processedPageCount: number;
  readonly successfulPageCount: number;
  readonly blankPageCount: number;
  readonly failedPageCount: number;
  readonly missingPageNumbers: readonly number[];
  readonly duplicatePageNumbers: readonly number[];
  readonly outOfRangePageNumbers: readonly number[];
  readonly invalidPageNumbers: readonly number[];
  readonly affectedPageNumbers: readonly number[];
  readonly failureCategories: readonly DocumentExtractionFailureCategory[];
}

export interface DocumentExtractionVerification {
  readonly status: DocumentExtractionStatus;
  readonly sourceEligible: boolean;
  readonly text: string;
  readonly pages: readonly OcrPage[];
  readonly diagnostics: DocumentExtractionDiagnostics;
}

export interface OcrProvider {
  readonly id: string;
  extract(input: OcrInput): Promise<OcrResult>;
}

export type OcrProviderErrorCode =
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result";

export class OcrProviderError extends Error {
  public readonly code: OcrProviderErrorCode;
  public readonly provider?: string;
  public readonly cause?: unknown;

  public constructor(options: {
    readonly code: OcrProviderErrorCode;
    readonly message: string;
    readonly provider?: string;
    readonly cause?: unknown;
  }) {
    super(options.message);
    this.name = "OcrProviderError";
    this.code = options.code;
    this.provider = options.provider;
    this.cause = options.cause;
  }
}

export interface OcrDraftLine {
  readonly text?: string;
  readonly order?: number;
  readonly boundingBox?: OcrBoundingBox;
  readonly confidence?: number;
}

export interface OcrDraftBlock {
  readonly kind?: OcrBlockKind;
  readonly text?: string;
  readonly order?: number;
  readonly lines?: readonly OcrDraftLine[];
  readonly boundingBox?: OcrBoundingBox;
  readonly confidence?: number;
}

export interface OcrDraftPage {
  readonly pageNumber?: number;
  readonly status?: PageExtractionStatus;
  readonly method?: PageExtractionMethod;
  readonly failureCategory?: PageExtractionFailureCategory;
  readonly text?: string;
  readonly order?: number;
  readonly blocks?: readonly OcrDraftBlock[];
  readonly lines?: readonly OcrDraftLine[];
  readonly width?: number;
  readonly height?: number;
  readonly confidence?: number;
}

export interface NormalizeOcrResultInput {
  readonly mimeType: OcrMimeType;
  readonly provider: string;
  readonly pages: readonly OcrDraftPage[];
  readonly warnings?: readonly OcrWarning[];
}
