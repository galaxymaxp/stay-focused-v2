import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, requireId } from '@/lib/experience/http';
import { readReviewerImages } from '@/lib/reviewer-images';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  return experienceRoute(request,async(_service,userId)=>{
    const {id:artifactId}=await context.params;requireId(artifactId);
    return experienceJson(await readReviewerImages(createCanvasServiceClient(),{userId,artifactId}));
  });
}
