import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
let db:PGlite;
const owner='11111111-1111-4111-8111-111111111111';const other='22222222-2222-4222-8222-222222222222';
const version='33333333-3333-4333-8333-333333333333';
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role bypassrls;
    create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table generated_artifacts(id uuid primary key,user_id uuid,latest_version_id uuid,artifact_type text,deleted_at timestamptz,unique(id,user_id));
    create table generated_artifact_versions(id uuid primary key,user_id uuid,artifact_id uuid,payload jsonb,unique(id,user_id));
    grant select on generated_artifacts,generated_artifact_versions to service_role;
    insert into auth.users values('${owner}'),('${other}');
    insert into generated_artifacts values('${owner}','${owner}','${version}','reviewer',null);
    insert into generated_artifact_versions values('${version}','${owner}','${owner}','{"reviewer":{"sections":[{"id":"s"},{"id":"none"}]}}');`);
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261014000700_section_external_visuals.sql'),'utf8'));
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261015020000_external_visuals_auto.sql'),'utf8'));
},30000);
afterAll(async()=>db?.close());
async function role(roleName:string,user:string,sql:string){await db.exec('begin');try{await db.exec(`set local role ${roleName};set local request.jwt.claim.sub='${user}';`);return await db.query(sql);}finally{await db.exec('rollback');}}
const reserve=(section='s',another=false,user=owner)=>`select reserve_section_external_visual_v1('${user}','${owner}','${version}','${section}',${another}) as token`;
const result={status:'found',source_url:'https://commons.wikimedia.org/wiki/File:Cell.png',image_url:'https://upload.wikimedia.org/image.png',title:'Cell',credit:'Ada',license:'CC BY',license_url:'https://creativecommons.org/licenses/by/4.0/',width:1200,height:800,query:'Cell',verdict:'Depicts the cell.',excluded_titles:['File:Cell.png']};
async function token(section='s',another=false){return (await db.query<{token:string}>(reserve(section,another))).rows[0]!.token;}
async function finish(t:string,value:unknown=result){return (await db.query<{done:boolean}>(`select finish_section_external_visual_v1('${t}',$1::jsonb) as done`,[value===null?null:JSON.stringify(value)])).rows[0]!.done;}
describe('owner-private external visual migration contracts',()=>{
  it('reserves atomically, prevents overlapping calls, caches twice then stops',async()=>{
    await db.exec('begin');try{
      await token();await expect(token()).rejects.toThrow('external_visual_busy');
      // The failed statement above aborts a transaction in PostgreSQL; use savepoints.
    }finally{await db.exec('rollback');}
    const first=await token();expect(await finish(first)).toBe(true);expect(await token()).toBeNull();
    const second=await token('s',true);expect(await finish(second,{status:'none',query:'Cell',verdict:'No match.',excluded_titles:['File:Cell.png','File:Other.png']})).toBe(true);
    expect(await token('s',true)).toBeNull();expect((await db.query('select attempt_count from section_external_visuals')).rows[0]).toEqual({attempt_count:2});
    expect(await finish(second)).toBe(false);
  });
  it('allows owner safe reads but hides query/verdict/exclusion and denies other owners',async()=>{
    expect((await role('authenticated',owner,'select status,attempt_count from section_external_visuals')).rows).toHaveLength(1);
    expect((await role('authenticated',other,'select status from section_external_visuals')).rows).toHaveLength(0);
    for(const column of ['query','verdict','excluded_titles'])await expect(role('authenticated',owner,`select ${column} from section_external_visuals`)).rejects.toThrow();
    await expect(role('anon',owner,'select status from section_external_visuals')).rejects.toThrow();
  });
  it('keeps writes, reservations and request ledger service-only',async()=>{
    for(const name of ['authenticated','anon']) {
      for(const sql of ['delete from section_external_visuals','update section_external_visuals set attempt_count=1','insert into section_external_visuals default values','select * from section_external_visual_requests',reserve()])
        await expect(role(name,owner,sql)).rejects.toThrow();
    }
    expect((await role('service_role',owner,reserve())).rows[0]).toEqual({token:null});
  });
  it('denies foreign owner/unknown section/version mismatch and deleted artifact',async()=>{
    await expect(db.query(reserve('s',false,other))).rejects.toThrow('external_visual_not_found');
    await expect(token('unknown')).rejects.toThrow('external_visual_not_found');
    await db.exec('begin');try{await db.exec(`update generated_artifacts set deleted_at=now()`);await expect(token()).rejects.toThrow('external_visual_not_found');}finally{await db.exec('rollback');}
  });
  it('provider failure releases the lease without caching none and still counts daily cost',async()=>{
    const t=await token('none');expect(await finish(t,null)).toBe(true);
    expect((await db.query("select * from section_external_visuals where section_id='none'")).rows).toEqual([]);
    expect(await finish(await token('none'),{status:'none',query:'Cell',verdict:'No match.',excluded_titles:[]})).toBe(true);
  });
  it('caps all rolling-day reservations at three hundred including failures',async()=>{
    await db.exec('begin');try{
      await db.exec(`delete from section_external_visual_requests;delete from section_external_visuals where section_id='none';`);
      for(let i=0;i<300;i++)expect(await finish(await token('none'),null)).toBe(true);
      await expect(token('none')).rejects.toThrow('external_visual_daily_cap');
    }finally{await db.exec('rollback');}
  });
  it('expired leases cannot publish and an artifact cascade cleans cache and ledger',async()=>{
    await db.exec('begin');try{
      const t=await token('none',true);await db.exec(`update section_external_visual_requests set expires_at=now()-interval '1 second' where token='${t}'`);
      expect(await finish(t)).toBe(false);
      await db.exec('delete from generated_artifacts');expect((await db.query('select * from section_external_visuals')).rows).toEqual([]);
      expect((await db.query('select * from section_external_visual_requests')).rows).toEqual([]);
    }finally{await db.exec('rollback');}
  });
  it('accepts the same root/wrapped section payload shapes as the source resolvers',async()=>{
    await db.exec('begin');try{
      await db.exec(`update generated_artifact_versions set payload=payload->'reviewer';`);
      expect(await token('none',true)).toBeTypeOf('string');
    }finally{await db.exec('rollback');}
  });
});
