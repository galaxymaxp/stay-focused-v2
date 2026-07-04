import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, ReviewerRow } from "@stay-focused/db";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createReviewerUserClient } from "@/lib/reviewer-db";
import {
  mapReviewerDetail,
  mapReviewerSummary,
  readBearerToken,
  validateRenameReviewerRequest,
  validateReviewerId,
} from "@/lib/reviewers";
import type {
  ReviewerApiErrorCode,
  ReviewerDeleteResponse,
  ReviewerDetailResponse,
  ReviewerSummaryResponse,
} from "@/types/reviewers";

export const runtime = "nodejs";

const REVIEWER_DETAIL_COLUMNS =
  "id,title,source_metadata,reviewer_output,section_count,created_at,updated_at,user_id";
const REVIEWER_SUMMARY_COLUMNS =
  "id,title,source_metadata,section_count,created_at,updated_at,user_id";
const CORS_ALLOWED_METHODS = "GET, PATCH, DELETE, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

interface ReviewerAuthContext {
  readonly user: User;
  readonly accessToken: string;
  readonly client: SupabaseClient<Database>;
}

interface ReviewerRouteContext {
  readonly params: Promise<{ readonly id: string }> | { readonly id: string };
}

export async function GET(
  request: Request,
  context: ReviewerRouteContext,
): Promise<Response> {
  const auth = await requireReviewerAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const id = await readRouteReviewerId(context);
  if (!validateReviewerId(id)) {
    return notFoundResponse(request);
  }

  const { data, error } = await auth.value.client
    .from("reviewers")
    .select(REVIEWER_DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be loaded.",
      request,
    );
  }

  if (!data) {
    return notFoundResponse(request);
  }

  const detail = mapReviewerDetail(data as ReviewerRow);
  if (!detail.ok) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be loaded.",
      request,
    );
  }

  return jsonResponse({ ok: true, reviewer: detail.value }, 200, request);
}

export async function PATCH(
  request: Request,
  context: ReviewerRouteContext,
): Promise<Response> {
  const auth = await requireReviewerAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const id = await readRouteReviewerId(context);
  if (!validateReviewerId(id)) {
    return notFoundResponse(request);
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

  const validation = validateRenameReviewerRequest(body.value);
  if (!validation.ok) {
    return errorResponse(
      validation.code === "invalid_request" ? 400 : 422,
      validation.code,
      validation.message,
      request,
    );
  }

  const { data, error } = await auth.value.client
    .from("reviewers")
    .update({ title: validation.value.title })
    .eq("id", id)
    .select(REVIEWER_SUMMARY_COLUMNS)
    .maybeSingle();

  if (error) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be renamed.",
      request,
    );
  }

  if (!data) {
    return notFoundResponse(request);
  }

  return jsonResponse(
    { ok: true, reviewer: mapReviewerSummary(data as ReviewerRow) },
    200,
    request,
  );
}

export async function DELETE(
  request: Request,
  context: ReviewerRouteContext,
): Promise<Response> {
  const auth = await requireReviewerAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const id = await readRouteReviewerId(context);
  if (!validateReviewerId(id)) {
    return notFoundResponse(request);
  }

  const { data, error } = await auth.value.client
    .from("reviewers")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be deleted.",
      request,
    );
  }

  if (!data) {
    return notFoundResponse(request);
  }

  return jsonResponse({ ok: true }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request.headers.get("origin")),
  });
}

async function requireReviewerAuth(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: ReviewerAuthContext }
  | { readonly ok: false; readonly response: Response }
> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "unauthorized",
        "Authorization header must be a valid Bearer token.",
        request,
      ),
    };
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "unauthorized",
        "Authorization header must be a valid Bearer token.",
        request,
      ),
    };
  }

  try {
    return {
      ok: true,
      value: {
        user,
        accessToken,
        client: createReviewerUserClient(accessToken),
      },
    };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        500,
        "reviewer_storage_not_configured",
        "Reviewer storage is not configured.",
        request,
      ),
    };
  }
}

async function readRouteReviewerId(
  context: ReviewerRouteContext,
): Promise<string> {
  const params = await context.params;
  return params.id;
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

function notFoundResponse(request?: Request): Response {
  return errorResponse(
    404,
    "reviewer_not_found",
    "Saved reviewer was not found.",
    request,
  );
}

function errorResponse(
  status: 400 | 401 | 404 | 422 | 500,
  code: ReviewerApiErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status, request);
}

function jsonResponse(
  body: ReviewerDetailResponse | ReviewerSummaryResponse | ReviewerDeleteResponse,
  status: 200 | 400 | 401 | 404 | 422 | 500,
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
