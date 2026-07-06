import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { loadCanvasCourseInventory } from "@/lib/canvas-course-selection";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const inventory = await loadCanvasCourseInventory({
    client: auth.value.client,
    userId: auth.value.user.id,
  });
  if (!inventory.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: inventory.code,
          message: inventory.message,
        },
      },
      inventory.status,
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      courses: inventory.value.courses,
      counts: inventory.value.counts,
      selectedCourseIds: inventory.value.selectedCourseIds,
    },
    200,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}
