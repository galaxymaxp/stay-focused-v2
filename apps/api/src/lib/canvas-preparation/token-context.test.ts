import {describe,expect,it} from 'vitest';
import {preparationTokenContext} from './repository';
type Row=Record<string,unknown>;
function fixture(patch:Row={},foreignConnection=false){
  const job:Row={id:'job',user_id:'owner',course_id:'course',canvas_connection_id:'connection',state:'running',dispatch_id:'dispatch',worker_id:'worker',lease_token:'lease',lease_expires_at:new Date(Date.now()+90_000).toISOString(),deadline_at:new Date(Date.now()+1_500_000).toISOString(),...patch};
  const tables:Record<string,Row[]>={canvas_material_preparations:[job],canvas_connections:[{id:'connection',user_id:foreignConnection?'other':'owner',status:'active'}],canvas_courses:[{id:'course',user_id:'owner',canvas_connection_id:'connection'}],canvas_course_sync_preferences:[{id:'preference',user_id:'owner',course_id:'course',selected:true}]};
  return {from:(table:string)=>{const filters:((row:Row)=>boolean)[]=[];const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.push(row=>row[key]===value);return query;},maybeSingle:async()=>({data:tables[table]?.find(row=>filters.every(filter=>filter(row)))??null,error:null})};return query;}};
}
const input={jobId:'job',dispatchId:'dispatch',workerId:'worker',leaseToken:'lease'};
describe('preparation token lease scope',()=>{
  it('accepts only the live claimed owned job and connection',async()=>{expect(await preparationTokenContext(fixture() as never,input)).toMatchObject({job:{user_id:'owner'},connection:{id:'connection'}});});
  it.each([{lease_token:'other'},{worker_id:'other'},{dispatch_id:'other'},{state:'pending'},{lease_expires_at:new Date(0).toISOString()},{deadline_at:'invalid'},{user_id:'other'}])('denies mismatched or expired claim %j',async patch=>{expect(await preparationTokenContext(fixture(patch) as never,input)).toBeNull();});
  it('denies a foreign connection and a different job ID',async()=>{
    expect(await preparationTokenContext(fixture({},true) as never,input)).toBeNull();
    expect(await preparationTokenContext(fixture() as never,{...input,jobId:'other-job'})).toBeNull();
  });
});
