import { PipelineAssemblyError, runPipeline } from "@stay-focused/engine";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createServerOpenAIProvider } from "@/providers";
import type {
  ReviewerGenerateErrorResponse,
  ReviewerGenerateRequest,
  ReviewerGenerateResponse,
} from "@/types/reviewer";

export const runtime = "nodejs";
export const maxDuration = 120;

// Temporary Phase 2 cap for plain text input before upload, OCR, and chunking
// are introduced. 100k characters bounds request cost while still allowing
// long notes or pasted reading material.
const MAX_SOURCE_TEXT_CHARS = 100_000;
const MAX_JSON_BODY_BYTES = 512 * 1024;
const MAX_DIAGNOSTIC_TEXT_CHARS = 4_000;
const REVIEWER_GENERATE_ROUTE = "/api/reviewer/generate";
const REVIEWER_VALIDATION_FAILED_CODE = "reviewer_validation_failed";
const REVIEWER_VALIDATION_FAILED_MESSAGE =
  "Reviewer generation failed because one section could not pass validation after retries.";
const CORS_ALLOWED_METHODS = "POST, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

type ValidationResult =
  | { readonly ok: true; readonly value: ReviewerGenerateRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: string;
      readonly message: string;
    };

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();

  try {
    return await handlePost(request, requestId);
  } catch (error) {
    logReviewerGenerationError(requestId, error);
    const mappedError = mapReviewerGenerationError(error);
    return errorResponse(
      mappedError.status,
      mappedError.code,
      mappedError.message,
      request,
      mappedError.diagnostic,
    );
  }
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request.headers.get("origin")),
  });
}

async function handlePost(
  request: Request,
  requestId: string,
): Promise<Response> {
  if (!hasBearerToken(request.headers.get("authorization"))) {
    return errorResponse(
      401,
      "unauthorized",
      "Authorization header must be Bearer token.",
      request,
    );
  }

  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return errorResponse(
      413,
      "payload_too_large",
      `Request body must be at most ${MAX_JSON_BODY_BYTES} bytes.`,
      request,
    );
  }

  const body = await readJson(request);
  if (!body.ok) {
    return errorResponse(
      400,
      "invalid_json",
      "Request body must be valid JSON.",
      request,
    );
  }

  const validation = validateRequestBody(body.value);
  if (!validation.ok) {
    return errorResponse(
      validation.status,
      validation.code,
      validation.message,
      request,
    );
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Bearer token is invalid or expired.",
      request,
    );
  }

  const provider = createProvider();
  if (!provider.ok) {
    return errorResponse(
      500,
      "provider_configuration_error",
      "Reviewer provider is not configured.",
      request,
    );
  }

  const startedAt = Date.now();
  let outcome: "success" | "error" = "error";
  logReviewerGenerationStart(requestId);

  try {
    const reviewer = await runPipeline({
      input: {
        text: validation.value.sourceText,
        title: validation.value.sourceTitle,
      },
      provider: provider.value,
    });

    outcome = "success";
    return jsonResponse({ ok: true, reviewer }, 200, request);
  } catch (error) {
    logReviewerGenerationError(requestId, error);
    const mappedError = mapReviewerGenerationError(error);
    return errorResponse(
      mappedError.status,
      mappedError.code,
      mappedError.message,
      request,
      mappedError.diagnostic,
    );
  } finally {
    logReviewerGenerationEnd(requestId, startedAt, outcome);
  }
}

function hasBearerToken(authHeader: string | null): boolean {
  if (!authHeader) {
    return false;
  }

  const [scheme, token, extra] = authHeader.split(" ");
  return (
    scheme === "Bearer" &&
    typeof token === "string" &&
    token.trim().length > 0 &&
    extra === undefined
  );
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }

  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_JSON_BODY_BYTES;
}

async function readJson(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false }
> {
  try {
    return { ok: true, value: (await request.json()) as unknown };
  } catch {
    return { ok: false };
  }
}

function validateRequestBody(body: unknown): ValidationResult {
  if (!isRecord(body)) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const sourceText = body["sourceText"];
  if (typeof sourceText !== "string") {
    return invalidRequest("sourceText is required and must be a string.");
  }

  if (sourceText.length > MAX_SOURCE_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      code: "source_text_too_large",
      message: `sourceText must be at most ${MAX_SOURCE_TEXT_CHARS} characters.`,
    };
  }

  const normalizedSourceText = sourceText.trim();
  if (normalizedSourceText.length === 0) {
    return invalidRequest("sourceText must not be empty.");
  }

  const sourceTitle = body["sourceTitle"];
  if (sourceTitle !== undefined && typeof sourceTitle !== "string") {
    return invalidRequest("sourceTitle must be a string when provided.");
  }

  const normalizedSourceTitle =
    typeof sourceTitle === "string" ? sourceTitle.trim() : "";

  return {
    ok: true,
    value: {
      sourceText: normalizedSourceText,
      ...(normalizedSourceTitle
        ? { sourceTitle: normalizedSourceTitle }
        : {}),
    },
  };
}

function invalidRequest(message: string): ValidationResult {
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message,
  };
}

function createProvider():
  | {
      readonly ok: true;
      readonly value: ReturnType<typeof createServerOpenAIProvider>;
    }
  | { readonly ok: false } {
  try {
    return { ok: true, value: createServerOpenAIProvider() };
  } catch {
    return { ok: false };
  }
}

function errorResponse(
  status: 400 | 401 | 413 | 422 | 500,
  code: string,
  message: string,
  request?: Request,
  diagnostic?: ReviewerGenerateErrorResponse["error"]["diagnostic"],
): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code,
        message,
        ...(diagnostic ? { diagnostic } : {}),
      },
    },
    status,
    request,
  );
}

