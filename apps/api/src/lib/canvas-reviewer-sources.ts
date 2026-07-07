import type {
  CanvasAnnouncementRow,
  CanvasAssignmentRow,
  CanvasConnectionRow,
  CanvasCourseRow,
  CanvasCourseSyncPreferenceRow,
  CanvasCourseSyncStateRow,
  CanvasFileRow,
  CanvasPageRow,
  CanvasSyncCourseResultRow,
  CanvasSyncRunRow,
  Database,
} from "@stay-focused/db";
import type { OcrProvider } from "@stay-focused/ocr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseFragment,
  type DefaultTreeAdapterMap,
} from "parse5";

import { ingestCanvasFiles } from "@/lib/canvas-file-ingestion";
import {
  CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST,
  normalizeMimeType,
} from "@/lib/canvas-file-policy";
import { readConnection } from "@/lib/canvas-routes";
import {
  classifyStoredCanvasFileKind,
  extractPreparedCanvasFileText,
  isPreparedCanvasFileReadyForOcr,
  type CanvasStoredFileKind,
} from "@/lib/canvas-stored-file-extraction";
import {
  sanitizeCanvasPreviewText,
  sanitizeCanvasTitleText,
} from "@/lib/canvas-source-safety";
import { createServerOcrProvider } from "@/lib/ocr/create-server-ocr-provider";
import { OCR_MAX_IMAGE_BYTES, OCR_MAX_PDF_BYTES } from "@/lib/ocr/upload-policy";
import { REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS } from "@/lib/reviewer-generation-limits";
import {
  CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
  CANVAS_STORED_FILE_EXTRACTION_VERSION,
  CANVAS_STORED_IMAGE_OCR_VERSION,
  CANVAS_STORED_PDF_OCR_VERSION,
  createCanvasSourcePreviewSession,
  sha256Utf8Hex,
  type CanvasSourceManifestItem,
} from "@/lib/reviewer-source-provenance";
import type {
  CanvasApiErrorCode,
  CanvasFileIngestionResultStatus,
} from "@/types/canvas";

export const CANVAS_REVIEWER_MAX_SOURCES = 8;
export const CANVAS_REVIEWER_MAX_OCR_FILES = 1;
export const CANVAS_REVIEWER_MAX_SOURCE_CHARS = 20_000;
export const CANVAS_REVIEWER_MAX_COMBINED_CHARS = 90_000;
export const CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS = 120;
export const CANVAS_REVIEWER_SOURCE_LIST_LIMIT = 100;
export const CANVAS_REVIEWER_SOURCE_LIST_MAX_OFFSET = 1_000;
export const CANVAS_REVIEWER_SOURCE_LIST_FETCH_LIMIT_PER_TYPE = 150;
export const CANVAS_REVIEWER_EXISTING_GENERATE_LIMIT =
  REVIEWER_GENERATE_MAX_SOURCE_TEXT_CHARS;

const SOURCE_TYPE_ORDER = new Map<CanvasReviewerSourceType, number>([
  ["page", 0],
  ["assignment", 1],
  ["announcement", 2],
  ["file", 3],
]);
const COURSE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,name,course_code,workflow_state,enrollment_term_id,account_id,start_at,end_at,time_zone,public_syllabus,syllabus_body,canvas_updated_at,first_synced_at,last_synced_at,created_at,updated_at";
const PREFERENCE_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,selected,display_order,selected_at,created_at,updated_at";
const SYNC_RUN_COLUMNS =
  "id,user_id,canvas_connection_id,scope_course_id,sync_mode,status,started_at,completed_at,heartbeat_at,discovered_course_count,successful_course_count,failed_course_count,resource_counts,failure_code,failure_summary,created_at,updated_at";
const SYNC_STATE_COLUMNS =
  "id,user_id,canvas_connection_id,canvas_course_id,course_id,snapshot_fingerprint,fingerprint_version,last_checked_at,last_changed_at,last_successful_sync_at,consecutive_failure_count,last_failure_code,created_at,updated_at";
const COURSE_RESULT_COLUMNS =
  "id,sync_run_id,user_id,canvas_connection_id,course_fingerprint,status,failure_code,failed_operation,failure_category,http_status_class,retryable,retry_count,duration_ms,created_at,updated_at";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlTextNode = DefaultTreeAdapterMap["textNode"];

export type CanvasReviewerSourceType =
  | "page"
  | "assignment"
  | "announcement"
  | "file";

export type CanvasReviewerSourceAvailability = "available" | "unavailable";

export type CanvasReviewerFilePreparationStatus =
  | "ready"
  | "not_prepared"
  | "failed"
  | "blocked"
  | "unsupported"
  | "unavailable";

export interface CanvasReviewerFileState {
  readonly kind: CanvasStoredFileKind;
  readonly preparationStatus: CanvasReviewerFilePreparationStatus;
  readonly canPrepare: boolean;
}

export interface CanvasReviewerSourceDescriptor {
  readonly id: string;
  readonly type: CanvasReviewerSourceType;
  readonly title: string;
  readonly availability: CanvasReviewerSourceAvailability;
  readonly unavailableReason: string | null;
  readonly updatedAt: string | null;
  readonly estimatedCharacters: number | null;
  readonly file: CanvasReviewerFileState | null;
}

export interface CanvasReviewerCourseSyncSummary {
  readonly status: "success" | "partial" | "failed" | "never";
  readonly completedAt: string | null;
  readonly lastSuccessfulSyncAt: string | null;
  readonly latestResultWasPartial: boolean;
  readonly synchronizedSourcesAvailable: boolean;
  readonly failureCategories: readonly string[];
}

export interface CanvasReviewerSourceList {
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

export interface CanvasReviewerSourcePreview {
  readonly previewSessionId: string;
  readonly sourceText: string;
  readonly suggestedTitle: string;
  readonly sourceCount: number;
  readonly characterCount: number;
  readonly sources: readonly {
    readonly id: string;
    readonly type: CanvasReviewerSourceType;
    readonly updatedAt: string | null;
    readonly fileKind?: Exclude<CanvasStoredFileKind, "unsupported">;
    readonly pageCount?: number;
  }[];
  readonly courseSync: {
    readonly status: "success" | "partial" | "failed" | "never";
    readonly completedAt: string | null;
  };
  readonly limits: CanvasReviewerSourceLimits;
}

export interface CanvasReviewerSourceLimits {
  readonly maximumSources: number;
  readonly maximumCharactersPerSource: number;
  readonly maximumCombinedPreviewCharacters: number;
  readonly maximumOcrFilesPerPreview: number;
  readonly existingReviewerRequestLimit: number;
  readonly suggestedTitleLimit: number;
}

export interface CanvasReviewerSourcePrepare {
  readonly requested: number;
  readonly results: readonly {
    readonly id: string;
    readonly status: "ready" | "failed" | "blocked" | "unsupported" | "unavailable";
    readonly code: string;
    readonly retryable: boolean;
  }[];
  readonly sources: readonly CanvasReviewerSourceDescriptor[];
}

export interface CanvasReviewerSourceListOptions {
  readonly limit?: number;
  readonly offset?: number;
}

export type CanvasReviewerSourceResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500 | 502;
      readonly code: CanvasApiErrorCode;
      readonly message: string;
      readonly details?: {
        readonly selectedSourceCount?: number;
        readonly maximumSourceCount?: number;
        readonly combinedCharacterCount?: number;
        readonly allowedMaximum?: number;
      };
    };

