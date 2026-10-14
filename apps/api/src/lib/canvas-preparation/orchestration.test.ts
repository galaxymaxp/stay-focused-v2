import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasMaterialPreparationRow } from '@stay-focused/db';
const mocks=vi.hoisted(()=>({list:vi.fn(),admit:vi.fn(),dispatch:vi.fn(),automatic:vi.fn()}));
vi.mock('@/lib/canvas-reviewer-sources',()=>({listCanvasReviewerSources:mocks.list}));
vi.mock('./admission',()=>({admitMaterialPreparation:mocks.admit}));
vi.mock('./dispatch',()=>({dispatchPreparation:mocks.dispatch}));
vi.mock('@/lib/auto-reviewers/after-sync',()=>({runAutomaticReviewersAfterSync:mocks.automatic}));
import { enqueuePreparationAfterSync, preparationCompleted, reconcilePreparationCourse } from './orchestration';
type Row=Record<string,unknown>;
function fixture(ledgers:Row[]=[],errors:readonly string[]=[]) {
  const mutations: {table:string;action:string;value:unknown}[]=[];
  const tables:Record<string,Row[]>={canvas_preparation_syncs:ledgers,canvas_preparation_discoveries:[]};
  const rpc=vi.fn(async(name:string)=>({error:null,data:name==='register_canvas_preparation_sync_v1'||name==='drain_canvas_preparation_sync_v1'?'target':[]}));
  const client={rpc,from:(table:string)=>{
    const filters:((row:Row)=>boolean)[]=[];let start=0,end=Infinity;
    const result=()=>({data:(tables[table]??[]).filter(row=>filters.every(test=>test(row))).slice(start,end+1),error:errors.includes(table)?{code:'synthetic_failure'}:null});
    const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.push(row=>row[key]===value);return query;},
      in:(key:string,values:unknown[])=>{filters.push(row=>values.includes(row[key]));return query;},lte:()=>query,order:()=>query,
      range:(from:number,to:number)=>{start=from;end=to;return query;},
      upsert:(value:unknown)=>{mutations.push({table,action:'upsert',value});return query;},
      delete:()=>{mutations.push({table,action:'delete',value:null});return query;},
      update:(value:unknown)=>{mutations.push({table,action:'update',value});return query;},
      maybeSingle:async()=>({...result(),data:result().data[0]??null}),
      then:<TResult>(resolve:(value:ReturnType<typeof result>)=>TResult)=>Promise.resolve(result()).then(resolve)};
    return query;
  }};
  return {client:client as never,rpc,mutations};
}
const identity={userId:'owner',courseId:'course',syncId:'sync'};
const job={id:'job',user_id:'owner',course_id:'course',state:'pending'} as CanvasMaterialPreparationRow;
beforeEach(()=>{
  vi.resetAllMocks();mocks.list.mockResolvedValue({ok:true,value:{sources:[],pagination:{hasMore:false}}});
  mocks.admit.mockResolvedValue(job);mocks.dispatch.mockResolvedValue(job);mocks.automatic.mockResolvedValue(undefined);
});
describe('durable preparation orchestration',()=>{
  it('admits complete eligible inventory independently of the automatic reviewer baseline or switch',async()=>{
    mocks.list.mockResolvedValue({ok:true,value:{sources:[{id:'file:lesson',type:'file',file:{kind:'pdf',canPrepare:true,preparationStatus:'not_prepared'}},
      {id:'page:lesson',type:'page'}, {id:'assignment:work',type:'assignment'}, {id:'announcement:news',type:'announcement'},
      {id:'file:unsupported',type:'file',file:{kind:'unsupported',canPrepare:false}}],pagination:{hasMore:false}}});
    const {client,rpc,mutations}=fixture();await enqueuePreparationAfterSync(client,identity);
    expect(mocks.admit.mock.calls.map(call=>call[1].materialId)).toEqual(['file:lesson','page:lesson']);
    expect(mutations[0]).toMatchObject({table:'canvas_preparation_discoveries',action:'upsert'});
    expect(rpc).toHaveBeenCalledWith('register_canvas_preparation_sync_v1',expect.objectContaining({p_job_ids:['job','job'],p_sync_id:'sync'}));
    expect(mutations).toContainEqual({table:'canvas_preparation_syncs',action:'update',value:{inventory_complete:true}});
    expect(mocks.automatic).not.toHaveBeenCalled();
  });
  it('fails closed on incomplete discovery before recording the admission set',async()=>{
    mocks.list.mockResolvedValue({ok:false});const {client,rpc,mutations}=fixture();
    await enqueuePreparationAfterSync(client,identity);
    expect(rpc).not.toHaveBeenCalled();expect(mutations).toEqual([]);expect(mocks.admit).not.toHaveBeenCalled();
  });
  it('drains the persisted overflow in the next poll without any new module IDs',async()=>{
    const {client,rpc}=fixture([{id:'previous',user_id:'owner',course_id:'course',guard_state:'deferred',inventory_complete:true}]);
    await reconcilePreparationCourse(client,{userId:'owner',courseId:'course',drainDeferred:true,now:300_000});
    expect(rpc).toHaveBeenCalledWith('drain_canvas_preparation_sync_v1',{p_sync_id:'previous',p_cycle_key:'poll:1'});
    expect(rpc).toHaveBeenCalledWith('advance_canvas_preparation_sync_v1',{p_sync_id:'target'});
    expect(mocks.list).not.toHaveBeenCalled();expect(mocks.automatic).toHaveBeenCalledOnce();
  });
  it('recovers a committed sync wakeup after interruption before discovery',async()=>{
    const {client}=fixture([{id:'wake',user_id:'owner',course_id:'course',guard_state:'running',sync_id:'sync',inventory_complete:false}]);
    await reconcilePreparationCourse(client,{userId:'owner',courseId:'course',drainDeferred:true});
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({completeInventory:true,courseId:'course'}));
  });
  it('wakes pending automatic candidates only when preparation publishes prepared',async()=>{
    const {client}=fixture();await preparationCompleted(client,{...job,state:'failed'});expect(mocks.automatic).not.toHaveBeenCalled();
    await preparationCompleted(client,{...job,state:'prepared'});
    expect(mocks.automatic).toHaveBeenCalledExactlyOnceWith(client,{userId:'owner',courseId:'course'});
  });
  it('does not drain or wake candidates after an incomplete ledger read',async()=>{
    const {client,rpc}=fixture([],['canvas_preparation_syncs']);
    await expect(reconcilePreparationCourse(client,{userId:'owner',courseId:'course',drainDeferred:true})).rejects.toThrow('preparation_guard_unavailable');
    expect(rpc).not.toHaveBeenCalled();expect(mocks.automatic).not.toHaveBeenCalled();
  });
});
