import type { OcrClientError } from "../../services/ocrApi";
import type {
  GallerySelectionError,
  SelectedGalleryImage,
} from "./galleryImage";
import type {
  PdfSelectionError,
  SelectedPdfDocument,
} from "./pdfDocument";

export type ReviewerSourceMode = "paste" | "image" | "pdf";
export type OcrSourceStatus = "idle" | "selected" | "uploading" | "ready" | "failed";

export interface ReviewerSourceState {
  readonly mode: ReviewerSourceMode;
  readonly manualText: string;
  readonly ocrText: string;
  readonly selectedImage: SelectedGalleryImage | null;
  readonly selectedPdf: SelectedPdfDocument | null;
  readonly pdfPageCount: number | null;
  readonly ocrStatus: OcrSourceStatus;
  readonly ocrError: SourceFlowError | null;
}

export type SourceFlowError = {
  readonly code:
    | GallerySelectionError["code"]
    | PdfSelectionError["code"]
    | OcrClientError["code"]
    | "unknown_error";
  readonly title: string;
  readonly message: string;
};

export type ReviewerSourceAction =
  | {
      readonly type: "switch_mode";
      readonly mode: ReviewerSourceMode;
    }
  | {
      readonly type: "edit_source_text";
      readonly value: string;
    }
  | {
      readonly type: "image_selection_cancelled";
    }
  | {
      readonly type: "image_selection_failed";
      readonly error: GallerySelectionError;
    }
  | {
      readonly type: "image_selected";
      readonly image: SelectedGalleryImage;
    }
  | {
      readonly type: "pdf_selection_cancelled";
    }
  | {
      readonly type: "pdf_selection_failed";
      readonly error: PdfSelectionError;
    }
  | {
      readonly type: "pdf_selected";
      readonly pdf: SelectedPdfDocument;
    }
  | {
      readonly type: "ocr_started";
    }
  | {
      readonly type: "ocr_succeeded";
      readonly text: string;
      readonly pageCount?: number;
    }
  | {
      readonly type: "ocr_failed";
      readonly error: OcrClientError;
    }
  | {
      readonly type: "clear_image";
    }
  | {
      readonly type: "clear_pdf";
    }
  | {
      readonly type: "clear_error";
    };

export const initialReviewerSourceState: ReviewerSourceState = {
  mode: "paste",
  manualText: "",
  ocrText: "",
  selectedImage: null,
  selectedPdf: null,
  pdfPageCount: null,
  ocrStatus: "idle",
  ocrError: null,
};

export function reviewerSourceReducer(
  state: ReviewerSourceState,
  action: ReviewerSourceAction,
): ReviewerSourceState {
  switch (action.type) {
    case "switch_mode":
      return {
        ...state,
        mode: action.mode,
        ocrError: null,
      };

    case "edit_source_text":
      return state.mode === "paste"
        ? { ...state, manualText: action.value, ocrError: null }
        : { ...state, ocrText: action.value, ocrError: null };

    case "image_selection_cancelled":
      return {
        ...state,
        ocrError: null,
      };

    case "image_selection_failed":
      return {
        ...state,
        mode: "image",
        ocrError: formatGallerySelectionError(action.error),
        ocrStatus: state.selectedImage ? state.ocrStatus : "idle",
      };

    case "image_selected":
      return {
        ...state,
        mode: "image",
        selectedImage: action.image,
        selectedPdf: null,
        pdfPageCount: null,
        ocrText: "",
        ocrError: null,
        ocrStatus: "selected",
      };

    case "pdf_selection_cancelled":
      return {
        ...state,
        ocrError: null,
      };

    case "pdf_selection_failed":
      return {
        ...state,
        mode: "pdf",
        ocrError: formatPdfSelectionError(action.error),
        ocrStatus: state.selectedPdf ? state.ocrStatus : "idle",
      };

    case "pdf_selected":
      return {
        ...state,
        mode: "pdf",
        selectedImage: null,
        selectedPdf: action.pdf,
        pdfPageCount: null,
        ocrText: "",
        ocrError: null,
        ocrStatus: "selected",
      };

    case "ocr_started":
      return {
        ...state,
        ocrError: null,
        ocrStatus: "uploading",
      };

    case "ocr_succeeded": {
      const text = action.text.replace(/\r\n?/g, "\n");
      return {
        ...state,
        ocrText: text,
        ocrError:
          text.trim().length === 0
            ? {
                code: state.mode === "pdf" ? "no_text_detected" : "ocr_empty_result",
                title: "No readable text found",
                message:
                  state.mode === "pdf"
                    ? "No readable text was detected in this PDF."
                    : "OCR returned no readable text from this image.",
              }
            : null,
        pdfPageCount:
          state.mode === "pdf" && action.pageCount !== undefined
            ? action.pageCount
            : state.pdfPageCount,
        ocrStatus: text.trim().length === 0 ? "failed" : "ready",
      };
    }

    case "ocr_failed":
      return {
        ...state,
        ocrError: formatOcrClientError(action.error),
        ocrStatus: "failed",
      };

    case "clear_image":
      return {
        ...state,
        selectedImage: null,
        ocrText: "",
        ocrError: null,
        ocrStatus: "idle",
      };

    case "clear_pdf":
      return {
        ...state,
        selectedPdf: null,
        pdfPageCount: null,
        ocrText: "",
        ocrError: null,
        ocrStatus: "idle",
      };

    case "clear_error":
      return {
        ...state,
        ocrError: null,
      };
  }
}

