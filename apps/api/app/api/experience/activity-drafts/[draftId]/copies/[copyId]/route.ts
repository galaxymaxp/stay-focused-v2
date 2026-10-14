import { createReviewerUserClient } from '@/lib/reviewer-db';
import { experienceRoute, experienceJson, experienceOptions, requireId } from '@/lib/experience/http';
import { readActivityDraftCopy, deleteActivityDraftCopy } from '@/lib/activity-maker/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = { params: Promise<{ draftId: string; copyId: string }> };
const client = (request: Request) => createReviewerUserClient(request.headers.get('authorization')!.slice('Bearer '.length));
export async function GET(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => { const p = await context.params; return experienceJson(await readActivityDraftCopy(client(request), userId, requireId(p.draftId), requireId(p.copyId))); }); }
export async function DELETE(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => { const p = await context.params; return experienceJson(await deleteActivityDraftCopy(client(request), userId, requireId(p.draftId), requireId(p.copyId))); }); }
