import type { CourseBatchPreview, CourseBatchResult } from './experience';
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
