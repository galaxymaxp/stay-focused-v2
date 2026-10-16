import { createElement } from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ share: vi.fn(), load: vi.fn() }));
vi.mock('react-native', () => ({ View: 'View', Share: { share: mocks.share } }));
vi.mock('expo-clipboard', () => { mocks.load(); throw new Error('Cannot find native module ExpoClipboard'); });
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } } }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Sheet: 'Sheet' }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: async () => null }));
vi.mock('../../services/reviewerShares', () => ({ mutateReviewerShare: async () => ({ token: 'a'.repeat(64) }), reviewerShareUrl: () => 'https://website.test/s/link' }));
const { ShareReviewerMenu } = await import('./ShareReviewerMenu');
const { reviewerDetail } = await import('../../services/localLibrary/localLibrary.testSupport');
it('renders Share before loading a missing native module and degrades on link creation', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  mocks.share.mockResolvedValue({});
  const detail = reviewerDetail(); if (!('reviewer' in detail)) throw new Error('fixture');
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(ShareReviewerMenu, { artifactId: 'server-id', reviewer: detail.reviewer, client: { baseUrl: 'https://api.test', accessToken: 'jwt' }, offline: false })); });
  const button = (label: string) => tree.root.findAll(node => node.type === 'Action' as never && node.props.children === label)[0]!;
  try {
    expect(mocks.load).not.toHaveBeenCalled(); expect(button('Share').props.disabled).toBe(false);
    await act(async () => button('Share').props.onPress()); await act(async () => button('Share link').props.onPress());
    expect(mocks.load).toHaveBeenCalledOnce(); expect(mocks.share).toHaveBeenCalledOnce(); expect(JSON.stringify(tree.toJSON())).toContain('Link ready to share');
  } finally { await act(async () => tree.unmount()); }
});
