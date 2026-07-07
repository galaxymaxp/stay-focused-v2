import type {
  CanvasSourcePreviewSessionInsert,
  CanvasSourcePreviewSessionRow,
  Database,
  Json,
  ReviewerSourceSnapshotItemRow,
  ReviewerSourceSnapshotRow,
  SavedReviewerSourceProvenanceSummary,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION =
  "canvas-source-preview-v1";
export const CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION =
  "canvas-html-visible-text-v1";
export const CANVAS_STORED_FILE_EXTRACTION_VERSION =
  "canvas-stored-file-extraction-v1";
export const CANVAS_STORED_IMAGE_OCR_VERSION = "canvas-stored-image-ocr-v1";
export const CANVAS_STORED_PDF_OCR_VERSION = "canvas-stored-pdf-ocr-v1";

export const CANVAS_PREVIEW_SESSION_TTL_HOURS = 24;

export interface CanvasSourceManifestItem {
  readonly ordinal: number;
  readonly source_type: "page" | "assignment" | "announcement" | "file";
  readonly source_title: string;
  readonly source_row_id: string | null;
  readonly canvas_connection_id: string;
  readonly course_id: string;
  readonly canvas_course_id: string;
  readonly canvas_source_object_id: string | null;
  readonly module_id: string | null;
  readonly module_item_id: string | null;
  readonly file_id: string | null;
  readonly file_kind: "pdf" | "image" | null;
  readonly mime_type: string | null;
  readonly page_count: number | null;
  readonly canvas_updated_at: string | null;
  readonly local_synced_at: string | null;
  readonly normalized_content_sha256: string;
  readonly stored_content_sha256: string | null;
  readonly parser_version: string | null;
  readonly ocr_version: string | null;
}

export type SourceProvenanceErrorCode =
  | "canvas_preview_session_missing"
  | "canvas_preview_session_expired"
  | "canvas_preview_session_not_found"
  | "canvas_preview_session_invalid"
  | "source_snapshot_failed"
  | "source_snapshot_not_found"
  | "source_snapshot_ownership_mismatch"
  | "source_snapshot_required"
  | "source_snapshot_metadata_mismatch"
  | "source_snapshot_storage_failed";

export type SourceProvenanceResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly ok: false;
      readonly status: 400 | 404 | 409 | 422 | 500;
      readonly code: SourceProvenanceErrorCode;
      readonly message: string;
    };

export interface ValidCanvasPreviewSession {
  readonly row: CanvasSourcePreviewSessionRow;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREVIEW_SESSION_COLUMNS =
  "id,user_id,canvas_connection_id,course_id,original_preview_text,original_preview_sha256,suggested_title,source_count,source_manifest,normalization_version,created_at,expires_at";
const SNAPSHOT_COLUMNS =
  "id,user_id,preview_session_id,canvas_connection_id,course_id,source_mode,source_title,original_preview_sha256,exact_source_text,exact_source_sha256,source_count,was_edited,normalization_version,created_at";
const SNAPSHOT_ITEM_SUMMARY_COLUMNS =
  "id,user_id,source_snapshot_id,ordinal,parser_version,ocr_version,created_at";

type SnapshotItemVersionRow = Pick<
  ReviewerSourceSnapshotItemRow,
  "ocr_version" | "parser_version"
>;

export function sha256Utf8Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export async function createCanvasSourcePreviewSession({
  canvasConnectionId,
  client,
  courseId,
  manifest,
  originalPreviewText,
  suggestedTitle,
  userId,
}: {
  readonly canvasConnectionId: string;
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly manifest: readonly CanvasSourceManifestItem[];
  readonly originalPreviewText: string;
  readonly suggestedTitle: string;
  readonly userId: string;
}): Promise<SourceProvenanceResult<{ readonly previewSessionId: string }>> {
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + CANVAS_PREVIEW_SESSION_TTL_HOURS * 60 * 60 * 1000,
  );
  const insert: CanvasSourcePreviewSessionInsert = {
    canvas_connection_id: canvasConnectionId,
    course_id: courseId,
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    normalization_version: CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
    original_preview_sha256: sha256Utf8Hex(originalPreviewText),
    original_preview_text: originalPreviewText,
    source_count: manifest.length,
    source_manifest: manifest as unknown as Json,
    suggested_title: suggestedTitle,
    user_id: userId,
  };

