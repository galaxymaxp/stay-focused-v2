import { useEffect, useState } from 'react';
import { experienceRequest, type ExperienceClient } from './experienceApi';
export const EXTERNAL_VISUAL_LABEL='External reference — not from your course material.';
// Identify the native image client as required by Wikimedia's User-Agent policy.
// Course images keep their own signed URLs and receive no external headers.
export const EXTERNAL_IMAGE_HEADERS = Object.freeze({
  'User-Agent': 'StayFocused/2.1.0 (https://github.com/galaxymaxp/stay-focused-v2)',
});
export type ExternalVisual = ({status:'found';id?:string;image:string;title:string;credit:string;license:string;licenseUrl:string;sourceUrl:string;label:typeof EXTERNAL_VISUAL_LABEL;width:number;height:number}
  | {status:'none';message:'No reliable visual found'}) & {attemptCount:number};
export type ExternalReferenceVisual = Extract<ExternalVisual, { status: 'found' }>;
export interface ReviewerVisuals {
  sections: Record<string, ExternalReferenceVisual>;
  checked: number;
  total: number;
  running: boolean;
}
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
  return {status:'found',...(typeof v.id==='string' && /^[0-9a-f]{64}$/.test(v.id)?{id:v.id}:{}),image:v.image,title:v.title,credit:v.credit,license:v.license,licenseUrl:v.licenseUrl,sourceUrl:v.sourceUrl,label:EXTERNAL_VISUAL_LABEL,
    width:v.width,height:v.height,attemptCount:v.attemptCount};
}
export async function findExternalVisual(client:ExperienceClient,artifactId:string,sectionId:string,findAnother:boolean,signal?:AbortSignal):Promise<ExternalVisual> {
  return parseExternalVisual(await experienceRequest(client,`/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}/external-visual`,
    {method:'POST',body:{findAnother},signal}));
}

export function parseReviewerVisuals(value: unknown): ReviewerVisuals {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('visual_invalid');
  const v = value as Record<string, unknown>;
  if (!Number.isSafeInteger(v.checked) || Number(v.checked) < 0 || !Number.isSafeInteger(v.total) || Number(v.total) < 0 ||
      typeof v.running !== 'boolean' || !v.sections || typeof v.sections !== 'object' || Array.isArray(v.sections)) throw new Error('visual_invalid');
  const sections: Record<string, ExternalReferenceVisual> = Object.create(null);
  for (const [id, raw] of Object.entries(v.sections)) {
    if (!/^[a-zA-Z0-9_-]{1,220}$/.test(id)) continue;
    // Stored rows can be stale or malformed. Keep each visual's strict safety
    // checks without allowing one bad section to hide the rest of the batch.
    try {
      const visual = parseExternalVisual(raw);
      if (visual.status === 'found') sections[id] = visual;
    } catch { /* Omit only this invalid section; retain batch progress/polling. */ }
  }
  return { sections, checked: Number(v.checked), total: Number(v.total), running: v.running };
}

/** One reviewer-level batch, with bounded polling and ephemeral owner-scoped URLs. */
export function useReviewerVisuals(client: ExperienceClient, artifactId: string | null, offline: boolean): Record<string, ExternalReferenceVisual> | null {
  const [state, setState] = useState<{ client: ExperienceClient; artifactId: string; sections: Record<string, ExternalReferenceVisual> } | null>(null);
  useEffect(() => {
    setState(null);
    if (offline || !artifactId || !client.accessToken) return;
    const controller = new AbortController();
    const path = `/api/reviewers/${encodeURIComponent(artifactId)}/visuals`;
    let alive = true, polls = 0, idle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async (): Promise<ReviewerVisuals | null> => {
      try {
        const value = parseReviewerVisuals(await experienceRequest(client, path, { signal: controller.signal }));
        if (alive && !controller.signal.aborted) setState({ client, artifactId, sections: value.sections });
        return value;
      } catch { return null; }
    };
    const poll = async () => {
      const value = await load();
      if (!alive || controller.signal.aborted) return;
      polls++;
      idle = value?.running ? 0 : idle + 1;
      if (polls < 60 && idle < 4) timer = setTimeout(() => void poll(), 4000);
    };
    void (async () => {
      const first = await load();
      if (!alive || !first || (first.checked >= first.total && !first.running)) return;
      if (!first.running) {
        try { await experienceRequest(client, path, { method: 'POST', body: {}, signal: controller.signal }); }
        catch { return; }
      }
      if (alive && !controller.signal.aborted) timer = setTimeout(() => void poll(), 4000);
    })();
    return () => { alive = false; controller.abort(); if (timer) clearTimeout(timer); };
  }, [client, artifactId, offline]);
  return !offline && state?.client === client && state.artifactId === artifactId ? state.sections : null;
}
