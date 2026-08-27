import { isUuid } from "@stay-focused/shared/task-planning";

import {
  importOwnedCanvasAssignments,
  TaskPlanningRepositoryError,
  toTaskView,
} from "@/lib/task-planning-repository";
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
  const assignmentIds = readAssignmentIds(body.value);
  if (!assignmentIds.ok) {
    return taskPlanningError(request, 400, "invalid_request", assignmentIds.message);
  }
  try {
    const tasks = await importOwnedCanvasAssignments(
      auth.value.client,
      auth.value.user.id,
      assignmentIds.value,
    );
    return taskPlanningResponse(request, {
      ok: true,
      data: { tasks: tasks.map(toTaskView) },
    });
  } catch (error) {
    if (error instanceof TaskPlanningRepositoryError &&
      error.code === "canvas_assignment_not_found") {
      return taskPlanningError(request, 404, error.code, error.safeMessage);
    }
    return taskPlanningError(
      request,
      503,
      "canvas_task_import_failed",
      "Canvas assignments could not be imported.",
    );
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "POST, OPTIONS");
}

function readAssignmentIds(value: unknown):
  | { readonly ok: true; readonly value: readonly string[] }
  | { readonly ok: false; readonly message: string } {
  if (!isRecord(value) || Object.keys(value).some((key) => key !== "assignmentIds") ||
    !Array.isArray(value.assignmentIds) || value.assignmentIds.length < 1 ||
    value.assignmentIds.length > 100 ||
    value.assignmentIds.some((id) => typeof id !== "string" || !isUuid(id))) {
    return { ok: false, message: "assignmentIds must contain 1 to 100 synchronized assignment UUIDs." };
  }
  const ids = value.assignmentIds.map((id) => id.trim());
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: "assignmentIds must not contain duplicates." };
  }
  return { ok: true, value: ids };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
