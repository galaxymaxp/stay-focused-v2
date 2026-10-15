import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson, experienceOptions, experienceRoute, requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { getSectionFigures } from '@/lib/source-figures/sections';
export const runtime = 'nodejs';
export const OPTIONS = experienceOptions;
export async function GET(request:Request,context:{params:Promise<{id:string;sectionId:string}>}) {
  return experienceRoute(request,async(_service,userId)=>{
    const {id:artifactId,sectionId}=await context.params;requireId(artifactId);
    if(!/^[a-zA-Z0-9_-]{1,220}$/.test(sectionId)) throw new ExperienceFailure(404,'not_found');
    return experienceJson(await getSectionFigures(createCanvasServiceClient(),{userId,artifactId,sectionId}));
  });
}
