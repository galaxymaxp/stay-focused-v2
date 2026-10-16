import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const upload = "33333333-3333-4333-8333-333333333333";
const hash = "a".repeat(64);
const migration = (name: string) => readFileSync(resolve("../../packages/db/migrations", name), "utf8");
const contract = { artifactType: "reviewer", generationPolicyVersion: "test", engineVersion: "test", schemaVersion: "test",
  providerId: "test", settingsFingerprint: hash, normalizationVersion: "test", reuseMode: "fresh" };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create schema storage; create schema extensions;
    create role anon; create role authenticated; create role service_role bypassrls;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.owner',true),'')::uuid$$;
    create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;
    create function public.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid,bucket_id text,name text);
    grant usage on schema public,auth,storage,extensions to anon,authenticated,service_role;
    insert into auth.users values('${owner}'),('${other}');`);
  await db.exec(migration("20260722225243_durable_processing_jobs.sql").replace("create extension if not exists pgcrypto;", ""));
  await db.exec(migration("20260723084329_reusable_processing_assets.sql"));
  await db.exec(migration("20260723085823_processing_daily_page_quota.sql"));
  await db.exec(migration("20260723090006_processing_quota_concurrency_hardening.sql"));
  const intents = migration("20260726230833_hosted_processing_uploads_and_notifications.sql").split("create table public.push_notification_devices")[0]!;
  await db.exec(intents);
  await db.exec(migration("20261016000100_manual_reviewer_uploads.sql"));
}, 30_000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec(`reset role; truncate processing_jobs,processing_job_sources,source_versions,document_assets,processing_upload_intents cascade;
    update processing_policy_config set max_daily_extraction_jobs=30,max_daily_generation_jobs=30,max_daily_ocr_pages_per_user=200,
      max_queued_extraction_jobs_per_user=20,max_queued_generation_jobs_per_user=20;
    insert into processing_upload_intents(id,user_id,source_kind,display_name,mime_type,expected_byte_size,storage_bucket,storage_object_path,expires_at)
      values('${upload}','${owner}','docx','notes.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',50,'processing-job-sources','${owner}/uploads/${upload}.docx',now()+interval '1 hour');`);
});
async function create(user = owner, key = "manual-test-1", pages = 1) {
  return (await db.query<{ id: string; source_snapshot_id: string; job_type: string; source_version_id: string | null }>(
    "select * from create_manual_reviewer_job_v1($1,$2,$3,$4,$5,$6::jsonb)", [user, upload, key, hash, pages, JSON.stringify(contract)])).rows[0]!;
}
async function run() {
  const job = await create();
  await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [job.id]);
  return job;
}
async function attach(job: { id: string }, text = "Synthetic teaching source.", worker = "worker") {
  return db.query("select * from attach_manual_reviewer_source_v1($1,$2,$3,$4::jsonb)", [job.id, worker, text, JSON.stringify([{ id: "office-1", kind: "paragraph", text }])]);
}
it("accepts one immutable binary reviewer job, atomically marks intent, and replays one key", async () => {
  const job = await create();
  expect(job.job_type).toBe("reviewer_generation"); expect(job.source_version_id).toBeNull();
  expect((await create()).id).toBe(job.id);
  expect((await db.query("select * from source_versions")).rows).toHaveLength(0);
  expect((await db.query("select source_kind,source_text from processing_job_sources")).rows).toEqual([{ source_kind: "docx", source_text: null }]);
  expect((await db.query("select status,job_id from processing_upload_intents")).rows).toEqual([{ status: "accepted", job_id: job.id }]);
  await expect(create(owner, "different-key")).rejects.toThrow("upload_intent_expired");
});
it("attaches immutable exact text once under a live lease, with Office blocks and source identity", async () => {
  const job = await run(); await attach(job); await attach(job, "replayed changed text");
  expect((await db.query<{ source_text: string }>("select source_text from source_versions")).rows).toEqual([{ source_text: "Synthetic teaching source." }]);
  const source = (await db.query<{ source_kind: string; metadata: Record<string, unknown> }>("select * from processing_job_sources")).rows[0]!;
  expect(source.source_kind).toBe("text"); expect(source.metadata.sourceType).toBe("local_file");
  expect(source.metadata.reviewerSourceBlocks).toHaveLength(1);
});
it("publishes one persisted reviewer from the same job", async () => {
  const job = await run(); await attach(job);
  await db.query("select * from complete_processing_job_v2($1,'worker','reviewer_generation',$2::jsonb,'{}'::jsonb)",
    [job.id, JSON.stringify({ reviewer: { title: "Cells", sections: [] } })]);
  expect((await db.query("select status from processing_jobs")).rows).toEqual([{ status: "succeeded" }]);
  expect((await db.query("select * from processing_job_results")).rows).toHaveLength(1);
  expect((await db.query("select * from generated_artifact_versions")).rows).toHaveLength(1);
  expect((await db.query("select * from extraction_results")).rows).toHaveLength(0);
});
it("child Retry retains exact resolved source even when retrying an older extraction failure again", async () => {
  const original = await create();
  await db.query("update processing_jobs set status='failed',retryable=true where id=$1", [original.id]);
  async function retry(key: string) {
    const child = (await db.query<{ id: string }>("select * from retry_processing_job($1,$2,$3)", [owner, original.id, key])).rows[0]!;
    await db.query("update processing_jobs set status='running',lease_owner='worker',lease_expires_at=now()+interval '5 minutes' where id=$1", [child.id]);
    return child;
  }
  const child = await retry("child-retry-1"); await attach(child);
  const later = await retry("child-retry-2"); await attach(later, "do not replace persisted source");
  const versions = (await db.query<{ source_version_id: string }>("select source_version_id from processing_jobs where id in ($1,$2)", [child.id, later.id])).rows;
  expect(versions[0]!.source_version_id).toBeTruthy(); expect(versions[1]!.source_version_id).toBe(versions[0]!.source_version_id);
  expect((await db.query("select source_text from source_versions")).rows).toEqual([{ source_text: "Synthetic teaching source." }]);
});
it("rejects foreign owner, wrong worker, expired lease, empty text and cancellation", async () => {
  await expect(create(other)).rejects.toThrow("upload_intent_not_found");
  const job = await run();
  await expect(attach(job, "source", "other-worker")).rejects.toThrow("processing_job_source_attach_rejected");
  await expect(attach(job, " ")).rejects.toThrow("processing_source_text_invalid");
  await db.exec("update processing_jobs set lease_expires_at=now()-interval '1 second'");
  await expect(attach(job)).rejects.toThrow("processing_job_source_attach_rejected");
  await db.exec("update processing_jobs set status='cancellation_requested',lease_expires_at=now()+interval '5 minutes'");
  await expect(attach(job)).rejects.toThrow("processing_job_source_attach_rejected");
  await expect(db.query("select * from complete_processing_job_v2($1,'worker','reviewer_generation','{}','{}')", [job.id]))
    .rejects.toThrow("processing_job_completion_rejected");
  expect((await db.query("select * from source_versions")).rows).toHaveLength(0);
  expect((await db.query("select * from processing_job_results")).rows).toHaveLength(0);
});
it.each(["max_daily_extraction_jobs", "max_daily_generation_jobs", "max_queued_extraction_jobs_per_user", "max_queued_generation_jobs_per_user"])("preserves %s admission", async limit => {
  await db.exec(`update processing_policy_config set ${limit}=1`);
  await create();
  await db.exec(`update processing_upload_intents set status='pending',job_id=null`);
  await expect(create(owner, "manual-test-2")).rejects.toThrow(/limit_reached/);
  expect((await db.query("select * from processing_jobs")).rows).toHaveLength(1);
});
it("charges accepted pages even after source resolution and denies either public role mutation", async () => {
  await db.exec("update processing_policy_config set max_daily_ocr_pages_per_user=1");
  const job = await run(); await attach(job);
  await db.exec("update processing_upload_intents set status='pending',job_id=null");
  await expect(create(owner, "manual-test-2")).rejects.toThrow("processing_job_daily_ocr_page_limit_reached");
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    try { await expect(create()).rejects.toThrow(/permission denied/); await expect(attach(job)).rejects.toThrow(/permission denied/); }
    finally { await db.exec("reset role"); }
  }
});
