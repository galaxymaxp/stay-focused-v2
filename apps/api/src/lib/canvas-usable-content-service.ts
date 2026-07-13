import type {
  CanvasAnnouncementRow,
  CanvasAssignmentRow,
  CanvasFileRow,
  CanvasModuleItemRow,
  CanvasPageRow,
  Database,
} from "@stay-focused/db";
import type { OcrProvider } from "@stay-focused/ocr";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifyStoredCanvasFileKind,
  extractPreparedCanvasFileText,
} from "./canvas-stored-file-extraction";
import { createServerOcrProvider } from "./ocr/create-server-ocr-provider";
import { loadStoredSelectedCanvasCourse } from "./canvas-reviewer-sources";
import {
  resolveCanvasUsableContent,
  type CanvasUsableContentCandidate,
  type CanvasUsableContentResolution,
} from "./canvas-usable-content";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredSourceType =
  | "page"
  | "assignment"
  | "announcement"
  | "file"
  | "module_item";

export type StoredCanvasUsableContentResult =
  | { readonly ok: true; readonly value: CanvasUsableContentResolution }
  | {
      readonly ok: false;
      readonly status: 400 | 404 | 500;
      readonly code: "invalid_request" | "canvas_course_not_found" | "canvas_storage_failed";
      readonly message: string;
    };

export async function resolveStoredCanvasUsableContent({
  client,
  courseId,
  itemId,
  ocrProvider,
  userId,
}: {
  readonly client: SupabaseClient<Database>;
  readonly courseId: string;
  readonly itemId: string;
  readonly ocrProvider?: OcrProvider;
  readonly userId: string;
}): Promise<StoredCanvasUsableContentResult> {
  const parsed = parseStoredSourceId(itemId);
  if (!parsed) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "itemId must be an opaque synchronized Canvas source ID.",
    };
  }

  const selected = await loadStoredSelectedCanvasCourse({ client, courseId, userId });
  if (!selected.ok) {
    return {
      ok: false,
      status: selected.status === 404 ? 404 : selected.status === 500 ? 500 : 400,
      code:
        selected.code === "canvas_course_not_found"
          ? "canvas_course_not_found"
          : selected.status === 500
            ? "canvas_storage_failed"
            : "invalid_request",
      message: selected.message,
    };
  }

  const boundary = {
    connectionId: selected.value.connection.id,
    courseId: selected.value.course.id,
    userId,
  };
  const candidate = await loadCandidate({
    boundary,
    client,
    ocrProvider,
    rowId: parsed.rowId,
    sourceType: parsed.sourceType,
  });
  if (candidate === "storage_failed") {
    return {
      ok: false,
      status: 500,
      code: "canvas_storage_failed",
      message: "The synchronized Canvas source could not be checked.",
    };
  }
  if (!candidate) {
    return {
      ok: true,
      value: inaccessibleResolution(parsed.sourceType),
    };
  }
  return { ok: true, value: await resolveCanvasUsableContent(candidate) };
}

interface OwnershipBoundary {
  readonly userId: string;
  readonly connectionId: string;
  readonly courseId: string;
}

async function loadCandidate({
  boundary,
  client,
  ocrProvider,
  rowId,
  sourceType,
}: {
  readonly boundary: OwnershipBoundary;
  readonly client: SupabaseClient<Database>;
  readonly ocrProvider?: OcrProvider;
  readonly rowId: string;
  readonly sourceType: StoredSourceType;
}): Promise<CanvasUsableContentCandidate | null | "storage_failed"> {
  switch (sourceType) {
    case "page": {
      const loaded = await readOwnedRow<CanvasPageRow>(client, "canvas_pages", rowId, boundary);
      return loaded === "storage_failed" ? loaded : loaded ? pageCandidate(loaded, boundary) : null;
    }
    case "assignment": {
      const loaded = await readOwnedRow<CanvasAssignmentRow>(
        client,
        "canvas_assignments",
        rowId,
        boundary,
      );
      return loaded === "storage_failed"
        ? loaded
        : loaded
          ? assignmentCandidate(loaded, boundary)
          : null;
    }
    case "announcement": {
      const loaded = await readOwnedRow<CanvasAnnouncementRow>(
        client,
        "canvas_announcements",
        rowId,
        boundary,
      );
      return loaded === "storage_failed"
        ? loaded
        : loaded
          ? announcementCandidate(loaded, boundary)
          : null;
    }
    case "file": {
      const loaded = await readOwnedRow<CanvasFileRow>(client, "canvas_files", rowId, boundary);
      return loaded === "storage_failed"
        ? loaded
        : loaded
          ? fileCandidate(loaded, boundary, client, ocrProvider)
          : null;
    }
    case "module_item": {
      const loaded = await readOwnedRow<CanvasModuleItemRow>(
        client,
        "canvas_module_items",
        rowId,
        boundary,
      );
      if (loaded === "storage_failed" || !loaded) return loaded;
      return moduleItemCandidate(loaded, boundary, client, ocrProvider);
    }
  }
}

