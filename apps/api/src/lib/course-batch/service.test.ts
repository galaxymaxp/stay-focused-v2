import { beforeEach, expect, it, vi } from 'vitest';
import type { CourseReviewerRequestRow } from '@stay-focused/db';
const mocks = vi.hoisted(() => ({ list: vi.fn(), evidence: vi.fn(), lookup: vi.fn(), prepared: vi.fn(), admit: vi.fn(), start: vi.fn(), dispatch: vi.fn(), reviewed: vi.fn(), freshness: vi.fn() }));
vi.mock('@/lib/canvas-reviewer-sources', () => ({ listCanvasReviewerSources: mocks.list }));
vi.mock('@/lib/canvas-preparation/admission', () => ({ materialEvidence: mocks.evidence, lookupMaterialPreparation: mocks.lookup, admitMaterialPreparation: mocks.admit }));
vi.mock('@/lib/canvas-preparation/repository', async importOriginal => ({ ...await importOriginal<object>(), readPreparedResult: mocks.prepared }));
vi.mock('@/lib/experience/generation', () => ({ startReviewerGeneration: mocks.start }));
vi.mock('@/lib/processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: mocks.dispatch }));
vi.mock('@/lib/experience/repository', () => ({ experienceRepository: () => ({ materialReviewers: mocks.reviewed }) }));
vi.mock('@/lib/reviewer-source-status', () => ({ readReviewerSourceStatus: mocks.freshness }));
import { advanceCourseRequest, createCourseBatch, mutateCourseRequest, previewCourseBatch, resumeCourseRequests } from './service';
import { revisionFingerprint } from '@/lib/canvas-preparation/repository';
import { ExperienceFailure } from '@/lib/experience/errors';
const evidence = [{ type: 'page' as const, id: 'lesson', revision: 'a'.repeat(64) }];
function row(id = 'request'): CourseReviewerRequestRow { return { id, user_id: 'owner', course_id: 'past-course', canvas_connection_id: 'connection', material_id: 'page:lesson', revision: revisionFingerprint(evidence), batch_key: 'b'.repeat(64), batch_keys: [], title: 'Lesson', state: 'waiting', job_id: null, next_available_at: null, created_at: '2026-10-16', updated_at: '2026-10-16' }; }
function store(initial: CourseReviewerRequestRow[] = [row()], current = false) {
  const rows = initial;
  const client = { rpc: vi.fn(async () => ({ data: '2026-10-17T00:00:00Z', error: null })), from: (table: string) => {
    const tests: ((r: Record<string, unknown>) => boolean)[] = []; let patch: Record<string, unknown> | null = null;
    const result = () => {
      const fixtures: Record<string, Record<string, unknown>[]> = { generated_artifacts: [{id:'artifact',user_id:'owner',latest_version_id:'version',artifact_type:'reviewer',deleted_at:null}], generated_artifact_versions:[{id:'version',artifact_id:'artifact',user_id:'owner',source_version_id:'source'}],source_versions:[{id:'source',user_id:'owner',metadata:{reviewerSourceSnapshotId:'snapshot'}}],reviewer_source_snapshots:[{id:'snapshot',user_id:'owner',course_id:'past-course'}],reviewer_source_snapshot_items:[{source_snapshot_id:'snapshot',user_id:'owner',course_id:'past-course',source_type:'page',source_row_id:'lesson'}] };
      const values: Record<string, unknown>[] = current && fixtures[table] ? fixtures[table] : table === 'course_reviewer_requests' ? rows : table === 'canvas_courses' ? [{ id: 'past-course', user_id: 'owner', canvas_connection_id: 'connection' }] : [];
      const selected = values.filter(r => tests.every(test => test(r)));
      if (patch) selected.forEach(r => Object.assign(r, patch));
      return { data: selected, error: null };
    };
    const q = { select: () => q, order: () => q, is: (key: string, value: unknown) => { tests.push(r => r[key] === value); return q; }, limit: () => q, range: () => q,
      eq: (key: string, value: unknown) => { tests.push(r => r[key] === value); return q; },
      in: (key: string, value: unknown[]) => { tests.push(r => value.includes(r[key])); return q; },
      update: (value: Record<string, unknown>) => { patch = value; return q; },
      upsert: (value: CourseReviewerRequestRow) => { if (!rows.some(r => r.user_id === value.user_id && r.material_id === value.material_id && r.revision === value.revision)) rows.push({ ...row(`request-${rows.length}`), ...value }); return q; },
      maybeSingle: async () => ({ ...result(), data: result().data[0] ?? null }), single: async () => ({ ...result(), data: result().data[0] ?? null }),
      then: <T>(resolve: (value: ReturnType<typeof result>) => T) => Promise.resolve(result()).then(resolve),
    }; return q;
  } };
  return { client: client as never, rows, rpc: client.rpc };
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.evidence.mockResolvedValue({ evidence }); mocks.lookup.mockResolvedValue({ id: 'prep', state: 'prepared' });
  mocks.prepared.mockResolvedValue({ components: evidence }); mocks.admit.mockResolvedValue({ id: 'prep', state: 'pending' }); mocks.start.mockResolvedValue({ id: 'job' });
  mocks.list.mockResolvedValue({ ok: true, value: { sources: [{ id: 'page:lesson', title: 'Lesson', type: 'page' }], pagination: { hasMore: false } } });
  mocks.reviewed.mockResolvedValue(new Map());
});
it('retains still-preparing intent without invoking generation or preview text', async () => {
  const s = store(); mocks.prepared.mockResolvedValue(null); await advanceCourseRequest(s.client, s.rows[0]!);
  expect(s.rows[0]!.state).toBe('waiting'); expect(mocks.start).not.toHaveBeenCalled();
  expect(mocks.admit).toHaveBeenCalledWith(s.client, expect.objectContaining({ cycleKey: 'manual:batch:request', explicitFilePermission: true }));
});
it('resumes explicit past-course work with Auto off without consulting automatic preference', async () => {
  const s = store(); await resumeCourseRequests(s.client, { userId: 'owner', courseId: 'past-course' });
  expect(mocks.start).toHaveBeenCalledExactlyOnceWith(s.client, 'owner', expect.objectContaining({ materialId: 'page:lesson' }), 'course-batch:request', expect.objectContaining({ expectedPreparationRevision: row().revision }));
  expect(mocks.dispatch).toHaveBeenCalledWith({ id: 'job' }, { client: s.client });
});
it.each(['failed', 'cancelled'])('terminal preparation %s ends the intent without looping', async state => {
  const s = store(); mocks.lookup.mockResolvedValue({ state }); await advanceCourseRequest(s.client, s.rows[0]!); await advanceCourseRequest(s.client, s.rows[0]!);
  expect(s.rows[0]!.state).toBe('failed'); expect(mocks.admit).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
});
it('changed revisions fail safely', async () => {
  const s = store(); mocks.evidence.mockResolvedValue({ evidence: [{ ...evidence[0], revision: 'c'.repeat(64) }] });
  await advanceCourseRequest(s.client, s.rows[0]!); expect(s.rows[0]!.state).toBe('failed'); expect(mocks.start).not.toHaveBeenCalled();
});
it('quota overflow remains saved with the server retry threshold', async () => {
  const s = store(); mocks.start.mockRejectedValue(new ExperienceFailure(429, 'rate_limited')); await advanceCourseRequest(s.client, s.rows[0]!);
  expect(s.rows[0]).toMatchObject({ state: 'quota', next_available_at: '2026-10-17T00:00:00Z' });
});
it('cancels pending work, and rejects a different owner', async () => {
  const s = store(); await expect(mutateCourseRequest(s.client, 'other', 'request', 'cancel')).rejects.toMatchObject({ status: 404 });
  await mutateCourseRequest(s.client, 'owner', 'request', 'cancel'); await resumeCourseRequests(s.client, { userId: 'owner' });
  expect(s.rows[0]!.state).toBe('cancelled'); expect(mocks.start).not.toHaveBeenCalled();
});
it('one failed request does not stop a different material', async () => {
  const s = store([row('a'), row('b')]); mocks.start.mockRejectedValueOnce(new Error('private-provider-detail')).mockResolvedValueOnce({ id: 'second' });
  await resumeCourseRequests(s.client); expect(s.rows[0]!.state).toBe('failed'); expect(mocks.start).toHaveBeenCalledTimes(2); expect(mocks.dispatch).toHaveBeenCalledWith({ id: 'second' }, expect.anything());
});
it('rejects incomplete inventories and foreign selected materials before saving', async () => {
  const s = store([]); await expect(createCourseBatch(s.client, 'owner', 'past-course', ['page:foreign'])).rejects.toMatchObject({ status: 404 }); expect(s.rows).toHaveLength(0);
  mocks.list.mockResolvedValue({ ok: true, value: { sources: [], pagination: { hasMore: true } } });
  await expect(previewCourseBatch(s.client, 'owner', 'past-course')).rejects.toMatchObject({ status: 503 });
});
it('another owner course is denied before reviewer or preparation access', async () => {
  const s = store([]); mocks.list.mockResolvedValue({ ok: false, status: 404 });
  await expect(createCourseBatch(s.client, 'other', 'past-course', 'all')).rejects.toMatchObject({ status: 404 });
  expect(s.rows).toHaveLength(0); expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.admit).not.toHaveBeenCalled();
});
it('saves a stable request before preparation starts and repeats reuse it', async () => {
  const s = store([]); mocks.prepared.mockResolvedValue(null);
  await createCourseBatch(s.client, 'owner', 'past-course', 'all'); await createCourseBatch(s.client, 'owner', 'past-course', 'all');
  expect(s.rows).toHaveLength(1); expect(s.rows[0]).toMatchObject({ user_id: 'owner', material_id: 'page:lesson', state: 'waiting' }); expect(mocks.start).not.toHaveBeenCalled();
});
it('Generate all skips an exact current reviewer before creating any job', async () => {
  const s = store([], true); mocks.reviewed.mockResolvedValue(new Map([['page:lesson', 'artifact']])); mocks.freshness.mockResolvedValue({ ok: true, value: { overallStatus: 'current' } });
  const result = await createCourseBatch(s.client, 'owner', 'past-course', 'all');
  expect(result).toMatchObject({ created: 0, skippedUpToDate: 1 }); expect(s.rows).toHaveLength(0); expect(mocks.start).not.toHaveBeenCalled();
});
it('a newly attached source invalidates an otherwise current reviewer', async () => {
  const s = store([], true); mocks.reviewed.mockResolvedValue(new Map([['page:lesson', 'artifact']])); mocks.freshness.mockResolvedValue({ ok: true, value: { overallStatus: 'current' } });
  mocks.evidence.mockResolvedValue({ evidence: [...evidence, { type: 'file', id: 'new-attachment', revision: 'b'.repeat(64) }] });
  expect((await previewCourseBatch(s.client, 'owner', 'past-course')).items[0]).toMatchObject({ done: false, selectable: true });
});
it('concurrent repeated submission saves one source-version request and uses the same canonical job key', async () => {
  const s = store([]);
  const results = await Promise.all([createCourseBatch(s.client, 'owner', 'past-course', 'all'), createCourseBatch(s.client, 'owner', 'past-course', 'all')]);
  expect(results[0]!.batchKey).toBe(results[1]!.batchKey); expect(s.rows).toHaveLength(1);
  expect(new Set(mocks.start.mock.calls.map(call => call[3])).size).toBe(1);
});
it('an explicit selected set excludes all other materials', async () => {
  const s = store([]); mocks.prepared.mockResolvedValue(null);
  mocks.list.mockResolvedValue({ ok: true, value: { sources: [{id:'page:lesson',title:'Lesson',type:'page'},{id:'page:second',title:'Second',type:'page'}], pagination: {hasMore:false} } });
  await createCourseBatch(s.client, 'owner', 'past-course', ['page:second']);
  expect(s.rows.map(row => row.material_id)).toEqual(['page:second']);
});
