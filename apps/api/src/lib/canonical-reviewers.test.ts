import type { Database } from "@stay-focused/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { listCanonicalReviewerRecords, readCanonicalReviewerRecord } from "./canonical-reviewers";

const USER = "11111111-1111-4111-8111-111111111111";
const ARTIFACT = "22222222-2222-4222-8222-222222222222";
const VERSION = "33333333-3333-4333-8333-333333333333";
const SOURCE = "44444444-4444-4444-8444-444444444444";

describe("canonical Reviewer lookup", () => {
  it("returns the exact active owned Reviewer and its current version/source", async () => {
    const result = await readCanonicalReviewerRecord(client(), USER, ARTIFACT);
    expect(result).toMatchObject({ ok: true, value: { artifact: { id: ARTIFACT }, version: { id: VERSION }, source: { id: SOURCE } } });
  });

  it.each([
    ["wrong owner", { artifact: { user_id: "55555555-5555-4555-8555-555555555555" } }],
    ["non-Reviewer", { artifact: { artifact_type: "summary" } }],
    ["deleted", { artifact: { deleted_at: "2026-09-23T00:00:00Z" } }],
    ["wrong current version", { version: { artifact_id: "66666666-6666-4666-8666-666666666666" } }],
    ["wrong source owner", { source: { user_id: "55555555-5555-4555-8555-555555555555" } }],
  ])("excludes %s records defensively", async (_label, changes) => {
    const result = await listCanonicalReviewerRecords(client(changes), USER);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("returns a safe failure when any canonical relation cannot be read", async () => {
    expect(await listCanonicalReviewerRecords(client({ artifactsError: true }), USER)).toEqual({ ok: false });
  });
});

function client(changes: {
  artifact?: Record<string, unknown>;
  version?: Record<string, unknown>;
  source?: Record<string, unknown>;
  artifactsError?: boolean;
} = {}): SupabaseClient<Database> {
  const rows = {
    generated_artifacts: [{ id: ARTIFACT, user_id: USER, artifact_type: "reviewer", safe_title: "Study Habits", source_version_id: SOURCE, latest_version_id: VERSION, metadata: {}, created_at: "2026-09-23T00:00:00Z", updated_at: "2026-09-23T00:00:00Z", deleted_at: null, ...changes.artifact }],
    generated_artifact_versions: [{ id: VERSION, user_id: USER, artifact_id: ARTIFACT, version_number: 1, source_version_id: SOURCE, source_content_sha256: "a".repeat(64), artifact_type: "reviewer", payload: { reviewer: { id: "output" } }, generation_policy_version: "v1", engine_version: "v1", schema_version: "v1", provider_id: "test", settings_fingerprint: "fingerprint", generation_job_id: null, created_at: "2026-09-23T00:00:00Z", ...changes.version }],
    source_versions: [{ id: SOURCE, user_id: USER, document_asset_id: null, extraction_result_id: null, parent_source_version_id: null, revision_kind: "canvas_resolved", content_sha256: "a".repeat(64), source_text: "Source", character_count: 6, normalization_version: null, created_by: "system", created_at: "2026-09-23T00:00:00Z", superseded_at: null, metadata: {}, ...changes.source }],
  };
  return {
    from: vi.fn((table: keyof typeof rows) => {
      const response = { data: rows[table], error: table === "generated_artifacts" && changes.artifactsError ? { message: "denied" } : null };
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "order"]) builder[method] = vi.fn(() => builder);
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
      return builder;
    }),
  } as unknown as SupabaseClient<Database>;
}
