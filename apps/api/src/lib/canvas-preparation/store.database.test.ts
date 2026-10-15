import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const owner='11111111-1111-4111-8111-111111111111';
const foreign='11111111-1111-4111-8111-111111111112';
const course='22222222-2222-4222-8222-222222222222';
const connection='33333333-3333-4333-8333-333333333333';
const file='44444444-4444-4444-8444-444444444444';
const token='55555555-5555-4555-8555-555555555555';
const revision='a'.repeat(64);
const evidence=[{type:'file',id:file,revision}];
const payload={version:1,components:[{...evidence[0],text:'Synthetic source.',extraction:{fileKind:'text',text:'Synthetic source.'},originalSha256:'b'.repeat(64),originalByteSize:10,blocks:[{id:'block-1',kind:'paragraph',order:0,text:'Synthetic source.'}]}]};
type Job={id:string;dispatch_id:string;state:string;cycle_attempts:number;lifetime_attempts:number;result_id:string|null};
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''test.owner'',true),'''')::uuid';
    grant usage on schema public,auth to authenticated,service_role;
    create table canvas_connections(id uuid primary key,user_id uuid,status text);
    create table canvas_courses(id uuid primary key,user_id uuid,canvas_connection_id uuid);
    create table canvas_course_sync_preferences(course_id uuid,user_id uuid,selected boolean);
    create table canvas_sync_jobs(id uuid primary key,user_id uuid,course_id uuid,status text,job_type text);
    create table canvas_files(id uuid primary key,user_id uuid,course_id uuid,availability_status text,
      content_version_fingerprint text,ingestion_status text,current_sha256 text);
    create table canvas_pages(id uuid primary key,user_id uuid,course_id uuid,availability_status text,body_html text);
    grant select on canvas_connections,canvas_courses,canvas_course_sync_preferences,canvas_files,canvas_pages to service_role;
    grant update on canvas_files,canvas_pages to service_role;
    insert into auth.users values('${owner}'),('${foreign}');
    insert into canvas_connections values('${connection}','${owner}','active');
    insert into canvas_courses values('${course}','${owner}','${connection}');
    insert into canvas_course_sync_preferences values('${course}','${owner}',true);
    insert into canvas_files values('${file}','${owner}','${course}','available','${revision}','stored','${'b'.repeat(64)}');`);
  await db.exec(readFileSync(resolve(__dirname,'../../../../../packages/db/migrations/20261014000000_canvas_material_preparation.sql'),'utf8'));
  await db.exec(readFileSync(resolve(__dirname,'../../../../../packages/db/migrations/20261014000100_canvas_preparation_orchestration.sql'),'utf8'));
},20_000);
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec(`reset role; truncate canvas_material_preparation_controls cascade;
    update canvas_files set content_version_fingerprint='${revision}',ingestion_status='stored';`);
});
async function admit(cycle='sync-one',manual=false,user=owner):Promise<Job|undefined>{
  return (await db.query<Job>('select * from admit_canvas_material_preparation_v1($1,$2,$3,$4,$5,$6::jsonb,$7,$8)',
    [user,course,`file:${file}`,'file',revision,JSON.stringify(evidence),cycle,manual])).rows[0];
}
async function claim(job:Job,lease=token){
  return (await db.query<Job>('select * from claim_canvas_material_preparation_v1($1,$2,$3,$4)',[job.id,job.dispatch_id,'google-preparation:test',lease])).rows[0];
}
async function finish(job:Job,body:unknown=payload,reason:string|null=null,retry=false,delaySeconds=0){
  return (await db.query<{ok:boolean}>('select finish_canvas_material_preparation_v1($1,$2,$3::jsonb,$4,$5,$6) as ok',[job.id,token,body===null?null:JSON.stringify(body),reason,retry,delaySeconds])).rows[0]!.ok;
}
describe('exact revision preparation store',()=>{
  it('idempotently admits one owned revision and claims it once',async()=>{
    const [first,second]=await Promise.all([admit(),admit()]);
    expect(first!.id).toBe(second!.id);
    expect((await claim(first!))?.cycle_attempts).toBe(1);
    expect(await claim(first!)).toBeUndefined();
    expect(await admit('redelivery')).toMatchObject({id:first!.id,state:'running',lifetime_attempts:1});
  });
  it('persists the result before publishing prepared and never overwrites it',async()=>{
    const job=(await admit())!;await claim(job);
    expect(await finish(job)).toBe(true);
    expect(await admit()).toMatchObject({id:job.id,state:'prepared',result_id:expect.any(String)});
    expect((await db.query('select * from canvas_material_preparation_results')).rows).toHaveLength(1);
    expect(await finish(job)).toBe(false);
  });
  it('allows one cycle retry, stops at three across syncs and permits explicit Retry',async()=>{
    let job=(await admit())!; await claim(job);expect(await finish(job,null,'preparation_failed',true)).toBe(true);
    job=(await admit())!;expect(job.state).toBe('pending');await claim(job);await finish(job,null,'preparation_failed',true);
    expect(await admit()).toMatchObject({state:'failed',cycle_attempts:2,lifetime_attempts:2});
    job=(await admit('sync-two'))!;await claim(job);await finish(job,null,'preparation_failed',true);
    expect(await admit('sync-three')).toMatchObject({state:'failed',lifetime_attempts:3});
    job=(await admit('manual-retry',true))!;expect(job.state).toBe('pending');
    expect(await claim(job)).toMatchObject({lifetime_attempts:4,cycle_attempts:1});
  });
  it('defers the retry for the complete provider cooldown and denies an early claim',async()=>{
    let job=(await admit())!;await claim(job);await finish(job,null,'preparation_download_failed',true,172800);
    job=(await admit())!;
    expect(await claim(job)).toBeUndefined();
    const waiting=(await db.query<{seconds:number}>('select extract(epoch from available_at-now())::integer as seconds from canvas_material_preparations where id=$1',[job.id])).rows[0]!;
    expect(waiting.seconds).toBeGreaterThan(172790);
    expect(job).toMatchObject({state:'pending',cycle_attempts:1,lifetime_attempts:1});
  });
  it.each(['revision','cancelled','expired','wrong lease'])('publishes nothing after %s fencing loss',async kind=>{
    const job=(await admit())!;await claim(job);
    if(kind==='revision')await db.exec(`update canvas_files set content_version_fingerprint='${'c'.repeat(64)}',ingestion_status='not_requested'`);
    if(kind==='cancelled')await db.exec(`update canvas_material_preparations set state='cancelled'`);
    if(kind==='expired')await db.exec(`update canvas_material_preparations set lease_expires_at=now()-interval '1 second'`);
    if(kind==='wrong lease')await db.exec(`update canvas_material_preparations set lease_token=gen_random_uuid()`);
    expect(await finish(job)).toBe(false);
    expect((await db.query('select * from canvas_material_preparation_results')).rows).toHaveLength(0);
  });
  it('rejects historical bytes whose ingestion binding was invalidated',async()=>{
    const job=(await admit())!;await claim(job);
    await db.exec(`update canvas_files set ingestion_status='not_requested'`);
    expect(await finish(job)).toBe(false);
  });
  it('denies foreign admission, owner mutation, private evidence and foreign reads',async()=>{
    const job=(await admit())!;expect(await admit('foreign',false,foreign)).toBeUndefined();
    await db.exec(`set role authenticated; select set_config('test.owner','${owner}',false)`);
    expect((await db.query('select id from canvas_material_preparations')).rows).toEqual([{id:job.id}]);
    await expect(db.exec('select lease_token from canvas_material_preparations')).rejects.toThrow(/permission denied/);
    await expect(db.exec('select dispatch_id from canvas_material_preparations')).rejects.toThrow(/permission denied/);
    await expect(db.exec('select * from canvas_material_preparation_results')).rejects.toThrow(/permission denied/);
    await expect(db.exec(`update canvas_material_preparations set state='prepared'`)).rejects.toThrow(/permission denied/);
    await expect(admit()).rejects.toThrow(/permission denied/);
    await db.exec(`select set_config('test.owner','${foreign}',false)`);
    expect((await db.query('select id from canvas_material_preparations')).rows).toEqual([]);
  });
  it('executes with the explicit service grants',async()=>{
    await db.exec('set role service_role');expect(await admit()).toMatchObject({state:'pending'});
  });
  it('student Retry reconnects ready work without resetting its accounting',async()=>{
    const job=(await admit())!;await claim(job);await finish(job);
    expect(await admit('manual-ready',true)).toMatchObject({id:job.id,state:'prepared',lifetime_attempts:1});
    expect((await db.query('select automatic_attempts from canvas_material_preparation_controls')).rows).toEqual([{automatic_attempts:1}]);
  });
  it('student Retry on suppressed failed work resets once under double submission',async()=>{
    const job=(await admit())!;await claim(job);await finish(job,null,'preparation_failed');
    await db.exec('update canvas_material_preparation_controls set suppressed=true,automatic_attempts=3');
    const [first,second]=await Promise.all([admit('retry-one',true),admit('retry-two',true)]);
    expect(first).toMatchObject({id:job.id,state:'pending',lifetime_attempts:1});
    expect(second).toMatchObject({id:job.id,dispatch_id:first!.dispatch_id,state:'pending',lifetime_attempts:1});
    expect((await db.query('select suppressed,automatic_attempts from canvas_material_preparation_controls')).rows).toEqual([{suppressed:false,automatic_attempts:0}]);
    await claim(first!);
    await admit('retry-redelivery',true);
    expect((await db.query('select automatic_attempts from canvas_material_preparation_controls')).rows).toEqual([{automatic_attempts:1}]);
  });
});
