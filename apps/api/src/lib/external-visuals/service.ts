import type { Database, SectionExternalVisualRow, Json } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readCanonicalReviewerRecord } from '../canonical-reviewers';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { getSourcePageSnapshot } from '../source-page-snapshots';
import { getSectionFigureAvailability } from '../source-figures/sections';
import { buildCommonsQueries, searchCommonsQueries } from './commons';
import { matchVisual } from './match';

export const EXTERNAL_VISUAL_LABEL = 'External reference — not from your course material.';
type Client=SupabaseClient<Database>;
export type ExternalVisualResult = ({status:'found';image:string;title:string;credit:string;license:string;licenseUrl:string;sourceUrl:string;label:typeof EXTERNAL_VISUAL_LABEL;width:number;height:number}
  | {status:'none';message:'No reliable visual found'}) & {attemptCount:number};
export interface VisualInput { userId:string;artifactId:string;sectionId:string;findAnother:boolean }
type Dependencies={read?:typeof readCanonicalReviewerRecord;snapshot?:typeof getSourcePageSnapshot;figures?:typeof getSectionFigureAvailability;search?:typeof searchCommonsQueries;match?:typeof matchVisual};
function response(row:SectionExternalVisualRow):ExternalVisualResult {
  if(row.status==='none')return {status:'none',message:'No reliable visual found',attemptCount:row.attempt_count};
  if(!row.image_url || !row.source_url || !row.title || !row.credit || !row.license || !row.license_url || !row.width || !row.height)throw new ExperienceFailure(503,'unavailable');
  return {status:'found',image:row.image_url,title:row.title,credit:row.credit,license:row.license,licenseUrl:row.license_url,sourceUrl:row.source_url,
    label:EXTERNAL_VISUAL_LABEL,width:row.width,height:row.height,attemptCount:row.attempt_count};
}
/** Match the reader's displayed sourceCore projection, excluding audit/enrichment. */
export function sectionText(section:Record<string,unknown>):string {
  const parts:string[]=typeof section.title==='string'?[section.title]:[];
  const items=Array.isArray(section.items)?section.items:Array.isArray(section.blocks)?section.blocks:[];
  for(const value of items) {
    const item=record(value);const core=record(item.sourceCore??item);
    if(typeof item.title==='string')parts.push(item.title);
    if(typeof core.explanation==='string')parts.push(core.explanation);
    if(Array.isArray(core.keyPoints))for(const point of core.keyPoints)if(typeof point==='string')parts.push(point);
    if(Array.isArray(core.evidence))for(const evidence of core.evidence){const e=record(evidence);if(typeof e.text==='string')parts.push(e.text);}
  }
  return parts.join('\n').slice(0,16000);
}
export async function findSectionVisual(client:Client,input:VisualInput,dependencies:Dependencies={}):Promise<ExternalVisualResult> {
  const read=await (dependencies.read??readCanonicalReviewerRecord)(client,input.userId,input.artifactId);
  if(!read.ok)throw new ExperienceFailure(503,'unavailable');
  const saved=read.value;
  if(!saved || saved.artifact.user_id!==input.userId || saved.version.user_id!==input.userId || saved.source.user_id!==input.userId || saved.artifact.deleted_at!==null)throw new ExperienceFailure(404,'not_found');
  const payload=record(saved.version.payload);const reviewer=record(payload.reviewer??payload);
  const section=(Array.isArray(reviewer.sections)?reviewer.sections:[]).map(record).find(s=>s.id===input.sectionId);
  if(!section)throw new ExperienceFailure(404,'not_found');
  const sourceInput={userId:input.userId,artifactId:input.artifactId,sectionId:input.sectionId};
  // Check source evidence before cache or admission, using existing exact-original rules.
  const snapshot=await (dependencies.snapshot??getSourcePageSnapshot)(client,{...sourceInput,render:false});
  if(snapshot.available)throw new ExperienceFailure(409,'conflict');
  const figures=await (dependencies.figures??getSectionFigureAvailability)(client,sourceInput);
  if(figures.sections.some(s=>s.sectionId===input.sectionId && s.hasFigures))throw new ExperienceFailure(409,'conflict');
  const cache=async()=>{
    const result=await client.from('section_external_visuals').select('*').eq('user_id',input.userId).eq('artifact_id',input.artifactId).eq('version_id',saved.version.id).eq('section_id',input.sectionId).maybeSingle();
    if(result.error)throw new ExperienceFailure(503,'unavailable');return result.data;
  };
  const previous=await cache();
  // A cached "none" gets one automatic retry (rows from the original VL3 filter rejected every real Commons result).
  const findAnother=input.findAnother || (previous?.status==='none' && previous.attempt_count<2);
  if(previous && (!findAnother || previous.attempt_count>=2))return response(previous);
  const text=sectionText(section);if(!text.trim())throw new ExperienceFailure(400,'insufficient_source');
  const reservation=await client.rpc('reserve_section_external_visual_v1',{p_user_id:input.userId,p_artifact_id:input.artifactId,p_version_id:saved.version.id,p_section_id:input.sectionId,p_find_another:findAnother});
  if(reservation.error) {
    const code=reservation.error.message;
    throw new ExperienceFailure(code==='external_visual_not_found'?404:code==='external_visual_daily_cap'?429:code==='external_visual_busy'?409:503,
      code==='external_visual_not_found'?'not_found':code==='external_visual_daily_cap'?'rate_limited':code==='external_visual_busy'?'conflict':'unavailable');
  }
  if(!reservation.data){const row=await cache();if(!row)throw new ExperienceFailure(503,'unavailable');return response(row);}
  const token=reservation.data;
  try {
    const queries=buildCommonsQueries(String(section.title??''),text);const query=queries.join(' | ').slice(0,300);
    const candidates=await (dependencies.search??searchCommonsQueries)(queries,previous?.excluded_titles??[]);
    // Empty Commons evidence needs no provider key/model call.
    const match=candidates.length?await (dependencies.match??matchVisual)(candidates,text):{candidate:null,verdict:'No eligible Commons candidate.',checkedTitles:[]};
    const image=match.candidate;
    // "Find another" with no better match keeps the image the student already has.
    const keep=!image && findAnother && previous?.status==='found'?previous:null;
    const result:Json=keep?{status:'found',query,verdict:keep.verdict,excluded_titles:[...new Set([...keep.excluded_titles,...match.checkedTitles])].slice(0,10),
      source_url:keep.source_url,image_url:keep.image_url,title:keep.title,credit:keep.credit,license:keep.license,license_url:keep.license_url,width:keep.width,height:keep.height}
      :{status:image?'found':'none',query,verdict:match.verdict,excluded_titles:[...new Set([...(previous?.excluded_titles??[]),...match.checkedTitles])].slice(0,10),
      ...(image?{source_url:image.sourceUrl,image_url:image.image,title:image.title,credit:image.credit,license:image.license,license_url:image.licenseUrl,width:image.width,height:image.height}:{})};
    const finished=await client.rpc('finish_section_external_visual_v1',{p_token:token,p_result:result});
    if(finished.error || finished.data!==true)throw new ExperienceFailure(503,'unavailable');
    const row=await cache();if(!row)throw new ExperienceFailure(503,'unavailable');
    console.info('external_visual.completed',{code:row.status,candidateCount:candidates.length,modelCallCount:match.checkedTitles.length,attemptCount:row.attempt_count});
    return response(row);
  } catch {
    await client.rpc('finish_section_external_visual_v1',{p_token:token,p_result:null});
    // Never cache none on timeout, transport failure or malformed provider evidence.
    throw new ExperienceFailure(503,'unavailable');
  }
}
