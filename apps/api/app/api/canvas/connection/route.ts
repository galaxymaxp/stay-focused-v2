import {
  createCanvasClient,
  createCapabilityInserts,
  createConnectionInsert,
  errorResponse,
  jsonResponse,
  mapCapability,
  mapCanvasClientError,
  mapConnection,
  normalizeCanvasUrlForApi,
  optionsResponse,
  readConnectRequest,
  readConnection,
  requireCanvasAuth,
} from "@/lib/canvas-routes";
import { encryptCanvasToken } from "@/lib/canvas-token-encryption";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const connection = await readConnection(auth.value.client, auth.value.user.id);
  if (!connection.ok) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas connection could not be loaded.",
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      connection: connection.row ? mapConnection(connection.row) : null,
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

  const validation = await readConnectRequest(request);
  if (!validation.ok) {
    return errorResponse(
      validation.status,
      validation.code,
      validation.message,
      request,
    );
  }

  let normalizedBaseUrl: string;
  try {
    normalizedBaseUrl = normalizeCanvasUrlForApi(validation.value.baseUrl);
  } catch (error) {
    const mapped = mapCanvasClientError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, request);
  }

  const canvas = createCanvasClient(
    normalizedBaseUrl,
    validation.value.personalAccessToken,
  );

  let profile;
  let courses;
  try {
    profile = await canvas.getCurrentUser();
    courses = await canvas.listCourses();
  } catch (error) {
    const mapped = mapCanvasClientError(error);
    return errorResponse(mapped.status, mapped.code, mapped.message, request);
  }

  const capabilities = await canvas.probeCapabilities();
  let encryptedToken;
  try {
    encryptedToken = encryptCanvasToken(validation.value.personalAccessToken);
  } catch {
    return errorResponse(
      500,
      "canvas_storage_not_configured",
      "Canvas token encryption is not configured.",
      request,
    );
  }

  const verifiedAt = new Date().toISOString();
  const connectionInsert = createConnectionInsert({
    baseUrl: normalizedBaseUrl,
    encryptedToken,
    profile,
    userId: auth.value.user.id,
    verifiedAt,
  });

  const { data: savedConnection, error: saveError } = await auth.value.client
    .from("canvas_connections")
    .upsert(connectionInsert, { onConflict: "user_id" })
    .select(
      "id,user_id,base_url,canvas_user_id,canvas_user_name,canvas_user_email,status,last_verified_at,last_error_code,created_at,updated_at",
    )
    .single();

  if (saveError || !savedConnection) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas connection could not be saved.",
      request,
    );
  }

  const deleteCapabilities = await auth.value.client
    .from("canvas_capabilities")
    .delete()
    .eq("canvas_connection_id", savedConnection.id);

  if (deleteCapabilities.error) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas capability results could not be refreshed.",
      request,
    );
  }

  const capabilityInserts = createCapabilityInserts({
    capabilities,
    connectionId: savedConnection.id,
    userId: auth.value.user.id,
  });
  const insertCapabilities = await auth.value.client
    .from("canvas_capabilities")
    .insert(capabilityInserts);

  if (insertCapabilities.error) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas capability results could not be saved.",
      request,
    );
  }

  return jsonResponse(
    {
      ok: true,
      connection: mapConnection(savedConnection),
      courses,
      capabilities: capabilities.map(mapCapability),
    },
    200,
    request,
  );
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireCanvasAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { error } = await auth.value.client
    .from("canvas_connections")
    .delete()
    .eq("user_id", auth.value.user.id);

  if (error) {
    return errorResponse(
      500,
      "canvas_storage_failed",
      "Canvas connection could not be disconnected.",
      request,
    );
  }

  return jsonResponse({ ok: true }, 200, request);
}

export function OPTIONS(request: Request): Response {
  return optionsResponse(request, "GET, PUT, DELETE, OPTIONS");
}
