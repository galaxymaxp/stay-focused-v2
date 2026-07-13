import type { ReviewerOutput } from "@stay-focused/engine";

const REVIEWER_GENERATE_PATH = "/api/reviewer/generate";
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_ERROR_MESSAGE_CHARS = 300;
export const API_BASE_URL_SETUP_HINT =
  "Set EXPO_PUBLIC_API_BASE_URL. For Expo Web, use http://localhost:3000. For phone testing, use http://<LAN_IP>:3000.";

export interface GenerateReviewerInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly canvasPreviewSessionId?: string;
  readonly canvasCourseId?: string;
  readonly canvasItemIds?: readonly string[];
  readonly canvasResolutionFingerprint?: string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export type GenerateReviewerResult =
  | {
      readonly ok: true;
      readonly reviewer: ReviewerOutput;
      readonly sourceSnapshotId?: string;
    }
  | {
      readonly ok: false;
      readonly error: GenerateReviewerError;
    };

export type GenerateReviewerErrorCode =
  | "invalid_api_base_url"
  | "missing_access_token"
  | "missing_source_text"
  | "invalid_timeout"
  | "request_aborted"
  | "request_timeout"
  | "network_error"
  | "invalid_response"
  | "unauthorized"
  | "invalid_json"
  | "invalid_request"
  | "payload_too_large"
  | "source_text_too_large"
  | "provider_configuration_error"
  | "reviewer_validation_failed"
  | "reviewer_generation_failed"
  | "canvas_preview_session_missing"
  | "canvas_preview_session_expired"
  | "canvas_preview_session_not_found"
  | "canvas_preview_session_invalid"
  | "invalid_canvas_resolution"
  | "canvas_resolution_stale"
  | "canvas_resolution_failed"
  | "source_snapshot_failed"
  | "source_snapshot_storage_failed"
  | "unknown_api_error";

export interface GenerateReviewerError {
  readonly code: GenerateReviewerErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
}

interface ReviewerGenerateSuccessResponse {
  readonly ok: true;
  readonly reviewer: ReviewerOutput;
  readonly sourceSnapshotId?: string;
}

interface ReviewerGenerateErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export async function generateReviewer(
  input: GenerateReviewerInput,
): Promise<GenerateReviewerResult> {
  const endpoint = createReviewerEndpoint(input.apiBaseUrl);
  if (!endpoint.ok) {
    return endpoint;
  }

  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError(
      "missing_access_token",
      "An access token is required to generate a reviewer.",
    );
  }

  const sourceText = input.sourceText.trim();
  if (!sourceText) {
    return clientError(
      "missing_source_text",
      "sourceText is required to generate a reviewer.",
    );
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return clientError("invalid_timeout", "timeoutMs must be greater than 0.");
  }

  const sourceTitle = input.sourceTitle?.trim();
  const canvasPreviewSessionId = input.canvasPreviewSessionId?.trim();
  const canvasCourseId = input.canvasCourseId?.trim();
  const canvasItemIds = input.canvasItemIds?.map((item) => item.trim());
  const canvasResolutionFingerprint = input.canvasResolutionFingerprint?.trim();
  if (
    canvasPreviewSessionId &&
    (!canvasCourseId ||
      !canvasItemIds?.length ||
      !canvasResolutionFingerprint)
  ) {
    return clientError(
      "invalid_canvas_resolution",
      "Canvas preview identity is incomplete. Preview the selected sources again.",
    );
  }
  const requestBody = JSON.stringify({
    sourceText,
    ...(sourceTitle ? { sourceTitle } : {}),
    ...(canvasPreviewSessionId ? { canvasPreviewSessionId } : {}),
    ...(canvasPreviewSessionId
      ? {
          canvasCourseId,
          canvasItemIds,
          canvasResolutionFingerprint,
        }
      : {}),
  });
  const abortContext = createAbortContext(input.signal, timeoutMs);
  const startedAt = Date.now();

  try {
    logReviewerApiRequestStart(endpoint.url);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
      signal: abortContext.signal,
    });

    logReviewerApiResponse(response, startedAt);

    return await parseReviewerResponse(response, startedAt);
  } catch (error) {
    logReviewerApiThrownError(error, startedAt);

    if (abortContext.didTimeout()) {
      return clientError(
        "request_timeout",
        `Reviewer generation timed out after ${formatTimeoutMs(timeoutMs)} while waiting for the API response.`,
      );
    }

    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_aborted", "Reviewer generation was aborted.");
    }

    return clientError(
      "network_error",
      `Reviewer generation request failed before receiving a response. Check that the API host and port are reachable from this device. ${API_BASE_URL_SETUP_HINT}`,
    );
  } finally {
    abortContext.cleanup();
  }
}

