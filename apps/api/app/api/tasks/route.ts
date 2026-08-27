import type { TaskInsert } from "@stay-focused/db";
import {
  isUuid,
  TASK_STATUSES,
  validateCreateTaskInput,
  type TaskStatus,
} from "@stay-focused/shared/task-planning";

import {
  createOwnedTask,
  listOwnedTasks,
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

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const status = readStatus(url.searchParams.get("status"));
  if (status === false) {
    return taskPlanningError(request, 400, "invalid_task_status", "status must be pending or completed.");
  }
  const cursor = decodeCursor(url.searchParams.get("cursor"));
  if (cursor === false) {
    return taskPlanningError(request, 400, "invalid_task_cursor", "Task cursor is invalid.");
  }
  const limit = readLimit(url.searchParams.get("limit"));
  try {
    const rows = await listOwnedTasks(auth.value.client, auth.value.user.id, {
      limit: limit + 1,
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return taskPlanningResponse(request, {
      ok: true,
      data: {
        tasks: page.map(toTaskView),
        nextCursor:
          rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null,
      },
    });
  } catch {
    return taskPlanningError(request, 503, "task_storage_failed", "Tasks could not be loaded.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const body = await readTaskPlanningJson(request);
  if (!body.ok) return body.response;
  const validation = validateCreateTaskInput(body.value);
  if (!validation.ok) {
    return taskPlanningError(request, 400, validation.code, validation.message);
  }
  const row: TaskInsert = {
    user_id: auth.value.user.id,
    title: validation.value.title,
    notes: validation.value.notes,
    priority: validation.value.priority,
    due_at: validation.value.dueAt,
    estimated_minutes: validation.value.estimatedMinutes,
    source_type: "manual",
    status: "pending",
  };
  try {
    const task = await createOwnedTask(auth.value.client, row);
    return taskPlanningResponse(request, { ok: true, data: toTaskView(task) }, 201);
  } catch {
    return taskPlanningError(request, 503, "task_storage_failed", "Task could not be created.");
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "GET, POST, OPTIONS");
}

function readStatus(value: string | null): TaskStatus | null | false {
  if (!value) return null;
  return TASK_STATUSES.some((status) => status === value) ? (value as TaskStatus) : false;
}

function readLimit(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 50) : 20;
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString("base64url");
}

function decodeCursor(
  value: string | null,
): { readonly createdAt: string; readonly id: string } | null | false {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!isRecord(parsed) || typeof parsed.createdAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.createdAt)) || typeof parsed.id !== "string" ||
      !isUuid(parsed.id)) return false;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
