import {
  CONNECTION_SECRET_COLUMNS,
  createCanvasClient,
  decryptConnectionToken,
  errorResponse,
  jsonResponse,
  mapCanvasClientError,
  optionsResponse,
  readConnection,
  requireCanvasAuth,
} from "@/lib/canvas-routes";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const connection = await readConnection(
    auth.value.client,
    auth.value.user.id,
    CONNECTION_SECRET_COLUMNS,
  );
  if (!connection.ok) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas connection could not be loaded.",
      request,
    );
  }
  if (!connection.row) {
    return errorResponse(
      404,
      "canvas_connection_missing",
      "Connect Canvas before loading courses.",
      request,
    );
  }

  let token: string;
  try {
    token = decryptConnectionToken(connection.row);
  } catch {
    return errorResponse(
      500,
      "canvas_connection_corrupt",
      "Canvas connection credentials could not be used.",
      request,
    );
  }

  try {
    const courses = await createCanvasClient(
      connection.row.base_url,
      token,
    ).listCourses();
    return jsonResponse({ ok: true, courses }, 200, request);
  } catch (error) {
    const mapped = mapCanvasClientError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, request);
  }
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, OPTIONS");
}
