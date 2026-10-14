import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Synthetic local-only schema for the actual preparation RPCs. */
export async function createPreparationStore(ids:{userId:string;courseId:string;connectionId:string}){
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''test.owner'',true),'''')::uuid';
    grant usage on schema public,auth to authenticated,service_role;
    create table canvas_connections(id uuid primary key,user_id uuid,status text);
    create table canvas_courses(id uuid primary key,user_id uuid,canvas_connection_id uuid);
    create table canvas_course_sync_preferences(course_id uuid,user_id uuid,selected boolean);
    create table canvas_sync_jobs(id uuid primary key,user_id uuid,course_id uuid,status text,job_type text);
    create table canvas_files(id uuid primary key,user_id uuid,course_id uuid,availability_status text,
      content_version_fingerprint text,ingestion_status text,current_sha256 text);
    create table canvas_pages(id uuid primary key,user_id uuid,course_id uuid,body_html text);
    grant select on canvas_connections,canvas_courses,canvas_course_sync_preferences,canvas_files,canvas_pages to service_role;
    grant update on canvas_files,canvas_pages to service_role;`);
  await db.query('insert into auth.users values($1)',[ids.userId]);
  await db.query(`insert into canvas_connections values($1,$2,'active')`,[ids.connectionId,ids.userId]);
  await db.query('insert into canvas_courses values($1,$2,$3)',[ids.courseId,ids.userId,ids.connectionId]);
  await db.query('insert into canvas_course_sync_preferences values($1,$2,true)',[ids.courseId,ids.userId]);
  for(const name of ['20261014000000_canvas_material_preparation.sql','20261014000100_canvas_preparation_orchestration.sql','20261014000200_canvas_preparation_backfill.sql'])
    await db.exec(readFileSync(resolve(__dirname,'../../../../../packages/db/migrations',name),'utf8'));
  return db;
}
export async function registerDiscoveredFiles(db:PGlite,input:{userId:string;courseId:string;materialIds:readonly string[]}){
  const jobs:string[]=[];
  for(const id of input.materialIds){
    const file=id.slice(5);const revision='a'.repeat(64);
    await db.query(`insert into canvas_files values($1,$2,$3,'available',$4,'stored',$5)`,[file,input.userId,input.courseId,revision,'b'.repeat(64)]);
    const admitted=await db.query<{id:string}>(`select id from admit_canvas_material_preparation_v1($1,$2,$3,'file',$4,$5::jsonb,'sync-test',false)`,
      [input.userId,input.courseId,id,revision,JSON.stringify([{type:'file',id:file,revision}])]);
    jobs.push(admitted.rows[0]!.id);
  }
  return (await db.query<{id:string}>(`select register_canvas_preparation_sync_v1($1,$2,null,'sync-test',$3::uuid[]) as id`,[input.userId,input.courseId,jobs])).rows[0]!.id;
}
export async function completeHealthyBatches(db:PGlite,syncId:string){
  while(true){
    const batch=await db.query<{id:string}>('select id from advance_canvas_preparation_sync_v1($1)',[syncId]);
    if(!batch.rows.length)break;
    // A healthy extractor is represented by terminal receipts. Guard SQL owns
    // admission/batch accounting; result publication is exercised separately.
    await db.query(`update canvas_material_preparations set state='prepared' where id=any($1::uuid[])`,[batch.rows.map(row=>row.id)]);
  }
}
