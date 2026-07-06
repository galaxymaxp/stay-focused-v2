import {
  OCR_SUPPORTED_IMAGE_MIME_TYPES,
  type OcrImageMimeType,
} from "@stay-focused/ocr";

import {
  OCR_MAX_IMAGE_BYTES,
  OCR_MAX_PDF_BYTES,
} from "@/lib/ocr/upload-policy";

export const CANVAS_SOURCE_FILE_BUCKET = "canvas-source-files";
export const CANVAS_FILE_MAX_SINGLE_BYTES = OCR_MAX_PDF_BYTES;
export const CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST = 3;
export const CANVAS_FILE_MAX_AGGREGATE_BYTES =
  OCR_MAX_PDF_BYTES + OCR_MAX_IMAGE_BYTES;
export const CANVAS_FILE_DOWNLOAD_TIMEOUT_MS = 30_000;
export const CANVAS_FILE_MAX_REDIRECTS = 5;
export const CANVAS_FILE_INGESTION_CONCURRENCY = 2;

export type CanvasFileIngestionEligibility =
  | "eligible_document"
  | "eligible_image"
  | "metadata_only_media"
  | "metadata_only_unsupported"
  | "blocked_security"
  | "blocked_size"
  | "blocked_locked"
  | "blocked_unavailable";

export type CanvasFileIngestionStatus =
  | "not_requested"
  | "stored"
  | "unchanged"
  | "metadata_only"
  | "blocked"
  | "failed"
  | "unavailable";

export interface CanvasFilePolicyInput {
  readonly contentType: string | null;
  readonly displayName: string | null;
  readonly filename: string | null;
  readonly size: number | null;
  readonly locked: boolean | null;
  readonly hidden: boolean | null;
  readonly hiddenForUser: boolean | null;
  readonly lockAt: string | null;
  readonly unlockAt: string | null;
  readonly mediaClass: string | null;
  readonly mediaEntryId: string | null;
}

export interface CanvasFileContentValidationInput extends CanvasFilePolicyInput {
  readonly bytes: Uint8Array;
  readonly responseContentType: string | null;
}

export function classifyCanvasFileForIngestion(
  file: CanvasFilePolicyInput,
  now = new Date(),
): CanvasFileIngestionEligibility {
  if (isUnavailable(file)) {
    return "blocked_unavailable";
  }
  if (isLocked(file, now)) {
    return "blocked_locked";
  }
  if (
    typeof file.size === "number" &&
    file.size > CANVAS_FILE_MAX_SINGLE_BYTES
  ) {
    return "blocked_size";
  }

  const contentType = normalizeMimeType(file.contentType);
  const extension = extensionForFile(file);

  if (hasDangerousExtension(extension) || isDangerousMimeType(contentType)) {
    return "blocked_security";
  }
  if (isArchiveOrContainer(extension, contentType)) {
    return "blocked_security";
  }
  if (hasDangerousMismatch({ contentType, extension })) {
    return "blocked_security";
  }
  if (file.mediaEntryId || file.mediaClass || isMediaMimeType(contentType)) {
    return "metadata_only_media";
  }
  if (isEligibleImageMimeType(contentType)) {
    return "eligible_image";
  }
  if (isEligibleDocumentMimeType(contentType)) {
    return "eligible_document";
  }
  return "metadata_only_unsupported";
}

export function ingestionStatusForEligibility(
  eligibility: CanvasFileIngestionEligibility,
): CanvasFileIngestionStatus {
  if (
    eligibility === "eligible_document" ||
    eligibility === "eligible_image"
  ) {
    return "not_requested";
  }
  if (
    eligibility === "metadata_only_media" ||
    eligibility === "metadata_only_unsupported"
  ) {
    return "metadata_only";
  }
  if (eligibility === "blocked_unavailable") {
    return "unavailable";
  }
  return "blocked";
}

export function validateDownloadedCanvasFileContent(
  input: CanvasFileContentValidationInput,
): { readonly ok: true } | { readonly ok: false; readonly code: string } {
  if (input.bytes.byteLength > CANVAS_FILE_MAX_SINGLE_BYTES) {
    return { ok: false, code: "canvas_file_too_large" };
  }

  const declaredContentType = normalizeMimeType(input.contentType);
  const responseContentType = normalizeMimeType(input.responseContentType);
  const effectiveContentType = responseContentType ?? declaredContentType;
  const extension = extensionForFile(input);

  if (hasDangerousExtension(extension) || isDangerousMimeType(effectiveContentType)) {
    return { ok: false, code: "canvas_file_type_blocked" };
  }
  if (hasDangerousMismatch({ contentType: effectiveContentType, extension })) {
    return { ok: false, code: "canvas_file_content_mismatch" };
  }
  if (effectiveContentType === "application/pdf") {
    return hasPdfSignature(input.bytes)
      ? { ok: true }
      : { ok: false, code: "canvas_file_content_mismatch" };
  }
  if (isEligibleImageMimeType(effectiveContentType)) {
    return hasImageSignature(input.bytes, effectiveContentType)
      ? { ok: true }
      : { ok: false, code: "canvas_file_content_mismatch" };
  }
  if (isPlainTextMimeType(effectiveContentType)) {
    return looksLikeText(input.bytes)
      ? { ok: true }
      : { ok: false, code: "canvas_file_content_mismatch" };
  }

  return { ok: false, code: "canvas_file_type_unsupported" };
}

