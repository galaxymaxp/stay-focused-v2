import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ShareReviewerMenu } from './ShareReviewerMenu';
import { reviewerDetail } from '../../services/localLibrary/localLibrary.testSupport';
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), read: vi.fn(), copy: vi.fn(), share: vi.fn(), owner: 'owner' }));
vi.mock('react-native', () => ({ View: 'View', Platform: { OS: 'android' }, Share: { share: mocks.share } }));
vi.mock('expo-clipboard', () => ({ setStringAsync: mocks.copy }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: mocks.owner } } }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Sheet: 'Sheet' }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.read }));
vi.mock('../../services/reviewerShares', () => ({ mutateReviewerShare: mocks.mutate, reviewerShareUrl: (token: string) => `https://website.test/s/${token}` }));
const detail = reviewerDetail(), reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const link = { token: 'a'.repeat(64), updatedAt: '' };
const props = { artifactId: 'artifact', reviewer, client: { baseUrl: 'https://api.test', accessToken: 'jwt' }, offline: false };
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); mocks.owner = 'owner';
  mocks.read.mockResolvedValue(link); mocks.mutate.mockResolvedValue(link); mocks.copy.mockResolvedValue(true); mocks.share.mockResolvedValue({});
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; });
const button = (text: string) => tree!.root.findAll(node => node.type === 'Action' as never && node.props.children === text)[0]!;
async function mount() { await act(async () => { tree = create(createElement(ShareReviewerMenu, props)); }); }
it('Share creates or reuses a link, copies it and opens React Native system sharing', async () => {
  await mount(); await act(async () => button('Share').props.onPress());
  await act(async () => button('Share link').props.onPress());
  expect(mocks.mutate).toHaveBeenCalledWith(props.client, 'owner', 'artifact', reviewer, 'POST');
  expect(mocks.copy).toHaveBeenCalledWith(`https://website.test/s/${link.token}`);
  expect(mocks.share).toHaveBeenCalledWith({ message: `https://website.test/s/${link.token}`, url: `https://website.test/s/${link.token}`, title: reviewer.title });
});
it('updates the same share explicitly and Stop sharing removes active controls', async () => {
  await mount(); await act(async () => button('Share').props.onPress());
  await act(async () => button('Update shared version').props.onPress());
  expect(mocks.mutate).toHaveBeenLastCalledWith(props.client, 'owner', 'artifact', reviewer, 'PATCH');
  mocks.mutate.mockResolvedValue(null);
  await act(async () => button('Stop sharing').props.onPress());
  expect(mocks.mutate).toHaveBeenLastCalledWith(props.client, 'owner', 'artifact', reviewer, 'DELETE');
  expect(button('Stop sharing')).toBeUndefined(); expect(mocks.share).not.toHaveBeenCalled();
});
it('offline sharing is disabled and owner changes discard the old link/menu', async () => {
  await mount(); await act(async () => button('Share').props.onPress());
  mocks.owner = 'other'; await act(async () => tree!.update(createElement(ShareReviewerMenu, props)));
  expect(button('Stop sharing')).toBeUndefined();
  await act(async () => tree!.update(createElement(ShareReviewerMenu, { ...props, offline: true })));
  expect(button('Share').props.disabled).toBe(true);
});
it('a late response after an account switch never copies or opens the old owner link', async () => {
  let complete!: (value: typeof link) => void;
  mocks.mutate.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await mount(); await act(async () => button('Share').props.onPress());
  await act(async () => { void button('Share link').props.onPress(); });
  mocks.owner = 'other'; await act(async () => tree!.update(createElement(ShareReviewerMenu, props)));
  await act(async () => complete(link));
  expect(mocks.copy).not.toHaveBeenCalled(); expect(mocks.share).not.toHaveBeenCalled();
});
it.each(['reject', 'false'])('clipboard failure (%s) still opens system sharing and offers the visible link', async failure => {
  if (failure === 'reject') mocks.copy.mockRejectedValue(new Error('Native module missing'));
  else mocks.copy.mockResolvedValue(false);
  await mount(); await act(async () => button('Share').props.onPress());
  await act(async () => button('Share link').props.onPress());
  expect(mocks.share).toHaveBeenCalledOnce(); expect(JSON.stringify(tree!.toJSON())).toContain('Link ready to share');
  expect(JSON.stringify(tree!.toJSON())).toContain(link.token);
  await act(async () => button('Copy link').props.onPress());
  expect(mocks.share).toHaveBeenCalledTimes(2);
});
