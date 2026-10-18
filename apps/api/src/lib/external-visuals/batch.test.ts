import { describe, expect, it, vi } from 'vitest';
import { ExperienceFailure } from '../experience/errors';

vi.mock('../canonical-reviewers', () => ({
  readCanonicalReviewerRecord: vi.fn(async () => ({ ok: true, value: {
    artifact: { user_id: 'owner', deleted_at: null }, version: { id: 'v1', user_id: 'owner',
      payload: { reviewer: { sections: Array.from({ length: 7 }, (_, i) => ({ id: `s${i}` })) } } } } })),
}));
import { prepareReviewerVisuals, readReviewerVisuals, REVIEWER_VISUAL_CONCURRENCY } from './batch';
import { readCanonicalReviewerRecord, type CanonicalReviewerRecord } from '../canonical-reviewers';
import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('reviewer visual batch', () => {
  it('uses the same accepted canonical version as the combined load instead of rereading a newer version',async()=>{
    vi.mocked(readCanonicalReviewerRecord).mockClear();
    const saved={artifact:{user_id:'owner',deleted_at:null},version:{id:'accepted-version',user_id:'owner',payload:{sections:[{id:'accepted-section'}]}}} as unknown as CanonicalReviewerRecord;
    const read=vi.fn(async()=>({ok:true as const,value:saved}));
    const filters:[string,unknown][]=[];
    class Query {
      select(){return this;}
      eq(key:string,value:unknown){filters.push([key,value]);return this;}
      gt(){return this;}
      then(resolve:(value:{data:never[];count:number;error:null})=>unknown){return Promise.resolve({data:[] as never[],count:0,error:null}).then(resolve);}
    }
    const client={from:()=>new Query()} as unknown as SupabaseClient<Database>;
    const result=await readReviewerVisuals(client,{userId:'owner',artifactId:'a'},{read});
    expect(result).toEqual({sections:{},checked:0,total:1,running:false});
    expect(read).toHaveBeenCalledExactlyOnceWith(client,'owner','a');expect(readCanonicalReviewerRecord).not.toHaveBeenCalled();
    expect(filters.filter(([key])=>key==='version_id')).toEqual([['version_id','accepted-version'],['version_id','accepted-version']]);
  });
  it('checks every section with bounded concurrency and never stops on a section failure', async () => {
    let active = 0, peak = 0;
    const find = vi.fn(async (_c: unknown, input: { sectionId: string }) => {
      active++; peak = Math.max(peak, active); await new Promise(r => setTimeout(r, 5)); active--;
      if (input.sectionId === 's1') throw new ExperienceFailure(409, 'conflict');
      if (input.sectionId === 's2') throw new Error('provider down');
      return input.sectionId === 's3' ? { status: 'none' as const, message: 'No reliable visual found' as const, attemptCount: 1 }
        : { status: 'found' as const, attemptCount: 1 } as never;
    });
    const counts = await prepareReviewerVisuals({} as never, { userId: 'owner', artifactId: 'a' }, find as never);
    expect(find).toHaveBeenCalledTimes(7);
    expect(peak).toBeLessThanOrEqual(REVIEWER_VISUAL_CONCURRENCY);
    expect(counts).toEqual({ found: 4, none: 1, skipped: 1, failed: 1 });
  });
  it('stops early when the daily cap is reached', async () => {
    const find = vi.fn(async () => { throw new ExperienceFailure(429, 'rate_limited'); });
    const counts = await prepareReviewerVisuals({} as never, { userId: 'owner', artifactId: 'a' }, find as never);
    expect(find.mock.calls.length).toBeLessThanOrEqual(REVIEWER_VISUAL_CONCURRENCY);
    expect(counts.failed).toBe(find.mock.calls.length);
  });
});
