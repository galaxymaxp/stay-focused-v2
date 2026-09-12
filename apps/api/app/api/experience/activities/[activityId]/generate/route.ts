import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceRoute, experienceJson, experienceOptions, readBoundedExperienceJson } from '@/lib/experience/http';
import { activityGenerationState, readGenerationInput, startActivityGeneration } from '@/lib/activity-maker/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
export async function POST(request: Request, context: {
    params: Promise<{
        activityId: string;
    }>;
}) {
    return experienceRoute(request, async (_service, userId) => {
        const value = await readBoundedExperienceJson(request, 4096);
        const input = readGenerationInput(value);
        const { activityId } = await context.params;
        const job = await startActivityGeneration(createCanvasServiceClient(), userId, activityId, input, request.headers.get('idempotency-key'));
        return experienceJson({ id: job.id, state: activityGenerationState(job), progress: null }, 202);
    });
}
