import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  CANVAS_GRADE_LIST_DEFAULT_LIMIT,
  CANVAS_GRADE_LIST_MAX_LIMIT,
  CANVAS_GRADE_SYNC_STALE_AFTER_MS,
  getCanvasCourseGradeSummary,
  getCanvasGradeAssignmentDetail,
  getCanvasGradeSyncStatus,
  listCanvasGradeAssignments,
  parseCanvasGradeListQuery,
} from "@/lib/canvas-grade-read-model";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";
const CONNECTION_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CONNECTION_ID = "11111111-1111-4111-8111-111111111112";
const COURSE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_COURSE_ID = "22222222-2222-4222-8222-222222222223";
const ASSIGNMENT_A_ID = "33333333-3333-4333-8333-333333333331";
const ASSIGNMENT_B_ID = "33333333-3333-4333-8333-333333333332";
const ASSIGNMENT_C_ID = "33333333-3333-4333-8333-333333333333";

describe("canvas grade read model", () => {
  it("parses bounded offset pagination and rejects unsafe query fields", () => {
    expect(parseCanvasGradeListQuery(new URLSearchParams())).toEqual({
      ok: true,
      value: { limit: CANVAS_GRADE_LIST_DEFAULT_LIMIT, offset: 0 },
    });
    expect(parseCanvasGradeListQuery(new URLSearchParams("limit=20&offset=2"))).toEqual({
      ok: true,
      value: { limit: 20, offset: 2 },
    });

    for (const query of [
      "cursor=abc",
      "limit=-1",
      "limit=abc",
      `limit=${CANVAS_GRADE_LIST_MAX_LIMIT + 1}`,
      "offset=-1",
      "offset=1.5",
    ]) {
      const parsed = parseCanvasGradeListQuery(new URLSearchParams(query));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.code).toBe("invalid_request");
      }
    }
  });

  it("returns ordered, paginated assignment DTOs without unsafe fields or Canvas access", async () => {
    const store = createGradeStore();
    store.canvas_assignments.push(
      assignmentRow({
        due_at: null,
        id: ASSIGNMENT_B_ID,
        name: "Fictional Undated Assignment",
      }),
      assignmentRow({
        due_at: "2026-07-09T00:00:00.000Z",
        id: ASSIGNMENT_C_ID,
        name: "Fictional Same Date B",
      }),
      assignmentRow({
        due_at: "2026-07-09T00:00:00.000Z",
        id: ASSIGNMENT_A_ID,
        name: "Fictional Same Date A",
      }),
    );
    store.canvas_assignment_submissions.push(
      submissionRow({
        assignment_id: ASSIGNMENT_B_ID,
        grade: "Hidden residual must not leave the server",
        grade_visibility_state: "hidden",
        normalized_status: "available",
        score: null,
        score_visibility_state: "hidden",
      }),
      submissionRow({
        assignment_id: ASSIGNMENT_C_ID,
        grade: "A",
        grade_visibility_state: "visible",
        normalized_status: "graded",
        score: 91,
        score_visibility_state: "visible",
      }),
      submissionRow({
        assignment_id: ASSIGNMENT_A_ID,
        grade: "",
        grade_visibility_state: "visible",
        normalized_status: "graded",
        score: 0,
        score_visibility_state: "visible",
      }),
    );
    store.canvas_course_grade_sync_states.push(syncStateRow());
    const client = new MockSupabaseClient(store);

    const result = await listCanvasGradeAssignments({
      client: client.asSupabase(),
      courseId: COURSE_ID,
      limit: 2,
      now: new Date("2026-07-08T00:00:00.000Z"),
      offset: 0,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.page).toEqual({
      hasMore: true,
      limit: 2,
      nextOffset: 2,
      offset: 0,
    });
    expect(result.value.items.map((item) => item.id)).toEqual([
      ASSIGNMENT_A_ID,
      ASSIGNMENT_C_ID,
    ]);
    expect(result.value.items[0]?.score).toEqual({ state: "visible", value: 0 });
    expect(result.value.items[0]?.grade).toEqual({ state: "visible", value: "" });
    expect(JSON.stringify(result.value)).not.toContain("Hidden residual");
    expect(JSON.stringify(result.value)).not.toContain("canvas_assignment_id");
    expect(JSON.stringify(result.value)).not.toContain("canvas_connection_id");
    expect(JSON.stringify(result.value)).not.toContain("source_fingerprint");
    expect(client.rpcCalls).toEqual([]);
    expect(client.queries.map((query) => query.table)).toEqual([
      "canvas_connections",
      "canvas_courses",
      "canvas_course_sync_preferences",
      "canvas_course_grade_sync_states",
      "canvas_assignment_submissions",
      "canvas_assignments",
    ]);
    expect(client.queries.every((query) => query.columns !== "*")).toBe(true);
    expect(client.queries.some((query) => query.columns.includes("token_"))).toBe(false);
  });

  it("returns safe empty list and never-synced metadata when no grade rows exist", async () => {
    const client = new MockSupabaseClient(createGradeStore());

    const result = await listCanvasGradeAssignments({
      client: client.asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toEqual([]);
      expect(result.value.sync).toMatchObject({
        status: "never_synced",
        assignmentSubmissionState: "not_started",
        stale: false,
      });
    }
  });

  it("enforces connection, course, selection, and assignment ownership", async () => {
    const missingConnection = createGradeStore();
    missingConnection.canvas_connections = [];
    await expectReadError(missingConnection, COURSE_ID, "canvas_connection_missing", 404);

    const crossUser = createGradeStore();
    crossUser.canvas_courses = [
      {
        canvas_connection_id: CONNECTION_ID,
        id: COURSE_ID,
        user_id: OTHER_USER_ID,
      },
    ];
    await expectReadError(crossUser, COURSE_ID, "canvas_course_not_found", 404);

    const connectionMismatch = createGradeStore();
    connectionMismatch.canvas_courses = [
      {
        canvas_connection_id: OTHER_CONNECTION_ID,
        id: COURSE_ID,
        user_id: USER_ID,
      },
    ];
    await expectReadError(connectionMismatch, COURSE_ID, "canvas_course_not_found", 404);

    const unselected = createGradeStore();
    unselected.canvas_course_sync_preferences = [];
    await expectReadError(unselected, COURSE_ID, "canvas_course_not_selected", 400);

    const store = createGradeStore();
    store.canvas_assignments.push(
      assignmentRow({ course_id: OTHER_COURSE_ID, id: ASSIGNMENT_A_ID }),
    );
    const detail = await getCanvasGradeAssignmentDetail({
      assignmentId: ASSIGNMENT_A_ID,
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });
    expect(detail.ok).toBe(false);
    if (!detail.ok) {
      expect(detail.status).toBe(404);
      expect(detail.code).toBe("canvas_assignment_not_found");
    }
  });

  it("returns safe assignment detail and rejects impossible visible values", async () => {
    const store = createGradeStore();
    store.canvas_assignments.push(assignmentRow({ id: ASSIGNMENT_A_ID }));
    store.canvas_assignment_submissions.push(
      submissionRow({
        assignment_id: ASSIGNMENT_A_ID,
        grade: "Complete",
        grade_matches_current_submission: true,
        grade_visibility_state: "visible",
        late: true,
        late_policy_status: "late",
        normalized_status: "submitted_late",
        score: 10,
        score_visibility_state: "visible",
        seconds_late: 60,
        submission_type: "online_upload",
      }),
    );
    store.canvas_course_grade_sync_states.push(syncStateRow());

    const detail = await getCanvasGradeAssignmentDetail({
      assignmentId: ASSIGNMENT_A_ID,
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(detail.ok).toBe(true);
    if (detail.ok) {
      expect(detail.value).toMatchObject({
        id: ASSIGNMENT_A_ID,
        late: true,
        latePolicyStatus: "late",
        score: { state: "visible", value: 10 },
        submissionType: "online_upload",
      });
      expect(JSON.stringify(detail.value)).not.toContain("body");
      expect(JSON.stringify(detail.value)).not.toContain("rubric");
    }

    store.canvas_assignment_submissions[0] = submissionRow({
      assignment_id: ASSIGNMENT_A_ID,
      score: null,
      score_visibility_state: "visible",
    });
    const invalid = await getCanvasGradeAssignmentDetail({
      assignmentId: ASSIGNMENT_A_ID,
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.code).toBe("canvas_grade_data_unavailable");
    }
  });

  it("maps visible, hidden, empty, and absent course-grade summaries safely", async () => {
    const store = createGradeStore();
    store.canvas_course_grade_summaries.push({
      canvas_connection_id: CONNECTION_ID,
      course_id: COURSE_ID,
      current_grade: "",
      current_grade_visibility_state: "visible",
      current_score: 0,
      current_score_visibility_state: "visible",
      final_grade: "Residual final grade",
      final_grade_visibility_state: "hidden",
      final_score: 98,
      final_score_visibility_state: "hidden",
      id: "44444444-4444-4444-8444-444444444441",
      last_synced_at: "2026-07-08T00:00:00.000Z",
      user_id: USER_ID,
    });
    store.canvas_course_grade_sync_states.push(syncStateRow());

    const summary = await getCanvasCourseGradeSummary({
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });

    expect(summary.ok).toBe(true);
    if (summary.ok) {
      expect(summary.value.currentScore).toEqual({ state: "visible", value: 0 });
      expect(summary.value.currentGrade).toEqual({ state: "visible", value: "" });
      expect(summary.value.finalScore).toEqual({ state: "hidden", value: null });
      expect(summary.value.finalGrade).toEqual({ state: "hidden", value: null });
      expect(JSON.stringify(summary.value)).not.toContain("Residual final grade");
    }

    const noRow = await getCanvasCourseGradeSummary({
      client: new MockSupabaseClient(createGradeStore()).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });
    expect(noRow.ok).toBe(true);
    if (noRow.ok) {
      expect(noRow.value.currentScore).toEqual({
        state: "unknown",
        value: null,
      });
      expect(noRow.value.lastSyncedAt).toBeNull();
    }
  });

  it("computes freshness and sanitizes invalid sync-state values", async () => {
    const store = createGradeStore();
    store.canvas_course_grade_sync_states.push(
      syncStateRow({
        last_failure_code: "canvas_timeout",
        last_successful_sync_at: "2026-07-06T00:00:00.000Z",
        sync_status: "failed",
      }),
    );

    const status = await getCanvasGradeSyncStatus({
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      now: new Date(
        Date.parse("2026-07-06T00:00:00.000Z") +
          CANVAS_GRADE_SYNC_STALE_AFTER_MS +
          1,
      ),
      userId: USER_ID,
    });

    expect(status.ok).toBe(true);
    if (status.ok) {
      expect(status.value).toMatchObject({
        failureCode: "canvas_timeout",
        lastSuccessfulSyncAt: "2026-07-06T00:00:00.000Z",
        stale: true,
        status: "failed",
      });
    }

    store.canvas_course_grade_sync_states[0] = syncStateRow({
      sync_status: "surprising_state" as never,
    });
    const invalid = await getCanvasGradeSyncStatus({
      client: new MockSupabaseClient(store).asSupabase(),
      courseId: COURSE_ID,
      userId: USER_ID,
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.code).toBe("canvas_grade_data_unavailable");
    }
  });
});

async function expectReadError(
  store: GradeStore,
  courseId: string,
  code: string,
  status: number,
): Promise<void> {
  const result = await listCanvasGradeAssignments({
    client: new MockSupabaseClient(store).asSupabase(),
    courseId,
    userId: USER_ID,
  });
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.status).toBe(status);
    expect(result.code).toBe(code);
  }
}

