import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(process.cwd(),
  '../../packages/db/migrations/20261001015348_composite_canvas_page_staging.sql'), 'utf8');

describe('composite Canvas staging migration', () => {
  it('accepts standalone file and one Page plus one PDF without changing historical snapshots', () => {
    const staging = migration.split('create or replace function public.mark_canvas_reviewer_staging_failed_v1')[0]!;
    expect(staging).toContain('v_item_count not in (1, 2)');
    expect(staging).toContain("v_item_count = 1 and v_primary_id is distinct from v_item_id");
    expect(staging).toContain("v_item_count = 2 and (v_primary_id is null");
    expect(staging).toContain("page.course_id = v_file.course_id");
    expect(staging).toContain("page.canvas_connection_id = v_file.canvas_connection_id");
    expect(staging).toContain("reference.referenced_row_id = v_page.id");
    expect(staging).toContain('file.user_id = v_job.user_id');
    expect(staging).toContain('v_file.current_sha256 is distinct from lower(p_expected_content_sha256)');
  });

  it('keeps staging and terminal failure service-only', () => {
    expect(migration).toMatch(/revoke all on function public\.stage_deferred_canvas_reviewer_pdf_v1[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/revoke all on function public\.mark_canvas_reviewer_staging_failed_v1\(uuid\)[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.mark_canvas_reviewer_staging_failed_v1\(uuid\)[\s\S]*to service_role/i);
    expect(migration).toContain("job.workflow_dispatched_at is null");
    expect(migration).toContain("job.attempt_count = 0");
  });
});
