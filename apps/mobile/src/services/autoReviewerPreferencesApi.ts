import { experienceRequest, ExperienceApiError, type ExperienceClient } from './experienceApi';

async function preference(client: ExperienceClient, enabled?: boolean): Promise<boolean> {
  const data = await experienceRequest<unknown>(client, '/api/auto-reviewer-preferences', enabled === undefined ? {} : { method: 'PATCH', body: { enabled } });
  if (typeof data !== 'object' || data === null || !('enabled' in data) || typeof data.enabled !== 'boolean') {
    throw new ExperienceApiError('invalid_response', 'The server returned an unexpected response. Try again later.');
  }
  return data.enabled;
}
export function getAutoReviewerPreference(context: ExperienceClient): Promise<boolean> {
  return preference(context);
}
export function setAutoReviewerPreference(context: ExperienceClient, enabled: boolean): Promise<boolean> {
  return preference(context, enabled);
}
