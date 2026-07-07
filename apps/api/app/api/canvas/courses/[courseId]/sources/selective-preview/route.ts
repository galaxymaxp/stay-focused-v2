import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { previewSelectiveCanvasReviewerSources } from "@/lib/canvas-reviewer-sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SELECTIVE_PREVIEW_BODY_BYTES = 32 * 1024;
const SELECTIVE_PREVIEW_REQUEST_FIELDS = new Set([
  "structureSessionId",
  "selectedBlockIds",
]);

interface CourseSourceSelectivePreviewRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function POST(
  request: Request,
  context: CourseSourceSelectivePreviewRouteContext,
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

  const parsed = await readSelectivePreviewRequest(request);
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

  const result = await previewSelectiveCanvasReviewerSources({
    client: auth.value.client,
    courseId,
    selectedBlockIds: parsed.selectedBlockIds,
    structureSessionId: parsed.structureSessionId,
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

async function readSelectivePreviewRequest(request: Request): Promise<
  | {
      readonly ok: true;
      readonly structureSessionId: string;
      readonly selectedBlockIds: readonly string[];
    }
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
      message: `Request body must be at most ${MAX_SELECTIVE_PREVIEW_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (
    new TextEncoder().encode(rawBody).byteLength >
    MAX_SELECTIVE_PREVIEW_BODY_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_SELECTIVE_PREVIEW_BODY_BYTES} bytes.`,
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
  if (
    !Object.keys(parsed).every((key) =>
      SELECTIVE_PREVIEW_REQUEST_FIELDS.has(key),
    )
  ) {
    return invalidRequest("Request body contains unsupported fields.");
  }
  if (typeof parsed.structureSessionId !== "string") {
    return invalidRequest("Request body must include structureSessionId.");
  }
  if (!Array.isArray(parsed.selectedBlockIds)) {
    return invalidRequest("Request body must include selectedBlockIds.");
  }
  if (parsed.selectedBlockIds.some((entry) => typeof entry !== "string")) {
    return invalidRequest("selectedBlockIds must contain Canvas block IDs.");
  }

  return {
    ok: true,
    selectedBlockIds: parsed.selectedBlockIds.map((entry) => entry.trim()),
    structureSessionId: parsed.structureSessionId.trim(),
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
  return Number.isFinite(parsed) && parsed > MAX_SELECTIVE_PREVIEW_BODY_BYTES;
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
