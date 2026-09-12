import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, readBoundedExperienceJson } from '@/lib/experience/http';
import { activityGenerationState } from '@/lib/activity-maker/service';
import { readQuizRequest } from '@/lib/quiz/sources';
import { startQuizGeneration } from '@/lib/quiz/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
export async function POST(request: Request) {
    return experienceRoute(request, async (_service, userId) => {
        const input = readQuizRequest(await readBoundedExperienceJson(request, 4096));
        const job = await startQuizGeneration(createCanvasServiceClient(), userId, input, request.headers.get('idempotency-key'));
        return experienceJson({ id: job.id, state: activityGenerationState(job), progress: null }, 202);
    });
}
