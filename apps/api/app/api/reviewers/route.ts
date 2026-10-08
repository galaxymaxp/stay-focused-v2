import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@stay-focused/db";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import { createReviewerUserClient } from "@/lib/reviewer-db";
import { listCanonicalReviewerRecords } from "@/lib/canonical-reviewers";
import {
  readSafeReviewerSourceProvenanceSummary,
  verifyReviewerSourceSnapshotForSave,
} from "@/lib/reviewer-source-provenance";
import {
  canonicalReviewerSnapshotId,
  mapCanonicalReviewerDetail,
  mapCanonicalReviewerSummary,
  readBearerToken,
  validateCreateReviewerRequest,
} from "@/lib/reviewers";
import type {
  ReviewerApiErrorCode,
  ReviewerDetailResponse,
  ReviewerListResponse,
} from "@/types/reviewers";

export const runtime = "nodejs";

const CORS_ALLOWED_METHODS = "GET, POST, OPTIONS";
const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";

interface ReviewerAuthContext {
  readonly user: User;
  readonly accessToken: string;
  readonly client: SupabaseClient<Database>;
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireReviewerAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const records = await listCanonicalReviewerRecords(auth.value.client, auth.value.user.id);
  if (!records.ok) {
    return errorResponse(
      500,
      "reviewer_storage_failed",
      "Saved reviewers could not be loaded.",
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      reviewers: records.value.map(({ artifact, version, source }) => mapCanonicalReviewerSummary(artifact, version, source)),
    },
    200,
    request,
  );
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireReviewerAuth(request);
  if (!auth.ok) {
    return auth.response;
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

  const validation = validateCreateReviewerRequest(body.value);
  if (!validation.ok) {
    return errorResponse(
      validation.code === "invalid_request" ? 400 : 422,
      validation.code,
      validation.message,
      request,
    );
  }

  if (
    validation.value.sourceMetadata.sourceMode !== "canvas" &&
    validation.value.sourceSnapshotId
  ) {
    return errorResponse(
      400,
      "invalid_request",
      "sourceSnapshotId is only supported for Canvas reviewers.",
      request,
    );
  }

  const records = await listCanonicalReviewerRecords(auth.value.client, auth.value.user.id);
  if (!records.ok) {
    return errorResponse(500, "reviewer_storage_failed", "Saved reviewer could not be loaded.", request);
  }
  const matches = records.value.filter(({ version }) => {
    const payload = version.payload;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
    const reviewer = (payload as Readonly<Record<string, unknown>>).reviewer;
    return typeof reviewer === "object" && reviewer !== null && !Array.isArray(reviewer) && (reviewer as Readonly<Record<string, unknown>>).id === validation.value.reviewerOutput.id;
  });
  if (matches.length !== 1) {
    return errorResponse(404, "reviewer_not_found", "The canonical generated Reviewer could not be identified.", request);
  }
  let record = matches[0]!;
  if (record.artifact.safe_title !== validation.value.title) {
    const renamed = await auth.value.client.rpc("rename_reviewer_artifact", { p_artifact_id: record.artifact.id, p_title: validation.value.title });
    if (renamed.error || !renamed.data?.[0]) {
      return errorResponse(500, "reviewer_storage_failed", "Saved reviewer could not be renamed.", request);
    }
    record = { ...record, artifact: renamed.data[0] };
  }

  let sourceProvenance = null;
  const sourceSnapshotId = canonicalReviewerSnapshotId(record.source);
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

    const snapshot = await verifyReviewerSourceSnapshotForSave({
      client: provenanceClient,
      sourceCharacterCount: record.source.character_count,
      sourceSnapshotId,
      userId: auth.value.user.id,
    });
    if (!snapshot.ok) {
      return errorResponse(
        snapshot.status === 409 ? 500 : snapshot.status,
        snapshot.code,
        snapshot.message,
        request,
      );
    }

    const summary = await readSafeReviewerSourceProvenanceSummary({
      client: provenanceClient,
      sourceSnapshotId: snapshot.value.sourceSnapshotId,
      userId: auth.value.user.id,
    });
    if (!summary.ok) {
      return errorResponse(
        summary.status === 409 ? 500 : summary.status,
        summary.code,
        summary.message,
        request,
      );
    }
    sourceProvenance = summary.value;
  }

  const detail = mapCanonicalReviewerDetail(record.artifact, record.version, record.source, sourceProvenance);
  if (!detail.ok) return errorResponse(500, "reviewer_storage_failed", "Saved reviewer could not be loaded.", request);
  return jsonResponse(
    {
      ok: true,
      reviewer: detail.value,
    },
    201,
    request,
  );
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

function errorResponse(
  status: 400 | 401 | 404 | 422 | 500,
  code: ReviewerApiErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status, request);
}

function jsonResponse(
  body: ReviewerListResponse | ReviewerDetailResponse,
  status: 200 | 201 | 400 | 401 | 404 | 422 | 500,
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
