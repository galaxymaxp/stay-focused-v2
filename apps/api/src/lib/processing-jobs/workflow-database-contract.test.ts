import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260727103552_vercel_workflow_processing.sql",
  ),
  "utf8",
);

describe("Vercel Workflow processing database contract", () => {
  it("stores workflow ownership and private durable checkpoints", () => {
    expect(migration).toMatch(/add column execution_backend text not null/i);
    expect(migration).toMatch(/add column workflow_run_id text/i);
    expect(migration).toMatch(
      /create unique index processing_jobs_workflow_run_unique/i,
    );
    expect(migration).toMatch(
      /create table public\.processing_job_checkpoints[\s\S]*unique \(job_id, checkpoint_key\)/i,
    );
  });

  it("keeps checkpoints and worker state service-only", () => {
    expect(migration).toMatch(
      /revoke all on table public\.processing_job_checkpoints from anon, authenticated/i,
    );
    for (const functionName of [
      "attach_processing_job_workflow_v1",
      "prepare_processing_job_workflow_dispatch_v1",
      "claim_processing_job_by_id_v1",
      "mark_processing_job_dispatch_failed_v1",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `revoke all on function public\\.${functionName}[\\s\\S]*?to service_role`,
          "i",
        ),
      );
    }
  });

  it("claims one workflow job atomically by ID and lease owner", () => {
    const claim = sliceFunction(
      "claim_processing_job_by_id_v1",
      "mark_processing_job_dispatch_failed_v1",
    );
    expect(claim).toMatch(/job\.execution_backend = 'vercel_workflow'/i);
    expect(claim).toMatch(/job\.status = 'queued'/i);
    expect(claim).toMatch(/attempt_count = job\.attempt_count \+ 1/i);
    expect(claim).toMatch(/lease_owner = p_worker_id/i);
    expect(claim).toMatch(/returning \* into v_job/i);
  });

  it("prevents the polling worker and its recovery loop from racing workflow jobs", () => {
    const pollingClaim = sliceFunction(
      "claim_processing_jobs_v2",
      "recover_stale_processing_jobs",
    );
    const staleRecovery = sliceFunction(
      "recover_stale_processing_jobs",
      "revoke all on function public.attach_processing_job_workflow_v1",
    );
    expect(pollingClaim).toContain(
      "job.execution_backend = 'database_worker'",
    );
    expect(staleRecovery.match(/execution_backend = 'database_worker'/g)?.length)
      .toBeGreaterThanOrEqual(4);
  });
});

function sliceFunction(startName: string, endMarker: string): string {
  const start = migration.indexOf(`function public.${startName}`);
  const end = migration.indexOf(endMarker, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}
