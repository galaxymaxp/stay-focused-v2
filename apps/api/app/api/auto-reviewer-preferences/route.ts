import { readBoundedText } from "@/lib/bounded-body";
import { requireCanvasAuth, createCorsHeaders, optionsResponse } from "@/lib/canvas-routes";

export const runtime = "nodejs";
const METHODS = "GET, PATCH, OPTIONS";

function jsonResponse(body: unknown, status: number, request: Request): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...createCorsHeaders(request.headers.get("origin"), METHODS) } });
}
const unavailable = (request: Request) =>
  jsonResponse({ ok: false, error: { code: "unavailable", message: "Automatic reviewer settings are unavailable." } }, 503, request);

export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    auth.response.headers.set("Cache-Control", "private, no-store");
    return auth.response;
  }
  const loaded = await auth.value.client
    .from("canvas_auto_reviewer_preferences")
    .select("enabled")
    .eq("user_id", auth.value.user.id)
    .maybeSingle();
  if (loaded.error) return unavailable(request);
  return jsonResponse({ ok: true, data: { enabled: loaded.data?.enabled ?? true } }, 200, request);
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    auth.response.headers.set("Cache-Control", "private, no-store");
    return auth.response;
  }
  let enabled: boolean | null = null;
  try {
    const boundedBody = await readBoundedText(request, 256);
    if (!boundedBody.ok && boundedBody.reason === "too_large") {
      return jsonResponse({ ok: false, error: { code: "invalid_request", message: "Settings request is too large." } }, 413, request);
    }
    const body: unknown = JSON.parse(boundedBody.ok ? boundedBody.text : "");
    if (typeof body === "object" && body !== null && Object.keys(body).length === 1 && typeof (body as { enabled?: unknown }).enabled === "boolean") {
      enabled = (body as { enabled: boolean }).enabled;
    }
  } catch { enabled = null; }
  if (enabled === null) {
    return jsonResponse({ ok: false, error: { code: "invalid_request", message: "Send { \"enabled\": true } or { \"enabled\": false }." } }, 400, request);
  }
  const saved = await auth.value.client
    .from("canvas_auto_reviewer_preferences")
    .upsert({ user_id: auth.value.user.id, enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("enabled")
    .single();
  if (saved.error) return unavailable(request);
  return jsonResponse({ ok: true, data: { enabled: saved.data.enabled } }, 200, request);
}

export function OPTIONS(request: Request): Response { return optionsResponse(request, METHODS); }
