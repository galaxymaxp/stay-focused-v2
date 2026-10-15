import { createCanvasServiceClient } from '@/lib/canvas-db';
import { experienceJson,experienceOptions,experienceRoute,requireId } from '@/lib/experience/http';
import { ExperienceFailure } from '@/lib/experience/errors';
import { readBoundedText } from '@/lib/bounded-body';
import { findSectionVisual } from '@/lib/external-visuals/service';
export const runtime='nodejs';
export const OPTIONS=experienceOptions;
export async function POST(request:Request,context:{params:Promise<{id:string;sectionId:string}>}) {
  return experienceRoute(request,async(_service,userId)=>{
    const {id:artifactId,sectionId}=await context.params;requireId(artifactId);
    if(!/^[a-zA-Z0-9_-]{1,220}$/.test(sectionId))throw new ExperienceFailure(404,'not_found');
    if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ExperienceFailure(400,'invalid_request');
    const body=await readBoundedText(request,1024);if(!body.ok)throw new ExperienceFailure(400,'invalid_request');
    let value:unknown;try{value=JSON.parse(body.text);}catch{throw new ExperienceFailure(400,'invalid_request');}
    if(!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(k=>k!=='findAnother'))throw new ExperienceFailure(400,'invalid_request');
    const findAnother=(value as {findAnother?:unknown}).findAnother;
    if(findAnother!==undefined && typeof findAnother!=='boolean')throw new ExperienceFailure(400,'invalid_request');
    return experienceJson(await findSectionVisual(createCanvasServiceClient(),{userId,artifactId,sectionId,findAnother:findAnother===true}));
  });
}