function pageCandidate(
  row: CanvasPageRow,
  boundary: OwnershipBoundary,
): CanvasUsableContentCandidate {
  return baseCandidate(row, boundary, {
    html: row.body_html,
    method: "synchronized_page_html",
    sourceKind: "page",
    canvasObjectId: row.canvas_page_id ?? row.canvas_page_url,
  });
}

function assignmentCandidate(
  row: CanvasAssignmentRow,
  boundary: OwnershipBoundary,
): CanvasUsableContentCandidate {
  return baseCandidate(row, boundary, {
    html: row.description_html,
    method: "synchronized_assignment_html",
    sourceKind: "assignment",
    canvasObjectId: row.canvas_assignment_id,
  });
}

function announcementCandidate(
  row: CanvasAnnouncementRow,
  boundary: OwnershipBoundary,
): CanvasUsableContentCandidate {
  return baseCandidate(row, boundary, {
    html: row.message_html,
    method: "synchronized_announcement_html",
    sourceKind: "announcement",
    canvasObjectId: row.canvas_announcement_id,
  });
}

function fileCandidate(
  row: CanvasFileRow,
  boundary: OwnershipBoundary,
  client: SupabaseClient<Database>,
  injectedProvider?: OcrProvider,
): CanvasUsableContentCandidate {
  const kind = classifyStoredCanvasFileKind(row);
  return {
    accessible: row.availability_status === "available",
    connectionId: row.canvas_connection_id,
    courseId: row.course_id,
    expectedConnectionId: boundary.connectionId,
    expectedCourseId: boundary.courseId,
    expectedUserId: boundary.userId,
    extractFile: async () => {
      if (kind === "unsupported") return { status: "unsupported" };
      let provider: OcrProvider;
      try {
        provider = injectedProvider ?? createServerOcrProvider();
      } catch {
        return { status: "failed" };
      }
      const extraction = await extractPreparedCanvasFileText({
        client,
        connectionId: boundary.connectionId,
        courseId: boundary.courseId,
        fileRow: row,
        ocrProvider: provider,
        userId: boundary.userId,
      });
      if (!extraction.ok) {
        if (
          extraction.code === "canvas_source_image_ocr_empty" ||
          extraction.code === "canvas_source_pdf_ocr_empty"
        ) {
          return { status: "empty" };
        }
        if (
          extraction.code === "canvas_source_unsupported_file_type" ||
          extraction.code === "canvas_source_preview_too_large" ||
          extraction.code === "canvas_source_file_preparation_required"
        ) {
          return { status: "unsupported" };
        }
        return { status: extraction.status === 404 ? "inaccessible" : "failed" };
      }
      return {
        status: "usable",
        text: extraction.value.text,
        evidence: {
          fileKind: extraction.value.fileKind,
          ...(typeof extraction.value.pageCount === "number"
            ? { pageCount: extraction.value.pageCount }
            : {}),
        },
      };
    },
    method: kind === "image" ? "stored_image_ocr" : "stored_pdf_ocr",
    provenance: {
      resourceId: row.id,
      canvasObjectId: row.canvas_file_id,
      ...(row.current_sha256 ? { contentSha256: row.current_sha256 } : {}),
    },
    sourceId: `file:${row.id}`,
    sourceKind: "file",
    userId: row.user_id,
  };
}

function moduleItemCandidate(
  row: CanvasModuleItemRow,
  boundary: OwnershipBoundary,
  client: SupabaseClient<Database>,
  ocrProvider?: OcrProvider,
): CanvasUsableContentCandidate {
  return {
    accessible: true,
    connectionId: row.canvas_connection_id,
    courseId: row.course_id,
    expectedConnectionId: boundary.connectionId,
    expectedCourseId: boundary.courseId,
    expectedUserId: boundary.userId,
    method: "module_reference",
    moduleItemType: row.item_type,
    provenance: { moduleId: row.module_id, moduleItemId: row.id },
    resolveLinkedItem: async () =>
      loadLinkedModuleCandidate({ boundary, client, ocrProvider, row }),
    sourceId: `module_item:${row.id}`,
    sourceKind: "module_item",
    userId: row.user_id,
  };
}