  const { data, error } = await client
    .from("canvas_source_preview_sessions")
    .insert(insert)
    .select("id")
    .single();

  if (error || !data) {
    return storageFailed("Preview provenance could not be stored.");
  }

  return { ok: true, value: { previewSessionId: data.id } };
}

export async function validateCanvasPreviewSessionForGeneration({
  client,
  previewSessionId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly previewSessionId: string | undefined;
  readonly userId: string;
}): Promise<SourceProvenanceResult<ValidCanvasPreviewSession | null>> {
  if (previewSessionId === undefined) {
    return { ok: true, value: null };
  }

  const normalizedId = previewSessionId.trim();
  if (!normalizedId) {
    return {
      ok: false,
      status: 400,
      code: "canvas_preview_session_missing",
      message: "Canvas preview session is required for Canvas source provenance.",
    };
  }
  if (!isUuid(normalizedId)) {
    return {
      ok: false,
      status: 400,
      code: "canvas_preview_session_invalid",
      message: "Canvas preview session is invalid.",
    };
  }

  const { data, error } = await client
    .from("canvas_source_preview_sessions")
    .select(PREVIEW_SESSION_COLUMNS)
    .eq("id", normalizedId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return storageFailed("Canvas preview session could not be checked.");
  }
  if (!data) {
    return {
      ok: false,
      status: 404,
      code: "canvas_preview_session_not_found",
      message: "Canvas preview session was not found.",
    };
  }

  const row = data as CanvasSourcePreviewSessionRow;
  if (Date.parse(row.expires_at) <= Date.now()) {
    return {
      ok: false,
      status: 409,
      code: "canvas_preview_session_expired",
      message: "Canvas preview session has expired. Preview the sources again.",
    };
  }

  return { ok: true, value: { row } };
}

export async function createOrReuseReviewerSourceSnapshot({
  client,
  previewSession,
  sourceText,
  sourceTitle,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly previewSession: ValidCanvasPreviewSession;
  readonly sourceText: string;
  readonly sourceTitle: string | undefined;
  readonly userId: string;
}): Promise<SourceProvenanceResult<{ readonly sourceSnapshotId: string }>> {
  const exactSourceSha256 = sha256Utf8Hex(sourceText);
  const wasEdited = exactSourceSha256 !== previewSession.row.original_preview_sha256;
  const title =
    sourceTitle?.trim() || previewSession.row.suggested_title || "Canvas Reviewer";

  const { data, error } = await client
    .rpc("create_reviewer_source_snapshot", {
      p_exact_source_sha256: exactSourceSha256,
      p_exact_source_text: sourceText,
      p_preview_session_id: previewSession.row.id,
      p_source_title: title,
      p_user_id: userId,
      p_was_edited: wasEdited,
    })
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      status: 500,
      code: mapSnapshotRpcError(error),
      message: "Canvas source snapshot could not be created.",
    };
  }

  return { ok: true, value: { sourceSnapshotId: data.id } };
}

