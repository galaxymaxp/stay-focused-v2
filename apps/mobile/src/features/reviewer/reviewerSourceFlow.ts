import type { OcrClientError } from "../../services/ocrApi";
import type {
  GallerySelectionError,
  SelectedGalleryImage,
} from "./galleryImage";

export type ReviewerSourceMode = "paste" | "image";
export type OcrSourceStatus = "idle" | "selected" | "uploading" | "ready" | "failed";

export interface ReviewerSourceState {
  readonly mode: ReviewerSourceMode;
  readonly manualText: string;
  readonly ocrText: string;
  readonly selectedImage: SelectedGalleryImage | null;
  readonly ocrStatus: OcrSourceStatus;
  readonly ocrError: SourceFlowError | null;
}

export type SourceFlowError = {
  readonly code:
    | GallerySelectionError["code"]
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
      readonly type: "ocr_started";
    }
  | {
      readonly type: "ocr_succeeded";
      readonly text: string;
    }
  | {
      readonly type: "ocr_failed";
      readonly error: OcrClientError;
    }
  | {
      readonly type: "clear_image";
    }
  | {
      readonly type: "clear_error";
    };

export const initialReviewerSourceState: ReviewerSourceState = {
  mode: "paste",
  manualText: "",
  ocrText: "",
  selectedImage: null,
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
      return state.mode === "image"
        ? { ...state, ocrText: action.value, ocrError: null }
        : { ...state, manualText: action.value, ocrError: null };

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
        mode: "image",
        ocrText: text,
        ocrError:
          text.trim().length === 0
            ? {
                code: "ocr_empty_result",
                title: "No readable text found",
                message: "OCR returned no readable text from this image.",
              }
            : null,
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

    case "clear_error":
      return {
        ...state,
        ocrError: null,
      };
  }
}

export function getCurrentSourceText(state: ReviewerSourceState): string {
  return state.mode === "image" ? state.ocrText : state.manualText;
}

export function getSourceCharacterCount(state: ReviewerSourceState): number {
  return getCurrentSourceText(state).length;
}

export function canExtractOcrText(state: ReviewerSourceState): boolean {
  return Boolean(state.selectedImage && state.ocrStatus !== "uploading");
}

export function formatGallerySelectionError(
  error: GallerySelectionError,
): SourceFlowError {
  switch (error.code) {
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
