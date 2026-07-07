import type { ReviewerOutput } from "@stay-focused/engine";

import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const REVIEWERS_PATH = "/api/reviewers";
const MAX_ERROR_MESSAGE_CHARS = 300;

export type SavedReviewerSourceMode =
  | "paste"
  | "gallery"
  | "camera"
  | "pdf"
  | "canvas";

export interface SavedReviewerSourceMetadata {
  readonly sourceMode: SavedReviewerSourceMode;
  readonly sourceCharacterCount: number;
  readonly pdfPageCount?: number;
  readonly sourceLabel?: string;
}

export interface SavedReviewerSourceProvenanceSummary {
  readonly sourceSnapshotId: string;
  readonly sourceMode: "canvas";
  readonly sourceTitle: string;
  readonly sourceCount: number;
  readonly selectedBlockCount: number;
  readonly wasEdited: boolean;
  readonly generatedAt: string;
  readonly parserVersions: readonly string[];
  readonly ocrVersions: readonly string[];
}

export interface SavedReviewerSummary {
  readonly id: string;
  readonly title: string;
  readonly sourceMetadata: SavedReviewerSourceMetadata;
  readonly sectionCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SavedReviewerDetail extends SavedReviewerSummary {
  readonly reviewerOutput: ReviewerOutput;
  readonly sourceProvenance?: SavedReviewerSourceProvenanceSummary;
}

export interface ReviewerLibraryBaseInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

export interface SaveReviewerInput extends ReviewerLibraryBaseInput {
  readonly title: string;
  readonly sourceMetadata: SavedReviewerSourceMetadata;
  readonly reviewerOutput: ReviewerOutput;
  readonly sourceSnapshotId?: string;
}

export interface ReviewerIdInput extends ReviewerLibraryBaseInput {
  readonly reviewerId: string;
}

export interface RenameReviewerInput extends ReviewerIdInput {
  readonly title: string;
}

export type ReviewerLibraryResult<TData> =
  | {
      readonly ok: true;
      readonly data: TData;
    }
  | {
      readonly ok: false;
      readonly error: ReviewerLibraryError;
    };

export type ReviewerLibraryErrorCode =
  | "invalid_api_base_url"
  | "missing_access_token"
  | "missing_reviewer_id"
  | "invalid_title"
  | "invalid_source_metadata"
  | "invalid_reviewer_output"
  | "request_aborted"
  | "network_error"
  | "invalid_response"
  | "unauthorized"
  | "reviewer_not_found"
  | "reviewer_storage_not_configured"
  | "reviewer_storage_failed"
  | "source_snapshot_not_found"
  | "source_snapshot_ownership_mismatch"
  | "source_snapshot_required"
  | "source_snapshot_metadata_mismatch"
  | "source_snapshot_storage_failed"
  | "unknown_api_error";

export interface ReviewerLibraryError {
  readonly code: ReviewerLibraryErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
}

interface ReviewerListSuccessResponse {
  readonly ok: true;
  readonly reviewers: readonly SavedReviewerSummary[];
}

interface ReviewerDetailSuccessResponse {
  readonly ok: true;
  readonly reviewer: SavedReviewerDetail;
}

interface ReviewerSummarySuccessResponse {
  readonly ok: true;
  readonly reviewer: SavedReviewerSummary;
}

interface ReviewerDeleteSuccessResponse {
  readonly ok: true;
}

interface ReviewerApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export async function listReviewers(
  input: ReviewerLibraryBaseInput,
): Promise<ReviewerLibraryResult<readonly SavedReviewerSummary[]>> {
  const endpoint = createEndpoint(input.apiBaseUrl, REVIEWERS_PATH);
  if (!endpoint.ok) {
    return endpoint;
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseReviewerListResponse,
  });
}

export async function saveReviewer(
  input: SaveReviewerInput,
): Promise<ReviewerLibraryResult<SavedReviewerDetail>> {
  const endpoint = createEndpoint(input.apiBaseUrl, REVIEWERS_PATH);
  if (!endpoint.ok) {
    return endpoint;
  }

  const title = input.title.trim();
  if (!title) {
    return clientError("invalid_title", "A title is required to save a reviewer.");
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "POST",
    body: {
      title,
      sourceMetadata: input.sourceMetadata,
      reviewerOutput: input.reviewerOutput,
      ...(input.sourceSnapshotId ? { sourceSnapshotId: input.sourceSnapshotId } : {}),
    },
    parseSuccess: parseReviewerDetailResponse,
  });
}

export async function getReviewer(
  input: ReviewerIdInput,
): Promise<ReviewerLibraryResult<SavedReviewerDetail>> {
  const endpoint = createReviewerEndpoint(input);
  if (!endpoint.ok) {
    return endpoint;
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseReviewerDetailResponse,
  });
}

