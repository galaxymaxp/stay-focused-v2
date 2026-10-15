import { createCanvasServiceClient } from '@/lib/canvas-db';
import { publicShareResponse, readPublicShare } from '@/lib/reviewer-shares/public';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  return publicShareResponse(request, token, value => readPublicShare(createCanvasServiceClient(), value));
}
