import type {
  CanvasCapability,
  CanvasCapabilityStatus,
  CanvasCourse,
} from "@stay-focused/canvas";

import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const CONNECTION_PATH = "/api/canvas/connection";
const COURSES_PATH = "/api/canvas/courses";
const COURSE_PREFERENCES_PATH = "/api/canvas/course-preferences";
const CAPABILITIES_PATH = "/api/canvas/capabilities";
const SYNC_PATH = "/api/canvas/sync";
const MAX_ERROR_MESSAGE_CHARS = 300;
const SELECTED_COURSE_SYNC_CONCURRENCY = 2;
export const CANVAS_REVIEWER_MAX_SELECTED_SOURCES = 8;

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
export type CanvasCourseClassification =
  | "likely_current"
  | "past_or_concluded"
  | "other_or_uncertain"
  | "unavailable";
export type CanvasCourseSyncStatus = "success" | "partial" | "failed";

export interface CanvasCourseInventoryItem {
  readonly id: string;
  readonly displayName: string;
  readonly courseCode: string | null;
  readonly workflowState: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly term: {
    readonly id: string | null;
    readonly name: string | null;
    readonly startAt: string | null;
    readonly endAt: string | null;
  } | null;
  readonly classification: CanvasCourseClassification;
  readonly selectable: boolean;
  readonly unavailableReason: string | null;
  readonly selected: boolean;
  readonly lastSync: {
    readonly status: "running" | CanvasCourseSyncStatus;
    readonly startedAt: string | null;
    readonly completedAt: string | null;
    readonly lastCheckedAt: string | null;
    readonly lastSuccessfulSyncAt: string | null;
    readonly failureCode: string | null;
  } | null;
}

export interface CanvasCourseInventoryPayload {
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly selectedCourseIds: readonly string[];
  readonly counts: {
    readonly total: number;
    readonly likelyCurrent: number;
    readonly pastOrConcluded: number;
    readonly otherOrUncertain: number;
    readonly unavailable: number;
  };
}

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
  readonly files: {
    readonly coursesSucceeded: number;
    readonly coursesFailed: number;
    readonly discovered: number;
    readonly inserted: number;
    readonly updated: number;
    readonly unchanged: number;
    readonly deactivated: number;
    readonly references: number;
    readonly referencesInserted: number;
    readonly referencesDeleted: number;
    readonly moduleFileReferences: number;
    readonly htmlFileReferences: number;
    readonly metadataOnly: number;
    readonly blocked: number;
  };
  readonly resources: {
    readonly modules: number;
    readonly moduleItems: number;
    readonly pages: number;
    readonly assignmentGroups: number;
    readonly assignments: number;
    readonly plannerItems: number;
    readonly announcements: number;
    readonly files: number;
    readonly fileReferences: number;
  };
  readonly retryAttempts: number;
  readonly failures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasCourseSyncSummary {
  readonly status: CanvasCourseSyncStatus;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly resources: CanvasSyncSummary["resources"];
  readonly modules: number;
  readonly moduleItems: number;
  readonly pages: number;
  readonly assignmentGroups: number;
  readonly assignments: number;
  readonly announcements: number;
  readonly files: number;
  readonly fileReferences: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly pruned: number;
  readonly retryAttempts: number;
  readonly sanitizedFailures?: readonly {
    readonly code: string;
    readonly count: number;
  }[];
}

export interface CanvasCoursePreferencesPayload {
  readonly selectedCourseIds: readonly string[];
}

export interface UpdateCanvasCoursePreferencesPayload {
  readonly selectedCourseIds: readonly string[];
  readonly selectedCount: number;
  readonly deselectedCount: number;
}

export interface SyncSelectedCanvasCoursesInput extends CanvasApiBaseInput {
  readonly selectedCourseIds: readonly string[];
  readonly maxConcurrency?: number;
}

export interface CanvasSelectedCourseSyncItemResult {
  readonly courseId: string;
  readonly ok: boolean;
  readonly summary?: CanvasCourseSyncSummary;
  readonly error?: CanvasApiClientError;
}

