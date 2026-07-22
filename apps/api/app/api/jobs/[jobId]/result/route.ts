import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  createProcessingJobServiceClient,
  findOwnedProcessingJob,
  findOwnedProcessingJobResult,
} from "@/lib/processing-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 20;

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) return error(401, "unauthorized", "Sign in again to retrieve this result.", false);

  const { jobId } = await context.params;
  if (!isUuid(jobId)) return notFound();

  try {
    const client = createProcessingJobServiceClient();
    const job = await findOwnedProcessingJob(client, user.id, jobId);
    if (!job) return notFound();
    if (job.status !== "succeeded" || !job.result_id) {
      return error(
        409,
        "processing_job_result_not_ready",
        "The result is not ready yet.",
        job.status === "queued" || job.status === "running",
      );
    }

    const result = await findOwnedProcessingJobResult(client, user.id, jobId);
    if (!result) {
      return error(503, "processing_job_result_unavailable", "The completed result is unavailable.", true);
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          jobId: result.job_id,
          jobType: result.result_type,
          sourceSnapshotId: result.source_snapshot_id,
          result: result.payload,
          metrics: result.metrics,
          createdAt: result.created_at,
        },
      },
      { status: 200, headers: corsHeaders() },
    );
  } catch {
    return error(503, "processing_job_result_unavailable", "The result is temporarily unavailable.", true);
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
