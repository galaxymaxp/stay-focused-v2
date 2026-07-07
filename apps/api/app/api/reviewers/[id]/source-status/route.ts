import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import { readReviewerSourceStatus } from "@/lib/reviewer-source-status";
import { validateReviewerId } from "@/lib/reviewers";
import type {
  ReviewerApiErrorCode,
  ReviewerSourceStatusApiResponse,
} from "@/types/reviewers";

export const runtime = "nodejs";

const CORS_ALLOWED_METHODS = "GET, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

interface ReviewerSourceStatusRouteContext {
  readonly params: Promise<{ readonly id: string }>;
}

export async function GET(
  request: Request,
  context: ReviewerSourceStatusRouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return errorResponse(
      401,
      "unauthorized",
      "Authorization header must be a valid Bearer token.",
      request,
    );
  }

  const params = await context.params;
  if (!validateReviewerId(params.id)) {
    return notFoundResponse(request);
  }

  let client: ReturnType<typeof createCanvasServiceClient>;
  try {
    client = createCanvasServiceClient();
  } catch {
    return errorResponse(
      500,
      "source_snapshot_storage_failed",
      "Canvas source status storage is not configured.",
      request,
    );
  }

  const result = await readReviewerSourceStatus({
    client,
    reviewerId: params.id,
    userId: user.id,
  });

  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message, request);
  }

  return jsonResponse({ ok: true, ...result.value }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request.headers.get("origin")),
  });
}

function notFoundResponse(request?: Request): Response {
  return errorResponse(
    404,
    "reviewer_not_found",
    "Saved reviewer was not found.",
    request,
  );
}

function errorResponse(
  status: 401 | 404 | 500,
  code: ReviewerApiErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status, request);
}

function jsonResponse(
  body: ReviewerSourceStatusApiResponse,
  status: 200 | 401 | 404 | 500,
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
      hostname === "::1" ||
      hostname === "[::1]";

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
