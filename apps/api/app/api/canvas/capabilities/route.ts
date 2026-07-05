import {
  errorResponse,
  jsonResponse,
  mapCapability,
  optionsResponse,
  readCapabilities,
  requireCanvasAuth,
} from "@/lib/canvas-routes";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const capabilities = await readCapabilities(
    auth.value.client,
    auth.value.user.id,
  );
  if (!capabilities.ok) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas capabilities could not be loaded.",
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      capabilities: capabilities.rows.map(mapCapability),
    },
    200,
    request,
  );
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}
