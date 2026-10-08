import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
let db: PGlite;

async function asRole<T>(role: "anon" | "authenticated", userId: string, action: () => Promise<T>) {
  await db.exec(`begin; set local role ${role}; select set_config('request.jwt.claim.sub', '${userId}', true);`);
  try {
    return await action();
  } finally {
    await db.exec("rollback");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create role anon;
    create role authenticated;
    create function auth.uid() returns uuid language sql stable
      as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to anon, authenticated;

    create table public.generated_artifacts (id uuid primary key, user_id uuid not null);
    create table public.generated_artifact_versions (id uuid primary key, user_id uuid not null);
    create table public.source_versions (id uuid primary key, user_id uuid not null);

    alter table public.generated_artifacts enable row level security;
    alter table public.generated_artifact_versions enable row level security;
    alter table public.source_versions enable row level security;

    create policy generated_artifacts_select_own on public.generated_artifacts
      for select to authenticated using ((select auth.uid()) = user_id);
    create policy generated_artifact_versions_select_own on public.generated_artifact_versions
      for select to authenticated using ((select auth.uid()) = user_id);
    create policy source_versions_select_own on public.source_versions
      for select to authenticated using ((select auth.uid()) = user_id);

    insert into public.generated_artifacts values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '${OWNER}'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '${OTHER}');
    insert into public.generated_artifact_versions values
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '${OWNER}'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '${OTHER}');
    insert into public.source_versions values
      ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '${OWNER}'),
      ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '${OTHER}');
  `);
  await db.exec(readFileSync(resolve("../../packages/db/migrations/20260923010000_authenticated_canonical_reviewer_reads.sql"), "utf8"));
});

afterAll(async () => {
  await db?.close();
});

describe("authenticated canonical Reviewer reads", () => {
  it.each(["generated_artifacts", "generated_artifact_versions", "source_versions"])(
    "allows owner-only SELECT on %s",
    async (table) => {
      await asRole("authenticated", OWNER, async () => {
        const rows = (await db.query<{ user_id: string }>(`select user_id from public.${table}`)).rows;
        expect(rows).toEqual([{ user_id: OWNER }]);
      });
    },
  );

  it("keeps anonymous reads and authenticated mutations denied", async () => {
    await expect(asRole("anon", OWNER, () => db.query("select * from public.generated_artifacts"))).rejects.toThrow(/permission denied/);
    await expect(asRole("authenticated", OWNER, () => db.query("update public.generated_artifacts set user_id = user_id"))).rejects.toThrow(/permission denied/);
  });
});
