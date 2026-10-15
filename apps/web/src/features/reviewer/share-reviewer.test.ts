import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { assistCacheKey, assistContentHash, assistRequest, selectAssistBlock, type ReviewerReaderModel } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ api: vi.fn(), owner: 'owner' }));
vi.mock('../../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: mocks.owner } } }) }));
import { ShareReviewer } from './share-reviewer';
import { collectSharedAssists } from './assist-store';
const reviewer: ReviewerReaderModel = { id: 'artifact:one', title: 'Cells', course: null, source: { id: 'source', title: 'Lecture' }, generatedAt: '2026-10-15T00:00:00Z', freshness: 'current',
  sections: [{ id: 's', title: 'Structure', blocks: [{ id: 'b', title: 'Membrane', explanation: 'Boundary.', keyPoints: [], evidence: [] }] }] };
let tree: ReactTestRenderer | undefined;
const token = 'a'.repeat(64), copy = vi.fn();
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); mocks.owner = 'owner';
  mocks.api.mockImplementation(async (_path: string, options: { method: string }) => options.method === 'DELETE' ? null : { token, updatedAt: '' });
  copy.mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
  vi.stubGlobal('location', { origin: 'https://website.test' }); vi.stubGlobal('localStorage', { getItem: () => null });
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const button = (label: string) => tree!.root.findAllByType('button').find(node => node.props.children === label)!;
it('creates/reuses the owner link, copies it, explicitly updates and stops', async () => {
  await act(async () => { tree = create(createElement(ShareReviewer, { artifactId: 'one', reviewer })); });
  await act(async () => button('Share').props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/shares/one', { method: 'POST', body: { assists: [] } });
  await act(async () => button('Copy link').props.onClick()); expect(copy).toHaveBeenCalledWith(`https://website.test/s/${token}`);
  await act(async () => button('Update shared version').props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/shares/one', { method: 'PATCH', body: { assists: [] } });
  await act(async () => button('Stop sharing').props.onClick());
  expect(mocks.api).toHaveBeenLastCalledWith('/api/experience/shares/one', { method: 'DELETE' }); expect(button('Copy link')).toBeUndefined();
});
it('uses only exact current reviewer results saved for the authenticated browser owner', () => {
  const selection = selectAssistBlock(reviewer, 's', 'b')!, request = assistRequest(selection, 'summarize');
  const value = { text: 'Saved summary.', createdAt: reviewer.generatedAt, canonical: assistContentHash(selection.canonicalContent) };
  const read = vi.fn((key: string) => key === 'sf.study-assist.v1.owner' ? JSON.stringify({ [assistCacheKey(request)]: value }) : null);
  vi.stubGlobal('localStorage', { getItem: read });
  expect(collectSharedAssists('owner', reviewer)).toEqual([{ ...request, text: value.text, createdAt: value.createdAt }]);
  expect(collectSharedAssists('other', reviewer)).toEqual([]); expect(collectSharedAssists('owner', { ...reviewer, title: 'Edited' })).toEqual([]);
  expect(mocks.api).not.toHaveBeenCalled();
});
it('owner switch discards the previous sharing menu and token', async () => {
  await act(async () => { tree = create(createElement(ShareReviewer, { artifactId: 'one', reviewer })); });
  await act(async () => button('Share').props.onClick()); expect(button('Copy link')).toBeDefined();
  mocks.owner = 'other'; await act(async () => tree!.update(createElement(ShareReviewer, { artifactId: 'one', reviewer })));
  expect(button('Copy link')).toBeUndefined(); expect(JSON.stringify(tree!.toJSON())).not.toContain(token);
});
