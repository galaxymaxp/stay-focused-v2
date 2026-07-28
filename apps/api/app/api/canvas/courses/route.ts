import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { loadCanvasCourseInventory } from "@/lib/canvas-course-selection";
import { loadCanvasCourseInventoryHealth } from "@/lib/canvas-sync-health";

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

  const health = await loadCanvasCourseInventoryHealth({
      courseIds: inventory.value.courses.map((course) => course.id),
      userId: auth.value.user.id,
    }).catch(() => new Map());
  return jsonResponse(
    {
      ok: true,
      courses: inventory.value.courses.map((course) => ({
        ...course,
        syncHealth: health.get(course.id) ?? {
          attentionScopeCount: 0,
          overallHealth: "not_synced",
          staleScopeCount: 0,
        },
      })),
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
