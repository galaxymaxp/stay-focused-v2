import type { StudySessionUpdate } from "@stay-focused/db";
import {
  isUuid,
  STUDY_SESSION_STATUSES,
} from "@stay-focused/shared/task-planning";

import {
  deleteOwnedStudySession,
  findOwnedStudySession,
  toStudySessionView,
  updateOwnedStudySession,
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
  readonly params: Promise<{ readonly sessionId: string }>;
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const sessionId = await readSessionId(request, context);
  if (!sessionId.ok) return sessionId.response;
  const body = await readTaskPlanningJson(request);
  if (!body.ok) return body.response;
  const update = readSessionUpdate(body.value);
  if (!update.ok) {
    return taskPlanningError(request, 400, "invalid_request", update.message);
  }
  try {
    const current = await findOwnedStudySession(
      auth.value.client,
      auth.value.user.id,
      sessionId.value,
    );
    if (!current) return notFound(request);
    const startsAt = update.value.starts_at ?? current.starts_at;
    const endsAt = update.value.ends_at ?? current.ends_at;
    if (Date.parse(startsAt) >= Date.parse(endsAt)) {
      return taskPlanningError(
        request,
        400,
        "invalid_session_interval",
        "Study session startsAt must be earlier than endsAt.",
      );
    }
    const session = await updateOwnedStudySession(
      auth.value.client,
      auth.value.user.id,
      sessionId.value,
      update.value,
    );
    if (!session) return notFound(request);
    return taskPlanningResponse(request, { ok: true, data: toStudySessionView(session) });
  } catch {
    return taskPlanningError(
      request,
      503,
      "study_session_storage_failed",
      "Study session could not be updated.",
    );
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const auth = await requireTaskPlanningAuth(request);
  if (!auth.ok) return auth.response;
  const sessionId = await readSessionId(request, context);
  if (!sessionId.ok) return sessionId.response;
  try {
    const deleted = await deleteOwnedStudySession(
      auth.value.client,
      auth.value.user.id,
      sessionId.value,
    );
    if (!deleted) return notFound(request);
    return taskPlanningResponse(request, { ok: true });
  } catch {
    return taskPlanningError(
      request,
      503,
      "study_session_storage_failed",
      "Study session could not be deleted.",
    );
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "PATCH, DELETE, OPTIONS");
}

function readSessionUpdate(value: unknown):
  | { readonly ok: true; readonly value: StudySessionUpdate }
  | { readonly ok: false; readonly message: string } {
  if (!isRecord(value)) return { ok: false, message: "Request body must be a JSON object." };
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some(
    (key) => key !== "startsAt" && key !== "endsAt" && key !== "status",
  )) {
    return { ok: false, message: "Provide startsAt, endsAt, and/or status only." };
  }
  if (("startsAt" in value && !isTimestamp(value.startsAt)) ||
    ("endsAt" in value && !isTimestamp(value.endsAt))) {
    return { ok: false, message: "Session timestamps must be valid ISO timestamps with a timezone." };
  }
  if ("status" in value && !STUDY_SESSION_STATUSES.some((status) => status === value.status)) {
    return { ok: false, message: "Session status must be planned, completed, or skipped." };
  }
  return {
    ok: true,
    value: {
      ...(typeof value.startsAt === "string"
        ? { starts_at: new Date(value.startsAt).toISOString() }
        : {}),
      ...(typeof value.endsAt === "string"
        ? { ends_at: new Date(value.endsAt).toISOString() }
        : {}),
      ...(typeof value.status === "string"
        ? { status: value.status as StudySessionUpdate["status"] }
        : {}),
    },
  };
}

async function readSessionId(
  request: Request,
  context: RouteContext,
): Promise<{ readonly ok: true; readonly value: string } | { readonly ok: false; readonly response: Response }> {
  const { sessionId } = await context.params;
  return isUuid(sessionId)
    ? { ok: true, value: sessionId }
    : { ok: false, response: notFound(request) };
}

function notFound(request: Request): Response {
  return taskPlanningError(request, 404, "study_session_not_found", "Study session was not found.");
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