async function loadLinkedModuleCandidate({
  boundary,
  client,
  ocrProvider,
  row,
}: {
  readonly boundary: OwnershipBoundary;
  readonly client: SupabaseClient<Database>;
  readonly ocrProvider?: OcrProvider;
  readonly row: CanvasModuleItemRow;
}): Promise<CanvasUsableContentCandidate | null> {
  const contentId = row.canvas_content_id?.trim();
  if (row.item_type === "Page") {
    const query = client
      .from("canvas_pages")
      .select("*")
      .eq("user_id", boundary.userId)
      .eq("canvas_connection_id", boundary.connectionId)
      .eq("course_id", boundary.courseId);
    const filtered = row.page_url
      ? query.eq("canvas_page_url", row.page_url)
      : contentId
        ? query.eq("canvas_page_id", contentId)
        : null;
    if (!filtered) return null;
    const { data, error } = await filtered.maybeSingle();
    return error || !data ? null : pageCandidate(data as CanvasPageRow, boundary);
  }
  if (!contentId) return null;
  if (row.item_type === "Assignment") {
    const { data, error } = await client
      .from("canvas_assignments")
      .select("*")
      .eq("user_id", boundary.userId)
      .eq("canvas_connection_id", boundary.connectionId)
      .eq("course_id", boundary.courseId)
      .eq("canvas_assignment_id", contentId)
      .maybeSingle();
    return error || !data ? null : assignmentCandidate(data as CanvasAssignmentRow, boundary);
  }
  if (row.item_type === "File") {
    const { data, error } = await client
      .from("canvas_files")
      .select("*")
      .eq("user_id", boundary.userId)
      .eq("canvas_connection_id", boundary.connectionId)
      .eq("course_id", boundary.courseId)
      .eq("canvas_file_id", contentId)
      .maybeSingle();
    return error || !data
      ? null
      : fileCandidate(data as CanvasFileRow, boundary, client, ocrProvider);
  }
  return null;
}

function baseCandidate(
  row: { readonly id: string; readonly user_id: string; readonly canvas_connection_id: string; readonly course_id: string },
  boundary: OwnershipBoundary,
  content: {
    readonly html: string | null;
    readonly method: "synchronized_page_html" | "synchronized_assignment_html" | "synchronized_announcement_html";
    readonly sourceKind: "page" | "assignment" | "announcement";
    readonly canvasObjectId: string | null;
  },
): CanvasUsableContentCandidate {
  return {
    accessible: true,
    connectionId: row.canvas_connection_id,
    courseId: row.course_id,
    expectedConnectionId: boundary.connectionId,
    expectedCourseId: boundary.courseId,
    expectedUserId: boundary.userId,
    html: content.html,
    method: content.method,
    provenance: {
      resourceId: row.id,
      ...(content.canvasObjectId ? { canvasObjectId: content.canvasObjectId } : {}),
    },
    sourceId: `${content.sourceKind}:${row.id}`,
    sourceKind: content.sourceKind,
    userId: row.user_id,
  };
}

async function readOwnedRow<TRow>(
  client: SupabaseClient<Database>,
  table: "canvas_pages" | "canvas_assignments" | "canvas_announcements" | "canvas_files" | "canvas_module_items",
  rowId: string,
  boundary: OwnershipBoundary,
): Promise<TRow | null | "storage_failed"> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", rowId)
    .eq("user_id", boundary.userId)
    .eq("canvas_connection_id", boundary.connectionId)
    .eq("course_id", boundary.courseId)
    .maybeSingle();
  if (error) return "storage_failed";
  return data ? (data as unknown as TRow) : null;
}

function parseStoredSourceId(
  value: string,
): { readonly sourceType: StoredSourceType; readonly rowId: string } | null {
  if (typeof value !== "string") return null;
  const [sourceType, rowId, extra] = value.trim().split(":");
  if (
    extra !== undefined ||
    !UUID_PATTERN.test(rowId ?? "") ||
    (sourceType !== "page" &&
      sourceType !== "assignment" &&
      sourceType !== "announcement" &&
      sourceType !== "file" &&
      sourceType !== "module_item")
  ) {
    return null;
  }
  return { sourceType, rowId };
}

function inaccessibleResolution(
  sourceKind: StoredSourceType,
): CanvasUsableContentResolution {
  return {
    status: "inaccessible",
    safeFailureCategory: "source_inaccessible",
    sourceKind,
    method: sourceKind === "module_item" ? "module_reference" : methodForKind(sourceKind),
    provenance: {
      method: sourceKind === "module_item" ? "module_reference" : methodForKind(sourceKind),
    },
  };
}

function methodForKind(
  kind: Exclude<StoredSourceType, "module_item">,
): "synchronized_page_html" | "synchronized_assignment_html" | "synchronized_announcement_html" | "stored_pdf_ocr" {
  if (kind === "page") return "synchronized_page_html";
  if (kind === "assignment") return "synchronized_assignment_html";
  if (kind === "announcement") return "synchronized_announcement_html";
  return "stored_pdf_ocr";
}
