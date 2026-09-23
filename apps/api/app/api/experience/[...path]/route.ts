import type { ActivitySummary, LibraryArtifactType } from '@stay-focused/shared';
import { experienceJson, experienceOptions, experienceRoute, readInteger, requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { experienceCapabilities, generationView, learningMaterial, record } from '@/lib/experience/mappers';
import { startReviewerGeneration } from '@/lib/experience/generation';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { prepareCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { toProcessingJobStatusView } from '@/lib/processing-jobs/repository';
import { validateStudyPlanningRequest } from '@stay-focused/shared/task-planning';
import { previewOwnedStudyPlan, applyOwnedStudyPlan } from '@/lib/task-planning-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
interface Context { readonly params: Promise<{ readonly path: string[] }> }
export async function GET(request: Request, context: Context): Promise<Response> {
  return experienceRoute(request, async (service, userId) => {
    const { path } = await context.params;
    const query = new URL(request.url).searchParams;
    const [surface, id, action] = path;
    if (path.length === 1 && surface === 'capabilities') return experienceJson(experienceCapabilities());
    if (path.length === 1 && surface === 'announcements') {
      return experienceJson(await service.getAnnouncements(userId, {
        ...(query.get('courseId') ? { courseId: requireId(query.get('courseId')!) } : {}),
        offset: readInteger(query.get('offset'), 0, 0, 10000),
        limit: readInteger(query.get('limit'), 50, 1, 100),
      }));
    }
    if (surface === 'courses') {
      if (path.length === 1) return experienceJson(await service.getGenerateCourses(userId));
      requireId(id!);
      if (path.length === 2) return experienceJson(await service.getCourseLearningWorkspace(userId, id!));
      if (path.length === 3 && action === 'materials') return experienceJson(await service.getCourseMaterials(userId, id!, readInteger(query.get('offset'), 0, 0, 1000)));
    }
    if (surface === 'activities') {
      if (path.length === 1) {
        const status = query.get('status');
        if (status && !['pending', 'completed', 'submitted', 'unknown'].includes(status)) throw new ExperienceFailure(400, 'invalid_request');
        const items = await service.getActivityList(userId, { ...(status ? { status: status as ActivitySummary['status'] } : {}), ...(query.get('courseId') ? { courseId: requireId(query.get('courseId')!) } : {}), offsetMinutes: readInteger(query.get('utcOffsetMinutes'), 0, -720, 840) });
        return experienceJson({ items });
      }
      if (path.length === 2) {
        if (!/^(canvas|task):/.test(id!)) throw new ExperienceFailure(404, 'not_found');
        requireId(id!.slice(id!.indexOf(':') + 1));
        return experienceJson(await service.getActivityDetail(userId, id!));
      }
    }
    if (surface === 'library') {
      if (path.length === 1) {
        const type = query.get('type');
        if (type && !['all', 'reviewer', 'quiz', 'activity_output'].includes(type)) throw new ExperienceFailure(400, 'invalid_request');
        return experienceJson(await service.getLibrary(userId, { ...(type && type !== 'all' ? { type: type as LibraryArtifactType } : {}), ...(query.get('courseId') ? { courseId: requireId(query.get('courseId')!) } : {}), offset: readInteger(query.get('offset'), 0, 0, 10000), limit: readInteger(query.get('limit'), 50, 1, 100) }));
      }
      if (path.length === 2) {
        if (!/^(reviewer|artifact|generation|quiz|activity):/.test(id!)) throw new ExperienceFailure(404, 'not_found');
        requireId(id!.slice(id!.indexOf(':') + 1));
        return experienceJson(await service.getLibraryArtifact(userId, id!));
      }
    }
    if (surface === 'generations' && path.length === 2) return experienceJson(await service.getGeneration(userId, requireId(id!)));
    throw new ExperienceFailure(404, 'not_found');
  });
}
export async function POST(request: Request, context: Context): Promise<Response> {
  return experienceRoute(request, async (service, userId) => {
    const { path } = await context.params;
    const route = path.join('/');
    if (!['generations', 'materials/prepare', 'planner/preview', 'planner/apply', 'planner/replan'].includes(route)) throw new ExperienceFailure(404, 'not_found');
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 64 * 1024) throw new ExperienceFailure(400, 'invalid_request');
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new ExperienceFailure(400, 'invalid_request'); }
    const body = record(value);
    if (route.startsWith('planner/')) {
      const validation = validateStudyPlanningRequest(value);
      if (!validation.ok) throw new ExperienceFailure(400, 'invalid_request');
      try {
        const run = route === 'planner/preview' ? previewOwnedStudyPlan : applyOwnedStudyPlan;
        return experienceJson(await run(createCanvasServiceClient(), userId, validation.value));
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'task_not_found') throw new ExperienceFailure(404, 'not_found');
        throw error;
      }
    }
    if (Object.keys(body).some(k => !['courseId', 'materialId'].includes(k)) || typeof body.courseId !== 'string' || typeof body.materialId !== 'string' || !/^(page|assignment|announcement|file):/.test(body.materialId)) throw new ExperienceFailure(400, 'invalid_request');
    requireId(body.courseId); requireId(body.materialId.slice(body.materialId.indexOf(':') + 1));
    const client = createCanvasServiceClient();
    if (route === 'materials/prepare') {
      const prepared = await prepareCanvasReviewerSources({ client, userId, courseId: body.courseId, sourceIds: [body.materialId] });
      if (!prepared.ok) throw new ExperienceFailure(prepared.status === 404 ? 404 : 409, prepared.status === 404 ? 'not_found' : 'not_ready');
      return experienceJson({ items: prepared.value.sources.map(source => learningMaterial(source, body.courseId as string)) });
    }
    const job = await startReviewerGeneration(client, userId, { courseId: body.courseId, materialId: body.materialId }, request.headers.get('idempotency-key'));
    const view = job.status === 'succeeded' ? await service.getGeneration(userId, job.id) : generationView(toProcessingJobStatusView(job), null);
    return experienceJson(view, 202);
  });
}
export const OPTIONS = experienceOptions;