export interface CanvasSelectedCourseSyncSummary {
  readonly attempted: number;
  readonly successful: number;
  readonly partial: number;
  readonly failed: number;
  readonly results: readonly CanvasSelectedCourseSyncItemResult[];
}

export type CanvasReviewerSourceType =
  | "page"
  | "assignment"
  | "announcement"
  | "file";

export interface CanvasReviewerCourseSyncSummary {
  readonly status: "success" | "partial" | "failed" | "never";
  readonly completedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
  readonly latestResultWasPartial: boolean;
  readonly synchronizedSourcesAvailable: boolean;
  readonly failureCategories: readonly string[];
}

export interface CanvasReviewerSourceDescriptor {
  readonly id: string;
  readonly type: CanvasReviewerSourceType;
  readonly title: string;
  readonly availability: "available" | "unavailable";
  readonly unavailableReason: string | null;
  readonly updatedAt: string | null;
  readonly estimatedCharacters: number | null;
}

export interface CanvasReviewerSourceListPayload {
  readonly courseId: string;
  readonly courseSync: CanvasReviewerCourseSyncSummary;
  readonly availableSourceCount: number;
  readonly unavailableSourceCount: number;
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
  readonly pagination: {
    readonly limit: number;
    readonly offset: number;
    readonly returned: number;
    readonly hasMore: boolean;
    readonly totalKnown: number;
  };
}

export interface CanvasReviewerSourcePreviewPayload {
  readonly sourceText: string;
  readonly suggestedTitle: string;
  readonly sourceCount: number;
  readonly characterCount: number;
  readonly sources: readonly {
    readonly id: string;
    readonly type: Exclude<CanvasReviewerSourceType, "file">;
    readonly updatedAt: string | null;
  }[];
  readonly courseSync: {
    readonly status: "success" | "partial" | "failed" | "never";
    readonly completedAt: string | null;
  };
  readonly limits: {
    readonly maximumSources: number;
    readonly maximumCharactersPerSource: number;
    readonly maximumCombinedPreviewCharacters: number;
    readonly existingReviewerRequestLimit: number;
    readonly suggestedTitleLimit: number;
  };
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
  | "course_not_found"
  | "course_not_selected"
  | "course_unavailable"
  | "duplicate_course_submission"
  | "duplicate_source_submission"
  | "source_count_exceeded"
  | "source_not_found"
  | "source_preview_too_large"
  | "source_unavailable"
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
  readonly courses: readonly CanvasCourseInventoryItem[];
  readonly selectedCourseIds: readonly string[];
  readonly counts: CanvasCourseInventoryPayload["counts"];
}

interface CapabilitiesSuccessResponse {
  readonly ok: true;
  readonly capabilities: readonly CanvasCapabilitySummary[];
}

interface SyncSuccessResponse extends CanvasSyncSummary {
  readonly ok: true;
}

interface CourseSyncSuccessResponse extends CanvasCourseSyncSummary {
  readonly ok: true;
}

interface CanvasReviewerSourceListSuccessResponse
  extends CanvasReviewerSourceListPayload {
  readonly ok: true;
}

interface CanvasReviewerSourcePreviewSuccessResponse
  extends CanvasReviewerSourcePreviewPayload {
  readonly ok: true;
}

interface CoursePreferencesSuccessResponse {
  readonly ok: true;
  readonly selectedCourseIds: readonly string[];
}

interface CoursePreferencesUpdateSuccessResponse
  extends CoursePreferencesSuccessResponse {
  readonly selectedCount: number;
  readonly deselectedCount: number;
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
): Promise<CanvasApiResult<CanvasCourseInventoryPayload>> {
  const endpoint = createEndpoint(input.apiBaseUrl, COURSES_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseCoursesResponse,
  });
}

export async function getCanvasCoursePreferences(
  input: CanvasApiBaseInput,
): Promise<CanvasApiResult<CanvasCoursePreferencesPayload>> {
  const endpoint = createEndpoint(input.apiBaseUrl, COURSE_PREFERENCES_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseCoursePreferencesResponse,
  });
}

