import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { sha256Utf8Hex } from "@/lib/reviewer-source-provenance";
import { readReviewerSourceStatus } from "./reviewer-source-status";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000099";
const REVIEWER_ID = "11111111-1111-4111-8111-111111111111";
const SNAPSHOT_ID = "22222222-2222-4222-8222-222222222222";
const PREVIEW_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const CONNECTION_ID = "44444444-4444-4444-8444-444444444444";
const COURSE_ID = "55555555-5555-4555-8555-555555555555";
const RUN_ID = "66666666-6666-4666-8666-666666666666";
const NOW = "2026-07-07T00:00:00.000Z";
const LATER = "2026-07-08T00:00:00.000Z";
const EARLIER = "2026-07-06T00:00:00.000Z";

describe("reviewer source status service", () => {
  it("compares current textual sources without exposing hashes or private IDs", async () => {
    const fake = createFakeStatusClient({
      canvas_assignments: [
        assignmentRow({
          canvasAssignmentId: "assignment-1",
          descriptionHtml: "<p>Updated assignment</p>",
        }),
      ],
      canvas_pages: [
        pageRow({
          bodyHtml: "<p>Current page</p>",
          canvasPageId: "page-1",
        }),
      ],
      reviewer_source_snapshot_items: [
        snapshotItem({
          normalizedHash: sha256Utf8Hex("Current page"),
          ordinal: 1,
          sourceObjectId: "page-1",
          sourceType: "page",
          title: "Fictional Page",
        }),
        snapshotItem({
          normalizedHash: sha256Utf8Hex("Original assignment"),
          ordinal: 2,
          sourceObjectId: "assignment-1",
          sourceType: "assignment",
          title: "Fictional Assignment",
        }),
      ],
    });

    const result = await readReviewerSourceStatus({
      checkedAt: LATER,
      client: fake.client,
      reviewerId: REVIEWER_ID,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        overallStatus: "changed",
        regenerationReadiness: "ready_with_changes",
        counts: {
          changed: 1,
          current: 1,
          total: 2,
        },
        actions: ["sync_canvas_course"],
        items: [
          { ordinal: 1, sourceType: "page", status: "current" },
          {
            action: "sync_canvas_course",
            ordinal: 2,
            sourceType: "assignment",
            status: "changed",
          },
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain("normalized_content_sha256");
    expect(JSON.stringify(result)).not.toContain(SNAPSHOT_ID);
    expect(JSON.stringify(result)).not.toContain("Current page");
  });

  it("reports missing_after_sync only after authoritative later course evidence", async () => {
    const fake = createFakeStatusClient({
      canvas_pages: [],
      canvas_sync_course_results: [
        courseResultRow({ status: "succeeded" }),
      ],
      canvas_sync_runs: [syncRunRow({ completedAt: LATER, status: "succeeded" })],
      reviewer_source_snapshot_items: [
        snapshotItem({
          normalizedHash: sha256Utf8Hex("Missing page"),
          ordinal: 1,
          sourceObjectId: "missing-page",
          sourceType: "page",
          title: "Fictional Missing Page",
        }),
      ],
    });

    const result = await readReviewerSourceStatus({
      client: fake.client,
      reviewerId: REVIEWER_ID,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        overallStatus: "attention_required",
        regenerationReadiness: "blocked_missing_sources",
        counts: { missingAfterSync: 1 },
        actions: ["choose_replacement_source"],
        items: [
          {
            status: "missing_after_sync",
            message: "This source was not found after the latest complete synchronization.",
          },
        ],
      },
    });
  });

  it.each([
    [
      "partial sync",
      [syncRunRow({ completedAt: LATER, status: "partial" })],
      [courseResultRow({ status: "failed" })],
    ],
    [
      "failed sync",
      [syncRunRow({ completedAt: LATER, status: "failed" })],
      [courseResultRow({ status: "failed" })],
    ],
    [
      "older sync",
      [syncRunRow({ completedAt: EARLIER, status: "succeeded" })],
      [courseResultRow({ status: "succeeded" })],
    ],
  ])("keeps missing rows unknown after %s", async (_label, syncRuns, results) => {
    const fake = createFakeStatusClient({
      canvas_course_sync_states: [syncStateRow({ lastSuccessfulSyncAt: EARLIER })],
      canvas_pages: [],
      canvas_sync_course_results: results,
      canvas_sync_runs: syncRuns,
      reviewer_source_snapshot_items: [
        snapshotItem({
          normalizedHash: sha256Utf8Hex("Missing page"),
          ordinal: 1,
          sourceObjectId: "missing-page",
          sourceType: "page",
          title: "Fictional Missing Page",
        }),
      ],
    });

    const result = await readReviewerSourceStatus({
      client: fake.client,
      reviewerId: REVIEWER_ID,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        overallStatus: "unknown",
        regenerationReadiness: "unknown",
        counts: { unknown: 1 },
        items: [{ status: "unknown" }],
      },
    });
  });

  it("reports unsupported, unavailable, and unprepared changed files safely", async () => {
    const fake = createFakeStatusClient({
      canvas_files: [
        fileRow({
          canvasFileId: "file-unsupported",
          contentType: "application/msword",
          displayName: "Fictional unsupported.doc",
        }),
        fileRow({
          availabilityStatus: "unavailable",
          canvasFileId: "file-unavailable",
          contentType: "application/pdf",
          currentSha256: "b".repeat(64),
          displayName: "Fictional unavailable.pdf",
        }),
        fileRow({
          canvasFileId: "file-changed",
          contentType: "image/png",
          currentSha256: "c".repeat(64),
          displayName: "Fictional changed.png",
        }),
      ],
      reviewer_source_snapshot_items: [
        snapshotItem({
          ordinal: 1,
          sourceObjectId: "file-unsupported",
          sourceType: "file",
          storedHash: "a".repeat(64),
          title: "Fictional unsupported.doc",
        }),
        snapshotItem({
          ordinal: 2,
          sourceObjectId: "file-unavailable",
          sourceType: "file",
          storedHash: "b".repeat(64),
          title: "Fictional unavailable.pdf",
        }),
        snapshotItem({
          fileKind: "image",
          ordinal: 3,
          sourceObjectId: "file-changed",
          sourceType: "file",
          storedHash: "d".repeat(64),
          title: "Fictional changed.png",
        }),
      ],
    });

    const result = await readReviewerSourceStatus({
      client: fake.client,
      reviewerId: REVIEWER_ID,
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        overallStatus: "attention_required",
        regenerationReadiness: "blocked_unavailable_sources",
        counts: {
          changed: 1,
          unavailable: 1,
          unsupported: 1,
        },
        actions: [
          "check_canvas_access",
          "prepare_updated_file",
          "unsupported_source_type",
        ],
        items: [
          { status: "unsupported", action: "unsupported_source_type" },
          { status: "unavailable", action: "check_canvas_access" },
          { status: "changed", action: "prepare_updated_file" },
        ],
      },
    });
  });

  it("denies cross-user reviewers through owner-scoped reads", async () => {
    const fake = createFakeStatusClient({
      reviewers: [reviewerRow({ userId: OTHER_USER_ID })],
    });

    await expect(
      readReviewerSourceStatus({
        client: fake.client,
        reviewerId: REVIEWER_ID,
        userId: USER_ID,
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "reviewer_not_found",
      status: 404,
    });
  });

  it("handles historical reviewers without source snapshots safely", async () => {
    const fake = createFakeStatusClient({
      reviewers: [reviewerRow({ sourceSnapshotId: null })],
    });

    await expect(
      readReviewerSourceStatus({
        checkedAt: LATER,
        client: fake.client,
        reviewerId: REVIEWER_ID,
        userId: USER_ID,
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        checkedAt: LATER,
        overallStatus: "unknown",
        regenerationReadiness: "unknown",
        counts: { total: 0 },
        items: [],
      },
    });
  });
});

type FakeRecord = Record<string, unknown>;

interface FakeQueryResult {
  readonly data: unknown;
  readonly error: null;
}

class FakeSupabaseQuery implements PromiseLike<FakeQueryResult> {
  private readonly filters: Array<(row: FakeRecord) => boolean> = [];
  private limitCount: number | null = null;
  private readonly orders: Array<{
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst: boolean;
  }> = [];

  public constructor(private readonly rows: readonly FakeRecord[]) {}

  public select(_columns: string): this {
    return this;
  }

  public eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  public neq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  public order(
    column: string,
    options: { readonly ascending?: boolean; readonly nullsFirst?: boolean } = {},
  ): this {
    this.orders.push({
      ascending: options.ascending ?? true,
      column,
      nullsFirst: options.nullsFirst ?? false,
    });
    return this;
  }

  public limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  public async maybeSingle(): Promise<FakeQueryResult> {
    const rows = this.executeRows();
    return { data: rows[0] ?? null, error: null };
  }

  public then<TResult1 = FakeQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: FakeQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({ data: this.executeRows(), error: null }).then(
      onfulfilled,
      onrejected,
    );
  }

  private executeRows(): readonly FakeRecord[] {
    const filtered = this.rows.filter((row) =>
      this.filters.every((filter) => filter(row)),
    );
    const ordered = filtered.slice().sort((left, right) =>
      compareByOrders(left, right, this.orders),
    );
    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }
}

