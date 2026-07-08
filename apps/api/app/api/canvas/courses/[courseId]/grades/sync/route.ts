import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { authorizeSelectedCanvasGradeCourse } from "@/lib/canvas-grade-read-model";
import { syncCanvasCourseGrades } from "@/lib/canvas-grade-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_GRADE_SYNC_BODY_BYTES = 1024;

interface CourseGradeSyncRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function POST(
  request: Request,
  context: CourseGradeSyncRouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const params = await context.params;
  const courseId = params.courseId?.trim() ?? "";
  if (!isUuid(courseId)) {
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

  const body = await readEmptyGradeSyncRequest(request);
  if (!body.ok) {
    return jsonResponse(
      { ok: false, error: { code: body.code, message: body.message } },
      body.status,
      request,
    );
  }

  const authorized = await authorizeSelectedCanvasGradeCourse({
    client: auth.value.client,
    courseId,
    userId: auth.value.user.id,
  });
  if (!authorized.ok) {
    return jsonResponse(
      {
        ok: false,
        error: { code: authorized.code, message: authorized.message },
      },
      authorized.status,
      request,
    );
  }

  const result = await syncCanvasCourseGrades({
    client: auth.value.client,
    courseId,
    userId: auth.value.user.id,
  });

  return jsonResponse({ ok: true, ...result }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}

async function readEmptyGradeSyncRequest(
  request: Request,
): Promise<
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: "invalid_json" | "invalid_request" | "payload_too_large";
      readonly message: string;
    }
> {
  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_GRADE_SYNC_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_GRADE_SYNC_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_GRADE_SYNC_BODY_BYTES} bytes.`,
    };
  }
  if (!rawBody.trim()) {
    return { ok: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return {
      ok: false,
      status: 400,
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    };
  }
  if (!isRecord(parsed) || Array.isArray(parsed)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Request body must be an empty JSON object.",
    };
  }
  if (Object.keys(parsed).length > 0) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Grade synchronization request body must be empty.",
    };
  }
  return { ok: true };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_GRADE_SYNC_BODY_BYTES;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
