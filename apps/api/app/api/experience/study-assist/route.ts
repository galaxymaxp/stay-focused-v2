import { selectAssistBlock } from '@stay-focused/shared';
import { createServerOpenAIProvider } from '@/providers';
import { createReviewerUserClient } from '@/lib/reviewer-db';
import { readCanonicalReviewerRecord } from '@/lib/canonical-reviewers';
import { ExperienceFailure } from '@/lib/experience/errors';
import { experienceJson, experienceOptions, experienceRoute, readBoundedExperienceJson } from '@/lib/experience/http';
import { assistSourceExcerpt, generateStudyAssist, parseAssistRequest } from '@/lib/study-assist';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const OPTIONS = experienceOptions;

export async function POST(request: Request) {
  return experienceRoute(request, async (service, userId) => {
    const input = parseAssistRequest(await readBoundedExperienceJson(request, 2048));
    const detail = await service.getLibraryArtifact(userId, input.reviewerId);
    if (!('reviewer' in detail)) throw new ExperienceFailure(404, 'not_found');
    const selection = selectAssistBlock(detail.reviewer, input.sectionId, input.blockId);
    if (!selection) throw new ExperienceFailure(404, 'not_found');
    if (selection.contentHash !== input.contentHash) throw new ExperienceFailure(409, 'conflict');
    const client = createReviewerUserClient(request.headers.get('authorization')!.slice(7));
    const saved = await readCanonicalReviewerRecord(client, userId, input.reviewerId.slice('artifact:'.length));
    if (!saved.ok) throw new ExperienceFailure(503, 'unavailable');
    if (!saved.value) throw new ExperienceFailure(404, 'not_found');
    const sourceExcerpt = await assistSourceExcerpt(saved.value, input);
    console.info('study_assist.request', { assistType: input.assistType, contextCharacters: sourceExcerpt.length, promptVersion: input.promptVersion });
    const result = await generateStudyAssist({ request: input, reviewer: detail.reviewer, sourceExcerpt,
      provider: createServerOpenAIProvider({ timeoutMs: 45000, maxRetries: 0 }) });
    return experienceJson(result);
  });
}
