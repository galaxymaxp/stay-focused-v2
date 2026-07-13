import type { Database, Json } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
  CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
  CANVAS_STORED_IMAGE_OCR_VERSION,
  createCanvasSourcePreviewSession,
  createOrReuseReviewerSourceSnapshot,
  readSafeReviewerSourceProvenanceSummary,
  sha256Utf8Hex,
  validateCanvasPreviewSessionForGeneration,
  verifyReviewerSourceSnapshotForSave,
  type CanvasSourceManifestItem,
} from "./reviewer-source-provenance";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const PREVIEW_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const SNAPSHOT_ID = "44444444-4444-4444-8444-444444444444";

describe("reviewer source provenance helpers", () => {
  it("stores preview sessions with exact text hash and ordered manifest", async () => {
    const fake = createFakeClient();
    const result = await createCanvasSourcePreviewSession({
      canvasConnectionId: CONNECTION_ID,
      client: fake.client,
      courseId: COURSE_ID,
      manifest: [manifestItem(1), manifestItem(2)],
      originalPreviewText: "SOURCE 1\n\nFictional preview text.",
      suggestedTitle: "Fictional Canvas Reviewer",
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: { previewSessionId: PREVIEW_SESSION_ID },
    });
    if (result.ok) {
      expect(result.value.resolutionFingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(fake.inserted.canvas_source_preview_sessions).toMatchObject({
      original_preview_text: "SOURCE 1\n\nFictional preview text.",
      original_preview_sha256: sha256Utf8Hex(
        "SOURCE 1\n\nFictional preview text.",
      ),
      source_count: 2,
      source_manifest: [manifestItem(1), manifestItem(2)],
      selected_block_manifest: [],
      normalization_version: CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
    });
  });

  it("validates preview session ownership, UUID shape, and expiry", async () => {
    const invalid = await validateCanvasPreviewSessionForGeneration({
      client: createFakeClient().client,
      previewSessionId: "not-a-uuid",
      userId: USER_ID,
    });
    expect(invalid).toMatchObject({
      ok: false,
      code: "canvas_preview_session_invalid",
    });

    const missing = await validateCanvasPreviewSessionForGeneration({
      client: createFakeClient({ previewSession: null }).client,
      previewSessionId: PREVIEW_SESSION_ID,
      userId: USER_ID,
    });
    expect(missing).toMatchObject({
      ok: false,
      code: "canvas_preview_session_not_found",
    });

    const expired = await validateCanvasPreviewSessionForGeneration({
      client: createFakeClient({
        previewSession: {
          ...previewSessionRow(),
          expires_at: "2020-01-01T00:00:00.000Z",
        },
      }).client,
      previewSessionId: PREVIEW_SESSION_ID,
      userId: USER_ID,
    });
    expect(expired).toMatchObject({
      ok: false,
      code: "canvas_preview_session_expired",
    });
  });

  it("creates snapshots with the exact edited source hash and edit state", async () => {
    const fake = createFakeClient();
    const sourceText = "Edited fictional source text.";
    const result = await createOrReuseReviewerSourceSnapshot({
      client: fake.client,
      previewSession: { row: previewSessionRow() },
      sourceText,
      sourceTitle: "Edited Title",
      userId: USER_ID,
    });

    expect(result).toEqual({
      ok: true,
      value: { sourceSnapshotId: SNAPSHOT_ID },
    });
    expect(fake.rpcPayload).toMatchObject({
      p_exact_source_sha256: sha256Utf8Hex(sourceText),
      p_exact_source_text: sourceText,
      p_preview_session_id: PREVIEW_SESSION_ID,
      p_source_title: "Edited Title",
      p_user_id: USER_ID,
      p_was_edited: true,
    });
  });

  it("rejects cross-user and mismatched snapshot metadata during save", async () => {
    const crossUser = await verifyReviewerSourceSnapshotForSave({
      client: createFakeClient({
        snapshot: { ...snapshotRow(), user_id: OTHER_USER_ID },
      }).client,
      sourceCharacterCount: snapshotRow().exact_source_text.length,
      sourceSnapshotId: SNAPSHOT_ID,
      userId: USER_ID,
    });
    expect(crossUser).toMatchObject({
      ok: false,
      code: "source_snapshot_ownership_mismatch",
    });

    const mismatch = await verifyReviewerSourceSnapshotForSave({
      client: createFakeClient().client,
      sourceCharacterCount: 999,
      sourceSnapshotId: SNAPSHOT_ID,
      userId: USER_ID,
    });
    expect(mismatch).toMatchObject({
      ok: false,
      code: "source_snapshot_metadata_mismatch",
    });
  });

  it("returns a safe summary without source text or hashes", async () => {
    const result = await readSafeReviewerSourceProvenanceSummary({
      client: createFakeClient().client,
      sourceSnapshotId: SNAPSHOT_ID,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        sourceSnapshotId: SNAPSHOT_ID,
        selectedBlockCount: 2,
        sourceCount: 2,
        wasEdited: true,
        parserVersions: [CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION],
        ocrVersions: [CANVAS_STORED_IMAGE_OCR_VERSION],
      },
    });
    expect(JSON.stringify(result)).not.toContain("exact_source_text");
    expect(JSON.stringify(result)).not.toContain("sha256");
  });
});

function createFakeClient(
  options: {
    readonly previewSession?: Record<string, unknown> | null;
    readonly snapshot?: Record<string, unknown> | null;
  } = {},
) {
  const inserted: Record<string, unknown> = {};
  const state: { rpcPayload?: unknown } = {};
  const previewSession =
    "previewSession" in options ? options.previewSession ?? null : previewSessionRow();
  const snapshot =
    "snapshot" in options ? options.snapshot ?? null : snapshotRow();
  const client = {
    from: (table: string) => ({
      insert: (payload: unknown) => {
        inserted[table] = {
          id: PREVIEW_SESSION_ID,
          ...(payload as Record<string, unknown>),
        };
        return {
          select: () => ({
            single: async () => ({
              data: { id: PREVIEW_SESSION_ID },
              error: null,
            }),
          }),
        };
      },
      select: () => createSelectBuilder(table, { previewSession, snapshot }),
    }),
    rpc: vi.fn((name: string, payload: unknown) => {
      state.rpcPayload = payload;
      expect(name).toBe("create_reviewer_source_snapshot");
      return {
        single: async () => ({
          data: { id: SNAPSHOT_ID },
          error: null,
        }),
      };
    }),
  } as unknown as SupabaseClient<Database>;

  return {
    client,
    inserted: inserted as {
      readonly canvas_source_preview_sessions?: Record<string, unknown>;
    },
    get rpcPayload() {
      return state.rpcPayload;
    },
  };
}

function createSelectBuilder(
  table: string,
  rows: {
    readonly previewSession: Record<string, unknown> | null;
    readonly snapshot: Record<string, unknown> | null;
  },
) {
  const filters: Array<[string, unknown]> = [];
  const builder = {
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    },
    order: () => builder,
    maybeSingle: async () => ({
      data: selectSingleRow(table, rows, filters),
      error: null,
    }),
    then: (
      onfulfilled?: (value: { readonly data: unknown; readonly error: null }) => unknown,
    ) =>
      Promise.resolve({
      data:
          table === "reviewer_source_snapshot_items"
            ? [
                {
                  parser_version: CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
                  ocr_version: null,
                },
                {
                  parser_version: CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
                  ocr_version: CANVAS_STORED_IMAGE_OCR_VERSION,
                },
              ]
            : table === "reviewer_source_snapshot_blocks"
              ? [
                  {
                    id: "77777777-7777-4777-8777-777777777771",
                    user_id: USER_ID,
                    source_snapshot_id: SNAPSHOT_ID,
                    ordinal: 1,
                    created_at: "2026-07-07T00:10:00.000Z",
                  },
                  {
                    id: "77777777-7777-4777-8777-777777777772",
                    user_id: USER_ID,
                    source_snapshot_id: SNAPSHOT_ID,
                    ordinal: 2,
                    created_at: "2026-07-07T00:10:00.000Z",
                  },
                ]
            : [],
        error: null,
      }).then(onfulfilled),
  };
  return builder;
}

