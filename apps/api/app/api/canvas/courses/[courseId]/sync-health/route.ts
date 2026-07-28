import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { loadCanvasCourseSyncHealth } from "@/lib/canvas-sync-health";

export const runtime = "nodejs";
export const maxDuration = 15;

interface RouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;
  const { courseId } = await context.params;
  if (!isUuid(courseId)) return notFound(request);

  try {
    const health = await loadCanvasCourseSyncHealth({
      courseId,
      userId: auth.value.user.id,
    });
    if (!health) return notFound(request);
    return jsonResponse({ ok: true, data: health }, 200, request);
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "canvas_sync_health_unavailable",
          message: "Canvas synchronization health is temporarily unavailable.",
          retryable: true,
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
        code: "canvas_course_not_found",
        message: "Canvas course was not found for this account.",
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
