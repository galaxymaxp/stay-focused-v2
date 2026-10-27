import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { estimateReviewerMinutes } from '@stay-focused/shared';
import { ExperienceService } from './service';
import { experienceRepository, trustedExperienceReadRepository } from './repository';
import type { CanvasReviewerSourceList } from '../canvas-reviewer-sources';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${n.toString().padStart(12, '0')}`;
const stamp = '2026-10-15T00:00:00.000Z';
const payload = { reviewer: { title: 'Synthetic audit', sections: [{ id: 's1', title: 'Synthetic', items: [{ id: 'i1', title: 'Synthetic', sourceCore: { explanation: 'Synthetic benchmark text. '.repeat(3000), keyPoints: [], evidence: [] } }] }] } };
let db: PGlite;
const sources: CanvasReviewerSourceList = { courseId: id(1), courseName: 'Synthetic course', courseSync: { status: 'success', completedAt: stamp, lastSuccessfulSyncAt: stamp, latestResultWasPartial: false, synchronizedSourcesAvailable: true, failureCategories: [] }, availableSourceCount: 0, unavailableSourceCount: 0, sources: [], pagination: { limit: 100, offset: 0, returned: 0, hasMore: false, totalKnown: 0 } };

/** Actual SQL projections through a local PostgREST-shaped adapter. No network. */
function localClient() {
  const reads: string[] = [];
  let bytes = 0;
  const client = { from(table: string) {
    if (!/^[a-z_0-9]+$/.test(table)) throw new Error('invalid table');
    let columns = '*', start = 0, limit: number | null = null;
    const predicates: string[] = [], values: unknown[] = [], ordering: string[] = [];
    const field = (value: string) => { if (!/^[a-z_0-9]+$/.test(value)) throw new Error('invalid field'); return `"${value}"`; };
    const run = async () => {
      const result = await db.query<Record<string, unknown>>(`select ${columns} from public.${table}${predicates.length ? ` where ${predicates.join(' and ')}` : ''}${ordering.length ? ` order by ${ordering.join(',')}` : ''}${limit === null ? '' : ` limit ${limit} offset ${start}`}`, values);
      const data = JSON.parse(JSON.stringify(result.rows)) as Record<string, unknown>[];
      reads.push(table); bytes += Buffer.byteLength(JSON.stringify(data));
      return { data, error: null };
    };
    const query = {
      select(value: string) { columns = value === '*' ? '*' : value.split(',').map(field).join(','); return query; },
      eq(key: string, value: unknown) { values.push(value); predicates.push(`${field(key)} = $${values.length}`); return query; },
      filter(key: string, operator: string, value: unknown) { if (operator !== 'eq') throw new Error('unsupported operator'); return query.eq(key, value); },
      in(key: string, input: readonly unknown[]) { values.push(input); predicates.push(`${field(key)} = any($${values.length})`); return query; },
      order(key: string, options?: { ascending?: boolean }) { ordering.push(`${field(key)} ${options?.ascending === false ? 'desc' : 'asc'}`); return query; },
      range(from: number, to: number) { start = from; limit = to - from + 1; return query; },
      async maybeSingle() { const result = await run(); if (result.data.length > 1) throw new Error('multiple rows'); return { ...result, data: result.data[0] ?? null }; },
      then<T>(onfulfilled: (value: Awaited<ReturnType<typeof run>>) => T) { return run().then(onfulfilled); },
    };
    return query;
  } } as unknown as SupabaseClient<Database>;
  return { client, reads, get bytes() { return bytes; }, reset() { reads.length = 0; bytes = 0; } };
}
function normalize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_key, v: unknown) => typeof v === 'string' && /^2026-\d\d-\d\dT/.test(v) ? new Date(v).toISOString() : v));
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table canvas_courses(id uuid primary key,user_id uuid,canvas_connection_id uuid,canvas_course_id text,name text,course_code text,workflow_state text,last_synced_at timestamptz,course_state_override text);
    create table generated_artifacts(id uuid primary key,user_id uuid,artifact_type text,safe_title text,latest_version_id uuid,created_at timestamptz,updated_at timestamptz,deleted_at timestamptz);
    create table generated_artifact_versions(id uuid primary key,user_id uuid,artifact_id uuid,artifact_type text,source_version_id uuid,generation_job_id uuid,payload jsonb);
    create table source_versions(id uuid primary key,user_id uuid,metadata jsonb,source_text text);
    create table reviewer_source_snapshots(id uuid primary key,user_id uuid,course_id uuid,source_title text);
    create table reviewer_source_snapshot_items(id uuid primary key,user_id uuid,course_id uuid,source_snapshot_id uuid,source_type text,source_row_id uuid);
    create table canvas_auto_reviewer_candidates(id uuid primary key,user_id uuid,processing_job_id uuid);
    create table processing_jobs(id uuid primary key,user_id uuid);
    create table quizzes(id uuid primary key,user_id uuid,course_id uuid,source_version_id uuid,reviewer_artifact_id uuid,generation_id uuid,title text,source_material_ids jsonb,question_count integer,difficulty text,questions jsonb,created_at timestamptz,updated_at timestamptz);
    create table quiz_attempts(id uuid primary key,user_id uuid,quiz_id uuid,status text,started_at timestamptz,completed_at timestamptz,percentage numeric,answers jsonb,study_state jsonb);
    create table activity_drafts(id uuid primary key,user_id uuid,course_id uuid,activity_id uuid,generation_id uuid,activity_type text,content jsonb,sources jsonb,warnings jsonb,revision integer,status text,created_at timestamptz,updated_at timestamptz);
  `);
  for (const table of ['canvas_courses','generated_artifacts','generated_artifact_versions','source_versions','reviewer_source_snapshots','reviewer_source_snapshot_items','canvas_auto_reviewer_candidates','processing_jobs','quizzes','quiz_attempts','activity_drafts']) {
    await db.exec(`alter table ${table} enable row level security; create policy own on ${table} for select to authenticated using(user_id = (select auth.uid())); grant select on ${table} to authenticated,service_role;`);
  }
  await db.exec(readFileSync(resolve('../../packages/db/migrations/20261015040000_experience_library_projections.sql'), 'utf8'));
  await db.query('insert into canvas_courses values ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id(1),owner,id(2),'canvas-course','Synthetic course','SYN','available',stamp,'past']);
  for (let i = 0; i < 240; i++) {
    await db.query('insert into generated_artifacts values ($1,$2,$3,$4,$5,$6,$7,null)', [id(1000+i),owner,'reviewer',`Synthetic ${i}`,id(2000+i),stamp,stamp]);
    await db.query('insert into generated_artifact_versions(id,user_id,artifact_id,artifact_type,source_version_id,generation_job_id,payload) values ($1,$2,$3,$4,$5,null,$6)', [id(2000+i),owner,id(1000+i),'reviewer',id(3000+i),payload]);
    await db.query('insert into source_versions values ($1,$2,$3,null)', [id(3000+i),owner,{ sourceTitle: `Synthetic source ${i}` }]);
  }
}, 30000);
afterAll(async () => { await db?.close(); });

