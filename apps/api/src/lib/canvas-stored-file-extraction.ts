import { OCR_PDF_MIME_TYPE, normalizeOcrText, type OcrProvider } from "@stay-focused/ocr";
import type { CanvasFileRow, Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import {
  CANVAS_FILE_MAX_SINGLE_BYTES,
  CANVAS_SOURCE_FILE_BUCKET,
  normalizeMimeType,
  safeObjectKeyForCanvasFile,
  validateDownloadedCanvasFileContent,
} from "@/lib/canvas-file-policy";
import { sanitizeCanvasPreviewText } from "@/lib/canvas-source-safety";
import {
  extractWithOcrProvider,
  validateImageOcrBytes,
  validatePdfOcrBytes,
} from "@/lib/ocr/extraction-service";
import {
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
} from "@/lib/ocr/upload-policy";
import type { CanvasApiErrorCode } from "@/types/canvas";

export type CanvasStoredFileKind = "pdf" | "image" | "unsupported";

export interface CanvasStoredFileExtraction {
  readonly text: string;
  readonly fileKind: Exclude<CanvasStoredFileKind, "unsupported">;
  readonly pageCount?: number;
}

export type CanvasStoredFileExtractionResult =
  | { readonly ok: true; readonly value: CanvasStoredFileExtraction }
  | {
      readonly ok: false;
      readonly status: 400 | 404 | 409 | 413 | 422 | 500 | 502;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
    };

export function classifyStoredCanvasFileKind(
  file: CanvasFileRow,
): CanvasStoredFileKind {
  const contentType = normalizeMimeType(file.stored_content_type) ?? normalizeMimeType(file.content_type);
  if (contentType === OCR_PDF_MIME_TYPE) {
    return "pdf";
  }
  if (contentType === "image/png" || contentType === "image/jpeg") {
    return "image";
  }
  return "unsupported";
}

export function isPreparedCanvasFileReadyForOcr(file: CanvasFileRow): boolean {
  const fileKind = classifyStoredCanvasFileKind(file);
  if (fileKind === "unsupported") {
    return false;
  }

  return (
    file.availability_status === "available" &&
    (file.ingestion_status === "stored" || file.ingestion_status === "unchanged") &&
    file.ingestion_eligibility === fileEligibilityForKind(fileKind) &&
    file.storage_bucket === CANVAS_SOURCE_FILE_BUCKET &&
    Boolean(file.storage_object_key?.trim()) &&
    isSha256Hex(file.current_sha256) &&
    isStoredByteCountWithinLimit(file, fileKind)
  );
}

export async function extractPreparedCanvasFileText({
  client,
  connectionId,
  courseId,
  fileRow,
  ocrProvider,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly fileRow: CanvasFileRow;
  readonly ocrProvider: OcrProvider;
  readonly userId: string;
}): Promise<CanvasStoredFileExtractionResult> {
  const ownership = validateOwnedFileRow({
    connectionId,
    courseId,
    fileRow,
    userId,
  });
  if (ownership) {
    return ownership;
  }

  const fileKind = classifyStoredCanvasFileKind(fileRow);
  if (fileKind === "unsupported") {
    return unsupportedFileType();
  }

  const objectKey = fileRow.storage_object_key?.trim() ?? "";
  if (fileRow.storage_bucket && fileRow.storage_bucket !== CANVAS_SOURCE_FILE_BUCKET) {
    return corruptStoredFile();
  }
  if (
    objectKey &&
    !isSafeStoredObjectKey({ fileRow, objectKey, userId })
  ) {
    return corruptStoredFile();
  }

  if (!isPreparedCanvasFileReadyForOcr(fileRow)) {
    return preparationRequired();
  }

  if (
    fileRow.storage_bucket !== CANVAS_SOURCE_FILE_BUCKET ||
    !isSafeStoredObjectKey({ fileRow, objectKey, userId })
  ) {
    return corruptStoredFile();
  }

  const download = await downloadStoredObject(client, objectKey);
  if (!download.ok) {
    return download;
  }

  const bytes = download.bytes;
  if (!isActualByteCountAllowed(bytes.byteLength, fileKind)) {
    return {
      ok: false,
      status: 413,
      code: "canvas_source_preview_too_large",
      message: "The prepared Canvas file is too large for OCR preview.",
    };
  }

  if (
    typeof fileRow.stored_byte_count === "number" &&
    fileRow.stored_byte_count !== bytes.byteLength
  ) {
    return corruptStoredFile();
  }

  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== fileRow.current_sha256) {
    return corruptStoredFile();
  }

  const contentType =
    normalizeMimeType(fileRow.stored_content_type) ??
    normalizeMimeType(fileRow.content_type);
  const contentValidation = validateDownloadedCanvasFileContent({
    bytes,
    contentType,
    displayName: fileRow.display_name,
    filename: fileRow.filename,
    hidden: fileRow.hidden,
    hiddenForUser: fileRow.hidden_for_user,
    lockAt: fileRow.lock_at,
    locked: fileRow.locked,
    mediaClass: fileRow.media_class,
    mediaEntryId: fileRow.media_entry_id,
    responseContentType: contentType,
    size: fileRow.size_bytes,
    unlockAt: fileRow.unlock_at,
  });
  if (!contentValidation.ok) {
    return corruptStoredFile();
  }

  return fileKind === "pdf"
    ? extractPdf({ bytes, contentType, fileRow, ocrProvider })
    : extractImage({ bytes, contentType, fileRow, ocrProvider });
}