function createFakeStatusClient(
  overrides: Partial<Record<string, readonly FakeRecord[]>> = {},
): { readonly client: SupabaseClient<Database> } {
  const tables = {
    ...baseStatusTables(),
    ...overrides,
  };
  return {
    client: {
      from: (tableName: string) =>
        new FakeSupabaseQuery(tables[tableName] ?? []),
    } as unknown as SupabaseClient<Database>,
  };
}

function baseStatusTables(): Record<string, readonly FakeRecord[]> {
  return {
    canvas_announcements: [],
    canvas_assignments: [],
    canvas_course_sync_states: [syncStateRow({ lastSuccessfulSyncAt: null })],
    canvas_files: [],
    canvas_pages: [],
    canvas_sync_course_results: [],
    canvas_sync_runs: [],
    reviewer_source_snapshot_items: [],
    reviewer_source_snapshots: [snapshotRow()],
    reviewers: [reviewerRow({})],
  };
}

function compareByOrders(
  left: FakeRecord,
  right: FakeRecord,
  orders: readonly {
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst: boolean;
  }[],
): number {
  for (const order of orders) {
    const comparison = compareFakeValues(
      left[order.column],
      right[order.column],
      order.nullsFirst,
    );
    if (comparison !== 0) {
      return order.ascending ? comparison : -comparison;
    }
  }
  return 0;
}

