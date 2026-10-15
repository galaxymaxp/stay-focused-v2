import { CourseBatchControls } from './CourseBatchControls';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn(), show: vi.fn(), owner: 'owner' }));
vi.mock('react-native', () => ({ View: 'View', Pressable: 'Pressable' }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Surface: 'Surface' }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } } }) }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.request }));
vi.mock('../redesign/useExperience', () => ({ useExperienceClient: () => ({}) }));
vi.mock('../queue/useQueueItems', () => ({ useQueueItems: () => ({ refresh: mocks.refresh, show: mocks.show }) }));
let tree: ReactTestRenderer;
const preview = { items: [{id:'done',title:'Saved',done:true,selectable:false},{id:'one',title:'One',done:false,selectable:true},{id:'two',title:'Two',done:false,selectable:true}] };
beforeEach(() => { vi.clearAllMocks(); mocks.owner = 'owner'; Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); mocks.request.mockResolvedValue(preview); });
afterEach(async () => { await act(async () => tree?.unmount()); });
async function mount() { await act(async () => { tree = create(createElement(CourseBatchControls, {courseId:'course'})); }); }
function button(label: string) { return tree.root.findAllByType('Action' as never).find(node => node.props.children === label)!; }
it('Generate all confirms an honest count and skipped list before posting; double taps lock', async () => {
  await mount(); await act(async () => button('Generate all').props.onPress());
  expect(JSON.stringify(tree.toJSON())).toContain('Saved'); expect(mocks.request).toHaveBeenCalledTimes(1);
  mocks.request.mockResolvedValue({created:1,skippedUpToDate:1,waitingForPrepared:0,overLimit:1,failed:0,batchKey:'key'});
  await act(async () => { button('Confirm').props.onPress(); button('Confirm').props.onPress(); });
  expect(mocks.request.mock.calls.filter(call => call[2]?.method === 'POST')).toHaveLength(1);
  expect(mocks.request).toHaveBeenLastCalledWith({}, '/api/experience/courses/course/batch', {method:'POST',body:{materialIds:['done','one','two']}});
  expect(mocks.show).toHaveBeenCalledOnce();
});
it('select mode only sends checked materials and done rows are disabled', async () => {
  await mount(); await act(async () => button('Select materials').props.onPress());
  const checkboxes = tree.root.findAllByType('Pressable' as never);
  expect(checkboxes[0].props.disabled).toBe(true);
  await act(async () => checkboxes[2].props.onPress());
  mocks.request.mockResolvedValue({created:1,skippedUpToDate:0,waitingForPrepared:0,overLimit:0,failed:0,batchKey:'key'});
  await act(async () => button('Confirm').props.onPress());
  expect(mocks.request).toHaveBeenLastCalledWith({}, expect.any(String), {method:'POST',body:{materialIds:['two']}});
});
it('account changes discard the previous confirmation', async () => {
  await mount(); await act(async () => button('Generate all').props.onPress());
  mocks.owner = 'second'; await act(async () => tree.update(createElement(CourseBatchControls, {courseId:'course'})));
  expect(button('Confirm')).toBeUndefined();
});
