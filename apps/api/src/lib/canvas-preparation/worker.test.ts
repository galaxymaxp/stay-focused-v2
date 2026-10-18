import { beforeEach,describe,expect,it,vi } from 'vitest';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
import { parsePreparationReference } from './contracts';
import { buildCanvasPdfPageBlocks } from '@/lib/processing-jobs/deferred-canvas-reviewer';
const mocks=vi.hoisted(()=>({read:vi.fn(),dispatch:vi.fn()}));
vi.mock('./repository',async load=>({...await load<typeof import('./repository')>(),readPreparation:mocks.read}));
vi.mock('./dispatch',()=>({dispatchPreparation:mocks.dispatch}));
import { executePreparation } from './worker';

const reference={jobId:'11111111-1111-4111-8111-111111111111',dispatchId:'22222222-2222-4222-8222-222222222222'};
const lease='33333333-3333-4333-8333-333333333333';
const job={id:reference.jobId,user_id:'owner',course_id:'course',state:'running',dispatch_id:reference.dispatchId} as CanvasMaterialPreparationRow;
beforeEach(()=>vi.resetAllMocks());
describe('durable Canvas preparation worker',()=>{
  it('awaits persisted result completion before acknowledgement and wakeup',async()=>{
    const rpc=vi.fn().mockResolvedValueOnce({data:[job],error:null}).mockResolvedValueOnce({data:true,error:null});
    mocks.read.mockResolvedValue({...job,state:'prepared'});
    const loadToken=vi.fn(async()=> 'synthetic-brokered-token');const run=vi.fn(async()=>({version:1 as const,components:[]}));const reconcile=vi.fn(async()=>{});
    expect(await executePreparation(reference,{client:{rpc} as never,leaseToken:lease,workerId:'worker',loadToken,run,reconcile})).toBe('ack');
    expect(rpc).toHaveBeenLastCalledWith('finish_canvas_material_preparation_v1',expect.objectContaining({p_payload:{version:1,components:[]},p_lease_token:lease,p_reason:null}));
    expect(reconcile).toHaveBeenCalledOnce();expect(rpc.mock.invocationCallOrder[1]).toBeLessThan(reconcile.mock.invocationCallOrder[0]!);
  });
  it('reconnects duplicate and terminal deliveries without fetching a token',async()=>{
    const rpc=vi.fn(async()=>({data:[],error:null}));const run=vi.fn();const loadToken=vi.fn();
    mocks.read.mockResolvedValue({...job,state:'running'});
    expect(await executePreparation(reference,{client:{rpc} as never,run,loadToken})).toBe('retry');
    mocks.read.mockResolvedValue({...job,state:'prepared'});
    expect(await executePreparation(reference,{client:{rpc} as never,run,loadToken,reconcile:async()=>{}})).toBe('ack');
    expect(run).not.toHaveBeenCalled();expect(loadToken).not.toHaveBeenCalled();
  });
  it('defers the one admitted retry using a new persisted dispatch identity',async()=>{
    const rpc=vi.fn().mockResolvedValueOnce({data:[job],error:null}).mockResolvedValueOnce({data:true,error:null});
    mocks.read.mockResolvedValue({...job,state:'pending',dispatch_id:lease});
    const run=vi.fn(async()=>{throw new Error('private provider content');});
    expect(await executePreparation(reference,{client:{rpc} as never,run,loadToken:async()=> 'synthetic-token',reconcile:async()=>{}})).toBe('ack');
    expect(mocks.dispatch).toHaveBeenCalledOnce();
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('private provider');
    expect(rpc).toHaveBeenLastCalledWith('finish_canvas_material_preparation_v1',expect.objectContaining({p_reason:'preparation_failed',p_retryable:true}));
  });
  it('keeps complete blank-page evidence while building only the existing page-N text blocks',()=>{
    const pages=[{pageNumber:1,status:'text_extracted' as const,text:'Source text',method:'native_text' as const,blocks:[]},
      {pageNumber:2,status:'blank' as const,text:'',method:'native_text' as const,blocks:[]}];
    expect(buildCanvasPdfPageBlocks(pages,2)).toEqual([{id:'page-1',kind:'paragraph',order:0,pageNumber:1,text:'Source text'}]);
    for(const invalid of [[pages[0]!],[pages[0]!,pages[0]!],[{...pages[0]!,pageNumber:3},pages[1]!]])expect(()=>buildCanvasPdfPageBlocks(invalid,2)).toThrow('preparation_pages_incomplete');
  });
  it('accepts only opaque job/dispatch references',()=>{
    expect(parsePreparationReference(reference)).toEqual(reference);
    expect(parsePreparationReference({...reference,accessToken:'secret'})).toBeNull();
  });
  it.each([false,true])('runs the description after prepared on redelivery=%s, isolating failures from ack',async redelivery=>{
    const rpc=vi.fn().mockResolvedValueOnce({data:redelivery?[]:[job],error:null}).mockResolvedValue({data:true,error:null});
    const prepared={...job,state:'prepared' as const,result_id:'result'};
    mocks.read.mockResolvedValue(prepared);
    const description=vi.fn(async()=>{throw new Error('private provider details');});
    const figures=vi.fn(async()=>{});const reconcile=vi.fn(async()=>{});
    const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
    expect(await executePreparation(reference,{client:{rpc} as never,workerId:'worker',leaseToken:lease,
      loadToken:async()=> 'synthetic-token',run:async()=>({version:1,components:[]}),figures,description,reconcile})).toBe('ack');
    expect(description).toHaveBeenCalledExactlyOnceWith(expect.anything(),prepared);
    expect(mocks.read.mock.invocationCallOrder[0]).toBeLessThan(description.mock.invocationCallOrder[0]!);
    expect(description.mock.invocationCallOrder[0]).toBeLessThan(reconcile.mock.invocationCallOrder[0]!);
    expect(warn).toHaveBeenCalledWith('material_description',{code:'post_commit_failed'});
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private provider');
  });
});
