import { validateStudyPlanningRequest } from "@stay-focused/shared/task-planning";

import {
  applyOwnedStudyPlan,
  OwnedPlanningError,
} from "@/lib/task-planning-service";
import {
  readTaskPlanningJson,
  requireTaskPlanningAuth,
  taskPlanningError,
  taskPlanningOptions,
  taskPlanningResponse,
} from "@/lib/task-planning-routes";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const body = await readTaskPlanningJson(request);
  if (!body.ok) return body.response;
  const validation = validateStudyPlanningRequest(body.value);
  if (!validation.ok) {
    return taskPlanningError(request, 400, validation.code, validation.message);
  }
  try {
    const applied = await applyOwnedStudyPlan(
      auth.value.client,
      auth.value.user.id,
      validation.value,
    );
    return taskPlanningResponse(request, { ok: true, data: applied }, 201);
  } catch (error) {
    if (error instanceof OwnedPlanningError) {
      return taskPlanningError(request, 404, error.code, error.safeMessage);
    }
    return taskPlanningError(
      request,
      503,
      "study_plan_apply_failed",
      "Study plan could not be applied.",
    );
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "POST, OPTIONS");
}
