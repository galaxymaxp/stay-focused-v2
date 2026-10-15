import { createReviewerUserClient } from '@/lib/reviewer-db';
import { experienceRoute, experienceJson, experienceOptions, requireId } from '@/lib/experience/http';
import { listActivityDraftCopies } from '@/lib/activity-maker/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = { params: Promise<{ draftId: string }> };
const client = (request: Request) => createReviewerUserClient(request.headers.get('authorization')!.slice('Bearer '.length));
export async function GET(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => experienceJson(await listActivityDraftCopies(client(request), userId, requireId((await context.params).draftId)))); }
