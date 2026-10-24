import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// TP1: the forward-only migration is proven against the real R5/Gap B study-plan
// migrations in PostgreSQL. It is a file only; nothing here touches a remote DB.
const migrations = "../../packages/db/migrations";
const read = (name: string) => readFileSync(resolve(process.cwd(), migrations, name), "utf8");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const TASK = "33333333-3333-4333-8333-333333333333";
const OTHER_TASK = "33333333-3333-4333-8333-444444444444";
const REVIEWER = "44444444-4444-4444-8444-444444444444";
const REVIEWER_2 = "44444444-4444-4444-8444-555555555555";
const FOREIGN_REVIEWER = "44444444-4444-4444-8444-666666666666";
const DELETED_REVIEWER = "44444444-4444-4444-8444-777777777777";
const QUIZ = "44444444-4444-4444-8444-888888888888";
const UNFINISHED_REVIEWER = "44444444-4444-4444-8444-999999999999";
const HASH = "a".repeat(64);
const DAY = ["2026-10-24T00:00:00Z", "2026-10-25T00:00:00Z"] as const;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key); insert into auth.users values('${OWNER}'),('${OTHER}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table public.canvas_assignments(id uuid primary key);
    create table public.generated_artifacts(id uuid primary key, user_id uuid not null, artifact_type text not null,
      latest_version_id uuid, deleted_at timestamptz, constraint generated_artifacts_owner_unique unique (id, user_id));
    create table public.user_profiles(user_id uuid primary key references auth.users(id));
    grant usage on schema public, auth to authenticated, service_role;
    grant all on public.generated_artifacts, public.user_profiles to service_role;`);
  await db.exec(read("20260827155438_task_study_plan_foundation.sql"));
  await db.exec(read("20260828173643_replace_planned_study_sessions_on_replan.sql"));
  // A task block written before the migration must survive it unchanged.
  await db.exec(`insert into public.tasks(id, user_id, title) values('${TASK}', '${OWNER}', 'Essay'), ('${OTHER_TASK}', '${OTHER}', 'Other');
    insert into public.study_sessions(user_id, task_id, starts_at, ends_at, status)
      values('${OWNER}', '${TASK}', '2026-10-23T09:00:00Z', '2026-10-23T10:00:00Z', 'completed');`);
  await db.exec(read("20261024000100_today_plan_content.sql"));
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; delete from public.study_sessions where starts_at >= '2026-10-24'; delete from public.study_plans;
    delete from public.reviewer_opens; delete from public.generated_artifacts; delete from public.user_profiles;
    insert into public.generated_artifacts values
      ('${REVIEWER}', '${OWNER}', 'reviewer', '${REVIEWER}', null),
      ('${REVIEWER_2}', '${OWNER}', 'reviewer', '${REVIEWER_2}', null),
      ('${FOREIGN_REVIEWER}', '${OTHER}', 'reviewer', '${FOREIGN_REVIEWER}', null),
      ('${DELETED_REVIEWER}', '${OWNER}', 'reviewer', '${DELETED_REVIEWER}', now()),
      ('${QUIZ}', '${OWNER}', 'quiz', '${QUIZ}', null),
      ('${UNFINISHED_REVIEWER}', '${OWNER}', 'reviewer', null, null);
    set role service_role;`);
});

const block = (kind: string, target: Record<string, string | null>, from: string, to: string) =>
  ({ kind, ...target, starts_at: `2026-10-24T${from}:00Z`, ends_at: `2026-10-24T${to}:00Z` });
const taskBlock = (from: string, to: string, id = TASK) => block("task", { task_id: id }, from, to);
const reviewerBlock = (from: string, to: string, id = REVIEWER) => block("reviewer", { reviewer_artifact_id: id }, from, to);
const apply = (sessions: unknown[], user = OWNER) => db.query<{ study_plan_id: string; session_count: number }>(
  "select * from public.apply_study_plan_v2($1, $2, $3, 'deterministic-v1', $4, $5::jsonb)",
  [user, DAY[0], DAY[1], HASH, JSON.stringify(sessions)]);
const rows = async () => (await db.query<{ block_kind: string | null; task_id: string | null; reviewer_artifact_id: string | null; status: string }>(
  "select block_kind, task_id, reviewer_artifact_id, status from public.study_sessions where user_id = $1 order by starts_at", [OWNER])).rows;

