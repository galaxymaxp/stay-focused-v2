import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { getCanvasGradeAssignmentDetail } from "@/lib/canvas-grade-read-model";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AssignmentGradeRouteContext {
  readonly params: Promise<{
    readonly assignmentId: string;
    readonly courseId: string;
  }>;
}

export async function GET(
  request: Request,
  context: AssignmentGradeRouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const result = await getCanvasGradeAssignmentDetail({
    assignmentId: params.assignmentId ?? "",
    client: auth.value.client,
    courseId: params.courseId ?? "",
    userId: auth.value.user.id,
  });
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: { code: result.code, message: result.message } },
      result.status,
      request,
    );
  }

  return jsonResponse({ ok: true, assignment: result.value }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}
