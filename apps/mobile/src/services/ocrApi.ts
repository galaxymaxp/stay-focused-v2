import {
  OCR_MAX_PDF_PAGES,
  type DocumentExtractionDiagnostics,
} from "@stay-focused/ocr";

import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const OCR_EXTRACT_PATH = "/api/ocr/extract";
const OCR_EXTRACT_PDF_PATH = "/api/ocr/extract-pdf";
const OCR_IMAGE_FORM_FIELD = "image";
const OCR_PDF_FORM_FIELD = "pdf";
export const OCR_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const OCR_MAX_PDF_BYTES = 10 * 1024 * 1024;
export { OCR_MAX_PDF_PAGES };
const MAX_ERROR_MESSAGE_CHARS = 300;

export const SUPPORTED_OCR_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
] as const;

export type OcrImageMimeType = (typeof SUPPORTED_OCR_IMAGE_MIME_TYPES)[number];
export type OcrPdfMimeType = "application/pdf";

export interface OcrImageUpload {
  readonly uri: string;
  readonly mimeType: string;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly webFile?: Blob;
}

export interface OcrPdfUpload {
  readonly uri: string;
  readonly mimeType: string;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly webFile?: Blob;
}

export interface ExtractOcrTextInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly image: OcrImageUpload;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
  readonly platformOS?: OcrUploadPlatform;
}

export interface ExtractPdfOcrTextInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly pdf: OcrPdfUpload;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
  readonly platformOS?: OcrUploadPlatform;
}

export type OcrUploadPlatform =
  | "web"
  | "ios"
  | "android"
  | "windows"
  | "macos"
  | "native";

export type ExtractOcrTextResult =
  | {
      readonly ok: true;
      readonly data: OcrExtractData;
    }
  | {
      readonly ok: false;
      readonly error: OcrClientError;
    };

export type OcrClientErrorCode =
  | "invalid_api_base_url"
  | "missing_access_token"
  | "invalid_image"
  | "invalid_pdf"
  | "unsupported_media_type"
  | "unsupported_file_type"
  | "image_too_large"
  | "file_too_large"
  | "empty_image"
  | "empty_file"
  | "pdf_encrypted"
  | "pdf_page_limit_exceeded"
  | "no_text_detected"
  | "unauthorized"
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "document_unreadable"
  | "document_extraction_incomplete"
  | "document_extraction_failed"
  | "network_error"
  | "request_cancelled"
  | "invalid_response"
  | "unknown_error";

export interface OcrClientError {
  readonly code: OcrClientErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
  readonly extraction?: DocumentExtractionDiagnostics;
}

export interface OcrExtractData {
  readonly text: string;
  readonly pages: readonly unknown[];
  readonly mimeType: string;
  readonly pageCount?: number;
  readonly processedPageCount?: number;
  readonly extraction?: DocumentExtractionDiagnostics;
  readonly provider: string;
  readonly warnings: readonly unknown[];
}

interface OcrExtractSuccessResponse {
  readonly ok: true;
  readonly data: OcrExtractData;
}

interface OcrExtractErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly extraction?: DocumentExtractionDiagnostics;
  };
}

type NativeFormDataFile = {
  readonly uri: string;
  readonly name: string;
  readonly type: OcrImageMimeType | OcrPdfMimeType;
};

export async function extractOcrText(
  input: ExtractOcrTextInput,
): Promise<ExtractOcrTextResult> {
  const endpoint = createOcrEndpoint(input.apiBaseUrl, OCR_EXTRACT_PATH);
  if (!endpoint.ok) {
    return endpoint;
  }

  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError(
      "missing_access_token",
      "An access token is required to extract text from an image.",
    );
  }

  const image = validateOcrImageUpload(input.image);
  if (!image.ok) {
    return image;
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const formData = await createOcrImageFormData({
      fetchImpl: fetcher,
      image: image.value,
      platformOS: input.platformOS ?? getDefaultUploadPlatform(),
    });

    const response = await fetcher(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      signal: input.signal,
    });

    return await parseOcrResponse(response, "image");
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_cancelled", "OCR extraction was cancelled.");
    }

    return clientError(
      "network_error",
      `OCR extraction request failed before receiving a response. Check that the API host and port are reachable from this device. ${API_BASE_URL_SETUP_HINT}`,
    );
  }
}

