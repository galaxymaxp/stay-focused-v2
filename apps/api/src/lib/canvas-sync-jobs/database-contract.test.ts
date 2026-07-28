import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260728094421_add_durable_canvas_sync_jobs.sql",
  ),
  "utf8",
).toLowerCase();
const retryMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260728104000_canvas_sync_retry_idempotency.sql",
  ),
  "utf8",
).toLowerCase();

describe("durable Canvas sync database contract", () => {
  it("persists strict job state with owner-only reads", () => {
    expect(migration).toContain("create table public.canvas_sync_jobs");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain(
      "grant select on table public.canvas_sync_jobs to authenticated",
    );
    expect(migration).not.toContain(
      "grant update on table public.canvas_sync_jobs to authenticated",
    );
  });

  it("enforces idempotency and one active course/type job", () => {
    expect(migration).toContain("canvas_sync_jobs_idempotency_unique");
    expect(migration).toContain("canvas_sync_jobs_one_active_per_course_type");
    expect(migration).toContain("canvas_sync_job_idempotency_conflict");
    expect(migration).toContain("canvas_sync_job_in_progress");
  });

  it("stores results before success and prevents cancelled result promotion", () => {
    const completion = sliceFunction("complete_canvas_sync_job_v1");
    expect(completion.indexOf("result_summary = case")).toBeLessThan(
      completion.indexOf("where job.id"),
    );
    expect(completion).toContain(
      "when job.status = 'cancellation_requested' then null",
    );
    expect(completion).toContain("else 'succeeded'");
  });

  it("supports workflow dispatch, retry, cancellation, and stale operation recovery", () => {
    for (const name of [
      "prepare_canvas_sync_job_workflow_dispatch_v1",
      "attach_canvas_sync_job_workflow_v1",
      "request_canvas_sync_job_cancellation_v1",
      "retry_canvas_sync_job_v1",
      "recover_stale_canvas_sync_operation_v1",
    ]) {
      expect(migration).toContain(`function public.${name}`);
    }
    expect(migration).toContain("p_stale_after_seconds integer default 300");
    expect(retryMigration).toContain("retry_idempotency_key");
    expect(retryMigration).toContain("function public.retry_canvas_sync_job_v2");
    expect(retryMigration).toContain(
      "if v_job.retry_idempotency_key = v_key then",
    );
  });
});

function sliceFunction(name: string): string {
  const start = migration.indexOf(`function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  return migration.slice(start, end);
}
