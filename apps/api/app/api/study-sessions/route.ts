import {
  listOwnedStudySessions,
  toStudySessionView,
} from "@/lib/task-planning-repository";
import {
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
  const startsAt = url.searchParams.get("startsAt");
  const endsAt = url.searchParams.get("endsAt");
  if ((startsAt === null) !== (endsAt === null) ||
    (startsAt !== null && (!isTimestamp(startsAt) || !isTimestamp(endsAt ?? "") ||
      Date.parse(startsAt) >= Date.parse(endsAt ?? "")))) {
    return taskPlanningError(
      request,
      400,
      "invalid_session_range",
      "startsAt and endsAt must be a valid increasing ISO timestamp range.",
    );
  }
  const limit = readLimit(url.searchParams.get("limit"));
  try {
    const sessions = await listOwnedStudySessions(auth.value.client, auth.value.user.id, {
      limit,
      ...(endsAt ? { startsBefore: new Date(endsAt).toISOString() } : {}),
      ...(startsAt ? { endsAfter: new Date(startsAt).toISOString() } : {}),
    });
    return taskPlanningResponse(request, {
      ok: true,
      data: { sessions: sessions.map(toStudySessionView) },
    });
  } catch {
    return taskPlanningError(
      request,
      503,
      "study_session_storage_failed",
      "Study sessions could not be loaded.",
    );
  }
}

export function OPTIONS(request: Request): Response {
  return taskPlanningOptions(request, "GET, OPTIONS");
}

function readLimit(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? Math.min(parsed, 200) : 100;
}

function isTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value));
}
