import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { loadSelectedSyncCourse } from "@/lib/canvas-course-selection";
import { syncSelectedCanvasCourse } from "@/lib/canvas-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const courseId = params.courseId?.trim();
  if (!courseId) {
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

  const selectedCourse = await loadSelectedSyncCourse({
    client: auth.value.client,
    courseId,
    userId: auth.value.user.id,
  });
  if (!selectedCourse.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: selectedCourse.code,
          message: selectedCourse.message,
        },
      },
      selectedCourse.status,
      request,
    );
  }

  const result = await syncSelectedCanvasCourse({
    client: auth.value.client,
    connection: selectedCourse.value.connection,
    course: selectedCourse.value.course,
    courseRow: selectedCourse.value.courseRow,
    userId: auth.value.user.id,
  });

  if (result.ok) {
    return jsonResponse({ ok: true, ...result.summary }, 200, request);
  }

  return jsonResponse(
    {
      ok: false,
      error: {
        code: result.code,
        message: result.message,
      },
      ...(result.summary ? { sync: result.summary } : {}),
    },
    result.status,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}