interface StoredSelectedCanvasCourse {
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
  readonly preference: CanvasCourseSyncPreferenceRow;
  readonly latestRun: CanvasSyncRunRow | null;
  readonly latestCourseResult: CanvasSyncCourseResultRow | null;
  readonly syncState: CanvasCourseSyncStateRow | null;
}

interface NormalizedSourceRecord {
  readonly descriptor: CanvasReviewerSourceDescriptor;
  readonly text: string | null;
  readonly provenance?: CanvasSourceManifestItemBase;
}

export interface PreviewSourceRecord {
  readonly descriptor: CanvasReviewerSourceDescriptor;
  readonly text: string;
  readonly provenance: CanvasSourceManifestItemBase;
  readonly fileMetadata?: {
    readonly fileKind: Exclude<CanvasStoredFileKind, "unsupported">;
    readonly pageCount?: number;
  };
}

type CanvasSourceManifestItemBase = Omit<CanvasSourceManifestItem, "ordinal">;

export function getCanvasReviewerSourceLimits(): CanvasReviewerSourceLimits {
  return {
    existingReviewerRequestLimit: CANVAS_REVIEWER_EXISTING_GENERATE_LIMIT,
    maximumCharactersPerSource: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
    maximumCombinedPreviewCharacters: CANVAS_REVIEWER_MAX_COMBINED_CHARS,
    maximumOcrFilesPerPreview: CANVAS_REVIEWER_MAX_OCR_FILES,
    maximumSources: CANVAS_REVIEWER_MAX_SOURCES,
    suggestedTitleLimit: CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
  };
}