export async function renameReviewer(
  input: RenameReviewerInput,
): Promise<ReviewerLibraryResult<SavedReviewerSummary>> {
  const endpoint = createReviewerEndpoint(input);
  if (!endpoint.ok) {
    return endpoint;
  }

  const title = input.title.trim();
  if (!title) {
    return clientError("invalid_title", "A title is required.");
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "PATCH",
    body: { title },
    parseSuccess: parseReviewerSummaryResponse,
  });
}

export async function deleteReviewer(
  input: ReviewerIdInput,
): Promise<ReviewerLibraryResult<void>> {
  const endpoint = createReviewerEndpoint(input);
  if (!endpoint.ok) {
    return endpoint;
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "DELETE",
    parseSuccess: parseReviewerDeleteResponse,
  });
}

function createReviewerEndpoint(
  input: ReviewerIdInput,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: ReviewerLibraryError } {
  const reviewerId = input.reviewerId.trim();
  if (!reviewerId) {
    return clientError("missing_reviewer_id", "A saved reviewer ID is required.");
  }

  return createEndpoint(input.apiBaseUrl, `${REVIEWERS_PATH}/${reviewerId}`);
}

function createEndpoint(
  apiBaseUrl: string,
  path: string,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: ReviewerLibraryError } {
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

  return { ok: true, url: `${normalizedBaseUrl}${path}` };
}

async function requestJson<TData>({
  body,
  endpoint,
  input,
  method,
  parseSuccess,
}: {
  readonly body?: unknown;
  readonly endpoint: string;
  readonly input: ReviewerLibraryBaseInput;
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly parseSuccess: (parsed: unknown) => ReviewerLibraryResult<TData>;
}): Promise<ReviewerLibraryResult<TData>> {
  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError(
      "missing_access_token",
      "A valid session is required for the Study Library.",
    );
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: input.signal,
    });
    const parsed = await readJson(response);

    if (!response.ok) {
      return apiError(response.status, parsed);
    }

    return parseSuccess(parsed);
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_aborted", "Study Library request was aborted.");
    }

    return clientError(
      "network_error",
      `Study Library request failed before receiving a response. ${API_BASE_URL_SETUP_HINT}`,
    );
  }
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

function parseReviewerListResponse(
  parsed: unknown,
): ReviewerLibraryResult<readonly SavedReviewerSummary[]> {
  if (isReviewerListSuccessResponse(parsed)) {
    return { ok: true, data: parsed.reviewers };
  }

  return clientError(
    "invalid_response",
    "Study Library returned an invalid list response.",
  );
}

function parseReviewerDetailResponse(
  parsed: unknown,
): ReviewerLibraryResult<SavedReviewerDetail> {
  if (isReviewerDetailSuccessResponse(parsed)) {
    return { ok: true, data: parsed.reviewer };
  }

  return clientError(
    "invalid_response",
    "Study Library returned an invalid reviewer response.",
  );
}

function parseReviewerSummaryResponse(
  parsed: unknown,
): ReviewerLibraryResult<SavedReviewerSummary> {
  if (isReviewerSummarySuccessResponse(parsed)) {
    return { ok: true, data: parsed.reviewer };
  }

  return clientError(
    "invalid_response",
    "Study Library returned an invalid reviewer response.",
  );
}

function parseReviewerDeleteResponse(
  parsed: unknown,
): ReviewerLibraryResult<void> {
  if (isReviewerDeleteSuccessResponse(parsed)) {
    return { ok: true, data: undefined };
  }

  return clientError(
    "invalid_response",
    "Study Library returned an invalid delete response.",
  );
}