function createReviewerEndpoint(
  apiBaseUrl: string,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: GenerateReviewerError } {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, "");

  if (!normalizedBaseUrl) {
    return clientError(
      "invalid_api_base_url",
      API_BASE_URL_SETUP_HINT,
    );
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
    url: `${normalizedBaseUrl}${REVIEWER_GENERATE_PATH}`,
  };
}

async function parseReviewerResponse(
  response: Response,
  startedAt: number,
): Promise<GenerateReviewerResult> {
  const parsed = await readJson(response);
  logReviewerApiParsedResponse(parsed);

  if (!response.ok) {
    logReviewerApiErrorBody(parsed);
    return apiError(response.status, parsed);
  }

  if (isReviewerGenerateErrorResponse(parsed)) {
    logReviewerApiErrorBody(parsed);
  }

  if (isReviewerGenerateSuccessResponse(parsed)) {
    logReviewerApiSuccessSummary(response, startedAt, parsed);
    return {
      ok: true,
      reviewer: parsed.reviewer,
      ...(parsed.sourceSnapshotId
        ? { sourceSnapshotId: parsed.sourceSnapshotId }
        : {}),
    };
  }

  return clientError(
    "invalid_response",
    "Reviewer generation returned an invalid response.",
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

function apiError(status: number, parsed: unknown): GenerateReviewerResult {
  if (isReviewerGenerateErrorResponse(parsed)) {
    const code = mapApiErrorCode(parsed.error.code);
    return {
      ok: false,
      error: {
        code,
        message: safeApiErrorMessage(parsed.error.message, status),
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
  code: GenerateReviewerErrorCode,
  message: string,
  status?: number,
): { readonly ok: false; readonly error: GenerateReviewerError } {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function mapApiErrorCode(code: string): GenerateReviewerErrorCode {
  switch (code) {
    case "unauthorized":
    case "invalid_json":
    case "invalid_request":
    case "payload_too_large":
    case "source_text_too_large":
    case "provider_configuration_error":
    case "reviewer_validation_failed":
    case "reviewer_generation_failed":
    case "canvas_preview_session_missing":
    case "canvas_preview_session_expired":
    case "canvas_preview_session_not_found":
    case "canvas_preview_session_invalid":
    case "canvas_resolution_stale":
    case "canvas_resolution_failed":
    case "source_snapshot_failed":
    case "source_snapshot_storage_failed":
      return code;
    default:
      return "unknown_api_error";
  }
}

function statusToClientErrorCode(status: number): GenerateReviewerErrorCode {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 400) {
    return "invalid_request";
  }
  if (status === 413) {
    return "payload_too_large";
  }
  if (status === 422) {
    return "reviewer_validation_failed";
  }
  if (status >= 500) {
    return "reviewer_generation_failed";
  }
  return "invalid_response";
}

function statusToClientErrorMessage(status: number): string {
  if (status === 401) {
    return "Reviewer generation requires a valid session.";
  }
  if (status === 400) {
    return "Reviewer generation request was invalid.";
  }
  if (status === 413) {
    return "Reviewer generation request was too large.";
  }
  if (status === 422) {
    return "Reviewer generation failed validation after retries.";
  }
  if (status >= 500) {
    return "Reviewer generation failed.";
  }
  return "Reviewer generation returned an unexpected response.";
}

function safeApiErrorMessage(message: string, status: number): string {
  const normalized = message.trim().slice(0, MAX_ERROR_MESSAGE_CHARS);
  if (!normalized || looksLikeStackTrace(normalized)) {
    return statusToClientErrorMessage(status);
  }
  return normalized;
}

function formatTimeoutMs(timeoutMs: number): string {
  if (timeoutMs % 1_000 === 0) {
    return `${timeoutMs / 1_000} seconds`;
  }
  return `${timeoutMs} ms`;
}

function looksLikeStackTrace(value: string): boolean {
  return /\b(?:Error:|at\s+\S+\s+\(|stack)\b/i.test(value);
}

function isReviewerGenerateSuccessResponse(
  value: unknown,
): value is ReviewerGenerateSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    "reviewer" in value &&
    (value.sourceSnapshotId === undefined ||
      typeof value.sourceSnapshotId === "string")
  );
}

function isReviewerGenerateErrorResponse(
  value: unknown,
): value is ReviewerGenerateErrorResponse {
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

function logReviewerApiRequestStart(url: string): void {
  console.info("reviewer_api.request_start", {
    url: redactUrlCredentials(url),
  });
}

function logReviewerApiResponse(response: Response, startedAt: number): void {
  console.info("reviewer_api.response", {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "(missing)",
    durationMs: Date.now() - startedAt,
  });
}

function logReviewerApiParsedResponse(parsed: unknown): void {
  console.info("reviewer_api.response_parsed", describeParsedResponse(parsed));
}

function logReviewerApiSuccessSummary(
  response: Response,
  startedAt: number,
  parsed: ReviewerGenerateSuccessResponse,
): void {
  console.info("reviewer_api.success_summary", {
    status: response.status,
    durationMs: Date.now() - startedAt,
    sectionCount: parsed.reviewer.sections.length,
    topLevelKeys: getTopLevelKeys(parsed),
  });
}

function logReviewerApiErrorBody(parsed: unknown): void {
  console.info("reviewer_api.error_body", stringifyForDiagnosticLog(parsed));
}

function logReviewerApiThrownError(error: unknown, startedAt: number): void {
  console.error("reviewer_api.request_error", {
    durationMs: Date.now() - startedAt,
    ...getThrownErrorDetails(error),
  });
}

function describeParsedResponse(parsed: unknown): {
  readonly type: string;
  readonly topLevelKeys: readonly string[];
  readonly errorKeys?: readonly string[];
  readonly reviewerKeys?: readonly string[];
} {
  if (!isRecord(parsed)) {
    return {
      type: Array.isArray(parsed) ? "array" : typeof parsed,
      topLevelKeys: [],
    };
  }

  return {
    type: "object",
    topLevelKeys: Object.keys(parsed).sort(),
    ...(isRecord(parsed.error)
      ? { errorKeys: Object.keys(parsed.error).sort() }
      : {}),
    ...(isRecord(parsed.reviewer)
      ? { reviewerKeys: Object.keys(parsed.reviewer).sort() }
      : {}),
  };
}

function getTopLevelKeys(value: unknown): readonly string[] {
  return isRecord(value) ? Object.keys(value).sort() : [];
}

function getThrownErrorDetails(error: unknown): {
  readonly errorName: string;
  readonly errorMessage: string;
} {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  if (isRecord(error)) {
    return {
      errorName: typeof error.name === "string" ? error.name : "(missing)",
      errorMessage:
        typeof error.message === "string" ? error.message : String(error),
    };
  }

  return {
    errorName: typeof error,
    errorMessage: String(error),
  };
}

function stringifyForDiagnosticLog(value: unknown): string {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized ?? String(value);
  } catch (error) {
    return `[unserializable response body: ${getDiagnosticString(error)}]`;
  }
}

function getDiagnosticString(value: unknown): string {
  try {
    return value instanceof Error ? value.message : String(value);
  } catch {
    return "unknown serialization error";
  }
}

function redactUrlCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function createAbortContext(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
  readonly didTimeout: () => boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  if (externalSignal?.aborted) {
    controller.abort();
  }

  const abortFromExternalSignal = (): void => {
    controller.abort();
  };
  externalSignal?.addEventListener("abort", abortFromExternalSignal);

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
    didTimeout: () => timedOut,
  };
}

function isAbortError(error: unknown): boolean {
  const DomException = globalThis.DOMException;
  return (
    typeof DomException === "function" && error instanceof DomException
      ? error.name === "AbortError"
      : isRecord(error) && error.name === "AbortError"
  );
}
