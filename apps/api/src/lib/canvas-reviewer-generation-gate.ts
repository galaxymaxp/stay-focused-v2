import type {
  CanvasAnnouncementRow,
  CanvasAssignmentRow,
  CanvasFileRow,
  CanvasPageRow,
  Database,
} from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMeaningfulCanvasContent,
  normalizeCanvasHtmlToText,
} from "./canvas-content-normalization";
import {
  CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
  createCanvasResolutionFingerprint,
  sha256Utf8Hex,
  type CanvasSelectedBlockManifestItem,
  type CanvasSourceManifestItem,
  type ValidCanvasPreviewSession,
} from "./reviewer-source-provenance";
import { CANVAS_SELECTIVE_PREVIEW_VERSION } from "./canvas-structured-blocks";

export type CanvasGenerationGateResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly status: 409 | 500;
      readonly code: "canvas_resolution_stale" | "canvas_resolution_failed";
      readonly message: string;
    };

export async function validateCanvasReviewerGenerationGate({
  client,
  courseId,
  itemIds,
  previewSession,
  resolutionFingerprint,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly itemIds: readonly string[];
  readonly previewSession: ValidCanvasPreviewSession;
  readonly resolutionFingerprint: string;
  readonly userId: string;
}): Promise<CanvasGenerationGateResult> {
  const row = previewSession.row;
  const manifest = parseManifest(row.source_manifest);
  const selectedBlocks = parseSelectedBlockManifest(row.selected_block_manifest);
  if (
    row.user_id !== userId ||
    row.course_id !== courseId ||
    (row.normalization_version !== CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION &&
      row.normalization_version !== CANVAS_SELECTIVE_PREVIEW_VERSION) ||
    !manifest ||
    !selectedBlocks ||
    manifest.length !== row.source_count
  ) {
    return stale();
  }

  const manifestIds = manifest.map((item) =>
    item.source_row_id ? `${item.source_type}:${item.source_row_id}` : "",
  );
  if (!sameOrderedStrings(manifestIds, itemIds)) return stale();

  const expectedFingerprint = createCanvasResolutionFingerprint({
    manifest,
    normalizationVersion: row.normalization_version,
    selectedBlockManifest: selectedBlocks,
  });
  if (expectedFingerprint !== resolutionFingerprint) return stale();

  const { data: preference, error: preferenceError } = await client
    .from("canvas_course_sync_preferences")
    .select("id")
    .eq("user_id", userId)
    .eq("canvas_connection_id", row.canvas_connection_id)
    .eq("course_id", courseId)
    .eq("selected", true)
    .maybeSingle();
  if (preferenceError) return failed();
  if (!preference) return stale();

  for (const item of manifest) {
    const current = await readCurrentManifestRow(client, item, userId);
    if (current === "storage_failed") return failed();
    if (!current || !isCurrentCanvasManifestRow(item, current)) return stale();
  }
  return { ok: true };
}

export function isCurrentCanvasManifestRow(
  manifest: CanvasSourceManifestItem,
  row: CanvasPageRow | CanvasAssignmentRow | CanvasAnnouncementRow | CanvasFileRow,
): boolean {
  if (
    row.id !== manifest.source_row_id ||
    row.user_id === "" ||
    row.canvas_connection_id !== manifest.canvas_connection_id ||
    row.course_id !== manifest.course_id
  ) {
    return false;
  }
  if (manifest.source_type === "file") {
    const file = row as CanvasFileRow;
    return (
      file.current_sha256 === manifest.stored_content_sha256 &&
      file.availability_status === "available" &&
      (file.ingestion_status === "stored" || file.ingestion_status === "unchanged")
    );
  }
  const html =
    manifest.source_type === "page"
      ? (row as CanvasPageRow).body_html
      : manifest.source_type === "assignment"
        ? (row as CanvasAssignmentRow).description_html
        : (row as CanvasAnnouncementRow).message_html;
  const text = normalizeCanvasHtmlToText(html);
  return (
    isMeaningfulCanvasContent(text) &&
    sha256Utf8Hex(text) === manifest.normalized_content_sha256
  );
}

async function readCurrentManifestRow(
  client: SupabaseClient<Database>,
  item: CanvasSourceManifestItem,
  userId: string,
): Promise<
  CanvasPageRow | CanvasAssignmentRow | CanvasAnnouncementRow | CanvasFileRow | null | "storage_failed"
> {
  if (!item.source_row_id) return null;
  const table =
    item.source_type === "page"
      ? "canvas_pages"
      : item.source_type === "assignment"
        ? "canvas_assignments"
        : item.source_type === "announcement"
          ? "canvas_announcements"
          : "canvas_files";
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", item.source_row_id)
    .eq("user_id", userId)
    .eq("canvas_connection_id", item.canvas_connection_id)
    .eq("course_id", item.course_id)
    .maybeSingle();
  if (error) return "storage_failed";
  return data as
    | CanvasPageRow
    | CanvasAssignmentRow
    | CanvasAnnouncementRow
    | CanvasFileRow
    | null;
}

function parseManifest(value: unknown): readonly CanvasSourceManifestItem[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.filter(isManifestItem);
  return parsed.length === value.length ? parsed : null;
}

function parseSelectedBlockManifest(
  value: unknown,
): readonly CanvasSelectedBlockManifestItem[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.filter(isSelectedBlockManifestItem);
  return parsed.length === value.length ? parsed : null;
}

function isSelectedBlockManifestItem(
  value: unknown,
): value is CanvasSelectedBlockManifestItem {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.ordinal) &&
    Number.isSafeInteger(value.source_ordinal) &&
    Number.isSafeInteger(value.block_ordinal) &&
    typeof value.block_kind === "string" &&
    typeof value.block_text === "string" &&
    typeof value.block_sha256 === "string" &&
    (value.heading_level === null || typeof value.heading_level === "number") &&
    (value.list_depth === null || typeof value.list_depth === "number") &&
    (value.list_style === null || typeof value.list_style === "string") &&
    (value.page_number === null || typeof value.page_number === "number") &&
    (value.slide_number === null || typeof value.slide_number === "number") &&
    (value.module_position === null || typeof value.module_position === "number") &&
    (value.parser_version === null || typeof value.parser_version === "string") &&
    (value.ocr_version === null || typeof value.ocr_version === "string")
  );
}

function isManifestItem(value: unknown): value is CanvasSourceManifestItem {
  if (!isRecord(value)) return false;
  return (
    Number.isSafeInteger(value.ordinal) &&
    typeof value.source_type === "string" &&
    ["page", "assignment", "announcement", "file"].includes(value.source_type) &&
    typeof value.source_row_id === "string" &&
    typeof value.canvas_connection_id === "string" &&
    typeof value.course_id === "string" &&
    typeof value.normalized_content_sha256 === "string" &&
    (value.stored_content_sha256 === null ||
      typeof value.stored_content_sha256 === "string")
  );
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stale(): CanvasGenerationGateResult {
  return {
    ok: false,
    status: 409,
    code: "canvas_resolution_stale",
    message: "Canvas source resolution changed. Preview the selected sources again.",
  };
}

function failed(): CanvasGenerationGateResult {
  return {
    ok: false,
    status: 500,
    code: "canvas_resolution_failed",
    message: "Canvas source resolution could not be verified.",
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
