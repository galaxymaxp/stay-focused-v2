import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { resolveStoredCanvasUsableContent } from "@/lib/canvas-usable-content-service";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RESOLVE_BODY_BYTES = 4 * 1024;
const OPAQUE_ITEM_ID_PATTERN =
  /^(?:page|assignment|announcement|file|module_item):[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ResolveRouteContext {
  readonly params: Promise<{ readonly courseId: string }>;
}

export async function POST(
  request: Request,
  context: ResolveRouteContext,
): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;

  const parsed = await readResolveRequest(request);
  if (!parsed.ok) {
    return jsonResponse(
      { ok: false, error: { code: parsed.code, message: parsed.message } },
      parsed.status,
      request,
    );
  }
  const { courseId } = await context.params;
  const result = await resolveStoredCanvasUsableContent({
    client: auth.value.client,
    courseId: courseId?.trim() ?? "",
    itemId: parsed.itemId,
    userId: auth.value.user.id,
  });
  if (!result.ok) {
    return jsonResponse(
      { ok: false, error: { code: result.code, message: result.message } },
      result.status,
      request,
    );
  }

  const resolution = result.value;
  return jsonResponse(
    {
      ok: true,
      status: resolution.status,
      sourceKind: resolution.sourceKind,
      method: resolution.method,
      ...(resolution.safeFailureCategory
        ? { safeFailureCategory: resolution.safeFailureCategory }
        : {}),
      ...(resolution.status === "usable" && resolution.sourceText
        ? {
            sourceText: resolution.sourceText,
            contentFingerprint: resolution.contentFingerprint,
          }
        : {}),
    },
    200,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "POST, OPTIONS");
}

async function readResolveRequest(request: Request): Promise<
  | { readonly ok: true; readonly itemId: string }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: "invalid_json" | "invalid_request" | "payload_too_large";
      readonly message: string;
    }
> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return invalidRequest("Request content type must be application/json.");
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESOLVE_BODY_BYTES) {
    return tooLarge();
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESOLVE_BODY_BYTES) return tooLarge();
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, status: 400, code: "invalid_json", message: "Request body must be valid JSON." };
  }
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "itemId") ||
    typeof value.itemId !== "string" ||
    !OPAQUE_ITEM_ID_PATTERN.test(value.itemId.trim())
  ) {
    return invalidRequest("Request body must contain only itemId.");
  }
  return { ok: true, itemId: value.itemId.trim() };
}

function invalidRequest(message: string) {
  return { ok: false, status: 400, code: "invalid_request", message } as const;
}

function tooLarge() {
  return {
    ok: false,
    status: 413,
    code: "payload_too_large",
    message: `Request body must be at most ${MAX_RESOLVE_BODY_BYTES} bytes.`,
  } as const;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
