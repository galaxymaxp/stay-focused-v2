import type {
  CanvasCapability,
  CanvasCapabilityStatus,
  CanvasCourse,
} from "@stay-focused/canvas";

import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const CONNECTION_PATH = "/api/canvas/connection";
const COURSES_PATH = "/api/canvas/courses";
const CAPABILITIES_PATH = "/api/canvas/capabilities";
const SYNC_PATH = "/api/canvas/sync";
const MAX_ERROR_MESSAGE_CHARS = 300;

export interface CanvasConnectionSummary {
  readonly id: string;
  readonly baseUrl: string;
  readonly canvasUserId: string;
  readonly canvasUserName: string;
  readonly canvasUserEmail: string | null;
  readonly status: string;
  readonly lastVerifiedAt: string;
  readonly lastErrorCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CanvasCapabilitySummary {
  readonly id?: string;
  readonly capability: CanvasCapability;
  readonly status: CanvasCapabilityStatus;
  readonly testedAt: string | null;
  readonly safeErrorCode: string | null;
  readonly courseId: string | null;
  readonly integrationVersion: string | null;
}

export type CanvasSyncStatus = "succeeded" | "partial" | "failed";
export type CanvasSyncMode = "full" | "incremental";

export interface CanvasSyncSummary {
  readonly status: CanvasSyncStatus;
  readonly mode: CanvasSyncMode;
  readonly syncWindow: {
    readonly startDate: string;
    readonly endDate: string;
  };
  readonly courses: {
    readonly discovered: number;
    readonly succeeded: number;
    readonly changed: number;
    readonly unchanged: number;
    readonly failed: number;
  };
  readonly plannerItems: {
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly pruned: number;
    readonly failed: number;
  };
  readonly announcements: {
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly pruned: number;
    readonly coursesSucceeded: number;
    readonly coursesFailed: number;
  };
  readonly resources: {
    readonly modules: number;
    readonly moduleItems: number;
    readonly pages: number;
    readonly assignmentGroups: number;
    readonly assignments: number;
    readonly plannerItems: number;
    readonly announcements: number;
  };
  readonly retryAttempts: number;
  readonly failures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasApiBaseInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

export interface SyncCanvasAcademicGraphInput extends CanvasApiBaseInput {
  readonly mode?: CanvasSyncMode;
}

export interface ConnectCanvasInput extends CanvasApiBaseInput {
  readonly baseUrl: string;
  readonly personalAccessToken: string;
}

export interface CanvasConnectionPayload {
  readonly connection: CanvasConnectionSummary | null;
}

export interface ConnectCanvasPayload {
  readonly connection: CanvasConnectionSummary;
  readonly courses: readonly CanvasCourse[];
  readonly capabilities: readonly CanvasCapabilitySummary[];
}

export type CanvasApiResult<TData> =
  | { readonly ok: true; readonly data: TData }
  | { readonly ok: false; readonly error: CanvasApiClientError };

export type CanvasApiClientErrorCode =
  | "invalid_api_base_url"
  | "missing_access_token"
  | "missing_canvas_url"
  | "missing_canvas_token"
  | "request_aborted"
  | "network_error"
  | "invalid_response"
  | "unauthorized"
  | "invalid_canvas_url"
  | "invalid_canvas_token"
  | "permission_denied"
  | "rate_limited"
  | "canvas_unavailable"
  | "canvas_timeout"
  | "missing_connection"
  | "corrupted_credentials"
  | "sync_in_progress"
  | "storage_not_configured"
  | "storage_failed"
  | "unknown_api_error";

export interface CanvasApiClientError {
  readonly code: CanvasApiClientErrorCode;
  readonly message: string;
  readonly status?: number;
  readonly apiCode?: string;
}

interface ConnectionSuccessResponse {
  readonly ok: true;
  readonly connection: CanvasConnectionSummary | null;
}

interface ConnectSuccessResponse {
  readonly ok: true;
  readonly connection: CanvasConnectionSummary;
  readonly courses?: readonly CanvasCourse[];
  readonly capabilities?: readonly CanvasCapabilitySummary[];
}

interface CoursesSuccessResponse {
  readonly ok: true;
  readonly courses: readonly CanvasCourse[];
}

interface CapabilitiesSuccessResponse {
  readonly ok: true;
  readonly capabilities: readonly CanvasCapabilitySummary[];
}

interface SyncSuccessResponse extends CanvasSyncSummary {
  readonly ok: true;
}

interface DeleteSuccessResponse {
  readonly ok: true;
}

interface CanvasApiErrorResponse {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export async function getCanvasConnection(
  input: CanvasApiBaseInput,
): Promise<CanvasApiResult<CanvasConnectionPayload>> {
  const endpoint = createEndpoint(input.apiBaseUrl, CONNECTION_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseConnectionResponse,
  });
}

export async function connectCanvas(
  input: ConnectCanvasInput,
): Promise<CanvasApiResult<ConnectCanvasPayload>> {
  const endpoint = createEndpoint(input.apiBaseUrl, CONNECTION_PATH);
  if (!endpoint.ok) return endpoint;

  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    return clientError("missing_canvas_url", "Enter your Canvas URL.");
  }

