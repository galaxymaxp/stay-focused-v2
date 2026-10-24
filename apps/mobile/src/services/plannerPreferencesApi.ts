import { parsePlannerPreferences, type PlannerPreferences } from '@stay-focused/shared';
import type { PlanMode } from '@stay-focused/shared/task-planning';
import { experienceRequest } from './experienceApi';

export async function plannerPreferencesRequest(input: {
  baseUrl: string; accessToken: string; planMode?: PlanMode;
}): Promise<PlannerPreferences> {
  const result = await experienceRequest<unknown>(input, '/api/profile/planner-preferences',
    input.planMode ? { method: 'PATCH', body: { planMode: input.planMode } } : undefined);
  return parsePlannerPreferences(result);
}
