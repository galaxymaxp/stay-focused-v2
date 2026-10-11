import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loadOwnedPlannerTasks } from "./task-planning-repository";

function mockClient(submissionError = false) {
  const queries: { table: string; filters: [string, unknown][]; columns: string }[] = [];
  const tasks = [null, "submitted", "graded", "paper", "missing"].map((assignment, index) => ({
    id: `task-${index}`, title: `Work ${index}`, canvas_assignment_row_id: assignment,
    due_at: null, estimated_minutes: 30, priority: "medium", created_at: "2026-10-11T00:00:00Z",
  }));
  const submissions = [
    { assignment_id: "submitted", submitted_at: "2026-10-10T00:00:00Z", excused: false, workflow_state: "unsubmitted", missing: false },
    { assignment_id: "graded", submitted_at: null, excused: false, workflow_state: "graded", missing: false },
    { assignment_id: "paper", submitted_at: null, excused: false, workflow_state: "unsubmitted", missing: false },
    { assignment_id: "missing", submitted_at: null, excused: false, workflow_state: "graded", missing: true },
  ];
  const client = {
    from(table: string) {
      const query = { table, filters: [] as [string, unknown][], columns: "" };
      queries.push(query);
      const builder = {
        select(columns: string) { query.columns = columns; return builder; },
        eq(column: string, value: unknown) { query.filters.push([column, value]); return builder; },
        in(column: string, value: unknown) { query.filters.push([column, value]); return builder; },
        order() { return builder; },
        then(resolve: (value: unknown) => unknown) {
          return Promise.resolve({
            data: table === "tasks" ? tasks : submissions,
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
    expect(queries[0]?.filters).toContainEqual(["status", "pending"]);
    expect(queries[0]?.filters).toContainEqual(["id", ["task-0", "task-1", "task-2", "task-3", "task-4"]]);
    expect(queries[0]?.columns).toContain("canvas_assignment_row_id");
    expect(queries[1]?.filters).toContainEqual(["assignment_id", ["submitted", "graded", "paper", "missing"]]);
    for (const query of queries) expect(query.filters).toContainEqual(["user_id", "owner"]);
    expect(result[0]).toEqual({ id: "task-0", title: "Work 0", dueAt: null, estimatedMinutes: 30, priority: "medium", createdAt: "2026-10-11T00:00:00Z" });
  });

  it("fails safely when submission evidence cannot be read", async () => {
    const { client } = mockClient(true);
    await expect(loadOwnedPlannerTasks(client, "owner")).rejects.toThrow("Tasks could not be prepared for planning.");
  });

  it("does not query storage for an explicitly empty selection", async () => {
    const { client, queries } = mockClient();
    expect(await loadOwnedPlannerTasks(client, "owner", [])).toEqual([]);
    expect(queries).toEqual([]);
  });
});
