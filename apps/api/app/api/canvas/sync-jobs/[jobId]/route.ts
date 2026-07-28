import { jsonResponse, optionsResponse, requireCanvasAuth } from "@/lib/canvas-routes";
import { toCanvasSyncJobStatusView } from "@/lib/canvas-sync-jobs/contracts";
import { readCanvasCourseSyncScopeStates } from "@/lib/canvas-sync-jobs/checkpoints";
import {
  CanvasSyncJobRepositoryError,
  createCanvasSyncJobServiceClient,
  findOwnedCanvasSyncJob,
} from "@/lib/canvas-sync-jobs/repository";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;

  const { jobId } = await context.params;
  if (!isUuid(jobId)) return notFound(request);

  try {
    const job = await findOwnedCanvasSyncJob(
      auth.value.client,
      auth.value.user.id,
      jobId,
    );
    if (!job) return notFound(request);
    let scopes: readonly CanvasCourseSyncScopeStateRow[] = [];
    try {
      scopes = await readCanvasCourseSyncScopeStates(
        createCanvasSyncJobServiceClient(),
        { courseId: job.course_id, userId: auth.value.user.id },
      );
    } catch {
      // Job status remains useful if the additive health view is temporarily
      // unavailable during a rolling migration or deployment.
    }
    return jsonResponse(
      { ok: true, data: toCanvasSyncJobStatusView(job, scopes) },
      200,
      request,
    );
  } catch (error) {
    const known = error instanceof CanvasSyncJobRepositoryError ? error : null;
    return jsonResponse(
      {
        ok: false,
        error: {
          code: known?.code ?? "canvas_sync_job_status_unavailable",
          message:
            known?.safeMessage ??
            "Canvas synchronization status is temporarily unavailable.",
          retryable: known?.retryable ?? true,
        },
      },
      503,
      request,
    );
  }
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
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
import type { CanvasCourseSyncScopeStateRow } from "@stay-focused/db";
