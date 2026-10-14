import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
export function estimateStore(size = 1) {
  const tasks: Row[] = Array.from({ length: size }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    user_id: "owner", source_type: "canvas", status: "pending", estimate_source: "default",
    estimate_fingerprint: null, estimated_minutes: 60, updated_at: "2026-10-10T00:00:00Z",
    canvas_assignment_row_id: `assignment-${i}`, due_at: `2026-10-${String(13 + i).padStart(2, "0")}T00:00:00Z`,
  }));
  const assignments: Row[] = tasks.map((t, i) => ({ id: t.canvas_assignment_row_id, user_id: "owner", course_id: "course",
    name: `Assignment ${i}`, description_html: "<p>Complete the quiz.</p>", submission_types: ["online_quiz"], points_possible: 10, grading_type: "points" }));
  const courses: Row[] = [{ id: "course", user_id: "owner", course_code: "CC6", name: "Course" }];
  const tables: Record<string, Row[]> = { tasks, canvas_assignments: assignments, canvas_courses: courses };
  const queries: Query[] = [];
  const state = { recentAi: 0, failTable: "", beforeUpdate: (() => {}) as () => void };
  class Query {
    readonly filters: Array<[string, string, unknown]> = [];
    private updateValue: Row | null = null;
    private head = false;
    private start = 0;
    private end = Infinity;
    private orders: string[] = [];
    constructor(readonly table: string) { queries.push(this); }
    select(_columns: string, options?: { head?: boolean }) { this.head = options?.head ?? false; return this; }
    eq(key: string, value: unknown) { this.filters.push(["eq", key, value]); return this; }
    in(key: string, value: readonly unknown[]) { this.filters.push(["in", key, value]); return this; }
    gte(key: string, value: unknown) { this.filters.push(["gte", key, value]); return this; }
    order(key: string) { this.orders.push(key); return this; }
    range(start: number, end: number) { this.start = start; this.end = end; return this; }
    update(value: Row) { this.updateValue = value; return this; }
    then(resolve: (value: { data: Row[] | null; error: { code: string } | null; count: number | null }) => unknown) {
      if (state.failTable === this.table) return Promise.resolve(resolve({ data: null, error: { code: "private error" }, count: null }));
      if (this.updateValue) state.beforeUpdate();
      let rows = (tables[this.table] ?? []).filter(row => this.filters.every(([op, key, value]) =>
        op === "eq" ? row[key] === value : op === "in" ? (value as readonly unknown[]).includes(row[key]) : String(row[key]) >= String(value)));
      for (const key of [...this.orders].reverse()) rows = [...rows].sort((a, b) => String(a[key] ?? "z").localeCompare(String(b[key] ?? "z")));
      rows = rows.slice(this.start, this.end + 1);
      if (this.updateValue) for (const row of rows) Object.assign(row, this.updateValue);
      return Promise.resolve(resolve({ data: this.head ? null : rows, error: null, count: this.head ? state.recentAi : null }));
    }
  }
  return { tasks, assignments, courses, state, queries,
    client: { from: (table: string) => new Query(table) } as unknown as SupabaseClient<Database>,
  };
}
