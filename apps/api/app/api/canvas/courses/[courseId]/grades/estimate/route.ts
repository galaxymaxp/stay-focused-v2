import { jsonResponse, optionsResponse, requireCanvasAuth } from "@/lib/canvas-routes";
import { estimateCanvasCourseGrade } from "@/lib/canvas-grade-read-model";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request, context: { readonly params: Promise<{ readonly courseId: string }> }): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const raw = params.get("target");
  const target = Number(raw);
  if (raw === null || !/^\d+(?:\.\d)?$/.test(raw) || !Number.isFinite(target) || target < 1 || target > 100 ||
    params.getAll("target").length !== 1 || [...params.keys()].some(key => key !== "target")) {
    return jsonResponse({ ok: false, error: { code: "invalid_request", message: "Enter a target between 1 and 100." } }, 400, request);
  }
  const { courseId } = await context.params;
  const result = await estimateCanvasCourseGrade({ client: auth.value.client, courseId: courseId ?? "", userId: auth.value.user.id, targetPercent: target });
  if (!result.ok) return jsonResponse({ ok: false, error: { code: result.code, message: result.message } }, result.status, request);
  return jsonResponse({ ok: true, estimate: result.value }, 200, request);
}

export function OPTIONS(request: Request): Response { return optionsResponse(request, "GET, OPTIONS"); }