interface GradeStore {
  canvas_assignment_submissions: Record<string, unknown>[];
  canvas_assignments: Record<string, unknown>[];
  canvas_connections: Record<string, unknown>[];
  canvas_course_grade_summaries: Record<string, unknown>[];
  canvas_course_grade_sync_states: Record<string, unknown>[];
  canvas_course_sync_preferences: Record<string, unknown>[];
  canvas_courses: Record<string, unknown>[];
}

function createGradeStore(): GradeStore {
  return {
    canvas_assignment_submissions: [],
    canvas_assignments: [],
    canvas_connections: [
      {
        id: CONNECTION_ID,
        status: "active",
        user_id: USER_ID,
      },
    ],
    canvas_course_grade_summaries: [],
    canvas_course_grade_sync_states: [],
    canvas_course_sync_preferences: [
      {
        course_id: COURSE_ID,
        id: "55555555-5555-4555-8555-555555555551",
        selected: true,
        user_id: USER_ID,
        canvas_connection_id: CONNECTION_ID,
      },
    ],
    canvas_courses: [
      {
        canvas_connection_id: CONNECTION_ID,
        id: COURSE_ID,
        user_id: USER_ID,
      },
    ],
  };
}

function assignmentRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    due_at: "2026-07-10T00:00:00.000Z",
    grading_type: "points",
    id: ASSIGNMENT_A_ID,
    last_synced_at: "2026-07-08T00:00:00.000Z",
    lock_at: null,
    name: "Fictional Assignment",
    points_possible: 10,
    published: true,
    submission_types: ["online_upload"],
    unlock_at: null,
    user_id: USER_ID,
    ...overrides,
  };
}

function submissionRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    absent_after_sync_at: null,
    assignment_id: ASSIGNMENT_A_ID,
    assignment_visible: true,
    attempt: 1,
    canvas_connection_id: CONNECTION_ID,
    course_id: COURSE_ID,
    excused: false,
    grade: null,
    grade_matches_current_submission: null,
    grade_visibility_state: "hidden",
    graded_at: null,
    id: "66666666-6666-4666-8666-666666666661",
    last_synced_at: "2026-07-08T00:00:00.000Z",
    late: false,
    late_policy_status: null,
    missing: false,
    normalized_status: "submitted",
    points_possible_at_sync: 10,
    posted_at: null,
    score: null,
    score_visibility_state: "hidden",
    seconds_late: null,
    submitted_at: "2026-07-08T00:00:00.000Z",
    submission_type: "online_upload",
    user_id: USER_ID,
    workflow_state: "submitted",
    ...overrides,
  };
}

function syncStateRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    assignment_family_state: "succeeded",
    canvas_connection_id: CONNECTION_ID,
    course_grade_summary_family_state: "succeeded",
    course_id: COURSE_ID,
    id: "77777777-7777-4777-8777-777777777771",
    last_checked_at: "2026-07-08T00:00:00.000Z",
    last_completed_snapshot_authoritative: true,
    last_failure_code: null,
    last_successful_sync_at: "2026-07-08T00:00:00.000Z",
    submission_family_state: "succeeded",
    sync_status: "succeeded",
    user_id: USER_ID,
    ...overrides,
  };
}

