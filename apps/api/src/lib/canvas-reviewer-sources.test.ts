import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  CANVAS_REVIEWER_MAX_COMBINED_CHARS,
  CANVAS_REVIEWER_MAX_SOURCES,
  CANVAS_REVIEWER_MAX_SOURCE_CHARS,
  CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
  assembleCanvasSourcePreview,
  buildSuggestedCanvasReviewerTitle,
  getCanvasReviewerSourceLimits,
  listCanvasReviewerSources,
  normalizeCanvasHtmlToText,
  previewCanvasReviewerSources,
  type PreviewSourceRecord,
} from "./canvas-reviewer-sources";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const CONNECTION_ID = "00000000-0000-4000-8000-000000000002";
const COURSE_ID = "00000000-0000-4000-8000-000000000003";
const OTHER_COURSE_ID = "00000000-0000-4000-8000-000000000004";
const RUN_ID = "00000000-0000-4000-8000-000000000005";
const PAGE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PAGE_ID = "11111111-1111-4111-8111-111111111112";
const ASSIGNMENT_ID = "22222222-2222-4222-8222-222222222222";
const ANNOUNCEMENT_ID = "33333333-3333-4333-8333-333333333333";
const FILE_ID = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-07-07T00:00:00.000Z";

describe("Canvas reviewer source normalization", () => {
  it("extracts readable text while preserving block, list, and table boundaries", () => {
    const text = normalizeCanvasHtmlToText(`
      <h1>Module overview</h1>
      <p>Read the chapter &amp; compare ideas.</p>
      <ol><li>First step</li><li>Second step</li></ol>
      <ul><li>Helpful note</li></ul>
      <table><tr><th>Term</th><th>Meaning</th></tr><tr><td>Focus</td><td>Attention</td></tr></table>
    `);

    expect(text).toContain("Module overview");
    expect(text).toContain("Read the chapter & compare ideas.");
    expect(text).toContain("1. First step");
    expect(text).toContain("2. Second step");
    expect(text).toContain("- Helpful note");
    expect(text).toContain("Term | Meaning");
    expect(text).toContain("Focus | Attention");
  });

  it("removes non-visible or executable content and does not include link targets", () => {
    const text = normalizeCanvasHtmlToText(`
      <p>Visible paragraph</p>
      <script>secretScript()</script>
      <style>.private { color: red; }</style>
      <form><input value="hidden form value"></form>
      <p style="display: none">Hidden text</p>
      <a href="https://canvas.example.invalid/files/1?verifier=secret">reading link</a>
      <p>https://canvas.example.invalid/private?token=secret</p>
      <p>Bearer raw-token-value</p>
    `);

    expect(text).toContain("Visible paragraph");
    expect(text).toContain("reading link");
    expect(text).not.toContain("secretScript");
    expect(text).not.toContain("hidden form value");
    expect(text).not.toContain("Hidden text");
    expect(text).not.toContain("https://canvas.example.invalid");
    expect(text).not.toContain("raw-token-value");
    expect(text).toContain("[link removed]");
    expect(text).toContain("Bearer [redacted]");
  });

  it("returns empty text when the body has no readable content", () => {
    expect(normalizeCanvasHtmlToText(null)).toBe("");
    expect(normalizeCanvasHtmlToText("<script>onlyCode()</script>")).toBe("");
  });

  it("assembles selected sources with deterministic visible boundaries only", () => {
    const sourceText = assembleCanvasSourcePreview([
      source("page:11111111-1111-4111-8111-111111111111", "page", "Overview"),
      source(
        "assignment:22222222-2222-4222-8222-222222222222",
        "assignment",
        "Practice",
      ),
    ]);

    expect(sourceText).toContain("SOURCE 1 - PAGE - Overview");
    expect(sourceText).toContain("SOURCE 2 - ASSIGNMENT - Practice");
    expect(sourceText).toContain("Readable study text.");
    expect(sourceText).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(sourceText).not.toContain("22222222-2222-4222-8222-222222222222");
  });

  it("keeps suggested titles bounded and URL-free", () => {
    const title = buildSuggestedCanvasReviewerTitle(
      `Very long course title ${"unit ".repeat(80)} https://canvas.example.invalid`,
    );

    expect(title.length).toBeLessThanOrEqual(
      CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
    );
    expect(title).toContain("Canvas Reviewer");
    expect(title).not.toContain("https://canvas.example.invalid");
  });

  it("keeps preview limits below the existing reviewer request limit", () => {
    expect(getCanvasReviewerSourceLimits()).toMatchObject({
      maximumSources: CANVAS_REVIEWER_MAX_SOURCES,
      maximumCharactersPerSource: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
      maximumCombinedPreviewCharacters: CANVAS_REVIEWER_MAX_COMBINED_CHARS,
      suggestedTitleLimit: CANVAS_REVIEWER_SUGGESTED_TITLE_MAX_CHARS,
    });
    expect(CANVAS_REVIEWER_MAX_COMBINED_CHARS).toBeLessThan(100_000);
  });
});

