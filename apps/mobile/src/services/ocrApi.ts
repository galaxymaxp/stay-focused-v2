import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const OCR_EXTRACT_PATH = "/api/ocr/extract";
const OCR_IMAGE_FORM_FIELD = "image";
export const OCR_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_ERROR_MESSAGE_CHARS = 300;

export const SUPPORTED_OCR_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
] as const;

export type OcrImageMimeType = (typeof SUPPORTED_OCR_IMAGE_MIME_TYPES)[number];

export interface OcrImageUpload {
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
  | "unsupported_media_type"
  | "image_too_large"
  | "empty_image"
  | "unauthorized"
  | "ocr_not_configured"
  | "ocr_provider_failed"
  | "ocr_empty_result"
  | "network_error"
  | "request_cancelled"
  | "invalid_response"
  | "unknown_error";

export interface OcrClientError {
  readonly code: OcrClientErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
}

export interface OcrExtractData {
  readonly text: string;
  readonly pages: readonly unknown[];
  readonly mimeType: string;
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
  };
}

type NativeFormDataFile = {
  readonly uri: string;
  readonly name: string;
  readonly type: OcrImageMimeType;
};

export async function extractOcrText(
  input: ExtractOcrTextInput,
): Promise<ExtractOcrTextResult> {
  const endpoint = createOcrEndpoint(input.apiBaseUrl);
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

    return await parseOcrResponse(response);
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

export function createNativeOcrUploadPart(
  image: ValidatedOcrImageUpload,
): NativeFormDataFile {
  return {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
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
    url: `${normalizedBaseUrl}${OCR_EXTRACT_PATH}`,
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

async function parseOcrResponse(response: Response): Promise<ExtractOcrTextResult> {
  const parsed = await readJson(response);

  if (!response.ok) {
    return apiError(response.status, parsed);
  }

  if (isOcrExtractSuccessResponse(parsed)) {
    if (parsed.data.text.trim().length === 0) {
      return clientError(
        "ocr_empty_result",
        "OCR returned no readable text from this image.",
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

function apiError(status: number, parsed: unknown): ExtractOcrTextResult {
  if (isOcrExtractErrorResponse(parsed)) {
    const code = mapApiErrorCode(parsed.error.code);
    return {
      ok: false,
      error: {
        code,
        message: safeApiErrorMessage(parsed.error.message, status, code),
        status,
        ...(code === "unknown_error" ? { apiCode: parsed.error.code } : {}),
      },
    };
  }

  return clientError(
    statusToClientErrorCode(status),
    statusToClientErrorMessage(status),
    status,
  );
}

function clientError(
  code: OcrClientErrorCode,
  message: string,
  status?: number,
): { readonly ok: false; readonly error: OcrClientError } {
  return {
    ok: false,
    error: {
      code,
      message: sanitizeOcrDiagnosticText(message),
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function mapApiErrorCode(code: string): OcrClientErrorCode {
  switch (code) {
    case "unauthorized":
    case "unsupported_media_type":
    case "invalid_image":
    case "image_too_large":
    case "empty_image":
    case "ocr_not_configured":
    case "ocr_provider_failed":
    case "ocr_empty_result":
    case "internal_error":
      return code === "internal_error" ? "unknown_error" : code;
    default:
      return "unknown_error";
  }
}

function statusToClientErrorCode(status: number): OcrClientErrorCode {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 413) {
    return "image_too_large";
  }
  if (status === 415) {
    return "unsupported_media_type";
  }
  if (status === 422) {
    return "ocr_empty_result";
  }
  if (status >= 500) {
    return "ocr_provider_failed";
  }
  return "invalid_response";
}

function statusToClientErrorMessage(status: number): string {
  if (status === 401) {
    return "OCR extraction requires a valid session.";
  }
  if (status === 413) {
    return `Choose an image that is at most ${formatBytes(OCR_MAX_IMAGE_BYTES)}.`;
  }
  if (status === 415) {
    return "Choose a PNG or JPEG image.";
  }
  if (status === 422) {
    return "OCR returned no readable text from this image.";
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
): string {
  if (code === "ocr_provider_failed") {
    return "OCR extraction failed on the server.";
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
    return statusToClientErrorMessage(status);
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
    Array.isArray(value.data.warnings)
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
    typeof value.error.message === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