function apiError(status: number, parsed: unknown): ReviewerLibraryResult<never> {
  if (isReviewerApiErrorResponse(parsed)) {
    const code = mapApiErrorCode(parsed.error.code);
    return {
      ok: false,
      error: {
        code,
        message: safeApiErrorMessage(parsed.error.message, status, code),
        status,
        ...(code === "unknown_api_error" ? { apiCode: parsed.error.code } : {}),
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
  code: ReviewerLibraryErrorCode,
  message: string,
  status?: number,
): { readonly ok: false; readonly error: ReviewerLibraryError } {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function mapApiErrorCode(code: string): ReviewerLibraryErrorCode {
  switch (code) {
    case "unauthorized":
    case "invalid_title":
    case "invalid_source_metadata":
    case "invalid_reviewer_output":
    case "reviewer_not_found":
    case "reviewer_storage_not_configured":
    case "reviewer_storage_failed":
    case "source_snapshot_not_found":
    case "source_snapshot_ownership_mismatch":
    case "source_snapshot_required":
    case "source_snapshot_metadata_mismatch":
    case "source_snapshot_storage_failed":
      return code;
    case "invalid_json":
    case "invalid_request":
      return "invalid_response";
    default:
      return "unknown_api_error";
  }
}

function statusToClientErrorCode(status: number): ReviewerLibraryErrorCode {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 404) {
    return "reviewer_not_found";
  }
  if (status >= 500) {
    return "reviewer_storage_failed";
  }
  return "invalid_response";
}

function statusToClientErrorMessage(status: number): string {
  if (status === 401) {
    return "Your login session has expired. Sign in again.";
  }
  if (status === 404) {
    return "Saved reviewer was not found.";
  }
  if (status >= 500) {
    return "Study Library could not complete the request.";
  }
  return "Study Library returned an unexpected response.";
}

function safeApiErrorMessage(
  message: string,
  status: number,
  code: ReviewerLibraryErrorCode,
): string {
  if (code === "unauthorized") {
    return "Your login session has expired. Sign in again.";
  }
  if (code === "reviewer_storage_not_configured") {
    return "Study Library storage is not configured for this API.";
  }
  if (code === "reviewer_storage_failed") {
    return "Study Library could not complete the request.";
  }

  const normalized = sanitizeDiagnosticText(message)
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_CHARS);
  if (!normalized || looksLikeStackTrace(normalized)) {
    return statusToClientErrorMessage(status);
  }
  return normalized;
}

function isReviewerListSuccessResponse(
  value: unknown,
): value is ReviewerListSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    Array.isArray(value.reviewers) &&
    value.reviewers.every(isSavedReviewerSummary)
  );
}

function isReviewerDetailSuccessResponse(
  value: unknown,
): value is ReviewerDetailSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    isSavedReviewerSummary(value.reviewer) &&
    isRecord(value.reviewer) &&
    "reviewerOutput" in value.reviewer &&
    (value.reviewer.sourceProvenance === undefined ||
      isSavedReviewerSourceProvenanceSummary(value.reviewer.sourceProvenance))
  );
}

function isReviewerSummarySuccessResponse(
  value: unknown,
): value is ReviewerSummarySuccessResponse {
  return isRecord(value) && value.ok === true && isSavedReviewerSummary(value.reviewer);
}

function isReviewerDeleteSuccessResponse(
  value: unknown,
): value is ReviewerDeleteSuccessResponse {
  return isRecord(value) && value.ok === true;
}

function isReviewerApiErrorResponse(
  value: unknown,
): value is ReviewerApiErrorResponse {
  return (
    isRecord(value) &&
    value.ok === false &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function isSavedReviewerSummary(value: unknown): value is SavedReviewerSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isSourceMetadata(value.sourceMetadata) &&
    typeof value.sectionCount === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isSourceMetadata(value: unknown): value is SavedReviewerSourceMetadata {
  return (
    isRecord(value) &&
    isSourceMode(value.sourceMode) &&
    typeof value.sourceCharacterCount === "number" &&
    (value.pdfPageCount === undefined || typeof value.pdfPageCount === "number") &&
    (value.sourceLabel === undefined || typeof value.sourceLabel === "string")
  );
}

function isSavedReviewerSourceProvenanceSummary(
  value: unknown,
): value is SavedReviewerSourceProvenanceSummary {
  return (
    isRecord(value) &&
    typeof value.sourceSnapshotId === "string" &&
    value.sourceMode === "canvas" &&
    typeof value.sourceTitle === "string" &&
    typeof value.sourceCount === "number" &&
    typeof value.selectedBlockCount === "number" &&
    typeof value.wasEdited === "boolean" &&
    typeof value.generatedAt === "string" &&
    Array.isArray(value.parserVersions) &&
    value.parserVersions.every((entry) => typeof entry === "string") &&
    Array.isArray(value.ocrVersions) &&
    value.ocrVersions.every((entry) => typeof entry === "string")
  );
}

function isSourceMode(value: unknown): value is SavedReviewerSourceMode {
  return (
    value === "paste" ||
    value === "gallery" ||
    value === "camera" ||
    value === "pdf" ||
    value === "canvas"
  );
}

function looksLikeStackTrace(value: string): boolean {
  return /\b(?:Error:|at\s+\S+\s+\(|stack)\b/i.test(value);
}

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(
      /(authorization|access_token|refresh_token|id_token|private_key|client_email|GOOGLE_CLOUD_CREDENTIALS_JSON|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY)(["'\s:=]+)([^"'\s,}]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(/\b[A-Z]:\\[^\s"']+/g, "[REDACTED_PATH]");
}

function isAbortError(error: unknown): boolean {
  const DomException = globalThis.DOMException;
  return (
    typeof DomException === "function" && error instanceof DomException
      ? error.name === "AbortError"
      : isRecord(error) && error.name === "AbortError"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
