import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {Database} from '@stay-focused/db';
import type {SupabaseClient} from '@supabase/supabase-js';
const mocks=vi.hoisted(()=>({list:vi.fn(),prepare:vi.fn(),structure:vi.fn(),preview:vi.fn(),validate:vi.fn(),gate:vi.fn(),snapshot:vi.fn(),existing:vi.fn(),source:vi.fn(),create:vi.fn(),createDeferred:vi.fn(),readFile:vi.fn(),attachments:vi.fn(),schedule:vi.fn(),lookup:vi.fn(),admit:vi.fn(),result:vi.fn()}));
vi.mock('@/lib/canvas-reviewer-sources',()=>({listCanvasReviewerSources:mocks.list,prepareCanvasReviewerSources:mocks.prepare,structureCanvasReviewerSources:mocks.structure,previewSelectiveCanvasReviewerSources:mocks.preview}));
vi.mock('@/lib/canvas-preparation/admission',()=>({lookupMaterialPreparation:mocks.lookup,admitMaterialPreparation:mocks.admit}));
vi.mock('@/lib/canvas-preparation/repository',()=>({readPreparedResult:mocks.result}));
vi.mock('@/lib/reviewer-source-provenance',async load=>({...await load<typeof import('@/lib/reviewer-source-provenance')>(),validateCanvasPreviewSessionForGeneration:mocks.validate,createOrReuseReviewerSourceSnapshot:mocks.snapshot}));
vi.mock('@/lib/canvas-reviewer-generation-gate',()=>({validateCanvasReviewerGenerationGate:mocks.gate}));
vi.mock('@/lib/processing-jobs/repository',()=>({findProcessingJobByIdempotencyKey:mocks.existing,findProcessingJobSource:mocks.source}));
vi.mock('@/lib/processing-jobs/creation',()=>({createDeferredCanvasReviewerProcessingJob:mocks.createDeferred,createReviewerProcessingJob:mocks.create,validateIdempotencyKey:(key:string|null)=>{if(!key||key.length<8)throw new Error('bad key');return key;},ProcessingJobCreationError:class extends Error{}}));
vi.mock('@/lib/processing-jobs/background-dispatch',()=>({scheduleAcceptedProcessingJobDispatch:mocks.schedule}));
vi.mock('./canvas-page-attachments',()=>({resolveInstructionalPageAttachments:mocks.attachments}));
import {startReviewerGeneration} from './generation';
const file='00000000-0000-4000-8000-000000000001',page='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const input={courseId:'course',materialId:`file:${file}`};
const job={id:'job',user_id:'owner',job_type:'reviewer_generation',status:'queued'};
const text='Accepted source explains the lesson using complete instructional evidence and preserves every supported statement in the material.';
const query={select:vi.fn(),eq:vi.fn(),maybeSingle:mocks.readFile};const client={from:()=>query} as unknown as SupabaseClient<Database>;
function component(id=file,kind='text'){return {type:'file',id,revision:'a'.repeat(64),text,blocks:[{id:'block-1',kind:'paragraph',order:0,text}],originalSha256:'b'.repeat(64),originalByteSize:100,extraction:{text,fileKind:kind}};}
function pageSource(components:ReturnType<typeof component>[]){
  mocks.list.mockResolvedValue({ok:true,value:{sources:[{id:`page:${page}`,type:'page',capability:'ready',availability:'available',file:null}],pagination:{hasMore:false}}});
  mocks.result.mockResolvedValue({version:1,components:[{type:'page',id:page,revision:'c'.repeat(64),text,blocks:[]},...components]});
  mocks.source.mockResolvedValue({metadata:{canvasCourseId:'course',canvasItemIds:[`page:${page}`,...components.map(value=>`file:${value.id}`)]}});
}
beforeEach(()=>{
  vi.resetAllMocks();query.select.mockReturnValue(query);query.eq.mockReturnValue(query);
  mocks.existing.mockResolvedValue(null);mocks.lookup.mockResolvedValue({id:'preparation',state:'prepared',result_id:'result'});mocks.admit.mockResolvedValue({id:'preparation',state:'pending'});mocks.result.mockResolvedValue({version:1,components:[component()]});
  mocks.list.mockResolvedValue({ok:true,value:{sources:[{id:input.materialId,type:'file',capability:'ready',availability:'available',file:{kind:'text',preparationStatus:'ready',canPrepare:false}}],pagination:{hasMore:false}}});
  mocks.structure.mockResolvedValue({ok:true,value:{structureSessionId:'structure',sources:[{blocks:[{id:'a',selectedByDefault:true},{id:'b',selectedByDefault:false}]}]}});
  mocks.preview.mockResolvedValue({ok:true,value:{sourceText:text,suggestedTitle:'Lesson',previewSessionId:'preview',resolutionFingerprint:'fingerprint'}});
  mocks.validate.mockResolvedValue({ok:true,value:{row:{user_id:'owner'}}});mocks.gate.mockResolvedValue({ok:true});mocks.snapshot.mockResolvedValue({ok:true,value:{sourceSnapshotId:'snapshot'}});mocks.create.mockResolvedValue(job);mocks.createDeferred.mockResolvedValue(job);
  mocks.source.mockResolvedValue({metadata:{canvasCourseId:'course',canvasItemIds:[input.materialId]}});
  mocks.readFile.mockResolvedValue({data:{id:file,user_id:'owner',course_id:'course',canvas_connection_id:'connection',canvas_file_id:'42',display_name:'Lesson.pdf',content_version_fingerprint:'a'.repeat(64),content_type:'application/pdf',stored_content_type:'application/pdf',stored_byte_count:100,storage_bucket:'canvas-source-files',storage_object_key:'private-original',current_sha256:'b'.repeat(64),availability_status:'available',ingestion_status:'stored',ingestion_eligibility:'eligible_document'},error:null});
});
describe('student Reviewer admission from durable preparation',()=>{
  it.each(['pending','running','failed','cancelled','missing'])('waits for %s preparation without inline ingestion, OCR or preview fallback',async state=>{
    mocks.lookup.mockResolvedValue(state==='missing'?null:{id:'preparation',state});mocks.result.mockResolvedValue(null);
    await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({status:409,code:'not_ready'});
    expect(mocks.admit).toHaveBeenCalledWith(client,expect.objectContaining({...input,userId:'owner',cycleKey:'generation:request-key'}));
    for(const operation of [mocks.prepare,mocks.attachments,mocks.preview,mocks.create,mocks.createDeferred])expect(operation).not.toHaveBeenCalled();
  });
  it('reuses default selection, preview freshness and snapshots for a prepared non-PDF',async()=>{
    expect(await startReviewerGeneration(client,'owner',input,'request-key')).toEqual(job);expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({selectedBlockIds:['a']}));
    expect(mocks.gate).toHaveBeenCalledOnce();expect(mocks.snapshot).toHaveBeenCalledOnce();expect(mocks.schedule).toHaveBeenCalledWith(job);expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it.each(['pptx','docx'])('retains accepted canonical block IDs for new %s Reviewer figures',async kind=>{
    mocks.result.mockResolvedValue({version:1,components:[component(file,kind)]});
    mocks.validate.mockResolvedValue({ok:true,value:{row:{user_id:'owner',selected_block_manifest:[
      {source_ordinal:1,block_ordinal:2,block_text:text,page_number:null,slide_number:4}]}}});
    await startReviewerGeneration(client,'owner',input,'request-key');
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({source:expect.objectContaining({
      sourceBlocks:[{id:'canvas-1-2',kind:'unknown',order:0,text}],
      sourcePrivateMetadata:expect.objectContaining({reviewerSourceSnapshotId:'snapshot'})})}));
  });
  it('accepts a prepared PDF through deferred provenance with its preparation receipt',async()=>{
    mocks.list.mockResolvedValue({ok:true,value:{sources:[{id:input.materialId,type:'file',file:{kind:'pdf',preparationStatus:'ready'},capability:'ready',availability:'available'}]}});mocks.result.mockResolvedValue({version:1,components:[component(file,'pdf')]});
    await startReviewerGeneration(client,'owner',input,'request-key');expect(mocks.createDeferred).toHaveBeenCalledWith(expect.objectContaining({source:expect.objectContaining({canvasFileRowId:file,contentSha256:'b'.repeat(64),sourcePrivateMetadata:expect.objectContaining({canvasPreparationJobId:'preparation'})})}));expect(mocks.structure).not.toHaveBeenCalled();expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('keeps a Page and its prepared PDF in exact provenance order without Canvas fetches',async()=>{
    pageSource([component(file,'pdf')]);await startReviewerGeneration(client,'owner',{...input,materialId:`page:${page}`},'request-key');
    expect(mocks.createDeferred).toHaveBeenCalledWith(expect.objectContaining({source:expect.objectContaining({sourcePrivateMetadata:expect.objectContaining({canvasItemIds:[`page:${page}`,`file:${file}`]})})}));expect(mocks.attachments).not.toHaveBeenCalled();expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('keeps all prepared Page attachments in teacher order in the composite worker',async()=>{
    pageSource([component(other,'pptx'),component(file,'pdf')]);await startReviewerGeneration(client,'owner',{...input,materialId:`page:${page}`},'request-key');
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({source:expect.objectContaining({sourcePrivateMetadata:expect.objectContaining({canvasItemIds:[`page:${page}`,`file:${other}`,`file:${file}`],canvasPreparationJobId:'preparation'})})}));expect(mocks.createDeferred).not.toHaveBeenCalled();expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('admits substantive prepared body-only Pages',async()=>{pageSource([]);await startReviewerGeneration(client,'owner',{...input,materialId:`page:${page}`},'request-key');expect(mocks.create).toHaveBeenCalledOnce();});
  it('rejects stale persisted evidence before preview or source publication',async()=>{mocks.result.mockResolvedValue(null);await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({code:'not_ready'});expect(mocks.preview).not.toHaveBeenCalled();expect(mocks.snapshot).not.toHaveBeenCalled();});
  it.each(['structure','preview','validate','gate'] as const)('preserves %s denial on prepared evidence',async stage=>{mocks[stage].mockResolvedValue({ok:false});await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({code:'not_ready'});expect(mocks.create).not.toHaveBeenCalled();});
  it('returns safe not-found for an absent owned source',async()=>{mocks.list.mockResolvedValue({ok:true,value:{sources:[]}});await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({status:404});expect(mocks.lookup).not.toHaveBeenCalled();});
  it('requires an idempotency key before any source work',async()=>{await expect(startReviewerGeneration(client,'owner',input,null)).rejects.toMatchObject({status:400});expect(mocks.list).not.toHaveBeenCalled();});
  it('reconnects accepted owned work before preparation',async()=>{mocks.existing.mockResolvedValue(job);expect(await startReviewerGeneration(client,'owner',input,'request-key')).toEqual(job);expect(mocks.lookup).not.toHaveBeenCalled();expect(mocks.schedule).toHaveBeenCalledWith(job);});
  it.each(['owner','material'])('rejects a conflicting accepted %s identity',async kind=>{mocks.existing.mockResolvedValue(kind==='owner'?{...job,user_id:'other'}:job);if(kind==='material')mocks.source.mockResolvedValue({metadata:{canvasCourseId:'course',canvasItemIds:['file:other']}});await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({status:409,code:'conflict'});});
  it('rejects a concurrent different-material receipt even with identical text',async()=>{mocks.source.mockResolvedValue({metadata:{canvasCourseId:'course',canvasItemIds:['file:other']}});await expect(startReviewerGeneration(client,'owner',input,'request-key')).rejects.toMatchObject({status:409,code:'conflict'});});
});
