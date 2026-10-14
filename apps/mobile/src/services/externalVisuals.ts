import { experienceRequest, type ExperienceClient } from './experienceApi';
export const EXTERNAL_VISUAL_LABEL='External reference — not from your course material.';
export type ExternalVisual = ({status:'found';image:string;title:string;credit:string;license:string;licenseUrl:string;sourceUrl:string;label:typeof EXTERNAL_VISUAL_LABEL;width:number;height:number}
  | {status:'none';message:'No reliable visual found'}) & {attemptCount:number};
function allowedUrl(value:unknown,hosts:readonly string[]):value is string {
  if(typeof value!=='string')return false;
  try{const url=new URL(value);return url.protocol==='https:' && hosts.includes(url.hostname) && !url.username && !url.password && !url.port;}catch{return false;}
}
export function parseExternalVisual(value:unknown):ExternalVisual {
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('visual_invalid');
  const v=value as Record<string,unknown>;
  if(v.attemptCount!==1 && v.attemptCount!==2)throw new Error('visual_invalid');
  if(v.status==='none' && v.message==='No reliable visual found')return {status:'none',message:v.message,attemptCount:v.attemptCount};
  if(v.status!=='found' || v.label!==EXTERNAL_VISUAL_LABEL || !allowedUrl(v.image,['upload.wikimedia.org']) || !allowedUrl(v.sourceUrl,['commons.wikimedia.org']) ||
    !new URL(v.sourceUrl).pathname.startsWith('/wiki/File:') || !allowedUrl(v.licenseUrl,['creativecommons.org','commons.wikimedia.org']) ||
    typeof v.title!=='string' || !v.title || v.title.length>500 || typeof v.credit!=='string' || !v.credit || v.credit.length>2000 ||
    typeof v.license!=='string' || !['Public domain','CC0','CC BY','CC BY-SA'].includes(v.license) ||
    typeof v.width!=='number' || !Number.isSafeInteger(v.width) || v.width<1 || v.width>1200 ||
    typeof v.height!=='number' || !Number.isSafeInteger(v.height) || v.height<1 || v.height>10000)throw new Error('visual_invalid');
  return {status:'found',image:v.image,title:v.title,credit:v.credit,license:v.license,licenseUrl:v.licenseUrl,sourceUrl:v.sourceUrl,label:EXTERNAL_VISUAL_LABEL,
    width:v.width,height:v.height,attemptCount:v.attemptCount};
}
export async function findExternalVisual(client:ExperienceClient,artifactId:string,sectionId:string,findAnother:boolean,signal?:AbortSignal):Promise<ExternalVisual> {
  return parseExternalVisual(await experienceRequest(client,`/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}/external-visual`,
    {method:'POST',body:{findAnother},signal}));
}