describe("TP1 typed study blocks", () => {
  it("keeps pre-migration task rows as task blocks and v1 task plans working", async () => {
    expect(await rows()).toEqual([{ block_kind: null, task_id: TASK, reviewer_artifact_id: null, status: "completed" }]);
    await db.query("select * from public.apply_study_plan_v1($1, $2, $3, 'deterministic-v1', $4, $5::jsonb)",
      [OWNER, DAY[0], DAY[1], HASH, JSON.stringify([{ task_id: TASK, starts_at: "2026-10-24T09:00:00Z", ends_at: "2026-10-24T10:00:00Z" }])]);
    expect((await rows()).at(-1)).toEqual({ block_kind: null, task_id: TASK, reviewer_artifact_id: null, status: "planned" });
  });

  it("applies a mixed plan with real reviewer identity and leaves the task pending", async () => {
    const applied = await apply([taskBlock("09:00", "10:00"), reviewerBlock("10:00", "10:30"), reviewerBlock("10:30", "10:50", REVIEWER_2)]);
    expect(applied.rows[0]!.session_count).toBe(3);
    expect((await rows()).slice(1)).toEqual([
      { block_kind: "task", task_id: TASK, reviewer_artifact_id: null, status: "planned" },
      { block_kind: "reviewer", task_id: null, reviewer_artifact_id: REVIEWER, status: "planned" },
      { block_kind: "reviewer", task_id: null, reviewer_artifact_id: REVIEWER_2, status: "planned" },
    ]);
    await db.exec(`update public.study_sessions set status = 'completed' where reviewer_artifact_id = '${REVIEWER}'`);
    expect((await db.query("select status from public.tasks where id = $1", [TASK])).rows).toEqual([{ status: "pending" }]);
  });

  it.each([
    ["a foreign reviewer", [reviewerBlock("09:00", "09:30", FOREIGN_REVIEWER)]],
    ["a deleted reviewer", [reviewerBlock("09:00", "09:30", DELETED_REVIEWER)]],
    ["a quiz artifact", [reviewerBlock("09:00", "09:30", QUIZ)]],
    ["an unfinished reviewer", [reviewerBlock("09:00", "09:30", UNFINISHED_REVIEWER)]],
    ["a foreign task", [taskBlock("09:00", "09:30", OTHER_TASK)]],
    ["a block with both targets", [block("reviewer", { reviewer_artifact_id: REVIEWER, task_id: TASK }, "09:00", "09:30")]],
    ["an unknown kind", [block("quiz", { reviewer_artifact_id: REVIEWER }, "09:00", "09:30")]],
    ["a missing kind", [{ task_id: TASK, starts_at: "2026-10-24T09:00:00Z", ends_at: "2026-10-24T09:30:00Z" }]],
    ["a block outside the range", [{ ...reviewerBlock("09:00", "09:30"), ends_at: "2026-10-25T00:30:00Z" }]],
  ])("rejects %s without writing anything", async (_label, sessions) => {
    await expect(apply(sessions)).rejects.toThrow(/study_plan_session_invalid/);
    expect(await rows()).toHaveLength(1);
  });

  it("rejects duplicate reviewers, overlaps and a reviewer already kept today", async () => {
    await expect(apply([reviewerBlock("09:00", "09:30"), reviewerBlock("10:00", "10:30")])).rejects.toThrow(/study_plan_reviewer_duplicate/);
    await expect(apply([reviewerBlock("09:00", "09:30"), taskBlock("09:15", "10:00")])).rejects.toThrow(/study_plan_session_overlap/);
    await apply([reviewerBlock("08:00", "08:30")]);
    await db.exec(`update public.study_sessions set status = 'completed' where reviewer_artifact_id = '${REVIEWER}'`);
    await expect(apply([reviewerBlock("12:00", "12:30")])).rejects.toThrow(/study_plan_reviewer_duplicate/);
    expect((await rows()).filter((row) => row.reviewer_artifact_id === REVIEWER)).toEqual([
      { block_kind: "reviewer", task_id: null, reviewer_artifact_id: REVIEWER, status: "completed" },
    ]);
  });

  it("replaces planned blocks on repeated apply/replan and keeps kept history", async () => {
    await apply([reviewerBlock("09:00", "09:30"), taskBlock("09:30", "10:30")]);
    await apply([reviewerBlock("09:00", "09:30"), taskBlock("09:30", "10:30")]);
    expect((await rows()).slice(1)).toHaveLength(2);
    await db.exec(`update public.study_sessions set status = 'skipped' where task_id = '${TASK}' and starts_at >= '2026-10-24'`);
    await apply([reviewerBlock("13:00", "13:20", REVIEWER_2)]);
    expect((await rows()).slice(1)).toEqual([
      { block_kind: "task", task_id: TASK, reviewer_artifact_id: null, status: "skipped" },
      { block_kind: "reviewer", task_id: null, reviewer_artifact_id: REVIEWER_2, status: "planned" },
    ]);
    expect((await db.query("select count(*)::int as plans from public.study_plans")).rows).toEqual([{ plans: 3 }]);
  });

  it("enforces one target per row, the owner reviewer key and cascades deleted reviewers", async () => {
    const insert = (values: string) => db.exec(`insert into public.study_sessions(user_id, task_id, block_kind, reviewer_artifact_id, starts_at, ends_at) values ${values}`);
    await expect(insert(`('${OWNER}', '${TASK}', 'reviewer', '${REVIEWER}', '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_block_target/);
    await expect(insert(`('${OWNER}', null, 'reviewer', null, '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_block_target/);
    await expect(insert(`('${OWNER}', null, null, null, '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_block_target/);
    await expect(insert(`('${OWNER}', null, null, '${REVIEWER}', '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_block_target/);
    await expect(insert(`('${OWNER}', null, 'note', '${REVIEWER}', '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_block_kind_allowed/);
    await expect(insert(`('${OWNER}', null, 'reviewer', '${FOREIGN_REVIEWER}', '2026-10-24T09:00Z', '2026-10-24T09:30Z')`)).rejects.toThrow(/study_sessions_reviewer_owner_fkey/);
    await apply([reviewerBlock("09:00", "09:30")]);
    await db.query("select public.record_reviewer_open_v1($1, $2)", [OWNER, REVIEWER]);
    await db.exec(`delete from public.generated_artifacts where id = '${REVIEWER}'`);
    expect((await rows()).filter((row) => row.reviewer_artifact_id)).toEqual([]);
    expect((await db.query("select count(*)::int as opens from public.reviewer_opens")).rows).toEqual([{ opens: 0 }]);
  });

  it("isolates reviewer blocks under the existing owner RLS", async () => {
    await apply([reviewerBlock("09:00", "09:30")]);
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${OTHER}'`);
    expect((await db.query("select id from public.study_sessions")).rows).toEqual([]);
    await db.exec(`set request.jwt.claim.sub = '${OWNER}'`);
    expect((await db.query("select reviewer_artifact_id from public.study_sessions where block_kind = 'reviewer'")).rows)
      .toEqual([{ reviewer_artifact_id: REVIEWER }]);
    await expect(db.query("select * from public.apply_study_plan_v2($1, $2, $3, 'deterministic-v1', $4, '[]'::jsonb)", [OWNER, DAY[0], DAY[1], HASH]))
      .rejects.toThrow(/permission denied/);
  });
});

describe("TP1 reviewer opens and plan mode", () => {
  it("records only the owner's saved reviewers with database time and is service-only", async () => {
    const open = async (user: string, id: string) =>
      (await db.query<{ ok: boolean }>("select public.record_reviewer_open_v1($1, $2) as ok", [user, id])).rows[0]!.ok;
    expect(await open(OWNER, REVIEWER)).toBe(true);
    const first = (await db.query<{ last_opened_at: Date }>("select last_opened_at from public.reviewer_opens")).rows[0]!.last_opened_at;
    expect(await open(OWNER, REVIEWER)).toBe(true);
    const second = (await db.query<{ last_opened_at: Date }>("select last_opened_at from public.reviewer_opens")).rows[0]!.last_opened_at;
    expect(second.getTime()).toBeGreaterThanOrEqual(first.getTime());
    for (const id of [FOREIGN_REVIEWER, DELETED_REVIEWER, QUIZ]) expect(await open(OWNER, id)).toBe(false);
    expect((await db.query("select count(*)::int as opens from public.reviewer_opens")).rows).toEqual([{ opens: 1 }]);
    for (const role of ["authenticated", "anon"]) {
      await db.exec(`reset role; set role ${role}; set request.jwt.claim.sub = '${OWNER}'`);
      await expect(db.query("select * from public.reviewer_opens")).rejects.toThrow(/permission denied/);
      await expect(db.query("select public.record_reviewer_open_v1($1, $2)", [OWNER, REVIEWER])).rejects.toThrow(/permission denied/);
    }
  });

  it("stores only valid plan modes, with null meaning never chosen", async () => {
    await db.query("insert into public.user_profiles(user_id) values($1)", [OWNER]);
    expect((await db.query("select plan_mode from public.user_profiles")).rows).toEqual([{ plan_mode: null }]);
    for (const mode of ["reviewers", "tasks", "reviewers_tasks", null]) {
      await db.query("update public.user_profiles set plan_mode = $1", [mode]);
    }
    await expect(db.query("update public.user_profiles set plan_mode = 'both'")).rejects.toThrow(/user_profiles_plan_mode_key/);
  });

  it("is additive: no applied migration or v1 function is rewritten", () => {
    const sql = read("20261024000100_today_plan_content.sql").toLowerCase();
    expect(sql).not.toMatch(/function public.apply_study_plan_v1/);
    expect(sql).not.toMatch(/drop (table|function|column)/);
    expect(sql).toContain("file only");
  });
});
