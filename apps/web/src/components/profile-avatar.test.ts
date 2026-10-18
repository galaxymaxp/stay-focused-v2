import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ owner: 'a', api: vi.fn() }));
vi.mock('./providers', () => ({ useAuth: () => ({ session: mocks.owner ? { user: { id: mocks.owner, email: `${mocks.owner}@test`, user_metadata: { picture: 'https://provider.test/a' } } } : null, api: mocks.api }) }));
import { ProfileAvatarProvider, useProfileAvatar } from './profile-avatar';
let photo!: ReturnType<typeof useProfileAvatar>, rendered: ReactTestRenderer | undefined;
function Probe() { photo = useProfileAvatar(); return null; }
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); vi.unstubAllGlobals(); });
it('shares changed photos and clears memory on account switch/sign-out, ignoring a late response', async () => {
  vi.stubGlobal('window', new EventTarget());
  mocks.owner = 'a'; mocks.api.mockResolvedValue({ url: 'https://private.test/a', expiresAt: new Date(Date.now() + 600_000).toISOString() });
  const tree = () => createElement(ProfileAvatarProvider, null, createElement(Probe));
  await act(async () => { rendered = create(tree()); }); expect(photo.kind).toBe('uploaded');
  mocks.api.mockResolvedValueOnce({ url: null, expiresAt: null });
  await act(async () => photo.change()); expect(photo.kind).toBe('provider');
  let finish!: (value: unknown) => void;
  mocks.owner = 'b'; mocks.api.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => rendered!.update(tree())); expect(photo.kind).toBe('provider'); expect(photo.initial).toBe('B');
  mocks.owner = ''; await act(async () => rendered!.update(tree()));
  await act(async () => finish({ url: 'https://private.test/b', expiresAt: new Date(Date.now() + 600_000).toISOString() }));
  expect(photo.url).toBeUndefined(); expect(photo.initial).toBe('·');
});
