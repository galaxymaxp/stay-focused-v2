import { expect, it } from 'vitest';
import { activeBatchSummaries, batchSelection, batchResultMessage, queueIsIdle } from './course-batch';
import type { CourseBatchQueue } from './experience';
import { PROCESSING_JOB_STATUSES } from './index';
const preview = { items: [{ id: 'a', title: 'A', done: true, selectable: false }, { id: 'b', title: 'B', done: false, selectable: true }, { id: 'c', title: 'C', done: false, selectable: true }, { id: 'd', title: 'D', done: false, selectable: false }] };
it('all skips done and unsupported materials; checked selection stays exact', () => {
  expect(batchSelection(preview, 'all')).toEqual(['b', 'c']);
  expect(batchSelection(preview, new Set(['a', 'c', 'd']))).toEqual(['c']);
});
it('describes quota capacity without inventing a finish time or generation minutes', () => {
  const text = batchResultMessage({ batchKey: 'key', created: 2, skippedUpToDate: 1, waitingForPrepared: 3, overLimit: 4, failed: 1 });
  expect(text).toContain('4 left: waiting for generation capacity');
  expect(text).toContain('3 waiting for preparation');
  expect(text).not.toMatch(/min/);
});
it('reports the server retry threshold when a timed cap applies', () => {
  expect(batchResultMessage({ batchKey: 'key', created: 0, skippedUpToDate: 0, waitingForPrepared: 0, overLimit: 4, failed: 0, nextAvailableAt: '2026-10-17T00:00:00Z' })).toContain('can retry after');
});

const finished: CourseBatchQueue = { requests: [], summaries: [{ batchKey: 'batch', done: 4, total: 4 }] };
it('the screenshot case is idle with no progress line: 4 of 4 done and no jobs', () => {
  expect(activeBatchSummaries(finished)).toEqual([]);
  expect(queueIsIdle({ jobs: [], pending: [], courseBatches: finished })).toBe(true);
});
it('keeps only unfinished summaries without changing the input', () => {
  const partial = { batchKey: 'partial', done: 1, total: 4 };
  const queue = { requests: [], summaries: [...finished.summaries, partial, { batchKey: 'empty', done: 0, total: 0 }] };
  expect(activeBatchSummaries(queue)).toEqual([partial]);
  expect(queue.summaries).toHaveLength(3);
  expect(queueIsIdle({ jobs: [], pending: [], courseBatches: queue })).toBe(false);
  expect(activeBatchSummaries(undefined)).toEqual([]);
});
it.each(PROCESSING_JOB_STATUSES)('idle considers %s jobs, including attention and stopping', status => {
  expect(queueIsIdle({ jobs: [{ status }], pending: [] })).toBe(status === 'succeeded');
});
it('pending local requests prevent idle even with no accepted jobs', () => {
  expect(queueIsIdle({ jobs: [], pending: [{ key: 'saved-intent' }] })).toBe(false);
});
it.each(['waiting', 'quota', 'failed', 'cancelled', 'skipped', 'admitted'] as const)('idle considers %s batch requests even without a summary', state => {
  const courseBatches: CourseBatchQueue = { summaries: [], requests: [{ id: 'request', batchKey: 'batch', courseId: 'course', materialId: 'page:lesson', title: 'Lesson', state, jobId: null, nextAvailableAt: null }] };
  expect(queueIsIdle({ jobs: [], pending: [], courseBatches })).toBe(!['waiting', 'quota', 'failed'].includes(state));
});