export async function saveCanvasCoursePreferences(
  input: CanvasApiBaseInput & { readonly selectedCourseIds: readonly string[] },
): Promise<CanvasApiResult<UpdateCanvasCoursePreferencesPayload>> {
  const endpoint = createEndpoint(input.apiBaseUrl, COURSE_PREFERENCES_PATH);
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "PUT",
    body: { selectedCourseIds: input.selectedCourseIds },
    parseSuccess: parseCoursePreferencesUpdateResponse,
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

export async function syncCanvasCourse(
  input: CanvasApiBaseInput & { readonly courseId: string },
): Promise<CanvasApiResult<CanvasCourseSyncSummary>> {
  const courseId = input.courseId.trim();
  if (!courseId) {
    return clientError("course_not_found", "Choose a Canvas course to sync.");
  }
  const endpoint = createEndpoint(
    input.apiBaseUrl,
    `/api/canvas/courses/${encodeURIComponent(courseId)}/sync`,
  );
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "POST",
    parseSuccess: parseCourseSyncResponse,
  });
}

export async function listCanvasReviewerSources(
  input: CanvasApiBaseInput & { readonly courseId: string },
): Promise<CanvasApiResult<CanvasReviewerSourceListPayload>> {
  const courseId = input.courseId.trim();
  if (!courseId) {
    return clientError(
      "course_not_found",
      "Choose a selected Canvas course before loading sources.",
    );
  }
  const endpoint = createEndpoint(
    input.apiBaseUrl,
    `/api/canvas/courses/${encodeURIComponent(courseId)}/sources`,
  );
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: parseCanvasReviewerSourceListResponse,
  });
}

export async function previewCanvasReviewerSources(
  input: CanvasApiBaseInput & {
    readonly courseId: string;
    readonly sourceIds: readonly string[];
  },
): Promise<CanvasApiResult<CanvasReviewerSourcePreviewPayload>> {
  const courseId = input.courseId.trim();
  if (!courseId) {
    return clientError(
      "course_not_found",
      "Choose a selected Canvas course before previewing sources.",
    );
  }
  const normalizedIds = input.sourceIds.map((sourceId) => sourceId.trim());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return clientError(
      "duplicate_source_submission",
      "A Canvas source can only be selected once.",
    );
  }

  const endpoint = createEndpoint(
    input.apiBaseUrl,
    `/api/canvas/courses/${encodeURIComponent(courseId)}/sources/preview`,
  );
  if (!endpoint.ok) return endpoint;

  return requestJson({
    endpoint: endpoint.url,
    input,
    method: "POST",
    body: { sourceIds: normalizedIds },
    parseSuccess: parseCanvasReviewerSourcePreviewResponse,
  });
}

export async function syncSelectedCanvasCourses(
  input: SyncSelectedCanvasCoursesInput,
): Promise<CanvasApiResult<CanvasSelectedCourseSyncSummary>> {
  const normalizedIds = input.selectedCourseIds.map((id) => id.trim());
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    return clientError(
      "duplicate_course_submission",
      "A selected course can only be submitted once.",
    );
  }
  const maxConcurrency = normalizeCourseSyncConcurrency(input.maxConcurrency);
  const results: CanvasSelectedCourseSyncItemResult[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < normalizedIds.length) {
      const courseId = normalizedIds[nextIndex] ?? "";
      nextIndex += 1;
      const result = await syncCanvasCourse({ ...input, courseId });
      if (result.ok) {
        results.push({ courseId, ok: true, summary: result.data });
      } else {
        results.push({ courseId, ok: false, error: result.error });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(maxConcurrency, normalizedIds.length) }, () =>
      worker(),
    ),
  );

  results.sort(
    (left, right) =>
      normalizedIds.indexOf(left.courseId) - normalizedIds.indexOf(right.courseId),
  );

  return {
    ok: true,
    data: {
      attempted: normalizedIds.length,
      failed: results.filter(
        (result) => !result.ok || result.summary?.status === "failed",
      ).length,
      partial: results.filter((result) => result.summary?.status === "partial").length,
      results,
      successful: results.filter((result) => result.summary?.status === "success")
        .length,
    },
  };
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
): CanvasApiResult<CanvasCourseInventoryPayload> {
  if (isCoursesSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        courses: parsed.courses,
        counts: parsed.counts,
        selectedCourseIds: parsed.selectedCourseIds,
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid course response.",
  );
}

