import { defaultNotificationPreferences, parseNotificationPreferencePatch, validNotificationTimezone } from "@stay-focused/shared/notification-preferences";
import { requireCanvasAuth, createCorsHeaders, optionsResponse } from "@/lib/canvas-routes";

function jsonResponse(body: unknown, status: number, request: Request): Response { return Response.json(body, { status, headers: createCorsHeaders(request.headers.get("origin"), "GET, PATCH, OPTIONS") }); }

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;
  const timezone = new URL(request.url).searchParams.get("timezone");
  const result = await auth.value.client.from("notification_preferences").upsert({ user_id: auth.value.user.id, ...defaultNotificationPreferences(validNotificationTimezone(timezone) ? timezone : "UTC") }, { onConflict: "user_id", ignoreDuplicates: true });
  if (result.error) return jsonResponse({ ok: false, error: { code: "unavailable", message: "Notification settings are unavailable." } }, 503, request);
  const loaded = await auth.value.client.from("notification_preferences").select("*").eq("user_id", auth.value.user.id).single();
  if (loaded.error) return jsonResponse({ ok: false, error: { code: "unavailable", message: "Notification settings are unavailable." } }, 503, request);
  return jsonResponse({ ok: true, data: { preferences: { ...loaded.data, reminder_time: loaded.data.reminder_time.slice(0, 5) } } }, 200, request);
}
export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;
  let patch: ReturnType<typeof parseNotificationPreferencePatch> = null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 2048) return jsonResponse({ ok: false, error: { code: "invalid_request", message: "Settings request is too large." } }, 413, request);
    patch = parseNotificationPreferencePatch(JSON.parse(raw));
  } catch { patch = null; }
  if (!patch || !Object.keys(patch).length) return jsonResponse({ ok: false, error: { code: "invalid_request", message: "Use valid switches, a local time after midnight, and a timezone such as Asia/Manila." } }, 400, request);
  const initialized = await auth.value.client.from("notification_preferences").upsert({ user_id: auth.value.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (initialized.error) return jsonResponse({ ok: false, error: { code: "unavailable", message: "Could not save notification settings." } }, 503, request);
  const result = await auth.value.client.from("notification_preferences").update(patch).eq("user_id", auth.value.user.id).select("*").single();
  if (result.error) return jsonResponse({ ok: false, error: { code: "unavailable", message: "Could not save notification settings." } }, 503, request);
  return jsonResponse({ ok: true, data: { preferences: { ...result.data, reminder_time: result.data.reminder_time.slice(0, 5) } } }, 200, request);
}
export function OPTIONS(request: Request): Response { return optionsResponse(request, "GET, PATCH, OPTIONS"); }