function selectSingleRow(
  table: string,
  rows: {
    readonly previewSession: Record<string, unknown> | null;
    readonly snapshot: Record<string, unknown> | null;
  },
  filters: readonly (readonly [string, unknown])[],
): Record<string, unknown> | null {
  const row =
    table === "canvas_source_preview_sessions"
      ? rows.previewSession
      : table === "reviewer_source_snapshots"
        ? rows.snapshot
        : null;
  if (!row) return null;
  return filters.every(([column, value]) => row[column] === value) ? row : null;
}

function previewSessionRow() {
  return {
    id: PREVIEW_SESSION_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    original_preview_text: "Original fictional preview text.",
    original_preview_sha256: sha256Utf8Hex("Original fictional preview text."),
    suggested_title: "Fictional Canvas Reviewer",
    source_count: 2,
    source_manifest: [manifestItem(1), manifestItem(2)] as unknown as Json,
    selected_block_manifest: [] as unknown as Json,
    source_relationship_manifest: [] as unknown as Json,
    duplicate_analysis_version: null,
    normalization_version: CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
    created_at: "2026-07-07T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
  };
}

function snapshotRow() {
  return {
    id: SNAPSHOT_ID,
    user_id: USER_ID,
    preview_session_id: PREVIEW_SESSION_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    source_mode: "canvas",
    source_title: "Fictional Canvas Reviewer",
    original_preview_sha256: previewSessionRow().original_preview_sha256,
    exact_source_text: "Edited fictional source text.",
    exact_source_sha256: sha256Utf8Hex("Edited fictional source text."),
    source_count: 2,
    was_edited: true,
    normalization_version: CANVAS_SOURCE_PREVIEW_NORMALIZATION_VERSION,
    created_at: "2026-07-07T00:10:00.000Z",
  };
}

function manifestItem(ordinal: number): CanvasSourceManifestItem {
  return {
    ordinal,
    source_type: ordinal === 1 ? "page" : "file",
    source_title: ordinal === 1 ? "Fictional Page" : "Fictional Image",
    source_row_id: "55555555-5555-4555-8555-555555555555",
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_course_id: "101",
    canvas_source_object_id: ordinal === 1 ? "page-1" : "file-1",
    module_id: null,
    module_item_id: null,
    file_id: ordinal === 1 ? null : "file-1",
    file_kind: ordinal === 1 ? null : "image",
    mime_type: ordinal === 1 ? null : "image/png",
    page_count: null,
    canvas_updated_at: "2026-07-07T00:00:00.000Z",
    local_synced_at: "2026-07-07T00:00:00.000Z",
    normalized_content_sha256: sha256Utf8Hex(`source ${ordinal}`),
    stored_content_sha256: null,
    parser_version: CANVAS_HTML_VISIBLE_TEXT_PARSER_VERSION,
    ocr_version: ordinal === 1 ? null : CANVAS_STORED_IMAGE_OCR_VERSION,
  };
}