function compareFakeValues(
  left: unknown,
  right: unknown,
  nullsFirst: boolean,
): number {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;
  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) return 0;
    return leftMissing === nullsFirst ? -1 : 1;
  }
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function reviewerRow({
  sourceSnapshotId = SNAPSHOT_ID,
  userId = USER_ID,
}: {
  readonly sourceSnapshotId?: string | null;
  readonly userId?: string;
}) {
  return {
    id: REVIEWER_ID,
    user_id: userId,
    source_snapshot_id: sourceSnapshotId,
    source_metadata: { sourceMode: "canvas" },
    created_at: NOW,
    updated_at: NOW,
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
    source_count: 1,
    normalization_version: "canvas-source-preview-v1",
    created_at: NOW,
  };
}

function snapshotItem({
  fileKind = null,
  normalizedHash = sha256Utf8Hex("snapshot"),
  ordinal,
  sourceObjectId,
  sourceType,
  storedHash = null,
  title,
}: {
  readonly fileKind?: "pdf" | "image" | null;
  readonly normalizedHash?: string;
  readonly ordinal: number;
  readonly sourceObjectId: string | null;
  readonly sourceType: "page" | "assignment" | "announcement" | "file";
  readonly storedHash?: string | null;
  readonly title: string;
}) {
  return {
    id: `77777777-7777-4777-8777-77777777777${ordinal}`,
    user_id: USER_ID,
    source_snapshot_id: SNAPSHOT_ID,
    ordinal,
    source_type: sourceType,
    source_title: title,
    source_row_id: null,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_course_id: "101",
    canvas_source_object_id: sourceObjectId,
    module_id: null,
    module_item_id: null,
    file_id: sourceType === "file" ? sourceObjectId : null,
    file_kind: fileKind,
    mime_type: null,
    page_count: null,
    canvas_updated_at: NOW,
    local_synced_at: NOW,
    normalized_content_sha256: normalizedHash,
    stored_content_sha256: storedHash,
    parser_version: "canvas-html-visible-text-v1",
    ocr_version: null,
    created_at: NOW,
  };
}

