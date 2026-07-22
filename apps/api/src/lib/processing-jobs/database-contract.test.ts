import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260722225243_durable_processing_jobs.sql",
  ),
  "utf8",
);

describe("processing-job database contract", () => {
  it("claims queued jobs atomically and skips rows already locked by another worker", () => {
    expect(migration).toMatch(/for update skip locked/i);
    expect(migration).toMatch(/lease_owner\s*=\s*p_worker_id/i);
    expect(migration).toMatch(/lease_expires_at\s*=\s*p_now\s*\+/i);
  });

  it("requires the active lease owner for worker mutations and finalization", () => {
    expect(countMatches(migration, /lease_owner\s*=\s*p_worker_id/gi)).toBeGreaterThanOrEqual(2);
    expect(migration).toMatch(/lease_owner is distinct from p_worker_id/i);
  });

  it("stores a result before marking a job succeeded in one database function", () => {
    const completeFunction = sliceFunction("complete_processing_job", "fail_processing_job");
    expect(completeFunction.indexOf("insert into public.processing_job_results")).toBeGreaterThan(-1);
    expect(completeFunction.indexOf("status = 'succeeded'")).toBeGreaterThan(
      completeFunction.indexOf("insert into public.processing_job_results"),
    );
    expect(completeFunction).toMatch(/v_job\.status <> 'running'/i);
  });

  it("recovers expired leases with bounded attempts and terminal exhaustion", () => {
    const recovery = sliceFunction("recover_stale_processing_jobs", "revoke all on function");
    expect(recovery).toMatch(/lease_expires_at\s*<=\s*p_now/i);
    expect(recovery).toMatch(/attempt_count\s*<\s*job\.max_attempts/i);
    expect(recovery).toMatch(/attempt_count\s*>=\s*job\.max_attempts/i);
    expect(recovery).toMatch(/status\s*=\s*'failed'/i);
  });

  it("records explicit cancellation and prevents a cancelled job from completing", () => {
    const cancellation = sliceFunction(
      "request_processing_job_cancellation",
      "retry_processing_job",
    );
    expect(cancellation).toMatch(/status\s*=\s*'cancellation_requested'/i);
    expect(cancellation).toMatch(/cancellation_requested_at\s*=\s*coalesce/i);
    const completion = sliceFunction("complete_processing_job", "fail_processing_job");
    expect(completion).toMatch(/v_job\.status <> 'running'/i);
  });

  it("allows user retry only for failed retryable work and links a child job", () => {
    const retry = sliceFunction("retry_processing_job", "recover_stale_processing_jobs");
    expect(retry).toMatch(/v_original\.status <> 'failed'/i);
    expect(retry).toMatch(/not v_original\.retryable/i);
    expect(retry).toMatch(/retry_of_job_id/i);
    expect(retry).toMatch(/v_original\.source_snapshot_id/i);
  });

  it("keeps client ownership read-only and worker functions service-only", () => {
    expect(migration).toMatch(/using \(\(select auth\.uid\(\)\) = user_id\)/i);
    expect(migration).toMatch(/grant select on table public\.processing_jobs to authenticated/i);
    expect(migration).toMatch(/revoke all on table public\.processing_jobs from anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.claim_processing_jobs[\s\S]*to service_role/i);
  });
});

function sliceFunction(startName: string, endMarker: string): string {
  const start = migration.indexOf(`function public.${startName}`);
  const end = migration.indexOf(endMarker, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}