  const personalAccessToken = input.personalAccessToken.trim();
  if (!personalAccessToken) {
    return clientError(
      "missing_canvas_token",
      "Enter a personal access token generated from your own Canvas account.",
    );
  }

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "PUT",
    body: { baseUrl, personalAccessToken },
    parseSuccess: parseConnectResponse,
  });
}

export async function disconnectCanvas(
  input: CanvasApiBaseInput,
): Promise<CanvasApiResult<void>> {
  const endpoint = createEndpoint(input.apiBaseUrl, CONNECTION_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "DELETE",
    parseSuccess: parseDeleteResponse,
  });
}

export async function listCanvasCourses(
  input: CanvasApiBaseInput,
): Promise<CanvasApiResult<readonly CanvasCourse[]>> {
  const endpoint = createEndpoint(input.apiBaseUrl, COURSES_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseCoursesResponse,
  });
}

export async function listCanvasCapabilities(
  input: CanvasApiBaseInput,
): Promise<CanvasApiResult<readonly CanvasCapabilitySummary[]>> {
  const endpoint = createEndpoint(input.apiBaseUrl, CAPABILITIES_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseCapabilitiesResponse,
  });
}

export async function syncCanvasAcademicGraph(
  input: SyncCanvasAcademicGraphInput,
): Promise<CanvasApiResult<CanvasSyncSummary>> {
  const endpoint = createEndpoint(input.apiBaseUrl, SYNC_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "POST",
    ...(input.mode ? { body: { mode: input.mode } } : {}),
    parseSuccess: parseSyncResponse,
  });
}

function createEndpoint(
  apiBaseUrl: string,
  path: string,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: CanvasApiClientError } {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return clientError("invalid_api_base_url", API_BASE_URL_SETUP_HINT);
  }

  try {
    const parsed = new URL(normalizedBaseUrl);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.search ||
      parsed.hash
    ) {
      return clientError(
        "invalid_api_base_url",
        `EXPO_PUBLIC_API_BASE_URL must be a plain HTTP(S) base URL. ${API_BASE_URL_SETUP_HINT}`,
      );
    }
  } catch {
    return clientError(
      "invalid_api_base_url",
      `EXPO_PUBLIC_API_BASE_URL must be a valid API base URL. ${API_BASE_URL_SETUP_HINT}`,
    );
  }

  return { ok: true, url: `${normalizedBaseUrl}${path}` };
}

