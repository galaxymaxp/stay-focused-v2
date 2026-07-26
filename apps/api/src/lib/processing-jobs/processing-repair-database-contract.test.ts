import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260726214339_harden_processing_digest_and_retry_policy.sql",
  ),
  "utf8",
);

describe("processing result-storage repair database contract", () => {
  it("qualifies pgcrypto calls in every restricted processing function", () => {
    expect(migration).toContain("extensions.digest(bytea,text)");
    for (const signature of [
      "public.create_processing_job_v2(uuid,text,text,text,text,text,text,text,text,text,bigint,integer,integer,jsonb,jsonb,jsonb,timestamp with time zone)",
      "public.complete_processing_job_v2(uuid,text,text,jsonb,jsonb,timestamp with time zone)",
      "public.create_source_version_revision(uuid,uuid,text,text,boolean,timestamp with time zone)",
    ]) {
      expect(migration).toContain(signature);
    }
    expect(migration).toMatch(
      /replace\(v_definition,\s*'digest\(',\s*'extensions\.digest\('/i,
    );
  });

  it("separates manual retry eligibility from automatic worker retry", () => {
    const failureFunction = sliceFunction(
      "fail_processing_job_v2",
      "revoke all on function public.create_processing_job_v2",
    );
    expect(failureFunction).toMatch(/p_automatic_retryable boolean/i);
    expect(failureFunction).toMatch(
      /v_manual_retryable[\s\S]*coalesce\(p_automatic_retryable,\s*false\)/i,
    );
    expect(failureFunction).toMatch(/retryable\s*=\s*v_manual_retryable/i);
    expect(failureFunction).toMatch(
      /'automaticRetryable',\s*coalesce\(p_automatic_retryable,\s*false\)/i,
    );
  });

  it("keeps the new failure boundary service-only", () => {
    expect(migration).toMatch(
      /revoke all on function public\.fail_processing_job_v2[\s\S]*from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.fail_processing_job_v2[\s\S]*to service_role/i,
    );
  });
});

function sliceFunction(startName: string, endMarker: string): string {
  const start = migration.indexOf(`function public.${startName}`);
  const end = migration.indexOf(endMarker, start + 1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}
