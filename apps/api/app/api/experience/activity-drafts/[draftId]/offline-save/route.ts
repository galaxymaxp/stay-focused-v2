import { createReviewerUserClient } from '@/lib/reviewer-db';
import { experienceRoute, experienceJson, experienceOptions, requireId, readBoundedExperienceJson } from '@/lib/experience/http';
import { saveOfflineActivityDraft } from '@/lib/activity-maker/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = { params: Promise<{ draftId: string }> };
const client = (request: Request) => createReviewerUserClient(request.headers.get('authorization')!.slice('Bearer '.length));
export async function POST(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => {
 const value = await readBoundedExperienceJson(request, 200000);
 return experienceJson(await saveOfflineActivityDraft(client(request), userId, requireId((await context.params).draftId), value));
}); }
