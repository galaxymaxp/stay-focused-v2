import { createElement, StrictMode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Providers, useAuth } from "./providers";
import { RECOVERY_OWNER_KEY } from "../features/password-reset";

const mocks = vi.hoisted(() => ({ pathname: '/today', router: { replace: vi.fn() }, create: vi.fn(), setSession: vi.fn(), getSession: vi.fn(), signOut: vi.fn(), purge: vi.fn(), changed: null as ((event: string, session: { user: { id: string } } | null) => void) | null }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname, useRouter: () => mocks.router }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => { mocks.create(); return ({ auth: {
  getSession: mocks.getSession,
  setSession: mocks.setSession,
  onAuthStateChange: (callback: typeof mocks.changed) => { mocks.changed = callback; return { data: { subscription: { unsubscribe() {} } } }; },
  signOut: mocks.signOut,
} }); } }));
vi.mock("../lib/screen-snapshots", () => ({ purgeScreenSnapshots: mocks.purge }));
let auth!: ReturnType<typeof useAuth>, rendered: ReactTestRenderer | undefined;
function Probe() { auth = useAuth(); return null; }
beforeEach(() => {
  mocks.pathname = '/today'; mocks.router.replace.mockClear(); mocks.setSession.mockReset();
  mocks.getSession.mockReset(); mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'a' } } }, error: null });
  vi.stubGlobal('location', { pathname: '/today', search: '', hash: '' });
  const storage = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("sign-out awaits owner cleanup and account switch clears the departing owner's snapshots", async () => {
  mocks.pathname = '/today';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unused.invalid"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test");
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal("document", { documentElement: { dataset: {} } });
  vi.stubGlobal("localStorage", { getItem: () => null });
  mocks.purge.mockResolvedValue(undefined); mocks.signOut.mockResolvedValue({ error: null });
  await act(async () => { rendered = create(createElement(Providers, null, createElement(Probe))); });
  expect(auth.session?.user.id).toBe("a");
  await act(async () => auth.signOut());
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(mocks.purge).toHaveBeenCalledWith("a");
  await act(async () => mocks.changed?.("SIGNED_IN", { user: { id: "b" } }));
  expect(auth.session?.user.id).toBe("b");
  expect(mocks.purge).toHaveBeenCalledWith("a");
});
async function mountRecovery(search = '', hash = '', strict = false) {
  mocks.pathname = '/auth/reset';
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://unused.invalid'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test');
  vi.stubGlobal('location', { pathname: '/auth/reset', search, hash });
  vi.stubGlobal('window', { history: { state: null, replaceState: vi.fn() }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('document', { documentElement: { dataset: {} } }); vi.stubGlobal('localStorage', { getItem: () => null });
  await act(async () => {
    const tree = createElement(Providers, null, createElement(Probe));
    rendered = create(strict ? createElement(StrictMode, null, tree) : tree);
  });
}
it('requires PASSWORD_RECOVERY evidence, persists across reload and clears after success', async () => {
  await mountRecovery('?code=recovery-code');
  expect(auth.recoveryRequired).toBe(false);
  await act(async () => mocks.changed?.('PASSWORD_RECOVERY', { user: { id: 'a' } }));
  expect(auth.recoveryRequired).toBe(true); expect(sessionStorage.getItem(RECOVERY_OWNER_KEY)).toBe('a');
  await act(async () => rendered!.unmount()); rendered = undefined;
  await mountRecovery();
  expect(auth.recoveryRequired).toBe(true);
  await act(async () => auth.completePasswordRecovery());
  await act(async () => mocks.changed?.('TOKEN_REFRESHED', { user: { id: 'a' } }));
  expect(auth.recoveryRequired).toBe(false); expect(sessionStorage.getItem(RECOVERY_OWNER_KEY)).toBeNull();
});
it('does not promote a stored normal session for an invalid or used code', async () => {
  await mountRecovery('?code=used');
  expect(auth.session?.user.id).toBe('a'); expect(auth.recoveryRequired).toBe(false);
  expect(mocks.setSession).not.toHaveBeenCalled();
});
it('a second invalid link cannot clear a previously accepted recovery guard', async () => {
  sessionStorage.setItem(RECOVERY_OWNER_KEY, 'a');
  await mountRecovery('?code=used');
  expect(auth.recoveryRequired).toBe(true);
  expect(sessionStorage.getItem(RECOVERY_OWNER_KEY)).toBe('a');
});
it('routes PASSWORD_RECOVERY to reset and does not redirect ordinary sign-in', async () => {
  await mountRecovery(); mocks.pathname = '/auth/callback';
  await act(async () => mocks.changed?.('SIGNED_IN', { user: { id: 'a' } }));
  expect(mocks.router.replace).not.toHaveBeenCalled();
  await act(async () => mocks.changed?.('PASSWORD_RECOVERY', { user: { id: 'a' } }));
  expect(mocks.router.replace).toHaveBeenCalledWith('/auth/reset');
  await act(async () => mocks.changed?.('SIGNED_OUT', null));
  expect(auth.recoveryRequired).toBe(false); expect(sessionStorage.getItem(RECOVERY_OWNER_KEY)).toBeNull();
});
it('binds persisted recovery to its owner', async () => {
  sessionStorage.setItem(RECOVERY_OWNER_KEY, 'someone-else');
  await mountRecovery();
  expect(auth.recoveryRequired).toBe(false); expect(sessionStorage.getItem(RECOVERY_OWNER_KEY)).toBeNull();
});
it.each([false, true])('establishes a legacy hash once, clears its credentials, and fails safely (failed=%s)', async failed => {
  mocks.setSession.mockResolvedValue({ data: { session: failed ? null : { user: { id: 'a' } } }, error: failed ? { message: 'private' } : null });
  await mountRecovery('', '#type=recovery&access_token=access&refresh_token=refresh');
  expect(mocks.setSession).toHaveBeenCalledExactlyOnceWith({ access_token: 'access', refresh_token: 'refresh' });
  expect(mocks.getSession).not.toHaveBeenCalled();
  expect(auth.recoveryRequired).toBe(!failed); expect(auth.loading).toBe(false);
  expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/auth/reset');
  expect(auth.error).toBeNull();
});
it('does not establish a legacy hash twice during Strict Mode effect replay', async () => {
  mocks.setSession.mockResolvedValue({ data: { session: { user: { id: 'a' } } }, error: null });
  await mountRecovery('', '#type=recovery&access_token=access&refresh_token=refresh', true);
  expect(mocks.setSession).toHaveBeenCalledOnce();
  expect(auth.recoveryRequired).toBe(true); expect(auth.loading).toBe(false);
});
it.each([`/s/${'a'.repeat(64)}`, '/download', '/release', '/privacy', '/terms'])('public route %s never initializes auth or private caches even when auth is configured', async pathname => {
  mocks.pathname = pathname; mocks.create.mockClear(); mocks.purge.mockClear();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://unused.invalid'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test');
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  vi.stubGlobal('document', { documentElement: { dataset: {} } }); vi.stubGlobal('localStorage', { getItem: () => null });
  await act(async () => { rendered = create(createElement(Providers, null, createElement('p', null, 'Public'))); });
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.purge).not.toHaveBeenCalled();
  expect(JSON.stringify(rendered!.toJSON())).toContain('Public');
});
