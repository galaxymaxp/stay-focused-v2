import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasMaterialPreparationRow, Database, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ prepared: vi.fn() }));
vi.mock('../canvas-preparation/repository', async load => ({ ...await load<typeof import('../canvas-preparation/repository')>(), readPreparedResult: mocks.prepared }));
import { digest, encodeRgbaPng, type ExtractedFigure } from './extract';
import { extractLocalPreparedFigures, extractPreparedFigures, storeFigures, type FigureSource } from './store';
import { executePreparation } from '../canvas-preparation/worker';
import { completeProcessingJob } from '../processing-jobs/worker-repository';

const owner='11111111-1111-4111-8111-111111111111';
const bytes=encodeRgbaPng(new Uint8Array(256*160*4),256,160);
const hash=digest(bytes);
const figure:ExtractedFigure={bytes,mime:'image/png',width:256,height:160,sha256:hash,pageNumber:2,position:0};
const source:FigureSource={userId:owner,sourceKind:'canvas_file',sourceRowId:owner,originalSha256:hash,revision:'a'.repeat(64)};
const job={id:owner,user_id:owner,state:'prepared',result_id:owner,dispatch_id:owner} as CanvasMaterialPreparationRow;
function harness() {
  const receipts=new Set<string>(); const rows: Record<string,unknown>[]=[];
  let unavailable=false; let deleted=false;
  const upload=vi.fn(async()=>({error:null}));const download=vi.fn(async()=>({data:new Blob([Uint8Array.from(bytes)]),error:null}));
  const from=vi.fn((table:string)=>{
    const filters=new Map<string,unknown>();
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.set(key,value);return query;},
      maybeSingle:async()=>({error:null,data:table==='source_figure_extractions'
        ? receipts.has(String(filters.get('revision_fingerprint')))?{figure_count:1}:null
        : table==='source_figures'?rows.find(r=>[...filters].every(([k,v])=>r[k]===v))??null
        : table==='processing_job_sources'?{document_asset_id:owner,source_kind:'pdf'}
        : table==='document_assets'?{id:owner,user_id:owner,deleted_at:deleted?'now':null,upload_status:'available',mime_type:'application/pdf',
          storage_bucket:'processing-job-sources',storage_object_path:`${owner}/original.pdf`,content_sha256:hash,byte_size:bytes.length}:null}),
      upsert:vi.fn(async(value:Record<string,unknown>)=>{
        if(unavailable)return {error:{message:'private provider content'}};
        if(table==='source_figure_extractions') receipts.add(String(value.revision_fingerprint)); else rows.push(value);
        return {error:null};
      })}; return query;
  });
  const client={from,storage:{from:()=>({upload,download})}} as unknown as SupabaseClient<Database>;
  return {client,rows,receipts,upload,download,fail:()=>{unavailable=true;},delete:()=>{deleted=true;}};
}
beforeEach(()=>{
  vi.clearAllMocks();mocks.prepared.mockResolvedValue({version:1,components:[{type:'file',id:owner,revision:source.revision,text:'Accepted',
    blocks:[{id:'page-2',order:0,kind:'paragraph',text:'Accepted',pageNumber:2}],extraction:{fileKind:'pdf',text:'Accepted'},originalSha256:hash,originalByteSize:bytes.length}]});
});
afterEach(()=>vi.useRealTimers());
describe('post-commit source figure extraction and immutable storage',()=>{
  it('stores once and reuses an unchanged revision, including empty receipts',async()=>{
    const h=harness();const extract=vi.fn(async()=>[figure]);
    await extractPreparedFigures(h.client,job,{extract});await extractPreparedFigures(h.client,job,{extract});
    expect(extract).toHaveBeenCalledOnce();expect(h.upload).toHaveBeenCalledOnce();expect(h.rows).toHaveLength(1);
    const empty=harness();const noFigures=vi.fn(async()=>[]);
    await extractPreparedFigures(empty.client,job,{extract:noFigures});await extractPreparedFigures(empty.client,job,{extract:noFigures});
    expect(noFigures).toHaveBeenCalledOnce();expect(empty.upload).not.toHaveBeenCalled();
  });
  it('re-extracts a changed revision and retains the historical original rows',async()=>{
    const h=harness();const extract=vi.fn(async()=>[figure]);await extractPreparedFigures(h.client,job,{extract});
    const changed=Uint8Array.from(bytes);changed[changed.length-1]^=1;
    h.download.mockResolvedValue({data:new Blob([changed]),error:null});
    const old=mocks.prepared.mock.results[0]!.value as Promise<{version:1;components:Record<string,unknown>[]} >;
    const prepared=await old;
    mocks.prepared.mockResolvedValue({version:1,components:[{...prepared.components[0],revision:'b'.repeat(64),originalSha256:digest(changed)}]});
    await extractPreparedFigures(h.client,job,{extract});
    expect(extract).toHaveBeenCalledTimes(2);expect(h.rows).toHaveLength(2);
    expect(h.rows.map(r=>r.original_sha256)).toEqual([hash,digest(changed)]);
  });
  it('never extracts failed/cancelled jobs or changed bytes and logs no provider content',async()=>{
    const h=harness();const extract=vi.fn(async()=>[figure]);const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    for(const state of ['failed','cancelled'] as const)await extractPreparedFigures(h.client,{...job,state},{extract});
    h.download.mockResolvedValue({data:new Blob([new Uint8Array(bytes.length)]),error:null});
    await extractPreparedFigures(h.client,job,{extract});expect(extract).not.toHaveBeenCalled();expect(h.upload).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('source_figures.extraction',{code:'extraction_failed',failureCount:1});log.mockRestore();
  });
  it('does not receipt failed writes and leaves preparation successful',async()=>{
    const h=harness();h.fail();const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    await expect(extractPreparedFigures(h.client,job,{extract:async()=>[figure]})).resolves.toBeUndefined();
    expect(h.receipts.size).toBe(0);expect(job.state).toBe('prepared');expect(JSON.stringify(log.mock.calls)).not.toContain('private provider');log.mockRestore();
  });
  it('deduplicates figure writes without modifying published rows',async()=>{
    const h=harness();await storeFigures(h.client,source,[figure]);await storeFigures(h.client,source,[figure]);
    expect(h.upload).toHaveBeenCalledOnce();expect(h.rows).toHaveLength(1);
  });
  it('bounds a stalled upload and never publishes rows or a success receipt after timeout',async()=>{
    vi.useFakeTimers();const h=harness();h.upload.mockImplementation(()=>new Promise(()=>{}));
    const result=expect(storeFigures(h.client,source,[figure])).rejects.toThrow('figure_timeout');
    await vi.advanceTimersByTimeAsync(5000);await result;
    expect(h.rows).toEqual([]);expect(h.receipts.size).toBe(0);
  });
  it('covers local uploaded PDFs after success and denies deleted assets',async()=>{
    const h=harness();const local={user_id:owner,source_snapshot_id:owner,job_type:'document_extraction',status:'succeeded'} as ProcessingJobDatabaseRow;
    const extract=vi.fn(async()=>[figure]);await extractLocalPreparedFigures(h.client,local,{extract});
    expect(h.rows[0]).toMatchObject({source_kind:'local_pdf',original_sha256:hash});
    h.delete();await extractLocalPreparedFigures(h.client,local,{extract});expect(extract).toHaveBeenCalledOnce();
    await extractLocalPreparedFigures(h.client,{...local,status:'cancelled'},{extract});expect(extract).toHaveBeenCalledOnce();
  });
  it('runs Canvas figures after the durable finish and isolates failure before reconciliation',async()=>{
    const events:string[]=[];const running={...job,state:'running' as const};
    const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:job,error:null})};
    const rpc=vi.fn().mockImplementationOnce(async()=>({data:[running],error:null})).mockImplementationOnce(async()=>{events.push('commit');return {data:true,error:null};});
    const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    expect(await executePreparation({jobId:owner,dispatchId:owner},{client:{rpc,from:()=>query} as never,
      run:async()=>({version:1,components:[]}),loadToken:async()=> 'synthetic',
      figures:async()=>{events.push('figures');throw new Error('private');},reconcile:async()=>{events.push('reconcile');}})).toBe('ack');
    expect(events).toEqual(['commit','figures','reconcile']);log.mockRestore();
  });
  it('runs the shared local completion hook only for a committed successful extraction',async()=>{
    const rpc=vi.fn(async()=>({data:[{job_type:'document_extraction',status:'succeeded'}],error:null}));const figures=vi.fn(async()=>{throw new Error('private');});
    const log=vi.spyOn(console,'warn').mockImplementation(()=>{});
    const input={jobId:owner,workerId:'worker',resultType:'document_extraction' as const,payload:{},metrics:{}};
    expect((await completeProcessingJob({rpc} as never,input,{figures})).status).toBe('succeeded');
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(figures.mock.invocationCallOrder[0]!);
    rpc.mockResolvedValue({data:[{job_type:'document_extraction',status:'cancelled'}],error:null});
    await completeProcessingJob({rpc} as never,input,{figures});expect(figures).toHaveBeenCalledOnce();log.mockRestore();
  });
});
