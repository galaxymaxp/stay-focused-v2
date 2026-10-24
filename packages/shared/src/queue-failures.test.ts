import { describe, expect, it } from 'vitest';
import type { ProcessingJobStatusView } from './index';
import { REVIEWER_JOB_STAGES } from './index';
import { queueFailureCards, queueFailureReason, queueFailureTitle } from './queue-failures';

const row = (id: string, patch: Partial<ProcessingJobStatusView> = {}): ProcessingJobStatusView => ({
  id, status: 'failed', jobType: 'reviewer_generation', sourceVersionId: 'source-a',
  failedAt: `2026-10-24T00:00:0${id === 'new' ? 2 : 1}Z`, retryOfJobId: null,
  ...patch,
} as ProcessingJobStatusView);

describe('Queue failure presentation', () => {
  it('groups by kind and authoritative source, chooses latest failure regardless of order, retains all input history', () => {
    const jobs = [row('new'), row('old'), row('quiz', { jobType: 'quiz_generation' }), row('other', { sourceVersionId: 'source-b' })];
    const before = structuredClone(jobs);
    expect(queueFailureCards(jobs).map(({job, failureCount}) => [job.id, failureCount])).toEqual([['new', 2], ['quiz', 1], ['other', 1]]);
    expect(queueFailureCards([...jobs].reverse()).find(card => card.job.id === 'new')?.failureCount).toBe(2);
    expect(jobs).toEqual(before);
  });
  it('uses explicit retry ancestry for missing sources, never identical names, and leaves cancelled/active records separate', () => {
    const jobs = [row('root', {sourceVersionId:null}), row('child', {sourceVersionId:null,retryOfJobId:'root',failedAt:'2026-10-25'}), row('unrelated',{sourceVersionId:null}), row('cancelled',{status:'cancelled'}),row('active',{status:'running'})];
    expect(queueFailureCards(jobs).map(({job,failureCount})=>[job.id,failureCount])).toEqual([['child',2],['unrelated',1],['cancelled',0],['active',0]]);
  });
  it('counts expired failures, ignores duplicate IDs, resolves time ties deterministically and terminates cyclic history', () => {
    const a=row('a'),b=row('b',{status:'expired'});
    expect(queueFailureCards([a,b,a])).toEqual([{job:b,failureCount:2}]);
    expect(queueFailureCards([b,a])).toEqual([{job:b,failureCount:2}]);
    expect(queueFailureCards([row('a',{sourceVersionId:null,retryOfJobId:'b'}),row('b',{sourceVersionId:null,retryOfJobId:'a'})])).toHaveLength(1);
  });
  it('connects explicit retries across missing or changed source versions without crossing kinds',()=>{
    const jobs=[row('root',{sourceVersionId:null}),row('retry',{sourceVersionId:'version-two',retryOfJobId:'root'}),row('quiz',{jobType:'quiz_generation',retryOfJobId:'retry',sourceVersionId:null})];
    expect(queueFailureCards(jobs).map(card=>card.failureCount)).toEqual([2,1]);
  });
  it.each(REVIEWER_JOB_STAGES)('quiz never uses reviewer/topics copy at %s', stage => {
    const text=queueFailureReason('quiz_generation',stage);
    expect(text).not.toMatch(/reviewer|topics/);
    expect(text).toContain('Your material is safe.');
  });
  it('uses kind-specific generation and verification wording',()=>{
    expect(queueFailureReason('quiz_generation','generating_sections')).toBe('Stopped while building questions. Your material is safe.');
    expect(queueFailureReason('quiz_generation','verifying_coverage')).toBe('Stopped while checking the quiz. Your material is safe.');
    expect(queueFailureReason('activity_generation','generating_sections')).toBe('Stopped while building the draft. Your material is safe.');
    expect(queueFailureReason('reviewer_generation','generating_sections')).toBe('Stopped while building topics. Your material is safe.');
  });
  it.each([undefined,null,'','future-stage','__proto__'])('uses the exact safe fallback for unknown stage %s',stage=>{
    expect(queueFailureReason('quiz_generation',stage)).toBe('Stopped before finishing. Your material is safe.');
  });
  it('keeps extensions in a separate visible suffix and preserves short names',()=>{
    const title='A very long synthetic material name that keeps its extension.pdf';
    const parts=queueFailureTitle(title);
    expect(parts).toEqual({start:title.slice(0,-4),end:'.pdf'});
    expect(queueFailureTitle('Short.pdf')).toEqual({start:'Short',end:'.pdf'});
    expect(queueFailureTitle('x'.repeat(80)).end).toBe('xxxxxxxx');
  });
});