function parseCoursePreferencesResponse(
  parsed: unknown,
): CanvasApiResult<CanvasCoursePreferencesPayload> {
  if (isCoursePreferencesSuccessResponse(parsed)) {
    return {
      ok: true,
      data: { selectedCourseIds: parsed.selectedCourseIds },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid course preference response.",
  );
}

function parseCoursePreferencesUpdateResponse(
  parsed: unknown,
): CanvasApiResult<UpdateCanvasCoursePreferencesPayload> {
  if (isCoursePreferencesUpdateSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        deselectedCount: parsed.deselectedCount,
        selectedCount: parsed.selectedCount,
        selectedCourseIds: parsed.selectedCourseIds,
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid course preference response.",
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
        files: parsed.files,
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

function parseCourseSyncResponse(
  parsed: unknown,
): CanvasApiResult<CanvasCourseSyncSummary> {
  if (isCourseSyncSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        announcements: parsed.announcements,
        assignmentGroups: parsed.assignmentGroups,
        assignments: parsed.assignments,
        completedAt: parsed.completedAt,
        durationMs: parsed.durationMs,
        fileReferences: parsed.fileReferences,
        files: parsed.files,
        inserted: parsed.inserted,
        moduleItems: parsed.moduleItems,
        modules: parsed.modules,
        pages: parsed.pages,
        pruned: parsed.pruned,
        resources: parsed.resources,
        retryAttempts: parsed.retryAttempts,
        ...(parsed.sanitizedFailures
          ? { sanitizedFailures: parsed.sanitizedFailures }
          : {}),
        startedAt: parsed.startedAt,
        status: parsed.status,
        unchanged: parsed.unchanged,
        updated: parsed.updated,
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid course synchronization response.",
  );
}

function parseCanvasReviewerSourceListResponse(
  parsed: unknown,
): CanvasApiResult<CanvasReviewerSourceListPayload> {
  if (isCanvasReviewerSourceListSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        availableSourceCount: parsed.availableSourceCount,
        courseId: parsed.courseId,
        courseSync: parsed.courseSync,
        pagination: parsed.pagination,
        sources: parsed.sources,
        unavailableSourceCount: parsed.unavailableSourceCount,
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid source list response.",
  );
}

function parseCanvasReviewerSourcePreviewResponse(
  parsed: unknown,
): CanvasApiResult<CanvasReviewerSourcePreviewPayload> {
  if (isCanvasReviewerSourcePreviewSuccessResponse(parsed)) {
    return {
      ok: true,
      data: {
        characterCount: parsed.characterCount,
        courseSync: parsed.courseSync,
        limits: parsed.limits,
        sourceCount: parsed.sourceCount,
        sources: parsed.sources,
        sourceText: parsed.sourceText,
        suggestedTitle: parsed.suggestedTitle,
      },
    };
  }
  return clientError(
    "invalid_response",
    "Canvas returned an invalid source preview response.",
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
    case "canvas_course_not_found":
      return "course_not_found";
    case "canvas_course_not_selected":
      return "course_not_selected";
    case "canvas_course_unavailable":
      return "course_unavailable";
    case "canvas_source_count_exceeded":
      return "source_count_exceeded";
    case "canvas_source_duplicate":
      return "duplicate_source_submission";
    case "canvas_source_not_found":
      return "source_not_found";
    case "canvas_source_preview_too_large":
      return "source_preview_too_large";
    case "canvas_source_unavailable":
      return "source_unavailable";
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

function normalizeCourseSyncConcurrency(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    return SELECTED_COURSE_SYNC_CONCURRENCY;
  }
  return Math.min(value, SELECTED_COURSE_SYNC_CONCURRENCY);
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
    value.courses.every(isCanvasCourseInventoryItem) &&
    Array.isArray(value.selectedCourseIds) &&
    value.selectedCourseIds.every((entry) => typeof entry === "string") &&
    isCourseInventoryCounts(value.counts)
  );
}

function isCoursePreferencesSuccessResponse(
  value: unknown,
): value is CoursePreferencesSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    Array.isArray(value.selectedCourseIds) &&
    value.selectedCourseIds.every((entry) => typeof entry === "string")
  );
}

function isCoursePreferencesUpdateSuccessResponse(
  value: unknown,
): value is CoursePreferencesUpdateSuccessResponse {
  return (
    isCoursePreferencesSuccessResponse(value) &&
    isRecord(value) &&
    isNonNegativeInteger(value.selectedCount) &&
    isNonNegativeInteger(value.deselectedCount)
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
      "files",
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
    isFileSyncCounts(value.files) &&
    isSyncResourceCounts(value.resources) &&
    isNonNegativeInteger(value.retryAttempts) &&
    (value.failures === undefined ||
      (Array.isArray(value.failures) &&
        value.failures.every(isSyncFailureSummary)))
  );
}

function isCourseSyncSuccessResponse(
  value: unknown,
): value is CourseSyncSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    hasOnlyKeys(value, [
      "ok",
      "status",
      "startedAt",
      "completedAt",
      "durationMs",
      "resources",
      "modules",
      "moduleItems",
      "pages",
      "assignmentGroups",
      "assignments",
      "announcements",
      "files",
      "fileReferences",
      "inserted",
      "updated",
      "unchanged",
      "pruned",
      "retryAttempts",
      "sanitizedFailures",
    ]) &&
    isCanvasCourseSyncStatus(value.status) &&
    typeof value.startedAt === "string" &&
    typeof value.completedAt === "string" &&
    isNonNegativeInteger(value.durationMs) &&
    isSyncResourceCounts(value.resources) &&
    isNonNegativeInteger(value.modules) &&
    isNonNegativeInteger(value.moduleItems) &&
    isNonNegativeInteger(value.pages) &&
    isNonNegativeInteger(value.assignmentGroups) &&
    isNonNegativeInteger(value.assignments) &&
    isNonNegativeInteger(value.announcements) &&
    isNonNegativeInteger(value.files) &&
    isNonNegativeInteger(value.fileReferences) &&
    isNonNegativeInteger(value.inserted) &&
    isNonNegativeInteger(value.updated) &&
    isNonNegativeInteger(value.unchanged) &&
    isNonNegativeInteger(value.pruned) &&
    isNonNegativeInteger(value.retryAttempts) &&
    (value.sanitizedFailures === undefined ||
      (Array.isArray(value.sanitizedFailures) &&
        value.sanitizedFailures.every(isSyncFailureSummary)))
  );
}

