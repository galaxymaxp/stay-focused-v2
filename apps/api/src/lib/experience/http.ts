import type { ExperienceResponse } from '@stay-focused/shared';
import { verifyBearerToken } from '@/lib/auth';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { listCanvasReviewerSources } from '@/lib/canvas-reviewer-sources';
import { readReviewerSourceStatus } from '@/lib/reviewer-source-status';
import { ExperienceFailure, normalizeExperienceError } from './errors';
import { ExperienceService } from './service';
import { trustedExperienceReadRepository } from './repository';

const headers = { 'Cache-Control': 'private, no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, idempotency-key', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Max-Age': '600' };
export function experienceOptions() { return new Response(null, { status: 204, headers }); }
export function experienceJson<T>(data: T, status = 200) { return Response.json({ ok: true, data } satisfies ExperienceResponse<T>, { status, headers }); }
export async function readBoundedExperienceJson(request:Request,maximumBytes:number):Promise<unknown> {
  const reader=request.body?.getReader();
  if(!reader)throw new ExperienceFailure(400,'invalid_request');
  const chunks:Uint8Array[]=[];let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>maximumBytes){await reader.cancel();throw new ExperienceFailure(400,'invalid_request');}
      chunks.push(value);
    }
    const body=new Uint8Array(size);let offset=0;
    for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));
  }catch{throw new ExperienceFailure(400,'invalid_request');}
  finally{reader.releaseLock();}
}
export function createExperienceService(authenticatedUserId: string) {
  // This client is created only after experienceRoute verifies the bearer token.
  // Every read dependency is then bound to that verified identity.
  const client = createCanvasServiceClient();
  return new ExperienceService({ repository: trustedExperienceReadRepository(client, authenticatedUserId),
    materials: (_userId, courseId, offset) => listCanvasReviewerSources({ client, userId: authenticatedUserId, courseId, offset, limit: 100 }),
    freshness: async (_userId, reviewerArtifactId) => {
      const status = await readReviewerSourceStatus({ client, userId: authenticatedUserId, reviewerArtifactId });
      return status.ok ? status.value.overallStatus : 'unknown';
    },
  });
}
export async function experienceRoute(request: Request, action: (service: ExperienceService, userId: string) => Promise<Response>): Promise<Response> {
  try {
    const user = await verifyBearerToken(request);
    if (!user) throw new ExperienceFailure(401, 'sign_in_required');
    return await action(createExperienceService(user.id), user.id);
  } catch (error) {
    const normalized = normalizeExperienceError(error);
    // No error messages/stacks: provider and database errors may contain content.
    console.error('experience.request.failed', { code: normalized.error.code, status: normalized.status, errorType: error instanceof Error ? error.name : 'unknown' });
    return Response.json({ ok: false, error: normalized.error }, { status: normalized.status, headers });
  }
}
export function readInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback;
  if (!/^-?\d+$/.test(value)) throw new ExperienceFailure(400, 'invalid_request');
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new ExperienceFailure(400, 'invalid_request');
  return result;
}
export function requireId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new ExperienceFailure(404, 'not_found');
  return id;
}
