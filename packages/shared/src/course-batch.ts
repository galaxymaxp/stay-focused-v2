import type { ProcessingJobStatus } from './index';
import type { CourseBatchPreview, CourseBatchResult, CourseBatchQueue } from './experience';

/** Finished batches belong in Library and Completed, not live progress. */
export function activeBatchSummaries(queue: CourseBatchQueue | null | undefined) {
  return queue?.summaries.filter(group => group.done < group.total) ?? [];
}

/** Completed outputs do not keep the live queue busy; attention items do. */
export function queueIsIdle({ jobs, pending, courseBatches }: {
  readonly jobs: readonly { readonly status: ProcessingJobStatus }[];
  readonly pending: readonly unknown[];
  readonly courseBatches?: CourseBatchQueue | null;
}): boolean {
  return jobs.every(job => job.status === 'succeeded') && pending.length === 0 &&
    !courseBatches?.requests.some(row => row.state === 'waiting' || row.state === 'quota' || row.state === 'failed') &&
    activeBatchSummaries(courseBatches).length === 0;
}
export function batchSelection(preview: CourseBatchPreview, selected: ReadonlySet<string> | 'all'): string[] {
  return preview.items.filter(item => item.selectable && !item.done && (selected === 'all' || selected.has(item.id))).map(item => item.id);
}
export function batchResultMessage(result: CourseBatchResult): string {
  const parts = [`${result.created} reviewers queued`, `${result.skippedUpToDate} up to date`];
  if (result.waitingForPrepared) parts.push(`${result.waitingForPrepared} waiting for preparation`);
  if (result.overLimit) parts.push(`${result.overLimit} left: ${result.nextAvailableAt ? `can retry after ${new Date(result.nextAvailableAt).toLocaleString()}` : 'waiting for generation capacity'}`);
  if (result.failed) parts.push(`${result.failed} could not start. Retry from this course or Queue`);
  return parts.join('. ') + '.';
}
