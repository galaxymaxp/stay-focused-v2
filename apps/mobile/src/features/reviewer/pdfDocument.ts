import type * as ExpoDocumentPicker from "expo-document-picker";

import {
  OCR_MAX_PDF_BYTES,
  type OcrPdfMimeType,
} from "../../services/ocrApi";

export interface SelectedPdfDocument {
  readonly uri: string;
  readonly mimeType: OcrPdfMimeType;
  readonly fileName: string;
  readonly fileSize?: number;
  readonly webFile?: Blob;
}

export type PdfSelectionResult =
  | {
      readonly status: "selected";
      readonly pdf: SelectedPdfDocument;
    }
  | {
      readonly status: "cancelled";
    }
  | {
      readonly status: "failed";
      readonly error: PdfSelectionError;
    };

export type PdfSelectionErrorCode =
  | "selection_failed"
  | "unsupported_file_type"
  | "file_too_large"
  | "empty_file";

export interface PdfSelectionError {
  readonly code: PdfSelectionErrorCode;
  readonly message: string;
}

export async function choosePdfDocument(): Promise<PdfSelectionResult> {
  const DocumentPicker = await import("expo-document-picker");

  let result: ExpoDocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      base64: false,
      copyToCacheDirectory: true,
      multiple: false,
      type: "application/pdf",
    });
  } catch {
    return failure("selection_failed", "PDF selection could not be completed.");
  }

  if (result.canceled) {
    return { status: "cancelled" };
  }

  const asset = result.assets[0];
  if (!asset) {
    return failure("selection_failed", "No PDF was returned from the picker.");
  }

  return mapDocumentPickerAsset(asset);
}

export function mapDocumentPickerAsset(
  asset: ExpoDocumentPicker.DocumentPickerAsset,
): PdfSelectionResult {
  if (normalizeMimeType(asset.mimeType) !== "application/pdf") {
    return failure("unsupported_file_type", "Choose a PDF file.");
  }

  if (asset.size !== undefined) {
    if (!Number.isFinite(asset.size) || asset.size < 0) {
      return failure("selection_failed", "The selected PDF is invalid.");
    }
    if (asset.size === 0) {
      return failure("empty_file", "The selected PDF is empty.");
    }
    if (asset.size > OCR_MAX_PDF_BYTES) {
      return failure("file_too_large", "Choose a PDF that is at most 10 MiB.");
    }
  }

  return {
    status: "selected",
    pdf: {
      uri: asset.uri,
      mimeType: "application/pdf",
      fileName: sanitizePdfFileName(asset.name),
      ...(asset.size !== undefined ? { fileSize: asset.size } : {}),
      ...(asset.file ? { webFile: asset.file } : {}),
    },
  };
}

function sanitizePdfFileName(value: string | null | undefined): string {
  const sanitized = value?.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return sanitized || "selected-document.pdf";
}

function normalizeMimeType(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function failure(
  code: PdfSelectionErrorCode,
  message: string,
): PdfSelectionResult {
  return {
    status: "failed",
    error: { code, message },
  };
}
