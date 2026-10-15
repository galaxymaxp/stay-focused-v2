import { expect, it } from 'vitest';
import { batchSelection, batchResultMessage } from './course-batch';
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
