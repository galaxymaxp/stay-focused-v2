import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.canvas_sync_jobs (
      id uuid primary key,
      status text not null,
      stage text not null,
      status_message text not null,
      accepted_at timestamptz not null,
      deadline_at timestamptz,
      completed_at timestamptz,
      failed_at timestamptz,
      updated_at timestamptz not null default now(),
      worker_id text,
      error_code text,
      safe_error_message text,
      retryable boolean not null default false
    );
  `);
  const migration = readFileSync(resolve("../../packages/db/migrations/20260929060000_expire_overdue_canvas_sync_jobs.sql"), "utf8");
  await db.exec(migration.slice(0, migration.indexOf("revoke all on function")));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("overdue Canvas sync jobs", () => {
  it("expires only overdue active jobs, releases the course, and is idempotent", async () => {
    await db.exec(`
      insert into public.canvas_sync_jobs (id,status,stage,status_message,accepted_at,deadline_at,worker_id)
      values
        ('11111111-1111-4111-8111-111111111111','queued','waiting_to_start','Waiting','2026-09-29T04:00:00Z','2026-09-29T04:30:00Z',null),
        ('22222222-2222-4222-8222-222222222222','running','preparing_course','Running','2026-09-29T04:00:00Z','2026-09-29T04:30:00Z','worker'),
        ('33333333-3333-4333-8333-333333333333','succeeded','complete','Done','2026-09-29T04:00:00Z','2026-09-29T04:30:00Z',null),
        ('44444444-4444-4444-8444-444444444444','queued','waiting_to_start','Waiting',now(),now() + interval '30 minutes',null);
    `);
    expect((await db.query<{ count: number }>("select public.expire_overdue_canvas_sync_jobs_v1() as count")).rows[0]?.count).toBe(2);
    const rows = (await db.query<{ status: string; error_code: string | null; worker_id: string | null }>("select status,error_code,worker_id from public.canvas_sync_jobs order by id")).rows;
    expect(rows.map((row) => row.status)).toEqual(["expired", "expired", "succeeded", "queued"]);
    expect(rows.slice(0, 2).map((row) => row.error_code)).toEqual(["canvas_sync_deadline_exceeded", "canvas_sync_deadline_exceeded"]);
    expect(rows[1]?.worker_id).toBeNull();
    expect((await db.query<{ count: number }>("select public.expire_overdue_canvas_sync_jobs_v1() as count")).rows[0]?.count).toBe(0);
  });
});