export async function listCanvasReviewerSources({
  client,
  courseId,
  limit,
  offset,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<CanvasReviewerSourceList>> {
  const course = await loadStoredSelectedCanvasCourse({
    client,
    courseId,
    userId,
  });
  if (!course.ok) {
    return course;
  }

  const sources = await loadCourseSourceDescriptors({
    client,
    course: course.value.course,
    connection: course.value.connection,
    userId,
  });
  if (!sources.ok) {
    return sources;
  }

  const ordered = sources.value.map((source) => source.descriptor).sort(compareSources);
  const normalizedLimit = normalizeListLimit(limit);
  const normalizedOffset = normalizeListOffset(offset);
  const page = ordered.slice(normalizedOffset, normalizedOffset + normalizedLimit);
  const availableSourceCount = ordered.filter(
    (source) => source.availability === "available",
  ).length;
  const unavailableSourceCount = ordered.length - availableSourceCount;

  return {
    ok: true,
    value: {
      availableSourceCount,
      courseId: course.value.course.id,
      courseSync: createCourseSyncSummary({
        ...course.value,
        synchronizedSourcesAvailable: availableSourceCount > 0,
      }),
      pagination: {
        hasMore: normalizedOffset + normalizedLimit < ordered.length,
        limit: normalizedLimit,
        offset: normalizedOffset,
        returned: page.length,
        totalKnown: ordered.length,
      },
      sources: page,
      unavailableSourceCount,
    },
  };
}

export async function previewCanvasReviewerSources({
  client,
  courseId,
  ocrProvider,
  sourceIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly ocrProvider?: OcrProvider;
  readonly sourceIds: readonly string[];
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<CanvasReviewerSourcePreview>> {
  const normalizedIds = normalizeSourceIds(sourceIds);
  if (!normalizedIds.ok) {
    return normalizedIds;
  }
  const ocrFileCount = normalizedIds.value.filter(
    (source) => source.type === "file",
  ).length;
  if (ocrFileCount > CANVAS_REVIEWER_MAX_OCR_FILES) {
    return {
      ok: false,
      status: 400,
      code: "canvas_source_ocr_file_limit_exceeded",
      details: {
        maximumSourceCount: CANVAS_REVIEWER_MAX_OCR_FILES,
        selectedSourceCount: ocrFileCount,
      },
      message: "You can use one PDF or image per reviewer preview.",
    };
  }

  const course = await loadStoredSelectedCanvasCourse({
    client,
    courseId,
    userId,
  });
  if (!course.ok) {
    return course;
  }

  const sources = await loadPreviewSourceRecords({
    client,
    course: course.value.course,
    connection: course.value.connection,
    ocrProvider,
    parsedIds: normalizedIds.value,
    userId,
  });
  if (!sources.ok) {
    return sources;
  }

  const byId = new Map(sources.value.map((source) => [source.descriptor.id, source]));
  const ordered = normalizedIds.value.map((sourceId) => byId.get(sourceId.original));

  if (ordered.some((source) => source === undefined)) {
    return {
      ok: false,
      status: 404,
      code: "canvas_source_not_found",
      message: "One or more selected Canvas sources were not found for this course.",
    };
  }

  const previewSources = ordered.filter(isDefined);
  const overPerSource = previewSources.find(
    (source) => source.text.length > CANVAS_REVIEWER_MAX_SOURCE_CHARS,
  );
  if (overPerSource) {
    return {
      ok: false,
      status: 413,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
        combinedCharacterCount: overPerSource.text.length,
        selectedSourceCount: previewSources.length,
      },
      message:
        "One selected Canvas source is too large. Select fewer or smaller sources.",
    };
  }

  const sourceText = assembleCanvasSourcePreview(previewSources);
  if (sourceText.length > CANVAS_REVIEWER_MAX_COMBINED_CHARS) {
    return {
      ok: false,
      status: 413,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_COMBINED_CHARS,
        combinedCharacterCount: sourceText.length,
        selectedSourceCount: previewSources.length,
      },
      message:
        "Selected Canvas sources are too large together. Select fewer or smaller sources.",
    };
  }

  const suggestedTitle = buildSuggestedCanvasReviewerTitle(course.value.course.name);
  const manifest = previewSources.map((source, index) => ({
    ordinal: index + 1,
    ...source.provenance,
  }));
  const previewSession = await createCanvasSourcePreviewSession({
    canvasConnectionId: course.value.connection.id,
    client,
    courseId: course.value.course.id,
    manifest,
    originalPreviewText: sourceText,
    suggestedTitle,
    userId,
  });
  if (!previewSession.ok) {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "Canvas source preview provenance could not be stored.",
    };
  }

  const courseSync = createCourseSyncSummary({
    ...course.value,
    synchronizedSourcesAvailable: true,
  });

  return {
    ok: true,
    value: {
      characterCount: sourceText.length,
      courseSync: {
        completedAt: courseSync.completedAt,
        status: courseSync.status,
      },
      limits: getCanvasReviewerSourceLimits(),
      previewSessionId: previewSession.value.previewSessionId,
      sourceCount: previewSources.length,
      sources: previewSources.map((source) => ({
        id: source.descriptor.id,
        ...(source.fileMetadata?.fileKind
          ? { fileKind: source.fileMetadata.fileKind }
          : {}),
        ...(typeof source.fileMetadata?.pageCount === "number"
          ? { pageCount: source.fileMetadata.pageCount }
          : {}),
        type: source.descriptor.type,
        updatedAt: source.descriptor.updatedAt,
      })),
      sourceText,
      suggestedTitle,
    },
  };
}

export async function prepareCanvasReviewerSources({
  client,
  courseId,
  sourceIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly sourceIds: readonly string[];
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<CanvasReviewerSourcePrepare>> {
  const normalizedIds = normalizeSourceIds(sourceIds);
  if (!normalizedIds.ok) {
    return normalizedIds;
  }
  if (normalizedIds.value.length > CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST) {
    return {
      ok: false,
      status: 413,
      code: "payload_too_large",
      message: `Prepare 1 to ${CANVAS_FILE_MAX_FILES_PER_INGESTION_REQUEST} Canvas files at a time.`,
    };
  }
  if (normalizedIds.value.some((source) => source.type !== "file")) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Only Canvas file source IDs can be prepared.",
    };
  }

  const course = await loadStoredSelectedCanvasCourse({
    client,
    courseId,
    userId,
  });
  if (!course.ok) {
    return course;
  }

  const fileIds = normalizedIds.value.map((source) => source.rowId);
  const files = await readFilesByIds({
    client,
    connectionId: course.value.connection.id,
    courseId: course.value.course.id,
    ids: fileIds,
    userId,
  });
  if (!files.ok) {
    return storageFailure("Canvas files could not be loaded for preparation.");
  }
  if (files.value.length !== fileIds.length) {
    return {
      ok: false,
      status: 404,
      code: "canvas_file_not_found",
      message: "One or more Canvas files were not found for this course.",
    };
  }

  const unsupported = files.value.find(
    (file) => !isSupportedFileForSourcePreparation(file),
  );
  if (unsupported) {
    const descriptor = mapFileSource(unsupported).descriptor;
    return {
      ok: false,
      status: 400,
      code:
        descriptor.file?.preparationStatus === "unavailable"
          ? "canvas_source_unavailable"
          : "canvas_source_unsupported_file_type",
      message:
        descriptor.unavailableReason ??
        "This Canvas file type is not supported yet.",
    };
  }

  const ingestion = await ingestCanvasFiles({
    client,
    fileIds,
    userId,
  });
  if (!ingestion.ok) {
    return {
      ok: false,
      status: ingestion.status,
      code: ingestion.code,
      message: ingestion.message,
    };
  }

  const refreshed = await readFilesByIds({
    client,
    connectionId: course.value.connection.id,
    courseId: course.value.course.id,
    ids: fileIds,
    userId,
  });
  if (!refreshed.ok) {
    return storageFailure("Prepared Canvas file descriptors could not be loaded.");
  }

  const descriptorsById = new Map(
    refreshed.value.map((file) => [formatSourceId("file", file.id), mapFileSource(file).descriptor]),
  );

  return {
    ok: true,
    value: {
      requested: normalizedIds.value.length,
      results: ingestion.response.results.map((result) => ({
        code: safePreparationResultCode(result.code),
        id: formatSourceId("file", result.fileId),
        retryable: result.retryable,
        status: preparationResultStatus(result.status),
      })),
      sources: normalizedIds.value
        .map((source) => descriptorsById.get(source.original))
        .filter(isDefined),
    },
  };
}

export function normalizeCanvasHtmlToText(html: string | null): string {
  if (!html?.trim()) {
    return "";
  }

  const fragment = parseFragment(html);
  const writer = createTextWriter();
  walkHtmlChildren(fragment.childNodes, writer, { orderedListStack: [] });
  return sanitizeCanvasPreviewText(writer.toString());
}

export function assembleCanvasSourcePreview(
  sources: readonly PreviewSourceRecord[],
): string {
  return sources
    .map((source, index) => {
      const sourceNumber = index + 1;
      const label = formatPreviewSourceLabel(source).toUpperCase();
      return [
        `SOURCE ${sourceNumber} - ${label} - ${source.descriptor.title}`,
        "",
        source.text,
      ].join("\n");
    })
    .join("\n\n");
}

function formatPreviewSourceLabel(source: PreviewSourceRecord): string {
  if (source.descriptor.type === "file") {
    const kind = source.fileMetadata?.fileKind ?? source.descriptor.file?.kind;
    if (kind === "pdf") {
      return "PDF";
    }
    if (kind === "image") {
      return "Image";
    }
  }
  return formatSourceType(source.descriptor.type);
}

export function buildSuggestedCanvasReviewerTitle(courseName: string): string {
  const safeCourseName = sanitizeCanvasTitleText(courseName);
  if (!safeCourseName) {
    return "Canvas Reviewer";
  }

  const suffix = " - Canvas Reviewer";
  const maximumCourseNameLength =
    CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS - suffix.length;
  return `${truncateAtWordBoundary(safeCourseName, maximumCourseNameLength)}${suffix}`;
}

function createCourseSyncSummary({
  latestCourseResult,
  latestRun,
  syncState,
  synchronizedSourcesAvailable,
}: StoredSelectedCanvasCourse & {
  readonly synchronizedSourcesAvailable: boolean;
}): CanvasReviewerCourseSyncSummary {
  const runStatus =
    latestRun?.status === "succeeded"
      ? "success"
      : latestRun?.status === "partial" || latestRun?.status === "failed"
        ? latestRun.status
        : null;
  const stateStatus =
    syncState === null
      ? null
      : syncState.consecutive_failure_count > 0 && syncState.last_failure_code
        ? "failed"
        : "success";
  const status = runStatus ?? stateStatus ?? "never";
  const failureCategories = collectFailureCategories({
    latestCourseResult,
    latestRun,
    syncState,
  });

  return {
    completedAt: latestRun?.completed_at ?? syncState?.last_checked_at ?? null,
    failureCategories,
    latestResultWasPartial: status === "partial",
    lastSuccessfulSyncAt: syncState?.last_successful_sync_at ?? null,
    status,
    synchronizedSourcesAvailable,
  };
}

async function loadStoredSelectedCanvasCourse({
  client,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<StoredSelectedCanvasCourse>> {
  if (!isUuid(courseId.trim())) {
    return {
      ok: false,
      status: 404,
      code: "canvas_course_not_found",
      message: "Canvas course was not found for this connection.",
    };
  }

  const connection = await readConnection(client, userId);
  if (!connection.ok) {
    return storageFailure("Canvas connection could not be loaded.");
  }
  if (!connection.row) {
    return {
      ok: false,
      status: 404,
      code: "canvas_connection_missing",
      message: "Connect Canvas before selecting Canvas sources.",
    };
  }

  const course = await readCourseRow({
    client,
    connectionId: connection.row.id,
    courseId: courseId.trim(),
    userId,
  });
  if (!course.ok) {
    return storageFailure("Canvas course could not be loaded.");
  }
  if (!course.value) {
    return {
      ok: false,
      status: 404,
      code: "canvas_course_not_found",
      message: "Canvas course was not found for this connection.",
    };
  }

  const preference = await readSelectedCoursePreference({
    client,
    connectionId: connection.row.id,
    courseId: course.value.id,
    userId,
  });
  if (!preference.ok) {
    return storageFailure("Canvas course selection could not be loaded.");
  }
  if (!preference.value) {
    return {
      ok: false,
      status: 400,
      code: "canvas_course_not_selected",
      message: "Select this Canvas course before selecting sources.",
    };
  }

  const [latestRun, syncState] = await Promise.all([
    readLatestCourseSyncRun({
      client,
      connectionId: connection.row.id,
      courseId: course.value.id,
      userId,
    }),
    readCourseSyncState({
      client,
      connectionId: connection.row.id,
      course: course.value,
      userId,
    }),
  ]);
  if (!latestRun.ok || !syncState.ok) {
    return storageFailure("Canvas course synchronization state could not be loaded.");
  }

  const latestCourseResult = latestRun.value
    ? await readLatestCourseResult({
        client,
        connectionId: connection.row.id,
        syncRunId: latestRun.value.id,
        userId,
      })
    : ({ ok: true, value: null } as const);
  if (!latestCourseResult.ok) {
    return storageFailure("Canvas course synchronization state could not be loaded.");
  }

  return {
    ok: true,
    value: {
      connection: connection.row,
      course: course.value,
      latestCourseResult: latestCourseResult.value,
      latestRun: latestRun.value,
      preference: preference.value,
      syncState: syncState.value,
    },
  };
}

async function loadCourseSourceDescriptors({
  client,
  connection,
  course,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<readonly NormalizedSourceRecord[]>> {
  const [pages, assignments, announcements, files] = await Promise.all([
    readPages({ client, connectionId: connection.id, courseId: course.id, userId }),
    readAssignments({
      client,
      connectionId: connection.id,
      courseId: course.id,
      userId,
    }),
    readAnnouncements({
      client,
      connectionId: connection.id,
      courseId: course.id,
      userId,
    }),
    readFiles({ client, connectionId: connection.id, courseId: course.id, userId }),
  ]);

  if (!pages.ok || !assignments.ok || !announcements.ok || !files.ok) {
    return storageFailure("Canvas sources could not be loaded.");
  }

  return {
    ok: true,
    value: [
      ...pages.value.map(mapPageSource),
      ...assignments.value.map(mapAssignmentSource),
      ...announcements.value.map(mapAnnouncementSource),
      ...files.value.map(mapFileSource),
    ],
  };
}

async function loadPreviewSourceRecords({
  client,
  connection,
  course,
  ocrProvider,
  parsedIds,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
  readonly ocrProvider?: OcrProvider;
  readonly parsedIds: readonly ParsedCanvasSourceId[];
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<readonly PreviewSourceRecord[]>> {
  const pageIds = parsedIds
    .filter((source) => source.type === "page")
    .map((source) => source.rowId);
  const assignmentIds = parsedIds
    .filter((source) => source.type === "assignment")
    .map((source) => source.rowId);
  const announcementIds = parsedIds
    .filter((source) => source.type === "announcement")
    .map((source) => source.rowId);
  const fileIds = parsedIds
    .filter((source) => source.type === "file")
    .map((source) => source.rowId);

  const [pages, assignments, announcements, files] = await Promise.all([
    readPagesByIds({
      client,
      connectionId: connection.id,
      courseId: course.id,
      ids: pageIds,
      userId,
    }),
    readAssignmentsByIds({
      client,
      connectionId: connection.id,
      courseId: course.id,
      ids: assignmentIds,
      userId,
    }),
    readAnnouncementsByIds({
      client,
      connectionId: connection.id,
      courseId: course.id,
      ids: announcementIds,
      userId,
    }),
    readFilesByIds({
      client,
      connectionId: connection.id,
      courseId: course.id,
      ids: fileIds,
      userId,
    }),
  ]);
  if (!pages.ok || !assignments.ok || !announcements.ok || !files.ok) {
    return storageFailure("Canvas source preview could not be loaded.");
  }

  const normalized = [
    ...pages.value.map((row) => mapPagePreviewSource(row, course)),
    ...assignments.value.map((row) => mapAssignmentPreviewSource(row, course)),
    ...announcements.value.map((row) =>
      mapAnnouncementPreviewSource(row, course),
    ),
    ...files.value.map(mapFileSource),
  ];
  const loadedIds = new Set(normalized.map((source) => source.descriptor.id));
  if (parsedIds.some((source) => !loadedIds.has(source.original))) {
    return {
      ok: false,
      status: 404,
      code: "canvas_source_not_found",
      message: "One or more selected Canvas sources were not found for this course.",
    };
  }

  const unavailable = normalized.find(
    (source) =>
      source.descriptor.availability !== "available" ||
      (source.descriptor.type !== "file" && source.text === null),
  );
  if (unavailable) {
    if (unavailable.descriptor.type === "file") {
      return fileUnavailablePreviewResult(unavailable.descriptor);
    }
    return {
      ok: false,
      status: 400,
      code: "canvas_source_unavailable",
      message: "One or more selected Canvas sources do not have readable text.",
    };
  }

  const selectedFile = files.value[0] ?? null;
  const filePreviewRecord = selectedFile
    ? await extractFilePreviewRecord({
        client,
        connection,
        course,
        file: selectedFile,
        ocrProvider,
        userId,
      })
    : null;
  if (filePreviewRecord && !filePreviewRecord.ok) {
    return filePreviewRecord;
  }

  const missingTextProvenance = normalized.find(
    (source) => source.descriptor.type !== "file" && !source.provenance,
  );
  if (missingTextProvenance) {
    return storageFailure("Canvas source preview provenance could not be built.");
  }

  const fileRecordById = new Map(
    filePreviewRecord?.value
      ? [[filePreviewRecord.value.descriptor.id, filePreviewRecord.value]]
      : [],
  );

  return {
    ok: true,
    value: normalized.map((source) => {
      if (source.descriptor.type === "file") {
        const fileRecord = fileRecordById.get(source.descriptor.id);
        if (fileRecord) {
          return fileRecord;
        }
      }
      return {
        descriptor: source.descriptor,
        provenance: source.provenance as CanvasSourceManifestItemBase,
        text: source.text ?? "",
      };
    }),
  };
}

async function extractFilePreviewRecord({
  client,
  connection,
  course,
  file,
  ocrProvider,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connection: CanvasConnectionRow;
  readonly course: CanvasCourseRow;
  readonly file: CanvasFileRow;
  readonly ocrProvider?: OcrProvider;
  readonly userId: string;
}): Promise<CanvasReviewerSourceResult<PreviewSourceRecord>> {
  const descriptor = mapFileSource(file).descriptor;
  const provider = ocrProvider
    ? ({ ok: true, value: ocrProvider } as const)
    : createOcrProviderForCanvasPreview();
  if (!provider.ok) {
    return provider;
  }

  const extraction = await extractPreparedCanvasFileText({
    client,
    connectionId: connection.id,
    courseId: course.id,
    fileRow: file,
    ocrProvider: provider.value,
    userId,
  });
  if (!extraction.ok) {
    return extraction;
  }

  return {
    ok: true,
    value: {
      descriptor,
      fileMetadata: {
        fileKind: extraction.value.fileKind,
        ...(typeof extraction.value.pageCount === "number"
          ? { pageCount: extraction.value.pageCount }
          : {}),
      },
      provenance: createFileSourceProvenance({
        course,
        descriptor,
        extraction: extraction.value,
        row: file,
      }),
      text: extraction.value.text,
    },
  };
}

function createOcrProviderForCanvasPreview(): CanvasReviewerSourceResult<OcrProvider> {
  try {
    return { ok: true, value: createServerOcrProvider() };
  } catch {
    return {
      ok: false,
      status: 500,
      code: "canvas_source_ocr_not_configured",
      message: "OCR provider is not configured.",
    };
  }
}

function fileUnavailablePreviewResult(
  descriptor: CanvasReviewerSourceDescriptor,
): CanvasReviewerSourceResult<never> {
  const status = descriptor.file?.preparationStatus;
  if (status === "not_prepared" || status === "failed") {
    return {
      ok: false,
      status: 409,
      code: "canvas_source_file_preparation_required",
      message: "Prepare this Canvas file before previewing it.",
    };
  }
  if (status === "unsupported") {
    return {
      ok: false,
      status: 400,
      code: "canvas_source_unsupported_file_type",
      message: "This Canvas file type is not supported yet.",
    };
  }
  return {
    ok: false,
    status: 400,
    code: "canvas_source_unavailable",
    message: descriptor.unavailableReason ?? "This Canvas file is unavailable.",
  };
}

function mapPageSource(row: CanvasPageRow): NormalizedSourceRecord {
  const text = normalizeCanvasHtmlToText(row.body_html);
  return {
    descriptor: {
      availability: text.length > 0 ? "available" : "unavailable",
      estimatedCharacters: text.length > 0 ? text.length : null,
      file: null,
      id: formatSourceId("page", row.id),
      title: sanitizeCanvasTitleText(row.title) || "Untitled Page",
      type: "page",
      unavailableReason:
        text.length > 0 ? null : "This Page does not have readable body text.",
      updatedAt: row.canvas_updated_at ?? row.last_synced_at ?? row.updated_at,
    },
    text: text.length > 0 ? text : null,
  };
}

function mapPagePreviewSource(
  row: CanvasPageRow,
  course: CanvasCourseRow,
): NormalizedSourceRecord {
  const source = mapPageSource(row);
  if (!source.text) {
    return source;
  }
  return {
    ...source,
    provenance: createHtmlSourceProvenance({
      canvasSourceObjectId: row.canvas_page_id ?? row.canvas_page_url,
      canvasUpdatedAt: row.canvas_updated_at,
      course,
      descriptor: source.descriptor,
      localSyncedAt: row.last_synced_at,
      rowId: row.id,
      sourceType: "page",
      text: source.text,
    }),
  };
}

function mapAssignmentSource(row: CanvasAssignmentRow): NormalizedSourceRecord {
  const text = normalizeCanvasHtmlToText(row.description_html);
  return {
    descriptor: {
      availability: text.length > 0 ? "available" : "unavailable",
      estimatedCharacters: text.length > 0 ? text.length : null,
      file: null,
      id: formatSourceId("assignment", row.id),
      title: sanitizeCanvasTitleText(row.name) || "Untitled Assignment",
      type: "assignment",
      unavailableReason:
        text.length > 0
          ? null
          : "This assignment does not have readable description text.",
      updatedAt: row.canvas_updated_at ?? row.last_synced_at ?? row.updated_at,
    },
    text: text.length > 0 ? text : null,
  };
}

function mapAssignmentPreviewSource(
  row: CanvasAssignmentRow,
  course: CanvasCourseRow,
): NormalizedSourceRecord {
  const source = mapAssignmentSource(row);
  if (!source.text) {
    return source;
  }
  return {
    ...source,
    provenance: createHtmlSourceProvenance({
      canvasSourceObjectId: row.canvas_assignment_id,
      canvasUpdatedAt: row.canvas_updated_at,
      course,
      descriptor: source.descriptor,
      localSyncedAt: row.last_synced_at,
      rowId: row.id,
      sourceType: "assignment",
      text: source.text,
    }),
  };
}

function mapAnnouncementSource(row: CanvasAnnouncementRow): NormalizedSourceRecord {
  const text = normalizeCanvasHtmlToText(row.message_html);
  return {
    descriptor: {
      availability: text.length > 0 ? "available" : "unavailable",
      estimatedCharacters: text.length > 0 ? text.length : null,
      file: null,
      id: formatSourceId("announcement", row.id),
      title: sanitizeCanvasTitleText(row.title) || "Untitled Announcement",
      type: "announcement",
      unavailableReason:
        text.length > 0
          ? null
          : "This announcement does not have readable message text.",
      updatedAt: row.posted_at ?? row.last_synced_at ?? row.updated_at,
    },
    text: text.length > 0 ? text : null,
  };
}

function mapAnnouncementPreviewSource(
  row: CanvasAnnouncementRow,
  course: CanvasCourseRow,
): NormalizedSourceRecord {
  const source = mapAnnouncementSource(row);
  if (!source.text) {
    return source;
  }
  return {
    ...source,
    provenance: createHtmlSourceProvenance({
      canvasSourceObjectId: row.canvas_announcement_id,
      canvasUpdatedAt: row.posted_at,
      course,
      descriptor: source.descriptor,
      localSyncedAt: row.last_synced_at,
      rowId: row.id,
      sourceType: "announcement",
      text: source.text,
    }),
  };
}

function mapFileSource(row: CanvasFileRow): NormalizedSourceRecord {
  const file = buildCanvasReviewerFileState(row);
  const isReady = file.preparationStatus === "ready";
  return {
    descriptor: {
      availability: isReady ? "available" : "unavailable",
      estimatedCharacters: null,
      file,
      id: formatSourceId("file", row.id),
      title: sanitizeCanvasTitleText(row.display_name) || "Canvas file",
      type: "file",
      unavailableReason: isReady ? null : unavailableReasonForFile(row, file),
      updatedAt:
        row.canvas_modified_at ??
        row.canvas_updated_at ??
        row.last_synced_at ??
        row.updated_at,
    },
    text: null,
  };
}

function createHtmlSourceProvenance({
  canvasSourceObjectId,
  canvasUpdatedAt,
  course,
  descriptor,
  localSyncedAt,
  rowId,
  sourceType,
  text,
}: {
  readonly canvasSourceObjectId: string | null;
  readonly canvasUpdatedAt: string | null;
  readonly course: CanvasCourseRow;
  readonly descriptor: CanvasReviewerSourceDescriptor;
  readonly localSyncedAt: string;
  readonly rowId: string;
  readonly sourceType: Exclude<CanvasReviewerSourceType, "file">;
  readonly text: string;
}): CanvasSourceManifestItemBase {
  return {
    canvas_connection_id: course.canvas_connection_id,
    canvas_course_id: course.canvas_course_id,
    canvas_source_object_id: canvasSourceObjectId,
    canvas_updated_at: canvasUpdatedAt,
    course_id: course.id,
    file_id: null,
    file_kind: null,
    local_synced_at: localSyncedAt,
    mime_type: null,
    module_id: null,
    module_item_id: null,
    normalized_content_sha256: sha256Utf8Hex(text),
    ocr_version: null,
    page_count: null,
    parser_version: CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
    source_row_id: rowId,
    source_title: descriptor.title,
    source_type: sourceType,
    stored_content_sha256: null,
  };
}

function createFileSourceProvenance({
  course,
  descriptor,
  extraction,
  row,
}: {
  readonly course: CanvasCourseRow;
  readonly descriptor: CanvasReviewerSourceDescriptor;
  readonly extraction: {
    readonly text: string;
    readonly fileKind: Exclude<CanvasStoredFileKind, "unsupported">;
    readonly pageCount?: number;
  };
  readonly row: CanvasFileRow;
}): CanvasSourceManifestItemBase {
  const mimeType =
    normalizeMimeType(row.stored_content_type) ??
    normalizeMimeType(row.content_type);
  return {
    canvas_connection_id: row.canvas_connection_id,
    canvas_course_id: row.canvas_course_id || course.canvas_course_id,
    canvas_source_object_id: row.canvas_file_id,
    canvas_updated_at: row.canvas_modified_at ?? row.canvas_updated_at,
    course_id: row.course_id,
    file_id: row.canvas_file_id,
    file_kind: extraction.fileKind,
    local_synced_at: row.last_synced_at,
    mime_type: mimeType,
    module_id: null,
    module_item_id: null,
    normalized_content_sha256: sha256Utf8Hex(extraction.text),
    ocr_version:
      extraction.fileKind === "pdf"
        ? CANVAS_STORED_PDF_OCR_VERSION
        : CANVAS_STORED_IMAGE_OCR_VERSION,
    page_count:
      typeof extraction.pageCount === "number" ? extraction.pageCount : null,
    parser_version: CANVAS_STORED_FILE_EXTRACTION_VERSION,
    source_row_id: row.id,
    source_title: descriptor.title,
    source_type: "file",
    stored_content_sha256: normalizeSha256(row.current_sha256),
  };
}

function buildCanvasReviewerFileState(row: CanvasFileRow): CanvasReviewerFileState {
  const kind = classifyStoredCanvasFileKind(row);
  if (kind === "unsupported") {
    return {
      canPrepare: false,
      kind,
      preparationStatus: statusForUnsupportedFile(row),
    };
  }

  if (isPreparedCanvasFileReadyForOcr(row)) {
    return {
      canPrepare: false,
      kind,
      preparationStatus: "ready",
    };
  }

  if (!isFileMetadataAvailable(row)) {
    return {
      canPrepare: false,
      kind,
      preparationStatus: "unavailable",
    };
  }

  if (!isDeclaredByteCountWithinKindLimit(row, kind)) {
    return {
      canPrepare: false,
      kind,
      preparationStatus: "blocked",
    };
  }

  if (row.ingestion_eligibility !== fileEligibilityForKind(kind)) {
    return {
      canPrepare: false,
      kind,
      preparationStatus: "blocked",
    };
  }

  if (row.ingestion_status === "failed") {
    return {
      canPrepare: true,
      kind,
      preparationStatus: "failed",
    };
  }

  if (
    row.ingestion_status === "not_requested" ||
    row.ingestion_status === "stored" ||
    row.ingestion_status === "unchanged"
  ) {
    return {
      canPrepare: true,
      kind,
      preparationStatus: "not_prepared",
    };
  }

  return {
    canPrepare: false,
    kind,
    preparationStatus: "blocked",
  };
}

function statusForUnsupportedFile(
  row: CanvasFileRow,
): CanvasReviewerFilePreparationStatus {
  if (!isFileMetadataAvailable(row)) {
    return "unavailable";
  }
  if (
    row.ingestion_eligibility === "blocked_locked" ||
    row.ingestion_eligibility === "blocked_security" ||
    row.ingestion_eligibility === "blocked_size"
  ) {
    return "blocked";
  }
  return "unsupported";
}

function unavailableReasonForFile(
  row: CanvasFileRow,
  file: CanvasReviewerFileState,
): string {
  if (file.preparationStatus === "not_prepared") {
    return "Prepare this file before using it.";
  }
  if (file.preparationStatus === "failed") {
    return "Preparation failed. Try preparing this file again.";
  }
  if (!isFileMetadataAvailable(row)) {
    return "This file is unavailable in Canvas.";
  }
  if (row.ingestion_eligibility === "blocked_locked") {
    return "This file is locked.";
  }
  if (row.ingestion_eligibility === "blocked_size") {
    return "This file exceeds the supported size.";
  }
  if (isMediaCanvasFile(row)) {
    return "Audio and video files are not supported yet.";
  }
  if (file.preparationStatus === "blocked") {
    return "This file cannot be prepared safely.";
  }
  return "This file type is not supported yet.";
}

function isFileMetadataAvailable(row: CanvasFileRow): boolean {
  return (
    row.availability_status === "available" &&
    row.hidden !== true &&
    row.hidden_for_user !== true &&
    row.ingestion_eligibility !== "blocked_unavailable"
  );
}

function isMediaCanvasFile(row: CanvasFileRow): boolean {
  const contentType = normalizeMimeType(row.content_type);
  return Boolean(
    row.media_class ||
      row.media_entry_id ||
      contentType?.startsWith("audio/") ||
      contentType?.startsWith("video/"),
  );
}

function isDeclaredByteCountWithinKindLimit(
  row: CanvasFileRow,
  kind: Exclude<CanvasStoredFileKind, "unsupported">,
): boolean {
  if (typeof row.size_bytes !== "number" || row.size_bytes < 0) {
    return true;
  }
  return kind === "image"
    ? row.size_bytes <= OCR_MAX_IMAGE_BYTES
    : row.size_bytes <= OCR_MAX_PDF_BYTES;
}

function fileEligibilityForKind(
  kind: Exclude<CanvasStoredFileKind, "unsupported">,
): "eligible_document" | "eligible_image" {
  return kind === "pdf" ? "eligible_document" : "eligible_image";
}

function isSupportedFileForSourcePreparation(file: CanvasFileRow): boolean {
  const state = buildCanvasReviewerFileState(file);
  return (
    state.kind !== "unsupported" &&
    (state.canPrepare || state.preparationStatus === "ready")
  );
}

function preparationResultStatus(
  status: CanvasFileIngestionResultStatus,
): CanvasReviewerSourcePrepare["results"][number]["status"] {
  switch (status) {
    case "stored":
    case "unchanged":
      return "ready";
    case "failed":
      return "failed";
    case "blocked":
      return "blocked";
    case "unavailable":
      return "unavailable";
    case "metadata_only":
      return "unsupported";
  }
}

function safePreparationResultCode(code: string): string {
  if (!/^[a-z0-9_:-]{1,80}$/i.test(code)) {
    return "canvas_file_preparation_result";
  }
  return code;
}

async function readCourseRow({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasCourseRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_courses")
    .select(COURSE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasCourseRow | null };
}

async function readSelectedCoursePreference({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasCourseSyncPreferenceRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("course_id", courseId)
    .eq("selected", true)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasCourseSyncPreferenceRow | null };
}

async function readLatestCourseSyncRun({
  client,
  connectionId,
  courseId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasSyncRunRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_sync_runs")
    .select(SYNC_RUN_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("scope_course_id", courseId)
    .eq("sync_mode", "course")
    .neq("status", "running")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasSyncRunRow | null };
}

async function readLatestCourseResult({
  client,
  connectionId,
  syncRunId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly syncRunId: string;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasSyncCourseResultRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_sync_course_results")
    .select(COURSE_RESULT_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("sync_run_id", syncRunId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasSyncCourseResultRow | null };
}

async function readCourseSyncState({
  client,
  connectionId,
  course,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly course: CanvasCourseRow;
  readonly userId: string;
}): Promise<
  | { readonly ok: true; readonly value: CanvasCourseSyncStateRow | null }
  | { readonly ok: false }
> {
  const { data, error } = await client
    .from("canvas_course_sync_states")
    .select(SYNC_STATE_COLUMNS)
    .eq("user_id", userId)
    .eq("canvas_connection_id", connectionId)
    .eq("canvas_course_id", course.canvas_course_id)
    .eq("course_id", course.id)
    .maybeSingle();

  if (error) {
    return { ok: false };
  }
  return { ok: true, value: data as CanvasCourseSyncStateRow | null };
}

async function readPages(query: SourceQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasPageRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await query.client
    .from("canvas_pages")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .limit(CANVAS_REVIEWER_SOURCE_LIST_FETCH_LIMIT_PER_TYPE);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasPageRow[] };
}

async function readAssignments(query: SourceQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasAssignmentRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await query.client
    .from("canvas_assignments")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .limit(CANVAS_REVIEWER_SOURCE_LIST_FETCH_LIMIT_PER_TYPE);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasAssignmentRow[] };
}

async function readAnnouncements(query: SourceQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasAnnouncementRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await query.client
    .from("canvas_announcements")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .limit(CANVAS_REVIEWER_SOURCE_LIST_FETCH_LIMIT_PER_TYPE);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasAnnouncementRow[] };
}

async function readFiles(query: SourceQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasFileRow[] }
  | { readonly ok: false }
> {
  const { data, error } = await query.client
    .from("canvas_files")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .limit(CANVAS_REVIEWER_SOURCE_LIST_FETCH_LIMIT_PER_TYPE);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasFileRow[] };
}

async function readPagesByIds(query: SourceIdsQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasPageRow[] }
  | { readonly ok: false }
> {
  if (query.ids.length === 0) {
    return { ok: true, value: [] };
  }
  const { data, error } = await query.client
    .from("canvas_pages")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .in("id", [...query.ids]);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasPageRow[] };
}

async function readAssignmentsByIds(query: SourceIdsQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasAssignmentRow[] }
  | { readonly ok: false }
> {
  if (query.ids.length === 0) {
    return { ok: true, value: [] };
  }
  const { data, error } = await query.client
    .from("canvas_assignments")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .in("id", [...query.ids]);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasAssignmentRow[] };
}

async function readAnnouncementsByIds(query: SourceIdsQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasAnnouncementRow[] }
  | { readonly ok: false }
> {
  if (query.ids.length === 0) {
    return { ok: true, value: [] };
  }
  const { data, error } = await query.client
    .from("canvas_announcements")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .in("id", [...query.ids]);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasAnnouncementRow[] };
}

async function readFilesByIds(query: SourceIdsQuery): Promise<
  | { readonly ok: true; readonly value: readonly CanvasFileRow[] }
  | { readonly ok: false }
> {
  if (query.ids.length === 0) {
    return { ok: true, value: [] };
  }
  const { data, error } = await query.client
    .from("canvas_files")
    .select("*")
    .eq("user_id", query.userId)
    .eq("canvas_connection_id", query.connectionId)
    .eq("course_id", query.courseId)
    .in("id", [...query.ids]);

  if (error || !data) {
    return { ok: false };
  }
  return { ok: true, value: data as readonly CanvasFileRow[] };
}

interface SourceQuery {
  readonly client: SupabaseClient<Database>;
  readonly connectionId: string;
  readonly courseId: string;
  readonly userId: string;
}

interface SourceIdsQuery extends SourceQuery {
  readonly ids: readonly string[];
}

interface ParsedCanvasSourceId {
  readonly original: string;
  readonly rowId: string;
  readonly type: CanvasReviewerSourceType;
}

function normalizeSourceIds(
  sourceIds: readonly string[],
): CanvasReviewerSourceResult<readonly ParsedCanvasSourceId[]> {
  if (!Array.isArray(sourceIds)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "sourceIds must be an array.",
    };
  }
  if (sourceIds.length === 0) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "Choose at least one Canvas source.",
    };
  }
  if (sourceIds.length > CANVAS_REVIEWER_MAX_SOURCES) {
    return {
      ok: false,
      status: 400,
      code: "canvas_source_count_exceeded",
      details: {
        maximumSourceCount: CANVAS_REVIEWER_MAX_SOURCES,
        selectedSourceCount: sourceIds.length,
      },
      message: `Select at most ${CANVAS_REVIEWER_MAX_SOURCES} Canvas sources.`,
    };
  }

  const parsed = sourceIds.map(parseSourceId);
  if (parsed.some((source) => source === null)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "sourceIds must contain Canvas source descriptor IDs.",
    };
  }

  const normalized = parsed.filter(isNonNull);
  const distinct = new Set(normalized.map((source) => source.original));
  if (distinct.size !== normalized.length) {
    return {
      ok: false,
      status: 400,
      code: "canvas_source_duplicate",
      message: "Selected Canvas sources must not contain duplicates.",
    };
  }

  return { ok: true, value: normalized };
}

