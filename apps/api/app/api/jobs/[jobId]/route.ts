import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import {
  createProcessingJobServiceClient,
  findOwnedProcessingJob,
  toProcessingJobStatusView,
} from "@/lib/processing-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return response(401, {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Sign in again to retrieve processing status.",
        retryable: false,
      },
    });
  }

  const { jobId } = await context.params;
  if (!isUuid(jobId)) {
    return notFound();
  }

  try {
    const job = await findOwnedProcessingJob(
      createProcessingJobServiceClient(),
      user.id,
      jobId,
    );
    if (!job) return notFound();
    return response(200, { ok: true, data: toProcessingJobStatusView(job) });
  } catch {
    return response(503, {
      ok: false,
      error: {
        code: "processing_job_status_unavailable",
        message: "Processing status is temporarily unavailable.",
        retryable: true,
      },
    });
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function notFound(): Response {
  return response(404, {
    ok: false,
    error: {
      code: "processing_job_not_found",
      message: "Processing job was not found.",
      retryable: false,
    },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function response(status: number, body: unknown): Response {
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}