function jsonResponse(
  body: ReviewerGenerateResponse | ReviewerGenerateErrorResponse,
  status: 200 | 400 | 401 | 413 | 422 | 500,
  request?: Request,
): Response {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...createCorsHeaders(request?.headers.get("origin") ?? null),
    },
  });
}

function createCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = getAllowedCorsOrigin(origin);
  if (!allowedOrigin) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Max-Age": CORS_MAX_AGE_SECONDS,
    Vary: "Origin",
  };
}

function getAllowedCorsOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";

    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      isLocalhost
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function mapReviewerGenerationError(error: unknown): {
  readonly status: 422 | 500;
  readonly code: string;
  readonly message: string;
  readonly diagnostic?: ReviewerGenerateErrorResponse["error"]["diagnostic"];
} {
  if (isReviewerValidationFailure(error)) {
    const diagnostic = createReviewerValidationDiagnostic(error);
    return {
      status: 422,
      code: REVIEWER_VALIDATION_FAILED_CODE,
      message: REVIEWER_VALIDATION_FAILED_MESSAGE,
      ...(diagnostic ? { diagnostic } : {}),
    };
  }

  return {
    status: 500,
    code: "reviewer_generation_failed",
    message: "Reviewer generation failed.",
  };
}

function createReviewerValidationDiagnostic(
  error: unknown,
): ReviewerGenerateErrorResponse["error"]["diagnostic"] | undefined {
  if (
    process.env.NODE_ENV === "production" ||
    !(error instanceof PipelineAssemblyError)
  ) {
    return undefined;
  }

  const validationFailure = error.diagnostics.sectionValidationFailures[0];
  const failingSection = error.diagnostics.failingSections[0];
  const validationReason =
    failingSection?.failureReasons[0] ??
    (validationFailure
      ? `stage3-${validationFailure.reason}`
      : undefined);
  const diagnostic = {
    failingStage: failingStageForReason(validationReason),
    failingSectionTitle:
      failingSection?.title ?? validationFailure?.sectionTitle,
    validationReason,
    retryCount: failingSection?.retryCount,
  };

  return Object.fromEntries(
    Object.entries(diagnostic).filter(
      ([, value]) => value !== undefined,
    ),
  ) as ReviewerGenerateErrorResponse["error"]["diagnostic"];
}

function failingStageForReason(reason: string | undefined): string | undefined {
  if (!reason) {
    return undefined;
  }
  if (reason.startsWith("coverage-")) {
    return "stage4-coverage";
  }
  if (reason.startsWith("grounding-")) {
    return "stage5a-grounding";
  }
  if (reason.startsWith("leakage-")) {
    return "stage5-leakage";
  }
  if (reason === "missing-output" || reason.startsWith("stage3-")) {
    return "stage3-generation";
  }
  return undefined;
}

function isReviewerValidationFailure(error: unknown): boolean {
  if (!(error instanceof PipelineAssemblyError)) {
    return false;
  }

  if (error.diagnostics.sectionValidationFailures.length > 0) {
    return true;
  }

  return error.diagnostics.failingSections.some((section) =>
    section.failureReasons.some(isExpectedValidationFailureReason),
  );
}

function isExpectedValidationFailureReason(reason: string): boolean {
  return (
    reason === "coverage-weak" ||
    reason === "coverage-failed" ||
    reason === "grounding-failed" ||
    reason === "leakage-failed" ||
    reason === "missing-output" ||
    reason === "stage3-output-validation" ||
    reason === "stage3-instruction-leakage"
  );
}

function createRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function logReviewerGenerationStart(requestId: string): void {
  console.info("reviewer_generation.start", {
    requestId,
    route: REVIEWER_GENERATE_ROUTE,
  });
}

function logReviewerGenerationEnd(
  requestId: string,
  startedAt: number,
  outcome: "success" | "error",
): void {
  console.info("reviewer_generation.end", {
    requestId,
    route: REVIEWER_GENERATE_ROUTE,
    outcome,
    durationMs: Date.now() - startedAt,
  });
}

function logReviewerGenerationError(requestId: string, error: unknown): void {
  console.error("reviewer_generation.error", {
    requestId,
    route: REVIEWER_GENERATE_ROUTE,
    ...getSafeErrorDetails(error),
  });
}

function getSafeErrorDetails(error: unknown): {
  readonly errorName: string;
  readonly errorMessage: string;
  readonly stack?: string;
  readonly diagnostics?: unknown;
} {
  if (error instanceof Error) {
    return {
      errorName: sanitizeDiagnosticText(error.name || "Error"),
      errorMessage: sanitizeDiagnosticText(error.message || "(missing)"),
      ...(error.stack ? { stack: sanitizeDiagnosticText(error.stack) } : {}),
      ...(error instanceof PipelineAssemblyError
        ? { diagnostics: sanitizeDiagnosticValue(error.diagnostics) }
        : {}),
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: sanitizeDiagnosticText(getDiagnosticString(error)),
  };
}

function sanitizeDiagnosticValue(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return "[truncated]";
  }
  if (typeof value === "string") {
    return sanitizeDiagnosticText(value);
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((entry) => sanitizeDiagnosticValue(entry, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([key, entry]) => [
          sanitizeDiagnosticText(key),
          sanitizeDiagnosticValue(entry, depth + 1),
        ]),
    );
  }

  return sanitizeDiagnosticText(getDiagnosticString(value));
}

function sanitizeDiagnosticText(value: string): string {
  const redacted = value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, "[REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[REDACTED]",
    );

  if (redacted.length <= MAX_DIAGNOSTIC_TEXT_CHARS) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_DIAGNOSTIC_TEXT_CHARS)}...[truncated]`;
}

function getDiagnosticString(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "Unknown error";
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