async function extractImage({
  bytes,
  contentType,
  fileRow,
  ocrProvider,
}: {
  readonly bytes: Uint8Array;
  readonly contentType: string | null;
  readonly fileRow: CanvasFileRow;
  readonly ocrProvider: OcrProvider;
}): Promise<CanvasStoredFileExtractionResult> {
  const validation = validateImageOcrBytes({
    bytes,
    fileName: sanitizeFileName(fileRow.display_name),
    mimeType: contentType ?? "",
  });
  if (!validation.ok) {
    return validation.code === "image_too_large"
      ? {
          ok: false,
          status: 413,
          code: "canvas_source_preview_too_large",
          message: "The prepared Canvas image is too large for OCR preview.",
        }
      : unsupportedFileType();
  }

  const extraction = await extractWithOcrProvider(ocrProvider, validation.input);
  if (!extraction.ok) {
    return mapOcrFailure(extraction.failure.code);
  }

  const text = sanitizeExtractedText(extraction.result.text);
  if (!text) {
    return {
      ok: false,
      status: 422,
      code: "canvas_source_image_ocr_empty",
      message: "No readable text was detected in this Canvas image.",
    };
  }

  return {
    ok: true,
    value: {
      fileKind: "image",
      text,
    },
  };
}

async function extractPdf({
  bytes,
  contentType,
  fileRow,
  ocrProvider,
}: {
  readonly bytes: Uint8Array;
  readonly contentType: string | null;
  readonly fileRow: CanvasFileRow;
  readonly ocrProvider: OcrProvider;
}): Promise<CanvasStoredFileExtractionResult> {
  const validation = await validatePdfOcrBytes({
    bytes,
    fileName: sanitizeFileName(fileRow.display_name),
    mimeType: contentType ?? "",
  });
  if (!validation.ok) {
    switch (validation.code) {
      case "pdf_encrypted":
        return {
          ok: false,
          status: 422,
          code: "canvas_source_pdf_encrypted",
          message: "Password-protected Canvas PDFs cannot be read.",
        };
      case "pdf_page_limit_exceeded":
        return {
          ok: false,
          status: 422,
          code: "canvas_source_pdf_page_limit_exceeded",
          message: "Canvas PDF OCR supports up to five pages per preview.",
        };
      case "file_too_large":
        return {
          ok: false,
          status: 413,
          code: "canvas_source_preview_too_large",
          message: "The prepared Canvas PDF is too large for OCR preview.",
        };
      default:
        return corruptStoredFile();
    }
  }

  const extraction = await extractWithOcrProvider(ocrProvider, validation.input);
  if (!extraction.ok) {
    return mapOcrFailure(extraction.failure.code);
  }

  const text = sanitizeExtractedText(extraction.result.text);
  if (!text) {
    return {
      ok: false,
      status: 422,
      code: "canvas_source_pdf_ocr_empty",
      message: "No readable text was detected in this Canvas PDF.",
    };
  }

  return {
    ok: true,
    value: {
      fileKind: "pdf",
      pageCount: validation.pageCount,
      text,
    },
  };
}

function validateOwnedFileRow({
  connectionId,
  courseId,
  fileRow,
  userId,
}: {
  readonly connectionId: string;
  readonly courseId: string;
  readonly fileRow: CanvasFileRow;
  readonly userId: string;
}): Extract<CanvasStoredFileExtractionResult, { readonly ok: false }> | null {
  if (
    fileRow.user_id !== userId ||
    fileRow.canvas_connection_id !== connectionId ||
    fileRow.course_id !== courseId
  ) {
    return {
      ok: false,
      status: 404,
      code: "canvas_source_not_found",
      message: "One or more selected Canvas sources were not found for this course.",
    };
  }
  return null;
}

async function downloadStoredObject(
  client: SupabaseClient<Database>,
  objectKey: string,
): Promise<
  | { readonly ok: true; readonly bytes: Uint8Array }
  | Extract<CanvasStoredFileExtractionResult, { readonly ok: false }>
