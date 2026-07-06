import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { prepareCanvasReviewerSources } from "@/lib/canvas-reviewer-sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PREPARE_BODY_BYTES = 8 * 1024;
const PREPARE_REQUEST_FIELDS = new Set(["sourceIds"]);

interface CourseSourcePrepareRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function POST(
  request: Request,
  context: CourseSourcePrepareRouteContext,
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

  const parsed = await readPrepareRequest(request);
  if (!parsed.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: parsed.code,
          message: parsed.message,
        },
      },
      parsed.status,
      request,
    );
  }

  const result = await prepareCanvasReviewerSources({
    client: auth.value.client,
    courseId,
    sourceIds: parsed.sourceIds,
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
  return optionsResponse(request, "POST, OPTIONS");
}

async function readPrepareRequest(request: Request): Promise<
  | { readonly ok: true; readonly sourceIds: readonly string[] }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: "invalid_json" | "invalid_request" | "payload_too_large";
      readonly message: string;
    }
> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return invalidRequest("Request content type must be application/json.");
  }
  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_PREPARE_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_PREPARE_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_PREPARE_BODY_BYTES} bytes.`,
    };
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

  if (!isRecord(parsed)) {
    return invalidRequest("Request body must be a JSON object.");
  }
  if (!Object.keys(parsed).every((key) => PREPARE_REQUEST_FIELDS.has(key))) {
    return invalidRequest("Request body contains unsupported fields.");
  }
  if (!Array.isArray(parsed.sourceIds)) {
    return invalidRequest("Request body must include sourceIds.");
  }
  if (
    parsed.sourceIds.length === 0 ||
    parsed.sourceIds.length > 3 ||
    parsed.sourceIds.some((entry) => typeof entry !== "string")
  ) {
    return invalidRequest("sourceIds must contain 1 to 3 Canvas source descriptor IDs.");
  }

  return {
    ok: true,
    sourceIds: parsed.sourceIds.map((entry) => entry.trim()),
  };
}

function invalidRequest(message: string): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "invalid_request";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message,
  };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_PREPARE_BODY_BYTES;
}

function isJsonContentType(contentType: string | null): boolean {
  return (
    contentType
      ?.split(";")[0]
      ?.trim()
      .toLowerCase() === "application/json"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
