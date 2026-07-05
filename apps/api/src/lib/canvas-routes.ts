import type {
  CanvasCapability,
  CanvasCapabilityProbeResult,
  CanvasCapabilityStatus,
  CanvasClientErrorCode,
} from "@stay-focused/canvas";
import {
  CanvasClient,
  CanvasClientError,
  normalizeCanvasBaseUrl,
} from "@stay-focused/canvas";
import type {
  Database,
  CanvasCapabilityInsert,
  CanvasCapabilityRow,
  CanvasConnectionInsert,
  CanvasConnectionRow,
} from "@stay-focused/db";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { verifyBearerToken } from "@/lib/auth";
import { createCanvasServiceClient } from "@/lib/canvas-db";
import {
  decryptCanvasToken,
  encryptCanvasToken,
} from "@/lib/canvas-token-encryption";
import type {
  CanvasApiErrorCode,
  CanvasApiResponse,
  CanvasCapabilitySummary,
  CanvasConnectionSummary,
} from "@/types/canvas";

const CORS_ALLOWED_HEADERS = "authorization, content-type";
const CORS_MAX_AGE_SECONDS = "600";
const MAX_CONNECT_BODY_BYTES = 16 * 1024;
const MAX_CANVAS_BASE_URL_CHARS = 2048;
const MAX_CANVAS_TOKEN_CHARS = 4096;
const CONNECT_REQUEST_FIELDS = new Set(["baseUrl", "personalAccessToken"]);
const CONNECTION_SAFE_COLUMNS =
  "id,user_id,base_url,canvas_user_id,canvas_user_name,canvas_user_email,status,last_verified_at,last_error_code,created_at,updated_at";
const CONNECTION_SECRET_COLUMNS =
  `${CONNECTION_SAFE_COLUMNS},token_ciphertext,token_iv,token_auth_tag,encryption_version`;
const CAPABILITY_COLUMNS =
  "id,capability,status,tested_at,safe_error_code,course_id,integration_version";

type CanvasConnectionSummaryRow = Pick<
  CanvasConnectionRow,
  | "id"
  | "user_id"
  | "base_url"
  | "canvas_user_id"
  | "canvas_user_name"
  | "canvas_user_email"
  | "status"
  | "last_verified_at"
  | "last_error_code"
  | "created_at"
  | "updated_at"
>;

type CanvasCapabilitySummaryRow = Pick<
  CanvasCapabilityRow,
  | "id"
  | "capability"
  | "status"
  | "tested_at"
  | "safe_error_code"
  | "course_id"
  | "integration_version"
>;

export interface CanvasAuthContext {
  readonly user: User;
  readonly client: SupabaseClient<Database>;
}

export interface ValidatedConnectRequest {
  readonly baseUrl: string;
  readonly personalAccessToken: string;
}

export async function requireCanvasAuth(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: CanvasAuthContext }
  | { readonly ok: false; readonly response: Response }
> {
  const user = await verifyBearerToken(request);
  if (!user) {
    return {
      ok: false,
      response: errorResponse(
        401,
        "unauthorized",
        "Authorization header must be a valid Bearer token.",
        request,
      ),
    };
  }

  try {
    return {
      ok: true,
      value: {
        user,
        client: createCanvasServiceClient(),
      },
    };
  } catch {
    return {
      ok: false,
      response: errorResponse(
        500,
        "canvas_storage_not_configured",
        "Canvas storage is not configured.",
        request,
      ),
    };
  }
}

export async function readConnectRequest(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: ValidatedConnectRequest }
  | {
      readonly ok: false;
      readonly status: 400 | 413;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
    }
> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return invalidConnectRequest("Request content type must be application/json.");
  }

  if (isOversizedContentLength(request.headers.get("content-length"))) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_CONNECT_BODY_BYTES} bytes.`,
    };
  }

  const rawBody = await readBoundedTextBody(request);
  if (!rawBody.ok) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Request body must be at most ${MAX_CONNECT_BODY_BYTES} bytes.`,
    };
  }

  const body = parseJson(rawBody.value);
  if (!body.ok) {
    return {
      ok: false,
      status: 400,
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    };
  }

  if (!isRecord(body.value)) {
    return invalidConnectRequest("Request body must be a JSON object.");
  }
  if (!hasOnlyConnectRequestFields(body.value)) {
    return invalidConnectRequest("Request body contains unsupported fields.");
  }

  const baseUrl = body.value.baseUrl;
  const token = body.value.personalAccessToken;
  if (typeof baseUrl !== "string" || typeof token !== "string") {
    return invalidConnectRequest(
      "baseUrl and personalAccessToken are required.",
    );
  }

  const trimmedBaseUrl = baseUrl.trim();
  const trimmedToken = token.trim();
  if (!trimmedBaseUrl || !trimmedToken) {
    return invalidConnectRequest(
      "baseUrl and personalAccessToken must not be blank.",
    );
  }
  if (
    trimmedBaseUrl.length > MAX_CANVAS_BASE_URL_CHARS ||
    trimmedToken.length > MAX_CANVAS_TOKEN_CHARS
  ) {
    return invalidConnectRequest("Canvas credentials request is too large.");
  }

  return {
    ok: true,
    value: {
      baseUrl: trimmedBaseUrl,
      personalAccessToken: trimmedToken,
    },
  };
}

