import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { toCanvasSyncJobStatusView } from "@/lib/canvas-sync-jobs/contracts";
import {
  CanvasSyncJobRepositoryError,
  createCanvasSyncJob,
  validateCanvasSyncIdempotencyKey,
} from "@/lib/canvas-sync-jobs/repository";
import {
  CanvasSyncWorkflowDispatchError,
  dispatchAcceptedCanvasSyncJob,
} from "@/lib/canvas-sync-jobs/workflow-dispatch";

export const runtime = "nodejs";
export const maxDuration = 30;

interface CourseSyncRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function POST(
  request: Request,
  context: CourseSyncRouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const courseId = params.courseId?.trim() ?? "";
  if (!isUuid(courseId)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "canvas_course_not_found",
          message: "Canvas course was not found for this connection.",
        },
      },
      404,
      request,
    );
  }

  try {
    const idempotencyKey = validateCanvasSyncIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const job = await createCanvasSyncJob(auth.value.client, {
      courseId,
      idempotencyKey,
      jobType: "course_content",
      userId: auth.value.user.id,
    });
    const accepted = await dispatchAcceptedCanvasSyncJob(job, {
      client: auth.value.client,
    });
    return jsonResponse(
      { ok: true, data: toCanvasSyncJobStatusView(accepted) },
      202,
      request,
    );
  } catch (error) {
    if (error instanceof CanvasSyncJobRepositoryError) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.safeMessage,
            retryable: error.retryable,
          },
        },
        statusForRepositoryError(error.code),
        request,
      );
    }
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
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "canvas_sync_job_creation_failed",
          message: "Canvas synchronization could not be accepted.",
          retryable: true,
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

function statusForRepositoryError(code: string): 400 | 404 | 409 | 503 {
  if (code === "invalid_idempotency_key") return 400;
  if (code === "canvas_course_not_found") return 404;
  if (code === "canvas_course_not_selected") return 400;
  if (code === "canvas_sync_job_idempotency_conflict") return 409;
  if (code === "canvas_sync_job_in_progress") return 409;
  return 503;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
