import {beforeEach,describe,expect,it,vi} from 'vitest';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {createHash} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
import {safeObjectKeyForCanvasFile} from '@/lib/canvas-file-policy';
const mocks=vi.hoisted(()=>({ingest:vi.fn()}));
vi.mock('@/lib/canvas-file-ingestion',()=>({ingestCanvasFiles:mocks.ingest}));
import {executePreparation,prepareMaterialStep} from './worker';
beforeEach(()=>{mocks.ingest.mockClear();});
describe('full material preparation step',()=>{
  it.each([2,null])('keeps PPTX text/ordered page blocks prepared with conversion result %s',async conversionResult=>{
    const bytes=zipSync({
      'ppt/presentation.xml':strToU8('<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId r:id="last"/><p:sldId r:id="first"/></p:sldIdLst></p:presentation>'),
      'ppt/_rels/presentation.xml.rels':strToU8('<Relationships><Relationship Id="first" Target="slides/slide1.xml"/><Relationship Id="last" Target="slides/slide7.xml"/></Relationships>'),
      'ppt/slides/slide1.xml':strToU8('<p:sld xmlns:p="p" xmlns:a="a"><p:sp><p:txBody><a:p><a:r><a:t>Second presentation slide evidence</a:t></a:r></a:p></p:txBody></p:sp></p:sld>'),
      'ppt/slides/slide7.xml':strToU8('<p:sld xmlns:p="p" xmlns:a="a"><p:sp><p:txBody><a:p><a:r><a:t>First presentation slide evidence</a:t></a:r></a:p></p:txBody></p:sp></p:sld>'),
    });
    const hash=createHash('sha256').update(bytes).digest('hex');
    const file={id:'11111111-1111-4111-8111-111111111111',user_id:'owner',course_id:'course',canvas_connection_id:'connection',canvas_course_id:'101',canvas_file_id:'42',
      display_name:'Lesson.pptx',filename:'Lesson.pptx',content_type:'application/vnd.openxmlformats-officedocument.presentationml.presentation',stored_content_type:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      stored_byte_count:bytes.length,size_bytes:bytes.length,current_sha256:hash,storage_bucket:'canvas-source-files',
      storage_object_key:safeObjectKeyForCanvasFile({userId:'owner',fileId:'11111111-1111-4111-8111-111111111111',contentHash:hash}),
      content_version_fingerprint:'a'.repeat(64),availability_status:'available',ingestion_status:'stored',ingestion_eligibility:'eligible_document'};
    const evidence=[{type:'file',id:file.id,revision:file.content_version_fingerprint}];
    const client={rpc:vi.fn(async()=>({data:true,error:null})),storage:{from:()=>({download:async()=>({data:new Blob([bytes]),error:null})})},from:(table:string)=>{
      const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==='canvas_files'?file:{evidence},error:null})};return query;
    }};
    mocks.ingest.mockResolvedValue({ok:true,response:{results:[{status:'stored'}]}});
    const officePdf=vi.fn(async()=>conversionResult);
    const result=await prepareMaterialStep(client as never,{id:'job',user_id:'owner',course_id:'course',canvas_connection_id:'connection',source_type:'file'} as never,'brokered-token',{officePdf});
    expect(officePdf).toHaveBeenCalledWith(client,file,2);
    expect(result.components[0]!.blocks.map(block=>[block.pageNumber,block.slideNumber])).toEqual([[1,1],[2,2]]);
    expect(result.components[0]!.blocks[0]!.text).toContain('First presentation slide evidence');
    expect(result.components[0]!.blocks[1]!.text).toContain('Second presentation slide evidence');
    expect(result.components[0]!.originalSha256).toBe(hash);
    expect(result.components[0]!.extraction!.pageCount).toBeUndefined();
  });
  it('persists the full provider cooldown before dispatching the one cycle retry',async()=>{
    const reference={jobId:'11111111-1111-4111-8111-111111111111',dispatchId:'22222222-2222-4222-8222-222222222222'};
    const job={id:reference.jobId,user_id:'owner',course_id:'course',canvas_connection_id:'connection',source_type:'file',state:'running',dispatch_id:reference.dispatchId};
    const evidence=[{type:'file',id:reference.jobId,revision:'a'.repeat(64)}];
    const rpc=vi.fn(async(name:string)=>({data:name==='claim_canvas_material_preparation_v1'?[job]:true,error:null}));
    const client={rpc,from:(table:string)=>{
      const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==='canvas_material_preparation_evidence'?{evidence}:{...job,state:'pending',dispatch_id:'33333333-3333-4333-8333-333333333333'},error:null})};return query;
    }};
    mocks.ingest.mockResolvedValue({ok:true,response:{results:[{status:'failed',retryable:true,retryAfterMs:600_000}]}});
    const dispatch=vi.fn(async()=>job as never);
    expect(await executePreparation(reference,{client:client as never,loadToken:async()=>'synthetic-token',dispatch,reconcile:async()=>{}})).toBe('ack');
    expect(rpc).toHaveBeenCalledWith('finish_canvas_material_preparation_v1',expect.objectContaining({p_retry_after_seconds:600,p_reason:'preparation_download_failed',p_retryable:true,p_payload:null}));
    expect(dispatch).toHaveBeenCalledOnce();expect(mocks.ingest).toHaveBeenCalledOnce();
  });
  it('stores complete native/blank PDF evidence and canonical page blocks without OCR or reviewer generation',async()=>{
    const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const first=pdf.addPage();
    first.drawText('Complete instructional material explains cells, membranes, diffusion, and transport using the supplied lesson.',{x:20,y:700,size:9,font});pdf.addPage();
    const bytes=await pdf.save();const hash=createHash('sha256').update(bytes).digest('hex');
    const file={id:'11111111-1111-4111-8111-111111111111',user_id:'owner',course_id:'course',canvas_connection_id:'connection',canvas_course_id:'101',canvas_file_id:'42',
      display_name:'Lesson.pdf',filename:'Lesson.pdf',content_type:'application/pdf',stored_content_type:'application/pdf',stored_byte_count:bytes.length,size_bytes:bytes.length,
      current_sha256:hash,storage_bucket:'canvas-source-files',storage_object_key:safeObjectKeyForCanvasFile({userId:'owner',fileId:'11111111-1111-4111-8111-111111111111',contentHash:hash}),
      content_version_fingerprint:'a'.repeat(64),availability_status:'available',ingestion_status:'stored',ingestion_eligibility:'eligible_document'};
    const evidence=[{type:'file',id:file.id,revision:file.content_version_fingerprint}];
    const download=vi.fn(async()=>({data:{arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)},error:null}));
    const client={rpc:vi.fn(async()=>({data:true,error:null})),storage:{from:()=>({download})},from:(table:string)=>{
      const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==='canvas_files'?file:{evidence},error:null})};return query;
    }};
    mocks.ingest.mockResolvedValue({ok:true,response:{results:[{status:'stored'}]}});
    const extract=vi.fn(async()=>{throw new Error('Unexpected OCR');});
    const result=await prepareMaterialStep(client as never,{id:'job',user_id:'owner',course_id:'course',canvas_connection_id:'connection',source_type:'file'} as never,'brokered-token',{ocrProvider:{extract} as never});
    expect(result.components[0]).toMatchObject({originalSha256:hash,extraction:{pageCount:2},blocks:[{id:'page-1',pageNumber:1}]});
    expect(result.components[0]!.extraction!.ocrResult!.pages).toHaveLength(2);
    expect(result.components[0]!.extraction!.ocrResult!.pages[1]).toMatchObject({pageNumber:2,status:'blank'});
    expect(extract).not.toHaveBeenCalled();expect(download).toHaveBeenCalledOnce();
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({brokeredCanvasToken:'brokered-token',fileIds:[file.id]}));
  });
});