async function requestJson<TData>({
  body,
  endpoint,
  input,
  method,
  parseSuccess,
}: {
  readonly body?: unknown;
  readonly endpoint: string;
  readonly input: CanvasApiBaseInput;
  readonly method: "GET" | "PUT" | "POST" | "DELETE";
  readonly parseSuccess: (parsed: unknown) => CanvasApiResult<TData>;
}): Promise<CanvasApiResult<TData>> {
  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError(
      "missing_access_token",
      "A valid login session is required for Canvas.",
    );
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: input.signal,
    });
    const parsed = await readJson(response);

    if (!response.ok) {
      return apiError(response.status, parsed);
    }

    return parseSuccess(parsed);
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_aborted", "Canvas request was aborted.");
    }

    return clientError(
      "network_error",
      `Canvas request failed before receiving a response. ${API_BASE_URL_SETUP_HINT}`,
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function parseConnectionResponse(
  parsed: unknown,
): CanvasApiResult<CanvasConnectionPayload> {
  if (isConnectionSuccessResponse(parsed)) {
    return { ok: true, data: { connection: parsed.connection } };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid connection response.",
  );
}

function parseConnectResponse(
  parsed: unknown,
): CanvasApiResult<ConnectCanvasPayload> {
  if (isConnectSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        connection: parsed.connection,
        courses: parsed.courses ?? [],
        capabilities: parsed.capabilities ?? [],
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid connection response.",
  );
}

function parseCoursesResponse(
  parsed: unknown,
): CanvasApiResult<readonly CanvasCourse[]> {
  if (isCoursesSuccessResponse(parsed)) {
    return { ok: true, data: parsed.courses };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid course response.",
  );
}

function parseCapabilitiesResponse(
  parsed: unknown,
): CanvasApiResult<readonly CanvasCapabilitySummary[]> {
  if (isCapabilitiesSuccessResponse(parsed)) {
    return { ok: true, data: parsed.capabilities };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid capability response.",
  );
}

function parseSyncResponse(parsed: unknown): CanvasApiResult<CanvasSyncSummary> {
  if (isSyncSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        status: parsed.status,
        mode: parsed.mode,
        syncWindow: parsed.syncWindow,
        courses: parsed.courses,
        plannerItems: parsed.plannerItems,
        announcements: parsed.announcements,
        resources: parsed.resources,
        retryAttempts: parsed.retryAttempts,
        ...(parsed.failures ? { failures: parsed.failures } : {}),
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid synchronization response.",
  );
}

function parseDeleteResponse(parsed: unknown): CanvasApiResult<void> {
  if (isDeleteSuccessResponse(parsed)) {
    return { ok: true, data: undefined };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid disconnect response.",
  );
}

function apiError(status: number, parsed: unknown): CanvasApiResult<never> {
  if (isCanvasApiErrorResponse(parsed)) {
    const code = mapApiErrorCode(parsed.error.code);
    return {
      ok: false,
      error: {
        code,
        message: safeApiErrorMessage(parsed.error.message, status, code),
        status,
        ...(code === "unknown_api_error" ? { apiCode: parsed.error.code } : {}),
      },
    };
  }

  return clientError(
    statusToClientErrorCode(status),
    statusToClientErrorMessage(status),
    status,
  );
}

function clientError(
  code: CanvasApiClientErrorCode,
  message: string,
  status?: number,
): { readonly ok: false; readonly error: CanvasApiClientError } {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function mapApiErrorCode(code: string): CanvasApiClientErrorCode {
  switch (code) {
    case "unauthorized":
      return "unauthorized";
    case "invalid_canvas_url":
      return "invalid_canvas_url";
    case "invalid_canvas_token":
      return "invalid_canvas_token";
    case "canvas_permission_denied":
      return "permission_denied";
    case "canvas_rate_limited":
      return "rate_limited";
    case "canvas_unavailable":
      return "canvas_unavailable";
    case "canvas_timeout":
      return "canvas_timeout";
    case "canvas_connection_missing":
      return "missing_connection";
    case "canvas_connection_corrupt":
      return "corrupted_credentials";
    case "canvas_sync_in_progress":
      return "sync_in_progress";
    case "canvas_storage_not_configured":
      return "storage_not_configured";
    case "canvas_storage_failed":
      return "storage_failed";
    case "invalid_json":
    case "invalid_request":
    case "payload_too_large":
      return "invalid_response";
    default:
      return "unknown_api_error";
  }
}

function statusToClientErrorCode(status: number): CanvasApiClientErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "permission_denied";
  if (status === 404) return "missing_connection";
  if (status === 429) return "rate_limited";
  if (status === 504) return "canvas_timeout";
  if (status >= 500) return "canvas_unavailable";
  return "invalid_response";
}

function statusToClientErrorMessage(status: number): string {
  if (status === 401) return "Sign in again before using Canvas.";
  if (status === 403) return "Canvas denied access for this token.";
  if (status === 404) return "Connect Canvas before loading courses.";
  if (status === 429) return "Canvas rate limited the request. Try again later.";
  if (status === 504) return "Canvas did not respond in time.";
  if (status >= 500) return "Canvas is temporarily unavailable.";
  return "Canvas returned an unexpected response.";
}

function safeApiErrorMessage(
  message: string,
  status: number,
  code: CanvasApiClientErrorCode,
): string {
  if (code === "unauthorized") return "Sign in again before using Canvas.";
  if (code === "invalid_canvas_token") {
    return "Canvas rejected the personal access token.";
  }
  if (code === "storage_failed" || code === "storage_not_configured") {
    return "Canvas connection storage could not complete the request.";
  }
  if (code === "corrupted_credentials") {
    return "Reconnect Canvas before loading courses.";
  }

  const normalized = sanitizeDiagnosticText(message)
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_CHARS);
  if (!normalized || looksLikeStackTrace(normalized)) {
    return statusToClientErrorMessage(status);
  }
  return normalized;
}

