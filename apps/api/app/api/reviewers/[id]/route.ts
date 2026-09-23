import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@stay-focused/db";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import { createReviewerUserClient } from "@/lib/reviewer-db";
import { readCanonicalReviewerRecord } from "@/lib/canonical-reviewers";
import { readSafeReviewerSourceProvenanceSummary } from "@/lib/reviewer-source-provenance";
import {
  canonicalReviewerSnapshotId,
  mapCanonicalReviewerDetail,
  mapCanonicalReviewerSummary,
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

const CORS_ALLOWED_METHODS = "GET, PATCH, DELETE, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

interface ReviewerAuthContext {
  readonly user: User;
  readonly accessToken: string;
  readonly client: SupabaseClient<Database>;
}

interface ReviewerRouteContext {
  readonly params: Promise<{ readonly id: string }>;
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

  const result = await readCanonicalReviewerRecord(auth.value.client, auth.value.user.id, id);
  if (!result.ok) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be loaded.",
      request,
    );
  }

  if (!result.value) {
    return notFoundResponse(request);
  }

  let sourceProvenance = null;
  const sourceSnapshotId = canonicalReviewerSnapshotId(result.value.source);
  if (sourceSnapshotId) {
    let provenanceClient: ReturnType<typeof createCanvasServiceClient>;
    try {
      provenanceClient = createCanvasServiceClient();
    } catch {
      return errorResponse(
        500,
        "source_snapshot_storage_failed",
        "Canvas source provenance storage is not configured.",
        request,
      );
    }

    const provenance = await readSafeReviewerSourceProvenanceSummary({
      client: provenanceClient,
      sourceSnapshotId,
      userId: auth.value.user.id,
    });
    if (!provenance.ok) {
      return errorResponse(
        provenance.status === 409 ? 500 : provenance.status,
        provenance.code,
        provenance.message,
        request,
      );
    }
    sourceProvenance = provenance.value;
  }

  const detail = mapCanonicalReviewerDetail(result.value.artifact, result.value.version, result.value.source, sourceProvenance);
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

  const { data, error } = await auth.value.client.rpc("rename_reviewer_artifact", {
    p_artifact_id: id,
    p_title: validation.value.title,
  });
  if (error && error.message === "reviewer_not_found") return notFoundResponse(request);
  if (error || !data?.[0]) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be renamed.",
      request,
    );
  }

  const record = await readCanonicalReviewerRecord(auth.value.client, auth.value.user.id, id);
  if (!record.ok) return errorResponse(500, "reviewer_storage_failed", "Saved reviewer could not be loaded.", request);
  if (!record.value) return notFoundResponse(request);
  return jsonResponse(
    { ok: true, reviewer: mapCanonicalReviewerSummary(data[0], record.value.version, record.value.source) },
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

  const { data, error } = await auth.value.client.rpc("delete_reviewer_artifact", { p_artifact_id: id });
  if (error?.message === "reviewer_not_found") return notFoundResponse(request);
  if (error?.message === "reviewer_has_quizzes") {
    return errorResponse(409, "reviewer_has_quizzes", "Delete the dependent Quizzes first or keep this Reviewer.", request);
  }
  if (error || data !== true) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewer could not be deleted.",
      request,
    );
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
  status: 400 | 401 | 404 | 409 | 422 | 500,
  code: ReviewerApiErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status, request);
}

function jsonResponse(
  body: ReviewerDetailResponse | ReviewerSummaryResponse | ReviewerDeleteResponse,
  status: 200 | 400 | 401 | 404 | 409 | 422 | 500,
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
