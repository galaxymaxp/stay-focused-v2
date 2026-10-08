import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
const migration = (name: string) => readFileSync(resolve("../../packages/db/migrations", name), "utf8");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key); insert into auth.users values ('${owner}'), ('${other}');`);
  await db.exec(migration("202607050002_create_canvas_connections.sql"));
  await db.exec(migration("202607050006_fix_canvas_connection_rpc_ambiguity.sql"));
  for (const table of ['canvas_courses','canvas_modules','canvas_module_items','canvas_pages','canvas_assignments','canvas_assignment_groups','canvas_announcements','canvas_files','canvas_file_references','canvas_planner_items']) {
    await db.exec(`create table public.${table}(id uuid primary key default gen_random_uuid(), user_id uuid, canvas_connection_id uuid references public.canvas_connections(id) on delete cascade);`);
  }
  await db.exec(`create table public.canvas_sync_jobs(id uuid primary key, user_id uuid, canvas_connection_id uuid, status text);
    create function public.request_canvas_sync_job_cancellation_v1(p_user_id uuid, p_job_id uuid) returns void language sql as $$
      update public.canvas_sync_jobs set status = case when status = 'queued' then 'cancelled' else 'cancellation_requested' end
      where id = p_job_id and user_id = p_user_id and status in ('queued','running'); $$;
    create table public.saved_academic_rows(id uuid primary key, canvas_connection_id uuid references public.canvas_connections(id) on delete cascade, kind text);
    insert into public.canvas_connections(user_id,base_url,canvas_user_id,canvas_user_name,token_ciphertext,token_iv,token_auth_tag,encryption_version,last_verified_at)
      values ('${owner}','https://canvas.example','student','Student','encrypted','iv','tag','v1',now()),
             ('${other}','https://canvas.example','other','Other','other-encrypted','iv','tag','v1',now());
    insert into public.saved_academic_rows select gen_random_uuid(),id,kind from public.canvas_connections,
      unnest(array['source','course','task','reviewer','quiz','activity','library','non_canvas']) kind where user_id='${owner}';
    insert into public.canvas_sync_jobs select gen_random_uuid(),user_id,id,'queued' from public.canvas_connections where user_id='${owner}';`);
  await db.exec(migration("20260928120000_canvas_credential_lifecycle.sql"));
}, 30000);
beforeEach(async () => { await db.exec("begin"); });
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db?.close(); });
describe("Canvas credential preservation in Postgres", () => {
  it("erases credentials, preserves all dependent rows, and stops queued sync", async () => {
    const before = (await db.query(`select id from public.canvas_connections where user_id='${owner}'`)).rows;
    await db.exec(`select public.disconnect_canvas_connection_v1('${owner}');`);
    expect((await db.query(`select id from public.canvas_connections where user_id='${owner}'`)).rows).toEqual(before);
    expect((await db.query(`select status,token_ciphertext,token_iv,token_auth_tag,encryption_version from public.canvas_connections where user_id='${owner}'`)).rows[0]).toEqual({ status: "disconnected", token_ciphertext: null, token_iv: null, token_auth_tag: null, encryption_version: null });
    expect((await db.query("select count(*)::integer n from public.saved_academic_rows")).rows).toEqual([{ n: 8 }]);
    expect((await db.query("select status from public.canvas_sync_jobs")).rows).toEqual([{ status: "cancelled" }]);
    expect((await db.query(`select status from public.canvas_connections where user_id='${other}'`)).rows).toEqual([{ status: "active" }]);
  });
  it("rejects retries using disconnected credentials", async () => {
    await db.exec(`select public.disconnect_canvas_connection_v1('${owner}');`);
    await expect(db.exec("update public.canvas_sync_jobs set status='queued'")).rejects.toThrow(/canvas_reconnect_required/);
  });
  it("blocks an in-flight snapshot write after disconnect", async () => {
    await db.exec(`select public.disconnect_canvas_connection_v1('${owner}');`);
    await expect(db.exec(`insert into public.canvas_courses(user_id,canvas_connection_id) select user_id,id from public.canvas_connections where user_id='${owner}'`)).rejects.toThrow(/canvas_reconnect_required/);
  });
  it("allows same-account reconnect with the same connection ID and history", async () => {
    await db.exec(`select public.disconnect_canvas_connection_v1('${owner}');`);
    await db.exec(`select * from public.replace_canvas_connection_with_capabilities('${owner}','https://canvas.example','student','Student',null,'replacement-encrypted','iv','tag','v1',now(),'[{"capability":"profile","status":"available"}]');`);
    expect((await db.query("select count(*)::integer n from public.saved_academic_rows")).rows).toEqual([{ n: 8 }]);
    expect((await db.query(`select status from public.canvas_connections where user_id='${owner}'`)).rows).toEqual([{ status: "active" }]);
  });
  it.each(["base_url='https://different.example'", "canvas_user_id='different'", `user_id='${other}'`])("rejects identity reassignment %s", async (assignment) => {
    await expect(db.exec(`update public.canvas_connections set ${assignment} where user_id='${owner}'`)).rejects.toThrow(/canvas_account_change_requires_separate_import/);
  });
  it("ignores stale credential failures after token replacement", async () => {
    await db.exec(`select public.mark_canvas_reconnect_required_v1(user_id,id,'2000-01-01'::timestamptz) from public.canvas_connections where user_id='${owner}';`);
    expect((await db.query(`select status from public.canvas_connections where user_id='${owner}'`)).rows).toEqual([{ status: "active" }]);
    await db.exec(`select public.mark_canvas_reconnect_required_v1(user_id,id,updated_at) from public.canvas_connections where user_id='${owner}';`);
    expect((await db.query(`select status from public.canvas_connections where user_id='${owner}'`)).rows).toEqual([{ status: "reconnect_required" }]);
  });
  it.each(["anon", "authenticated"])("denies %s credential mutation RPCs", async (role) => {
    await db.exec(`set local role ${role}`);
    await expect(db.exec(`select public.disconnect_canvas_connection_v1('${owner}')`)).rejects.toThrow(/permission denied/);
  });
});
