import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import {
  syncCanvasAcademicGraph,
  type CanvasAcademicSyncMode,
} from "@/lib/canvas-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SYNC_BODY_BYTES = 1024;

export async function POST(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const syncRequest = await readSyncRequest(request);
  if (!syncRequest.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: syncRequest.code,
          message: syncRequest.message,
        },
      },
      syncRequest.status,
      request,
    );
  }

  const result = await syncCanvasAcademicGraph({
    client: auth.value.client,
    mode: syncRequest.mode,
    userId: auth.value.user.id,
  });

  if (result.ok) {
    return jsonResponse({ ok: true, ...result.summary }, 200, request);
  }

  return jsonResponse(
    {
      ok: false,
      error: {
        code: result.code,
        message: result.message,
      },
      ...(result.summary ? { sync: result.summary } : {}),
    },
    result.status,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}

async function readSyncRequest(
  request: Request,
): Promise<
  | { readonly ok: true; readonly mode: CanvasAcademicSyncMode }
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
      message: `Request body must be at most ${MAX_SYNC_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_SYNC_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_SYNC_BODY_BYTES} bytes.`,
    };
  }
  if (!rawBody.trim()) {
    return { ok: true, mode: "full" };
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
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Request body must be a JSON object.",
    };
  }

  const mode = parsed.mode;
  if (mode === undefined) {
    return { ok: true, mode: "full" };
  }
  if (mode === "full" || mode === "incremental") {
    return { ok: true, mode };
  }
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message: "Unsupported Canvas synchronization mode.",
  };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_SYNC_BODY_BYTES;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