function parseSourceId(value: string): ParsedCanvasSourceId | null {
  if (typeof value !== "string") {
    return null;
  }

  const [type, rowId, extra] = value.trim().split(":");
  if (extra !== undefined || !isCanvasReviewerSourceType(type) || !isUuid(rowId)) {
    return null;
  }

  return {
    original: formatSourceId(type, rowId),
    rowId,
    type,
  };
}

function formatSourceId(type: CanvasReviewerSourceType, rowId: string): string {
  return `${type}:${rowId}`;
}

function compareSources(
  left: CanvasReviewerSourceDescriptor,
  right: CanvasReviewerSourceDescriptor,
): number {
  if (left.availability !== right.availability) {
    return left.availability === "available" ? -1 : 1;
  }

  const leftType = SOURCE_TYPE_ORDER.get(left.type) ?? Number.MAX_SAFE_INTEGER;
  const rightType = SOURCE_TYPE_ORDER.get(right.type) ?? Number.MAX_SAFE_INTEGER;
  if (leftType !== rightType) {
    return leftType - rightType;
  }

  const titleComparison = compareAsciiCaseInsensitive(left.title, right.title);
  if (titleComparison !== 0) {
    return titleComparison;
  }

  return compareAsciiCaseInsensitive(left.id, right.id);
}

