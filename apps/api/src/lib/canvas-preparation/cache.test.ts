import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {CanvasFileRow} from '@stay-focused/db';
const mocks=vi.hoisted(()=>({admit:vi.fn(),prepared:vi.fn()}));
vi.mock('./admission',()=>({admitMaterialPreparation:mocks.admit,preparedMaterial:mocks.prepared}));
import {extractCanvasPreparedFileText,loadPreparedPageEvidence} from './cache';
import {sourceDigest} from './repository';
const file={id:'11111111-1111-4111-8111-111111111111',user_id:'owner',course_id:'course',canvas_connection_id:'connection',
  content_version_fingerprint:'a'.repeat(64),availability_status:'available',ingestion_status:'stored',ingestion_eligibility:'eligible_document',
  storage_bucket:'canvas-source-files',storage_object_key:'synthetic-key',current_sha256:'b'.repeat(64),stored_byte_count:10,stored_content_type:'text/plain'} as CanvasFileRow;
const text='Complete cached instructional source text.';
const component={type:'file',id:file.id,revision:file.content_version_fingerprint,text,blocks:[{id:'block-1',kind:'paragraph',order:0,text}],
  originalSha256:file.current_sha256,originalByteSize:10,extraction:{fileKind:'text',text}};
beforeEach(()=>{vi.resetAllMocks();mocks.admit.mockResolvedValue({state:'pending'});});
describe('prepared evidence readers',()=>{
  it('returns the exact persisted extraction with zero Storage or OCR work',async()=>{
    const rpc=vi.fn(async()=>({data:component,error:null}));const storage=vi.fn();
    const result=await extractCanvasPreparedFileText({client:{rpc,storage:{from:storage}} as never,userId:'owner',courseId:'course',connectionId:'connection',fileRow:file});
    expect(result).toEqual({ok:true,value:component.extraction});expect(storage).not.toHaveBeenCalled();expect(mocks.admit).not.toHaveBeenCalled();
  });
  it.each(['missing','revision','hash','invalidated'])('waits and admits preparation for %s evidence without extraction fallback',async kind=>{
    const value=kind==='missing'?null:{...component,...(kind==='revision'?{revision:'c'.repeat(64)}:kind==='hash'?{originalSha256:'c'.repeat(64)}:{})};
    const rpc=vi.fn(async()=>({data:value,error:null}));const storage=vi.fn();
    expect(await extractCanvasPreparedFileText({client:{rpc,storage:{from:storage}} as never,userId:'owner',courseId:'course',connectionId:'connection',fileRow:kind==='invalidated'?{...file,ingestion_status:'not_requested'}:file})).toMatchObject({ok:false,status:409,code:'canvas_source_file_preparation_required'});
    expect(mocks.admit).toHaveBeenCalledOnce();expect(storage).not.toHaveBeenCalled();
  });
  it('denies foreign identity before reading prepared content',async()=>{
    const rpc=vi.fn();expect(await extractCanvasPreparedFileText({client:{rpc} as never,userId:'other',courseId:'course',connectionId:'connection',fileRow:file})).toMatchObject({ok:false,status:404});expect(rpc).not.toHaveBeenCalled();
  });
  it('requires the full Page body digest, including when provider timestamps are unchanged',async()=>{
    const page={id:file.id,user_id:'owner',course_id:'course',body_html:'<p>Revision B</p>'};
    mocks.prepared.mockResolvedValue({components:[{type:'page',id:page.id,revision:sourceDigest('<p>Revision A</p>'),text:'Revision A',blocks:[]}]});
    expect(await loadPreparedPageEvidence({client:{} as never,userId:'owner',courseId:'course',pageRow:page as never})).toBeNull();
    expect(mocks.admit).toHaveBeenCalledOnce();
  });
});
