import type { ExperienceError } from '@stay-focused/shared';

export class ExperienceFailure extends Error {
  constructor(readonly status: number, readonly code: ExperienceError['code']) {
    super(code);
  }
}
export function normalizeExperienceError(error: unknown): { status: number; error: ExperienceError } {
  const failure = error instanceof ExperienceFailure ? error : new ExperienceFailure(503, 'unavailable');
  const copy: Record<ExperienceError['code'], Omit<ExperienceError, 'code'>> = {
    quiz_generation_unavailable: { title: 'Quiz', message: 'Quiz generation is temporarily unavailable.', retryable: false, action: 'none' },
    quiz_source_unavailable: { title: 'Quiz', message: 'Prepare the selected course material or choose another source.', retryable: false, action: 'none' },
    quiz_not_found: { title: 'Quiz', message: 'Quiz could not be found.', retryable: false, action: 'none' },
    quiz_generation_failed: { title: 'Quiz', message: 'The questions did not pass source and correctness validation.', retryable: false, action: 'none' },
    quiz_attempt_not_found: { title: 'Quiz', message: 'Quiz attempt could not be found.', retryable: false, action: 'none' },
    quiz_attempt_completed: { title: 'Quiz', message: 'This attempt is already complete.', retryable: false, action: 'none' },
    quiz_question_not_found: { title: 'Quiz', message: 'Question could not be found.', retryable: false, action: 'none' },
    quiz_answer_invalid: { title: 'Quiz', message: 'Select a valid answer for this question.', retryable: false, action: 'none' },
    quiz_answer_already_finalized: { title: 'Quiz', message: 'This answer has already been finalized.', retryable: false, action: 'none' },
    quiz_result_unavailable: { title: 'Quiz', message: 'Complete every question to view results.', retryable: false, action: 'none' },
    activity_not_found: { title: 'Activity Maker', message: 'Activity could not be found.', retryable: false, action: 'none' },
    activity_generation_unavailable: { title: 'Activity Maker', message: 'Activity generation is temporarily unavailable.', retryable: false, action: 'none' },
    activity_source_unavailable: { title: 'Activity Maker', message: 'Required activity sources are unavailable. Prepare the assignment resources and try again.', retryable: false, action: 'none' },
    activity_template_unreadable: { title: 'Activity Maker', message: 'The instructor template could not be read safely.', retryable: false, action: 'none' },
    unsupported_attachment_type: { title: 'Activity Maker', message: 'This attachment type is unsupported. Convert legacy DOC or PPT files to DOCX or PPTX.', retryable: false, action: 'none' },
    activity_draft_not_found: { title: 'Activity Maker', message: 'Draft could not be found.', retryable: false, action: 'none' },
    activity_generation_failed: { title: 'Activity Maker', message: 'The draft did not pass instruction and source validation.', retryable: false, action: 'none' },
    activity_draft_conflict: { title: 'Activity Maker', message: 'The draft or template requirements have changed. Reopen before saving.', retryable: false, action: 'none' },
    sign_in_required: { title: 'Sign in again', message: 'Your session is unavailable. Sign in to continue.', retryable: false, action: 'sign_in' },
    not_found: { title: 'Item unavailable', message: 'This item could not be found.', retryable: false, action: 'none' },
    course_not_synced: { title: 'Sync this course', message: 'Synchronize this course with Stay Focused before generating from it.', retryable: false, action: 'none' },
    invalid_request: { title: 'Check your request', message: 'Some request details are invalid.', retryable: false, action: 'none' },
    not_ready: { title: 'Material not ready', message: 'Prepare this material or choose another source.', retryable: false, action: 'choose_material' },
    unavailable: { title: 'Temporarily unavailable', message: 'Please try again shortly.', retryable: true, action: 'retry' },
    generation_failed: { title: 'Generation did not finish', message: 'Your result could not be completed.', retryable: false, action: 'choose_material' },
    rate_limited: { title: 'Please wait', message: 'Try again after the current work has finished.', retryable: true, action: 'retry' },
    conflict: { title: 'Request has changed', message: 'Start a new request for the changed material.', retryable: false, action: 'none' },
  };
  return { status: failure.status, error: { code: failure.code, ...copy[failure.code] } };
}
export function requireFound<T>(value: T | null | undefined): T {
  if (value == null) throw new ExperienceFailure(404, 'not_found');
  return value;
}
