import { describe, expect, it } from 'vitest';
import { materialClientStatus, projectPreparationStatus } from './client-status';
import { revisionFingerprint } from './repository';
import type { CanvasReviewerSourceDescriptor } from '@/lib/canvas-reviewer-sources';

const fileId = '11111111-1111-4111-8111-111111111111';
const source: CanvasReviewerSourceDescriptor = { id: `file:${fileId}`, type: 'file', title: 'Lesson',
  capability: 'ready', availability: 'available', unavailableReason: null, updatedAt: null,
  estimatedCharacters: null, placement: {group:'module',moduleTitle:'Unit',modulePosition:1,itemPosition:1},
  file:{kind:'pdf',preparationStatus:'ready',canPrepare:false} };

describe('safe current-revision preparation status', () => {
  it.each([
    ['prepared', 'result', 'ready', null], ['pending', null, 'preparing', null],
    ['running', null, 'preparing', null], ['failed', null, 'failed', 'preparation_failed'],
    ['cancelled', null, 'failed', 'preparation_cancelled'],
  ] as const)('maps %s', (state, result_id, status, reasonCode) => {
    expect(projectPreparationStatus({state,result_id}, null)).toEqual({status,reasonCode});
  });
  it('keeps backlog, deferred and missing results preparing', () => {
    expect(projectPreparationStatus(null,null)).toEqual({status:'preparing',reasonCode:null});
    expect(projectPreparationStatus({state:'prepared',result_id:null},null).status).toBe('preparing');
    expect(projectPreparationStatus({state:'running',result_id:null},{automatic_attempts:3,suppressed:false}).status).toBe('preparing');
  });
  it('reports attempt cap and guard suppression without internal reasons', () => {
    expect(projectPreparationStatus(null,{automatic_attempts:3,suppressed:false})).toEqual({status:'failed',reasonCode:'attempt_limit'});
    expect(projectPreparationStatus({state:'pending',result_id:null},{automatic_attempts:1,suppressed:true})).toEqual({status:'failed',reasonCode:'preparation_paused'});
    const privateJob = {state:'failed' as const,result_id:null,lease_token:'secret',dispatch_id:'private',storage_key:'private',reason_code:'raw provider text',evidence:'private'};
    expect(JSON.stringify(projectPreparationStatus(privateJob,null))).toBe('{"status":"failed","reasonCode":"preparation_failed"}');
  });
  it.each(['pending', 'missing'] as const)('ignores an older prepared revision when current is %s', async current => {
    const oldRevision=revisionFingerprint([{type:'file',id:fileId,revision:'a'.repeat(64)}]);
    const newRevision=revisionFingerprint([{type:'file',id:fileId,revision:'b'.repeat(64)}]);
    const jobs=[{revision_fingerprint:oldRevision,state:'prepared',result_id:'old-result'},
      ...(current==='pending'?[{revision_fingerprint:newRevision,state:'pending',result_id:null}]:[])];
    const filters = new Map<string, unknown>();
    const client={from:(table:string)=>{
      const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.set(key,value);return query;},
        maybeSingle:async()=>({error:null,data:table==='canvas_courses'?{canvas_connection_id:'connection'}:
          table==='canvas_files'?{id:fileId,content_type:'application/pdf',display_name:'Lesson.pdf',content_version_fingerprint:'b'.repeat(64)}:
          table==='canvas_material_preparations'?jobs.find(job=>job.revision_fingerprint===filters.get('revision_fingerprint'))??null:null})};
      return query;
    }};
    expect(await materialClientStatus(client as never,{userId:'owner',courseId:'course',materialId:source.id},source)).toEqual({status:'preparing',reasonCode:null});
    expect(filters.get('user_id')).toBe('owner');
    expect(filters.get('course_id')).toBe('course');
    expect(filters.get('revision_fingerprint')).toBe(newRevision);
  });
  it.each(['unsupported','empty','inaccessible'] as const)('keeps %s material out of the preparation queue', async capability => {
    expect((await materialClientStatus({} as never,{userId:'owner',courseId:'course',materialId:source.id},{...source,capability})).status)
      .toBe(capability==='inaccessible'?'unavailable':capability);
  });
});