export async function extractPdfOcrText(
  input: ExtractPdfOcrTextInput,
): Promise<ExtractOcrTextResult> {
  const endpoint = createOcrEndpoint(input.apiBaseUrl, OCR_EXTRACT_PDF_PATH);
  if (!endpoint.ok) {
    return endpoint;
  }

  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError(
      "missing_access_token",
      "An access token is required to extract text from a PDF.",
    );
  }

  const pdf = validateOcrPdfUpload(input.pdf);
  if (!pdf.ok) {
    return pdf;
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const formData = await createOcrPdfFormData({
      fetchImpl: fetcher,
      pdf: pdf.value,
      platformOS: input.platformOS ?? getDefaultUploadPlatform(),
    });

    const response = await fetcher(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      signal: input.signal,
    });

    return await parseOcrResponse(response, "pdf");
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_cancelled", "OCR extraction was cancelled.");
    }

    return clientError(
      "network_error",
      `PDF OCR request failed before receiving a response. Check that the API host and port are reachable from this device. ${API_BASE_URL_SETUP_HINT}`,
    );
  }
}

export function createNativeOcrUploadPart(
  image: ValidatedOcrImageUpload,
): NativeFormDataFile {
  return {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
  };
}

export function createNativeOcrPdfUploadPart(
  pdf: ValidatedOcrPdfUpload,
): NativeFormDataFile {
  return {
    uri: pdf.uri,
    name: pdf.fileName,
    type: pdf.mimeType,
  };
}

export async function createOcrImageFormData({
  fetchImpl = fetch,
  image,
  platformOS = getDefaultUploadPlatform(),
}: {
  readonly fetchImpl?: typeof fetch;
  readonly image: ValidatedOcrImageUpload;
  readonly platformOS?: OcrUploadPlatform;
}): Promise<FormData> {
  const formData = new FormData();

  if (platformOS === "web") {
    const webFile = await createWebOcrUploadFile(image, fetchImpl);
    formData.append(OCR_IMAGE_FORM_FIELD, webFile, image.fileName);
    return formData;
  }

  formData.append(
    OCR_IMAGE_FORM_FIELD,
    createNativeOcrUploadPart(image) as unknown as Blob,
  );
  return formData;
}

export async function createOcrPdfFormData({
  fetchImpl = fetch,
  pdf,
  platformOS = getDefaultUploadPlatform(),
}: {
  readonly fetchImpl?: typeof fetch;
  readonly pdf: ValidatedOcrPdfUpload;
  readonly platformOS?: OcrUploadPlatform;
}): Promise<FormData> {
  const formData = new FormData();

  if (platformOS === "web") {
    const webFile = await createWebOcrPdfUploadFile(pdf, fetchImpl);
    formData.append(OCR_PDF_FORM_FIELD, webFile, pdf.fileName);
    return formData;
  }

  formData.append(
    OCR_PDF_FORM_FIELD,
    createNativeOcrPdfUploadPart(pdf) as unknown as Blob,
  );
  return formData;
}

function getDefaultUploadPlatform(): OcrUploadPlatform {
  return typeof document === "undefined" ? "native" : "web";
}

export interface ValidatedOcrImageUpload {
  readonly uri: string;
  readonly mimeType: OcrImageMimeType;
  readonly fileName: string;
  readonly fileSize?: number;
  readonly webFile?: Blob;
}

export interface ValidatedOcrPdfUpload {
  readonly uri: string;
  readonly mimeType: OcrPdfMimeType;
  readonly fileName: string;
  readonly fileSize?: number;
  readonly webFile?: Blob;
}

export function validateOcrImageUpload(
  image: OcrImageUpload,
):
  | { readonly ok: true; readonly value: ValidatedOcrImageUpload }
  | { readonly ok: false; readonly error: OcrClientError } {
  const uri = image.uri.trim();
  if (!uri) {
    return clientError("invalid_image", "Choose an image before extracting text.");
  }

  const mimeType = normalizeMimeType(image.mimeType);
  if (!isSupportedOcrImageMimeType(mimeType)) {
    return clientError(
      "unsupported_media_type",
      "Choose a PNG or JPEG image.",
      415,
    );
  }

  if (image.fileSize !== undefined) {
    if (!Number.isFinite(image.fileSize) || image.fileSize < 0) {
      return clientError("invalid_image", "The selected image is invalid.");
    }
    if (image.fileSize === 0) {
      return clientError("empty_image", "The selected image is empty.", 400);
    }
    if (image.fileSize > OCR_MAX_IMAGE_BYTES) {
      return clientError(
        "image_too_large",
        `Choose an image that is at most ${formatBytes(OCR_MAX_IMAGE_BYTES)}.`,
        413,
      );
    }
  }

  return {
    ok: true,
    value: {
      uri,
      mimeType,
      fileName: sanitizeFileName(image.fileName, mimeType),
      ...(image.fileSize !== undefined ? { fileSize: image.fileSize } : {}),
      ...(image.webFile ? { webFile: image.webFile } : {}),
    },
  };
}

