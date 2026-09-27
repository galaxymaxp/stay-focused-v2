import { assistCacheKey, assistRequest, isAssistResult, type AssistResult, type AssistSelection, type AssistType } from '@stay-focused/shared';
import { experienceRequest, ExperienceApiError, type ExperienceClient } from './experienceApi';
import type { AssistCache } from './localLibrary/assistCache';
import { getLocalArtifactStore } from './localLibrary/localArtifactDatabase';

export const ASSIST_OFFLINE_MESSAGE = 'Connect to the internet once to generate this explanation. After that, it will be available offline.';
export class StudyAssistError extends Error {}

/** One service for all sheets, including dismiss/reopen. No render/visibility prefetch. */
export function createStudyAssistService(dependencies: {
  cache: () => Promise<AssistCache | null>;
  generate: (client: ExperienceClient, request: ReturnType<typeof assistRequest>) => Promise<unknown>;
}) {
  const pending = new Map<string, Promise<AssistResult>>();
  return {
    /** A saved result only; never reaches the network. */
    async peek(owner: string, selection: AssistSelection, type: AssistType, pointIndex?: number): Promise<AssistResult | null> {
      if (!owner) return null;
      try {
        const cache = await dependencies.cache();
        return cache ? await cache.readAssist(owner, assistRequest(selection, type, undefined, pointIndex), selection.canonicalContent) : null;
      } catch {
        return null;
      }
    },
    request(owner: string, client: ExperienceClient, selection: AssistSelection, type: AssistType, promptVersion?: string, pointIndex?: number): Promise<AssistResult> {
      const request = assistRequest(selection, type, promptVersion, pointIndex);
      const key = JSON.stringify([owner, assistCacheKey(request), selection.canonicalContent]);
      const existing = pending.get(key);
      if (existing) return existing;
      const work = (async () => {
        if (!owner) throw new StudyAssistError('Please sign in again.');
        const cache = await dependencies.cache();
        if (!cache) throw new StudyAssistError('Device storage is unavailable. Reopen the app to use Study Assist.');
        const cached = await cache.readAssist(owner, request, selection.canonicalContent);
        if (cached) return cached;
        let value: unknown;
        try { value = await dependencies.generate(client, request); }
        catch (error) {
          if (error instanceof ExperienceApiError) {
            if (error.code === 'connection') throw new StudyAssistError(ASSIST_OFFLINE_MESSAGE);
            if (['sign_in_required', 'not_found', 'conflict', 'rate_limited'].includes(error.code)) throw new StudyAssistError(error.message);
          }
          throw new StudyAssistError('This explanation could not be generated. Try again in a moment.');
        }
        if (!isAssistResult(value, request)) throw new StudyAssistError('This explanation could not be read. Please try again.');
        try { await cache.writeAssist(owner, value, selection.canonicalContent); }
        catch { throw new StudyAssistError('This explanation could not be saved on your device. Check available storage before trying again.'); }
        return value;
      })().catch(error => {
        if (error instanceof StudyAssistError) throw error;
        throw new StudyAssistError('Device storage could not be read. Reopen the app and try again.');
      }).finally(() => pending.delete(key));
      pending.set(key, work);
      return work;
    },
  };
}
export const studyAssist = createStudyAssistService({ cache: getLocalArtifactStore,
  generate: (client, request) => experienceRequest(client, '/api/experience/study-assist', { method: 'POST', body: request }),
});