function pageRow({
  bodyHtml,
  canvasPageId,
}: {
  readonly bodyHtml: string | null;
  readonly canvasPageId: string;
}) {
  return {
    id: "88888888-8888-4888-8888-888888888881",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_page_id: canvasPageId,
    canvas_page_url: canvasPageId,
    title: "Fictional Page",
    body_html: bodyHtml,
    published: true,
    front_page: false,
    editing_roles: null,
    lock_info: null,
    unlock_at: null,
    lock_at: null,
    canvas_created_at: NOW,
    canvas_updated_at: NOW,
    first_synced_at: NOW,
    last_synced_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function assignmentRow({
  canvasAssignmentId,
  descriptionHtml,
}: {
  readonly canvasAssignmentId: string;
  readonly descriptionHtml: string | null;
}) {
  return {
    id: "88888888-8888-4888-8888-888888888882",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    assignment_group_id: null,
    canvas_assignment_id: canvasAssignmentId,
    canvas_assignment_group_id: null,
    name: "Fictional Assignment",
    description_html: descriptionHtml,
    position: null,
    points_possible: null,
    grading_type: null,
    submission_types: [],
    due_at: null,
    unlock_at: null,
    lock_at: null,
    published: true,
    muted: false,
    omit_from_final_grade: false,
    anonymous_grading: false,
    html_url: null,
    quiz_id: null,
    discussion_topic_id: null,
    canvas_created_at: NOW,
    canvas_updated_at: NOW,
    first_synced_at: NOW,
    last_synced_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function fileRow({
  availabilityStatus = "available",
  canvasFileId,
  contentType,
  currentSha256 = "a".repeat(64),
  displayName,
}: {
  readonly availabilityStatus?: string;
  readonly canvasFileId: string;
  readonly contentType: string;
  readonly currentSha256?: string | null;
  readonly displayName: string;
}) {
  return {
    id: `file-row-${canvasFileId}`,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_course_id: "101",
    canvas_file_id: canvasFileId,
    folder_id: null,
    display_name: displayName,
    filename: displayName.toLowerCase().replace(/\s+/g, "-"),
    content_type: contentType,
    size_bytes: 1024,
    locked: false,
    hidden: false,
    hidden_for_user: false,
    visibility_level: null,
    media_class: null,
    media_entry_id: null,
    canvas_created_at: NOW,
    canvas_updated_at: NOW,
    canvas_modified_at: NOW,
    lock_at: null,
    unlock_at: null,
    metadata_fingerprint: "metadata",
    content_version_fingerprint: "content",
    ingestion_eligibility:
      contentType === "application/pdf" ? "eligible_document" : "eligible_image",
    ingestion_status: "not_requested",
    current_sha256: currentSha256,
    stored_content_type: contentType,
    stored_byte_count: null,
    storage_bucket: null,
    storage_object_key: null,
    availability_status: availabilityStatus,
    first_synced_at: NOW,
    last_synced_at: NOW,
    last_successful_inventory_at: NOW,
    last_successful_ingestion_at: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function syncRunRow({
  completedAt,
  status,
}: {
  readonly completedAt: string;
  readonly status: string;
}) {
  return {
    id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    scope_course_id: COURSE_ID,
    sync_mode: "course",
    status,
    started_at: completedAt,
    completed_at: completedAt,
    heartbeat_at: completedAt,
    discovered_course_count: 1,
    successful_course_count: status === "succeeded" ? 1 : 0,
    failed_course_count: status === "succeeded" ? 0 : 1,
    resource_counts: {},
    failure_code: status === "succeeded" ? null : "canvas_partial",
    failure_summary: null,
    created_at: completedAt,
    updated_at: completedAt,
  };
}

function courseResultRow({ status }: { readonly status: string }) {
  return {
    id: "99999999-9999-4999-8999-999999999999",
    sync_run_id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_fingerprint: "fingerprint",
    status,
    failure_code: status === "succeeded" ? null : "canvas_partial",
    failed_operation: status === "succeeded" ? null : "pages",
    failure_category: status === "succeeded" ? null : "partial",
    http_status_class: "none",
    retryable: status !== "succeeded",
    retry_count: 0,
    duration_ms: 10,
    created_at: LATER,
    updated_at: LATER,
  };
}

function syncStateRow({
  lastSuccessfulSyncAt,
}: {
  readonly lastSuccessfulSyncAt: string | null;
}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    course_id: COURSE_ID,
    snapshot_fingerprint: "fingerprint",
    fingerprint_version: "v1",
    last_checked_at: lastSuccessfulSyncAt,
    last_changed_at: lastSuccessfulSyncAt,
    last_successful_sync_at: lastSuccessfulSyncAt,
    consecutive_failure_count: 0,
    last_failure_code: null,
    created_at: NOW,
    updated_at: NOW,
  };
}
