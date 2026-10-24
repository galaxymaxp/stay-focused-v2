import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const OWNER = "owner";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NOW = Date.parse("2026-10-24T08:00:00.000Z");
const RANGE = { startsAt: "2026-10-24T00:00:00.000Z", endsAt: "2026-10-25T00:00:00.000Z" };

interface Query { table: string; columns: string; filters: [string, string, unknown][] }
type Result = { data: unknown; error: { code?: string; message?: string } | null };

function mockClient(rows: Record<string, unknown[]>, failures: Record<string, Result["error"]> = {}) {
  const queries: Query[] = [];
  const client = {
    from(table: string) {
      const query: Query = { table, columns: "", filters: [] };
      queries.push(query);
      const builder = {
        select(columns: string) { query.columns = columns; return builder; },
        eq(column: string, value: unknown) { query.filters.push(["eq", column, value]); return builder; },
        neq(column: string, value: unknown) { query.filters.push(["neq", column, value]); return builder; },
        lt(column: string, value: unknown) { query.filters.push(["lt", column, value]); return builder; },
        gt(column: string, value: unknown) { query.filters.push(["gt", column, value]); return builder; },
        in(column: string, value: unknown) { query.filters.push(["in", column, value]); return builder; },
        order() { return builder; },
        range() { return builder; },
        limit() { return builder; },
        maybeSingle() { return Promise.resolve(resolve()); },
        then(done: (value: Result) => unknown) { return Promise.resolve(resolve()).then(done); },
      };
      const resolve = (): Result => {
        const failure = failures[table] ?? (failures[`${table}:${query.columns}`]);
        if (failure && (!failures[`${table}:once`] || queries.filter((q) => q.table === table).length === 1)) return { data: null, error: failure };
        return { data: rows[table] ?? [], error: null };
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, queries };
}

const library = (n: number, courseId: string | null, extra: Record<string, unknown> = {}) => ({
  id: `artifact:${uuid(n)}`, user_id: OWNER,
  summary: { title: `Reviewer ${n}`, course: courseId ? { id: courseId, code: courseId, name: courseId } : null,
    createdAt: `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`, reviewMinutes: 25, ...extra },
});
const course = (id: string, extra: Record<string, unknown> = {}) => ({
  id, user_id: OWNER, canvas_connection_id: "connection", name: id, course_code: id, workflow_state: "available", end_at: null, ...extra,
});
const assignment = (id: string, courseId: string, dueAt: string) => ({
  id, user_id: OWNER, course_id: courseId, canvas_connection_id: "connection", name: `Assignment ${id}`, due_at: dueAt,
  submission_types: ["online_upload"], published: true,
});

let repository: typeof import("./task-planning-repository");
beforeEach(async () => {
  vi.resetModules();
  repository = await import("./task-planning-repository");
});

function baseRows() {
  return {
    experience_library_v1: [library(1, "bio"), library(2, "chem"), library(3, "chem"), library(4, "past"), library(5, null),
      { ...library(6, "bio"), user_id: "intruder" }],
    canvas_courses: [course("bio"), course("chem"), course("past", { workflow_state: "completed" })],
    canvas_course_sync_preferences: ["bio", "chem"].map((id) => ({ user_id: OWNER, canvas_connection_id: "connection", course_id: id, selected: true })),
    // Chemistry has the nearest upcoming incomplete work, so its reviewers lead.
    canvas_assignments: [assignment("a1", "bio", "2026-10-30T00:00:00.000Z"), assignment("a2", "chem", "2026-10-25T00:00:00.000Z")],
    canvas_assignment_submissions: [], tasks: [],
    reviewer_opens: [{ user_id: OWNER, artifact_id: uuid(3), last_opened_at: "2026-10-20T00:00:00.000Z" }],
    study_sessions: [],
  };
}

describe("reviewer candidates", () => {
  it("orders current-course reviewers by nearest course work, then least recently opened, scoped to the owner", async () => {
    const { client, queries } = mockClient(baseRows());
    const result = await repository.loadOwnedReviewerCandidates(client, OWNER, RANGE, NOW);
    expect(result.map((reviewer) => reviewer.title)).toEqual(["Reviewer 2", "Reviewer 3", "Reviewer 1"]);
    expect(result[0]).toEqual({ id: uuid(2), title: "Reviewer 2", courseId: "chem", estimatedMinutes: 25 });
    for (const query of queries) expect(query.filters).toContainEqual(["eq", "user_id", OWNER]);
    const libraryQuery = queries.find((query) => query.table === "experience_library_v1")!;
    expect(libraryQuery.filters).toEqual(expect.arrayContaining([["eq", "artifact_type", "reviewer"], ["eq", "superseded", false]]));
    const kept = queries.find((query) => query.table === "study_sessions")!;
    expect(kept.filters).toEqual(expect.arrayContaining([["eq", "block_kind", "reviewer"], ["neq", "status", "planned"],
      ["lt", "starts_at", RANGE.endsAt], ["gt", "ends_at", RANGE.startsAt]]));
  });

  it("skips reviewers opened within 24 hours and those with a kept block in the range", async () => {
    const rows = baseRows();
    rows.reviewer_opens.push({ user_id: OWNER, artifact_id: uuid(1), last_opened_at: "2026-10-23T09:00:00.000Z" });
    rows.study_sessions.push({ user_id: OWNER, reviewer_artifact_id: uuid(2), status: "completed" } as never);
    const { client } = mockClient(rows);
    expect((await repository.loadOwnedReviewerCandidates(client, OWNER, RANGE, NOW)).map((reviewer) => reviewer.title)).toEqual(["Reviewer 3"]);
  });

  it("treats missing TP1 tables as no history before the migration, but fails safely on other errors", async () => {
    // Without open history Reviewer 3 counts as never opened, so the newer one leads its course.
    const missing = mockClient(baseRows(), { reviewer_opens: { code: "42P01" }, study_sessions: { code: "42703" } });
    expect((await repository.loadOwnedReviewerCandidates(missing.client, OWNER, RANGE, NOW)).map((reviewer) => reviewer.title))
      .toEqual(["Reviewer 3", "Reviewer 2", "Reviewer 1"]);
    for (const table of ["reviewer_opens", "study_sessions", "experience_library_v1"]) {
      const broken = mockClient(baseRows(), { [table]: { code: "57014", message: "private detail" } });
      await expect(repository.loadOwnedReviewerCandidates(broken.client, OWNER, RANGE, NOW)).rejects.toMatchObject({ code: "task_storage_failed" });
    }
  });
});

describe("reviewer opens", () => {
  it("records through the service-only RPC and reports foreign reviewers as not found", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST202", message: "private" } });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    expect(await repository.recordOwnedReviewerOpen(client, OWNER, uuid(1))).toBe(true);
    expect(rpc).toHaveBeenCalledWith("record_reviewer_open_v1", { p_user_id: OWNER, p_artifact_id: uuid(1) });
    expect(await repository.recordOwnedReviewerOpen(client, OWNER, uuid(2))).toBe(false);
    await expect(repository.recordOwnedReviewerOpen(client, OWNER, uuid(3))).rejects.toMatchObject({ code: "task_storage_failed" });
  });
});

describe("study session reads before and after the TP1 migration", () => {
  const session = (extra: Record<string, unknown> = {}) => ({
    id: uuid(50), user_id: OWNER, study_plan_id: null, task_id: uuid(60), starts_at: "2026-10-24T09:00:00.000Z",
    ends_at: "2026-10-24T09:30:00.000Z", status: "planned", created_at: "2026-10-24T00:00:00.000Z", updated_at: "2026-10-24T00:00:00.000Z", ...extra,
  });

  it("falls back to task-only columns once when the block columns are missing", async () => {
    const embedded = { ...session(), task: { id: uuid(60), title: "Essay", status: "pending", priority: "medium", due_at: null, canvas_course_id: null, source_type: "manual", canvas_assignment_row_id: null } };
    const { client, queries } = mockClient({ study_sessions: [embedded] },
      { "study_sessions:once": { code: "42703" }, study_sessions: { code: "42703", message: "column study_sessions.block_kind does not exist" } });
    const sessions = await repository.listOwnedStudySessions(client, OWNER, { limit: 10 });
    expect(sessions.map(repository.toStudySessionView)).toMatchObject([{ kind: "task", taskId: uuid(60), task: { title: "Essay" } }]);
    const reads = queries.filter((query) => query.table === "study_sessions").map((query) => query.columns);
    expect(reads[0]).toContain("block_kind");
    expect(reads.slice(1).every((columns) => !columns.includes("block_kind"))).toBe(true);
  });

  it("decorates reviewer blocks with their saved reviewer and keeps their own status", async () => {
    const rows = {
      study_sessions: [session({ id: uuid(51), task_id: null, block_kind: "reviewer", reviewer_artifact_id: uuid(1), status: "completed" }),
        session({ id: uuid(52), task_id: null, block_kind: "reviewer", reviewer_artifact_id: uuid(9) })],
      tasks: [],
      experience_library_v1: [library(1, "bio"), { ...library(9, "bio"), user_id: "intruder" }],
    };
    const { client, queries } = mockClient(rows, { "study_sessions:once": { code: "PGRST200" }, study_sessions: { code: "PGRST200" } });
    const sessions = await repository.listOwnedStudySessions(client, OWNER, { limit: 10 });
    // The second block's reviewer is not the owner's (or was deleted): it is not shown.
    expect(sessions.map(repository.toStudySessionView)).toEqual([{
      id: uuid(51), studyPlanId: null, taskId: null, kind: "reviewer", reviewer: { id: `artifact:${uuid(1)}`, title: "Reviewer 1", courseId: "bio" },
      startsAt: "2026-10-24T09:00:00.000Z", endsAt: "2026-10-24T09:30:00.000Z", status: "completed",
      createdAt: "2026-10-24T00:00:00.000Z", updatedAt: "2026-10-24T00:00:00.000Z", task: null,
    }]);
    expect(queries.find((query) => query.table === "experience_library_v1")?.filters).toContainEqual(["in", "id", [`artifact:${uuid(1)}`, `artifact:${uuid(9)}`]]);
  });
});
