import { jsonResponse, optionsResponse, requireCanvasAuth } from "@/lib/canvas-routes";
import { toCanvasSyncJobStatusView } from "@/lib/canvas-sync-jobs/contracts";
import {
  CanvasSyncJobRepositoryError,
  requestCanvasSyncJobCancellation,
} from "@/lib/canvas-sync-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  if (!isUuid(jobId)) return notFound(request);

  try {
    const job = await requestCanvasSyncJobCancellation(
      auth.value.client,
      auth.value.user.id,
      jobId,
    );
    if (!job) return notFound(request);
    return jsonResponse(
      { ok: true, data: toCanvasSyncJobStatusView(job) },
      200,
      request,
    );
  } catch (error) {
    const known = error instanceof CanvasSyncJobRepositoryError ? error : null;
    return jsonResponse(
      {
        ok: false,
        error: {
          code: known?.code ?? "canvas_sync_job_cancel_failed",
          message:
            known?.safeMessage ??
            "Cancellation could not be recorded. Try again.",
          retryable: known?.retryable ?? true,
        },
      },
      503,
      request,
    );
  }
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}

function notFound(request: Request): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code: "canvas_sync_job_not_found",
        message: "Canvas synchronization job was not found.",
        retryable: false,
      },
    },
    404,
    request,
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
