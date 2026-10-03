import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const connection = "33333333-3333-4333-8333-333333333333";
const course = "44444444-4444-4444-8444-444444444444";
const assignment = "55555555-5555-4555-8555-555555555555";
const worker = "66666666-6666-4666-8666-666666666666";
let db: PGlite;
const migration = (name: string) => readFileSync(resolve("../../packages/db/migrations", name), "utf8").replace(/create extension if not exists pgcrypto;/gi, "");
const count = async (type?: string) => Number((await db.query<{ n: number }>(`select count(*)::int n from public.notification_outbox ${type ? "where type=$1" : ""}`, type ? [type] : [])).rows[0]?.n);
async function addAssignment(due = "2026-10-11T12:00:00Z", published = true) {
  await db.query(`insert into public.canvas_assignments(id,user_id,canvas_connection_id,course_id,canvas_assignment_id,name,due_at,published) values($1,$2,$3,$4,'canvas-1','Network Security Activity',$5,$6)`, [assignment,owner,connection,course,due,published]);
}
const queue = (now: string) => db.query("select public.queue_canvas_deadline_emails_v1($1::timestamptz)", [now]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  await db.exec(migration("202607050002_create_canvas_connections.sql"));
  await db.exec(migration("202607050003_harden_canvas_connection_persistence.sql"));
  await db.exec(migration("202607050004_create_canvas_academic_graph.sql"));
  await db.exec(`create table public.canvas_sync_runs(id uuid primary key,resource_counts jsonb);
    alter table public.canvas_courses add unique(id,user_id,canvas_connection_id,canvas_course_id);`);
  // Use the actual canonical announcement and submission DDL, excluding older
  // snapshot RPCs whose unrelated sync-run dependencies are outside this suite.
  await db.exec(migration("202607060001_add_canvas_planner_announcements.sql").split("create or replace function public.set_canvas_planner_items_updated_at")[0]!);
  await db.exec(`alter table public.canvas_announcements add author_name text,add attachments jsonb not null default '[]';`);
  await db.exec(migration("202607080003_add_canvas_grades_submissions_foundation.sql").split("create table if not exists public.canvas_course_grade_summaries")[0]!);
  await db.exec(`create table public.canvas_course_sync_preferences(course_id uuid primary key,user_id uuid,selected boolean);
    create table public.tasks(id uuid primary key default gen_random_uuid(),user_id uuid,canvas_assignment_row_id uuid,canvas_connection_id uuid,canvas_course_id text,canvas_assignment_id text,status text);`);
  await db.exec(migration("20261003025905_canvas_notification_sync.sql"));
}, 30000);
beforeEach(async () => {
  await db.exec(`begin;
    insert into public.canvas_connections(id,user_id,base_url,canvas_user_id,canvas_user_name,token_ciphertext,token_iv,token_auth_tag,encryption_version,last_verified_at)
      values('${connection}','${owner}','https://canvas.example','student','Student','encrypted','iv','tag','v1',now());
    insert into public.canvas_courses(id,user_id,canvas_connection_id,canvas_course_id,name,course_code)
      values('${course}','${owner}','${connection}','canvas-course','Course','CIT5');
    insert into public.canvas_course_sync_preferences values('${course}','${owner}',true);
    insert into public.notification_preferences(user_id,timezone) values('${owner}','Asia/Manila');`);
});
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db?.close(); });