function isCanvasReviewerSourceListSuccessResponse(
  value: unknown,
): value is CanvasReviewerSourceListSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    hasOnlyKeys(value, [
      "ok",
      "courseId",
      "courseSync",
      "availableSourceCount",
      "unavailableSourceCount",
      "sources",
      "pagination",
    ]) &&
    typeof value.courseId === "string" &&
    isCanvasReviewerCourseSyncSummary(value.courseSync) &&
    isNonNegativeInteger(value.availableSourceCount) &&
    isNonNegativeInteger(value.unavailableSourceCount) &&
    Array.isArray(value.sources) &&
    value.sources.every(isCanvasReviewerSourceDescriptor) &&
    isCanvasSourcePagination(value.pagination)
  );
}

function isCanvasReviewerSourcePreviewSuccessResponse(
  value: unknown,
): value is CanvasReviewerSourcePreviewSuccessResponse {
  return (
    isRecord(value) &&
    value.ok === true &&
    hasOnlyKeys(value, [
      "ok",
      "sourceText",
      "suggestedTitle",
      "sourceCount",
      "characterCount",
      "sources",
      "courseSync",
      "limits",
    ]) &&
    typeof value.sourceText === "string" &&
    typeof value.suggestedTitle === "string" &&
    isNonNegativeInteger(value.sourceCount) &&
    isNonNegativeInteger(value.characterCount) &&
    Array.isArray(value.sources) &&
    value.sources.every(isCanvasPreviewSourceSummary) &&
    isCanvasPreviewCourseSync(value.courseSync) &&
    isCanvasPreviewLimits(value.limits)
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

function isCanvasCourseInventoryItem(
  value: unknown,
): value is CanvasCourseInventoryItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.displayName === "string" &&
    (value.courseCode === null || typeof value.courseCode === "string") &&
    (value.workflowState === null || typeof value.workflowState === "string") &&
    (value.startAt === null || typeof value.startAt === "string") &&
    (value.endAt === null || typeof value.endAt === "string") &&
    (value.term === null || isCanvasCourseInventoryTerm(value.term)) &&
    isCanvasCourseClassification(value.classification) &&
    typeof value.selectable === "boolean" &&
    (value.unavailableReason === null ||
      typeof value.unavailableReason === "string") &&
    typeof value.selected === "boolean" &&
    (value.lastSync === null || isCanvasCourseLastSync(value.lastSync))
  );
}

