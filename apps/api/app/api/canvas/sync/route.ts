import {
  jsonResponse,
  optionsResponse,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { syncCanvasAcademicGraph } from "@/lib/canvas-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const result = await syncCanvasAcademicGraph({
    client: auth.value.client,
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