export function getCurrentSourceText(state: ReviewerSourceState): string {
  return state.mode === "paste" ? state.manualText : state.ocrText;
}

export function getSourceCharacterCount(state: ReviewerSourceState): number {
  return getCurrentSourceText(state).length;
}

export function canExtractOcrText(state: ReviewerSourceState): boolean {
  return Boolean(state.selectedImage && state.ocrStatus !== "uploading");
}

export function canExtractPdfText(state: ReviewerSourceState): boolean {
  return Boolean(state.selectedPdf && state.ocrStatus !== "uploading");
}

export function formatGallerySelectionError(
  error: GallerySelectionError,
): SourceFlowError {
  switch (error.code) {
    case "camera_permission_denied":
      return {
        code: error.code,
        title: "Camera access needed",
        message: "Allow camera access to take a photo.",
      };
    case "permission_denied":
      return {
        code: error.code,
        title: "Photo access needed",
        message: "Allow photo library access to choose an image.",
      };
    case "unsupported_media_type":
      return {
        code: error.code,
        title: "Use PNG or JPEG",
        message: "Choose a PNG or JPEG image.",
      };
    case "image_too_large":
      return {
        code: error.code,
        title: "Image is too large",
        message: "Choose an image that is at most 5 MiB.",
      };
    case "empty_image":
      return {
        code: error.code,
        title: "Image is empty",
        message: "Choose a non-empty image.",
      };
    case "selection_failed":
      return {
        code: error.code,
        title: "Image selection failed",
        message: "Choose the image again.",
      };
  }
}

export function formatPdfSelectionError(
  error: PdfSelectionError,
): SourceFlowError {
  switch (error.code) {
    case "unsupported_file_type":
      return {
        code: error.code,
        title: "Use PDF",
        message: "Choose a PDF file.",
      };
    case "file_too_large":
      return {
        code: error.code,
        title: "PDF is too large",
        message: "Choose a PDF that is at most 10 MiB.",
      };
    case "empty_file":
      return {
        code: error.code,
        title: "PDF is empty",
        message: "Choose a non-empty PDF.",
      };
    case "selection_failed":
      return {
        code: error.code,
        title: "PDF selection failed",
        message: "Choose the PDF again.",
      };
  }
}

export function formatOcrClientError(error: OcrClientError): SourceFlowError {
  switch (error.code) {
    case "unauthorized":
    case "missing_access_token":
      return {
        code: error.code,
        title: "Login session expired",
        message: "Sign out and sign in again before extracting text.",
      };
    case "unsupported_media_type":
      return {
        code: error.code,
        title: "Use PNG or JPEG",
        message: "Choose a PNG or JPEG image.",
      };
    case "unsupported_file_type":
      return {
        code: error.code,
        title: "Use PDF",
        message: "Choose a PDF file.",
      };
    case "image_too_large":
      return {
        code: error.code,
        title: "Image is too large",
        message: "Choose an image that is at most 5 MiB.",
      };
    case "empty_image":
      return {
        code: error.code,
        title: "Image is empty",
        message: "Choose a non-empty image.",
      };
    case "invalid_pdf":
      return {
        code: error.code,
        title: "Invalid PDF",
        message: "Choose a valid PDF file.",
      };
    case "file_too_large":
      return {
        code: error.code,
        title: "PDF is too large",
        message: "Choose a PDF that is at most 10 MiB.",
      };
    case "empty_file":
      return {
        code: error.code,
        title: "PDF is empty",
        message: "Choose a non-empty PDF.",
      };
    case "pdf_page_limit_exceeded":
      return {
        code: error.code,
        title: "PDF has too many pages",
        message: "PDF OCR supports up to 5 pages per request.",
      };
    case "pdf_encrypted":
      return {
        code: error.code,
        title: "PDF is password-protected",
        message: "Choose a PDF that does not require a password.",
      };
    case "no_text_detected":
      return {
        code: error.code,
        title: "No readable text found",
        message: "No readable text was detected in this PDF.",
      };
    case "ocr_empty_result":
      return {
        code: error.code,
        title: "No readable text found",
        message: "OCR returned no readable text from this image.",
      };
    case "ocr_not_configured":
      return {
        code: error.code,
        title: "OCR is not configured",
        message: "The API environment needs Google Cloud OCR credentials.",
      };
    case "ocr_provider_failed":
      return {
        code: error.code,
        title: "OCR failed",
        message: "The OCR provider could not extract text. Try again.",
      };
    case "network_error":
      return {
        code: error.code,
        title: "Could not reach the API",
        message:
          "Check the API address and network connection, then try extracting again.",
      };
    case "request_cancelled":
      return {
        code: error.code,
        title: "OCR cancelled",
        message: "The OCR request was cancelled.",
      };
    case "invalid_api_base_url":
    case "invalid_image":
    case "invalid_response":
    case "unknown_error":
      return {
        code: error.code,
        title: "OCR failed",
        message: "Text extraction could not be completed. Try again.",
      };
  }
}