export function createCanvasClient(
  baseUrl: string,
  personalAccessToken: string,
): CanvasClient {
  return new CanvasClient({
    baseUrl,
    personalAccessToken,
  });
}

export function normalizeCanvasUrlForApi(baseUrl: string): string {
  return normalizeCanvasBaseUrl(baseUrl);
}

export function mapConnection(
  row: CanvasConnectionSummaryRow,
): CanvasConnectionSummary {
  return {
    id: row.id,
    baseUrl: row.base_url,
    canvasUserId: row.canvas_user_id,
    canvasUserName: row.canvas_user_name,
    canvasUserEmail: row.canvas_user_email,
    status: row.status,
    lastVerifiedAt: row.last_verified_at,
    lastErrorCode: row.last_error_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCapability(
  row: CanvasCapabilitySummaryRow | CanvasCapabilityProbeResult,
): CanvasCapabilitySummary {
  if ("testedAt" in row) {
    return {
      capability: row.capability,
      status: row.status,
      testedAt: row.testedAt,
      safeErrorCode: row.safeErrorCode,
      courseId: row.courseId,
      integrationVersion: row.integrationVersion,
    };
  }

  return {
    id: row.id,
    capability: row.capability as CanvasCapability,
    status: row.status as CanvasCapabilityStatus,
    testedAt: row.tested_at,
    safeErrorCode: row.safe_error_code,
    courseId: row.course_id,
    integrationVersion: row.integration_version,
  };
}

export function createConnectionInsert({
  baseUrl,
  encryptedToken,
  profile,
  userId,
  verifiedAt,
}: {
  readonly baseUrl: string;
  readonly encryptedToken: ReturnType<typeof encryptCanvasToken>;
  readonly profile: {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
  };
  readonly userId: string;
  readonly verifiedAt: string;
}): CanvasConnectionInsert {
  return {
    user_id: userId,
    base_url: baseUrl,
    canvas_user_id: profile.id,
    canvas_user_name: profile.name,
    canvas_user_email: profile.email,
    token_ciphertext: encryptedToken.ciphertext,
    token_iv: encryptedToken.iv,
    token_auth_tag: encryptedToken.authTag,
    encryption_version: encryptedToken.encryptionVersion,
    status: "active",
    last_verified_at: verifiedAt,
    last_error_code: null,
  };
}

export function createCapabilityInserts({
  capabilities,
  connectionId,
  userId,
}: {
  readonly capabilities: readonly CanvasCapabilityProbeResult[];
  readonly connectionId: string;
  readonly userId: string;
}): CanvasCapabilityInsert[] {
  return capabilities.map((capability) => ({
    user_id: userId,
    canvas_connection_id: connectionId,
    capability: capability.capability,
    status: capability.status,
    tested_at: capability.testedAt,
    safe_error_code: capability.safeErrorCode,
    course_id: capability.courseId,
    integration_version: capability.integrationVersion,
  }));
}

export function decryptConnectionToken(row: CanvasConnectionRow): string {
  return decryptCanvasToken({
    ciphertext: row.token_ciphertext,
    iv: row.token_iv,
    authTag: row.token_auth_tag,
    encryptionVersion: row.encryption_version,
  });
}

export function mapCanvasClientError(error: unknown): {
  readonly status: 400 | 401 | 403 | 429 | 502 | 503 | 504;
  readonly code: CanvasApiErrorCode;
  readonly message: string;
} {
  const code = getCanvasClientErrorCode(error);
  switch (code) {
    case "invalid_base_url":
      return {
        status: 400,
        code: "invalid_canvas_url",
        message: "Canvas URL must be a plain HTTPS Canvas instance URL.",
      };
    case "missing_access_token":
    case "canvas_unauthorized":
      return {
        status: 401,
        code: "invalid_canvas_token",
        message: "Canvas rejected the personal access token.",
      };
    case "canvas_forbidden":
      return {
        status: 403,
        code: "canvas_permission_denied",
        message: "Canvas denied access for this token.",
      };
    case "canvas_rate_limited":
      return {
        status: 429,
        code: "canvas_rate_limited",
        message: "Canvas rate limited the request. Try again later.",
      };
    case "canvas_timeout":
      return {
        status: 504,
        code: "canvas_timeout",
        message: "Canvas did not respond in time.",
      };
    case "canvas_network_error":
    case "canvas_unavailable":
      return {
        status: 503,
        code: "canvas_unavailable",
        message: "Canvas is temporarily unavailable.",
      };
    case "canvas_malformed_json":
    case "canvas_invalid_response":
    case "canvas_not_found":
    case "canvas_redirect_rejected":
    case "canvas_pagination_rejected":
    case "canvas_request_failed":
      return {
        status: 502,
        code: "canvas_unavailable",
        message: "Canvas returned an unexpected response.",
      };
  }
}

export function jsonResponse(
  body: CanvasApiResponse,
  status: 200 | 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 502 | 503 | 504,
  request?: Request,
): Response {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...createCorsHeaders(request?.headers.get("origin") ?? null),
    },
  });
}

