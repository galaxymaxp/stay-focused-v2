import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, readBoundedExperienceJson, requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { completeAttempt, readAttempt, saveAnswer, updateAttemptStudyState } from '@/lib/quiz/service';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
type Context = {
    params: Promise<{
        attemptPath: string[];
    }>;
};
export async function GET(request: Request, context: Context) {
    return experienceRoute(request, async (_service, userId) => {
        const path = (await context.params).attemptPath;
        if (path.length > 2 || (path.length === 2 && path[1] !== 'result'))
            throw new ExperienceFailure(404, 'not_found');
        return experienceJson(await readAttempt(createCanvasServiceClient(), userId, requireId(path[0]!), path[1] === 'result'));
    });
}
export async function PATCH(request: Request, context: Context) {
    return experienceRoute(request, async (_service, userId) => {
        const path = (await context.params).attemptPath;
        if (path.length === 2 && path[1] === 'study-state')
            return experienceJson(await updateAttemptStudyState(createCanvasServiceClient(), userId, requireId(path[0]!), await readBoundedExperienceJson(request, 2048)));
        if (path.length !== 3 || path[1] !== 'answers' || !/^q\d{1,3}$/.test(path[2]!))
            throw new ExperienceFailure(404, 'quiz_question_not_found');
        return experienceJson(await saveAnswer(createCanvasServiceClient(), userId, requireId(path[0]!), path[2]!, await readBoundedExperienceJson(request, 2048)));
    });
}
export async function POST(request: Request, context: Context) {
    return experienceRoute(request, async (_service, userId) => {
        const path = (await context.params).attemptPath;
        if (path.length !== 2 || !['complete', 'abandon'].includes(path[1]!))
            throw new ExperienceFailure(404, 'not_found');
        return experienceJson(await completeAttempt(createCanvasServiceClient(), userId, requireId(path[0]!), path[1] === 'abandon'));
    });
}