function isCanvasCourseInventoryTerm(value: unknown): value is NonNullable<CanvasCourseInventoryItem["term"]> {
  return (
    isRecord(value) &&
    (value.id === null || typeof value.id === "string") &&
    (value.name === null || typeof value.name === "string") &&
    (value.startAt === null || typeof value.startAt === "string") &&
    (value.endAt === null || typeof value.endAt === "string")
  );
}

function isCanvasCourseLastSync(
  value: unknown,
): value is NonNullable<CanvasCourseInventoryItem["lastSync"]> {
  return (
    isRecord(value) &&
    (value.status === "running" || isCanvasCourseSyncStatus(value.status)) &&
    (value.startedAt === null || typeof value.startedAt === "string") &&
    (value.completedAt === null || typeof value.completedAt === "string") &&
    (value.lastCheckedAt === null || typeof value.lastCheckedAt === "string") &&
    (value.lastSuccessfulSyncAt === null ||
      typeof value.lastSuccessfulSyncAt === "string") &&
    (value.failureCode === null || typeof value.failureCode === "string")
  );
}

function isCanvasCourseClassification(
  value: unknown,
): value is CanvasCourseClassification {
  return (
    value === "likely_current" ||
    value === "past_or_concluded" ||
    value === "other_or_uncertain" ||
    value === "unavailable"
  );
}

function isCanvasCourseSyncStatus(
  value: unknown,
): value is CanvasCourseSyncStatus {
  return value === "success" || value === "partial" || value === "failed";
}

function isCanvasReviewerCourseSyncStatus(
  value: unknown,
): value is CanvasReviewerCourseSyncSummary["status"] {
  return (
    value === "success" ||
    value === "partial" ||
    value === "failed" ||
    value === "never"
  );
}

function isCanvasReviewerCourseSyncSummary(
  value: unknown,
): value is CanvasReviewerCourseSyncSummary {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "status",
      "completedAt",
      "lastSuccessfulSyncAt",
      "latestResultWasPartial",
      "synchronizedSourcesAvailable",
      "failureCategories",
    ]) &&
    isCanvasReviewerCourseSyncStatus(value.status) &&
    (value.completedAt === null || typeof value.completedAt === "string") &&
    (value.lastSuccessfulSyncAt === null ||
      typeof value.lastSuccessfulSyncAt === "string") &&
    typeof value.latestResultWasPartial === "boolean" &&
    typeof value.synchronizedSourcesAvailable === "boolean" &&
    Array.isArray(value.failureCategories) &&
    value.failureCategories.every((entry) => typeof entry === "string")
  );
}

function isCanvasReviewerSourceDescriptor(
  value: unknown,
): value is CanvasReviewerSourceDescriptor {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "type",
      "title",
      "availability",
      "unavailableReason",
      "updatedAt",
      "estimatedCharacters",
    ]) &&
    typeof value.id === "string" &&
    isCanvasReviewerSourceType(value.type) &&
    typeof value.title === "string" &&
    (value.availability === "available" ||
      value.availability === "unavailable") &&
    (value.unavailableReason === null ||
      typeof value.unavailableReason === "string") &&
    (value.updatedAt === null || typeof value.updatedAt === "string") &&
    (value.estimatedCharacters === null ||
      isNonNegativeInteger(value.estimatedCharacters))
  );
}

function isCanvasSourcePagination(
  value: unknown,
): value is CanvasReviewerSourceListPayload["pagination"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["limit", "offset", "returned", "hasMore", "totalKnown"]) &&
    isNonNegativeInteger(value.limit) &&
    isNonNegativeInteger(value.offset) &&
    isNonNegativeInteger(value.returned) &&
    typeof value.hasMore === "boolean" &&
    isNonNegativeInteger(value.totalKnown)
  );
}