describe("Canvas reviewer source service", () => {
  it("lists only selected-course descriptors without source bodies", async () => {
    const fake = createFakeCanvasClient();

    const result = await listCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.courseSync).toMatchObject({
      status: "partial",
      latestResultWasPartial: true,
      synchronizedSourcesAvailable: true,
      failureCategories: ["files", "timeout"],
    });
    expect(result.value.availableSourceCount).toBe(3);
    expect(result.value.unavailableSourceCount).toBe(1);
    expect(result.value.sources.map((entry) => entry.id)).toEqual([
      `page:${PAGE_ID}`,
      `assignment:${ASSIGNMENT_ID}`,
      `announcement:${ANNOUNCEMENT_ID}`,
      `file:${FILE_ID}`,
    ]);
    expect(result.value.sources.find((entry) => entry.type === "file")).toMatchObject({
      availability: "unavailable",
      unavailableReason: "Text extraction for this file type is not available yet.",
    });
    expect(JSON.stringify(result.value)).not.toContain("body_html");
    expect(JSON.stringify(result.value)).not.toContain("description_html");
    expect(JSON.stringify(result.value)).not.toContain("message_html");
    expect(fake.selectedColumnsFor("canvas_connections").join(",")).not.toContain(
      "token_ciphertext",
    );
  });

  it("preserves submitted preview order after same-course ownership lookup", async () => {
    const fake = createFakeCanvasClient();

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`assignment:${ASSIGNMENT_ID}`, `page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.sources.map((source) => source.id)).toEqual([
      `assignment:${ASSIGNMENT_ID}`,
      `page:${PAGE_ID}`,
    ]);
    expect(result.value.sourceText.indexOf("SOURCE 1 - ASSIGNMENT")).toBeLessThan(
      result.value.sourceText.indexOf("SOURCE 2 - PAGE"),
    );
    expect(result.value.sourceText).not.toContain(ASSIGNMENT_ID);
    expect(result.value.sourceText).not.toContain(PAGE_ID);
  });

  it("rejects duplicate IDs before reading storage", async () => {
    const fake = createFakeCanvasClient();

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`, `page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_duplicate",
    });
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects cross-course and unsupported source IDs", async () => {
    const fake = createFakeCanvasClient();

    const crossCourse = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${OTHER_PAGE_ID}`],
      userId: USER_ID,
    });
    const file = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`file:${FILE_ID}`],
      userId: USER_ID,
    });

    expect(crossCourse).toMatchObject({
      ok: false,
      code: "canvas_source_not_found",
    });
    expect(file).toMatchObject({
      ok: false,
      code: "canvas_source_unavailable",
    });
  });

  it("returns safe size details without silently truncating large sources", async () => {
    const largePageBody = `<p>${"Large fictional paragraph. ".repeat(900)}</p>`;
    const fake = createFakeCanvasClient({
      canvas_pages: [
        {
          ...basePageRow(),
          body_html: largePageBody,
        },
      ],
    });

    const result = await previewCanvasReviewerSources({
      client: fake.client,
      courseId: COURSE_ID,
      sourceIds: [`page:${PAGE_ID}`],
      userId: USER_ID,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "canvas_source_preview_too_large",
      details: {
        allowedMaximum: CANVAS_REVIEWER_MAX_SOURCE_CHARS,
        selectedSourceCount: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain("Large fictional paragraph");
  });
});

function source(
  id: string,
  type: "page" | "assignment" | "announcement",
  title: string,
): PreviewSourceRecord {
  return {
    descriptor: {
      availability: "available",
      estimatedCharacters: 20,
      id,
      title,
      type,
      unavailableReason: null,
      updatedAt: "2026-07-07T00:00:00.000Z",
    },
    text: "Readable study text.",
  };
}

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
  readonly selectedColumnsFor: (table: string) => readonly string[];
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

  return {
    calls,
    client,
    selectedColumnsFor: (table) =>
      calls
        .filter((call) => call.table === table)
        .map((call) => call.selectedColumns),
  };
}

