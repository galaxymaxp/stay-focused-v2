import { jsonResponse, optionsResponse, requireCanvasAuth } from "@/lib/canvas-routes";
import { toCanvasSyncJobStatusView } from "@/lib/canvas-sync-jobs/contracts";
import {
  CanvasSyncJobRepositoryError,
  retryCanvasSyncJob,
  validateCanvasSyncIdempotencyKey,
} from "@/lib/canvas-sync-jobs/repository";
import {
  CanvasSyncWorkflowDispatchError,
  dispatchAcceptedCanvasSyncJob,
} from "@/lib/canvas-sync-jobs/workflow-dispatch";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    const idempotencyKey = validateCanvasSyncIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const queued = await retryCanvasSyncJob(
      auth.value.client,
      auth.value.user.id,
      jobId,
      idempotencyKey,
    );
    if (!queued) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: "canvas_sync_job_not_retryable",
            message: "This Canvas synchronization cannot be retried.",
            retryable: false,
          },
        },
        409,
        request,
      );
    }
    const accepted = await dispatchAcceptedCanvasSyncJob(queued, {
      client: auth.value.client,
    });
    return jsonResponse(
      { ok: true, data: toCanvasSyncJobStatusView(accepted) },
      202,
      request,
    );
  } catch (error) {
    if (error instanceof CanvasSyncWorkflowDispatchError) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.safeMessage,
            retryable: error.retryable,
          },
        },
        503,
        request,
      );
    }
    const known = error instanceof CanvasSyncJobRepositoryError ? error : null;
    return jsonResponse(
      {
        ok: false,
        error: {
          code: known?.code ?? "canvas_sync_job_retry_failed",
          message:
            known?.safeMessage ??
            "Canvas synchronization could not be retried.",
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
