import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260827155438_task_study_plan_foundation.sql",
  ),
  "utf8",
).toLowerCase();

describe("R5 task and study-plan database contract", () => {
  it("creates only the three minimal owner-domain tables", () => {
    for (const table of ["tasks", "study_plans", "study_sessions"]) {
      expect(migration).toContain(`create table public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
      expect(migration).toContain(`grant select, insert, update, delete on table public.${table}`);
    }
  });

  it("installs SELECT/INSERT/UPDATE/DELETE owner policies with safe update checks", () => {
    for (const table of ["tasks", "study_plans", "study_sessions"]) {
      for (const operation of ["select", "insert", "update", "delete"]) {
        expect(migration).toContain(`create policy ${table}_${operation}_own`);
      }
    }
    expect(migration.match(/\(select auth\.uid\(\)\) = user_id/g)?.length).toBeGreaterThanOrEqual(15);
    expect(slicePolicy("tasks_update_own")).toContain("with check ((select auth.uid()) = user_id)");
    expect(slicePolicy("study_sessions_update_own")).toContain(
      "with check ((select auth.uid()) = user_id)",
    );
  });

  it("enforces status, priority, estimates, completion, provenance, and intervals", () => {
    for (const constraint of [
      "tasks_status_allowed",
      "tasks_priority_allowed",
      "tasks_estimate_valid",
      "tasks_completion_consistent",
      "tasks_canvas_provenance_consistent",
      "study_plans_range_valid",
      "study_sessions_interval_valid",
    ]) {
      expect(migration).toContain(`constraint ${constraint}`);
    }
    expect(migration).toContain("foreign key (task_id, user_id)");
    expect(migration).toContain("foreign key (study_plan_id, user_id)");
    expect(migration).toContain("create index tasks_canvas_assignment_row_idx");
    expect(migration).toContain("create index study_sessions_task_idx");
    expect(migration).toContain("create index study_sessions_plan_idx");
  });

  it("imports only persisted owned Canvas rows and is idempotent without updating edits", () => {
    const importFunction = sliceFunction("import_canvas_assignments_as_tasks_v1");
    expect(importFunction).toContain("from public.canvas_assignments assignment");
    expect(importFunction).toContain("assignment.user_id = p_user_id");
    expect(importFunction).toContain("canvas_assignment_not_found");
    expect(importFunction).toContain("on conflict (");
    expect(importFunction).toContain("do nothing");
    expect(importFunction).not.toContain("http");
    expect(importFunction).not.toContain("net.");
    expect(migration).toContain("create unique index tasks_canvas_assignment_unique");
  });

  it("applies plans and sessions inside one transaction with foreign-task rejection", () => {
    const applyFunction = sliceFunction("apply_study_plan_v1");
    expect(applyFunction).toContain("left join public.tasks task");
    expect(applyFunction).toContain("task.user_id = p_user_id");
    expect(applyFunction).toContain("task.status = 'pending'");
    expect(applyFunction).toContain("study_plan_session_invalid");
    expect(applyFunction.indexOf("insert into public.study_plans")).toBeLessThan(
      applyFunction.indexOf("insert into public.study_sessions"),
    );
  });

  it("keeps import/apply RPCs service-only and security-invoker", () => {
    for (const name of [
      "import_canvas_assignments_as_tasks_v1",
      "apply_study_plan_v1",
    ]) {
      const fn = sliceFunction(name);
      expect(fn).toContain("security invoker");
      expect(migration).toContain(`grant execute on function public.${name}`);
    }
    expect(migration).toMatch(/apply_study_plan_v1\([\s\S]*?\) from public, anon, authenticated/);
  });
});

function sliceFunction(name: string): string {
  const start = migration.indexOf(`function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  return migration.slice(start, end);
}

function slicePolicy(name: string): string {
  const start = migration.indexOf(`create policy ${name}`);
  const end = migration.indexOf(";", start);
  return migration.slice(start, end);
}