export async function verifyReviewerSourceSnapshotForSave({
  client,
  sourceCharacterCount,
  sourceSnapshotId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly sourceCharacterCount: number;
  readonly sourceSnapshotId: string | undefined;
  readonly userId: string;
}): Promise<SourceProvenanceResult<{ readonly sourceSnapshotId: string }>> {
  if (sourceSnapshotId === undefined || sourceSnapshotId.trim().length === 0) {
    return {
      ok: false,
      status: 422,
      code: "source_snapshot_required",
      message: "Canvas reviewer saves require a generated source snapshot.",
    };
  }

  const normalizedId = sourceSnapshotId.trim();
  if (!isUuid(normalizedId)) {
    return {
      ok: false,
      status: 400,
      code: "source_snapshot_not_found",
      message: "Canvas source snapshot was not found.",
    };
  }

  const { data, error } = await client
    .from("reviewer_source_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", normalizedId)
    .maybeSingle();

  if (error) {
    return storageFailed("Canvas source snapshot could not be checked.");
  }
  if (!data) {
    return {
      ok: false,
      status: 404,
      code: "source_snapshot_not_found",
      message: "Canvas source snapshot was not found.",
    };
  }

  const snapshot = data as ReviewerSourceSnapshotRow;
  if (snapshot.user_id !== userId) {
    return {
      ok: false,
      status: 404,
      code: "source_snapshot_ownership_mismatch",
      message: "Canvas source snapshot was not found.",
    };
  }
  if (snapshot.exact_source_text.length !== sourceCharacterCount) {
    return {
      ok: false,
      status: 422,
      code: "source_snapshot_metadata_mismatch",
      message: "Canvas source snapshot metadata does not match the reviewer.",
    };
  }

  return { ok: true, value: { sourceSnapshotId: snapshot.id } };
}

export async function readSafeReviewerSourceProvenanceSummary({
  client,
  sourceSnapshotId,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly sourceSnapshotId: string | null | undefined;
  readonly userId: string;
}): Promise<SourceProvenanceResult<SavedReviewerSourceProvenanceSummary | null>> {
  if (!sourceSnapshotId) {
    return { ok: true, value: null };
  }

  const { data: snapshotData, error: snapshotError } = await client
    .from("reviewer_source_snapshots")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", sourceSnapshotId)
    .eq("user_id", userId)
    .maybeSingle();

  if (snapshotError) {
    return storageFailed("Canvas source snapshot summary could not be loaded.");
  }
  if (!snapshotData) {
    return {
      ok: false,
      status: 404,
      code: "source_snapshot_not_found",
      message: "Canvas source snapshot was not found.",
    };
  }

  const { data: itemsData, error: itemsError } = await client
    .from("reviewer_source_snapshot_items")
    .select(SNAPSHOT_ITEM_SUMMARY_COLUMNS)
    .eq("source_snapshot_id", sourceSnapshotId)
    .eq("user_id", userId)
    .order("ordinal", { ascending: true });

  if (itemsError || !itemsData) {
    return storageFailed("Canvas source snapshot summary could not be loaded.");
  }

  const snapshot = snapshotData as ReviewerSourceSnapshotRow;
  const items = itemsData as unknown as readonly SnapshotItemVersionRow[];
  return {
    ok: true,
    value: {
      generatedAt: snapshot.created_at,
      ocrVersions: collectVersions(items.map((item) => item.ocr_version)),
      parserVersions: collectVersions(items.map((item) => item.parser_version)),
      sourceCount: snapshot.source_count,
      sourceMode: "canvas",
      sourceSnapshotId: snapshot.id,
      sourceTitle: snapshot.source_title,
      wasEdited: snapshot.was_edited,
    },
  };
}

export function mapProvenanceErrorForClient(
  result: Extract<SourceProvenanceResult<unknown>, { readonly ok: false }>,
): {
  readonly status: 400 | 404 | 409 | 422 | 500;
  readonly code: SourceProvenanceErrorCode;
  readonly message: string;
} {
  return {
    code: result.code,
    message: result.message,
    status: result.status,
  };
}

function collectVersions(values: readonly (string | null)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
    .sort();
}

function mapSnapshotRpcError(error: unknown): SourceProvenanceErrorCode {
  if (!isRecord(error) || typeof error.message !== "string") {
    return "source_snapshot_failed";
  }
  if (error.message.includes("canvas_preview_session_expired")) {
    return "canvas_preview_session_expired";
  }
  if (error.message.includes("canvas_preview_session_not_found")) {
    return "canvas_preview_session_not_found";
  }
  return "source_snapshot_storage_failed";
}

function storageFailed(message: string): SourceProvenanceResult<never> {
  return {
    ok: false,
    status: 500,
    code: "source_snapshot_storage_failed",
    message,
  };
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
