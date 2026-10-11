import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loadOwnedPlannerTasks } from "./task-planning-repository";

function mockClient(submissionError = false) {
  const queries: { table: string; filters: [string, unknown][]; columns: string }[] = [];
  const assignmentIds = [null, "submitted", "graded", "paper", "missing", "reopened"];
  const tasks = assignmentIds.map((assignment, index) => ({
    id: `task-${index}`, title: `Work ${index}`, canvas_assignment_row_id: assignment,
    user_id: "owner", source_type: assignment ? "canvas" : "manual", status: "pending",
    due_at: null, estimated_minutes: 30, priority: "medium", created_at: "2026-10-11T00:00:00Z",
  }));
  const submissions = [
    { assignment_id: "submitted", submitted_at: "2026-10-10T00:00:00Z", excused: false, workflow_state: "submitted", missing: false },
    { assignment_id: "graded", submitted_at: null, excused: false, workflow_state: "graded", missing: false },
    { assignment_id: "paper", submitted_at: null, excused: false, workflow_state: "unsubmitted", missing: false },
    { assignment_id: "missing", submitted_at: null, excused: false, workflow_state: "graded", missing: true },
    { assignment_id: "reopened", submitted_at: "2026-10-10T00:00:00Z", excused: false, workflow_state: "unsubmitted", missing: true },
  ].map(row => ({ ...row, user_id: "owner", course_id: "course", canvas_connection_id: "connection" }));
  const rows: Record<string, readonly Record<string, unknown>[]> = {
    tasks,
    canvas_assignment_submissions: [...submissions, { ...submissions[0], user_id: "other", assignment_id: "paper" }],
    canvas_assignments: assignmentIds.flatMap((id, index) => id ? [{
      id, user_id: "owner", course_id: "course", canvas_connection_id: "connection",
      name: `Work ${index}`, due_at: null, submission_types: ["on_paper"], published: true,
    }] : []),
    canvas_courses: [{ id: "course", user_id: "owner", canvas_connection_id: "connection", name: "Course", course_code: "TEST", workflow_state: "available", end_at: null }],
    canvas_course_sync_preferences: [{ user_id: "owner", canvas_connection_id: "connection", course_id: "course", selected: true }],
  };
  const client = {
    from(table: string) {
      const query = { table, filters: [] as [string, unknown][], columns: "" };
      queries.push(query);
      const builder = {
        select(columns: string) { query.columns = columns; return builder; },
        eq(column: string, value: unknown) { query.filters.push([column, value]); return builder; },
        in(column: string, value: unknown) { query.filters.push([column, value]); return builder; },
        order() { return builder; },
        range() { return builder; },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({
            data: rows[table] ?? [],
            error: table === "canvas_assignment_submissions" && submissionError ? { message: "private storage detail" } : null,
          }).then(resolve);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, queries };
}

describe("planner tasks use synced Canvas submission evidence", () => {
  it("includes local and unsubmitted paper work, but excludes handed-in and graded work", async () => {
    const { client, queries } = mockClient();
    const result = await loadOwnedPlannerTasks(client, "owner", ["task-0", "task-1", "task-2", "task-3", "task-4"]);
    expect(result.map(task => task.id)).toEqual(["task-0", "task-3", "task-4"]);
    for (const query of queries) expect(query.filters).toContainEqual(["user_id", "owner"]);
    expect(result[0]).toEqual({ id: "task-0", title: "Work 0", dueAt: null, estimatedMinutes: 30, priority: "medium", createdAt: "2026-10-11T00:00:00Z" });
  });

  it("fails safely when submission evidence cannot be read", async () => {
    const { client } = mockClient(true);
    await expect(loadOwnedPlannerTasks(client, "owner")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("keeps explicitly reopened work eligible despite an old submitted timestamp", async () => {
    const { client } = mockClient();
    expect((await loadOwnedPlannerTasks(client, "owner", ["task-5"])).map(task => task.id)).toEqual(["task-5"]);
  });

  it("does not query storage for an explicitly empty selection", async () => {
    const { client, queries } = mockClient();
    expect(await loadOwnedPlannerTasks(client, "owner", [])).toEqual([]);
    expect(queries).toEqual([]);
  });
});