describe("transactional Canvas emails in Postgres", () => {
  it("deduplicates assignment inserts, repeated snapshot polls, and unchanged due dates", async () => {
    await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
    const payload = { assignments: [{ canvas_assignment_id: "canvas-1", name: "Task", published: true, submission_types: ["online_upload"], due_at: "2026-10-11T12:00:00Z" }] };
    const poll = () => db.query("select public.apply_canvas_notification_metadata_v1($1,$2,$3)", [course,worker,JSON.stringify(payload)]);
    await poll();
    await db.query("update public.canvas_notification_poll_state set next_poll_at=now()-interval '1 minute' where course_id=$1", [course]);
    await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
    await poll();
    expect((await db.query("select count(*)::int n from public.canvas_assignments")).rows).toEqual([{ n: 1 }]);
    expect(await count("new_assignment")).toBe(1);
    expect(await count("due_date_change")).toBe(0);
  });
  it("queues one announcement across repeats, edits, and local prune/reimport", async () => {
    const insert = () => db.exec(`insert into public.canvas_announcements(user_id,canvas_connection_id,course_id,canvas_course_id,canvas_announcement_id,title,published,source_fingerprint) values('${owner}','${connection}','${course}','canvas-course','announcement-1','Midterm',true,'fingerprint')`);
    await insert();
    await db.exec("update public.canvas_announcements set title='Midterm edited'; delete from public.canvas_announcements;");
    await insert();
    expect(await count("announcement")).toBe(1);
  });
  it("does not notify future announcements and notices them when posting time arrives", async () => {
    await db.exec(`insert into public.canvas_announcements(user_id,canvas_connection_id,course_id,canvas_course_id,canvas_announcement_id,title,published,posted_at,delayed_post_at,source_fingerprint)
      values('${owner}','${connection}','${course}','canvas-course','future','Soon',true,now()+interval '1 day',now()+interval '1 day','fingerprint')`);
    expect(await count()).toBe(0);
    await db.exec("update public.canvas_announcements set posted_at=now(),delayed_post_at=now()");
    expect(await count("announcement")).toBe(1);
  });
  it("detects a matured announcement even when its canonical payload is unchanged", async () => {
    // Simulate time having elapsed since a future post was stored: no insert
    // trigger runs, and polling receives exactly the same canonical fields.
    await db.exec(`alter table public.canvas_announcements disable trigger detect_canvas_announcement_email;
      insert into public.canvas_announcements(user_id,canvas_connection_id,course_id,canvas_course_id,canvas_announcement_id,title,published,posted_at,delayed_post_at,source_fingerprint)
      values('${owner}','${connection}','${course}','canvas-course','matured','Posted',true,now()-interval '1 minute',now()-interval '1 minute','fingerprint');
      alter table public.canvas_announcements enable trigger detect_canvas_announcement_email;`);
    const original = (await db.query<Record<string, unknown>>("select * from public.canvas_announcements")).rows[0]!;
    expect(await count()).toBe(0);
    for (let i = 0; i < 2; i++) {
      await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
      await db.query("select public.apply_canvas_notification_metadata_v1($1,$2,$3)", [course,worker,JSON.stringify({ announcements: [original] })]);
      await db.exec("update public.canvas_notification_poll_state set next_poll_at=now()-interval '1 minute'");
    }
    expect(await count("announcement")).toBe(1);
    expect((await db.query<{ last_synced_at: unknown }>("select last_synced_at from public.canvas_announcements")).rows[0]!.last_synced_at).toEqual(original.last_synced_at);
  });
  it("treats equivalent timezone formats as unchanged and A -> B -> A as two changes", async () => {
    await addAssignment();
    await db.exec("update public.canvas_assignments set due_at='2026-10-11T20:00:00+08:00'");
    expect(await count("due_date_change")).toBe(0);
    await db.exec("update public.canvas_assignments set due_at='2026-10-06T12:00:00Z'; update public.canvas_assignments set due_at='2026-10-11T12:00:00Z'");
    expect(await count("due_date_change")).toBe(2);
  });
  it("queues each threshold once and suppresses past-due polling", async () => {
    await addAssignment();
    await queue("2026-10-03T04:00:00Z"); expect(await count("deadline_7_day")).toBe(0);
    await queue("2026-10-05T04:00:00Z"); await queue("2026-10-05T04:05:00Z"); expect(await count("deadline_7_day")).toBe(1);
    await queue("2026-10-09T04:00:00Z"); expect(await count("deadline_3_day")).toBe(1);
    await queue("2026-10-11T00:00:00Z"); expect(await count("deadline_due_today")).toBe(1);
    const before = await count(); await queue("2026-10-12T00:00:00Z"); expect(await count()).toBe(before);
  });
  it("uses local calendar day, waits for 08:00, and respects a custom time", async () => {
    await addAssignment("2026-10-06T15:59:00Z");
    await queue("2026-10-05T16:00:00Z"); expect(await count("deadline_due_today")).toBe(0);
    await queue("2026-10-05T23:59:00Z"); expect(await count("deadline_due_today")).toBe(0);
    await db.exec("update public.notification_preferences set reminder_time='10:00'");
    await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_due_today")).toBe(0);
    await queue("2026-10-06T02:00:00Z"); expect(await count("deadline_due_today")).toBe(1);
  });
  it("uses the existing course timezone before the student opens Settings", async () => {
    await db.exec("delete from public.notification_preferences; update public.canvas_courses set time_zone='Asia/Manila'");
    await addAssignment("2026-10-06T15:59:00Z");
    await queue("2026-10-05T23:59:00Z"); expect(await count("deadline_due_today")).toBe(0);
    await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_due_today")).toBe(1);
  });
  it("invalidates old reminders and creates a new schedule after a deadline changes", async () => {
    await addAssignment(); await queue("2026-10-05T04:00:00Z");
    await db.exec("update public.canvas_assignments set due_at='2026-10-06T12:00:00Z'");
    await queue("2026-10-05T04:05:00Z");
    expect(await count("deadline_7_day")).toBe(2);
    expect((await db.query("select count(*)::int n from public.notification_outbox where last_error='stale_deadline'")).rows).toEqual([{ n: 1 }]);
  });
  it.each(["submitted", "pending_review", "graded"])("suppresses reliable %s submissions", async workflow => {
    await addAssignment("2026-10-06T12:00:00Z");
    await db.query(`insert into public.canvas_assignment_submissions(user_id,canvas_connection_id,course_id,assignment_id,workflow_state,missing,source_fingerprint) values($1,$2,$3,$4,$5,false,'fingerprint')`, [owner,connection,course,assignment,workflow]);
    await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_due_today")).toBe(0);
  });
  it("suppresses completed local tasks and preserves unknown submission logic", async () => {
    await addAssignment("2026-10-06T12:00:00Z");
    await db.query("insert into public.tasks(user_id,canvas_assignment_row_id,status) values($1,$2,'completed')", [owner,assignment]);
    await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_due_today")).toBe(0);
    await db.exec("delete from public.tasks"); await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_due_today")).toBe(1);
  });
  it("respects individual preferences and global disable without overwriting switches", async () => {
    await db.exec("update public.notification_preferences set announcement_email=false,deadline_7_day=false");
    await addAssignment("2026-10-06T12:00:00Z"); await queue("2026-10-06T00:00:00Z");
    expect(await count("deadline_7_day")).toBe(0); expect(await count("deadline_3_day")).toBe(1);
    await db.exec("update public.notification_preferences set email_enabled=false");
    expect((await db.query(`select public.notification_email_enabled_v1('${owner}','new_assignment') enabled`)).rows).toEqual([{ enabled: false }]);
    await db.exec("update public.notification_preferences set email_enabled=true");
    expect((await db.query("select announcement_email,deadline_7_day from public.notification_preferences")).rows).toEqual([{ announcement_email: false, deadline_7_day: false }]);
  });
  it("leases delivery once, persists sent receipts, and prevents retry beyond provider retention", async () => {
    await addAssignment();
    const first = await db.query<{ id: string }>("select * from public.claim_canvas_email_outbox_v1($1,1)", [worker]);
    expect(first.rows).toHaveLength(1);
    expect((await db.query("select * from public.claim_canvas_email_outbox_v1($1,1)", [other])).rows).toHaveLength(0);
    await db.query("update public.notification_outbox set sent_at=now(),lease_owner=null,lease_expires_at=null where id=$1", [first.rows[0]!.id]);
    expect((await db.query("select * from public.claim_canvas_email_outbox_v1($1,1)", [worker])).rows).toHaveLength(0);
    await db.exec("update public.notification_outbox set sent_at=null,first_attempt_at=now()-interval '25 hours'");
    expect((await db.query("select * from public.claim_canvas_email_outbox_v1($1,1)", [worker])).rows).toHaveLength(0);
    expect((await db.query("select last_error from public.notification_outbox")).rows).toEqual([{ last_error: "delivery_receipt_uncertain" }]);
  });
  it("preserves failed scopes and deactivates only fully traversed missing assignments/modules", async () => {
    await addAssignment();
    await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
    await db.query("select public.apply_canvas_notification_metadata_v1($1,$2,$3)", [course,worker,JSON.stringify({ assignments: null })]);
    expect((await db.query("select published from public.canvas_assignments")).rows).toEqual([{ published: true }]);
    await db.query("update public.canvas_notification_poll_state set next_poll_at=now()-interval '1 minute' where course_id=$1", [course]);
    await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
    await db.query("select public.apply_canvas_notification_metadata_v1($1,$2,$3)", [course,worker,JSON.stringify({ assignments: [] })]);
    expect((await db.query("select published from public.canvas_assignments")).rows).toEqual([{ published: false }]);
  });
  it("stores module materials and submission evidence idempotently without creating reviewer work", async () => {
    await addAssignment();
    const payload = {
      modules: [{ canvas_module_id: "module-1", name: "Week 1", published: true, prerequisite_module_ids: [] }],
      moduleItems: [{ canvas_module_id: "module-1", canvas_module_item_id: "item-1", title: "Lesson PDF", item_type: "File", canvas_content_id: "file-1", published: true, content_details: { size: 1200 } }],
      submissions: [{ canvas_assignment_id: "canvas-1", workflow_state: "submitted", submitted_at: "2026-10-05T01:00:00Z", excused: false, missing: false, source_fingerprint: "submitted" }],
    };
    for (let i=0;i<2;i++) {
      await db.query("select * from public.claim_canvas_notification_course_v1($1)", [worker]);
      await db.query("select public.apply_canvas_notification_metadata_v1($1,$2,$3)", [course,worker,JSON.stringify(payload)]);
      await db.exec("update public.canvas_notification_poll_state set next_poll_at=now()-interval '1 minute'");
    }
    expect((await db.query("select count(*)::int n from public.canvas_modules")).rows).toEqual([{ n: 1 }]);
    expect((await db.query("select title,canvas_content_id from public.canvas_module_items")).rows).toEqual([{ title: "Lesson PDF", canvas_content_id: "file-1" }]);
    expect((await db.query("select workflow_state from public.canvas_assignment_submissions")).rows).toEqual([{ workflow_state: "submitted" }]);
    await queue("2026-10-06T00:00:00Z"); expect(await count("deadline_7_day")).toBe(0);
  });
  it("allows own preference persistence and denies cross-owner access, reassignment, outbox mutation and internal RPCs", async () => {
    await db.exec(`insert into public.notification_preferences(user_id) values('${other}'); set local role authenticated; set local request.jwt.claim.sub='${owner}';`);
    await db.exec("update public.notification_preferences set email_enabled=false");
    expect((await db.query("select user_id,email_enabled from public.notification_preferences")).rows).toEqual([{ user_id: owner, email_enabled: false }]);
    expect((await db.query(`update public.notification_preferences set email_enabled=false where user_id='${other}' returning user_id`)).rows).toHaveLength(0);
    await db.exec("savepoint access_check");
    await expect(db.exec(`update public.notification_preferences set user_id='${other}' where user_id='${owner}'`)).rejects.toThrow();
    await db.exec("rollback to access_check");
    await expect(db.exec("insert into public.notification_outbox default values")).rejects.toThrow(/permission denied/);
    await db.exec("rollback to access_check");
    await expect(db.exec(`select public.claim_canvas_email_outbox_v1('${worker}',1)`)).rejects.toThrow(/permission denied/);
  });
  it("validates timezone and prevents midnight reminder configuration", async () => {
    await db.exec("savepoint validation");
    await expect(db.exec("update public.notification_preferences set timezone='Made/Up'")).rejects.toThrow(/invalid_notification_timezone/);
    await db.exec("rollback to validation");
    await expect(db.exec("update public.notification_preferences set reminder_time='00:00'")).rejects.toThrow();
  });
  it("denies anonymous preference/outbox access", async () => {
    await db.exec("set local role anon; savepoint denied");
    await expect(db.exec("select * from public.notification_preferences")).rejects.toThrow(/permission denied/);
    await db.exec("rollback to denied");
    await expect(db.exec("select * from public.notification_outbox")).rejects.toThrow(/permission denied/);
  });
});
