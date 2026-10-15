import { ASSIST_TYPES, isReviewerShareToken, reviewerSharePath, selectAssistBlock, type AssistResult, type ReviewerReaderModel, type ReviewerShareLink } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from './experienceApi';
import { studyAssist } from './studyAssist';

/** Browser destination is independent from the API origin. No private paths. */
export function reviewerShareUrl(token: string, origin = process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://stay-focused-ten.vercel.app'): string {
  if (!isReviewerShareToken(token)) throw new Error('invalid_share_link');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid_website_origin');
  return `${url.origin}${reviewerSharePath(token)}`;
}
export async function collectSharedAssists(owner: string, reviewer: ReviewerReaderModel): Promise<AssistResult[]> {
  if (!owner) return [];
  const results: AssistResult[] = [];
  // Use existing owner + exact-content cache guards, never regenerate a miss.
  for (const section of reviewer.sections) for (const block of section.blocks) {
    const selection = selectAssistBlock(reviewer, section.id, block.id);
    if (!selection) continue;
    for (const point of [undefined, ...block.keyPoints.slice(0, 50).map((_, i) => i)]) {
      const saved = await Promise.all(ASSIST_TYPES.map(type => studyAssist.peek(owner, selection, type, point)));
      results.push(...saved.filter((result): result is AssistResult => result !== null));
    }
  }
  return results;
}
export async function mutateReviewerShare(client: ExperienceClient, owner: string, artifactId: string,
  reviewer: ReviewerReaderModel, method: 'POST' | 'PATCH' | 'DELETE'): Promise<ReviewerShareLink | null> {
  const assists = method === 'DELETE' ? undefined : await collectSharedAssists(owner, reviewer);
  return experienceRequest(client, `/api/experience/shares/${encodeURIComponent(artifactId)}`,
    { method, ...(assists === undefined ? {} : { body: { assists } }) });
}
