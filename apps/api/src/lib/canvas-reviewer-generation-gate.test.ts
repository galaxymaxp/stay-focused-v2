import { describe, expect, it } from "vitest";
import type { CanvasPageRow } from "@stay-focused/db";

import { isCurrentCanvasManifestRow } from "./canvas-reviewer-generation-gate";
import {
  CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
  sha256Utf8Hex,
  type CanvasSourceManifestItem,
} from "./reviewer-source-provenance";
import { normalizeCanvasHtmlToText } from "./canvas-content-normalization";

const TEXT = normalizeCanvasHtmlToText("<h2>Biology</h2><p>Cells contain DNA.</p>");

describe("Canvas reviewer generation freshness", () => {
  it("accepts an unchanged synchronized page", () => {
    expect(isCurrentCanvasManifestRow(manifest(), pageRow())).toBe(true);
  });

  it("rejects changed, emptied, deleted-boundary, and cross-course page rows", () => {
    expect(
      isCurrentCanvasManifestRow(manifest(), pageRow({ body_html: "<p>Changed facts.</p>" })),
    ).toBe(false);
    expect(isCurrentCanvasManifestRow(manifest(), pageRow({ body_html: "<h2>Overview</h2>" }))).toBe(false);
    expect(isCurrentCanvasManifestRow(manifest(), pageRow({ id: "00000000-0000-4000-8000-000000000099" }))).toBe(false);
    expect(isCurrentCanvasManifestRow(manifest(), pageRow({ course_id: "other-course" }))).toBe(false);
  });

  it("requires the exact protected stored-file hash and ready state", () => {
    const fileManifest = manifest({
      source_type: "file",
      stored_content_sha256: "a".repeat(64),
    });
    const file = {
      ...pageRow(),
      current_sha256: "a".repeat(64),
      availability_status: "available",
      ingestion_status: "stored",
    };
    expect(isCurrentCanvasManifestRow(fileManifest, file as never)).toBe(true);
    expect(
      isCurrentCanvasManifestRow(
        fileManifest,
        { ...file, current_sha256: "b".repeat(64) } as never,
      ),
    ).toBe(false);
    expect(
      isCurrentCanvasManifestRow(
        fileManifest,
        { ...file, ingestion_status: "failed" } as never,
      ),
    ).toBe(false);
  });
});

function manifest(overrides: Partial<CanvasSourceManifestItem> = {}): CanvasSourceManifestItem {
  return {
    ordinal: 1,
    source_type: "page",
    source_title: "Private title",
    source_row_id: "00000000-0000-4000-8000-000000000001",
    canvas_connection_id: "00000000-0000-4000-8000-000000000002",
    course_id: "00000000-0000-4000-8000-000000000003",
    canvas_course_id: "42",
    canvas_source_object_id: "7",
    module_id: null,
    module_item_id: null,
    file_id: null,
    file_kind: null,
    mime_type: null,
    page_count: null,
    canvas_updated_at: null,
    local_synced_at: null,
    normalized_content_sha256: sha256Utf8Hex(TEXT),
    stored_content_sha256: null,
    parser_version: CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
    ocr_version: null,
    ...overrides,
  };
}

function pageRow(overrides: Record<string, unknown> = {}): CanvasPageRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "user-1",
    canvas_connection_id: "00000000-0000-4000-8000-000000000002",
    course_id: "00000000-0000-4000-8000-000000000003",
    body_html: "<h2>Biology</h2><p>Cells contain DNA.</p>",
    ...overrides,
  } as unknown as CanvasPageRow;
}
