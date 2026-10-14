import type { Database, SourceFigureRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readCanonicalReviewerRecord, type CanonicalReviewerRecord } from '../canonical-reviewers';
import { ExperienceFailure } from '../experience/errors';
import { record } from '../experience/mappers';
import { sectionSourceBlocks } from '../source-page-snapshots';
import { isAcceptedLocalSnapshotPdf, resolveSnapshotPdfObject } from '../snapshot-pdf-object';
import { CANVAS_SOURCE_FILE_BUCKET, safeObjectKeyForCanvasFile } from '../canvas-file-policy';
import { OFFICE_STRUCTURE_VERSION } from '../activity-maker/office-extraction';
import { FIGURE_BUCKET } from './store';

type Client = SupabaseClient<Database>;
type SnapshotBlock = Database['public']['Tables']['reviewer_source_snapshot_blocks']['Row'];
export interface SectionFigure {
  readonly id: string; readonly url: string; readonly width: number; readonly height: number;
  readonly page?: number; readonly slide?: number;
}
export const SECTION_FIGURE_CAP = 12;
interface MaterialFigures { readonly figures: readonly SourceFigureRow[]; readonly blocks: readonly SnapshotBlock[]; readonly standalonePdf: boolean }
type Dependencies = { readonly read?: typeof readCanonicalReviewerRecord; readonly materials?: typeof readMaterialFigures };

async function savedReviewer(client:Client,userId:string,artifactId:string,read=readCanonicalReviewerRecord) {
  const result=await read(client,userId,artifactId);
  if(!result.ok) throw new ExperienceFailure(503,'unavailable');
  const s=result.value;
  if(!s || s.artifact.user_id!==userId || s.version.user_id!==userId || s.source.user_id!==userId || s.artifact.deleted_at!==null)
    throw new ExperienceFailure(404,'not_found');
  return s;
}

/** Partial/ambiguous persistence never becomes a displayed extraction result. */
async function completeFigures(client:Client,userId:string,kind:'canvas_file'|'local_pdf',rowId:string,hash:string):Promise<readonly SourceFigureRow[]> {
  const [rows,receipt]=await Promise.all([
    client.from('source_figures').select('*').eq('user_id',userId).eq('source_kind',kind)
      .eq('source_row_id',rowId).eq('original_sha256',hash).order('position').limit(61),
    client.from('source_figure_extractions').select('figure_count').eq('user_id',userId).eq('source_kind',kind)
      .eq('source_row_id',rowId).eq('original_sha256',hash).order('created_at',{ascending:false}).limit(1),
  ]);
  if(rows.error || receipt.error)throw new ExperienceFailure(503,'unavailable');
  const count=receipt.data?.[0]?.figure_count;
  if(count===undefined || (rows.data?.length??0)>60 || rows.data?.length!==count)return [];
  return rows.data??[];
}

export async function readMaterialFigures(client:Client,saved:CanonicalReviewerRecord,userId:string):Promise<readonly MaterialFigures[]> {
  const metadata=record(saved.source.metadata);
  if(isAcceptedLocalSnapshotPdf(saved.source)) {
    if(!(await resolveSnapshotPdfObject(client,{userId,sourceVersionId:saved.source.id})).available) return [];
    const asset=await client.from('document_assets').select('id,content_sha256').eq('id',saved.source.document_asset_id!).eq('user_id',userId).maybeSingle();
    if(asset.error) throw new ExperienceFailure(503,'unavailable');
    if(!asset.data?.content_sha256) return []; // legacy hashless assets have snapshot fallback only
    const figures=await completeFigures(client,userId,'local_pdf',asset.data.id,asset.data.content_sha256);
    return [{figures,blocks:[],standalonePdf:true}];
  }
  if(saved.source.revision_kind==='user_edited' || typeof metadata.reviewerSourceSnapshotId!=='string') return [];
  const snapshot=await client.from('reviewer_source_snapshots').select('id,user_id,was_edited,source_mode,source_count')
    .eq('id',metadata.reviewerSourceSnapshotId).eq('user_id',userId).maybeSingle();
  if(snapshot.error) throw new ExperienceFailure(503,'unavailable');
  if(!snapshot.data || snapshot.data.user_id!==userId || snapshot.data.was_edited || snapshot.data.source_mode!=='canvas') return [];
  const [items,blocks]=await Promise.all([
    client.from('reviewer_source_snapshot_items').select('*').eq('source_snapshot_id',snapshot.data.id).eq('user_id',userId).order('ordinal').limit(9),
    client.from('reviewer_source_snapshot_blocks').select('*').eq('source_snapshot_id',snapshot.data.id).eq('user_id',userId).order('ordinal').limit(401),
  ]);
  if(items.error || blocks.error) throw new ExperienceFailure(503,'unavailable');
  if(!items.data || items.data.length!==snapshot.data.source_count || items.data.length>8 || (blocks.data?.length??0)>400) return [];
  const result:MaterialFigures[]=[];
  for(const item of items.data) {
    if(item.source_type!=='file' || item.user_id!==userId || !item.source_row_id || !item.stored_content_sha256 ||
      !/^[a-f0-9]{64}$/.test(item.stored_content_sha256)) continue;
    const object=await client.storage.from(CANVAS_SOURCE_FILE_BUCKET).exists(safeObjectKeyForCanvasFile({userId,fileId:item.source_row_id,contentHash:item.stored_content_sha256}));
    if(object.error || object.data!==true) continue; // exact accepted original, never current-file substitution
    const figures=await completeFigures(client,userId,'canvas_file',item.source_row_id,item.stored_content_sha256);
    result.push({figures,blocks:(blocks.data??[]).filter(b=>b.user_id===userId && b.source_snapshot_item_id===item.id),
      standalonePdf:items.data.length===1 && item.file_kind==='pdf'});
  }
  return result;
}

