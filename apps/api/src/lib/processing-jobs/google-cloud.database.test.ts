import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let db: PGlite;
const jobId = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const workerA = "google-cloud:33333333-3333-4333-8333-333333333333";
const workerB = "google-cloud:44444444-4444-4444-8444-444444444444";
let dispatchId: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.processing_jobs (
      id uuid primary key, user_id uuid not null, execution_backend text not null default 'database_worker',
      workflow_run_id text, workflow_dispatched_at timestamptz,
      status text not null default 'queued', status_message text, failed_at timestamptz,
      error_code text, safe_error_message text, retryable boolean default false,
      attempt_count integer default 0, max_attempts integer default 3,
      updated_at timestamptz default now(), started_at timestamptz,
      lease_owner text, lease_expires_at timestamptz, heartbeat_at timestamptz,
      next_attempt_at timestamptz default now(), expires_at timestamptz default now() + interval '1 hour',
      constraint processing_jobs_execution_backend_check check (execution_backend in ('database_worker','vercel_workflow')),
      constraint processing_jobs_workflow_dispatch_check check (true)
    );
    create table public.processing_job_events (
      job_id uuid, user_id uuid, event_type text, payload jsonb, safe_label text, delivery_key text unique
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant all on processing_jobs, processing_job_events to service_role;
  `);
  const failMigration = readFileSync(resolve(process.cwd(), "../../packages/db/migrations/20260726214339_harden_processing_digest_and_retry_policy.sql"), "utf8");
  const start = failMigration.indexOf("create or replace function public.fail_processing_job_v2(");
  await db.exec(failMigration.slice(start, failMigration.indexOf("$$;", start) + 3));
  await db.exec(readFileSync(resolve(process.cwd(), "../../packages/db/migrations/20260927052634_google_cloud_generation_foundation.sql"), "utf8"));
}, 30_000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec("delete from processing_job_events; delete from processing_jobs;");
  await db.query("insert into processing_jobs(id,user_id) values ($1,$2)", [jobId, owner]);
  const result = await db.query<{ google_dispatch_id: string }>("select * from prepare_google_processing_job_v1($1)", [jobId]);
  dispatchId = result.rows[0]!.google_dispatch_id;
});
async function claim(worker = workerA, token = dispatchId) {
  return (await db.query<{ status: string; lease_owner: string | null; attempt_count: number }>(
    "select * from claim_google_processing_job_v1($1,$2,$3)", [jobId, token, worker])).rows;
}
describe("Google atomic claims and grants (real Postgres)", () => {
  it("reuses dispatch identity across enqueue replay", async () => {
    const result = await db.query<{ google_dispatch_id: string }>("select * from prepare_google_processing_job_v1($1)", [jobId]);
    expect(result.rows[0]!.google_dispatch_id).toBe(dispatchId);
  });
  it("allows only one claimant and does not increment attempts for duplicates", async () => {
    const [a, b] = await Promise.all([claim(workerA), claim(workerB)]);
    expect(a[0]!.lease_owner).toBe(workerA);
    expect(b[0]!.lease_owner).toBe(workerA);
    expect(b[0]!.attempt_count).toBe(1);
  });
  it("rejects task/job substitution", async () => {
    expect(await claim(workerA, owner)).toEqual([]);
    expect((await claim())[0]!.attempt_count).toBe(1);
  });
  it("recovers an expired lease with a new fenced owner", async () => {
    await claim();
    await db.exec("update processing_jobs set lease_expires_at = now() - interval '1 second'");
    expect((await claim(workerB))[0]).toMatchObject({ lease_owner: workerB, attempt_count: 2 });
  });
  it("persists cancellation on an interrupted delivery without a new execution", async () => {
    await claim();
    await db.exec("update processing_jobs set status='cancellation_requested', lease_expires_at=now()-interval '1 second'");
    expect((await claim(workerB))[0]).toMatchObject({ status: "cancelled", lease_owner: null, attempt_count: 1 });
    expect((await db.query("select * from processing_job_events where event_type='job_cancelled'")).rows).toHaveLength(1);
  });
  it("persists useful terminal failure on exhausted attempts", async () => {
    await db.exec("update processing_jobs set attempt_count=max_attempts");
    expect((await claim())[0]!.status).toBe("failed");
    expect((await db.query("select * from processing_job_events where event_type='job_failed'")).rows).toHaveLength(1);
  });
  it.each(["succeeded", "cancelled", "failed", "expired"])("does not revive a %s job", async (status) => {
    await db.query("update processing_jobs set status=$1", [status]);
    expect((await claim())[0]).toMatchObject({ status, attempt_count: 0, lease_owner: null });
  });
  it("does not steal Vercel or already-claimed polling work", async () => {
    await db.exec("update processing_jobs set execution_backend='vercel_workflow',google_dispatch_id=null");
    const result = await db.query<{ execution_backend: string }>("select * from prepare_google_processing_job_v1($1)", [jobId]);
    expect(result.rows[0]!.execution_backend).toBe("vercel_workflow");
    expect(await claim()).toEqual([]);
  });
  it.each(["anon", "authenticated"])("denies %s access to privileged dispatch and claim", async (role) => {
    await db.exec(`set role ${role}`);
    try {
      await expect(db.query("select * from prepare_google_processing_job_v1($1)", [jobId])).rejects.toThrow(/permission denied/);
      await expect(claim()).rejects.toThrow(/permission denied/);
    } finally { await db.exec("reset role"); }
  });
});