export function validateOcrPdfUpload(
  pdf: OcrPdfUpload,
):
  | { readonly ok: true; readonly value: ValidatedOcrPdfUpload }
  | { readonly ok: false; readonly error: OcrClientError } {
  const uri = pdf.uri.trim();
  if (!uri) {
    return clientError("invalid_pdf", "Choose a PDF before extracting text.");
  }

  const mimeType = normalizeMimeType(pdf.mimeType);
  if (mimeType !== "application/pdf") {
    return clientError("unsupported_file_type", "Choose a PDF file.", 415);
  }

  if (pdf.fileSize !== undefined) {
    if (!Number.isFinite(pdf.fileSize) || pdf.fileSize < 0) {
      return clientError("invalid_pdf", "The selected PDF is invalid.");
    }
    if (pdf.fileSize === 0) {
      return clientError("empty_file", "The selected PDF is empty.", 400);
    }
    if (pdf.fileSize > OCR_MAX_PDF_BYTES) {
      return clientError(
        "file_too_large",
        `Choose a PDF that is at most ${formatBytes(OCR_MAX_PDF_BYTES)}.`,
        413,
      );
    }
  }

  return {
    ok: true,
    value: {
      uri,
      mimeType: "application/pdf",
      fileName: sanitizePdfFileName(pdf.fileName),
      ...(pdf.fileSize !== undefined ? { fileSize: pdf.fileSize } : {}),
      ...(pdf.webFile ? { webFile: pdf.webFile } : {}),
    },
  };
}

export function isSupportedOcrImageMimeType(
  value: string,
): value is OcrImageMimeType {
  const normalized = normalizeMimeType(value);
  return SUPPORTED_OCR_IMAGE_MIME_TYPES.some((mimeType) => mimeType === normalized);
}

export function inferOcrImageMimeType(value: string): OcrImageMimeType | null {
  const normalized = value.trim().toLowerCase().split("?")[0] ?? "";
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (
    normalized.endsWith(".jpg") ||
    normalized.endsWith(".jpeg") ||
    normalized.endsWith(".jpe")
  ) {
    return "image/jpeg";
  }
  return null;
}

export function sanitizeOcrDiagnosticText(value: string): string {
  return value
    .replace(
      /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(authorization|access_token|refresh_token|id_token|private_key|client_email|GOOGLE_CLOUD_CREDENTIALS_JSON|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)(["'\s:=]+)([^"'\s,}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(/\b[A-Z]:\\[^\s"']+/g, "[REDACTED_PATH]");
}

function createOcrEndpoint(
  apiBaseUrl: string,
  path: typeof OCR_EXTRACT_PATH | typeof OCR_EXTRACT_PDF_PATH,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: OcrClientError } {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, "");

  if (!normalizedBaseUrl) {
    return clientError("invalid_api_base_url", API_BASE_URL_SETUP_HINT);
  }

  try {
    const parsed = new URL(normalizedBaseUrl);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.search ||
      parsed.hash
    ) {
      return clientError(
        "invalid_api_base_url",
        `EXPO_PUBLIC_API_BASE_URL must be a plain HTTP(S) base URL. ${API_BASE_URL_SETUP_HINT}`,
      );
    }
  } catch {
    return clientError(
      "invalid_api_base_url",
      `EXPO_PUBLIC_API_BASE_URL must be a valid API base URL. ${API_BASE_URL_SETUP_HINT}`,
    );
  }

  return {
    ok: true,
    url: `${normalizedBaseUrl}${path}`,
  };
}

async function createWebOcrUploadFile(
  image: ValidatedOcrImageUpload,
  fetchImpl: typeof fetch,
): Promise<Blob> {
  const sourceBlob = image.webFile ?? (await fetchImageBlob(image.uri, fetchImpl));
  const typedBlob =
    sourceBlob.type === image.mimeType
      ? sourceBlob
      : new Blob([sourceBlob], { type: image.mimeType });

  if (typeof File === "function" && !(typedBlob instanceof File)) {
    return new File([typedBlob], image.fileName, { type: image.mimeType });
  }

  return typedBlob;
}

async function fetchImageBlob(
  uri: string,
  fetchImpl: typeof fetch,
): Promise<Blob> {
  const response = await fetchImpl(uri);
  if (!response.ok) {
    throw new Error("Selected image could not be read.");
  }
  return await response.blob();
}