function compareAsciiCaseInsensitive(left: string, right: string): number {
  const leftNormalized = left.toLowerCase();
  const rightNormalized = right.toLowerCase();
  if (leftNormalized < rightNormalized) {
    return -1;
  }
  if (leftNormalized > rightNormalized) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function collectFailureCategories({
  latestCourseResult,
  latestRun,
  syncState,
}: {
  readonly latestCourseResult: CanvasSyncCourseResultRow | null;
  readonly latestRun: CanvasSyncRunRow | null;
  readonly syncState: CanvasCourseSyncStateRow | null;
}): readonly string[] {
  const categories = [
    latestRun?.failure_code,
    latestCourseResult?.failure_code,
    latestCourseResult?.failed_operation,
    latestCourseResult?.failure_category,
    syncState?.last_failure_code,
  ]
    .filter((entry): entry is string => Boolean(entry?.trim()))
    .map((entry) => entry.trim());
  return [...new Set(categories)].sort(compareAsciiCaseInsensitive);
}

function walkHtmlChildren(
  nodes: readonly HtmlNode[],
  writer: TextWriter,
  context: HtmlWalkContext,
): void {
  for (const node of nodes) {
    walkHtmlNode(node, writer, context);
  }
}

interface HtmlWalkContext {
  readonly orderedListStack: readonly number[];
}

function walkHtmlNode(
  node: HtmlNode,
  writer: TextWriter,
  context: HtmlWalkContext,
): void {
  if (isTextNode(node)) {
    writer.text(node.value);
    return;
  }

  if (!isElementNode(node) || shouldSkipElement(node)) {
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (tag === "br") {
    writer.lineBreak();
    return;
  }

  if (tag === "li") {
    const itemNumber = context.orderedListStack.at(-1);
    writer.blockBreak();
    writer.text(itemNumber === undefined ? "- " : `${itemNumber}. `);
    walkHtmlChildren(node.childNodes, writer, context);
    writer.lineBreak();
    return;
  }

  if (tag === "ol") {
    writer.blockBreak();
    let listIndex = 0;
    node.childNodes.forEach((child) => {
      if (isElementNode(child) && child.tagName.toLowerCase() === "li") {
        listIndex += 1;
      }
      walkHtmlNode(child, writer, {
        orderedListStack: [...context.orderedListStack, listIndex],
      });
    });
    writer.blockBreak();
    return;
  }

  if (tag === "ul") {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.blockBreak();
    return;
  }

  if (tag === "tr") {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.lineBreak();
    return;
  }

  if (tag === "td" || tag === "th") {
    walkHtmlChildren(node.childNodes, writer, context);
    writer.text(" | ");
    return;
  }

  if (isBlockTag(tag)) {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.blockBreak();
    return;
  }

  walkHtmlChildren(node.childNodes, writer, context);
}

interface TextWriter {
  readonly blockBreak: () => void;
  readonly lineBreak: () => void;
  readonly text: (value: string) => void;
  readonly toString: () => string;
}

function createTextWriter(): TextWriter {
  const parts: string[] = [];

  function appendBreak(count: 1 | 2): void {
    const current = parts.join("");
    const trimmedEnd = current.replace(/[ \t]+$/g, "");
    parts.length = 0;
    parts.push(trimmedEnd);
    const existingBreaks = /\n*$/.exec(trimmedEnd)?.[0].length ?? 0;
    const needed = Math.max(0, count - existingBreaks);
    if (needed > 0 && trimmedEnd.length > 0) {
      parts.push("\n".repeat(needed));
    }
  }

  return {
    blockBreak: () => appendBreak(2),
    lineBreak: () => appendBreak(1),
    text: (value: string) => {
      const normalized = value.replace(/\s+/g, " ");
      if (!normalized.trim()) {
        return;
      }
      const current = parts.join("");
      const needsSpace =
        current.length > 0 &&
        !/[\s(]$/.test(current) &&
        !/^[,.;:!?)]/.test(normalized);
      parts.push(`${needsSpace ? " " : ""}${normalized.trim()}`);
    },
    toString: () =>
      parts
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
  };
}

function truncateAtWordBoundary(value: string, maximum: number): string {
  if (value.length <= maximum) {
    return value;
  }
  const truncated = value.slice(0, maximum).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maximum * 0.65)) {
    return truncated.slice(0, lastSpace).trimEnd();
  }
  return truncated;
}

