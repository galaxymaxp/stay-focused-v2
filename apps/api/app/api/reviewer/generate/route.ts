import { runPipeline } from "@stay-focused/engine";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createServerOpenAIProvider } from "@/providers";
import type {
  ReviewerGenerateErrorResponse,
  ReviewerGenerateRequest,
  ReviewerGenerateResponse,
} from "@/types/reviewer";

export const runtime = "nodejs";

// Temporary Phase 2 cap for plain text input before upload, OCR, and chunking
// are introduced. 100k characters bounds request cost while still allowing
// long notes or pasted reading material.
const MAX_SOURCE_TEXT_CHARS = 100_000;
const MAX_JSON_BODY_BYTES = 512 * 1024;

type ValidationResult =
  | { readonly ok: true; readonly value: ReviewerGenerateRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: string;
      readonly message: string;
    };

export async function POST(request: Request): Promise<Response> {
  if (!hasBearerToken(request.headers.get("authorization"))) {
    return errorResponse(
      401,
      "unauthorized",
      "Authorization header must be Bearer token.",
    );
  }

  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return errorResponse(
      413,
      "payload_too_large",
      `Request body must be at most ${MAX_JSON_BODY_BYTES} bytes.`,
    );
  }

  const body = await readJson(request);
  if (!body.ok) {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  const validation = validateRequestBody(body.value);
  if (!validation.ok) {
    return errorResponse(
      validation.status,
      validation.code,
      validation.message,
    );
  }

  const user = await verifyBearerToken(request);
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Bearer token is invalid or expired.",
    );
  }

  const provider = createProvider();
  if (!provider.ok) {
    return errorResponse(
      500,
      "provider_configuration_error",
      "Reviewer provider is not configured.",
    );
  }

  try {
    const reviewer = await runPipeline({
      input: {
        text: validation.value.sourceText,
        title: validation.value.sourceTitle,
      },
      provider: provider.value,
    });

    return jsonResponse({ ok: true, reviewer }, 200);
  } catch {
    return errorResponse(
      500,
      "reviewer_generation_failed",
      "Reviewer generation failed.",
    );
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
  status: 400 | 401 | 413 | 500,
  code: string,
  message: string,
): Response {
  return jsonResponse(
    {
      ok: false,
      error: { code, message },
    },
    status,
  );
}

function jsonResponse(
  body: ReviewerGenerateResponse | ReviewerGenerateErrorResponse,
  status: 200 | 400 | 401 | 413 | 500,
): Response {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