function baseCanvasTables(): Record<string, readonly FakeRecord[]> {
  return {
    canvas_announcements: [baseAnnouncementRow()],
    canvas_assignments: [baseAssignmentRow()],
    canvas_connections: [baseConnectionRow()],
    canvas_course_sync_preferences: [basePreferenceRow()],
    canvas_course_sync_states: [baseSyncStateRow()],
    canvas_courses: [baseCourseRow()],
    canvas_files: [baseFileRow()],
    canvas_pages: [basePageRow(), baseOtherCoursePageRow()],
    canvas_sync_course_results: [baseCourseResultRow()],
    canvas_sync_runs: [baseSyncRunRow()],
  };
}

function baseConnectionRow(): FakeRecord {
  return {
    id: CONNECTION_ID,
    user_id: USER_ID,
    base_url: "https://canvas.example.invalid",
    canvas_user_id: "fictional-user",
    canvas_user_name: "Fictional Student",
    canvas_user_email: null,
    status: "active",
    last_verified_at: NOW,
    last_error_code: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseCourseRow(): FakeRecord {
  return {
    id: COURSE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    name: "Fictional Biology",
    course_code: "BIO-FICTION",
    workflow_state: "available",
    enrollment_term_id: null,
    account_id: null,
    start_at: null,
    end_at: null,
    time_zone: null,
    public_syllabus: null,
    syllabus_body: null,
    canvas_updated_at: NOW,
    first_synced_at: NOW,
    last_synced_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function basePreferenceRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000006",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    selected: true,
    display_order: 0,
    selected_at: NOW,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseSyncRunRow(): FakeRecord {
  return {
    id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    scope_course_id: COURSE_ID,
    sync_mode: "course",
    status: "partial",
    started_at: NOW,
    completed_at: NOW,
    heartbeat_at: NOW,
    discovered_course_count: 1,
    successful_course_count: 0,
    failed_course_count: 1,
    resource_counts: {},
    failure_code: null,
    failure_summary: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseSyncStateRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000007",
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    canvas_course_id: "101",
    course_id: COURSE_ID,
    snapshot_fingerprint: "fictional-fingerprint",
    fingerprint_version: "v1",
    last_checked_at: NOW,
    last_changed_at: NOW,
    last_successful_sync_at: NOW,
    consecutive_failure_count: 0,
    last_failure_code: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

function baseCourseResultRow(): FakeRecord {
  return {
    id: "00000000-0000-4000-8000-000000000008",
    sync_run_id: RUN_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_fingerprint: "fictional-fingerprint",
    status: "failed",
    failure_code: null,
    failed_operation: "files",
    failure_category: "timeout",
    http_status_class: "none",
    retryable: true,
    retry_count: 1,
    duration_ms: 100,
    created_at: NOW,
    updated_at: NOW,
  };
}

function basePageRow(): FakeRecord {
  return {
    id: PAGE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_page_id: "page-1",
    title: "Fictional Page",
    body_html: "<h1>Overview</h1><p>Readable page text.</p>",
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseOtherCoursePageRow(): FakeRecord {
  return {
    ...basePageRow(),
    id: OTHER_PAGE_ID,
    course_id: OTHER_COURSE_ID,
    title: "Other Fictional Page",
  };
}

function baseAssignmentRow(): FakeRecord {
  return {
    id: ASSIGNMENT_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_assignment_id: "assignment-1",
    assignment_group_id: null,
    name: "Fictional Assignment",
    description_html: "<p>Readable assignment text.</p>",
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseAnnouncementRow(): FakeRecord {
  return {
    id: ANNOUNCEMENT_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_announcement_id: "announcement-1",
    title: "Fictional Announcement",
    message_html: "<p>Readable announcement text.</p>",
    posted_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}

function baseFileRow(): FakeRecord {
  return {
    id: FILE_ID,
    user_id: USER_ID,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    canvas_file_id: "file-1",
    display_name: "Fictional handout.pdf",
    canvas_modified_at: NOW,
    canvas_updated_at: NOW,
    last_synced_at: NOW,
    updated_at: NOW,
  };
}
