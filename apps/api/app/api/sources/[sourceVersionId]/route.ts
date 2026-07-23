import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  findOwnedSourceVersion,
  toSourceVersionSummary,
} from "@/lib/processing-assets/repository";
import { createProcessingJobServiceClient } from "@/lib/processing-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly sourceVersionId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return response(401, errorBody("unauthorized", "Sign in again."));

  const { sourceVersionId } = await context.params;
  if (!isUuid(sourceVersionId)) return notFound();

  try {
    const version = await findOwnedSourceVersion(
      createProcessingJobServiceClient(),
      user.id,
      sourceVersionId,
    );
    if (!version) return notFound();
    return response(200, {
      ok: true,
      data: {
        ...toSourceVersionSummary(version),
        sourceText: version.source_text,
      },
    });
  } catch {
    return response(
      503,
      errorBody("source_version_unavailable", "The source is temporarily unavailable.", true),
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

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
