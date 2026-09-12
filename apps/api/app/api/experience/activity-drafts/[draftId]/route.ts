import { createReviewerUserClient } from '@/lib/reviewer-db';
import { experienceRoute, experienceJson, experienceOptions, requireId, readBoundedExperienceJson } from '@/lib/experience/http';
import { readActivityDraft, updateActivityDraft, deleteActivityDraft } from '@/lib/activity-maker/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = {
    params: Promise<{
        draftId: string;
    }>;
};
const client = (request: Request) => createReviewerUserClient(request.headers.get('authorization')!.slice('Bearer '.length));
export async function GET(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => experienceJson(await readActivityDraft(client(request), userId, requireId((await context.params).draftId)))); }
export async function PATCH(request: Request, context: Context) {
    return experienceRoute(request, async (_s, userId) => {
        const value = await readBoundedExperienceJson(request, 200000);
        return experienceJson(await updateActivityDraft(client(request), userId, requireId((await context.params).draftId), value));
    });
}
export async function DELETE(request: Request, context: Context) { return experienceRoute(request, async (_s, userId) => experienceJson(await deleteActivityDraft(client(request), userId, requireId((await context.params).draftId)))); }