function shouldSkipElement(node: HtmlElement): boolean {
  const tag = node.tagName.toLowerCase();
  if (
    tag === "script" ||
    tag === "style" ||
    tag === "form" ||
    tag === "input" ||
    tag === "button" ||
    tag === "select" ||
    tag === "textarea" ||
    tag === "iframe" ||
    tag === "object" ||
    tag === "embed" ||
    tag === "svg" ||
    tag === "canvas"
  ) {
    return true;
  }

  const hidden = getAttribute(node, "hidden");
  const ariaHidden = getAttribute(node, "aria-hidden");
  const style = (getAttribute(node, "style")?.toLowerCase() ?? "").replace(
    /\s+/g,
    "",
  );
  return (
    hidden !== null ||
    ariaHidden === "true" ||
    style.includes("display:none") ||
    style.includes("visibility:hidden")
  );
}

function getAttribute(node: HtmlElement, name: string): string | null {
  const attribute = node.attrs.find(
    (entry) => entry.name.toLowerCase() === name.toLowerCase(),
  );
  return attribute?.value ?? null;
}

function isBlockTag(tag: string): boolean {
  return (
    tag === "address" ||
    tag === "article" ||
    tag === "aside" ||
    tag === "blockquote" ||
    tag === "div" ||
    tag === "dl" ||
    tag === "fieldset" ||
    tag === "figcaption" ||
    tag === "figure" ||
    tag === "footer" ||
    tag === "h1" ||
    tag === "h2" ||
    tag === "h3" ||
    tag === "h4" ||
    tag === "h5" ||
    tag === "h6" ||
    tag === "header" ||
    tag === "hr" ||
    tag === "main" ||
    tag === "nav" ||
    tag === "p" ||
    tag === "pre" ||
    tag === "section" ||
    tag === "table"
  );
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return node.nodeName === "#text" && "value" in node;
}

