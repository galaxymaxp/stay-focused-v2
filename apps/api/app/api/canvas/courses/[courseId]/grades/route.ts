import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import {
  listCanvasGradeAssignments,
  parseCanvasGradeListQuery,
} from "@/lib/canvas-grade-read-model";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CourseGradesRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function GET(
  request: Request,
  context: CourseGradesRouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const query = parseCanvasGradeListQuery(url.searchParams);
  if (!query.ok) {
    return jsonResponse(
      { ok: false, error: { code: query.code, message: query.message } },
      query.status,
      request,
    );
  }

  const params = await context.params;
  const result = await listCanvasGradeAssignments({
    client: auth.value.client,
    courseId: params.courseId ?? "",
    limit: query.value.limit,
    offset: query.value.offset,
    userId: auth.value.user.id,
  });
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: { code: result.code, message: result.message } },
      result.status,
      request,
    );
  }

  return jsonResponse({ ok: true, ...result.value }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}
