import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const courses = [1, 2, 3, 4].map(n => `33333333-3333-4333-8333-33333333333${n}`);
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create table auth.users(id uuid primary key);
    insert into auth.users values('${owner}'),('${other}');
    create table public.canvas_connections(id uuid primary key,user_id uuid,status text);
    create table public.canvas_courses(id uuid primary key,user_id uuid,canvas_connection_id uuid);
    create table public.canvas_course_sync_preferences(course_id uuid,user_id uuid,selected boolean);
    create table public.canvas_auto_reviewer_preferences(user_id uuid primary key,enabled boolean);
    create table public.canvas_auto_reviewer_candidates(user_id uuid,processing_job_id uuid);
    grant select on public.canvas_connections, public.canvas_courses, public.canvas_course_sync_preferences,
      public.canvas_auto_reviewer_preferences to service_role;`);
  await db.exec(readFileSync(resolve("../../packages/db/migrations/20261013000000_canvas_poll_automation.sql"), "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec(`begin;
    insert into public.canvas_connections values('${owner}','${owner}','active');
    insert into public.canvas_auto_reviewer_activity values('${owner}',now());`);
  for (const course of courses) {
    await db.query("insert into public.canvas_courses values($1,$2,$2)", [course, owner]);
    await db.query("insert into public.canvas_course_sync_preferences values($1,$2,true)", [course, owner]);
  }
  await db.exec("set local role service_role");
});
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db?.close(); });
const reserve = async (course = courses[0]!, user = owner) =>
  (await db.query<{ allowed: boolean }>("select public.reserve_canvas_poll_sync_v1($1,$2) allowed", [user, course])).rows[0]!.allowed;
async function denied(sql: string) {
  await db.exec("savepoint denied"); await expect(db.exec(sql)).rejects.toThrow(); await db.exec("rollback to savepoint denied");
}
describe("atomic poll budget and owner activity", () => {
  it("admits once per course, including across six-hour bucket boundaries", async () => {
    expect(await reserve()).toBe(true); expect(await reserve()).toBe(false);
    await db.exec("update public.canvas_auto_reviewer_poll_requests set reserved_at=now()-interval '5 hours',bucket=bucket-1");
    expect(await reserve()).toBe(false);
    await db.exec("update public.canvas_auto_reviewer_poll_requests set reserved_at=now()-interval '6 hours 1 second'");
    expect(await reserve()).toBe(true);
  });
  it("caps all courses at three in a rolling day", async () => {
    for (const course of courses.slice(0, 3)) expect(await reserve(course)).toBe(true);
    expect(await reserve(courses[3])).toBe(false);
    await db.exec("update public.canvas_auto_reviewer_poll_requests set reserved_at=now()-interval '24 hours 1 second',bucket=bucket-5");
    expect(await reserve(courses[3])).toBe(true);
  });
  it("denies inactive, missing activity, unselected and foreign courses", async () => {
    await db.exec("update public.canvas_auto_reviewer_activity set last_active_at=now()-interval '7 days 1 second'");
    expect(await reserve()).toBe(false);
    expect(await reserve(courses[0], other)).toBe(false);
    await db.exec("delete from public.canvas_auto_reviewer_activity"); expect(await reserve()).toBe(false);
    await db.query("select public.record_canvas_api_activity_v1($1)", [owner]);
    await db.exec("reset role; update public.canvas_course_sync_preferences set selected=false; set local role service_role");
    expect(await reserve()).toBe(false);
  });
  it("honors automation off without changing metadata state", async () => {
    await db.exec(`reset role; insert into public.canvas_auto_reviewer_preferences values('${owner}',false); set local role service_role`);
    expect(await reserve()).toBe(false);
    expect((await db.query("select * from public.canvas_auto_reviewer_poll_requests")).rows).toEqual([]);
  });
  it("records activity at most hourly using conditional database writes", async () => {
    await db.exec("update public.canvas_auto_reviewer_activity set last_active_at=now()-interval '30 minutes'");
    const before = (await db.query("select last_active_at from public.canvas_auto_reviewer_activity")).rows;
    await db.query("select public.record_canvas_api_activity_v1($1)", [owner]);
    expect((await db.query("select last_active_at from public.canvas_auto_reviewer_activity")).rows).toEqual(before);
    await db.exec("update public.canvas_auto_reviewer_activity set last_active_at=now()-interval '1 hour'");
    await db.query("select public.record_canvas_api_activity_v1($1)", [owner]);
    expect((await db.query("select last_active_at=now() current from public.canvas_auto_reviewer_activity")).rows).toEqual([{ current: true }]);
    await db.query("select public.record_canvas_api_activity_v1($1)", [other]);
    expect((await db.query("select * from public.canvas_auto_reviewer_activity")).rows).toHaveLength(2);
  });
  it.each(["anon", "authenticated"])("denies %s all internal storage and functions", async role => {
    await db.exec(`set local role ${role}`);
    for (const table of ["canvas_auto_reviewer_activity", "canvas_auto_reviewer_poll_marks", "canvas_auto_reviewer_poll_requests"]) {
      await denied(`select * from public.${table}`);
      await denied(`delete from public.${table}`);
    }
    await denied(`select public.reserve_canvas_poll_sync_v1('${owner}','${courses[0]}')`);
    await denied(`select public.record_canvas_api_activity_v1('${owner}')`);
  });
});
