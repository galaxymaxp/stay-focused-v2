import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { finalizeCheckpointedCanvasSync } from '@/lib/canvas-sync-jobs/finalize';
import { runAutomaticReviewersAfterSync } from './after-sync';

const fake = vi.hoisted(() => ({
  run: vi.fn(), prepare: vi.fn(), content: vi.fn(), grades: vi.fn(), complete: vi.fn(), fail: vi.fn(), context: vi.fn(), state: vi.fn(), promote: vi.fn(),
}));
vi.mock('@/lib/canvas-preparation/orchestration', () => ({ enqueuePreparationAfterSync: fake.prepare }));
vi.mock('./admission', () => ({ runAutomaticReviewerAdmission: fake.run }));
vi.mock('@/lib/canvas-sync', () => ({ syncSelectedCanvasCourse: fake.content }));
vi.mock('@/lib/canvas-grade-sync', () => ({ syncCanvasCourseGrades: fake.grades }));
vi.mock('@/lib/canvas-sync-jobs/checkpoints', () => ({
  readCanvasSyncPlanState: fake.state, beginCanvasSyncPromotion: fake.promote, loadCanvasSyncCheckpointContext: fake.context,
  readCanvasSyncStaging: async () => [], recordCanvasSyncHealth: async () => {}, completeCheckpointedCanvasSyncJob: fake.complete,
  failCheckpointedCanvasSyncJob: fake.fail, cancelCheckpointedCanvasSyncJob: vi.fn(),
  canvasSyncItemKeyHash: vi.fn(), fingerprintCanvasSyncItem: vi.fn(),
}));
const client = {} as never;
const input = { jobId: 'sync-job', workerId: 'worker', accessToken: 'brokered-sync-token' };
let job: { id: string; status: string; user_id: string; course_id: string; job_type: string };
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) vi.spyOn(console, method).mockImplementation(() => {});
  job = { id: input.jobId, status: 'running', user_id: 'owner', course_id: 'canonical-course-uuid', job_type: 'course_content' };
  fake.state.mockImplementation(async () => ({ job, units: [] }));
  fake.promote.mockResolvedValue(true);
  fake.context.mockImplementation(async () => ({ job, course: { id: job.course_id, canvas_course_id: 'provider-course-id' }, connection: {} }));
  fake.content.mockResolvedValue({ ok: true, summary: { status: 'succeeded', inserted: 1, updated: 0, pruned: 0, scopeOutcomes: {} } });
  fake.grades.mockResolvedValue({ status: 'succeeded', assignmentSubmission: { status: 'unchanged' }, courseGradeSummary: { status: 'unchanged' } });
  fake.complete.mockImplementation(async () => { job.status = 'succeeded'; return job; });
  fake.run.mockResolvedValue({ status: 'completed', admitted: 1, skipped: 0, deferred: 0, failed: 0 });
  fake.prepare.mockResolvedValue(undefined);
});
afterEach(() => {
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
    expect(JSON.stringify(vi.mocked(console[method]).mock.calls)).not.toContain(input.accessToken);
  }
  vi.restoreAllMocks();
});
describe('automatic reviewers after terminal content sync', () => {
  it.each(['success','unchanged','partial'] as const)('runs once after persisted %s using the canonical owner and course', async outcome => {
    fake.content.mockResolvedValue({ ok: true, summary: { status: outcome === 'partial' ? 'partial' : 'succeeded', inserted: outcome === 'unchanged' ? 0 : 1, updated: 0, pruned: 0, scopeOutcomes: {} } });
    fake.run.mockImplementation(async () => {
      expect(job.status).toBe('succeeded');
      return { status: 'completed', admitted: 1, skipped: 0, deferred: 0, failed: 0 };
    });
    expect(await finalizeCheckpointedCanvasSync(client, input)).toEqual({ status: 'succeeded', outcome });
    expect(fake.run).toHaveBeenCalledExactlyOnceWith(client, { userId: 'owner', courseId: 'canonical-course-uuid', brokeredCanvasToken: input.accessToken });
    expect(fake.prepare).toHaveBeenCalledExactlyOnceWith(client, { userId: 'owner', courseId: 'canonical-course-uuid', syncId: input.jobId, brokeredCanvasToken: input.accessToken });
  });
  it('never runs after course grades', async () => {
    job.job_type = 'course_grades';
    expect(await finalizeCheckpointedCanvasSync(client, input)).toEqual({ status: 'succeeded', outcome: 'unchanged' });
    expect(fake.run).not.toHaveBeenCalled();
    expect(fake.prepare).not.toHaveBeenCalled();
  });
  it('never runs after failed finalization', async () => {
    fake.content.mockResolvedValue({ ok: false });
    expect(await finalizeCheckpointedCanvasSync(client, input)).toEqual({ status: 'failed', retryable: false });
    expect(fake.run).not.toHaveBeenCalled(); expect(fake.complete).not.toHaveBeenCalled();
  });
  it('keeps the job completed and sync successful when admission throws', async () => {
    fake.run.mockRejectedValue(new Error('private source content'));
    expect(await finalizeCheckpointedCanvasSync(client, input)).toEqual({ status: 'succeeded', outcome: 'success' });
    expect(job.status).toBe('succeeded');
    expect(console.error).toHaveBeenCalledExactlyOnceWith('auto_reviewers.run_failed', { code: 'auto_reviewer_run_failed' });
  });
  it('keeps persisted sync success when preparation admission fails', async () => {
    fake.prepare.mockRejectedValue(new Error('private provider content'));
    expect(await finalizeCheckpointedCanvasSync(client,input)).toEqual({status:'succeeded',outcome:'success'});
    expect(job.status).toBe('succeeded');
    expect(fake.run).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith('canvas_preparation.sync_admission_unavailable');
  });
  it('does not admit if the completion RPC returns no terminal row', async () => {
    fake.complete.mockResolvedValue(null);
    await finalizeCheckpointedCanvasSync(client, input); expect(fake.run).not.toHaveBeenCalled();
  });
  it('logs only safe counts and status', async () => {
    await runAutomaticReviewersAfterSync(client, { userId: 'owner', courseId: 'private-course' });
    expect(console.info).toHaveBeenCalledExactlyOnceWith('auto_reviewers.run', { status: 'completed', admitted: 1, skipped: 0, deferred: 0, failed: 0 });
  });
});
