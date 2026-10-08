import { STUDY_LIMITS } from '@stay-focused/shared';
import { createServerOpenAIProvider } from '@/providers';
import { createReviewerUserClient } from '@/lib/reviewer-db';
import { readCanonicalReviewerRecord } from '@/lib/canonical-reviewers';
import { ExperienceFailure } from '@/lib/experience/errors';
import { experienceJson, experienceOptions, experienceRoute, readBoundedExperienceJson } from '@/lib/experience/http';
import { admitStudyRequest, buildStudyContext, generateStudyTool, parseStudyToolRequest, resolveStudySelection, studyContextCharacters, studyToolsModel } from '@/lib/study-tools';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const OPTIONS = experienceOptions;

/** Smart Selection learning tools for text selected in one of the owner's Reviewers. */
export async function POST(request: Request) {
  return experienceRoute(request, async (service, userId) => {
    const input = parseStudyToolRequest(await readBoundedExperienceJson(request, STUDY_LIMITS.bodyBytes));
    const detail = await service.getLibraryArtifact(userId, input.reviewerId);
    if (!('reviewer' in detail)) throw new ExperienceFailure(404, 'not_found');
    const { block, selection } = resolveStudySelection(detail.reviewer, input);
    const client = createReviewerUserClient(request.headers.get('authorization')!.slice(7));
    const saved = await readCanonicalReviewerRecord(client, userId, input.reviewerId.slice('artifact:'.length));
    if (!saved.ok) throw new ExperienceFailure(503, 'unavailable');
    if (!saved.value) throw new ExperienceFailure(404, 'not_found');
    if (!admitStudyRequest(userId)) throw new ExperienceFailure(429, 'rate_limited');
    const context = await buildStudyContext({ reviewer: detail.reviewer, request: input, block, selection, saved: saved.value });
    const model = studyToolsModel();
    // Sizes only: selected text, questions and course content are never logged.
    console.info('study_tools.request', { action: input.action, modifier: input.modifier ?? null, model,
      selectionCharacters: selection.length, contextCharacters: studyContextCharacters(context), sourceExcerpts: context.sourceExcerpts.length, followUps: input.followUps?.length ?? 0 });
    const result = await generateStudyTool({ request: input, selection, context, model,
      provider: createServerOpenAIProvider({ timeoutMs: 45000, maxRetries: 0 }) });
    return experienceJson(result);
  });
}
