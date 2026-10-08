import { STUDY_OFFLINE, STUDY_QUESTION_TOO_LONG, STUDY_SELECTION_TOO_LARGE, isStudyToolResult, studyCacheKey, studyReusable, type StudyToolRequest, type StudyToolResult } from '@stay-focused/shared';
import { ApiConfigurationError } from '../config/apiBaseUrlResolution';
import { experienceRequest, ExperienceApiError, type ExperienceClient } from './experienceApi';

export class StudyToolsError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}
/** Distinct, student-facing copy per failure. None of these end the session. */
const MESSAGES: Record<string, string> = {
  connection: STUDY_OFFLINE,
  study_selection_too_large: STUDY_SELECTION_TOO_LARGE,
  study_question_too_long: STUDY_QUESTION_TOO_LONG,
  study_answer_too_long: 'Shorten your answer to the key idea and check it again.',
  study_follow_up_limit: 'This question has reached its follow-up limit. Start a new question.',
  sign_in_required: 'Your session needs to be refreshed. Sign in again to use this learning tool.',
  permission_denied: 'This Reviewer isn’t available to your account.',
  not_found: 'This part of the Reviewer is no longer available. Reopen the Reviewer and try again.',
  not_ready: 'The course material for this passage isn’t available right now.',
  conflict: 'This Reviewer changed. Reopen it and try again.',
  rate_limited: 'You’re using learning tools quickly. Wait a moment and try again.',
  server_error: 'The learning tool is temporarily unavailable. Try again shortly.',
  invalid_response: 'The learning tool is temporarily unavailable. Try again shortly.',
  invalid_request: 'Check your selection and try again.',
};

/**
 * One learning-tool session per open sheet. Identical requests reuse their
 * result (also while offline) and concurrent duplicates share one call.
 * Nothing is persisted: closing the sheet discards it.
 */
export function createStudyToolsSession(generate: (client: ExperienceClient, request: StudyToolRequest) => Promise<unknown> = (client, request) =>
  experienceRequest(client, '/api/experience/study-tools', { method: 'POST', body: request })) {
  const results = new Map<string, Promise<StudyToolResult>>();
  return {
    run(client: ExperienceClient, request: StudyToolRequest): Promise<StudyToolResult> {
      const key = studyCacheKey(request);
      const existing = results.get(key);
      if (existing) return existing;
      const work = generate(client, request).then(value => {
        if (!isStudyToolResult(value, request)) throw new StudyToolsError('invalid_response', MESSAGES.invalid_response!);
        return value;
      }, (error: unknown) => {
        if (error instanceof ApiConfigurationError) throw new StudyToolsError('configuration', 'The app isn’t configured to reach Stay Focused. Update the app and try again.');
        const code = error instanceof ExperienceApiError ? error.code : 'server_error';
        throw new StudyToolsError(code, MESSAGES[code] ?? MESSAGES.server_error!);
      });
      results.set(key, work);
      // Failures and novelty variants are never reused; successes are, for this session only.
      work.then(() => { if (!studyReusable(request)) results.delete(key); }, () => results.delete(key));
      return work;
    },
  };
}
export type StudyToolsSession = ReturnType<typeof createStudyToolsSession>;
