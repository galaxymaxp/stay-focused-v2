import type { ProcessingJobStage } from './index';

const stoppedStages = {
  accepting_upload: 'Stopped while saving the material',
  inspecting_document: 'Stopped while reading the material',
  extracting_native_text: 'Stopped while reading the material',
  preparing_ocr_chunks: 'Stopped while reading the material',
  extracting_ocr: 'Stopped while reading the material',
  verifying_pages: 'Stopped while checking the material',
  assembling_text: 'Stopped while reading the material',
  storing_result: 'Stopped while saving the result',
  preparing_source: 'Stopped while preparing the material',
  normalizing_source: 'Stopped while preparing the material',
  detecting_outline: 'Stopped while organizing topics',
  planning_sections: 'Stopped while organizing topics',
  generating_sections: 'Stopped while building topics',
  verifying_coverage: 'Stopped while checking the reviewer',
  retrying_sections: 'Stopped while building topics',
  assembling_reviewer: 'Stopped while putting the reviewer together',
  storing_reviewer: 'Stopped while saving the reviewer',
} satisfies Record<ProcessingJobStage, string>;

/** Accept unknown/missing stages from older servers without exposing internal names. */
export function processingJobStoppedMessage(stage: string | null | undefined): string {
  return stage && Object.hasOwn(stoppedStages, stage)
    ? stoppedStages[stage as ProcessingJobStage]
    : 'Stopped before finishing';
}

/** A rejected retry must remove the action even when a polled row is stale. */
export function isProcessingJobRetryDenied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'processing_job_not_retryable' || error.code === 'quiz_source_capacity_exceeded';
}

/** Matches the function-only MR3 migration, including historical failed rows. */
export function isSafeGenerationFailure(job: {
  jobType: string; status: string; stage: string; errorCode: string | null;
}): boolean {
  return job.status === 'failed' && (
    (job.jobType === 'reviewer_generation' && (job.errorCode === 'generation_failed' || job.errorCode === 'reviewer_validation_failed')) ||
    (job.jobType === 'quiz_generation' && job.errorCode === 'quiz_generation_failed')
  ) &&
    ['generating_sections', 'verifying_coverage', 'retrying_sections', 'assembling_reviewer'].includes(job.stage);
}
