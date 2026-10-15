import { experienceRequest, type ExperienceClient } from './experienceApi';

export interface SourceFigure {
  readonly id: string; readonly url: string; readonly width: number; readonly height: number;
  readonly page?: number; readonly slide?: number;
}
function record(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('figures_invalid');
  return value as Record<string,unknown>;
}
const positive=(value:unknown,max:number):value is number=>typeof value==='number' && Number.isSafeInteger(value) && value>0 && value<=max;
export async function readSectionFigures(client:ExperienceClient,artifactId:string,sectionId:string,signal?:AbortSignal):Promise<readonly SourceFigure[]> {
  const data=record(await experienceRequest(client,`/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}/figures`,{signal}));
  if(!Array.isArray(data.figures) || data.figures.length>12)throw new Error('figures_invalid');
  const seen=new Set<string>();
  return data.figures.map((value:unknown)=>{
    const f=record(value);
    if(typeof f.id!=='string' || !f.id || f.id.length>100 || seen.has(f.id) ||
      typeof f.url!=='string' || !f.url.startsWith('https://') || !positive(f.width,10000) || !positive(f.height,10000) ||
      (f.page!==undefined && !positive(f.page,100)) || (f.slide!==undefined && !positive(f.slide,100)) ||
      (f.page!==undefined && f.slide!==undefined))throw new Error('figures_invalid');
    seen.add(f.id);
    return {id:f.id,url:f.url,width:f.width,height:f.height,
      ...(positive(f.page,100)?{page:f.page}:{}),...(positive(f.slide,100)?{slide:f.slide}:{})};
  });
}
export async function readFigureAvailability(client:ExperienceClient,artifactId:string,signal?:AbortSignal):Promise<ReadonlySet<string>> {
  const data=record(await experienceRequest(client,`/api/reviewers/${encodeURIComponent(artifactId)}/figures`,{signal}));
  if(!Array.isArray(data.sections) || data.sections.length>100)throw new Error('figures_invalid');
  const seen=new Set<string>();const available=new Set<string>();
  for(const value of data.sections) {
    const s=record(value);
    if(typeof s.sectionId!=='string' || !s.sectionId || s.sectionId.length>220 || seen.has(s.sectionId) || typeof s.hasFigures!=='boolean')throw new Error('figures_invalid');
    seen.add(s.sectionId);if(s.hasFigures)available.add(s.sectionId);
  }
  return available;
}
