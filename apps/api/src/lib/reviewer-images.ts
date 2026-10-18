import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReviewerImages } from '@stay-focused/shared';
import { readCanonicalReviewerRecord } from './canonical-reviewers';
import { ExperienceFailure } from './experience/errors';
import { record } from './experience/mappers';
import { getSectionFigures, readMaterialFigures } from './source-figures/sections';
import { readSourcePageSnapshots, type SourcePageSnapshotResult } from './source-page-snapshots';
import { readReviewerVisuals } from './external-visuals/batch';

/** Read only: this route never admits rendering or external-provider work. */
export async function readReviewerImages(client: SupabaseClient<Database>, input: {userId:string;artifactId:string}, dependencies: {
  read?: typeof readCanonicalReviewerRecord; materials?: typeof readMaterialFigures;
  figures?: typeof getSectionFigures; snapshots?: typeof readSourcePageSnapshots; external?: typeof readReviewerVisuals;
} = {}): Promise<ReviewerImages> {
  const result = await (dependencies.read ?? readCanonicalReviewerRecord)(client,input.userId,input.artifactId);
  if (!result.ok) throw new ExperienceFailure(503,'unavailable');
  const saved=result.value;
  if (!saved || saved.artifact.user_id!==input.userId || saved.version.user_id!==input.userId || saved.source.user_id!==input.userId || saved.artifact.deleted_at!==null)
    throw new ExperienceFailure(404,'not_found');
  const payload=record(saved.version.payload),reviewer=record(payload.reviewer??payload);
  const sections=Array.isArray(reviewer.sections)?reviewer.sections.map(record):[];
  if (sections.length>100 || sections.some(s=>typeof s.id!=='string' || !/^[a-zA-Z0-9_-]{1,220}$/.test(s.id)) || new Set(sections.map(s=>s.id)).size!==sections.length)
    throw new ExperienceFailure(503,'unavailable');
  const read: typeof readCanonicalReviewerRecord=async()=>({ok:true,value:saved});
  const [materials,external]=await Promise.all([
    (dependencies.materials??readMaterialFigures)(client,saved,input.userId),
    (dependencies.external??readReviewerVisuals)(client,input,{read}),
  ]);
  const output: ReviewerImages['sections'][number][] = [];
  let next=0;
  await Promise.all(Array.from({length:Math.min(3,sections.length)},async()=>{
    while(next<sections.length) {
      const index=next++,sectionId=String(sections[index]!.id);
      const {figures}=await (dependencies.figures??getSectionFigures)(client,{...input,sectionId},{read,materials:async()=>materials});
      output[index]={sectionId,hasFigures:figures.length>0,figures,snapshot:{available:false,reason:'no_page_source'},...(external.sections[sectionId]?{external:external.sections[sectionId]}:{})};
    }
  }));
  const snapshotIds=output.map(s=>s.sectionId);
  const snapshots=snapshotIds.length?await (dependencies.snapshots??readSourcePageSnapshots)(client,saved,input.userId,snapshotIds):new Map<string,SourcePageSnapshotResult>();
  return {sections:output.map(s=>({...s,snapshot:snapshots.get(s.sectionId)??s.snapshot})),external:{checked:external.checked,total:external.total,running:external.running}};
}
