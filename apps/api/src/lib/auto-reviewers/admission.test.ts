import { describe, expect, it, vi } from 'vitest';
import type { CanvasReviewerSourceDescriptor } from '@/lib/canvas-reviewer-sources';
import { ExperienceFailure } from '@/lib/experience/errors';
import { AUTO_REVIEWER_CANDIDATE_MAX_PAGES, AUTO_REVIEWER_CANDIDATE_PAGE_SIZE, autoReviewerIdempotencyKey, isAutoReviewerEligible, isNewSinceBaseline, runAutomaticReviewerAdmission } from './admission';

const worker = vi.hoisted(() => ({ generate: vi.fn(), dispatch: vi.fn() }));
vi.mock('@/lib/experience/generation', () => ({ startReviewerGeneration: worker.generate }));
vi.mock('@/lib/processing-jobs/workflow-dispatch', () => ({ dispatchAcceptedProcessingJob: worker.dispatch }));

type Row = Record<string, unknown>;
type Result = { data: Row[] | Row | null; error: { code: string } | null; count: number | null };
/** Only the PostgREST operations used by admission; retains owner filters. */
class Query implements PromiseLike<Result> {
  private filters: ((row: Row) => boolean)[] = [];
  private mode: 'read' | 'seed' | 'update' = 'read';
  private payload: Row | Row[] = {};
  private single = false;
  private head = false;
  private offset = 0;
  private end = 999;
  private orderKey: string | null = null;
  constructor(private readonly table: Row[], private readonly now: string, private readonly fail: boolean, private readonly tableName: string) {}
  select(_columns: string, options?: { head?: boolean }) { this.head = options?.head ?? false; return this; }
  eq(key: string, value: unknown) { this.filters.push(row => row[key] === value); return this; }
  in(key: string, values: unknown[]) { this.filters.push(row => values.includes(row[key])); return this; }
  lt(key: string, value: number) { this.filters.push(row => Number(row[key]) < value); return this; }
  gte(key: string, value: string) { this.filters.push(row => String(row[key]) >= value); return this; }
  maybeSingle() { this.single = true; return this; }
  upsert(payload: Row | Row[]) { this.mode = 'seed'; this.payload = payload; return this; }
  update(payload: Row) { this.mode = 'update'; this.payload = payload; return this; }
  order(key: string) { this.orderKey = key; return this; }
  range(start: number, end: number) { this.offset = start; this.end = end; return this; }
  then<T = Result, U = never>(resolve?: ((value: Result) => T | PromiseLike<T>) | null, reject?: ((reason: unknown) => U | PromiseLike<U>) | null): Promise<T | U> {
    if (this.fail) return Promise.resolve({ data: null, error: { code: 'unavailable' }, count: null }).then(resolve, reject);
    if (this.mode === 'seed') for (const row of Array.isArray(this.payload) ? this.payload : [this.payload]) {
      if (!this.table.some(existing => ['user_id','course_id','material_id','material_revision'].every(key => existing[key] === row[key]))) {
        this.table.push({ id: `row-${this.table.length}`, attempt_count: 0, updated_at: this.now,
          ...(this.tableName === 'canvas_auto_reviewer_course_state' ? { baseline_at: this.now } : {}), ...row });
      }
    }
    const matches = this.table.filter(row => this.filters.every(filter => filter(row)));
    if (this.mode === 'update') for (const row of matches) Object.assign(row, this.payload);
    const ordered = this.orderKey ? [...matches].sort((a, b) => String(a[this.orderKey!]).localeCompare(String(b[this.orderKey!]))) : matches;
    return Promise.resolve({ data: this.head ? null : this.single ? matches[0] ?? null : ordered.slice(this.offset, this.end + 1).slice(0, 1000), error: null, count: matches.length }).then(resolve, reject);
  }
}
const now = Date.parse('2026-10-12T12:00:00Z');
function material(id: string, overrides: Partial<CanvasReviewerSourceDescriptor> = {}): CanvasReviewerSourceDescriptor {
  return { id, type: 'page', title: id, availability: 'available', capability: 'ready', updatedAt: '2026-10-12T11:00:00Z', placement: { group: 'ungrouped', moduleTitle: null, modulePosition: null, itemPosition: null }, unavailableReason: null, estimatedCharacters: 100, file: null, ...overrides };
}
function harness(baselined = true) {
  const tables: Record<string, Row[]> = {
    canvas_auto_reviewer_preferences: [],
    canvas_auto_reviewer_course_state: baselined ? [{ user_id: 'owner', course_id: 'course', baseline_at: '2026-10-12T10:00:00Z' }] : [],
    canvas_auto_reviewer_candidates: [],
  };
  const failures = new Set<string>();
  let leaseOwner: string | null = null;
  const rpc = vi.fn(async (name: string, args: { p_run_id: string }) => {
    if (name === 'release_canvas_auto_reviewer_admission_v1') {
      if (leaseOwner === args.p_run_id) leaseOwner = null;
      return { data: null, error: null };
    }
    if (leaseOwner && leaseOwner !== args.p_run_id) return { data: false, error: null };
    leaseOwner = args.p_run_id; return { data: true, error: null };
  });
  const client = { from: (table: string) => new Query(tables[table]!, new Date(now).toISOString(), failures.has(table), table), rpc };
  const start = vi.fn(async (_client: unknown, _owner: string, input: { materialId: string }) => ({ id: `job-${input.materialId}` }));
  let sources: readonly CanvasReviewerSourceDescriptor[] | null = [];
  const reviewed = new Set<string>();
  return {
    tables, failures, start, reviewed, rpc,
    sources: (value: readonly CanvasReviewerSourceDescriptor[] | null) => { sources = value; },
    candidates: tables.canvas_auto_reviewer_candidates!,
    run: (clock: () => number = () => now, brokeredCanvasToken?: string, useDefaultStart = false) => runAutomaticReviewerAdmission(client as never, { userId: 'owner', courseId: 'course', brokeredCanvasToken }, {
      listMaterials: async () => sources, readReviewed: async () => reviewed, ...(useDefaultStart ? {} : { start }), now: clock,
    }),
  };
}
describe('automatic reviewer admission', () => {
  it('finds current candidates beyond the modeled response cap', async () => {
    const h = harness(); h.sources([material('page:new')]);
    for (let i = 0; i < 1002; i++) h.candidates.push({ id: `a-${i}`, user_id: 'owner', course_id: 'course',
      material_id: 'page:removed', material_revision: 'stale', status: 'pending', attempt_count: 0 });
    expect(await h.run()).toMatchObject({ admitted: 1 });
    expect(h.start).toHaveBeenCalledTimes(1);
  });
  it('admits nothing from an open-candidate inventory at its safety bound', async () => {
    const h = harness(); h.sources([material('page:new')]);
    for (let i = 0; i < AUTO_REVIEWER_CANDIDATE_PAGE_SIZE * AUTO_REVIEWER_CANDIDATE_MAX_PAGES; i++)
      h.candidates.push({ id: `a-${i}`, user_id: 'owner', course_id: 'course', material_id: 'page:removed', material_revision: 'stale', status: 'pending', attempt_count: 0 });
    expect(await h.run()).toMatchObject({ status: 'unavailable', admitted: 0 });
    expect(h.start).not.toHaveBeenCalled();
  });
  it('awaits worker dispatch before recording admission without using HTTP scheduling', async () => {
    const h = harness(); h.sources([material('page:ready')]);
    let finish: () => void = () => {};
    let started: () => void = () => {};
    const entered = new Promise<void>(resolve => { started = resolve; });
    worker.generate.mockImplementationOnce(async (_client, _userId, _input, _key, dependencies: { schedule: (job: never) => void; brokeredCanvasToken?: string }) => {
      expect(dependencies.brokeredCanvasToken).toBe('brokered-sync-token');
      expect(() => dependencies.schedule({ id: 'existing-job' } as never)).not.toThrow();
      return { id: 'existing-job' };
    });
    worker.dispatch.mockImplementationOnce(async () => {
      started(); await new Promise<void>(resolve => { finish = resolve; }); return { id: 'existing-job' };
    });
    const run = h.run(undefined, 'brokered-sync-token', true);
    await entered;
    expect(h.candidates[0]).toMatchObject({ status: 'pending', attempt_count: 0 });
    finish();
    expect(await run).toMatchObject({ admitted: 1, failed: 0 });
    expect(h.candidates[0]).toMatchObject({ status: 'admitted', processing_job_id: 'existing-job' });
    expect(worker.dispatch).toHaveBeenLastCalledWith({ id: 'existing-job' }, { client: expect.anything() });
  });
  it('keeps a failed worker dispatch pending for deterministic reconnection', async () => {
    const h = harness(); h.sources([material('page:ready')]);
    worker.generate.mockResolvedValueOnce({ id: 'existing-job' });
    worker.dispatch.mockRejectedValueOnce(new Error('dispatch unavailable'));
    expect(await h.run(undefined, 'brokered-sync-token', true)).toMatchObject({ admitted: 0, failed: 1 });
    expect(h.candidates[0]).toMatchObject({ status: 'pending', attempt_count: 1 });
  });
  it('waits for durable preparation even with a brokered token and wakes the pending candidate on completion',async()=>{
    const h=harness();
    const source=material('file:new',{type:'file',availability:'unavailable',capability:'needs_preparation',file:{kind:'pdf',preparationStatus:'not_prepared',canPrepare:true}});
    h.sources([source]);expect(await h.run(undefined,'brokered-sync-token')).toMatchObject({admitted:0,failed:0});
    expect(h.start).not.toHaveBeenCalled();expect(h.candidates[0]).toMatchObject({status:'pending',attempt_count:0,failure_code:'awaiting_preparation'});
    h.sources([{...source,availability:'available',capability:'ready',file:{...source.file!,preparationStatus:'ready'}}]);
    expect(await h.run()).toMatchObject({admitted:1});expect(h.start).toHaveBeenCalledOnce();
  });
  it('leaves tokenless preparation pending without an attempt and still admits ready material', async () => {
    const h = harness();
    h.sources([material('file:new', { type: 'file', availability: 'unavailable', capability: 'needs_preparation',
      updatedAt: '2026-10-12T11:30:00Z', file: { kind: 'pdf', preparationStatus: 'not_prepared', canPrepare: true } }), material('page:ready')]);
    h.candidates.push({ id: 'pending-file', user_id: 'owner', course_id: 'course', material_id: 'file:new',
      material_revision: '2026-10-12T11:30:00Z', status: 'pending', attempt_count: 1 });
    expect(await h.run()).toMatchObject({ admitted: 1, skipped: 1, failed: 0 });
    expect(h.candidates.find(row => row.id === 'pending-file')).toMatchObject({ status: 'pending', attempt_count: 1, failure_code: 'awaiting_preparation' });
    expect(h.start).toHaveBeenCalledTimes(1);
    expect(h.start).toHaveBeenCalledWith(expect.anything(), 'owner', { courseId: 'course', materialId: 'page:ready' },
      expect.any(String), { brokeredCanvasToken: undefined });
  });
  it('does not admit a file until full preparation is available', () => {
    expect(isAutoReviewerEligible(material('file:new', {
      type: 'file', availability: 'unavailable', capability: 'needs_preparation',
      file: { kind: 'pdf', preparationStatus: 'not_prepared', canPrepare: true },
    }))).toBe(false);
  });
  it('rejects an unpreparable file', () => {
    expect(isAutoReviewerEligible(material('file:blocked', {
      type: 'file', capability: 'needs_preparation',
      file: { kind: 'pdf', preparationStatus: 'blocked', canPrepare: false },
    }))).toBe(false);
  });
  it.each(['available', 'unavailable'] as const)('rejects inaccessible, failed and unsupported files when %s', availability => {
    for (const capability of ['inaccessible', 'failed', 'unsupported'] as const) {
      expect(isAutoReviewerEligible(material(`file:${capability}`, {
        type: 'file', availability, capability,
        file: { kind: 'pdf', preparationStatus: 'failed', canPrepare: true },
      }))).toBe(false);
    }
  });
  it.each(['2026-10-12T11:00:00Z', '2026-10-12T12:00:00Z', null, 'invalid'])('baselines newly eligible old or undated material (%s)', async updatedAt => {
    const h = harness();
    h.tables.canvas_auto_reviewer_course_state![0]!.baseline_at = '2026-10-12T12:00:00Z';
    h.sources([material('file:old', {
      type: 'file', availability: 'unavailable', capability: 'needs_preparation', updatedAt,
      file: { kind: 'pdf', preparationStatus: 'not_prepared', canPrepare: true },
    })]);
    expect(await h.run()).toMatchObject({ status: 'completed', admitted: 0 });
    expect(h.candidates).toHaveLength(1);
    expect(h.candidates[0]).toMatchObject({ material_id: 'file:old', status: 'baseline' });
    expect(h.start).not.toHaveBeenCalled();
  });
  it('seeds material newer than the baseline as pending and admits it with the deterministic key', async () => {
    const h = harness();
    h.tables.canvas_auto_reviewer_course_state![0]!.baseline_at = '2026-10-12T12:00:00Z';
    h.sources([material('file:new', {
      type: 'file', availability: 'available', capability: 'ready', updatedAt: '2026-10-12T13:00:00Z',
      file: { kind: 'pdf', preparationStatus: 'ready', canPrepare: true },
    })]);
    h.start.mockImplementationOnce(async () => {
      expect(h.candidates[0]).toMatchObject({ material_id: 'file:new', status: 'pending' });
      return { id: 'prepared-job' };
    });
    expect(await h.run(undefined, 'brokered-sync-token')).toMatchObject({ admitted: 1 });
    expect(h.start).toHaveBeenCalledWith(expect.anything(), 'owner', { courseId: 'course', materialId: 'file:new' },
      autoReviewerIdempotencyKey({ userId: 'owner', courseId: 'course', materialId: 'file:new', revision: '2026-10-12T13:00:00Z' }), { brokeredCanvasToken: 'brokered-sync-token' });
    expect(h.candidates[0]).toMatchObject({ status: 'admitted', processing_job_id: 'prepared-job' });
  });
  it('fails closed when the stored baseline date is invalid', () => {
    expect(isNewSinceBaseline(material('page:new'), 'invalid')).toBe(false);
  });
  it('baselines eligible sources on first run without generating old material', async () => {
    const h = harness(false); h.sources([material('page:old'), material('page:new')]);
    expect(await h.run()).toMatchObject({ status: 'baselined', admitted: 0 });
    expect(h.candidates.map(row => row.status)).toEqual(['baseline','baseline']);
    expect(h.tables.canvas_auto_reviewer_course_state).toHaveLength(1);
    expect(h.start).not.toHaveBeenCalled();
  });
  it('admits only new material and reconnects no completed receipts on repeat sync', async () => {
    const h = harness(false); h.sources([material('page:old')]); await h.run();
    h.sources([material('page:old'), material('page:new', { updatedAt: '2026-10-12T12:01:00Z' })]);
    expect(await h.run()).toMatchObject({ admitted: 1 });
    expect(h.start).toHaveBeenCalledWith(expect.anything(), 'owner', { courseId: 'course', materialId: 'page:new' }, autoReviewerIdempotencyKey({ userId: 'owner', courseId: 'course', materialId: 'page:new', revision: '2026-10-12T12:01:00Z' }), { brokeredCanvasToken: undefined });
    expect(h.candidates[1]).toMatchObject({ status: 'admitted', processing_job_id: 'job-page:new', attempt_count: 1 });
    await h.run(); expect(h.start).toHaveBeenCalledTimes(1);
  });
  it('keeps regeneration a student choice for revised reviewed material', async () => {
    const h = harness(false); h.sources([material('page:one')]); await h.run();
    h.sources([material('page:one', { updatedAt: '2026-10-12T12:01:00Z' })]); h.reviewed.add('page:one');
    expect(await h.run()).toMatchObject({ skipped: 1 });
    expect(h.candidates[1]?.status).toBe('skipped_existing'); expect(h.start).not.toHaveBeenCalled();
  });
  it('does not read or write candidates when disabled', async () => {
    const h = harness(); h.tables.canvas_auto_reviewer_preferences!.push({ user_id: 'owner', enabled: false }); h.sources([material('page:new')]);
    expect(await h.run()).toMatchObject({ status: 'disabled' }); expect(h.candidates).toEqual([]); expect(h.start).not.toHaveBeenCalled();
  });
  it('excludes noninstructional, unavailable and unpreparable sources', async () => {
    const h = harness(); h.sources([
      material('assignment:1', { type: 'assignment' }), material('announcement:1', { type: 'announcement' }),
      ...(['unsupported','inaccessible','failed'] as const).map(capability => material(`page:${capability}`, { capability })),
      material('page:prepare', { capability: 'needs_preparation' }), material('page:locked', { availability: 'unavailable' }),
    ]);
    await h.run(); expect(h.candidates).toHaveLength(1); expect(h.candidates[0]).toMatchObject({material_id:'page:prepare',status:'pending',attempt_count:0}); expect(h.start).not.toHaveBeenCalled();
  });
  it('limits this run to three and leaves remaining sources pending', async () => {
    const h = harness(); h.sources(Array.from({ length: 5 }, (_, i) => material(`page:${i}`)));
    expect(await h.run()).toMatchObject({ admitted: 3 }); expect(h.candidates.filter(row => row.status === 'pending')).toHaveLength(2);
  });
  it('baselines unversioned ready files and waits for dated preparable files', async () => {
    const h = harness(); h.sources([
      material('file:ready', { type: 'file', updatedAt: null }),
      material('file:prepare', { type: 'file', capability: 'needs_preparation', file: { kind: 'pdf', preparationStatus: 'not_prepared', canPrepare: true } }),
      material('file:blocked', { type: 'file', capability: 'needs_preparation', file: { kind: 'pdf', preparationStatus: 'blocked', canPrepare: false } }),
    ]);
    expect(await h.run(undefined, 'brokered-sync-token')).toMatchObject({ admitted: 0 });
    expect(h.candidates.find(row => row.material_id === 'file:ready')).toMatchObject({ material_revision: 'unversioned', status: 'baseline' });
    expect(h.candidates.some(row => row.material_id === 'file:blocked')).toBe(false);
  });
  it('limits admissions across courses to five in a rolling day', async () => {
    const h = harness(); h.sources([material('page:new'),material('page:next')]);
    for (let i = 0; i < 4; i++) h.candidates.push({ id: `old-${i}`, user_id: 'owner', course_id: 'other-course', status: 'admitted', updated_at: new Date(now - 60000).toISOString() });
    h.candidates.push({ user_id: 'other-owner', status: 'admitted', updated_at: new Date(now).toISOString() });
    expect(await h.run()).toMatchObject({ admitted: 1 }); expect(h.start).toHaveBeenCalledTimes(1);
  });
  it('defers at the first quota response without consuming an attempt', async () => {
    const h = harness(); h.sources([material('page:a'), material('page:b')]); h.start.mockRejectedValue(new ExperienceFailure(429, 'rate_limited'));
    expect(await h.run()).toMatchObject({ deferred: 1 }); expect(h.start).toHaveBeenCalledTimes(1);
    expect(h.candidates[0]).toMatchObject({ status: 'deferred_quota', attempt_count: 0 }); expect(h.candidates[1]).toMatchObject({ status: 'pending', attempt_count: 0 });
    h.start.mockResolvedValue({ id: 'resumed' }); expect(await h.run()).toMatchObject({ admitted: 2 });
  });
  it('continues after a source failure and exhausts it after three attempts', async () => {
    const h = harness(); h.sources([material('page:a'), material('page:b')]);
    h.start.mockImplementation(async (_client, _owner, input) => { if (input.materialId === 'page:a') throw new ExperienceFailure(409, 'not_ready'); return { id: 'job-b' }; });
    expect(await h.run()).toMatchObject({ failed: 1, admitted: 1 }); expect(h.candidates[0]).toMatchObject({ status: 'pending', attempt_count: 1 });
    await h.run(); await h.run(); expect(h.candidates[0]).toMatchObject({ status: 'failed', attempt_count: 3 });
    await h.run(); expect(h.start).toHaveBeenCalledTimes(4);
  });
  it('writes nothing when listing is unavailable', async () => {
    const h = harness(false); h.sources(null); expect(await h.run()).toMatchObject({ status: 'unavailable' }); expect(h.candidates).toEqual([]);
  });
  it('serializes concurrent admission and releases its lease on completion', async () => {
    const h = harness(); h.sources(Array.from({ length: 5 }, (_, i) => material(`page:${i}`)));
    let finish: () => void = () => {};
    let started: () => void = () => {};
    const entered = new Promise<void>(resolve => { started = resolve; });
    h.start.mockImplementationOnce(async () => { started(); await new Promise<void>(resolve => { finish = resolve; }); return { id: 'first' }; });
    const first = h.run(); await entered;
    expect(await h.run()).toMatchObject({ status: 'unavailable', admitted: 0 });
    finish(); expect(await first).toMatchObject({ admitted: 3 });
    expect(await h.run()).toMatchObject({ admitted: 2 });
    expect(h.candidates.filter(row => row.status === 'admitted')).toHaveLength(5);
  });
  it('checks preferences for the current owner and fails closed on database errors', async () => {
    const h = harness(); h.tables.canvas_auto_reviewer_preferences!.push({ user_id: 'other', enabled: false }); h.sources([material('page:new')]);
    expect(await h.run()).toMatchObject({ admitted: 1 });
    h.failures.add('canvas_auto_reviewer_preferences'); expect(await h.run()).toMatchObject({ status: 'unavailable' });
  });
  it('rejects stale open revisions and respects the run budget', async () => {
    const h = harness(); h.sources([material('page:new')]);
    h.candidates.push({ id: 'stale', user_id: 'owner', course_id: 'course', material_id: 'page:new', material_revision: 'old', status: 'pending', attempt_count: 0 });
    let ticks = 0; await h.run(() => now + (ticks++ === 0 ? 0 : 90001));
    expect(h.start).not.toHaveBeenCalled(); expect(h.candidates.every(row => row.status === 'pending')).toBe(true);
  });
});
