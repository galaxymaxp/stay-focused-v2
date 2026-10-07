import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { attemptHistoryRows, readQuiz, startAttempt } from '@/lib/quiz/service';
import { quizAttemptSummary } from '@/lib/quiz/learning-progress';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = {
    params: Promise<{
        quizPath: string[];
    }>;
};
export async function GET(request: Request, context: Context) {
    return experienceRoute(request, async (_service, userId) => {
        const path = (await context.params).quizPath, id = requireId(path[0]!);
        const client = createCanvasServiceClient();
        if (path.length === 1)
            return experienceJson(await readQuiz(client, userId, id));
        if (path.length === 2 && path[1] === 'attempts') {
            await readQuiz(client, userId, id);
            const rows = await attemptHistoryRows(client, userId, id);
            return experienceJson(rows.map(quizAttemptSummary));
        }
        throw new ExperienceFailure(404, 'not_found');
    });
}
export async function POST(request: Request, context: Context) {
    return experienceRoute(request, async (_service, userId) => {
        const path = (await context.params).quizPath;
        if (path.length !== 2 || path[1] !== 'attempts')
            throw new ExperienceFailure(404, 'not_found');
        return experienceJson(await startAttempt(createCanvasServiceClient(), userId, requireId(path[0]!), request.headers.get('idempotency-key')), 201);
    });
}
