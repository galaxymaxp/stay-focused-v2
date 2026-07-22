import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { validateIdempotencyKey } from "@/lib/processing-jobs/creation";
import {
  createProcessingJobServiceClient,
  ProcessingJobRepositoryError,
  retryProcessingJob,
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
  if (!user) return error(401, "unauthorized", "Sign in again to retry this job.", false);

  const { jobId } = await context.params;
  if (!isUuid(jobId)) return notFound();

  let idempotencyKey: string;
  try {
    idempotencyKey = validateIdempotencyKey(request.headers.get("idempotency-key"));
  } catch {
    return error(400, "invalid_idempotency_key", "A valid idempotency key is required.", false);
  }

  try {
    const job = await retryProcessingJob(
      createProcessingJobServiceClient(),
      user.id,
      jobId,
      idempotencyKey,
    );
    if (!job) return notFound();
    return NextResponse.json(
      { ok: true, data: toProcessingJobStatusView(job) },
      { status: 202, headers: corsHeaders() },
    );
  } catch (caught) {
    if (
      caught instanceof ProcessingJobRepositoryError &&
      caught.code === "processing_job_not_retryable"
    ) {
      return error(409, caught.code, "This job cannot be retried.", false);
    }
    if (
      caught instanceof ProcessingJobRepositoryError &&
      caught.code === "processing_job_idempotency_conflict"
    ) {
      return error(409, caught.code, "This idempotency key was used for another retry.", false);
    }
    return error(503, "processing_job_retry_failed", "The retry could not be accepted.", true);
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
    "Access-Control-Allow-Headers": "authorization, content-type, idempotency-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