async function createWebOcrPdfUploadFile(
  pdf: ValidatedOcrPdfUpload,
  fetchImpl: typeof fetch,
): Promise<Blob> {
  const sourceBlob = pdf.webFile ?? (await fetchPdfBlob(pdf.uri, fetchImpl));
  const typedBlob =
    sourceBlob.type === pdf.mimeType
      ? sourceBlob
      : new Blob([sourceBlob], { type: pdf.mimeType });

  if (typeof File === "function" && !(typedBlob instanceof File)) {
    return new File([typedBlob], pdf.fileName, { type: pdf.mimeType });
  }

  return typedBlob;
}

async function fetchPdfBlob(
  uri: string,
  fetchImpl: typeof fetch,
): Promise<Blob> {
  const response = await fetchImpl(uri);
  if (!response.ok) {
    throw new Error("Selected PDF could not be read.");
  }
  return await response.blob();
}

async function parseOcrResponse(
  response: Response,
  sourceKind: "image" | "pdf",
): Promise<ExtractOcrTextResult> {
  const parsed = await readJson(response);

  if (!response.ok) {
    return apiError(response.status, parsed, sourceKind);
  }

  if (isOcrExtractSuccessResponse(parsed)) {
    if (
      sourceKind === "pdf" &&
      (!parsed.data.extraction || parsed.data.extraction.status !== "complete")
    ) {
      return clientError(
        "document_extraction_incomplete",
        "Not every page could be verified. Retry, rescan the document, or choose another PDF.",
        422,
        parsed.data.extraction,
      );
    }
    if (parsed.data.text.trim().length === 0) {
      return clientError(
        sourceKind === "pdf" ? "no_text_detected" : "ocr_empty_result",
        sourceKind === "pdf"
          ? "No readable text was detected in this PDF."
          : "OCR returned no readable text from this image.",
        422,
      );
    }

    return { ok: true, data: parsed.data };
  }

  return clientError(
    "invalid_response",
    "OCR extraction returned an invalid response.",
    response.status,
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function apiError(
  status: number,
  parsed: unknown,
  sourceKind: "image" | "pdf",
): ExtractOcrTextResult {
  if (isOcrExtractErrorResponse(parsed)) {
    const code = mapApiErrorCode(parsed.error.code);
    return {
      ok: false,
      error: {
        code,
        message: safeApiErrorMessage(
          parsed.error.message,
          status,
          code,
          sourceKind,
        ),
        status,
        ...(parsed.error.extraction
          ? { extraction: parsed.error.extraction }
          : {}),
        ...(code === "unknown_error" ? { apiCode: parsed.error.code } : {}),
      },
    };
  }

  return clientError(
    statusToClientErrorCode(status, sourceKind),
    statusToClientErrorMessage(status, sourceKind),
    status,
  );
}

function clientError(
  code: OcrClientErrorCode,
  message: string,
  status?: number,
  extraction?: DocumentExtractionDiagnostics,
): { readonly ok: false; readonly error: OcrClientError } {
  return {
    ok: false,
    error: {
      code,
      message: sanitizeOcrDiagnosticText(message),
      ...(status !== undefined ? { status } : {}),
      ...(extraction ? { extraction } : {}),
    },
  };
}

function mapApiErrorCode(code: string): OcrClientErrorCode {
  switch (code) {
    case "unauthorized":
    case "unsupported_media_type":
    case "unsupported_file_type":
    case "invalid_image":
    case "invalid_pdf":
    case "image_too_large":
    case "file_too_large":
    case "empty_image":
    case "empty_file":
    case "pdf_encrypted":
    case "pdf_page_limit_exceeded":
    case "no_text_detected":
    case "ocr_not_configured":
    case "ocr_provider_failed":
    case "ocr_empty_result":
    case "document_unreadable":
    case "document_extraction_incomplete":
    case "document_extraction_failed":
    case "internal_error":
      return code === "internal_error" ? "unknown_error" : code;
    default:
      return "unknown_error";
  }
}

function statusToClientErrorCode(
  status: number,
  sourceKind: "image" | "pdf",
): OcrClientErrorCode {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 413) {
    return sourceKind === "pdf" ? "file_too_large" : "image_too_large";
  }
  if (status === 415) {
    return sourceKind === "pdf" ? "unsupported_file_type" : "unsupported_media_type";
  }
  if (status === 422) {
    return sourceKind === "pdf"
      ? "document_extraction_incomplete"
      : "ocr_empty_result";
  }
  if (status >= 500) {
    return "ocr_provider_failed";
  }
  return "invalid_response";
}

function statusToClientErrorMessage(
  status: number,
  sourceKind: "image" | "pdf",
): string {
  if (status === 401) {
    return "OCR extraction requires a valid session.";
  }
  if (status === 413) {
    return sourceKind === "pdf"
      ? `Choose a PDF that is at most ${formatBytes(OCR_MAX_PDF_BYTES)}.`
      : `Choose an image that is at most ${formatBytes(OCR_MAX_IMAGE_BYTES)}.`;
  }
  if (status === 415) {
    return sourceKind === "pdf" ? "Choose a PDF file." : "Choose a PNG or JPEG image.";
  }
  if (status === 422) {
    return sourceKind === "pdf"
      ? "No readable text was detected in this PDF."
      : "OCR returned no readable text from this image.";
  }
  if (status >= 500) {
    return "OCR extraction failed on the server.";
  }
  return "OCR extraction returned an unexpected response.";
}

function safeApiErrorMessage(
  message: string,
  status: number,
  code: OcrClientErrorCode,
  sourceKind: "image" | "pdf",
): string {
  if (code === "ocr_provider_failed") {
    return "Text extraction is temporarily unavailable. Try again in a moment.";
  }

  if (code === "document_extraction_failed") {
    return "The document could not be read completely. Try again, rescan it, or choose another file.";
  }

  if (code === "ocr_not_configured") {
    return "OCR is not configured for this API environment.";
  }

  if (code === "unauthorized") {
    return "OCR extraction requires a valid session.";
  }

  const normalized = sanitizeOcrDiagnosticText(message)
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_CHARS);
  if (!normalized || looksLikeStackTrace(normalized)) {
    return statusToClientErrorMessage(status, sourceKind);
  }
  return normalized;
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeFileName(
  fileName: string | undefined,
  mimeType: OcrImageMimeType,
): string {
  const normalized = fileName?.trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (normalized) {
    return normalized;
  }

  return mimeType === "image/png" ? "selected-image.png" : "selected-image.jpg";
}

function sanitizePdfFileName(fileName: string | undefined): string {
  const normalized = fileName?.trim().replace(/[\\/:*?"<>|]+/g, "-");
  if (normalized) {
    return normalized;
  }

  return "selected-document.pdf";
}

function formatBytes(bytes: number): string {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)} MiB`;
  }
  return `${bytes} bytes`;
}

function isOcrExtractSuccessResponse(
  value: unknown,
): value is OcrExtractSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    isRecord(value.data) &&
    typeof value.data.text === "string" &&
    typeof value.data.mimeType === "string" &&
    typeof value.data.provider === "string" &&
    Array.isArray(value.data.pages) &&
    Array.isArray(value.data.warnings) &&
    (value.data.extraction === undefined ||
      isDocumentExtractionDiagnostics(value.data.extraction))
  );
}

function isOcrExtractErrorResponse(
  value: unknown,
): value is OcrExtractErrorResponse {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    (value.error.extraction === undefined ||
      isDocumentExtractionDiagnostics(value.error.extraction))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDocumentExtractionDiagnostics(
  value: unknown,
): value is DocumentExtractionDiagnostics {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.status === "complete" ||
      value.status === "incomplete" ||
      value.status === "failed") &&
    isNonNegativeInteger(value.expectedPageCount) &&
    isNonNegativeInteger(value.processedPageCount) &&
    isNonNegativeInteger(value.successfulPageCount) &&
    isNonNegativeInteger(value.blankPageCount) &&
    isNonNegativeInteger(value.failedPageCount) &&
    isIntegerArray(value.missingPageNumbers) &&
    isIntegerArray(value.duplicatePageNumbers) &&
    isIntegerArray(value.outOfRangePageNumbers) &&
    isIntegerArray(value.invalidPageNumbers) &&
    isIntegerArray(value.affectedPageNumbers) &&
    Array.isArray(value.failureCategories) &&
    value.failureCategories.every((entry) => typeof entry === "string")
  );
}

function isIntegerArray(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.every(isInteger);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function looksLikeStackTrace(value: string): boolean {
  return /\b(?:Error:|at\s+\S+\s+\(|stack)\b/i.test(value);
}

function isAbortError(error: unknown): boolean {
  const DomException = globalThis.DOMException;
  return (
    typeof DomException === "function" && error instanceof DomException
      ? error.name === "AbortError"
      : isRecord(error) && error.name === "AbortError"
  );
}
