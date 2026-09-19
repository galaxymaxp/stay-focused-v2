import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), '../../packages/db/migrations/20260919234000_attach_chunked_canvas_reviewer_source.sql'),
  'utf8',
);

describe('deferred Canvas reviewer source database contract', () => {
  it('stages only an owner-scoped ready private Canvas PDF before dispatch', () => {
    expect(migration).toMatch(/stage_deferred_canvas_reviewer_pdf_v1[\s\S]*auth\.uid\(\) is distinct from v_job\.user_id/i);
    expect(migration).toMatch(/from public\.canvas_files file[\s\S]*file\.user_id = v_job\.user_id[\s\S]*file\.course_id::text/i);
    expect(migration).toMatch(/v_file\.storage_bucket <> 'canvas-source-files'/i);
    expect(migration).toMatch(/v_job\.status <> 'queued'[\s\S]*v_job\.workflow_dispatched_at is not null/i);
    expect(migration).toMatch(/source_kind = 'pdf'[\s\S]*storage_bucket = v_file\.storage_bucket[\s\S]*source_text = null/i);
  });

  it('locks and verifies the owned running job before replacing its source reference', () => {
    expect(migration).toMatch(/from public\.processing_jobs job[\s\S]*where job\.id = p_job_id[\s\S]*for update/i);
    expect(migration).toMatch(/v_job\.job_type <> 'reviewer_generation'/i);
    expect(migration).toMatch(/v_job\.lease_owner is distinct from p_worker_id/i);
    expect(migration).toMatch(/source\.id = v_job\.source_snapshot_id[\s\S]*source\.user_id = v_job\.user_id[\s\S]*for update/i);
  });

  it('requires exact Canvas identity and attaches immutable resolved provenance atomically', () => {
    expect(migration).toMatch(/canvasDeferredResolutionVersion/i);
    expect(migration).toMatch(/canvasCourseId[\s\S]*is distinct from[\s\S]*canvasCourseId/i);
    expect(migration).toMatch(/canvasItemIds[\s\S]*is distinct from[\s\S]*canvasItemIds/i);
    expect(migration).toMatch(/insert into public\.source_versions[\s\S]*'canvas_resolved'/i);
    expect(migration).toMatch(/update public\.processing_job_sources source[\s\S]*source_kind = 'text'[\s\S]*storage_bucket = null[\s\S]*storage_object_path = null/i);
    expect(migration).toMatch(/update public\.processing_jobs job[\s\S]*source_version_id = v_source_version_id/i);
  });

  it('keeps the worker-only mutation unavailable to clients', () => {
    expect(migration).toMatch(/security definer[\s\S]*set search_path = public, pg_temp/i);
    expect(migration).toMatch(/revoke all on function public\.attach_deferred_canvas_reviewer_source_v1[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.attach_deferred_canvas_reviewer_source_v1[\s\S]*to service_role/i);
  });

  it('keeps staging unavailable to clients after the API verifies ownership', () => {
    expect(migration).toMatch(/revoke all on function public\.stage_deferred_canvas_reviewer_pdf_v1[\s\S]*from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.stage_deferred_canvas_reviewer_pdf_v1[\s\S]*to service_role/i);
  });
});
