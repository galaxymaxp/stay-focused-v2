import { CourseBatchQueue } from './CourseBatchQueue';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({request:vi.fn(),refresh:vi.fn(),data:{courseBatches:{summaries:[{batchKey:'batch',done:6,total:14}],requests:[{id:'waiting',title:'Waiting material',state:'waiting',nextAvailableAt:null},{id:'failed',title:'Failed material',state:'failed',nextAvailableAt:null}]}}}));
vi.mock('react-native',()=>({View:'View'}));
vi.mock('../../design/primitives',()=>({Action:'Action',Copy:'Copy',Notice:'Notice',Surface:'Surface'}));
vi.mock('../../services/experienceApi',()=>({experienceRequest:mocks.request}));
vi.mock('../redesign/useExperience',()=>({useExperienceClient:()=>({})}));
vi.mock('./useQueueItems',()=>({useQueueItems:()=>({data:mocks.data,refresh:mocks.refresh})}));
let tree:ReactTestRenderer;
afterEach(async()=>{await act(async()=>tree?.unmount());vi.clearAllMocks();});
it('shows waiting intent and batch progress; Cancel and Retry refresh server state',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true}); await act(async()=>{tree=create(createElement(CourseBatchQueue));});
  expect(JSON.stringify(tree.toJSON())).toContain('Waiting for preparation'); expect(JSON.stringify(tree.toJSON())).toContain('14');
  await act(async()=>tree.root.findAllByType('Action' as never).find(node=>node.props.children==='Cancel')!.props.onPress());
  expect(mocks.request).toHaveBeenLastCalledWith({},'/api/experience/batch-requests/waiting/cancel',{method:'POST'});
  await act(async()=>tree.root.findAllByType('Action' as never).find(node=>node.props.children==='Retry')!.props.onPress());
  expect(mocks.request).toHaveBeenLastCalledWith({},'/api/experience/batch-requests/failed/retry',{method:'POST'});
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
it('hides a finished summary while retaining partial progress and attention actions', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.data.courseBatches.summaries.push({ batchKey: 'finished', done: 4, total: 4 });
  try {
    await act(async () => { tree = create(createElement(CourseBatchQueue)); });
    const progress = tree.root.findAllByType('Copy' as never).filter(node => Array.isArray(node.props.children) && node.props.children.includes(' of '));
    expect(progress).toHaveLength(1);
    expect(progress[0]!.props.children).toEqual([6, ' of ', 14, ' done']);
    expect(tree.root.findAllByType('Action' as never)).toHaveLength(3);
  } finally { mocks.data.courseBatches.summaries.pop(); }
});
