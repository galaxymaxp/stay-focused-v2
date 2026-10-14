import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
export const GRADE_OWNER = "11111111-1111-4111-8111-111111111111";
export const GRADE_COURSE = "22222222-2222-4222-8222-222222222222";
export function gradeEstimateStore() {
  const context = { user_id: GRADE_OWNER, canvas_connection_id: "connection", course_id: GRADE_COURSE };
  const tables: Record<string, Record<string, unknown>[]> = {
    canvas_connections: [{ id: "connection", user_id: GRADE_OWNER, status: "active" }],
    canvas_courses: [{ id: GRADE_COURSE, ...context }],
    canvas_course_sync_preferences: [{ id: "preference", ...context, selected: true }],
    canvas_assignment_groups: [{ id: "group", ...context, name: "Coursework", group_weight: 0, rules: {} }],
    canvas_assignments: [{ id: "graded", canvas_assignment_id: "101", ...context, name: "Graded", assignment_group_id: "group", points_possible: 100, published: true, omit_from_final_grade: false, due_at: null },
      { id: "pending", canvas_assignment_id: "102", ...context, name: "Remaining", assignment_group_id: "group", points_possible: 100, published: true, omit_from_final_grade: false, due_at: null }],
    canvas_assignment_submissions: [{ id: "submission", ...context, assignment_id: "graded", score: 80, excused: false, score_visibility_state: "visible", normalized_status: "graded", absent_after_sync_at: null }],
    canvas_course_grade_summaries: [{ ...context, current_score: 80, current_score_visibility_state: "visible" }],
  };
  const state = { failTable: "" };
  const queries: Array<{ table: string; columns?: string; filters: Array<[string, unknown]> }> = [];
  class Query {
    private readonly entry: (typeof queries)[number];
    private start = 0;
    private end = Infinity;
    constructor(private table: string) { this.entry = { table, filters: [] }; queries.push(this.entry); }
    select(columns: string) { this.entry.columns = columns; return this; }
    eq(key: string, value: unknown) { this.entry.filters.push([key, value]); return this; }
    order() { return this; }
    range(start: number, end: number) { this.start = start; this.end = end; return this; }
    private result() {
      const rows = (tables[this.table] ?? []).filter(row => this.entry.filters.every(([key, value]) => row[key] === value)).slice(this.start, this.end + 1);
      return { data: rows, error: state.failTable === this.table ? { message: "private diagnostics" } : null };
    }
    maybeSingle() { const result = this.result(); return { ...result, data: result.data[0] ?? null }; }
    then(resolve: (result: ReturnType<Query["result"]>) => unknown) { return Promise.resolve(resolve(this.result())); }
  }
  return { tables, context, state, queries, client: { from: (table: string) => new Query(table) } as unknown as SupabaseClient<Database> };
}
