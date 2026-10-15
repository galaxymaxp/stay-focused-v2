import type { ProcessingJobStatusView } from "@stay-focused/shared";
import { queueSections } from "../redesign/presentation";

export function queueItems(jobs: readonly ProcessingJobStatusView[], hidden: readonly string[] = []) {
  const cleared = new Set(hidden);
  const sections = queueSections(jobs.filter(job => !cleared.has(job.id)));
  return sections.map(section => section.key === "completed"
    ? { ...section, jobs: [...section.jobs].sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)).slice(0, 5) }
    : section);
}
export const failedQueueIds = (jobs: readonly ProcessingJobStatusView[]) =>
  jobs.filter(job => job.status === "failed" || job.status === "expired").map(job => job.id);
export function unseenFailures(jobs: readonly ProcessingJobStatusView[], seen: ReadonlySet<string>) {
  return failedQueueIds(jobs).some(id => !seen.has(id));
}
export function queueProgress(job: ProcessingJobStatusView) {
  const { completedUnits, totalUnits, unitLabel } = job.progress;
  return totalUnits !== null && totalUnits > 0 && completedUnits !== null
    ? `${completedUnits} of ${totalUnits} ${unitLabel ?? "steps"}`
    : job.progress.message;
}
