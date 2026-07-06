import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestCanvasFiles: vi.fn(),
}));

vi.mock("@/lib/canvas-file-ingestion", () => ({
  ingestCanvasFiles: mocks.ingestCanvasFiles,
}));

const { prepareCanvasReviewerSources } = await import("./canvas-reviewer-sources");

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000009";
const CONNECTION_ID = "00000000-0000-4000-8000-000000000002";
const COURSE_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_COURSE_ID = "00000000-0000-4000-8000-000000000004";
const RUN_ID = "00000000-0000-4000-8000-000000000005";
const FILE_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-07-07T00:00:00.000Z";

describe("Canvas reviewer source preparation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ingestCanvasFiles.mockResolvedValue({
      ok: true,
      response: {
        blocked: 0,
        failed: 0,
        metadataOnly: 0,
        ok: true,
        requested: 1,
        results: [
          {
            bytesStored: 1024,
            code: "stored",
            fileId: FILE_ID,
            retryable: false,
            status: "stored",
          },
        ],
        succeeded: 1,
        totalBytesStored: 1024,
        unchanged: 0,
        unavailable: 0,
      },
    });
  });

  it("delegates validated file IDs to the existing ingestion service", async () => {
    const fake = createFakeCanvasClient({
      canvas_files: [baseFileRow()],
    });

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        requested: 1,
        results: [
          {
            code: "stored",
            id: `file:${FILE_ID}`,
            retryable: false,
            status: "ready",
          },
        ],
      },
    });
    expect(mocks.ingestCanvasFiles).toHaveBeenCalledWith({
      client: fake.client,
      fileIds: [FILE_ID],
      userId: USER_ID,
    });
    expect(JSON.stringify(result)).not.toContain("storage_object_key");
    expect(JSON.stringify(result)).not.toContain("current_sha256");
    expect(JSON.stringify(result)).not.toContain("token_ciphertext");
  });

  it.each([
    ["malformed source IDs", ["file:not-a-uuid"], "invalid_request"],
    ["duplicate source IDs", [`file:${FILE_ID}`, `file:${FILE_ID}`], "canvas_source_duplicate"],
    ["non-file source IDs", [`page:${FILE_ID}`], "invalid_request"],
  ])("rejects %s before ingestion", async (_name, sourceIds, code) => {
    const fake = createFakeCanvasClient();

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds,
      userId: USER_ID,
    });

    expect(result).toMatchObject({ ok: false, code });
    expect(mocks.ingestCanvasFiles).not.toHaveBeenCalled();
  });

  it("rejects unselected courses before ingestion", async () => {
    const fake = createFakeCanvasClient({
      canvas_course_sync_preferences: [],
    });

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_course_not_selected",
    });
    expect(mocks.ingestCanvasFiles).not.toHaveBeenCalled();
  });

  it.each([
    [
      "cross-course file",
      {
        ...baseFileRow(),
        course_id: OTHER_COURSE_ID,
      },
    ],
    [
      "cross-user file",
      {
        ...baseFileRow(),
        user_id: OTHER_USER_ID,
      },
    ],
  ])("rejects %s with a safe not-found response", async (_name, file) => {
    const fake = createFakeCanvasClient({
      canvas_files: [file],
    });

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_file_not_found",
    });
    expect(mocks.ingestCanvasFiles).not.toHaveBeenCalled();
  });

  it("rejects unsupported files before ingestion", async () => {
    const fake = createFakeCanvasClient({
      canvas_files: [
        {
          ...baseFileRow(),
          content_type: "text/plain",
          display_name: "Fictional notes.txt",
          filename: "fictional-notes.txt",
          ingestion_eligibility: "metadata_only_unsupported",
          ingestion_status: "metadata_only",
        },
      ],
    });

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_unsupported_file_type",
    });
    expect(mocks.ingestCanvasFiles).not.toHaveBeenCalled();
  });

  it("maps ingestion failures without leaking internals", async () => {
    mocks.ingestCanvasFiles.mockResolvedValue({
      ok: false,
      status: 500,
      code: "canvas_file_ingestion_failed",
      message: "Safe ingestion failure.",
    });
    const fake = createFakeCanvasClient({
      canvas_files: [baseFileRow()],
    });

    const result = await prepareCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_file_ingestion_failed",
      message: "Safe ingestion failure.",
    });
    expect(JSON.stringify(result)).not.toContain("token");
  });
});

type FakeRecord = Readonly<Record<string, unknown>>;

interface FakeCall {
  readonly table: string;
  readonly selectedColumns: string;
}

interface FakeQueryResult {
  readonly data: unknown;
  readonly error: null;
}

class FakeSupabaseQuery implements PromiseLike<FakeQueryResult> {
  private filters: Array<(row: FakeRecord) => boolean> = [];
  private limitCount: number | null = null;
  private orders: Array<{
    readonly column: string;
    readonly ascending: boolean;
    readonly nullsFirst: boolean;
  }> = [];
  private selectedColumns = "*";

  public constructor(
    private readonly tableName: string,
    private readonly rows: readonly FakeRecord[],
    private readonly calls: FakeCall[],
  ) {}