class MockSupabaseClient {
  public readonly queries: {
    readonly columns: string;
    readonly filters: readonly { readonly column: string; readonly value: unknown }[];
    readonly inFilters: readonly { readonly column: string; readonly values: readonly unknown[] }[];
    readonly table: string;
  }[] = [];

  public readonly rpcCalls: string[] = [];

  public constructor(private readonly store: GradeStore) {}

  public asSupabase(): SupabaseClient<Database> {
    return this as unknown as SupabaseClient<Database>;
  }

  public from(table: keyof GradeStore): MockQuery {
    return new MockQuery(this, table);
  }

  public rpc(name: string): never {
    this.rpcCalls.push(name);
    throw new Error("RPC must not be used by the grade read model.");
  }

  public execute(query: MockQuery): Record<string, unknown>[] {
    this.queries.push({
      columns: query.columns,
      filters: query.filters,
      inFilters: query.inFilters,
      table: query.table,
    });
    return this.store[query.table]
      .filter((row) =>
        query.filters.every((filter) => row[filter.column] === filter.value),
      )
      .filter((row) =>
        query.inFilters.every((filter) =>
          filter.values.includes(row[filter.column]),
        ),
      );
  }
}

class MockQuery implements PromiseLike<{ data: Record<string, unknown>[]; error: null }> {
  public columns = "";
  public readonly filters: { readonly column: string; readonly value: unknown }[] = [];
  public readonly inFilters: {
    readonly column: string;
    readonly values: readonly unknown[];
  }[] = [];

  public constructor(
    private readonly client: MockSupabaseClient,
    public readonly table: keyof GradeStore,
  ) {}

  public select(columns: string): this {
    this.columns = columns;
    return this;
  }

  public eq(column: string, value: unknown): this {
    this.filters.push({ column, value });
    return this;
  }

  public in(column: string, values: readonly unknown[]): this {
    this.inFilters.push({ column, values });
    return this;
  }

  public maybeSingle(): { data: Record<string, unknown> | null; error: null } {
    const rows = this.client.execute(this);
    return { data: rows[0] ?? null, error: null };
  }

  public then<TResult1 = { data: Record<string, unknown>[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((
          value: { data: Record<string, unknown>[]; error: null },
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.client.execute(this),
      error: null,
    }).then(onfulfilled, onrejected);
  }
}
