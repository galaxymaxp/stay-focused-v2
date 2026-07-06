import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import {
  loadCanvasCourseInventory,
  saveCanvasCoursePreferences,
} from "@/lib/canvas-course-selection";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PREFERENCES_BODY_BYTES = 16 * 1024;

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

  return jsonResponse(
    {
      ok: true,
      selectedCourseIds: inventory.value.selectedCourseIds,
    },
    200,
    request,
  );
}

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await readPreferenceRequest(request);
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

  const saved = await saveCanvasCoursePreferences({
    client: auth.value.client,
    selectedCourseIds: parsed.selectedCourseIds,
    userId: auth.value.user.id,
  });
  if (!saved.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: saved.code,
          message: saved.message,
        },
      },
      saved.status,
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      deselectedCount: saved.value.deselectedCount,
      selectedCount: saved.value.selectedCount,
      selectedCourseIds: saved.value.selectedCourseIds,
    },
    200,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, PUT, OPTIONS");
}

async function readPreferenceRequest(request: Request): Promise<
  | { readonly ok: true; readonly selectedCourseIds: readonly string[] }
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
      message: `Request body must be at most ${MAX_PREFERENCES_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_PREFERENCES_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_PREFERENCES_BODY_BYTES} bytes.`,
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

  if (!isRecord(parsed) || !Array.isArray(parsed.selectedCourseIds)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Request body must include selectedCourseIds.",
    };
  }

  if (
    parsed.selectedCourseIds.some(
      (entry) => typeof entry !== "string" || !entry.trim(),
    )
  ) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "selectedCourseIds must contain internal course IDs.",
    };
  }

  return {
    ok: true,
    selectedCourseIds: parsed.selectedCourseIds.map((entry) => entry.trim()),
  };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_PREFERENCES_BODY_BYTES;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
