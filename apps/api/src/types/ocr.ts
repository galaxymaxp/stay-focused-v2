import type { OcrPage, OcrWarning } from "@stay-focused/ocr";

export interface OcrExtractSuccessResponse {
  readonly ok: true;
  readonly data: {
    readonly text: string;
    readonly pages: readonly OcrPage[];
    readonly mimeType: string;
    readonly provider: string;
    readonly warnings: readonly OcrWarning[];
  };
}

export type OcrExtractErrorCode =
  | "unauthorized"
  | "unsupported_media_type"
  | "invalid_image"
  | "image_too_large"
  | "empty_image"
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "internal_error";

export interface OcrExtractErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: OcrExtractErrorCode;
    readonly message: string;
  };
}

export type OcrExtractResponse =
  | OcrExtractSuccessResponse
  | OcrExtractErrorResponse;
