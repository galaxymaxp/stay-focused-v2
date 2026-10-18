import { verifyBearerToken } from '@/lib/auth';
import { createCanvasServiceClient } from '@/lib/canvas-db';
import { createCorsHeaders, optionsResponse } from '@/lib/canvas-routes';
import { AvatarFailure, normalizeAvatar, readAvatarBytes } from '@/lib/profile-avatar-image';
import { deleteProfileAvatar, getProfileAvatar, replaceProfileAvatar } from '@/lib/profile-avatars';

export const runtime = 'nodejs';
export const maxDuration = 30;
const METHODS = 'GET, PUT, DELETE, OPTIONS';
function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...createCorsHeaders(request.headers.get('origin'),METHODS), 'Cache-Control':'private, no-store' } });
}
async function handle(request: Request, method: 'GET' | 'PUT' | 'DELETE'): Promise<Response> {
  try {
    const user = await verifyBearerToken(request);
    if (!user) throw new AvatarFailure(401,'unauthorized');
    // No user/path parameter is accepted, including on read/delete.
    if (new URL(request.url).search) throw new AvatarFailure(400,'invalid_request');
    const png = method === 'PUT' ? await normalizeAvatar(await readAvatarBytes(request),request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '') : null;
    const client = createCanvasServiceClient();
    const data = method === 'PUT' ? await replaceProfileAvatar(client,user.id,png!) : method === 'DELETE' ? await deleteProfileAvatar(client,user.id) : await getProfileAvatar(client,user.id);
    return json(request,{ok:true,data});
  } catch (error) {
    const failure = error instanceof AvatarFailure ? error : new AvatarFailure(503,'unavailable');
    const message = failure.status === 413 ? 'Choose a photo under 2 MB.' : failure.code === 'invalid_image' ? 'Choose a JPEG, PNG or WebP photo.' : failure.status === 401 ? 'Please sign in again.' : 'Could not update your photo. Try again.';
    return json(request,{ok:false,error:{code:failure.code,message}},failure.status);
  }
}
export const GET = (request: Request) => handle(request,'GET');
export const PUT = (request: Request) => handle(request,'PUT');
export const DELETE = (request: Request) => handle(request,'DELETE');
export function OPTIONS(request: Request): Response {
  const response = optionsResponse(request,METHODS);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
