import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceReadRoute, experienceJson, experienceOptions, readBoundedExperienceJson, requireId } from '@/lib/experience/read-http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { getOwnerShare, mutateOwnerShare } from '@/lib/reviewer-shares/owner';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ artifactId: string }> };
export function OPTIONS() { return experienceOptions(); }
export async function GET(request: Request, context: Context) {
  return experienceReadRoute(request, async (_service, owner) => experienceJson(await getOwnerShare(createCanvasServiceClient(), owner, requireId((await context.params).artifactId))));
}
async function mutate(request: Request, context: Context, action: 'create' | 'update' | 'revoke') {
  return experienceReadRoute(request, async (_service, owner) => {
    let assists: unknown = [];
    if (action !== 'revoke') {
      const body = await readBoundedExperienceJson(request, 1024 * 1024);
      if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => k !== 'assists')) throw new ExperienceFailure(400, 'invalid_request');
      assists = (body as { assists?: unknown }).assists ?? [];
    }
    return experienceJson(await mutateOwnerShare(createCanvasServiceClient(), owner, requireId((await context.params).artifactId), action, assists));
  });
}
export function POST(request: Request, context: Context) { return mutate(request, context, 'create'); }
export function PATCH(request: Request, context: Context) { return mutate(request, context, 'update'); }
export function DELETE(request: Request, context: Context) { return mutate(request, context, 'revoke'); }
