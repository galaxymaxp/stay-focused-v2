import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ProfileAvatarProvider, useProfileAvatar } from './ProfileAvatarProvider';
const mocks = vi.hoisted(() => ({ owner: 'a', offline: false, signingOut: false, request: vi.fn(), remove: vi.fn() }));
vi.mock('../auth', () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner, email: `${mocks.owner}@test`, userMetadata: { picture: 'https://provider.test/a' } }, accessToken: 'jwt', offline: mocks.offline } : null, isSigningOut: mocks.signingOut }) }));
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: () => ({ remove: mocks.remove }) } }));
vi.mock('../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://api.test' }));
vi.mock('../services/profileAvatarApi', () => ({ profileAvatarRequest: mocks.request }));
let photo!: ReturnType<typeof useProfileAvatar>, rendered: ReactTestRenderer | undefined;
function Probe() { photo = useProfileAvatar(); return null; }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); vi.clearAllMocks(); });
it('uses provider fallback offline and clears memory at sign-out/account changes', async () => {
  mocks.owner = 'a'; mocks.offline = false; mocks.signingOut = false;
  mocks.request.mockResolvedValue({ url: 'https://private.test/a', expiresAt: new Date(Date.now() + 600_000).toISOString() });
  const tree = () => createElement(ProfileAvatarProvider, null, createElement(Probe));
  await act(async () => { rendered = create(tree()); }); expect(photo.kind).toBe('uploaded');
  mocks.offline = true; await act(async () => rendered!.update(tree())); expect(photo.kind).toBe('provider');
  mocks.signingOut = true; await act(async () => rendered!.update(tree())); expect(photo.kind).toBe('provider');
  expect(mocks.remove).toHaveBeenCalled();
  mocks.owner = 'b'; mocks.signingOut = false;
  await act(async () => rendered!.update(tree())); expect(photo.initial).toBe('B'); expect(photo.kind).toBe('provider');
  mocks.owner = ''; await act(async () => rendered!.update(tree())); expect(photo.url).toBeUndefined();
});
