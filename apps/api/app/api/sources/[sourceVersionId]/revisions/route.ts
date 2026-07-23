import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  createOwnedSourceRevision,
  ProcessingAssetRepositoryError,
} from "@/lib/processing-assets/repository";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";
import { REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS } from "@/lib/reviewer-generation-limits";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly sourceVersionId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return response(401, errorBody("unauthorized", "Sign in again."));

  const { sourceVersionId } = await context.params;
  if (!isUuid(sourceVersionId)) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, errorBody("invalid_json", "Request body must be valid JSON."));
  }
  if (!isRecord(body)) {
    return response(400, errorBody("invalid_source_revision", "Source revision is invalid."));
  }
  const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim() : "";
  const expectedParentSha256 =
    typeof body.expectedParentSha256 === "string"
      ? body.expectedParentSha256.trim().toLowerCase()
      : "";
  if (!sourceText || sourceText.length > REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS) {
    return response(
      400,
      errorBody(
        "invalid_source_revision",
        `Source text must contain 1-${REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS} characters.`,
      ),
    );
  }
  if (!/^[a-f0-9]{64}$/.test(expectedParentSha256)) {
    return response(
      400,
      errorBody("invalid_source_precondition", "A valid parent content hash is required."),
    );
  }

  try {
    const revision = await createOwnedSourceRevision(
      createProcessingJobServiceClient(),
      {
        userId: user.id,
        parentSourceVersionId: sourceVersionId,
        expectedParentSha256,
        sourceText,
        selectAsActive: body.selectAsActive !== false,
      },
    );
    return response(201, { ok: true, data: revision });
  } catch (error) {
    if (error instanceof ProcessingAssetRepositoryError) {
      if (error.code === "source_version_not_found") return notFound();
      if (error.code === "source_version_precondition_failed") {
        return response(
          409,
          errorBody(
            error.code,
            "The source changed before this edit was saved. Your local draft was not discarded.",
          ),
        );
      }
      if (error.code === "source_version_limit_reached") {
        return response(
          409,
          errorBody(error.code, "This document reached its retained source-version limit."),
        );
      }
    }
    return response(
      503,
      errorBody("source_version_storage_failed", "The source edit could not be saved.", true),
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function notFound(): Response {
  return response(404, errorBody("source_version_not_found", "Source version was not found."));
}

function errorBody(code: string, message: string, retryable = false) {
  return { ok: false, error: { code, message, retryable } };
}

function response(status: number, body: unknown): Response {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