> {
  const { data, error } = await client.storage
    .from(CANVAS_SOURCE_FILE_BUCKET)
    .download(objectKey);

  if (error) {
    if (isNotFoundStorageError(error)) {
      return {
        ok: false,
        status: 409,
        code: "canvas_source_stored_file_missing",
        message: "Prepare this Canvas file again before previewing it.",
      };
    }
    return {
      ok: false,
      status: 502,
      code: "canvas_source_storage_read_failed",
      message: "Canvas file storage could not be read. Try again later.",
    };
  }
  if (!data || typeof data.arrayBuffer !== "function") {
    return {
      ok: false,
      status: 409,
      code: "canvas_source_stored_file_missing",
      message: "Prepare this Canvas file again before previewing it.",
    };
  }

  try {
    return {
      ok: true,
      bytes: new Uint8Array(await data.arrayBuffer()),
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "canvas_source_storage_read_failed",
      message: "Canvas file storage could not be read. Try again later.",
    };
  }
}

function isSafeStoredObjectKey({
  fileRow,
  objectKey,
  userId,
}: {
  readonly fileRow: CanvasFileRow;
  readonly objectKey: string;
  readonly userId: string;
}): boolean {
  if (!isSha256Hex(fileRow.current_sha256)) {
    return false;
  }
  return (
    objectKey ===
    safeObjectKeyForCanvasFile({
      contentHash: fileRow.current_sha256,
      fileId: fileRow.id,
      userId,
    })
  );
}

function isStoredByteCountWithinLimit(
  file: CanvasFileRow,
  fileKind: Exclude<CanvasStoredFileKind, "unsupported">,
): boolean {
  return (
    typeof file.stored_byte_count === "number" &&
    file.stored_byte_count > 0 &&
    isActualByteCountAllowed(file.stored_byte_count, fileKind)
  );
}

function isActualByteCountAllowed(
  byteLength: number,
  fileKind: Exclude<CanvasStoredFileKind, "unsupported">,
): boolean {
  if (byteLength <= 0 || byteLength > CANVAS_FILE_MAX_SINGLE_BYTES) {
    return false;
  }
  return fileKind === "image"
    ? byteLength <= OCR_MAX_IMAGE_BYTES
    : byteLength <= OCR_MAX_PDF_BYTES;
}

function fileEligibilityForKind(
  fileKind: Exclude<CanvasStoredFileKind, "unsupported">,
): "eligible_document" | "eligible_image" {
  return fileKind === "pdf" ? "eligible_document" : "eligible_image";
}

function mapOcrFailure(
  code: "ocr_not_configured" | "ocr_provider_failed" | "ocr_empty_result" | "internal_error",
): Extract<CanvasStoredFileExtractionResult, { readonly ok: false }> {
  if (code === "ocr_not_configured") {
    return {
      ok: false,
      status: 500,
      code: "canvas_source_ocr_not_configured",
      message: "OCR provider is not configured.",
    };
  }
  if (code === "ocr_empty_result") {
    return {
      ok: false,
      status: 422,
      code: "canvas_source_ocr_empty",
      message: "No readable text was detected in this Canvas file.",
    };
  }
  return {
    ok: false,
    status: code === "internal_error" ? 500 : 502,
    code: "canvas_source_ocr_failed",
    message: "OCR provider failed.",
  };
}

function sanitizeExtractedText(text: string): string {
  return sanitizeCanvasPreviewText(normalizeOcrText(text));
}

function unsupportedFileType(): Extract<CanvasStoredFileExtractionResult, { readonly ok: false }> {
  return {
    ok: false,
    status: 400,
    code: "canvas_source_unsupported_file_type",
    message: "This Canvas file type is not supported yet.",
  };
}

function preparationRequired(): Extract<CanvasStoredFileExtractionResult, { readonly ok: false }> {
  return {
    ok: false,
    status: 409,
    code: "canvas_source_file_preparation_required",
    message: "Prepare this Canvas file before previewing it.",
  };
}

function corruptStoredFile(): Extract<CanvasStoredFileExtractionResult, { readonly ok: false }> {
  return {
    ok: false,
    status: 409,
    code: "canvas_source_stored_file_corrupt",
    message: "Prepare this Canvas file again before previewing it.",
  };
}

function sanitizeFileName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|\0]+/g, "-").slice(0, 180);
}

function isSha256Hex(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-f0-9]{64}$/i.test(value));
}

function isNotFoundStorageError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }
  return (
    error.statusCode === "404" ||
    error.statusCode === 404 ||
    error.status === 404 ||
    (error.name === "StorageApiError" && error.message === "Object not found")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
