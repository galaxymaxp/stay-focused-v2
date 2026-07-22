import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  createProcessingJobServiceClient,
  requestProcessingJobCancellation,
  toProcessingJobStatusView,
} from "@/lib/processing-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return error(401, "unauthorized", "Sign in again to cancel this job.", false);

  const { jobId } = await context.params;
  if (!isUuid(jobId)) return notFound();

  try {
    const job = await requestProcessingJobCancellation(
      createProcessingJobServiceClient(),
      user.id,
      jobId,
    );
    if (!job) return notFound();
    return NextResponse.json(
      { ok: true, data: toProcessingJobStatusView(job) },
      { status: 200, headers: corsHeaders() },
    );
  } catch {
    return error(
      503,
      "processing_job_cancel_failed",
      "Cancellation could not be recorded. Try again.",
      true,
    );
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function notFound(): Response {
  return error(404, "processing_job_not_found", "Processing job was not found.", false);
}

function error(status: number, code: string, message: string, retryable: boolean): Response {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: corsHeaders() },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
