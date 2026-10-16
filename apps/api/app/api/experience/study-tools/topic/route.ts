import { selectTopic } from '@stay-focused/shared';
import { createServerOpenAIProvider } from '@/providers';
import { createReviewerUserClient } from '@/lib/reviewer-db';
import { readCanonicalReviewerRecord } from '@/lib/canonical-reviewers';
import { ExperienceFailure } from '@/lib/experience/errors';
import { experienceJson, experienceOptions, experienceRoute, readBoundedExperienceJson } from '@/lib/experience/http';
import { cachedTopic, generateTopic, parseTopicRequest } from '@/lib/topic-assist';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const OPTIONS = experienceOptions;
export async function POST(request: Request) {
  return experienceRoute(request, async (service, userId) => {
    const input = parseTopicRequest(await readBoundedExperienceJson(request, 2048));
    const detail = await service.getLibraryArtifact(userId, input.reviewerId);
    if (!('reviewer' in detail)) throw new ExperienceFailure(404, 'not_found');
    const selection = selectTopic(detail.reviewer, input.sectionId);
    if (!selection) throw new ExperienceFailure(404, 'not_found');
    const client = createReviewerUserClient(request.headers.get('authorization')!.slice(7));
    const saved = await readCanonicalReviewerRecord(client, userId, input.reviewerId.slice('artifact:'.length));
    if (!saved.ok) throw new ExperienceFailure(503, 'unavailable');
    if (!saved.value) throw new ExperienceFailure(404, 'not_found');
    const result = await cachedTopic(userId, selection, input.action, () => {
      console.info('study_tools.topic', { action: input.action, contextCharacters: selection.canonicalContent.length });
      return generateTopic(selection, input.action, createServerOpenAIProvider({ timeoutMs: 45000, maxRetries: 0 }));
    });
    return experienceJson(result);
  });
}