  public select(columns: string): this {
    this.selectedColumns = columns;
    this.calls.push({
      selectedColumns: columns,
      table: this.tableName,
    });
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

  public in(column: string, values: readonly unknown[]): this {
    const allowed = new Set(values);
    this.filters.push((row) => allowed.has(row[column]));
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
    return {
      data: rows[0] ?? null,
      error: null,
    };
  }

  public then<TResult1 = FakeQueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: FakeQueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.executeRows(),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  private executeRows(): readonly FakeRecord[] {
    const filtered = this.rows.filter((row) =>
      this.filters.every((filter) => filter(row)),
    );
    const ordered = [...filtered].sort((left, right) =>
      compareByOrders(left, right, this.orders),
    );
    return this.limitCount === null ? ordered : ordered.slice(0, this.limitCount);
  }
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

function createFakeCanvasClient(
  overrides: Partial<Record<string, readonly FakeRecord[]>> = {},
): {
  readonly calls: readonly FakeCall[];
  readonly client: SupabaseClient<Database>;
} {
  const calls: FakeCall[] = [];
  const tables = {
    ...baseCanvasTables(),
    ...overrides,
  };
  const client = {
    from: (tableName: string) =>
      new FakeSupabaseQuery(tableName, tables[tableName] ?? [], calls),
  } as unknown as SupabaseClient<Database>;

  return { calls, client };
}

function baseCanvasTables(): Record<string, readonly FakeRecord[]> {
  return {
    canvas_connections: [baseConnectionRow()],
    canvas_course_sync_preferences: [basePreferenceRow()],
    canvas_course_sync_states: [baseSyncStateRow()],
    canvas_courses: [baseCourseRow()],
    canvas_files: [baseFileRow()],
    canvas_sync_course_results: [],
    canvas_sync_runs: [baseSyncRunRow()],
  };
}

function baseConnectionRow(): FakeRecord {
  return {
    base_url: "https://canvas.example.invalid",
    canvas_user_email: null,
    canvas_user_id: "fictional-user",
    canvas_user_name: "Fictional Student",
    created_at: NOW,
    id: CONNECTION_ID,
    last_error_code: null,
    last_verified_at: NOW,
    status: "active",
    updated_at: NOW,
    user_id: USER_ID,
  };
}

function baseCourseRow(): FakeRecord {
  return {
    account_id: null,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    canvas_updated_at: NOW,
    course_code: "BIO-FICTION",
    created_at: NOW,
    end_at: null,
    enrollment_term_id: null,
    first_synced_at: NOW,
    id: COURSE_ID,
    last_synced_at: NOW,
    name: "Fictional Biology",
    public_syllabus: null,
    start_at: null,
    syllabus_body: null,
    time_zone: null,
    updated_at: NOW,
    user_id: USER_ID,
    workflow_state: "available",
  };
}

function basePreferenceRow(): FakeRecord {
  return {
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    created_at: NOW,
    display_order: 0,
    id: "00000000-0000-4000-8000-000000000006",
    selected: true,
    selected_at: NOW,
    updated_at: NOW,
    user_id: USER_ID,
  };
}

function baseSyncRunRow(): FakeRecord {
  return {
    canvas_connection_id: CONNECTION_ID,
    completed_at: NOW,
    created_at: NOW,
    discovered_course_count: 1,
    failed_course_count: 0,
    failure_code: null,
    failure_summary: null,
    heartbeat_at: NOW,
    id: RUN_ID,
    resource_counts: {},
    scope_course_id: COURSE_ID,
    started_at: NOW,
    status: "succeeded",
    successful_course_count: 1,
    sync_mode: "course",
    updated_at: NOW,
    user_id: USER_ID,
  };
}

function baseSyncStateRow(): FakeRecord {
  return {
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    consecutive_failure_count: 0,
    course_id: COURSE_ID,
    created_at: NOW,
    fingerprint_version: "v1",
    id: "00000000-0000-4000-8000-000000000007",
    last_changed_at: NOW,
    last_checked_at: NOW,
    last_failure_code: null,
    last_successful_sync_at: NOW,
    snapshot_fingerprint: "fictional-fingerprint",
    updated_at: NOW,
    user_id: USER_ID,
  };
}

function baseFileRow(): FakeRecord {
  return {
    availability_status: "available",
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    canvas_created_at: NOW,
    canvas_file_id: "file-1",
    canvas_modified_at: NOW,
    canvas_updated_at: NOW,
    content_type: "application/pdf",
    content_version_fingerprint: "fictional-content-version",
    course_id: COURSE_ID,
    created_at: NOW,
    current_sha256: null,
    display_name: "Fictional handout.pdf",
    filename: "fictional-handout.pdf",
    first_synced_at: NOW,
    folder_id: null,
    hidden: false,
    hidden_for_user: false,
    id: FILE_ID,
    ingestion_eligibility: "eligible_document",
    ingestion_status: "not_requested",
    last_successful_ingestion_at: null,
    last_successful_inventory_at: NOW,
    last_synced_at: NOW,
    lock_at: null,
    locked: false,
    media_class: null,
    media_entry_id: null,
    metadata_fingerprint: "fictional-metadata",
    size_bytes: 4096,
    storage_bucket: null,
    storage_object_key: null,
    stored_byte_count: null,
    stored_content_type: null,
    unlock_at: null,
    updated_at: NOW,
    user_id: USER_ID,
    visibility_level: null,
  };
}