export function normalizeMimeType(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.split(";")[0]?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function isEligibleForBinaryIngestion(
  eligibility: CanvasFileIngestionEligibility,
): boolean {
  return eligibility === "eligible_document" || eligibility === "eligible_image";
}

export function safeObjectKeyForCanvasFile({
  contentHash,
  fileId,
  userId,
}: {
  readonly contentHash: string;
  readonly fileId: string;
  readonly userId: string;
}): string {
  return `canvas/${userId}/${fileId}/${contentHash}`;
}

function isUnavailable(file: CanvasFilePolicyInput): boolean {
  return file.hidden === true || file.hiddenForUser === true;
}

function isLocked(file: CanvasFilePolicyInput, now: Date): boolean {
  if (file.locked === true) {
    return true;
  }
  const nowTime = now.getTime();
  const lockAt = parseDateMs(file.lockAt);
  const unlockAt = parseDateMs(file.unlockAt);
  return (
    (lockAt !== null && lockAt <= nowTime) ||
    (unlockAt !== null && unlockAt > nowTime)
  );
}

function parseDateMs(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extensionForFile(file: CanvasFilePolicyInput): string | null {
  const name = file.filename ?? file.displayName;
  if (!name) {
    return null;
  }
  const match = /\.([A-Za-z0-9]{1,16})$/.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? null;
}

function hasDangerousExtension(extension: string | null): boolean {
  return extension !== null && DANGEROUS_EXTENSIONS.has(extension);
}

function isArchiveOrContainer(
  extension: string | null,
  contentType: string | null,
): boolean {
  return (
    (extension !== null && ARCHIVE_EXTENSIONS.has(extension)) ||
    (contentType !== null && ARCHIVE_MIME_TYPES.has(contentType))
  );
}

function isDangerousMimeType(contentType: string | null): boolean {
  return contentType !== null && DANGEROUS_MIME_TYPES.has(contentType);
}

function hasDangerousMismatch({
  contentType,
  extension,
}: {
  readonly contentType: string | null;
  readonly extension: string | null;
}): boolean {
  if (!contentType || !extension) {
    return false;
  }
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return true;
  }
  if (contentType === "application/pdf") {
    return extension !== "pdf";
  }
  if (contentType === "text/plain") {
    return !TEXT_EXTENSIONS.has(extension);
  }
  if (contentType === "text/markdown" || contentType === "text/x-markdown") {
    return !MARKDOWN_EXTENSIONS.has(extension);
  }
  if (contentType === "image/png") {
    return extension !== "png";
  }
  if (contentType === "image/jpeg") {
    return extension !== "jpg" && extension !== "jpeg";
  }
  return false;
}

function isMediaMimeType(contentType: string | null): boolean {
  return (
    contentType !== null &&
    (contentType.startsWith("audio/") || contentType.startsWith("video/"))
  );
}

function isEligibleImageMimeType(
  contentType: string | null,
): contentType is OcrImageMimeType {
  return OCR_SUPPORTED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === contentType);
}

function isEligibleDocumentMimeType(contentType: string | null): boolean {
  return contentType === "application/pdf" || isPlainTextMimeType(contentType);
}

function isPlainTextMimeType(contentType: string | null): boolean {
  return (
    contentType === "text/plain" ||
    contentType === "text/markdown" ||
    contentType === "text/x-markdown"
  );
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function hasImageSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/png") {
    return (
      bytes.byteLength >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (contentType === "image/jpeg") {
    return (
      bytes.byteLength >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  return false;
}

function looksLikeText(bytes: Uint8Array): boolean {
  if (bytes.byteLength === 0) {
    return false;
  }
  let suspicious = 0;
  for (const byte of bytes.slice(0, Math.min(bytes.byteLength, 4096))) {
    if (byte === 0) {
      return false;
    }
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
      suspicious += 1;
    }
  }
  return suspicious <= 4;
}

const TEXT_EXTENSIONS = new Set(["txt", "text", "md", "markdown"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const DANGEROUS_EXTENSIONS = new Set([
  "app",
  "bat",
  "cmd",
  "com",
  "cpl",
  "dll",
  "exe",
  "gadget",
  "hta",
  "html",
  "jar",
  "js",
  "jse",
  "msi",
  "msp",
  "pif",
  "ps1",
  "scr",
  "sh",
  "vb",
  "vbe",
  "vbs",
  "wsf",
]);
const ARCHIVE_EXTENSIONS = new Set([
  "7z",
  "apk",
  "bz2",
  "dmg",
  "gz",
  "iso",
  "rar",
  "tar",
  "tgz",
  "xz",
  "zip",
]);
const ARCHIVE_MIME_TYPES = new Set([
  "application/gzip",
  "application/java-archive",
  "application/vnd.android.package-archive",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip2",
  "application/x-iso9660-image",
  "application/x-tar",
  "application/zip",
]);
const DANGEROUS_MIME_TYPES = new Set([
  "application/hta",
  "application/javascript",
  "application/octet-stream",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-ms-installer",
  "application/x-sh",
  "application/x-shellscript",
  "text/html",
  "text/javascript",
]);