export function errorResponse(
  status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500 | 502 | 503 | 504,
  code: CanvasApiErrorCode,
  message: string,
  request?: Request,
): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status, request);
}

export function optionsResponse(
  request: Request,
  methods: string,
): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request.headers.get("origin"), methods),
  });
}

export function createCorsHeaders(
  origin: string | null,
  methods = "GET, PUT, DELETE, OPTIONS",
): Record<string, string> {
  const allowedOrigin = getAllowedCorsOrigin(origin);
  if (!allowedOrigin) {
    return { Vary: "Origin" };
  }

  return {
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Max-Age": CORS_MAX_AGE_SECONDS,
    Vary: "Origin",
  };
}

export async function readConnection(
  client: SupabaseClient<Database>,
  userId: string,
  columns = CONNECTION_SAFE_COLUMNS,
): Promise<
  | { readonly ok: true; readonly row: CanvasConnectionRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_connections")
    .select(columns)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, row: data as CanvasConnectionRow | null };
}

export async function readCapabilities(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<
  | { readonly ok: true; readonly rows: readonly CanvasCapabilitySummaryRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_capabilities")
    .select(CAPABILITY_COLUMNS)
    .eq("user_id", userId)
    .order("capability", { ascending: true })
    .order("course_id", { ascending: true, nullsFirst: true });

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, rows: data as unknown as readonly CanvasCapabilitySummaryRow[] };
}

export async function replaceConnectionWithCapabilities({
  capabilities,
  client,
  connection,
}: {
  readonly capabilities: readonly CanvasCapabilityProbeResult[];
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionInsert;
}): Promise<
  | { readonly ok: true; readonly row: CanvasConnectionSummaryRow }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .rpc("replace_canvas_connection_with_capabilities", {
      p_base_url: connection.base_url,
      p_canvas_user_email: connection.canvas_user_email ?? null,
      p_canvas_user_id: connection.canvas_user_id,
      p_canvas_user_name: connection.canvas_user_name,
      p_capabilities: capabilities.map((capability) => ({
        capability: capability.capability,
        course_id: capability.courseId,
        integration_version: capability.integrationVersion,
        safe_error_code: capability.safeErrorCode,
        status: capability.status,
        tested_at: capability.testedAt,
      })),
      p_encryption_version: connection.encryption_version,
      p_last_verified_at: connection.last_verified_at,
      p_token_auth_tag: connection.token_auth_tag,
      p_token_ciphertext: connection.token_ciphertext,
      p_token_iv: connection.token_iv,
      p_user_id: connection.user_id,
    })
    .single();

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, row: data as CanvasConnectionSummaryRow };
}

export { CONNECTION_SAFE_COLUMNS, CONNECTION_SECRET_COLUMNS };

function parseJson(text: string): (
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false }
) {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

async function readBoundedTextBody(
  request: Request,
): Promise<
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false }
> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_CONNECT_BODY_BYTES) {
    return { ok: false };
  }
  return { ok: true, value: text };
}

function invalidConnectRequest(message: string): {
  readonly ok: false;
  readonly status: 400;
  readonly code: "invalid_request";
  readonly message: string;
} {
  return {
    ok: false,
    status: 400,
    code: "invalid_request",
    message,
  };
}

function isOversizedContentLength(contentLength: string | null): boolean {
  if (!contentLength) {
    return false;
  }
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > MAX_CONNECT_BODY_BYTES;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  return contentType
    .split(";")[0]
    ?.trim()
    .toLowerCase() === "application/json";
}

function hasOnlyConnectRequestFields(
  value: Readonly<Record<string, unknown>>,
): boolean {
  return Object.keys(value).every((key) => CONNECT_REQUEST_FIELDS.has(key));
}

function getCanvasClientErrorCode(error: unknown): CanvasClientErrorCode {
  if (error instanceof CanvasClientError) {
    return error.code;
  }
  if (isRecord(error) && typeof error.code === "string") {
    const code = error.code;
    if (isCanvasClientErrorCode(code)) {
      return code;
    }
  }
  return "canvas_request_failed";
}

function isCanvasClientErrorCode(
  value: string,
): value is CanvasClientErrorCode {
  return (
    value === "invalid_base_url" ||
    value === "missing_access_token" ||
    value === "canvas_unauthorized" ||
    value === "canvas_forbidden" ||
    value === "canvas_not_found" ||
    value === "canvas_rate_limited" ||
    value === "canvas_unavailable" ||
    value === "canvas_timeout" ||
    value === "canvas_network_error" ||
    value === "canvas_malformed_json" ||
    value === "canvas_invalid_response" ||
    value === "canvas_redirect_rejected" ||
    value === "canvas_pagination_rejected" ||
    value === "canvas_request_failed"
  );
}

function getAllowedCorsOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]";

    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      isLocalhost
    ) {
      return origin;
    }
  } catch {
    return null;
  }

  return null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
