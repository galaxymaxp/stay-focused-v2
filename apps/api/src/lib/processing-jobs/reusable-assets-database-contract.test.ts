import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723084329_reusable_processing_assets.sql",
  ),
  "utf8",
);
const operationsMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723084855_processing_worker_operations.sql",
  ),
  "utf8",
);
const pageQuotaMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723085823_processing_daily_page_quota.sql",
  ),
  "utf8",
);
const quotaHardeningMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql",
  ),
  "utf8",
);
const accountDeletionMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723091048_processing_account_deletion_hardening.sql",
  ),
  "utf8",
);
const artifactDeletionMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723091222_processing_artifact_soft_delete.sql",
  ),
  "utf8",
);
const lifecycleBatchingMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260723091627_processing_lifecycle_batching.sql",
  ),
  "utf8",
);

describe("reusable processing asset database contract", () => {
  it("separates jobs from durable document, extraction, source, and artifact versions", () => {
    for (const table of [
      "document_assets",
      "extraction_results",
      "source_versions",
      "generated_artifacts",
      "generated_artifact_versions",
    ]) {
      expect(migration).toMatch(
        new RegExp(`create table public\\.${table}\\b`, "i"),
      );
    }
    expect(migration).toMatch(/source_versions_are_immutable/i);
    expect(migration).toMatch(/generated_artifact_versions_are_immutable/i);
  });

  it("stores complete safe artifact provenance", () => {
    for (const field of [
      "source_version_id",
      "source_content_sha256",
      "artifact_type",
      "generation_policy_version",
      "engine_version",
      "schema_version",
      "provider_id",
      "settings_fingerprint",
      "generation_job_id",
    ]) {
      expect(migration).toMatch(new RegExp(`\\b${field}\\b`, "i"));
    }
  });

  it("requires same-owner exact-content and policy matches for extraction reuse", () => {
    const creation = sliceFunction(
      "create_processing_job_v2",
      "claim_processing_jobs_v2",
    );
    expect(creation).toMatch(/asset\.user_id\s*=\s*p_user_id/i);
    expect(creation).toMatch(/asset\.content_sha256\s*=\s*v_content_sha256/i);
    expect(creation).toMatch(/asset\.mime_type\s*=\s*p_mime_type/i);
    expect(creation).toMatch(
      /extraction\.parser_policy_version\s*=\s*v_parser_policy_version/i,
    );
    expect(creation).toMatch(
      /extraction\.ocr_policy_version\s*=\s*v_ocr_policy_version/i,
    );
    expect(creation).toMatch(
      /extraction\.normalization_version\s*=\s*v_normalization_version/i,
    );
  });

  it("offers artifact reuse only for an exact source and generation fingerprint", () => {
    const creation = sliceFunction(
      "create_processing_job_v2",
      "claim_processing_jobs_v2",
    );
    expect(creation).toMatch(/version\.user_id\s*=\s*p_user_id/i);
    expect(creation).toMatch(
      /version\.source_version_id\s*=\s*v_source_version\.id/i,
    );
    expect(creation).toMatch(
      /version\.settings_fingerprint\s*=\s*v_settings_fingerprint/i,
    );
    expect(creation).toMatch(/v_reuse_mode\s*=\s*'reuse_existing'/i);
    expect(creation).toMatch(/reuse_candidate_artifact_version_id/i);
  });

  it("enforces bounded queues and fair per-user claims", () => {
    expect(migration).toMatch(/max_active_jobs_per_user/i);
    expect(migration).toMatch(/max_daily_extraction_jobs/i);
    expect(migration).toMatch(/max_daily_generation_jobs/i);
    const claim = sliceFunction(
      "claim_processing_jobs_v2",
      "complete_processing_job_v2",
    );
    expect(claim).toMatch(/partition by job\.user_id/i);
    expect(claim).toMatch(/partition by job\.job_type/i);
    expect(claim).toMatch(/for update of job skip locked/i);
    expect(claim).toMatch(/max_running_jobs_per_user/i);
  });

  it("preserves concurrent edits and detects selection conflicts", () => {
    const edit = sliceFunction(
      "create_source_version_revision",
      "soft_delete_document_asset",
    );
    expect(edit).toMatch(/insert into public\.source_versions/i);
    expect(edit).toMatch(/parent_source_version_id/i);
    expect(edit).toMatch(
      /asset\.selected_source_version_id\s*=\s*v_parent\.id/i,
    );
    expect(edit).toMatch(/v_conflict\s*:=\s*not v_selected/i);
  });

  it("bounds history cleanup without touching active jobs", () => {
    const cleanup = sliceFunction(
      "run_processing_lifecycle_cleanup",
      "do $$",
    );
    expect(cleanup).toMatch(/p_dry_run/i);
    expect(cleanup).toMatch(
      /job\.status in \('failed', 'cancelled', 'expired'\)/i,
    );
    expect(cleanup).toMatch(/job\.status = 'succeeded'/i);
    expect(cleanup).not.toMatch(/job\.status in \('queued', 'running'/i);
  });

  it("keeps production contracts subject-neutral", () => {
    expect(migration).not.toMatch(
      /\b(?:IT Security|malware|network security|cybersecurity)\b/i,
    );
  });

  it("records an idle worker heartbeat behind a service-only boundary", () => {
    expect(operationsMigration).toMatch(
      /create table public\.processing_worker_heartbeats/i,
    );
    expect(operationsMigration).toMatch(
      /alter table public\.processing_worker_heartbeats enable row level security/i,
    );
    expect(operationsMigration).toMatch(
      /record_processing_worker_heartbeat/i,
    );
    expect(operationsMigration).toMatch(
      /grant execute on function public\.record_processing_worker_heartbeat[\s\S]*to service_role/i,
    );
  });

  it("covers the owner-scoped asset and artifact foreign-key paths", () => {
    for (const index of [
      "document_assets_selected_source_owner_idx",
      "extraction_results_document_owner_idx",
      "source_versions_parent_owner_idx",
      "generated_artifact_versions_source_owner_idx",
      "processing_jobs_source_version_owner_idx",
      "processing_job_results_artifact_version_owner_idx",
    ]) {
      expect(operationsMigration).toContain(index);
    }
  });

  it("rejects daily extraction work before it can exceed the page budget", () => {
    expect(pageQuotaMigration).toMatch(/max_daily_ocr_pages_per_user/i);
    expect(pageQuotaMigration).toMatch(
      /before insert on public\.processing_jobs/i,
    );
    expect(pageQuotaMigration).toMatch(
      /processing_job_daily_ocr_page_limit_reached/i,
    );
    expect(pageQuotaMigration).toMatch(
      /sum\(greatest\(1, coalesce\(source\.page_count, 1\)\)\)/i,
    );
  });

  it("serializes final per-account quota admission under concurrent requests", () => {
    expect(quotaHardeningMigration).toMatch(/pg_advisory_xact_lock/i);
    for (const code of [
      "processing_job_active_limit_reached",
      "processing_job_rate_limit_reached",
      "processing_job_extraction_queue_limit_reached",
      "processing_job_generation_queue_limit_reached",
      "processing_job_daily_extraction_limit_reached",
      "processing_job_daily_generation_limit_reached",
      "processing_job_daily_ocr_page_limit_reached",
    ]) {
      expect(quotaHardeningMigration).toContain(code);
    }
  });

  it("allows one account-deletion transaction to remove the cyclic owned graph", () => {
    expect(accountDeletionMigration).toMatch(
      /document_assets_latest_extraction_owner_fkey[\s\S]*deferrable initially deferred/i,
    );
    expect(accountDeletionMigration).toMatch(
      /source_versions_parent_owner_fkey[\s\S]*deferrable initially deferred/i,
    );
    expect(accountDeletionMigration).toMatch(
      /processing_jobs_result_owner_fkey[\s\S]*deferrable initially deferred/i,
    );
    expect(accountDeletionMigration).toMatch(
      /generated_artifacts_latest_version_owner_fkey[\s\S]*deferrable initially deferred/i,
    );
    expect(accountDeletionMigration).not.toMatch(/on delete set null/i);
  });

  it("soft-deletes an artifact without deleting its reusable source", () => {
    expect(artifactDeletionMigration).toMatch(
      /update public\.generated_artifacts/i,
    );
    expect(artifactDeletionMigration).not.toMatch(
      /(?:delete from|update)\s+public\.source_versions/i,
    );
    expect(artifactDeletionMigration).toMatch(/to service_role/i);
  });

  it("compacts terminal history in deterministic bounded batches", () => {
    expect(lifecycleBatchingMigration).toMatch(
      /order by event\.created_at, event\.id\s+limit 500\s+for update skip locked/i,
    );
    expect(lifecycleBatchingMigration).toMatch(
      /order by job\.updated_at, job\.id\s+limit 100\s+for update skip locked/i,
    );
    expect(lifecycleBatchingMigration).toMatch(
      /order by job\.completed_at, job\.id\s+limit 100\s+for update skip locked/i,
    );
    expect(lifecycleBatchingMigration).toMatch(/deletedOrphanSnapshotRows/i);
  });
});

function sliceFunction(startName: string, endMarker: string): string {
  const start = migration.indexOf(`function public.${startName}`);
  const end = migration.indexOf(endMarker, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}
