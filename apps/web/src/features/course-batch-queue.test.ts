import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn(), data: {courseBatches:{summaries:[{batchKey:'batch',done:6,total:14}],requests:[{id:'waiting',title:'Waiting material',state:'waiting',nextAvailableAt:null},{id:'failed',title:'Failed material',state:'failed',nextAvailableAt:null}]}} }));
vi.mock('../components/providers', () => ({useAuth:()=>({api:mocks.api})}));
vi.mock('./queue-items', () => ({useQueueItems:()=>({data:mocks.data,refresh:mocks.refresh})}));
import { CourseBatchQueue } from './course-batch-queue';
let tree:ReactTestRenderer;
afterEach(async()=>{await act(async()=>tree?.unmount());vi.clearAllMocks();});
it('shows saved preparation intent and batch progress; Cancel and Retry use owner endpoints',async()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  await act(async()=>{tree=create(createElement(CourseBatchQueue));});
  const text=JSON.stringify(tree.toJSON()); expect(text).toContain('Waiting for preparation'); expect(text).toContain('14');
  await act(async()=>tree.root.findAllByType('button').find(node=>node.props.children==='Cancel')!.props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/batch-requests/waiting/cancel',{method:'POST'});
  await act(async()=>tree.root.findAllByType('button').find(node=>node.props.children==='Retry')!.props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/batch-requests/failed/retry',{method:'POST'});
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
