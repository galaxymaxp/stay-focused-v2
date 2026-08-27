import type { TaskUpdate } from "@stay-focused/db";
import { isUuid, validatePatchTaskInput } from "@stay-focused/shared/task-planning";

import {
  deleteOwnedTask,
  findOwnedTask,
  toTaskView,
  updateOwnedTask,
} from "@/lib/task-planning-repository";
import {
  readTaskPlanningJson,
  requireTaskPlanningAuth,
  taskPlanningError,
  taskPlanningOptions,
  taskPlanningResponse,
} from "@/lib/task-planning-routes";

export const runtime = "nodejs";

interface RouteContext {
  readonly params: Promise<{ readonly taskId: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const taskId = await readTaskId(request, context);
  if (!taskId.ok) return taskId.response;
  try {
    const task = await findOwnedTask(auth.value.client, auth.value.user.id, taskId.value);
    if (!task) return notFound(request);
    return taskPlanningResponse(request, { ok: true, data: toTaskView(task) });
  } catch {
    return taskPlanningError(request, 503, "task_storage_failed", "Task could not be loaded.");
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const taskId = await readTaskId(request, context);
  if (!taskId.ok) return taskId.response;
  const body = await readTaskPlanningJson(request);
  if (!body.ok) return body.response;
  const validation = validatePatchTaskInput(body.value);
  if (!validation.ok) {
    return taskPlanningError(request, 400, validation.code, validation.message);
  }
  const update: TaskUpdate = {
    ...(validation.value.title !== undefined ? { title: validation.value.title } : {}),
    ...(validation.value.notes !== undefined ? { notes: validation.value.notes } : {}),
    ...(validation.value.priority !== undefined ? { priority: validation.value.priority } : {}),
    ...(validation.value.dueAt !== undefined ? { due_at: validation.value.dueAt } : {}),
    ...(validation.value.estimatedMinutes !== undefined
      ? { estimated_minutes: validation.value.estimatedMinutes }
      : {}),
    ...(validation.value.status !== undefined
      ? {
          status: validation.value.status,
          completed_at:
            validation.value.status === "completed" ? new Date().toISOString() : null,
        }
      : {}),
  };
  try {
    const task = await updateOwnedTask(
      auth.value.client,
      auth.value.user.id,
      taskId.value,
      update,
    );
    if (!task) return notFound(request);
    return taskPlanningResponse(request, { ok: true, data: toTaskView(task) });
  } catch {
    return taskPlanningError(request, 503, "task_storage_failed", "Task could not be updated.");
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const taskId = await readTaskId(request, context);
  if (!taskId.ok) return taskId.response;
  try {
    const deleted = await deleteOwnedTask(
      auth.value.client,
      auth.value.user.id,
      taskId.value,
    );
    if (!deleted) return notFound(request);
    return taskPlanningResponse(request, { ok: true }, 200);
  } catch {
    return taskPlanningError(request, 503, "task_storage_failed", "Task could not be deleted.");
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "GET, PATCH, DELETE, OPTIONS");
}

async function readTaskId(
  request: Request,
  context: RouteContext,
): Promise<{ readonly ok: true; readonly value: string } | { readonly ok: false; readonly response: Response }> {
  const { taskId } = await context.params;
  return isUuid(taskId)
    ? { ok: true, value: taskId }
    : { ok: false, response: notFound(request) };
}

function notFound(request: Request): Response {
  return taskPlanningError(request, 404, "task_not_found", "Task was not found.");
}
