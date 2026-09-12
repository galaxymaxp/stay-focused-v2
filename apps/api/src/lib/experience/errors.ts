import type { ExperienceError } from '@stay-focused/shared';

export class ExperienceFailure extends Error {
  constructor(readonly status: number, readonly code: ExperienceError['code']) {
    super(code);
  }
}
export function normalizeExperienceError(error: unknown): { status: number; error: ExperienceError } {
  const failure = error instanceof ExperienceFailure ? error : new ExperienceFailure(503, 'unavailable');
  const copy: Record<ExperienceError['code'], Omit<ExperienceError, 'code'>> = {
    sign_in_required: { title: 'Sign in again', message: 'Your session is unavailable. Sign in to continue.', retryable: false, action: 'sign_in' },
    not_found: { title: 'Item unavailable', message: 'This item could not be found.', retryable: false, action: 'none' },
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
