import type { ProcessingJobStatusView } from './index';
import { processingJobStoppedMessage } from './processing-job-recovery';

const quizStages: Partial<Record<ProcessingJobStatusView['stage'], string>> = {
  detecting_outline: 'organizing the quiz',
  planning_sections: 'planning questions',
  generating_sections: 'building questions',
  retrying_sections: 'building questions',
  verifying_coverage: 'checking the quiz',
  assembling_reviewer: 'putting the quiz together',
  storing_reviewer: 'saving the quiz',
};
const draftStages: Partial<Record<ProcessingJobStatusView['stage'], string>> = {
  detecting_outline: 'organizing the draft',
  planning_sections: 'planning the draft',
  generating_sections: 'building the draft',
  retrying_sections: 'building the draft',
  verifying_coverage: 'checking the draft',
  assembling_reviewer: 'putting the draft together',
  storing_reviewer: 'saving the draft',
};

/** Presentation only. Never display provider errors or internal stage names. */
export function queueFailureReason(kind: string, stage: string | null | undefined): string {
  const overrides = kind === 'quiz_generation' ? quizStages : kind === 'activity_generation' ? draftStages : null;
  const override = stage && overrides && Object.hasOwn(overrides, stage)
    ? overrides[stage as ProcessingJobStatusView['stage']] : null;
  const message = override ? `Stopped while ${override}` : processingJobStoppedMessage(stage);
  return `${message}. Your material is safe.`;
}

const isFailure = (job: ProcessingJobStatusView) => job.status === 'failed' || job.status === 'expired';
const failureTime = (job: ProcessingJobStatusView) => job.failedAt ?? job.updatedAt ?? job.createdAt;

/** Group only the view; callers retain raw rows for Clear, history and polling. */
export function queueFailureCards(jobs: readonly ProcessingJobStatusView[]): {
  job: ProcessingJobStatusView; failureCount: number;
}[] {
  const byId = new Map(jobs.map(job => [job.id, job]));
  // Connect authoritative sources and explicit retries, including older rows
  // without a sourceVersionId. Never infer identity from a display name.
  const parents = new Map<string, string>();
  const jobKey = (job: ProcessingJobStatusView, id = job.id) => JSON.stringify([job.jobType, 'job', id]);
  function root(key: string): string {
    const parent = parents.get(key);
    if (!parent) { parents.set(key, key); return key; }
    if (parent === key) return key;
    const result = root(parent);
    parents.set(key, result);
    return result;
  }
  function connect(a: string, b: string) {
    const first = root(a), second = root(b);
    if (first !== second) parents.set(first, second);
  }
  for (const job of jobs) {
    if (job.sourceVersionId) connect(jobKey(job), JSON.stringify([job.jobType, 'source', job.sourceVersionId]));
    if (job.retryOfJobId && (!byId.has(job.retryOfJobId) || byId.get(job.retryOfJobId)?.jobType === job.jobType)) {
      connect(jobKey(job), jobKey(job, job.retryOfJobId));
    }
  }
  const cards = new Map<string, { job: ProcessingJobStatusView; failureCount: number }>();
  const seenIds = new Set<string>();
  for (const job of jobs) {
    if (seenIds.has(job.id)) continue;
    seenIds.add(job.id);
    const failure = isFailure(job);
    const key = failure ? root(jobKey(job)) : `job:${job.id}`;
    const existing = cards.get(key);
    if (!existing) cards.set(key, { job, failureCount: failure ? 1 : 0 });
    else {
      existing.failureCount += 1;
      // Stable tie-break independent of server ordering.
      if (failureTime(job).localeCompare(failureTime(existing.job)) > 0 ||
          (failureTime(job) === failureTime(existing.job) && job.id.localeCompare(existing.job.id) > 0)) existing.job = job;
    }
  }
  return [...cards.values()];
}

/** Separate suffix so two-line clamping cannot hide the filename extension. */
export function queueFailureTitle(title: string): { start: string; end: string } {
  const characters = Array.from(title);
  const dot = title.lastIndexOf('.');
  const extension = dot > 0 && title.length - dot <= 12 ? title.slice(dot) : '';
  if (characters.length <= 32) return extension ? { start: title.slice(0, -extension.length), end: extension } : { start: title, end: '' };
  const tail = extension || characters.slice(-8).join('');
  return { start: title.slice(0, title.length - tail.length), end: tail };
}
