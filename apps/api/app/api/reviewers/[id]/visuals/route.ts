import { after } from 'next/server';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, requireId } from '@/lib/experience/http';
import { prepareReviewerVisuals, readReviewerVisuals } from '@/lib/external-visuals/batch';
export const runtime = 'nodejs';
// The POST hands the batch to after(), which keeps running once the 202 is sent.
export const maxDuration = 300;
export const OPTIONS = experienceOptions;

/** Cached labeled visuals for every section of an owned reviewer. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return experienceRoute(request, async (_service, userId) => {
    const { id: artifactId } = await context.params; requireId(artifactId);
    return experienceJson(await readReviewerVisuals(createCanvasServiceClient(), { userId, artifactId }));
  });
}

/** Start filling visuals for every section in the background (used for reviewers made before generation-time visuals). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return experienceRoute(request, async (_service, userId) => {
    const { id: artifactId } = await context.params; requireId(artifactId);
    const client = createCanvasServiceClient();
    const state = await readReviewerVisuals(client, { userId, artifactId });
    const started = !state.running && state.checked < state.total;
    if (started) after(async () => { try { await prepareReviewerVisuals(client, { userId, artifactId }); } catch { console.warn('external_visual.batch', { code: 'failed' }); } });
    return experienceJson({ started }, 202);
  });
}
