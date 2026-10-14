import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { getSourcePageSnapshot } from '@/lib/source-page-snapshots';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const OPTIONS = experienceOptions;

export async function GET(request: Request, context: { params: Promise<{ id: string; sectionId: string }> }) {
  return experienceRoute(request, async (_service, userId) => {
    const { id: artifactId, sectionId } = await context.params;
    requireId(artifactId);
    if (!/^[a-zA-Z0-9_-]{1,220}$/.test(sectionId)) throw new ExperienceFailure(404, 'not_found');
    const render = new URL(request.url).searchParams.get('render') !== '0';
    const result = await getSourcePageSnapshot(createCanvasServiceClient(), { userId, artifactId, sectionId, render });
    return experienceJson(result, render && result.available && 'status' in result && result.status === 'rendering' ? 202 : 200);
  });
}
