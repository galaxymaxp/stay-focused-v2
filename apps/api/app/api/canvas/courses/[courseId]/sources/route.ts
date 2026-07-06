import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { listCanvasReviewerSources } from "@/lib/canvas-reviewer-sources";

export const runtime = "nodejs";
export const maxDuration = 60;

interface CourseSourcesRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function GET(
  request: Request,
  context: CourseSourcesRouteContext,
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

  const url = new URL(request.url);
  const result = await listCanvasReviewerSources({
    client: auth.value.client,
    courseId,
    limit: parseIntegerQueryParam(url.searchParams.get("limit")),
    offset: parseIntegerQueryParam(url.searchParams.get("offset")),
    userId: auth.value.user.id,
  });
  if (!result.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: result.code,
          message: result.message,
          ...(result.details ? { details: result.details } : {}),
        },
      },
      result.status,
      request,
    );
  }

  return jsonResponse({ ok: true, ...result.value }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}

function parseIntegerQueryParam(value: string | null): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