/** Structural IDs and snapshot block ordinals are the only linking evidence. */
export function citedFigures(saved:CanonicalReviewerRecord,sectionId:string,materials:readonly MaterialFigures[]):readonly SourceFigureRow[] {
  const cited=sectionSourceBlocks(saved,sectionId); if(!cited.length) return [];
  const figures=materials.flatMap(material=>{
    const canonicalIds=new Set(cited.map(b=>b.id));
    const linked=material.blocks.filter(b=>canonicalIds.has(`canvas-${b.source_ordinal}-${b.block_ordinal}`));
    const pages=new Set(linked.flatMap(b=>b.page_number ? [b.page_number] : []));
    if(material.standalonePdf) for(const block of cited) if(block.pageNumber && block.id===`page-${block.pageNumber}`) pages.add(block.pageNumber);
    const office=linked.filter(b=>b.parser_version===OFFICE_STRUCTURE_VERSION);
    const slides=new Set(office.flatMap(b=>b.slide_number ? [b.slide_number] : []));
    const blocks=new Set(office.map(b=>`block-${b.block_ordinal}`));
    return material.figures.filter(f=>f.user_id===saved.source.user_id &&
      (f.page_number!==null ? pages.has(f.page_number) : f.slide_number!==null ? slides.has(f.slide_number) : !!f.block_id && blocks.has(f.block_id)));
  });
  const unique=new Map(figures.map(f=>[f.id,f]));
  return [...unique.values()].sort((a,b)=>(a.page_number??a.slide_number??0)-(b.page_number??b.slide_number??0)||a.position-b.position||a.id.localeCompare(b.id)).slice(0,SECTION_FIGURE_CAP);
}

export async function getSectionFigures(client:Client,input:{userId:string;artifactId:string;sectionId:string},dependencies:Dependencies={}):Promise<{figures:readonly SectionFigure[]}> {
  const saved=await savedReviewer(client,input.userId,input.artifactId,dependencies.read);
  // Validate the section before any private Storage access, even when no images exist.
  sectionSourceBlocks(saved,input.sectionId);
  const materials=await (dependencies.materials??readMaterialFigures)(client,saved,input.userId);
  const figures:SectionFigure[]=[];
  for(const row of citedFigures(saved,input.sectionId,materials)) {
    const signed=await client.storage.from(FIGURE_BUCKET).createSignedUrl(row.storage_path,600);
    if(signed.error || !signed.data?.signedUrl) continue;
    figures.push({id:row.id,url:signed.data.signedUrl,width:row.width,height:row.height,
      ...(row.page_number ? {page:row.page_number} : {}),...(row.slide_number ? {slide:row.slide_number} : {})});
  }
  return {figures};
}
export async function getSectionFigureAvailability(client:Client,input:{userId:string;artifactId:string},dependencies:Dependencies={}) {
  const saved=await savedReviewer(client,input.userId,input.artifactId,dependencies.read);
  const materials=await (dependencies.materials??readMaterialFigures)(client,saved,input.userId);
  const payload=record(saved.version.payload);const reviewer=record(payload.reviewer??payload);
  const sections=Array.isArray(reviewer.sections)?reviewer.sections:[];
  if(sections.length>100) return {sections:[]};
  return {sections:sections.map(record).filter(s=>typeof s.id==='string').map(s=>({sectionId:String(s.id),hasFigures:citedFigures(saved,String(s.id),materials).length>0}))};
}