function isElementNode(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray(node.childNodes);
}

function formatSourceType(type: CanvasReviewerSourceType): string {
  switch (type) {
    case "page":
      return "Page";
    case "assignment":
      return "Assignment";
    case "announcement":
      return "Announcement";
    case "file":
      return "File";
  }
}

function normalizeListLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit <= 0) {
    return CANVAS_REVIEWER_SOURCE_LIST_LIMIT;
  }
  return Math.min(limit, CANVAS_REVIEWER_SOURCE_LIST_LIMIT);
}

function normalizeListOffset(offset: number | undefined): number {
  if (
    typeof offset !== "number" ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    return 0;
  }
  return Math.min(offset, CANVAS_REVIEWER_SOURCE_LIST_MAX_OFFSET);
}

function storageFailure(message: string): CanvasReviewerSourceResult<never> {
  return {
    ok: false,
    status: 500,
    code: "canvas_storage_failed",
    message,
  };
}

function isCanvasReviewerSourceType(
  value: string | undefined,
): value is CanvasReviewerSourceType {
  return (
    value === "page" ||
    value === "assignment" ||
    value === "announcement" ||
    value === "file"
  );
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function normalizeSha256(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[a-f0-9]{64}$/.test(normalized) ? normalized : null;
}

function isDefined<TValue>(value: TValue | undefined): value is TValue {
  return value !== undefined;
}

function isNonNull<TValue>(value: TValue | null): value is TValue {
  return value !== null;
}
