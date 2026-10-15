import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn(), owner: 'owner' }));
vi.mock('../components/providers', () => ({ useAuth: () => ({api:mocks.api,session:{user:{id:mocks.owner}}}) }));
vi.mock('./queue-items', () => ({ useQueueItems: () => ({refresh:mocks.refresh}) }));
vi.mock('../lib/generation', () => ({generationEnabled:true}));
import { CourseBatchControls } from './course-batch';
let tree: ReactTestRenderer;
const preview = {items:[{id:'done',title:'Saved',done:true,selectable:false},{id:'one',title:'One',done:false,selectable:true},{id:'two',title:'Two',done:false,selectable:true}]};
beforeEach(() => { vi.clearAllMocks(); mocks.owner='owner'; Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,window:new EventTarget()}); mocks.api.mockResolvedValue(preview); });
afterEach(async () => { await act(async () => tree?.unmount()); });
async function mount() { await act(async () => { tree=create(createElement(CourseBatchControls,{courseId:'course'})); }); }
function button(label:string) { return tree.root.findAllByType('button').find(node=>node.props.children===label)!; }
it('Generate all requires confirmation, lists skipped reviewers and locks concurrent clicks',async()=>{
  await mount(); await act(async()=>button('Generate all').props.onClick()); expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(tree.toJSON())).toContain('Skipped: ');
  mocks.api.mockResolvedValue({created:1,skippedUpToDate:1,waitingForPrepared:0,overLimit:1,failed:0,batchKey:'key'});
  await act(async()=>{button('Confirm').props.onClick();button('Confirm').props.onClick();});
  expect(mocks.api.mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(1);
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/courses/course/batch',{method:'POST',body:{materialIds:['done','one','two']}});
});
it('Select all and individual checkboxes only submit the checked selectable materials',async()=>{
  await mount(); await act(async()=>button('Select materials').props.onClick());
  expect(tree.root.findAllByType('input')[0].props.disabled).toBe(true);
  await act(async()=>button('Select all').props.onClick()); await act(async()=>tree.root.findAllByType('input')[1].props.onChange());
  mocks.api.mockResolvedValue({created:1,skippedUpToDate:0,waitingForPrepared:0,overLimit:0,failed:0,batchKey:'key'});
  await act(async()=>button('Confirm').props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith(expect.any(String),{method:'POST',body:{materialIds:['two']}});
});
it('changing account discards the previous confirmation',async()=>{
  await mount(); await act(async()=>button('Generate all').props.onClick()); mocks.owner='second';
  await act(async()=>tree.update(createElement(CourseBatchControls,{courseId:'course'})));
  expect(button('Confirm')).toBeUndefined();
});