function isConnectionSuccessResponse(
  value: unknown,
): value is ConnectionSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    (value.connection === null || isCanvasConnectionSummary(value.connection))
  );
}

function isConnectSuccessResponse(value: unknown): value is ConnectSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    isCanvasConnectionSummary(value.connection) &&
    (value.courses === undefined ||
      (Array.isArray(value.courses) && value.courses.every(isCanvasCourse))) &&
    (value.capabilities === undefined ||
      (Array.isArray(value.capabilities) &&
        value.capabilities.every(isCanvasCapabilitySummary)))
  );
}

function isCoursesSuccessResponse(value: unknown): value is CoursesSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    Array.isArray(value.courses) &&
    value.courses.every(isCanvasCourse)
  );
}

function isCapabilitiesSuccessResponse(
  value: unknown,
): value is CapabilitiesSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every(isCanvasCapabilitySummary)
  );
}

function isSyncSuccessResponse(value: unknown): value is SyncSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    hasOnlyKeys(value, [
      "ok",
      "status",
      "mode",
      "syncWindow",
      "courses",
      "plannerItems",
      "announcements",
      "resources",
      "retryAttempts",
      "failures",
    ]) &&
    isCanvasSyncStatus(value.status) &&
    isCanvasSyncMode(value.mode) &&
    isSyncWindow(value.syncWindow) &&
    isSyncCourseCounts(value.courses) &&
    isPlannerSyncCounts(value.plannerItems) &&
    isAnnouncementSyncCounts(value.announcements) &&
    isSyncResourceCounts(value.resources) &&
    isNonNegativeInteger(value.retryAttempts) &&
    (value.failures === undefined ||
      (Array.isArray(value.failures) &&
        value.failures.every(isSyncFailureSummary)))
  );
}

function isDeleteSuccessResponse(value: unknown): value is DeleteSuccessResponse {
  return isRecord(value) && value.ok === true;
}

function isCanvasApiErrorResponse(value: unknown): value is CanvasApiErrorResponse {
  return (
    isRecord(value) &&
    value.ok === false &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function isCanvasConnectionSummary(
  value: unknown,
): value is CanvasConnectionSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.baseUrl === "string" &&
    typeof value.canvasUserId === "string" &&
    typeof value.canvasUserName === "string" &&
    (value.canvasUserEmail === null ||
      typeof value.canvasUserEmail === "string") &&
    typeof value.status === "string" &&
    typeof value.lastVerifiedAt === "string" &&
    (value.lastErrorCode === null || typeof value.lastErrorCode === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isCanvasCourse(value: unknown): value is CanvasCourse {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.courseCode === null || typeof value.courseCode === "string") &&
    (value.workflowState === null ||
      typeof value.workflowState === "string") &&
    (value.enrollmentTermId === null ||
      typeof value.enrollmentTermId === "string") &&
    (value.accountId === null || typeof value.accountId === "string") &&
    (value.startAt === null || typeof value.startAt === "string") &&
    (value.endAt === null || typeof value.endAt === "string") &&
    (value.timeZone === null || typeof value.timeZone === "string") &&
    (value.publicSyllabus === null ||
      typeof value.publicSyllabus === "boolean") &&
    (value.syllabusBody === null || typeof value.syllabusBody === "string") &&
    (value.updatedAt === null || typeof value.updatedAt === "string")
  );
}

function isCanvasCapabilitySummary(
  value: unknown,
): value is CanvasCapabilitySummary {
  return (
    isRecord(value) &&
    isCanvasCapability(value.capability) &&
    isCanvasCapabilityStatus(value.status) &&
    (value.testedAt === null || typeof value.testedAt === "string") &&
    (value.safeErrorCode === null ||
      typeof value.safeErrorCode === "string") &&
    (value.courseId === null || typeof value.courseId === "string") &&
    (value.integrationVersion === null ||
      typeof value.integrationVersion === "string")
  );
}

function isCanvasCapability(value: unknown): value is CanvasCapability {
  return (
    value === "profile" ||
    value === "courses" ||
    value === "enrollments" ||
    value === "syllabus" ||
    value === "modules" ||
    value === "pages" ||
    value === "files" ||
    value === "assignments" ||
    value === "assignment_groups" ||
    value === "submissions" ||
    value === "grades" ||
    value === "grading_periods" ||
    value === "rubrics" ||
    value === "announcements" ||
    value === "discussions" ||
    value === "classic_quizzes" ||
    value === "new_quizzes" ||
    value === "planner" ||
    value === "calendar" ||
    value === "learning_object_dates" ||
    value === "outcomes" ||
    value === "media_captions" ||
    value === "conversations" ||
    value === "history" ||
    value === "what_if_grades"
  );
}

function isCanvasCapabilityStatus(
  value: unknown,
): value is CanvasCapabilityStatus {
  return (
    value === "available" ||
    value === "permission_denied" ||
    value === "not_enabled" ||
    value === "not_supported" ||
    value === "temporarily_failed" ||
    value === "not_tested"
  );
}

function isCanvasSyncStatus(value: unknown): value is CanvasSyncStatus {
  return value === "succeeded" || value === "partial" || value === "failed";
}

function isCanvasSyncMode(value: unknown): value is CanvasSyncMode {
  return value === "full" || value === "incremental";
}

function isSyncCourseCounts(value: unknown): value is CanvasSyncSummary["courses"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "discovered",
      "succeeded",
      "changed",
      "unchanged",
      "failed",
    ]) &&
    isNonNegativeInteger(value.discovered) &&
    isNonNegativeInteger(value.succeeded) &&
    isNonNegativeInteger(value.changed) &&
    isNonNegativeInteger(value.unchanged) &&
    value.succeeded === value.changed + value.unchanged &&
    isNonNegativeInteger(value.failed)
  );
}