describe('SP2 Library SQL projections', () => {
  it('matches the 240-reviewer baseline while bounding page/detail bytes and reads', async () => {
    const local = localClient(), repository = experienceRepository(local.client);
    const legacy = new ExperienceService({ repository: { rows: repository.rows }, materials: async () => ({ ok: true, value: sources }), freshness: async () => 'unknown' });
    const current = new ExperienceService({ repository, materials: async () => ({ ok: true, value: sources }), freshness: async () => 'unknown' });
    const expected = await legacy.getLibrary(owner, { limit: 100 });
    local.reset();
    expect(normalize(await current.getLibrary(owner, { limit: 100 }))).toEqual(normalize(expected));
    expect(local.reads).toHaveLength(2); expect(local.bytes).toBeLessThan(100_000);
    console.log('SP2 Library', JSON.stringify({ reads: local.reads.length, dbJsonBytes: local.bytes, requests: 1 }));
    const detail = await legacy.getLibraryArtifact(owner, `artifact:${id(1000)}`);
    local.reset();
    expect(normalize(await current.getLibraryArtifact(owner, `artifact:${id(1000)}`))).toEqual(normalize(detail));
    // PL4 includes linked quiz IDs in the reviewer response for the Quiz action.
    expect(local.reads).toEqual(['experience_reviewer_summaries_v1', 'generated_artifact_versions', 'quizzes']);
    expect(local.bytes).toBeLessThan(82_000);
    console.log('SP2 reviewer', JSON.stringify({ reads: local.reads.length, dbJsonBytes: local.bytes, requests: 1 }));
    local.reset();
    await current.getCourseLearningWorkspace(owner, id(1));
    expect(local.reads).toEqual(['canvas_courses']);
    console.log('SP2 empty workspace', JSON.stringify({ reads: local.reads.length, dbJsonBytes: local.bytes, requests: 1 }));
    const all = [];
    for (let offset: number | null = 0; offset !== null;) {
      const page = await current.getLibrary(owner, { limit: 100, offset });
      all.push(...page.items); offset = page.nextOffset;
    }
    expect(all).toHaveLength(240); expect(new Set(all.map(item => item.id)).size).toBe(240);
  }, 30000);
  it('mirrors E2 estimates including evidence, malformed inputs and Unicode whitespace', async () => {
    const variants: unknown[] = [null, {}, { sections: [] }, { sections: [{ items: [{}] }] }, payload,
      { sections: [{ items: [{ text: 'tail', sourceCore: { explanation: 'one\u00a0two\uFEFFthree', keyPoints: ['four', ' \t '], evidence: [{ text: 'five\nsix' }] } }] }] },
      { sections: [{ items: [{ sourceCore: { explanation: 'one', keyPoints: [], evidence: null } }] }] },
      { sections: [{ items: [{ sourceCore: { explanation: 'word '.repeat(801), keyPoints: [] } }] }] }];
    for (const value of variants) {
      const result = await db.query<{ minutes: number | null }>('select experience_reviewer_minutes_v1($1::jsonb) as minutes', [JSON.stringify(value)]);
      expect(result.rows[0]!.minutes).toBe(estimateReviewerMinutes(value)?.minutes ?? null);
    }
  });
  it('preserves supersession, automatic origin, past courses, quiz summaries and material badges', async () => {
    await db.query('insert into reviewer_source_snapshots values ($1,$2,$3,$4)', [id(4000),owner,id(1),'Lesson']);
    await db.query('insert into reviewer_source_snapshot_items values ($1,$2,$3,$4,$5,$6)', [id(4001),owner,id(1),id(4000),'file',id(4002)]);
    await db.query('update source_versions set metadata = $1 where id in ($2,$3)', [{ reviewerSourceSnapshotId: id(4000), sourceType: 'canvas_file' },id(3000),id(3001)]);
    await db.query('update generated_artifact_versions set generation_job_id = $1 where id = $2', [id(5000),id(2000)]);
    await db.query('insert into processing_jobs values ($1,$2)', [id(5000),owner]);
    await db.query('insert into canvas_auto_reviewer_candidates values ($1,$2,$3)', [id(5001),owner,id(5000)]);
    await db.query('insert into quizzes values ($1,$2,$3,$4,$5,null,$6,$7,1,$8,$9,$10,$10)', [id(6000),owner,id(1),id(3000),id(1000),'Quiz',[`file:${id(4002)}`],'easy',[{ id: 'q', type: 'multiple_choice', prompt: 'Private question', options: [] }],stamp]);
    await db.query('insert into quiz_attempts values ($1,$2,$3,$4,$5,$5,80,$6,$7)', [id(6001),owner,id(6000),'completed',stamp,[],{}]);
    await db.query('insert into quiz_attempts values ($1,$2,$3,$4,$5,null,null,$6,$7)', [id(6002),owner,id(6000),'in_progress',stamp,[{ finalizedAt: stamp }],{ currentQuestion: 1, skipped: ['q'], revealed: [] }]);
    await db.query('insert into activity_drafts values ($1,$2,$3,$4,$5,$6,$7,$8,$8,1,$9,$10,$10)', [id(7000),owner,id(1),id(7001),id(7002),'reflection',
      {title:'Draft',sections:[{id:'section-1',heading:'Reflection',level:1,content:'Private draft body',order:1,sourceRefs:[]}],slides:[]},[],'draft',stamp]);
    const local = localClient(), repository = experienceRepository(local.client);
    const legacy = new ExperienceService({ repository: { rows: repository.rows }, materials: async () => ({ ok: true, value: sources }) });
    const current = new ExperienceService({ repository, materials: async () => ({ ok: true, value: sources }) });
    expect(normalize(await current.getLibrary(owner, { courseId: id(1) }))).toEqual(normalize(await legacy.getLibrary(owner, { courseId: id(1) })));
    const result = await current.getLibrary(owner, { courseId: id(1) });
    expect(result.items.find(item => item.type === 'reviewer')?.origin).toBe('automatic');
    expect(result.supersededReviewerIds).toEqual([`artifact:${id(1001)}`]);
    expect((await repository.materialReviewers!(owner,id(1),[`file:${id(4002)}`])).get(`file:${id(4002)}`)).toBe(id(1000));
    expect(await current.getLibraryArtifact(owner, `artifact:${id(1001)}`)).toHaveProperty('reviewer');
    expect(normalize(await current.getLibrary(owner, { type: 'quiz' }))).toEqual(normalize(await legacy.getLibrary(owner, { type: 'quiz' })));
    for (const artifactId of [`quiz:${id(6000)}`, `activity:${id(7000)}`]) {
      expect(normalize(await current.getLibraryArtifact(owner, artifactId))).toEqual(normalize(await legacy.getLibraryArtifact(owner, artifactId)));
    }
    const encoded = JSON.stringify(result);
    for (const secret of ['sourceCore','explanation','Private question','Private draft body','metadata','payload','source_text']) expect(encoded).not.toContain(secret);
  });
  it('binds every optimized read to the verified owner and denies foreign details', async () => {
    const local = localClient(), repo = trustedExperienceReadRepository(local.client, other);
    expect((await repo.libraryPage!(owner,{})).items).toEqual([]);
    expect(await repo.reviewerDetail!(owner,`artifact:${id(1000)}`)).toBeNull();
    expect(await repo.materialReviewers!(owner,id(1),[`file:${id(4002)}`])).toEqual(new Map());
    const service = new ExperienceService({ repository: repo, materials: async () => { throw new Error('foreign materials read'); } });
    await expect(service.getCourseLearningWorkspace(other,id(1))).rejects.toMatchObject({ status: 404 });
    await expect(service.getLibraryArtifact(other,`artifact:${id(1000)}`)).rejects.toMatchObject({ status: 404 });
  });
  it('grants only service-role reads and retains invoker security on all views', async () => {
    for (const view of ['experience_library_v1','experience_reviewer_summaries_v1','experience_material_reviewers_v1']) {
      const result = await db.query<{ reloptions: string[] }>('select reloptions from pg_class where relname=$1',[view]);
      expect(result.rows[0]!.reloptions).toContain('security_invoker=true');
      for (const role of ['anon','authenticated']) {
        await db.exec(`begin; set local role ${role};`);
        try { await expect(db.query(`select * from ${view}`)).rejects.toThrow(/permission denied/); }
        finally { await db.exec('rollback'); }
      }
    }
    await db.exec(`begin; set local role service_role;`);
    try { expect((await db.query('select id from experience_library_v1 limit 1')).rows).toHaveLength(1); }
    finally { await db.exec('rollback'); }
  });
});
