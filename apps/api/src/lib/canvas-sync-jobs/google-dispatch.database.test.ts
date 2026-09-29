import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
const jobId = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create function auth.role() returns text language sql as $$ select 'service_role'::text $$;
    create table public.canvas_sync_jobs (
      id uuid primary key, status text not null, stage text not null,
      status_message text not null, idempotency_key text not null,
      retry_idempotency_key text, google_dispatch_id uuid, google_dispatch_key text,
      google_dispatched_at timestamptz, google_worker_lease_expires_at timestamptz,
      worker_id text, attempt_count integer not null default 0,
      max_attempts integer not null default 3,
      accepted_at timestamptz not null default now(), deadline_at timestamptz not null default (now() + interval '30 minutes'),
      started_at timestamptz, completed_at timestamptz, failed_at timestamptz,
      error_code text, safe_error_message text, retryable boolean not null default false
    );
  `);
  const migration = readFileSync(resolve("../../packages/db/migrations/20260929070000_google_canvas_sync_dispatch.sql"), "utf8");
  await db.exec(migration.slice(0, migration.indexOf("revoke all on function")));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("Google Canvas dispatch fencing", () => {
  it("keeps one dispatch per key, claims only the matching reference, and fences replay", async () => {
    await db.query("insert into public.canvas_sync_jobs (id,status,stage,status_message,idempotency_key) values ($1,'queued','waiting_to_start','Waiting','first-key')", [jobId]);
    const first = await db.query<{ google_dispatch_id: string }>("select google_dispatch_id from public.prepare_canvas_sync_job_google_dispatch_v1($1)", [jobId]);
    const dispatchId = first.rows[0]!.google_dispatch_id;
    expect(dispatchId).toMatch(/^[0-9a-f-]{36}$/);
    const replay = await db.query<{ google_dispatch_id: string }>("select google_dispatch_id from public.prepare_canvas_sync_job_google_dispatch_v1($1)", [jobId]);
    expect(replay.rows[0]?.google_dispatch_id).toBe(dispatchId);
    await db.query("select * from public.mark_canvas_sync_job_google_dispatched_v1($1,$2)", [jobId, dispatchId]);
    const wrong = await db.query("select * from public.claim_canvas_sync_job_google_v1($1,$2,$3)", [jobId, "22222222-2222-4222-8222-222222222222", "worker-1"]);
    expect(wrong.rows).toHaveLength(0);
    const claimed = await db.query<{ status: string; attempt_count: number }>("select status,attempt_count from public.claim_canvas_sync_job_google_v1($1,$2,$3)", [jobId, dispatchId, "worker-1"]);
    expect(claimed.rows[0]).toMatchObject({ status: "running", attempt_count: 1 });
    expect((await db.query("select * from public.claim_canvas_sync_job_google_v1($1,$2,$3)", [jobId, dispatchId, "worker-2"])).rows).toHaveLength(0);
    expect((await db.query("select * from public.heartbeat_canvas_sync_job_google_v1($1,$2,$3)", [jobId, dispatchId, "worker-1"])).rows).toHaveLength(1);
    expect((await db.query("select * from public.mark_canvas_sync_job_google_dispatch_failed_v1($1,$2)", [jobId, dispatchId])).rows).toHaveLength(0);
    const status = await db.query<{ status: string }>("select status from public.canvas_sync_jobs where id=$1", [jobId]);
    expect(status.rows[0]?.status).toBe("running");
  });

  it("persists a rejected dispatch as failed and rotates its reference on explicit retry", async () => {
    const secondId = "33333333-3333-4333-8333-333333333333";
    await db.query("insert into public.canvas_sync_jobs (id,status,stage,status_message,idempotency_key) values ($1,'queued','waiting_to_start','Waiting','second-key')", [secondId]);
    const prepared = await db.query<{ google_dispatch_id: string }>("select google_dispatch_id from public.prepare_canvas_sync_job_google_dispatch_v1($1)", [secondId]);
    const oldDispatchId = prepared.rows[0]!.google_dispatch_id;
    const rejected = await db.query<{ status: string; error_code: string; retryable: boolean }>("select status,error_code,retryable from public.mark_canvas_sync_job_google_dispatch_failed_v1($1,$2)", [secondId, oldDispatchId]);
    expect(rejected.rows[0]).toMatchObject({ status: "failed", error_code: "canvas_sync_google_dispatch_failed", retryable: true });
    await db.query("update public.canvas_sync_jobs set status='queued',stage='waiting_to_start',retry_idempotency_key='retry-key',completed_at=null,failed_at=null where id=$1", [secondId]);
    const next = await db.query<{ google_dispatch_id: string }>("select google_dispatch_id from public.prepare_canvas_sync_job_google_dispatch_v1($1)", [secondId]);
    expect(next.rows[0]?.google_dispatch_id).not.toBe(oldDispatchId);
    expect((await db.query("select * from public.claim_canvas_sync_job_google_v1($1,$2,$3)", [secondId, oldDispatchId, "worker-old"])).rows).toHaveLength(0);
  });
});