function isSyncWindow(
  value: unknown,
): value is CanvasSyncSummary["syncWindow"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["startDate", "endDate"]) &&
    typeof value.startDate === "string" &&
    typeof value.endDate === "string" &&
    Number.isFinite(Date.parse(value.startDate)) &&
    Number.isFinite(Date.parse(value.endDate))
  );
}

function isPlannerSyncCounts(
  value: unknown,
): value is CanvasSyncSummary["plannerItems"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "discovered",
      "inserted",
      "updated",
      "unchanged",
      "pruned",
      "failed",
    ]) &&
    isNonNegativeInteger(value.discovered) &&
    isNonNegativeInteger(value.inserted) &&
    isNonNegativeInteger(value.updated) &&
    isNonNegativeInteger(value.unchanged) &&
    isNonNegativeInteger(value.pruned) &&
    isNonNegativeInteger(value.failed)
  );
}

function isAnnouncementSyncCounts(
  value: unknown,
): value is CanvasSyncSummary["announcements"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "discovered",
      "inserted",
      "updated",
      "unchanged",
      "pruned",
      "coursesSucceeded",
      "coursesFailed",
    ]) &&
    isNonNegativeInteger(value.discovered) &&
    isNonNegativeInteger(value.inserted) &&
    isNonNegativeInteger(value.updated) &&
    isNonNegativeInteger(value.unchanged) &&
    isNonNegativeInteger(value.pruned) &&
    isNonNegativeInteger(value.coursesSucceeded) &&
    isNonNegativeInteger(value.coursesFailed)
  );
}

function isSyncResourceCounts(
  value: unknown,
): value is CanvasSyncSummary["resources"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "modules",
      "moduleItems",
      "pages",
      "assignmentGroups",
      "assignments",
      "plannerItems",
      "announcements",
    ]) &&
    isNonNegativeInteger(value.modules) &&
    isNonNegativeInteger(value.moduleItems) &&
    isNonNegativeInteger(value.pages) &&
    isNonNegativeInteger(value.assignmentGroups) &&
    isNonNegativeInteger(value.assignments) &&
    isNonNegativeInteger(value.plannerItems) &&
    isNonNegativeInteger(value.announcements)
  );
}

function isSyncFailureSummary(
  value: unknown,
): value is NonNullable<CanvasSyncSummary["failures"]>[number] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["code", "count"]) &&
    typeof value.code === "string" &&
    value.code.trim().length > 0 &&
    isNonNegativeInteger(value.count)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function hasOnlyKeys(
  value: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function looksLikeStackTrace(value: string): boolean {
  return /\b(?:Error:|at\s+\S+\s+\(|stack)\b/i.test(value);
}

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(
      /(authorization|access_token|refresh_token|id_token|personalAccessToken|private_key|client_email|CANVAS_TOKEN_ENCRYPTION_KEY|CANVAS_LIVE_PERSONAL_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY)(["'\s:=]+)([^"'\s,}]+)/gi,
      "$1$2[REDACTED]",
    );
}

function isAbortError(error: unknown): boolean {
  const DomException = globalThis.DOMException;
  return typeof DomException === "function" && error instanceof DomException
    ? error.name === "AbortError"
    : isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