function isCanvasPreviewSourceSummary(
  value: unknown,
): value is CanvasReviewerSourcePreviewPayload["sources"][number] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "type", "updatedAt"]) &&
    typeof value.id === "string" &&
    (value.type === "page" ||
      value.type === "assignment" ||
      value.type === "announcement") &&
    (value.updatedAt === null || typeof value.updatedAt === "string")
  );
}

function isCanvasPreviewCourseSync(
  value: unknown,
): value is CanvasReviewerSourcePreviewPayload["courseSync"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["status", "completedAt"]) &&
    isCanvasReviewerCourseSyncStatus(value.status) &&
    (value.completedAt === null || typeof value.completedAt === "string")
  );
}

function isCanvasPreviewLimits(
  value: unknown,
): value is CanvasReviewerSourcePreviewPayload["limits"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "maximumSources",
      "maximumCharactersPerSource",
      "maximumCombinedPreviewCharacters",
      "existingReviewerRequestLimit",
      "suggestedTitleLimit",
    ]) &&
    isNonNegativeInteger(value.maximumSources) &&
    isNonNegativeInteger(value.maximumCharactersPerSource) &&
    isNonNegativeInteger(value.maximumCombinedPreviewCharacters) &&
    isNonNegativeInteger(value.existingReviewerRequestLimit) &&
    isNonNegativeInteger(value.suggestedTitleLimit) &&
    value.maximumCombinedPreviewCharacters < value.existingReviewerRequestLimit
  );
}

function isCanvasReviewerSourceType(
  value: unknown,
): value is CanvasReviewerSourceType {
  return (
    value === "page" ||
    value === "assignment" ||
    value === "announcement" ||
    value === "file"
  );
}

function isCourseInventoryCounts(
  value: unknown,
): value is CanvasCourseInventoryPayload["counts"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "total",
      "likelyCurrent",
      "pastOrConcluded",
      "otherOrUncertain",
      "unavailable",
    ]) &&
    isNonNegativeInteger(value.total) &&
    isNonNegativeInteger(value.likelyCurrent) &&
    isNonNegativeInteger(value.pastOrConcluded) &&
    isNonNegativeInteger(value.otherOrUncertain) &&
    isNonNegativeInteger(value.unavailable)
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

function isFileSyncCounts(
  value: unknown,
): value is CanvasSyncSummary["files"] {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "coursesSucceeded",
      "coursesFailed",
      "discovered",
      "inserted",
      "updated",
      "unchanged",
      "deactivated",
      "references",
      "referencesInserted",
      "referencesDeleted",
      "moduleFileReferences",
      "htmlFileReferences",
      "metadataOnly",
      "blocked",
    ]) &&
    isNonNegativeInteger(value.coursesSucceeded) &&
    isNonNegativeInteger(value.coursesFailed) &&
    isNonNegativeInteger(value.discovered) &&
    isNonNegativeInteger(value.inserted) &&
    isNonNegativeInteger(value.updated) &&
    isNonNegativeInteger(value.unchanged) &&
    isNonNegativeInteger(value.deactivated) &&
    isNonNegativeInteger(value.references) &&
    isNonNegativeInteger(value.referencesInserted) &&
    isNonNegativeInteger(value.referencesDeleted) &&
    isNonNegativeInteger(value.moduleFileReferences) &&
    isNonNegativeInteger(value.htmlFileReferences) &&
    isNonNegativeInteger(value.metadataOnly) &&
    isNonNegativeInteger(value.blocked)
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
      "files",
      "fileReferences",
    ]) &&
    isNonNegativeInteger(value.modules) &&
    isNonNegativeInteger(value.moduleItems) &&
    isNonNegativeInteger(value.pages) &&
    isNonNegativeInteger(value.assignmentGroups) &&
    isNonNegativeInteger(value.assignments) &&
    isNonNegativeInteger(value.plannerItems) &&
    isNonNegativeInteger(value.announcements) &&
    isNonNegativeInteger(value.files) &&
    isNonNegativeInteger(value.fileReferences)
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
