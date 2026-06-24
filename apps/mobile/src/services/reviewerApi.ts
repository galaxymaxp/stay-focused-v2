import type { ReviewerOutput } from "@stay-focused/engine";

const REVIEWER_GENERATE_PATH = "/api/reviewer/generate";
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_ERROR_MESSAGE_CHARS = 300;

export interface GenerateReviewerInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly sourceText: string;
  readonly sourceTitle?: string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export type GenerateReviewerResult =
  | {
      readonly ok: true;
      readonly reviewer: ReviewerOutput;
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
  | "reviewer_generation_failed"
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
  const requestBody = JSON.stringify({
    sourceText,
    ...(sourceTitle ? { sourceTitle } : {}),
  });
  const abortContext = createAbortContext(input.signal, timeoutMs);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
      signal: abortContext.signal,
    });

    return await parseReviewerResponse(response);
  } catch (error) {
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
      "Reviewer generation request failed before receiving a response.",
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
      "A valid API base URL is required.",
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
        "A valid HTTP(S) API base URL is required.",
      );
    }
  } catch {
    return clientError(
      "invalid_api_base_url",
      "A valid API base URL is required.",
    );
  }

  return {
    ok: true,
    url: `${normalizedBaseUrl}${REVIEWER_GENERATE_PATH}`,
  };
}

async function parseReviewerResponse(
  response: Response,
): Promise<GenerateReviewerResult> {
  const parsed = await readJson(response);

  if (!response.ok) {
    return apiError(response.status, parsed);
  }

  if (isReviewerGenerateSuccessResponse(parsed)) {
    return { ok: true, reviewer: parsed.reviewer };
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
    case "reviewer_generation_failed":
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
  return isRecord(value) && value.ok === true && "reviewer" in value;
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
