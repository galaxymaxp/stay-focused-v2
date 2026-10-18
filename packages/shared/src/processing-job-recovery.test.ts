import { describe, expect, it } from 'vitest';
import { EXTRACTION_JOB_STAGES, REVIEWER_JOB_STAGES } from './index';
import { isProcessingJobRetryDenied, isSafeGenerationFailure, processingJobStoppedMessage } from './processing-job-recovery';

describe('failed generation recovery', () => {
  it.each([...new Set([...EXTRACTION_JOB_STAGES, ...REVIEWER_JOB_STAGES])])('has plain copy for %s', stage => {
    const phrase = processingJobStoppedMessage(stage);
    expect(phrase).toMatch(/^Stopped while /);
    expect(phrase).not.toContain(stage);
  });
  it.each([undefined, null, '', 'validation', '__proto__', 'future_stage'])('safely handles unknown stage %s', stage => {
    expect(processingJobStoppedMessage(stage)).toBe('Stopped before finishing');
  });
  it('maps real extraction, generation and coverage stages', () => {
    expect(processingJobStoppedMessage('extracting_ocr')).toBe('Stopped while reading the material');
    expect(processingJobStoppedMessage('generating_sections')).toBe('Stopped while building topics');
    expect(processingJobStoppedMessage('verifying_coverage')).toBe('Stopped while checking the reviewer');
  });
  it.each(['processing_job_not_retryable', 'quiz_source_capacity_exceeded'])('recognizes a permanent retry rejection: %s', code => {
    expect(isProcessingJobRetryDenied({ code })).toBe(true);
  });
  it.each([undefined, null, new Error('connection'), { code: 'processing_job_idempotency_conflict' }])('preserves ambiguous retry identity', error => {
    expect(isProcessingJobRetryDenied(error)).toBe(false);
  });
  it('only upgrades the exact failed Reviewer generation code/stages', () => {
    const job = { jobType: 'reviewer_generation', status: 'failed', stage: 'generating_sections', errorCode: 'generation_failed' };
    expect(isSafeGenerationFailure(job)).toBe(true);
    expect(isSafeGenerationFailure({ ...job, jobType: 'quiz_generation', errorCode: 'quiz_generation_failed' })).toBe(true);
    for (const patch of [{ jobType: 'document_extraction' }, { status: 'cancelled' }, { stage: 'extracting_ocr' }, { errorCode: null }, { errorCode: 'pdf_ocr_page_limit_exceeded' }]) {
      expect(isSafeGenerationFailure({ ...job, ...patch })).toBe(false);
    }
  });
});
