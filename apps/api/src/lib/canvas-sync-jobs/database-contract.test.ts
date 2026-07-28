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
const incrementalMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260728201000_canvas_incremental_resumable_sync.sql",
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

  it("keeps checkpoint units and staging service-owned under RLS", () => {
    for (const table of [
      "canvas_sync_job_units",
      "canvas_sync_job_staging",
      "canvas_course_sync_scope_states",
      "canvas_course_item_sync_states",
    ]) {
      expect(incrementalMigration).toContain(`create table public.${table}`);
      expect(incrementalMigration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(incrementalMigration).toMatch(
        new RegExp(
          `revoke all on table public\\.${table}\\s+from public, anon, authenticated`,
        ),
      );
      expect(incrementalMigration).toMatch(
        new RegExp(
          `grant select, insert, update, delete on table public\\.${table}\\s+to service_role`,
        ),
      );
    }
  });

  it("claims units atomically with connection limits and recoverable leases", () => {
    const claim = sliceIncrementalFunction("claim_canvas_sync_job_units_v2");
    expect(claim).toContain("pg_advisory_xact_lock");
    expect(claim).toContain("for update skip locked");
    expect(claim).toContain("3 - v_active");
    expect(claim).toContain("case when v_job_type = 'course_grades' then 2 else 3 end");
    expect(claim).toContain("unit.lease_expires_at <= now()");
    expect(claim).toContain("status = 'queued'");
  });

  it("records observed items before authoritative deletion inference", () => {
    const health = sliceIncrementalFunction(
      "record_canvas_course_sync_health_v2",
    );
    expect(health.indexOf("for v_item in")).toBeLessThan(
      health.indexOf("for v_scope in"),
    );
    expect(health).toContain("state.last_seen_job_id is distinct from v_job.id");
    expect(health).toContain("item_state = 'deleted_from_canvas'");
    expect(health).toContain("get diagnostics v_affected_count = row_count");
  });

  it("stores health and typed results before making a job terminal", () => {
    const completion = sliceIncrementalFunction("complete_canvas_sync_job_v2");
    expect(completion).toContain("result_outcome = p_outcome");
    expect(completion).toContain("result_summary = p_result_summary");
    expect(completion).toContain("status = 'succeeded'");
    expect(completion.indexOf("result_summary = p_result_summary")).toBeLessThan(
      completion.indexOf("where job.id = p_job_id"),
    );
    expect(incrementalMigration).toContain(
      "delete from public.canvas_sync_job_staging stage",
    );
  });

  it("serializes cancellation against the promotion boundary", () => {
    const promotion = sliceIncrementalFunction(
      "begin_canvas_sync_promotion_v2",
    );
    const cancellation = sliceIncrementalFunction(
      "request_canvas_sync_job_cancellation_v1",
    );
    expect(promotion).toContain("stage = 'promoting_scopes'");
    expect(cancellation).toContain(
      "job.stage not in ('promoting_scopes', 'storing_result', 'complete')",
    );
    expect(cancellation).toContain("auth.uid() is distinct from p_user_id");
    expect(cancellation).toContain(
      "coalesce(auth.role(), '') <> 'service_role'",
    );
  });

  it("accepts only owner-created jobs without inventing an initial total", () => {
    const creation = sliceIncrementalFunction("create_canvas_sync_job_v1");
    expect(creation).toContain("auth.uid() is distinct from p_user_id");
    expect(creation).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(creation).not.toContain("request.jwt.claim.role");
    expect(creation).toContain("progress_total_known");
    expect(creation).toContain("null,\n      false,");
  });

  it("reuses fresh successful checkpoints and rebuilds expired retry plans", () => {
    const retry = sliceIncrementalFunction("retry_canvas_sync_job_v2");
    expect(retry).toContain("v_staging_expired");
    expect(retry).toContain("checkpoint_version = 'expired'");
    expect(retry).toContain("attempt_count = 0");
    expect(retry).toContain("status = 'queued'");
    expect(retry).toContain("completed_units = (");
    expect(retry).toContain("unit.status in ('succeeded', 'skipped')");
    expect(retry).toContain("progress_total_known = false");
  });

  it("purges expired private staging and sanitizes retained unit audits", () => {
    const purge = sliceIncrementalFunction(
      "purge_expired_canvas_sync_staging_v2",
    );
    expect(purge).toContain("stage.expires_at <= now()");
    expect(purge).toContain("checkpoint_version = 'expired'");
    expect(purge).toContain("checkpoint = '{}'::jsonb");
    expect(purge).toContain("delete from public.canvas_sync_job_staging");
    expect(incrementalMigration).not.toContain(
      "grant execute on function public.purge_expired_canvas_sync_staging_v2(integer) to authenticated",
    );
  });
});

function sliceFunction(name: string): string {
  const start = migration.indexOf(`function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  return migration.slice(start, end);
}

function sliceIncrementalFunction(name: string): string {
  const start = incrementalMigration.indexOf(`function public.${name}`);
  const end = incrementalMigration.indexOf("\n$$;", start);
  return incrementalMigration.slice(start, end);
}
